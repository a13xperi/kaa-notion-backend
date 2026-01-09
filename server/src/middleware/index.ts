/**
 * Middleware Index
 * Central export point for all Express middleware.
 */

// Authentication
export {
  createAuthMiddleware,
  requireAuth,
  optionalAuth,
  generateToken,
  verifyToken,
  shouldRefreshToken,
  type JwtPayload,
  type AuthenticatedUser,
  type AuthMiddlewareOptions,
} from './auth';

// Authorization - Tier
export {
  requireTier,
  requireExactTier,
  requireFeature,
  hasFeature,
  getFeaturesForTier,
  TIER_FEATURES,
  type TierConfig,
} from './requireTier';

// Authorization - Admin
export {
  requireAdmin,
  requireSuperAdmin,
  requireAdminOrOwner,
  isAdmin,
  isTeam,
  isAdminOrTeam,
  type AdminRole,
  type AdminOptions,
} from './requireAdmin';

// Validation
export {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateAll,
  getErrorMessages,
  getFirstError,
  type ValidationTarget,
  type ValidationOptions,
} from './validate';

// Error Handling
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from './errorHandler';
