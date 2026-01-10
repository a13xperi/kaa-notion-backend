/**
 * AppError Tests
 * Tests for custom error class and factory functions.
 */

import {
  AppError,
  ErrorCodes,
  unauthorized,
  invalidToken,
  tokenExpired,
  forbidden,
  insufficientTier,
  adminRequired,
  validationError,
  notFound,
  conflict,
  internalError,
  serviceUnavailable,
  rateLimited,
} from '../utils/AppError';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an error with correct properties', () => {
      const error = new AppError({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Test error message',
      });

      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should include details when provided', () => {
      const error = new AppError({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { field: 'email', error: 'Invalid format' },
      });

      expect(error.details).toEqual({ field: 'email', error: 'Invalid format' });
    });

    it('should map error codes to correct status codes', () => {
      const testCases = [
        { code: ErrorCodes.UNAUTHORIZED, expectedStatus: 401 },
        { code: ErrorCodes.FORBIDDEN, expectedStatus: 403 },
        { code: ErrorCodes.NOT_FOUND, expectedStatus: 404 },
        { code: ErrorCodes.VALIDATION_ERROR, expectedStatus: 400 },
        { code: ErrorCodes.CONFLICT, expectedStatus: 409 },
        { code: ErrorCodes.RATE_LIMITED, expectedStatus: 429 },
        { code: ErrorCodes.INTERNAL_ERROR, expectedStatus: 500 },
        { code: ErrorCodes.SERVICE_UNAVAILABLE, expectedStatus: 503 },
      ];

      testCases.forEach(({ code, expectedStatus }) => {
        const error = new AppError({ code, message: 'Test' });
        expect(error.statusCode).toBe(expectedStatus);
      });
    });
  });

  describe('toJSON', () => {
    it('should return JSON response format', () => {
      const error = new AppError({
        code: ErrorCodes.NOT_FOUND,
        message: 'Resource not found',
        details: { id: '123' },
      });

      const json = error.toJSON();

      expect(json.success).toBe(false);
      expect(json.error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(json.error.message).toBe('Resource not found');
      expect(json.error.details).toEqual({ id: '123' });
      expect(json.error.timestamp).toBeDefined();
    });
  });

  describe('type check methods', () => {
    it('isAuthError should return true for auth errors', () => {
      const error = new AppError({ code: ErrorCodes.UNAUTHORIZED, message: 'Test' });
      expect(error.isAuthError()).toBe(true);
    });

    it('isAuthError should return false for non-auth errors', () => {
      const error = new AppError({ code: ErrorCodes.NOT_FOUND, message: 'Test' });
      expect(error.isAuthError()).toBe(false);
    });

    it('isAuthzError should return true for authorization errors', () => {
      const error = new AppError({ code: ErrorCodes.FORBIDDEN, message: 'Test' });
      expect(error.isAuthzError()).toBe(true);
    });

    it('isValidationError should return true for validation errors', () => {
      const error = new AppError({ code: ErrorCodes.VALIDATION_ERROR, message: 'Test' });
      expect(error.isValidationError()).toBe(true);
    });

    it('isNotFoundError should return true for 404 errors', () => {
      const error = new AppError({ code: ErrorCodes.NOT_FOUND, message: 'Test' });
      expect(error.isNotFoundError()).toBe(true);
    });
  });
});

describe('Factory Functions', () => {
  describe('unauthorized', () => {
    it('should create unauthorized error', () => {
      const error = unauthorized();
      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
    });

    it('should use custom message', () => {
      const error = unauthorized('Custom message');
      expect(error.message).toBe('Custom message');
    });
  });

  describe('invalidToken', () => {
    it('should create invalid token error', () => {
      const error = invalidToken();
      expect(error.code).toBe(ErrorCodes.INVALID_TOKEN);
      expect(error.statusCode).toBe(401);
    });
  });

  describe('tokenExpired', () => {
    it('should create token expired error', () => {
      const error = tokenExpired();
      expect(error.code).toBe(ErrorCodes.TOKEN_EXPIRED);
      expect(error.statusCode).toBe(401);
    });
  });

  describe('forbidden', () => {
    it('should create forbidden error', () => {
      const error = forbidden();
      expect(error.code).toBe(ErrorCodes.FORBIDDEN);
      expect(error.statusCode).toBe(403);
    });
  });

  describe('insufficientTier', () => {
    it('should create tier error with details', () => {
      const error = insufficientTier(3, 1);
      expect(error.code).toBe(ErrorCodes.INSUFFICIENT_TIER);
      expect(error.statusCode).toBe(403);
      expect(error.details).toEqual({ requiredTier: 3, currentTier: 1 });
    });
  });

  describe('adminRequired', () => {
    it('should create admin required error', () => {
      const error = adminRequired();
      expect(error.code).toBe(ErrorCodes.ADMIN_REQUIRED);
      expect(error.statusCode).toBe(403);
    });
  });

  describe('validationError', () => {
    it('should create validation error with details', () => {
      const error = validationError('Invalid input', { email: ['Required'] });
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ email: ['Required'] });
    });
  });

  describe('notFound', () => {
    it('should create not found error for resources', () => {
      const error = notFound('Project', '123');
      expect(error.code).toBe(ErrorCodes.PROJECT_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Project with ID 123 not found');
    });

    it('should use generic NOT_FOUND for unknown resources', () => {
      const error = notFound('Widget');
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe('conflict', () => {
    it('should create conflict error', () => {
      const error = conflict('Email already exists');
      expect(error.code).toBe(ErrorCodes.CONFLICT);
      expect(error.statusCode).toBe(409);
    });
  });

  describe('internalError', () => {
    it('should create internal error', () => {
      const error = internalError();
      expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should preserve cause', () => {
      const cause = new Error('Original error');
      const error = internalError('Wrapped error', cause);
      expect(error.originalCause).toBe(cause);
    });
  });

  describe('serviceUnavailable', () => {
    it('should create service-specific errors', () => {
      const notionError = serviceUnavailable('Notion');
      expect(notionError.code).toBe(ErrorCodes.NOTION_UNAVAILABLE);

      const storageError = serviceUnavailable('Storage');
      expect(storageError.code).toBe(ErrorCodes.STORAGE_UNAVAILABLE);

      const stripeError = serviceUnavailable('Stripe');
      expect(stripeError.code).toBe(ErrorCodes.STRIPE_UNAVAILABLE);
    });
  });

  describe('rateLimited', () => {
    it('should create rate limited error', () => {
      const error = rateLimited(60);
      expect(error.code).toBe(ErrorCodes.RATE_LIMITED);
      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });
});
