/**
 * Auth Middleware Aliases
 * Re-exports auth functions with commonly used names
 */

export {
  authenticate as requireAuth,
  optionalAuthenticate as optionalAuth,
  requireRole,
  requireAdmin,
  requireTier,
  requireOwnerOrAdmin,
  AuthenticatedRequest,
  AuthenticatedUser,
} from './auth';
