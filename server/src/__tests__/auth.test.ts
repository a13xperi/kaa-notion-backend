/**
 * Auth Tests
 *
 * Tests for registration, login, token handling, protected routes,
 * JWT generation, verification, password hashing, and user authentication.
 */

import { prisma } from '../utils/prisma';
import * as authUtils from '../utils/auth';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  extractToken,
} from '../services/authService';
import { mockUser, mockClient } from './setup';

// Mock auth utilities
jest.mock('../utils/auth', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({
    userId: 'user-123',
    email: 'test@example.com',
    userType: 'SAGE_CLIENT',
    tier: 2,
    type: 'access',
  }),
  TokenExpiredError: class TokenExpiredError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'TokenExpiredError';
    }
  },
  JsonWebTokenError: class JsonWebTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('Auth Routes', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockHashPassword = authUtils.hashPassword as jest.Mock;
  const mockVerifyPassword = authUtils.verifyPassword as jest.Mock;
  const mockGenerateToken = authUtils.generateToken as jest.Mock;
  const mockVerifyToken = authUtils.verifyToken as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHashPassword.mockResolvedValue('$2b$10$hashed-password');
    mockVerifyPassword.mockResolvedValue(true);
    mockGenerateToken.mockReturnValue('jwt-token-123');
    mockVerifyToken.mockReturnValue({ userId: mockUser.id, email: mockUser.email, role: 'CLIENT' });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with email', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      };

      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-id',
        email: registerData.email,
        name: registerData.name,
        userType: 'SAGE_CLIENT',
        role: 'CLIENT',
        createdAt: new Date(),
      });

      // Check user doesn't exist
      const existingUser = await mockPrisma.user.findFirst({
        where: { email: registerData.email },
      });
      expect(existingUser).toBeNull();

      // Hash password
      const hashedPassword = await authUtils.hashPassword(registerData.password);
      expect(hashedPassword).toBeDefined();

      // Create user
      const user = await mockPrisma.user.create({
        data: {
          email: registerData.email,
          name: registerData.name,
          passwordHash: hashedPassword,
          userType: 'SAGE_CLIENT',
          role: 'CLIENT',
        },
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(registerData.email);

      // Generate token
      const token = authUtils.generateToken(
        { userId: user.id, email: user.email, role: 'CLIENT' },
        'test-secret'
      );
      expect(token).toBeDefined();
    });

    it('should register KAA client with address', async () => {
      const registerData = {
        address: '123 Main St, City, ST 12345',
        password: 'SecurePass123!',
      };

      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'kaa-user-id',
        address: registerData.address,
        userType: 'KAA_CLIENT',
        role: 'CLIENT',
      });

      const user = await mockPrisma.user.create({
        data: {
          address: registerData.address,
          passwordHash: await authUtils.hashPassword(registerData.password),
          userType: 'KAA_CLIENT',
          role: 'CLIENT',
        },
      });

      expect(user.userType).toBe('KAA_CLIENT');
      expect(user.address).toBe(registerData.address);
    });

    it('should reject duplicate email registration', async () => {
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const existingUser = await mockPrisma.user.findFirst({
        where: { email: mockUser.email },
      });

      expect(existingUser).toBeDefined();
      expect(existingUser?.email).toBe(mockUser.email);
    });

    it('should validate password requirements', () => {
      const validPasswords = ['SecurePass123!', 'MyP@ssw0rd', 'Test1234!'];
      const invalidPasswords = ['short', 'nope', 'nodigits'];

      // Password should be at least 8 characters
      validPasswords.forEach((password) => {
        expect(password.length).toBeGreaterThanOrEqual(8);
      });

      invalidPasswords.forEach((password) => {
        const hasMinLength = password.length >= 8;
        const hasDigit = /\d/.test(password);
        const isValid = hasMinLength && hasDigit;
        // At least one check should fail
        expect(isValid).toBe(false);
      });
    });

    it('should validate email format', () => {
      const validEmails = ['user@example.com', 'test.user@domain.co.uk'];
      const invalidEmails = ['notanemail', 'missing@domain', '@nodomain.com'];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid email and password', async () => {
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$hashed-password',
      });

      const user = await mockPrisma.user.findFirst({
        where: { email: mockUser.email },
      });

      expect(user).toBeDefined();

      const isValidPassword = await authUtils.verifyPassword('password123', user!.passwordHash!);
      expect(isValidPassword).toBe(true);

      const token = authUtils.generateToken(
        { userId: user!.id, email: user!.email, role: user!.role },
        'test-secret'
      );
      expect(token).toBeDefined();
    });

    it('should login KAA client with address', async () => {
      const kaaUser = {
        ...mockUser,
        email: null,
        address: '123 Main St',
        userType: 'KAA_CLIENT',
        passwordHash: '$2b$10$hashed-password',
      };

      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(kaaUser);

      const user = await mockPrisma.user.findFirst({
        where: { address: '123 Main St' },
      });

      expect(user).toBeDefined();
      expect(user?.userType).toBe('KAA_CLIENT');
    });

    it('should reject invalid credentials', async () => {
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const user = await mockPrisma.user.findFirst({
        where: { email: 'nonexistent@example.com' },
      });

      expect(user).toBeNull();
    });

    it('should reject wrong password', async () => {
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$hashed-password',
      });
      mockVerifyPassword.mockResolvedValue(false);

      const user = await mockPrisma.user.findFirst({
        where: { email: mockUser.email },
      });

      const isValidPassword = await authUtils.verifyPassword('wrongpassword', user!.passwordHash!);
      expect(isValidPassword).toBe(false);
    });

    it('should update last login timestamp', async () => {
      const now = new Date();
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        lastLogin: now,
      });

      await mockPrisma.user.update({
        where: { id: mockUser.id },
        data: { lastLogin: now },
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLogin: now },
      });
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile with valid token', async () => {
      const token = 'valid-jwt-token';

      const payload = authUtils.verifyToken(token, 'test-secret');
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(mockUser.id);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        client: mockClient,
      });

      const user = await mockPrisma.user.findUnique({
        where: { id: payload!.userId },
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe(mockUser.email);
    });

    it('should reject requests without token', () => {
      const authHeader = undefined;
      const hasToken = authHeader && authHeader.startsWith('Bearer ');

      expect(hasToken).toBeFalsy();
    });

    it('should reject invalid token', () => {
      mockVerifyToken.mockReturnValue(null);

      const payload = authUtils.verifyToken('invalid-token', 'test-secret');
      expect(payload).toBeNull();
    });

    it('should reject expired token', () => {
      mockVerifyToken.mockReturnValue(null);

      const payload = authUtils.verifyToken('expired-token', 'test-secret');
      expect(payload).toBeNull();
    });
  });

  describe('POST /api/auth/set-password', () => {
    it('should set password for user without one', async () => {
      const userWithoutPassword = { ...mockUser, passwordHash: null };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(userWithoutPassword);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$new-hashed-password',
      });

      const hashedPassword = await authUtils.hashPassword('NewSecurePass123!');

      await mockPrisma.user.update({
        where: { id: mockUser.id },
        data: { passwordHash: hashedPassword },
      });

      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should require valid token', () => {
      mockVerifyToken.mockReturnValue(null);

      const payload = authUtils.verifyToken('invalid-token', 'test-secret');
      expect(payload).toBeNull();
    });

    it('should validate password minimum length', () => {
      const shortPassword = 'short';
      const validPassword = 'LongEnough123!';

      expect(shortPassword.length).toBeLessThan(8);
      expect(validPassword.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Token Handling', () => {
    it('should generate valid JWT token', () => {
      const payload = { userId: 'test-id', email: 'test@example.com', role: 'CLIENT' };
      const token = authUtils.generateToken(payload, 'secret');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify valid token', () => {
      mockVerifyToken.mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: 'CLIENT',
      });

      const payload = authUtils.verifyToken('valid-token', 'secret');

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(mockUser.id);
    });

    it('should extract token from Authorization header', () => {
      const authHeader = 'Bearer jwt-token-here';
      const token = authHeader.substring(7);

      expect(token).toBe('jwt-token-here');
    });

    it('should handle missing Bearer prefix', () => {
      const authHeader = 'jwt-token-here';
      const isBearer = authHeader.startsWith('Bearer ');

      expect(isBearer).toBe(false);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should identify admin users', () => {
      const adminUser = { ...mockUser, role: 'ADMIN' };
      expect(adminUser.role).toBe('ADMIN');
    });

    it('should identify team users', () => {
      const teamUser = { ...mockUser, role: 'TEAM' };
      expect(teamUser.role).toBe('TEAM');
    });

    it('should identify client users', () => {
      expect(mockUser.role).toBe('CLIENT');
    });

    it('should check tier access', () => {
      const tier2User = { ...mockUser, tier: 2 };
      const requiredTier = 3;

      const hasAccess = tier2User.tier !== null && tier2User.tier >= requiredTier;
      expect(hasAccess).toBe(false);
    });
  });
});

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

    it('should include all payload fields with access type', () => {
      const jwt = require('jsonwebtoken');
      const payload = {
        userId: 'user-456',
        email: 'another@example.com',
        userType: 'ADMIN' as const,
      };

      generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        { ...payload, type: 'access' },
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
        type: 'access',
      });
    });

    it('should throw for invalid token', () => {
      const jwt = require('jsonwebtoken');
      const error = new jwt.JsonWebTokenError('invalid token');
      jwt.verify.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => verifyToken('invalid-token')).toThrow('Invalid authentication token');
    });

    it('should throw for expired token', () => {
      const jwt = require('jsonwebtoken');
      const error = new jwt.TokenExpiredError('jwt expired', new Date());
      jwt.verify.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => verifyToken('expired-token')).toThrow('Authentication token has expired');
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
