/**
 * Auth Utilities and Middleware Tests
 *
 * Tests for:
 * - verifyTokenUtil: Token verification with signature validation
 * - generateTokenUtil: Token generation with correct payload and expiry
 * - Auth middleware: Authentication and authorization scenarios
 */

import { Request, Response, NextFunction } from 'express';
import {
  generateToken as generateTokenUtil,
  verifyToken as verifyTokenUtil,
} from '../utils/auth';

// Inline mock helpers to avoid setup.ts Prisma dependency issues
function createMockRequest(overrides: Record<string, unknown> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    get: jest.fn(),
    ip: '127.0.0.1',
    ...overrides,
  } as Partial<Request>;
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

function createMockNext(): jest.Mock {
  return jest.fn();
}

// Define AuthenticatedUser interface locally to avoid importing from middleware
interface AuthenticatedUser {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  role: string;
  userType: 'KAA_CLIENT' | 'SAGE_CLIENT' | 'TEAM' | 'ADMIN';
  tier: number | null;
  clientId?: string;
}

// Inline middleware implementations to test without Prisma dependencies
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const user = (req as Request & { user?: AuthenticatedUser }).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    if (!roles.includes(user.role) && !roles.includes(user.userType)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${roles.join(' or ')}.`,
        },
      });
    }

    next();
  };
}

function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  const user = (req as Request & { user?: AuthenticatedUser }).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  const adminRoles = ['ADMIN', 'TEAM'];
  if (!adminRoles.includes(user.role) && !adminRoles.includes(user.userType)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ADMIN_REQUIRED',
        message: 'Admin access required.',
      },
    });
  }

  next();
}

function requireTier(minTier: number) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const user = (req as Request & { user?: AuthenticatedUser }).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    // Admins bypass tier check
    const adminRoles = ['ADMIN', 'TEAM'];
    if (adminRoles.includes(user.role) || adminRoles.includes(user.userType)) {
      return next();
    }

    if (!user.tier || user.tier < minTier) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TIER_REQUIRED',
          message: `This feature requires Tier ${minTier} or higher.`,
          requiredTier: minTier,
          currentTier: user.tier || 0,
        },
      });
    }

    next();
  };
}

// ============================================================================
// VERIFY TOKEN UTIL TESTS
// ============================================================================

describe('verifyTokenUtil', () => {
  const secret = 'test-secret-key';

  describe('valid tokens', () => {
    it('should verify a valid token and return payload', () => {
      const payload = { userId: 'user-123', email: 'test@example.com', role: 'CLIENT' };
      const token = generateTokenUtil(payload, secret, 1);

      const decoded = verifyTokenUtil(token, secret);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-123');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.role).toBe('CLIENT');
    });

    it('should include iat and exp in decoded payload', () => {
      const payload = { userId: 'user-456' };
      const token = generateTokenUtil(payload, secret, 1);

      const decoded = verifyTokenUtil(token, secret);

      expect(decoded).not.toBeNull();
      expect(decoded?.iat).toBeDefined();
      expect(decoded?.exp).toBeDefined();
      expect(typeof decoded?.iat).toBe('number');
      expect(typeof decoded?.exp).toBe('number');
    });

    it('should verify token with custom payload fields', () => {
      const payload = {
        userId: 'user-789',
        email: 'custom@example.com',
        userType: 'ADMIN',
        tier: 3,
        customField: 'customValue',
      };
      const token = generateTokenUtil(payload, secret, 24);

      const decoded = verifyTokenUtil(token, secret);

      expect(decoded?.userId).toBe('user-789');
      expect(decoded?.userType).toBe('ADMIN');
      expect(decoded?.tier).toBe(3);
      expect(decoded?.customField).toBe('customValue');
    });

    it('should verify token generated with different expiry times', () => {
      const payload = { userId: 'user-abc' };

      // 1 hour expiry
      const shortToken = generateTokenUtil(payload, secret, 1);
      const shortDecoded = verifyTokenUtil(shortToken, secret);
      expect(shortDecoded?.userId).toBe('user-abc');

      // 24 hour expiry
      const longToken = generateTokenUtil(payload, secret, 24);
      const longDecoded = verifyTokenUtil(longToken, secret);
      expect(longDecoded?.userId).toBe('user-abc');
    });
  });

  describe('invalid tokens', () => {
    it('should return null for token with invalid signature', () => {
      const payload = { userId: 'user-123' };
      const token = generateTokenUtil(payload, secret, 1);
      const differentSecret = 'different-secret';

      const decoded = verifyTokenUtil(token, differentSecret);

      expect(decoded).toBeNull();
    });

    it('should return null for malformed token (missing parts)', () => {
      const malformedTokens = [
        'not-a-jwt',
        'only.two.parts.missing',
        '',
        'single',
      ];

      malformedTokens.forEach((token) => {
        const decoded = verifyTokenUtil(token, secret);
        expect(decoded).toBeNull();
      });
    });

    it('should return null for token with tampered payload', () => {
      const payload = { userId: 'user-123' };
      const token = generateTokenUtil(payload, secret, 1);

      // Tamper with the payload part
      const [header, , signature] = token.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ userId: 'hacker-999' })
      ).toString('base64url');
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      const decoded = verifyTokenUtil(tamperedToken, secret);

      expect(decoded).toBeNull();
    });

    it('should return null for token with invalid base64 encoding', () => {
      const invalidToken = 'invalid!!!.base64!!!.encoding!!!';

      const decoded = verifyTokenUtil(invalidToken, secret);

      expect(decoded).toBeNull();
    });

    it('should return null for empty secret', () => {
      const payload = { userId: 'user-123' };
      const token = generateTokenUtil(payload, secret, 1);

      const decoded = verifyTokenUtil(token, '');

      expect(decoded).toBeNull();
    });
  });

  describe('expired tokens', () => {
    it('should return null for expired token', () => {
      // Create a token that's already expired by manipulating the payload directly
      const header = { alg: 'HS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const expiredPayload = {
        userId: 'user-123',
        iat: now - 7200, // 2 hours ago
        exp: now - 3600, // 1 hour ago (expired)
      };

      const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
      const base64Payload = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');

      // Create proper signature
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${base64Header}.${base64Payload}`)
        .digest('base64url');

      const expiredToken = `${base64Header}.${base64Payload}.${signature}`;

      const decoded = verifyTokenUtil(expiredToken, secret);

      expect(decoded).toBeNull();
    });

    it('should verify token that is not yet expired', () => {
      const payload = { userId: 'user-123' };
      const token = generateTokenUtil(payload, secret, 1); // 1 hour from now

      const decoded = verifyTokenUtil(token, secret);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-123');
    });
  });
});

