/**
 * AppError - Custom Error Class
 * Standardized error handling with HTTP status codes and error codes.
 */

// ============================================================================
// ERROR CODES
// ============================================================================

export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  NO_TOKEN: 'NO_TOKEN',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_TIER: 'INSUFFICIENT_TIER',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Resource errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
  LEAD_NOT_FOUND: 'LEAD_NOT_FOUND',
  MILESTONE_NOT_FOUND: 'MILESTONE_NOT_FOUND',
  DELIVERABLE_NOT_FOUND: 'DELIVERABLE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',

  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Service unavailable (503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  NOTION_UNAVAILABLE: 'NOTION_UNAVAILABLE',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  STRIPE_UNAVAILABLE: 'STRIPE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// HTTP STATUS MAPPING
// ============================================================================

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  // 401 Unauthorized
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.INVALID_TOKEN]: 401,
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.NO_TOKEN]: 401,

  // 403 Forbidden
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.INSUFFICIENT_TIER]: 403,
  [ErrorCodes.ADMIN_REQUIRED]: 403,

  // 400 Bad Request
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_FIELD]: 400,

  // 404 Not Found
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.USER_NOT_FOUND]: 404,
  [ErrorCodes.PROJECT_NOT_FOUND]: 404,
  [ErrorCodes.CLIENT_NOT_FOUND]: 404,
  [ErrorCodes.LEAD_NOT_FOUND]: 404,
  [ErrorCodes.MILESTONE_NOT_FOUND]: 404,
  [ErrorCodes.DELIVERABLE_NOT_FOUND]: 404,

  // 409 Conflict
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.ALREADY_EXISTS]: 409,
  [ErrorCodes.DUPLICATE_EMAIL]: 409,

  // 429 Too Many Requests
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.TOO_MANY_REQUESTS]: 429,

  // 500 Internal Server Error
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 500,

  // 503 Service Unavailable
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.NOTION_UNAVAILABLE]: 503,
  [ErrorCodes.STORAGE_UNAVAILABLE]: 503,
  [ErrorCodes.STRIPE_UNAVAILABLE]: 503,
};

// ============================================================================
// APP ERROR CLASS
// ============================================================================

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown> | string;
  cause?: Error;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown> | string;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly originalCause?: Error;

  constructor(options: AppErrorOptions) {
    super(options.message);

    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = ERROR_STATUS_MAP[options.code] || 500;
    this.details = options.details;
    this.isOperational = true; // Distinguishes from programming errors
    this.timestamp = new Date();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Preserve original error cause
    if (options.cause) {
      this.originalCause = options.cause;
    }
  }

  /**
   * Convert to JSON response format
   */
  toJSON(): {
    success: false;
    error: {
      code: ErrorCode;
      message: string;
      details?: Record<string, unknown> | string;
      timestamp: string;
    };
  } {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }

  /**
   * Check if error is a specific type
   */
  is(code: ErrorCode): boolean {
    return this.code === code;
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    const authCodes: ErrorCode[] = [
      ErrorCodes.UNAUTHORIZED,
      ErrorCodes.INVALID_TOKEN,
      ErrorCodes.TOKEN_EXPIRED,
      ErrorCodes.NO_TOKEN,
    ];
    return authCodes.includes(this.code);
  }

  /**
   * Check if error is an authorization error
   */
  isAuthzError(): boolean {
    const authzCodes: ErrorCode[] = [
      ErrorCodes.FORBIDDEN,
      ErrorCodes.INSUFFICIENT_TIER,
      ErrorCodes.ADMIN_REQUIRED,
    ];
    return authzCodes.includes(this.code);
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    const validationCodes: ErrorCode[] = [
      ErrorCodes.VALIDATION_ERROR,
      ErrorCodes.INVALID_INPUT,
      ErrorCodes.MISSING_FIELD,
    ];
    return validationCodes.includes(this.code);
  }

  /**
   * Check if error is a not found error
   */
  isNotFoundError(): boolean {
    return this.statusCode === 404;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an unauthorized error
 */
export function unauthorized(message = 'Authentication required'): AppError {
  return new AppError({
    code: ErrorCodes.UNAUTHORIZED,
    message,
  });
}

/**
 * Create an invalid token error
 */
export function invalidToken(message = 'Invalid authentication token'): AppError {
  return new AppError({
    code: ErrorCodes.INVALID_TOKEN,
    message,
  });
}

/**
 * Create a token expired error
 */
export function tokenExpired(message = 'Authentication token has expired'): AppError {
  return new AppError({
    code: ErrorCodes.TOKEN_EXPIRED,
    message,
  });
}

/**
 * Create a forbidden error
 */
export function forbidden(message = 'Access denied'): AppError {
  return new AppError({
    code: ErrorCodes.FORBIDDEN,
    message,
  });
}

/**
 * Create an insufficient tier error
 */
export function insufficientTier(requiredTier: number, currentTier: number): AppError {
  return new AppError({
    code: ErrorCodes.INSUFFICIENT_TIER,
    message: `This feature requires Tier ${requiredTier} or higher`,
    details: { requiredTier, currentTier },
  });
}

/**
 * Create an admin required error
 */
export function adminRequired(message = 'Admin access required'): AppError {
  return new AppError({
    code: ErrorCodes.ADMIN_REQUIRED,
    message,
  });
}

/**
 * Create a validation error
 */
export function validationError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError({
    code: ErrorCodes.VALIDATION_ERROR,
    message,
    details,
  });
}

/**
 * Create a not found error
 */
export function notFound(resource: string, id?: string): AppError {
  const resourceCodes: Record<string, ErrorCode> = {
    user: ErrorCodes.USER_NOT_FOUND,
    project: ErrorCodes.PROJECT_NOT_FOUND,
    client: ErrorCodes.CLIENT_NOT_FOUND,
    lead: ErrorCodes.LEAD_NOT_FOUND,
    milestone: ErrorCodes.MILESTONE_NOT_FOUND,
    deliverable: ErrorCodes.DELIVERABLE_NOT_FOUND,
  };

  const code = resourceCodes[resource.toLowerCase()] || ErrorCodes.NOT_FOUND;
  const message = id
    ? `${resource} with ID ${id} not found`
    : `${resource} not found`;

  return new AppError({ code, message });
}

/**
 * Create a conflict error
 */
export function conflict(message: string, details?: Record<string, unknown>): AppError {
  return new AppError({
    code: ErrorCodes.CONFLICT,
    message,
    details,
  });
}

/**
 * Create an internal error
 */
export function internalError(message = 'An unexpected error occurred', cause?: Error): AppError {
  return new AppError({
    code: ErrorCodes.INTERNAL_ERROR,
    message,
    cause,
  });
}

/**
 * Create a service unavailable error
 */
export function serviceUnavailable(service: string): AppError {
  const serviceCodes: Record<string, ErrorCode> = {
    notion: ErrorCodes.NOTION_UNAVAILABLE,
    storage: ErrorCodes.STORAGE_UNAVAILABLE,
    stripe: ErrorCodes.STRIPE_UNAVAILABLE,
  };

  const code = serviceCodes[service.toLowerCase()] || ErrorCodes.SERVICE_UNAVAILABLE;

  return new AppError({
    code,
    message: `${service} service is currently unavailable`,
  });
}

/**
 * Create a rate limited error
 */
export function rateLimited(retryAfterSeconds?: number): AppError {
  return new AppError({
    code: ErrorCodes.RATE_LIMITED,
    message: 'Too many requests, please try again later',
    details: retryAfterSeconds ? { retryAfter: retryAfterSeconds } : undefined,
  });
}

export default AppError;
