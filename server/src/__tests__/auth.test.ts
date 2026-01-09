/**
 * Authentication Tests
 * Tests for JWT generation, verification, and middleware.
 */

import { generateToken, verifyToken, shouldRefreshToken } from '../middleware/auth';
import { AppError } from '../utils/AppError';

describe('Authentication', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: 2,
      };

      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include payload data in token', () => {
      const payload = {
        userId: 'user-456',
        email: 'another@example.com',
        userType: 'ADMIN' as const,
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.userType).toBe(payload.userType);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw AppError for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow(AppError);
    });

    it('should throw AppError for malformed token', () => {
      expect(() => verifyToken('not.a.valid.jwt.token')).toThrow(AppError);
    });
  });

  describe('shouldRefreshToken', () => {
    it('should return true if token expires within 24 hours', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };

      expect(shouldRefreshToken(payload)).toBe(true);
    });

    it('should return false if token expires in more than 24 hours', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 48, // 48 hours from now
        iat: Math.floor(Date.now() / 1000),
      };

      expect(shouldRefreshToken(payload)).toBe(false);
    });

    it('should return false if no exp in payload', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
        iat: Math.floor(Date.now() / 1000),
      };

      expect(shouldRefreshToken(payload)).toBe(false);
    });
  });
});
