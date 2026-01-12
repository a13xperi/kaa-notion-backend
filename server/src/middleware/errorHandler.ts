/**
 * Error Handler Middleware
 * Global error handling with proper response formatting, logging, and Sentry integration.
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../types/prisma-types';
import {
  AppError,
  ErrorCodes,
  isAppError,
  toAppError,
  validationError,
  notFound,
  conflict,
  internalError,
  badRequest,
  FieldError,
} from '../utils/AppError';
import { logger } from '../logger';
import { captureException, setUser, setContext } from '../config/sentry';

// ============================================================================
// TYPES
// ============================================================================

interface ErrorLogEntry {
  timestamp: string;
  requestId?: string;
  method: string;
  path: string;
  statusCode: number;
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

interface ErrorLogContext {
  method: string;
  url: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  errorCode: string;
  statusCode: number;
  stack?: string;
}

interface ErrorHandlerOptions {
  includeStack?: boolean;
  logErrors?: boolean;
  customLogger?: (entry: ErrorLogEntry) => void;
}

// ============================================================================
// ERROR NORMALIZATION
// ============================================================================

/**
 * Convert Zod validation error to AppError
 */
function normalizeZodError(error: ZodError): AppError {
  const fieldErrors: FieldError[] = error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return validationError(fieldErrors, 'Validation failed');
}

/**
 * Format Zod errors into a structured object
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';

    if (!formatted[path]) {
      formatted[path] = [];
    }

    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Convert Prisma error to AppError
 */
function normalizePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (error.meta?.target as string[]) || ['field'];
      return conflict(`A record with this ${target.join(', ')} already exists`, ErrorCodes.DUPLICATE_ENTRY, {
        fields: target,
      });
    }

    case 'P2003': {
      // Foreign key constraint
      return badRequest('Invalid reference: related record not found', ErrorCodes.INVALID_INPUT, {
        field: error.meta?.field_name,
      });
    }

    case 'P2025': {
      // Record not found
      return notFound('Record', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    case 'P2014': {
      // Relation violation
      return badRequest('Cannot delete: record is referenced by other records', ErrorCodes.CONFLICT);
    }

    case 'P2016':
    case 'P2018': {
      // Query interpretation error
      return badRequest('Invalid query parameters', ErrorCodes.INVALID_INPUT);
    }

    default:
      return new AppError(
        ErrorCodes.DATABASE_ERROR,
        'A database error occurred',
        500,
        {
          details: { code: error.code },
          isOperational: false,
        }
      );
  }
}

/**
 * Check if error is a Prisma error
 */
function isPrismaError(err: Error): boolean {
  return (
    err.name === 'PrismaClientKnownRequestError' ||
    err.name === 'PrismaClientUnknownRequestError' ||
    err.name === 'PrismaClientRustPanicError' ||
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientValidationError'
  );
}

/**
 * Handle Prisma errors (alternative approach)
 */
function handlePrismaError(err: Error & { code?: string }): AppError {
  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      return new AppError(
        ErrorCodes.ALREADY_EXISTS,
        'A record with this value already exists',
        409
      );

    case 'P2003':
      // Foreign key constraint violation
      return new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid reference to related record',
        400
      );

    case 'P2025':
      // Record not found
      return new AppError(
        ErrorCodes.NOT_FOUND,
        'Record not found',
        404
      );

    default:
      return new AppError(
        ErrorCodes.DATABASE_ERROR,
        'Database operation failed',
        500,
        { cause: err }
      );
  }
}

/**
 * Check if error is a Stripe error
 */
function isStripeError(err: Error): boolean {
  return err.name === 'StripeError' || ('type' in err && typeof (err as any).type === 'string' && (err as any).type.startsWith('Stripe'));
}

/**
 * Handle Stripe errors
 */
function handleStripeError(err: Error & { type?: string; code?: string }): AppError {
  switch (err.type) {
    case 'StripeCardError':
      return new AppError(
        ErrorCodes.VALIDATION_ERROR,
        err.message || 'Card error',
        400
      );

    case 'StripeRateLimitError':
      return new AppError(
        ErrorCodes.RATE_LIMITED,
        'Too many requests to payment service',
        429
      );

    case 'StripeInvalidRequestError':
      return new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid payment request',
        400
      );

    case 'StripeAuthenticationError':
    case 'StripeAPIError':
    case 'StripeConnectionError':
    default:
      return new AppError(
        ErrorCodes.STRIPE_UNAVAILABLE,
        'Payment service error',
        503,
        { cause: err }
      );
  }
}

