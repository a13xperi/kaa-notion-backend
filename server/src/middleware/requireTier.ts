/**
 * Tier Access Middleware
 * Enforces tier-based access control for protected resources.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, insufficientTier, unauthorized } from '../utils/AppError';

// ============================================================================
// TYPES
// ============================================================================

export interface TierConfig {
  minTier: number;
  allowHigher?: boolean;
  exactTier?: boolean;
}

// ============================================================================
// TIER DEFINITIONS
// ============================================================================

export const TIER_FEATURES = {
  // Tier 1: The Concept (DIY)
  1: [
    'view_project',
    'view_deliverables',
    'download_deliverables',
    'view_milestones',
  ],
  // Tier 2: The Builder
  2: [
    'view_project',
    'view_deliverables',
    'download_deliverables',
    'view_milestones',
    'request_revisions',
    'upload_inspiration',
  ],
  // Tier 3: The Concierge
  3: [
    'view_project',
    'view_deliverables',
    'download_deliverables',
    'view_milestones',
    'request_revisions',
    'upload_inspiration',
    'schedule_calls',
    'priority_support',
  ],
  // Tier 4: KAA White Glove
  4: [
    'view_project',
    'view_deliverables',
    'download_deliverables',
    'view_milestones',
    'request_revisions',
    'upload_inspiration',
    'schedule_calls',
    'priority_support',
    'site_visits',
    'contractor_coordination',
    'concierge_service',
  ],
} as const;

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Require minimum tier level
 */
export function requireTier(minTier: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as any).user;
      
      // Check if user is authenticated
      if (!user) {
        throw unauthorized('Authentication required');
      }

      // Admin and team members bypass tier checks
      if (user.userType === 'ADMIN' || user.userType === 'TEAM') {
        return next();
      }

      // Check user tier
      const userTier = user.tier;

      if (!userTier) {
        throw insufficientTier(minTier, 0);
      }

      if (userTier < minTier) {
        throw insufficientTier(minTier, userTier);
      }

      next();
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
 * Require exact tier level (not higher or lower)
 */
export function requireExactTier(tier: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        throw unauthorized('Authentication required');
      }

      // Admin and team members bypass
      if (user.userType === 'ADMIN' || user.userType === 'TEAM') {
        return next();
      }

      const userTier = user.tier;

      if (userTier !== tier) {
        throw new AppError({
          code: 'INSUFFICIENT_TIER',
          message: `This feature is only available for Tier ${tier}`,
          details: { requiredTier: tier, currentTier: userTier },
        });
      }

      next();
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
 * Require specific feature access
 */
export function requireFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        throw unauthorized('Authentication required');
      }

      // Admin and team members have all features
      if (user.userType === 'ADMIN' || user.userType === 'TEAM') {
        return next();
      }

      const userTier = user.tier as 1 | 2 | 3 | 4;

      if (!userTier || !TIER_FEATURES[userTier]) {
        throw insufficientTier(1, 0);
      }

      const tierFeatures = TIER_FEATURES[userTier] as readonly string[];

      if (!tierFeatures.includes(feature)) {
        // Find minimum tier that has this feature
        let minTierForFeature = 4;
        for (let t = 1; t <= 4; t++) {
          const features = TIER_FEATURES[t as 1 | 2 | 3 | 4] as readonly string[];
          if (features.includes(feature)) {
            minTierForFeature = t;
            break;
          }
        }

        throw insufficientTier(minTierForFeature, userTier);
      }

      next();
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
 * Check if user has access to a specific tier feature
 */
export function hasFeature(tier: number, feature: string): boolean {
  if (tier < 1 || tier > 4) return false;
  const tierFeatures = TIER_FEATURES[tier as 1 | 2 | 3 | 4] as readonly string[];
  return tierFeatures.includes(feature);
}

/**
 * Get all features for a tier
 */
export function getFeaturesForTier(tier: number): string[] {
  if (tier < 1 || tier > 4) return [];
  return [...TIER_FEATURES[tier as 1 | 2 | 3 | 4]];
}

export default requireTier;