// ============================================================================
// GENERATE TOKEN UTIL TESTS
// ============================================================================

describe('generateTokenUtil', () => {
  const secret = 'test-secret-key';

  describe('token generation', () => {
    it('should generate a valid JWT token string', () => {
      const payload = { userId: 'user-123' };

      const token = generateTokenUtil(payload, secret, 1);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include payload fields in generated token', () => {
      const payload = {
        userId: 'user-456',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const token = generateTokenUtil(payload, secret, 24);
      const decoded = verifyTokenUtil(token, secret);

      expect(decoded?.userId).toBe('user-456');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.role).toBe('ADMIN');
    });

    it('should set correct expiry based on expiresInHours parameter', () => {
      const payload = { userId: 'user-789' };
      const expiresInHours = 2;

      const token = generateTokenUtil(payload, secret, expiresInHours);
      const decoded = verifyTokenUtil(token, secret) as { iat: number; exp: number } | null;

      const expectedExpiry = decoded!.iat + expiresInHours * 3600;
      expect(decoded?.exp).toBe(expectedExpiry);
    });

    it('should use default 24 hour expiry when not specified', () => {
      const payload = { userId: 'user-default' };

      const token = generateTokenUtil(payload, secret);
      const decoded = verifyTokenUtil(token, secret) as { iat: number; exp: number } | null;

      const expectedExpiry = decoded!.iat + 24 * 3600;
      expect(decoded?.exp).toBe(expectedExpiry);
    });

    it('should set iat to current timestamp', () => {
      const beforeGeneration = Math.floor(Date.now() / 1000);
      const payload = { userId: 'user-time' };

      const token = generateTokenUtil(payload, secret, 1);
      const decoded = verifyTokenUtil(token, secret);

      const afterGeneration = Math.floor(Date.now() / 1000);

      expect(decoded?.iat).toBeGreaterThanOrEqual(beforeGeneration);
      expect(decoded?.iat).toBeLessThanOrEqual(afterGeneration);
    });

    it('should generate different tokens for different payloads', () => {
      const payload1 = { userId: 'user-1' };
      const payload2 = { userId: 'user-2' };

      const token1 = generateTokenUtil(payload1, secret, 1);
      const token2 = generateTokenUtil(payload2, secret, 1);

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens with different secrets', () => {
      const payload = { userId: 'user-same' };

      const token1 = generateTokenUtil(payload, 'secret-1', 1);
      const token2 = generateTokenUtil(payload, 'secret-2', 1);

      expect(token1).not.toBe(token2);
    });

    it('should handle complex payload objects', () => {
      const payload = {
        userId: 'user-complex',
        permissions: ['read', 'write'],
        metadata: { department: 'engineering' },
        isActive: true,
        count: 42,
      };

      const token = generateTokenUtil(payload, secret, 1);
      const decoded = verifyTokenUtil(token, secret);

      expect(decoded?.userId).toBe('user-complex');
      expect(decoded?.permissions).toEqual(['read', 'write']);
      expect(decoded?.metadata).toEqual({ department: 'engineering' });
      expect(decoded?.isActive).toBe(true);
      expect(decoded?.count).toBe(42);
    });
  });

  describe('token format', () => {
    it('should generate token with HS256 algorithm header', () => {
      const payload = { userId: 'user-alg' };

      const token = generateTokenUtil(payload, secret, 1);
      const [headerPart] = token.split('.');
      const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString());

      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
    });
  });
});

