/**
 * AppError - Custom Error Class
 *
 * Provides a standardized error class with:
 * - HTTP status code
 * - Error code for programmatic handling
 * - Human-readable message
 * - Optional details for debugging
 * - Optional field-level errors for validation
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ErrorDetails {
  [key: string]: unknown;
}

export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

export interface SerializedError {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: ErrorDetails;
    fieldErrors?: FieldError[];
    stack?: string;
  };
}

// ============================================
// ERROR CODES
// ============================================

export const ErrorCodes = {
  // Authentication & Authorization (401, 403)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_TIER: 'INSUFFICIENT_TIER',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Validation (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',

  // Resource (404, 409)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  LEAD_NOT_FOUND: 'LEAD_NOT_FOUND',
  DELIVERABLE_NOT_FOUND: 'DELIVERABLE_NOT_FOUND',
  MILESTONE_NOT_FOUND: 'MILESTONE_NOT_FOUND',
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  CONFLICT: 'CONFLICT',

  // Business Logic (400, 422)
  INVALID_STATE: 'INVALID_STATE',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  LEAD_ALREADY_CONVERTED: 'LEAD_ALREADY_CONVERTED',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',

  // External Services (502, 503)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  STRIPE_ERROR: 'STRIPE_ERROR',
  NOTION_ERROR: 'NOTION_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Rate Limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================
// APP ERROR CLASS
// ============================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ErrorDetails;
  public readonly fieldErrors?: FieldError[];
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    options?: {
      details?: ErrorDetails;
      fieldErrors?: FieldError[];
      isOperational?: boolean;
      cause?: Error;
    }
  ) {
    super(message);

    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = options?.details;
    this.fieldErrors = options?.fieldErrors;
    this.isOperational = options?.isOperational ?? true;
    this.timestamp = new Date();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Set cause if provided
    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Serialize error for API response
   */
  toJSON(includeStack = false): SerializedError {
    const error: SerializedError = {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
      },
    };

    if (this.details && Object.keys(this.details).length > 0) {
      error.error.details = this.details;
    }

    if (this.fieldErrors && this.fieldErrors.length > 0) {
      error.error.fieldErrors = this.fieldErrors;
    }

    if (includeStack && this.stack) {
      error.error.stack = this.stack;
    }

    return error;
  }

  /**
   * Log format for console/file logging
   */
  toLogFormat(): string {
    const parts = [
      `[${this.timestamp.toISOString()}]`,
      `[${this.code}]`,
      `[${this.statusCode}]`,
      this.message,
    ];

    if (this.details) {
      parts.push(`Details: ${JSON.stringify(this.details)}`);
    }

    if (this.fieldErrors) {
      parts.push(`Fields: ${JSON.stringify(this.fieldErrors)}`);
    }

    return parts.join(' ');
  }
}

// ============================================
// ERROR FACTORY FUNCTIONS
// ============================================

/**
 * Create a 400 Bad Request error
 */
export function badRequest(
  message: string,
  code: ErrorCode = ErrorCodes.INVALID_INPUT,
  details?: ErrorDetails
): AppError {
  return new AppError(code, message, 400, { details });
}

/**
 * Create a 401 Unauthorized error
 */
export function unauthorized(
  message = 'Authentication required',
  code: ErrorCode = ErrorCodes.UNAUTHORIZED
): AppError {
  return new AppError(code, message, 401);
}

/**
 * Create a 403 Forbidden error
 */
export function forbidden(
  message = 'Access denied',
  code: ErrorCode = ErrorCodes.FORBIDDEN,
  details?: ErrorDetails
): AppError {
  return new AppError(code, message, 403, { details });
}

/**
 * Create a 404 Not Found error
 */
export function notFound(
  resource = 'Resource',
  code: ErrorCode = ErrorCodes.NOT_FOUND
): AppError {
  return new AppError(code, `${resource} not found`, 404);
}

/**
 * Create a 409 Conflict error
 */
export function conflict(
  message: string,
  code: ErrorCode = ErrorCodes.CONFLICT,
  details?: ErrorDetails
): AppError {
  return new AppError(code, message, 409, { details });
}

/**
 * Create a 422 Unprocessable Entity error
 */
export function unprocessableEntity(
  message: string,
  code: ErrorCode = ErrorCodes.INVALID_STATE,
  details?: ErrorDetails
): AppError {
  return new AppError(code, message, 422, { details });
}

/**
 * Create a 429 Too Many Requests error
 */
export function rateLimited(
  message = 'Too many requests, please try again later',
  retryAfter?: number
): AppError {
  return new AppError(ErrorCodes.RATE_LIMITED, message, 429, {
    details: retryAfter ? { retryAfter } : undefined,
  });
}

/**
 * Create a 500 Internal Server error
 */
export function internalError(
  message = 'An unexpected error occurred',
  cause?: Error
): AppError {
  return new AppError(ErrorCodes.INTERNAL_ERROR, message, 500, {
    isOperational: false,
    cause,
  });
}

/**
 * Create a 502 Bad Gateway error (external service failure)
 */
export function externalServiceError(
  service: string,
  message?: string,
  cause?: Error
): AppError {
  return new AppError(
    ErrorCodes.EXTERNAL_SERVICE_ERROR,
    message || `${service} service is unavailable`,
    502,
    {
      details: { service },
      cause,
    }
  );
}

/**
 * Create a 503 Service Unavailable error
 */
export function serviceUnavailable(
  message = 'Service temporarily unavailable',
  retryAfter?: number
): AppError {
  return new AppError(ErrorCodes.EXTERNAL_SERVICE_ERROR, message, 503, {
    details: retryAfter ? { retryAfter } : undefined,
  });
}

/**
 * Create a validation error with field-level errors
 */
export function validationError(
  fieldErrors: FieldError[],
  message = 'Validation failed'
): AppError {
  return new AppError(ErrorCodes.VALIDATION_ERROR, message, 400, {
    fieldErrors,
  });
}

// ============================================
// ERROR TYPE GUARDS
// ============================================

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Check if error is operational (expected, can be handled gracefully)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Check if error is a specific type
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  if (isAppError(error)) {
    return error.code === code;
  }
  return false;
}

// ============================================
// ERROR CONVERSION
// ============================================

/**
 * Convert any error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      ErrorCodes.UNKNOWN_ERROR,
      error.message || 'An unexpected error occurred',
      500,
      {
        isOperational: false,
        cause: error,
      }
    );
  }

  if (typeof error === 'string') {
    return new AppError(ErrorCodes.UNKNOWN_ERROR, error, 500, {
      isOperational: false,
    });
  }

  return new AppError(ErrorCodes.UNKNOWN_ERROR, 'An unexpected error occurred', 500, {
    isOperational: false,
    details: { originalError: String(error) },
  });
}

/**
 * Wrap a function to convert thrown errors to AppErrors
 */
export function wrapAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw toAppError(error);
    }
  };
}

export default AppError;