/**
 * Convert Multer error to AppError
 */
function normalizeMulterError(error: Error & { code?: string; field?: string }): AppError {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new AppError(
        ErrorCodes.FILE_TOO_LARGE,
        'File size exceeds the maximum allowed limit',
        400,
        { details: { field: error.field } }
      );

    case 'LIMIT_FILE_COUNT':
      return badRequest('Too many files uploaded', ErrorCodes.INVALID_INPUT);

    case 'LIMIT_UNEXPECTED_FILE':
      return badRequest(`Unexpected file field: ${error.field}`, ErrorCodes.INVALID_INPUT);

    case 'LIMIT_PART_COUNT':
      return badRequest('Too many form parts', ErrorCodes.INVALID_INPUT);

    default:
      return badRequest('File upload error', ErrorCodes.INVALID_INPUT, {
        error: error.message,
      });
  }
}

/**
 * Convert JSON parse error to AppError
 */
function normalizeJsonError(): AppError {
  return badRequest('Invalid JSON in request body', ErrorCodes.INVALID_FORMAT);
}

/**
 * Normalize any error to AppError
 */
function normalizeError(error: unknown): AppError {
  // Already an AppError
  if (isAppError(error)) {
    return error;
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return normalizeZodError(error);
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return normalizePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return badRequest('Invalid database query', ErrorCodes.INVALID_INPUT);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError(ErrorCodes.DATABASE_ERROR, 'Database connection failed', 503, {
      isOperational: false,
    });
  }

  // Check for Prisma errors by name
  if (error instanceof Error && isPrismaError(error)) {
    return handlePrismaError(error as Error & { code?: string });
  }

  // Check for Stripe errors
  if (error instanceof Error && isStripeError(error)) {
    return handleStripeError(error as Error & { type?: string; code?: string });
  }

  // Multer errors
  if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
    if (error.code.startsWith('LIMIT_')) {
      return normalizeMulterError(error as Error & { code: string; field?: string });
    }
  }

  // SyntaxError (usually JSON parse error)
  if (error instanceof SyntaxError && 'body' in error) {
    return normalizeJsonError();
  }

  // Generic Error
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('ECONNREFUSED')) {
      return new AppError(ErrorCodes.EXTERNAL_SERVICE_ERROR, 'Service connection failed', 503, {
        isOperational: false,
        cause: error,
      });
    }

    if (error.message.includes('ETIMEDOUT')) {
      return new AppError(ErrorCodes.EXTERNAL_SERVICE_ERROR, 'Service request timed out', 504, {
        isOperational: false,
        cause: error,
      });
    }

    return toAppError(error);
  }

  // Unknown error type
  return internalError('An unexpected error occurred');
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Default console logger
 */
function defaultLogger(entry: ErrorLogEntry): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (entry.statusCode >= 500) {
    console.error('[ERROR]', JSON.stringify(entry, null, isProduction ? 0 : 2));
  } else if (entry.statusCode >= 400) {
    console.warn('[WARN]', JSON.stringify(entry, null, isProduction ? 0 : 2));
  }
}

/**
 * Create error log entry
 */
function createLogEntry(
  req: Request,
  appError: AppError,
  includeStack: boolean
): ErrorLogEntry {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    requestId: (req as Request & { id?: string; correlationId?: string }).id || (req as any).correlationId,
    method: req.method,
    path: req.path,
    statusCode: appError.statusCode,
    errorCode: appError.code,
    message: appError.message,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  // Add user ID if authenticated
  const user = (req as Request & { user?: { userId?: string; id?: string } }).user;
  if (user?.userId || user?.id) {
    entry.userId = user.userId || user.id;
  }

  // Add details if present
  if (appError.details) {
    entry.details = appError.details as Record<string, unknown>;
  }

  // Add stack for non-operational (unexpected) errors
  if (includeStack && !appError.isOperational && appError.stack) {
    entry.stack = appError.stack;
  }

  return entry;
}

/**
 * Log error with context (structured logging version)
 */
function logError(error: AppError, req: Request): void {
  const context: ErrorLogContext = {
    method: req.method,
    url: req.originalUrl,
    userId: (req as any).user?.id,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    errorCode: error.code,
    statusCode: error.statusCode,
  };

  // Include stack trace for server errors
  if (error.statusCode >= 500) {
    context.stack = error.stack;

    logger.error('Server error:', {
      ...context,
      message: error.message,
      details: error.details,
    });
  } else if (error.statusCode >= 400) {
    // Log client errors at warn level
    logger.warn('Client error:', {
      ...context,
      message: error.message,
    });
  }
}

