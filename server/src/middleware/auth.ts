import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { verifyToken, generateToken } from '../utils/auth';

/**
 * Authentication Middleware
 *
 * JWT verification, user attachment, and token refresh handling.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface AuthenticatedUser {
  userId: string;
  email: string | null;
  name: string | null;
  role: string;
  tier: number | null;
  clientId?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface TokenPayload {
  userId: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const TOKEN_REFRESH_THRESHOLD = 60 * 60; // Refresh if less than 1 hour remaining

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and just "token"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Check if token needs refresh
 */
function tokenNeedsRefresh(payload: TokenPayload): boolean {
  if (!payload.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  const timeRemaining = payload.exp - now;

  return timeRemaining > 0 && timeRemaining < TOKEN_REFRESH_THRESHOLD;
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Authenticate user from JWT token
 * Attaches user to request if valid, returns 401 if not
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NO_TOKEN',
        message: 'Authentication required. No token provided.',
      },
    });
  }

  // Verify token
  const payload = verifyToken(token, JWT_SECRET) as TokenPayload | null;

  if (!payload) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token. Please log in again.',
      },
    });
  }

  // Check if userId exists
  if (!payload.userId || typeof payload.userId !== 'string') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN_PAYLOAD',
        message: 'Token payload is invalid.',
      },
    });
  }

  try {
    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        client: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with this token no longer exists.',
        },
      });
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tier: user.tier,
      clientId: user.client?.id,
    };

    // Check if token needs refresh and add new token to response header
    if (tokenNeedsRefresh(payload)) {
      const newToken = generateToken(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        24 // 24 hours
      );

      res.setHeader('X-Token-Refresh', newToken);
    }

    next();
  } catch (error) {
    console.error('[Auth] Error fetching user:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'An error occurred during authentication.',
      },
    });
  }
}

/**
 * Optional authentication - attaches user if token present, continues if not
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  const payload = verifyToken(token, JWT_SECRET) as TokenPayload | null;

  if (!payload || !payload.userId) {
    return next();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        client: {
          select: {
            id: true,
          },
        },
      },
    });

    if (user) {
      (req as AuthenticatedRequest).user = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
        clientId: user.client?.id,
      };
    }
  } catch (error) {
    console.error('[Auth] Error in optional auth:', error);
  }

  next();
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    if (!roles.includes(user.role)) {
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

/**
 * Require admin role (ADMIN or TEAM)
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
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

/**
 * Require minimum tier level
 */
export function requireTier(minTier: number) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const user = (req as AuthenticatedRequest).user;

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
    if (user.role === 'ADMIN' || user.role === 'TEAM') {
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

/**
 * Require ownership of resource or admin
 */
export function requireOwnerOrAdmin(getOwnerId: (req: Request) => Promise<string | null>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    // Admins can access anything
    if (user.role === 'ADMIN' || user.role === 'TEAM') {
      return next();
    }

    try {
      const ownerId = await getOwnerId(req);

      if (!ownerId) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found.',
          },
        });
      }

      // Check if user owns the resource (by userId or clientId)
      if (ownerId !== user.userId && ownerId !== user.clientId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this resource.',
          },
        });
      }

      next();
    } catch (error) {
      console.error('[Auth] Error checking ownership:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'An error occurred during authorization.',
        },
      });
    }
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireAdmin,
  requireTier,
  requireOwnerOrAdmin,
};
