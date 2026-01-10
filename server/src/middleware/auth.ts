/**
 * Authentication Middleware
 * JWT verification, user attachment, token refresh handling.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { PrismaClient } from '@prisma/client';
import { AppError, ErrorCodes, unauthorized, invalidToken, tokenExpired } from '../utils/AppError';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface JwtPayload {
  userId: string;
  email: string;
  userType: 'KAA_CLIENT' | 'SAGE_CLIENT' | 'TEAM' | 'ADMIN';
  tier?: number;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: 'KAA_CLIENT' | 'SAGE_CLIENT' | 'TEAM' | 'ADMIN';
  tier?: number;
  clientId?: string;
}

// Note: Express Request.user type is extended in src/types/express.d.ts
// We use the same structure here for consistency

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_THRESHOLD = 60 * 60 * 24; // Refresh if expires within 24 hours

// ============================================================================
// JWT UTILITIES
// ============================================================================

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw tokenExpired();
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw invalidToken();
    }
    throw error;
  }
}

/**
 * Check if token should be refreshed
 */
export function shouldRefreshToken(payload: JwtPayload): boolean {
  if (!payload.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now < JWT_REFRESH_THRESHOLD;
}

/**
 * Extract token from request headers
 */
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check x-access-token header (alternative)
  const xToken = req.headers['x-access-token'];
  if (typeof xToken === 'string') {
    return xToken;
  }

  // Check query parameter (for downloads, etc.)
  const queryToken = req.query.token;
  if (typeof queryToken === 'string') {
    return queryToken;
  }

  return null;
}

// ============================================================================
// MIDDLEWARE FACTORY
// ============================================================================

export interface AuthMiddlewareOptions {
  prisma: PrismaClient;
  optional?: boolean;
}

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  const { prisma, optional = false } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractToken(req);

      // No token provided
      if (!token) {
        // For development, check x-user-id header (remove in production)
        if (process.env.NODE_ENV === 'development') {
          const devUserId = req.headers['x-user-id'] as string;
          const devUserType = req.headers['x-user-type'] as string;

          if (devUserId && devUserType) {
            (req as any).user = {
              id: devUserId,
              email: (req.headers['x-user-email'] as string) || '',
              userType: devUserType as AuthenticatedUser['userType'],
              tier: parseInt(req.headers['x-user-tier'] as string, 10) || undefined,
            };
            return next();
          }
        }

        if (optional) {
          return next();
        }

        throw unauthorized('No authentication token provided');
      }

      // Verify token
      const payload = verifyToken(token);

      // Get user from database to ensure they still exist and are active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          client: true,
        },
      });

      if (!user) {
        throw invalidToken('User no longer exists');
      }

      // Attach user to request (cast to any to allow additional properties)
      (req as any).user = {
        id: user.id,
        email: user.email || '',
        userType: user.userType as AuthenticatedUser['userType'],
        tier: user.tier || undefined,
        clientId: user.client?.id,
      };
      (req as any).token = token;

      // Check if token should be refreshed
      if (shouldRefreshToken(payload)) {
        const newToken = generateToken({
          userId: user.id,
          email: user.email || '',
          userType: user.userType as JwtPayload['userType'],
          tier: user.tier || undefined,
        });
        res.setHeader('X-New-Token', newToken);
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
        return;
      }

      // Unknown error
      logger.error('Auth middleware error', {
        error: (error as Error).message,
      });
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Authentication failed',
        },
      });
    }
  };
}

/**
 * Required authentication middleware (convenience wrapper)
 */
export function requireAuth(prisma: PrismaClient) {
  return createAuthMiddleware({ prisma, optional: false });
}

/**
 * Optional authentication middleware (convenience wrapper)
 */
export function optionalAuth(prisma: PrismaClient) {
  return createAuthMiddleware({ prisma, optional: true });
}

export default createAuthMiddleware;