// ============================================================================
// ERROR HANDLER MIDDLEWARE
// ============================================================================

/**
 * Create error handler middleware with options
 */
export function createErrorHandler(options: ErrorHandlerOptions = {}): ErrorRequestHandler {
  const {
    includeStack = process.env.NODE_ENV !== 'production',
    logErrors = true,
    customLogger = defaultLogger,
  } = options;

  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    // Already sent response
    if (res.headersSent) {
      return;
    }

    // Normalize error to AppError
    const appError = normalizeError(err);

    // Set user context for Sentry
    if ((req as any).user) {
      setUser({
        id: (req as any).user.id,
        email: (req as any).user.email,
        userType: (req as any).user.userType,
      });
    }

    // Set additional context for Sentry
    setContext('request', {
      method: req.method,
      url: req.originalUrl,
      correlationId: (req as any).correlationId,
    });

    // Capture exception in Sentry (only for server errors)
    if (appError.statusCode >= 500) {
      captureException(appError as Error, {
        userId: (req as any).user?.id,
        correlationId: (req as any).correlationId,
        errorCode: appError.code,
        details: appError.details as Record<string, unknown>,
      });
    }

    // Log error using structured logging
    logError(appError, req);

    // Also log using custom logger if provided
    if (logErrors) {
      const logEntry = createLogEntry(req, appError, true);
      customLogger(logEntry);
    }

    // Send response
    const response = appError.toJSON(includeStack && !appError.isOperational);
    res.status(appError.statusCode).json(response);
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Already sent response
  if (res.headersSent) {
    return;
  }

  let appError: AppError;

  // Convert known error types to AppError
  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    // Zod validation error
    const formattedErrors = formatZodErrors(err);
    appError = validationError('Validation failed', formattedErrors);
  } else if (isPrismaError(err)) {
    // Prisma database error
    appError = handlePrismaError(err as Error & { code?: string });
  } else if (isStripeError(err)) {
    // Stripe error
    appError = handleStripeError(err as Error & { type?: string; code?: string });
  } else {
    // Unknown error
    appError = internalError(
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      err
    );
  }

  // Set user context for Sentry
  if ((req as any).user) {
    setUser({
      id: (req as any).user.id,
      email: (req as any).user.email,
      userType: (req as any).user.userType,
    });
  }

  // Set additional context
  setContext('request', {
    method: req.method,
    url: req.originalUrl,
    correlationId: (req as any).correlationId,
  });

  // Capture exception in Sentry (only for server errors)
  if (appError.statusCode >= 500) {
    captureException(appError as Error, {
      userId: (req as any).user?.id,
      correlationId: (req as any).correlationId,
      errorCode: appError.code,
      details: appError.details as Record<string, unknown>,
    });
  }

  // Log the error
  logError(appError, req);

  // Send response
  res.status(appError.statusCode).json(appError.toJSON());
}

// ============================================================================
// 404 HANDLER
// ============================================================================

/**
 * Handle 404 Not Found for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = notFound(`Route ${req.method} ${req.path}`);
  res.status(404).json(error.toJSON());
}

// ============================================================================
// ASYNC ERROR WRAPPER
// ============================================================================

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Type-safe wrapper for authenticated route handlers.
 * Allows using AuthenticatedRequest in route handlers while maintaining Express router compatibility.
 *
 * @example
 * router.get('/protected', authMiddleware, authHandler(async (req, res) => {
 *   const userId = req.user.userId; // Type-safe access
 *   res.json({ userId });
 * }));
 */
export function authHandler<T>(
  fn: (req: Request & { user: { id: string; userId: string; email: string | null; role: string; userType: string; tier: number | null; clientId?: string } }, res: Response, next: NextFunction) => Promise<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as Request & { user: { id: string; userId: string; email: string | null; role: string; userType: string; tier: number | null; clientId?: string } }, res, next)).catch(next);
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if response has already been sent
 */
export function isResponseSent(res: Response): boolean {
  return res.headersSent;
}

/**
 * Safe error response - checks if headers already sent
 */
export function safeErrorResponse(
  res: Response,
  error: AppError,
  includeStack = false
): void {
  if (isResponseSent(res)) {
    console.error('[ERROR] Headers already sent, cannot send error response:', error.toLogFormat());
    return;
  }

  res.status(error.statusCode).json(error.toJSON(includeStack));
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  normalizeError,
  normalizeZodError,
  normalizePrismaError,
  formatZodErrors,
  createLogEntry,
  defaultLogger,
  isPrismaError,
  isStripeError,
};

export default errorHandler;
