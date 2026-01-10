import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
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

// ============================================
// TYPES
// ============================================

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

interface ErrorHandlerOptions {
  includeStack?: boolean;
  logErrors?: boolean;
  logger?: (entry: ErrorLogEntry) => void;
}

// ============================================
// ERROR NORMALIZATION
// ============================================

/**
 * Convert Zod validation error to AppError
 */
function normalizeZodError(error: ZodError): AppError {
  const fieldErrors: FieldError[] = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return validationError(fieldErrors, 'Validation failed');
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

// ============================================
// LOGGING
// ============================================

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
    requestId: (req as Request & { id?: string }).id,
    method: req.method,
    path: req.path,
    statusCode: appError.statusCode,
    errorCode: appError.code,
    message: appError.message,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  // Add user ID if authenticated
  const user = (req as Request & { user?: { userId: string } }).user;
  if (user?.userId) {
    entry.userId = user.userId;
  }

  // Add details if present
  if (appError.details) {
    entry.details = appError.details;
  }

  // Add stack for non-operational (unexpected) errors
  if (includeStack && !appError.isOperational && appError.stack) {
    entry.stack = appError.stack;
  }

  return entry;
}

// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

/**
 * Create error handler middleware with options
 */
export function createErrorHandler(options: ErrorHandlerOptions = {}): ErrorRequestHandler {
  const {
    includeStack = process.env.NODE_ENV !== 'production',
    logErrors = true,
    logger = defaultLogger,
  } = options;

  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    // Normalize error to AppError
    const appError = normalizeError(err);

    // Log error
    if (logErrors) {
      const logEntry = createLogEntry(req, appError, true);
      logger(logEntry);
    }

    // Send response
    const response = appError.toJSON(includeStack && !appError.isOperational);
    res.status(appError.statusCode).json(response);
  };
}

/**
 * Default error handler (uses default options)
 */
export const errorHandler: ErrorRequestHandler = createErrorHandler();

// ============================================
// 404 HANDLER
// ============================================

/**
 * Handle 404 Not Found for unmatched routes
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(notFound(`Route ${req.method} ${req.path}`));
}

// ============================================
// ASYNC ERROR WRAPPER
// ============================================

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

// ============================================
// UTILITIES
// ============================================

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

// ============================================
// EXPORTS
// ============================================

export {
  normalizeError,
  normalizeZodError,
  normalizePrismaError,
  createLogEntry,
  defaultLogger,
};

export default errorHandler;
