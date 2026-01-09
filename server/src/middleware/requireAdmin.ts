/**
 * Admin Access Middleware
 * Enforces admin/team-only access for protected routes.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, adminRequired, unauthorized } from '../utils/AppError';

// ============================================================================
// TYPES
// ============================================================================

export type AdminRole = 'ADMIN' | 'TEAM';

export interface AdminOptions {
  roles?: AdminRole[];
  allowSelf?: boolean; // Allow users to access their own resources
  resourceUserIdField?: string; // Field name in params/body containing the resource owner's user ID
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Require admin or team access
 */
export function requireAdmin(options: AdminOptions = {}) {
  const { roles = ['ADMIN', 'TEAM'], allowSelf = false, resourceUserIdField } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw unauthorized('Authentication required');
      }

      // Check if user has required role
      if (roles.includes(req.user.userType as AdminRole)) {
        return next();
      }

      // Check if user is accessing their own resource
      if (allowSelf && resourceUserIdField) {
        const resourceUserId =
          req.params[resourceUserIdField] ||
          req.body?.[resourceUserIdField] ||
          req.query[resourceUserIdField];

        if (resourceUserId === req.user.id) {
          return next();
        }
      }

      throw adminRequired();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(error.toJSON());
        return;
      }
      next(error);
    }
  };
}

/**
 * Require only ADMIN role (excludes TEAM)
 */
export function requireSuperAdmin() {
  return requireAdmin({ roles: ['ADMIN'] });
}

/**
 * Require admin OR resource owner
 */
export function requireAdminOrOwner(resourceUserIdField: string = 'userId') {
  return requireAdmin({
    allowSelf: true,
    resourceUserIdField,
  });
}

/**
 * Check if request is from admin
 */
export function isAdmin(req: Request): boolean {
  return req.user?.userType === 'ADMIN';
}

/**
 * Check if request is from team member
 */
export function isTeam(req: Request): boolean {
  return req.user?.userType === 'TEAM';
}

/**
 * Check if request is from admin or team
 */
export function isAdminOrTeam(req: Request): boolean {
  return req.user?.userType === 'ADMIN' || req.user?.userType === 'TEAM';
}

export default requireAdmin;
