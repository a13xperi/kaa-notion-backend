/**
 * Error Handler Middleware
 * Global error handling with proper response formatting and logging.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCodes, internalError, validationError } from '../utils/AppError';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
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
    appError = validationError('Validation failed', formatZodErrors(err));
  } else if (isPrismaError(err)) {
    // Prisma database error
    appError = handlePrismaError(err);
  } else if (isStripeError(err)) {
    // Stripe error
    appError = handleStripeError(err);
  } else {
    // Unknown error
    appError = internalError(
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      err
    );
  }

  // Log the error
  logError(appError, req);

  // Send response
  res.status(appError.statusCode).json(appError.toJSON());
}

// ============================================================================
// ERROR LOGGING
// ============================================================================

/**
 * Log error with context
 */
function logError(error: AppError, req: Request): void {
  const context: ErrorLogContext = {
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id,
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
// ERROR TYPE HANDLERS
// ============================================================================

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
 * Handle Prisma errors
 */
function handlePrismaError(err: Error & { code?: string }): AppError {
  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      return new AppError({
        code: ErrorCodes.ALREADY_EXISTS,
        message: 'A record with this value already exists',
      });

    case 'P2003':
      // Foreign key constraint violation
      return new AppError({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid reference to related record',
      });

    case 'P2025':
      // Record not found
      return new AppError({
        code: ErrorCodes.NOT_FOUND,
        message: 'Record not found',
      });

    default:
      return new AppError({
        code: ErrorCodes.DATABASE_ERROR,
        message: 'Database operation failed',
        cause: err,
      });
  }
}

/**
 * Check if error is a Stripe error
 */
function isStripeError(err: Error): boolean {
  return err.name === 'StripeError' || 'type' in err && typeof (err as any).type === 'string' && (err as any).type.startsWith('Stripe');
}

/**
 * Handle Stripe errors
 */
function handleStripeError(err: Error & { type?: string; code?: string }): AppError {
  switch (err.type) {
    case 'StripeCardError':
      return new AppError({
        code: ErrorCodes.VALIDATION_ERROR,
        message: err.message || 'Card error',
      });

    case 'StripeRateLimitError':
      return new AppError({
        code: ErrorCodes.RATE_LIMITED,
        message: 'Too many requests to payment service',
      });

    case 'StripeInvalidRequestError':
      return new AppError({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid payment request',
      });

    case 'StripeAuthenticationError':
    case 'StripeAPIError':
    case 'StripeConnectionError':
    default:
      return new AppError({
        code: ErrorCodes.STRIPE_UNAVAILABLE,
        message: 'Payment service error',
        cause: err,
      });
  }
}

/**
 * Format Zod errors
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

// ============================================================================
// NOT FOUND HANDLER
// ============================================================================

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const error = new AppError({
    code: ErrorCodes.NOT_FOUND,
    message: `Route ${req.method} ${req.path} not found`,
  });

  res.status(404).json(error.toJSON());
}

// ============================================================================
// ASYNC HANDLER WRAPPER
// ============================================================================

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default errorHandler;