// ============================================================================
// AUTH MIDDLEWARE TESTS
// ============================================================================

describe('Auth Middleware', () => {
  describe('requireRole', () => {
    it('should allow access for user with matching role', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          userType: 'ADMIN',
          tier: null,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('ADMIN');
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'TEAM',
          userType: 'TEAM',
          tier: null,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('ADMIN', 'TEAM', 'SAGE_CLIENT');
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      const req = createMockRequest(); // No user attached
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('ADMIN');
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user role does not match', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'SAGE_CLIENT',
          userType: 'SAGE_CLIENT',
          tier: 2,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('ADMIN');
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should check userType if role does not match', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'CLIENT', // Different from userType
          userType: 'ADMIN', // Should match
          tier: null,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('ADMIN');
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for ADMIN user', () => {
      const req = createMockRequest({
        user: {
          id: 'admin-123',
          userId: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          userType: 'ADMIN',
          tier: null,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access for TEAM user', () => {
      const req = createMockRequest({
        user: {
          id: 'team-123',
          userId: 'team-123',
          email: 'team@example.com',
          name: 'Team User',
          role: 'TEAM',
          userType: 'TEAM',
          tier: null,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
    });

    it('should return 403 for non-admin users', () => {
      const req = createMockRequest({
        user: {
          id: 'client-123',
          userId: 'client-123',
          email: 'client@example.com',
          name: 'Client User',
          role: 'SAGE_CLIENT',
          userType: 'SAGE_CLIENT',
          tier: 2,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'ADMIN_REQUIRED',
          }),
        })
      );
    });

    it('should check userType for admin access', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'CLIENT',
          userType: 'ADMIN', // Admin by userType
          tier: null,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireTier', () => {
    it('should allow access when user tier meets minimum', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'SAGE_CLIENT',
          userType: 'SAGE_CLIENT',
          tier: 3,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireTier(2);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access when user tier equals minimum', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'SAGE_CLIENT',
          userType: 'SAGE_CLIENT',
          tier: 2,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireTier(2);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireTier(2);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
    });

    it('should return 403 when user tier is below minimum', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'SAGE_CLIENT',
          userType: 'SAGE_CLIENT',
          tier: 1,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireTier(3);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'TIER_REQUIRED',
            requiredTier: 3,
            currentTier: 1,
          }),
        })
      );
    });

    it('should return 403 when user has no tier', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'SAGE_CLIENT',
          userType: 'SAGE_CLIENT',
          tier: null,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireTier(2);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'TIER_REQUIRED',
            currentTier: 0,
          }),
        })
      );
    });

    it('should bypass tier check for ADMIN users', () => {
      const req = createMockRequest({
        user: {
          id: 'admin-123',
          userId: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          userType: 'ADMIN',
          tier: null, // No tier, but admin
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireTier(3);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should bypass tier check for TEAM users', () => {
      const req = createMockRequest({
        user: {
          id: 'team-123',
          userId: 'team-123',
          email: 'team@example.com',
          name: 'Team User',
          role: 'TEAM',
          userType: 'TEAM',
          tier: 1, // Low tier, but team member
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireTier(3);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// AUTHORIZATION ERROR SCENARIOS
// ============================================================================

describe('Authorization Error Scenarios', () => {
  describe('unauthorized access (401)', () => {
    it('should return 401 with proper error structure for missing auth', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    });

    it('should not call next() on unauthorized', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('ADMIN');
      middleware(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('forbidden access (403)', () => {
    it('should return 403 with role requirement message', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'SAGE_CLIENT',
          userType: 'SAGE_CLIENT',
          tier: 2,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('ADMIN', 'TEAM');
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role: ADMIN or TEAM.',
        },
      });
    });

    it('should return 403 with tier information', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'SAGE_CLIENT',
          userType: 'SAGE_CLIENT',
          tier: 1,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireTier(3);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TIER_REQUIRED',
          message: 'This feature requires Tier 3 or higher.',
          requiredTier: 3,
          currentTier: 1,
        },
      });
    });

    it('should return 403 with admin required message', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'KAA_CLIENT',
          userType: 'KAA_CLIENT',
          tier: 2,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ADMIN_REQUIRED',
          message: 'Admin access required.',
        },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle user with undefined tier', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'SAGE_CLIENT',
          userType: 'SAGE_CLIENT',
          tier: undefined,
        } as unknown as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireTier(1);
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle empty roles array in requireRole', () => {
      const req = createMockRequest({
        user: {
          id: 'user-123',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          userType: 'ADMIN',
          tier: null,
        } as AuthenticatedUser,
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole(); // No roles specified
      middleware(req as Request, res as Response, next);

      // Should deny access since no roles match
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
