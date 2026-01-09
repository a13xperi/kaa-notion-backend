/**
 * Auth Service Tests
 * Tests for JWT generation, verification, password hashing, and user authentication.
 */

import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  extractToken,
} from '../services/authService';

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({
    userId: 'user-123',
    email: 'test@example.com',
    userType: 'SAGE_CLIENT',
    tier: 2,
  }),
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('Auth Service', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'SecurePassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBe('hashed-password');
    });

    it('should produce different hashes for different passwords', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.hash
        .mockResolvedValueOnce('hash1')
        .mockResolvedValueOnce('hash2');

      const hash1 = await hashPassword('password1');
      const hash2 = await hashPassword('password2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const result = await comparePassword('password', 'hashed-password');
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValueOnce(false);

      const result = await comparePassword('wrong-password', 'hashed-password');
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT' as const,
        tier: 2,
      };

      const token = generateToken(payload);
      
      expect(token).toBe('mock-jwt-token');
    });

    it('should include all payload fields', () => {
      const jwt = require('jsonwebtoken');
      const payload = {
        userId: 'user-456',
        email: 'another@example.com',
        userType: 'ADMIN' as const,
      };

      generateToken(payload);
      
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        expect.any(String),
        expect.objectContaining({ expiresIn: expect.any(String) })
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = 'valid-jwt-token';
      const payload = verifyToken(token);
      
      expect(payload).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT',
        tier: 2,
      });
    });

    it('should throw for invalid token', () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('invalid token');
      });

      expect(() => verifyToken('invalid-token')).toThrow('Invalid or expired token');
    });

    it('should throw for expired token', () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('jwt expired');
      });

      expect(() => verifyToken('expired-token')).toThrow('Invalid or expired token');
    });
  });

  describe('extractToken', () => {
    it('should extract token from Bearer header', () => {
      const token = extractToken('Bearer my-jwt-token');
      expect(token).toBe('my-jwt-token');
    });

    it('should return null for missing header', () => {
      const token = extractToken(undefined);
      expect(token).toBeNull();
    });

    it('should return null for empty header', () => {
      const token = extractToken('');
      expect(token).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      const token = extractToken('Basic credentials');
      expect(token).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const token = extractToken('Bearer');
      expect(token).toBeNull();
    });

    it('should be case-insensitive for Bearer', () => {
      const token = extractToken('bearer my-token');
      expect(token).toBe('my-token');
    });
  });
});

describe('Auth Integration Scenarios', () => {
  describe('Registration Flow', () => {
    it('should hash password and generate token for new user', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      
      const token = generateToken({
        userId: 'new-user-id',
        email: 'newuser@example.com',
        userType: 'SAGE_CLIENT',
        tier: 1,
      });
      
      expect(token).toBeDefined();
    });
  });

  describe('Login Flow', () => {
    it('should verify password and generate token for existing user', async () => {
      const isValid = await comparePassword('password', 'stored-hash');
      expect(isValid).toBe(true);
      
      const token = generateToken({
        userId: 'existing-user-id',
        email: 'existing@example.com',
        userType: 'SAGE_CLIENT',
        tier: 2,
      });
      
      expect(token).toBeDefined();
    });
  });

  describe('Token Refresh Flow', () => {
    it('should verify old token and generate new one', () => {
      const oldToken = 'old-valid-token';
      const payload = verifyToken(oldToken);
      
      expect(payload.userId).toBeDefined();
      
      const newToken = generateToken({
        userId: payload.userId,
        email: payload.email,
        userType: payload.userType,
        tier: payload.tier,
      });
      
      expect(newToken).toBeDefined();
    });
  });
});
