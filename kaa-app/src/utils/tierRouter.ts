/**
 * Tier Router Utility
 *
 * Determines which service tier a lead should be assigned to based on
 * intake form responses. Uses the sageTiers config as the single source
 * of truth for all tier definitions and thresholds.
 *
 * @module utils/tierRouter
 * @version 1.0.0
 */

import {
  TierNumber,
  BudgetRangeValue,
  TimelineValue,
  ProjectTypeValue,
  BUDGET_THRESHOLDS,
  BUDGET_RANGES,
  TIMELINE_THRESHOLDS,
  TIMELINE_OPTIONS,
  PROJECT_TYPE_MIN_TIERS,
  ASSET_HEURISTICS,
  TIER_DEFINITIONS,
  getTierFromBudget,
  parseBudgetRange,
  parseTimelineWeeks,
} from '../config/sageTiers';

// ============================================
// INPUT/OUTPUT TYPES
// ============================================

/**
 * Input data from the intake form
 */
export interface IntakeFormData {
  /** Selected budget range */
  budgetRange: BudgetRangeValue;
  /** Selected timeline option */
  timeline: TimelineValue;
  /** Type of project */
  projectType: ProjectTypeValue;
  /** Whether client has an existing survey */
  hasSurvey: boolean;
  /** Whether client has existing drawings */
  hasDrawings: boolean;
  /** Project address (optional, for future location-based routing) */
  projectAddress?: string;
}

/**
 * Confidence level of the tier recommendation
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Routing factor that contributed to the tier decision
 */
export interface RoutingFactor {
  /** Factor category */
  category: 'budget' | 'timeline' | 'assets' | 'project_type' | 'override';
  /** Human-readable reason */
  reason: string;
  /** Tier adjustment caused by this factor */
  tierAdjustment: number;
  /** Whether this factor triggers manual review */
  triggersReview: boolean;
}

/**
 * Complete tier recommendation result
 */
export interface TierRecommendation {
  /** Recommended tier number (1-4) */
  tier: TierNumber;
  /** Primary reason for this recommendation */
  reason: string;
  /** Confidence level of the recommendation */
  confidence: ConfidenceLevel;
  /** Whether manual review is required */
  needsManualReview: boolean;
  /** Detailed breakdown of all routing factors */
  factors: RoutingFactor[];
  /** The tier definition for the recommended tier */
  tierDefinition: typeof TIER_DEFINITIONS[TierNumber];
}

// ============================================
// ROUTING LOGIC
// ============================================

/**
 * Main tier routing function - returns deterministic tier recommendation
 *
 * @param data - Intake form data
 * @returns TierRecommendation with tier, reason, confidence, and factors
 *
 * @example
 * ```typescript
 * const result = recommendTier({
 *   budgetRange: '2500_10000',
 *   timeline: '4_8_weeks',
 *   projectType: 'standard_renovation',
 *   hasSurvey: true,
 *   hasDrawings: false,
 * });
 *
 * console.log(result.tier); // 2
 * console.log(result.reason); // "Mid-range budget ($2,500 - $10,000)"
 * ```
 */
export function recommendTier(data: IntakeFormData): TierRecommendation {
  const factors: RoutingFactor[] = [];
  let baseTier: TierNumber = 1;
  let needsReview = false;

  // ----------------------------------------
  // Step 1: Budget-based routing (primary factor)
  // ----------------------------------------
  const budgetResult = analyzeBudget(data.budgetRange);
  baseTier = budgetResult.tier;
  factors.push(budgetResult.factor);
  if (budgetResult.triggersReview) {
    needsReview = true;
  }

  // ----------------------------------------
  // Step 2: Timeline analysis
  // ----------------------------------------
  const timelineResult = analyzeTimeline(data.timeline, baseTier);
  if (timelineResult.tierAdjustment !== 0) {
    baseTier = clampTier(baseTier + timelineResult.tierAdjustment);
  }
  factors.push(timelineResult.factor);
  if (timelineResult.triggersReview) {
    needsReview = true;
  }

  // ----------------------------------------
  // Step 3: Asset analysis
  // ----------------------------------------
  const assetResult = analyzeAssets(data.hasSurvey, data.hasDrawings, baseTier);
  if (assetResult.tierAdjustment !== 0) {
    baseTier = clampTier(baseTier + assetResult.tierAdjustment);
  }
  factors.push(assetResult.factor);
  if (assetResult.triggersReview) {
    needsReview = true;
  }

  // ----------------------------------------
  // Step 4: Project type analysis
  // ----------------------------------------
  const projectResult = analyzeProjectType(data.projectType, baseTier);
  if (projectResult.tierAdjustment !== 0) {
    baseTier = clampTier(baseTier + projectResult.tierAdjustment);
  }
  factors.push(projectResult.factor);
  if (projectResult.triggersReview) {
    needsReview = true;
  }

  // ----------------------------------------
  // Step 5: Tier 4 always requires review
  // ----------------------------------------
  if (baseTier === 4) {
    needsReview = true;
  }

  // ----------------------------------------
  // Step 6: Calculate confidence
  // ----------------------------------------
  const confidence = calculateConfidence(factors, needsReview);

  // ----------------------------------------
  // Step 7: Build primary reason
  // ----------------------------------------
  const primaryReason = buildPrimaryReason(factors);

  return {
    tier: baseTier,
    reason: primaryReason,
    confidence,
    needsManualReview: needsReview,
    factors,
    tierDefinition: TIER_DEFINITIONS[baseTier],
  };
}

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

/**
 * Analyze budget range and return tier recommendation
 */
function analyzeBudget(budgetRange: BudgetRangeValue): {
  tier: TierNumber;
  factor: RoutingFactor;
  triggersReview: boolean;
} {
  const range = BUDGET_RANGES.find(r => r.value === budgetRange);

  // Handle percentage-based pricing (Tier 4)
  if (budgetRange === 'percent_of_install') {
    return {
      tier: 4,
      factor: {
        category: 'budget',
        reason: 'Percentage-based pricing model',
        tierAdjustment: 0,
        triggersReview: true,
      },
      triggersReview: true,
    };
  }

  // Handle under minimum budget
  if (budgetRange === 'under_500') {
    return {
      tier: 1,
      factor: {
        category: 'budget',
        reason: `Budget under $${BUDGET_THRESHOLDS.TIER_1_MIN} - may not meet minimum`,
        tierAdjustment: 0,
        triggersReview: true,
      },
      triggersReview: true,
    };
  }

  if (!range) {
    return {
      tier: 1,
      factor: {
        category: 'budget',
        reason: 'Unknown budget range - defaulting to Tier 1',
        tierAdjustment: 0,
        triggersReview: true,
      },
      triggersReview: true,
    };
  }

  // Use midpoint of range to determine tier
  const midpoint = range.max === Infinity ? range.min * 2 : (range.min + range.max) / 2;
  const tier = getTierFromBudget(midpoint);

  return {
    tier,
    factor: {
      category: 'budget',
      reason: `${range.label} budget`,
      tierAdjustment: 0,
      triggersReview: false,
    },
    triggersReview: false,
  };
}

/**
 * Analyze timeline and return tier adjustment
 */
function analyzeTimeline(timeline: TimelineValue, currentTier: TierNumber): {
  tierAdjustment: number;
  factor: RoutingFactor;
  triggersReview: boolean;
} {
  const weeks = parseTimelineWeeks(timeline);
  const option = TIMELINE_OPTIONS.find(t => t.value === timeline);
  const label = option?.label || timeline;

  // Fast track: under 2 weeks
  if (weeks < TIMELINE_THRESHOLDS.FAST_TRACK) {
    if (currentTier > 2) {
      return {
        tierAdjustment: 0,
        factor: {
          category: 'timeline',
          reason: `Tight timeline (${label}) may not be feasible for Tier ${currentTier}`,
          tierAdjustment: 0,
          triggersReview: true,
        },
        triggersReview: true,
      };
    }
    return {
      tierAdjustment: 0,
      factor: {
        category: 'timeline',
        reason: `Fast track timeline (${label})`,
        tierAdjustment: 0,
        triggersReview: false,
      },
      triggersReview: false,
    };
  }

  // Extended timeline: over 8 weeks
  if (weeks > TIMELINE_THRESHOLDS.EXTENDED) {
    if (currentTier < 3) {
      return {
        tierAdjustment: 1,
        factor: {
          category: 'timeline',
          reason: `Extended timeline (${label}) suggests more complex project`,
          tierAdjustment: 1,
          triggersReview: false,
        },
        triggersReview: false,
      };
    }
    return {
      tierAdjustment: 0,
      factor: {
        category: 'timeline',
        reason: `Extended timeline (${label})`,
        tierAdjustment: 0,
        triggersReview: false,
      },
      triggersReview: false,
    };
  }

  // Standard timeline
  return {
    tierAdjustment: 0,
    factor: {
      category: 'timeline',
      reason: `Standard timeline (${label})`,
      tierAdjustment: 0,
      triggersReview: false,
    },
    triggersReview: false,
  };
}

/**
 * Analyze asset availability and return tier adjustment
 */
function analyzeAssets(hasSurvey: boolean, hasDrawings: boolean, currentTier: TierNumber): {
  tierAdjustment: number;
  factor: RoutingFactor;
  triggersReview: boolean;
} {
  // Has both survey and drawings
  if (hasSurvey && hasDrawings) {
    if (currentTier > 2 && ASSET_HEURISTICS.HAS_BOTH_ASSETS.canDowngrade) {
      return {
        tierAdjustment: -1,
        factor: {
          category: 'assets',
          reason: 'Has survey and drawings - streamlined process possible',
          tierAdjustment: -1,
          triggersReview: false,
        },
        triggersReview: false,
      };
    }
    return {
      tierAdjustment: 0,
      factor: {
        category: 'assets',
        reason: 'Has survey and drawings',
        tierAdjustment: 0,
        triggersReview: false,
      },
      triggersReview: false,
    };
  }

  // Has only one asset
  if (hasSurvey || hasDrawings) {
    const assetName = hasSurvey ? 'survey' : 'drawings';
    if (currentTier < ASSET_HEURISTICS.HAS_ONE_ASSET.suggestedMinTier) {
      return {
        tierAdjustment: 1,
        factor: {
          category: 'assets',
          reason: `Has ${assetName} only - some additional work needed`,
          tierAdjustment: 1,
          triggersReview: false,
        },
        triggersReview: false,
      };
    }
    return {
      tierAdjustment: 0,
      factor: {
        category: 'assets',
        reason: `Has ${assetName} only`,
        tierAdjustment: 0,
        triggersReview: false,
      },
      triggersReview: false,
    };
  }

  // No assets at all
  if (currentTier < ASSET_HEURISTICS.HAS_NO_ASSETS.suggestedMinTier) {
    return {
      tierAdjustment: ASSET_HEURISTICS.HAS_NO_ASSETS.suggestedMinTier - currentTier,
      factor: {
        category: 'assets',
        reason: ASSET_HEURISTICS.HAS_NO_ASSETS.reason,
        tierAdjustment: ASSET_HEURISTICS.HAS_NO_ASSETS.suggestedMinTier - currentTier,
        triggersReview: false,
      },
      triggersReview: false,
    };
  }

  return {
    tierAdjustment: 0,
    factor: {
      category: 'assets',
      reason: 'No survey or drawings - site visit required',
      tierAdjustment: 0,
      triggersReview: false,
    },
    triggersReview: false,
  };
}

/**
 * Analyze project type and return tier adjustment
 */
function analyzeProjectType(projectType: ProjectTypeValue, currentTier: TierNumber): {
  tierAdjustment: number;
  factor: RoutingFactor;
  triggersReview: boolean;
} {
  const minTier = PROJECT_TYPE_MIN_TIERS[projectType];
  const projectLabel = projectType.split('_').map(w =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');

  // Check if project type requires higher tier
  if (minTier > currentTier) {
    const triggersReview = minTier === 4;
    return {
      tierAdjustment: minTier - currentTier,
      factor: {
        category: 'project_type',
        reason: `${projectLabel} requires minimum Tier ${minTier}`,
        tierAdjustment: minTier - currentTier,
        triggersReview,
      },
      triggersReview,
    };
  }

  return {
    tierAdjustment: 0,
    factor: {
      category: 'project_type',
      reason: `${projectLabel}`,
      tierAdjustment: 0,
      triggersReview: false,
    },
    triggersReview: false,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Clamp tier to valid range (1-4)
 */
function clampTier(tier: number): TierNumber {
  if (tier < 1) return 1;
  if (tier > 4) return 4;
  return tier as TierNumber;
}

/**
 * Calculate confidence level based on factors
 */
function calculateConfidence(factors: RoutingFactor[], needsReview: boolean): ConfidenceLevel {
  if (needsReview) return 'low';

  const adjustmentCount = factors.filter(f => f.tierAdjustment !== 0).length;
  const reviewTriggers = factors.filter(f => f.triggersReview).length;

  if (adjustmentCount === 0 && reviewTriggers === 0) return 'high';
  if (adjustmentCount <= 1 && reviewTriggers === 0) return 'high';
  if (adjustmentCount <= 2) return 'medium';
  return 'low';
}

/**
 * Build the primary reason string from factors
 */
function buildPrimaryReason(factors: RoutingFactor[]): string {
  // Prioritize budget factor as primary reason
  const budgetFactor = factors.find(f => f.category === 'budget');
  const otherSignificantFactors = factors.filter(
    f => f.category !== 'budget' && (f.tierAdjustment !== 0 || f.triggersReview)
  );

  if (otherSignificantFactors.length === 0) {
    return budgetFactor?.reason || 'Standard tier assignment';
  }

  const reasons = [budgetFactor?.reason, ...otherSignificantFactors.map(f => f.reason)]
    .filter(Boolean)
    .slice(0, 3);

  return reasons.join('; ');
}

// ============================================
// ADDITIONAL UTILITY FUNCTIONS
// ============================================

/**
 * Validate intake form data before routing
 */
export function validateIntakeData(data: Partial<IntakeFormData>): {
  valid: boolean;
  missingFields: string[];
} {
  const required: (keyof IntakeFormData)[] = [
    'budgetRange',
    'timeline',
    'projectType',
    'hasSurvey',
    'hasDrawings',
  ];

  const missingFields = required.filter(field => data[field] === undefined);

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get a human-readable summary of the tier recommendation
 */
export function getTierSummary(recommendation: TierRecommendation): string {
  const { tier, tierDefinition, confidence, needsManualReview } = recommendation;

  let summary = `Recommended: **Tier ${tier} - ${tierDefinition.name}**\n`;
  summary += `Confidence: ${confidence}\n`;

  if (needsManualReview) {
    summary += `⚠️ Manual review required\n`;
  }

  summary += `\nReason: ${recommendation.reason}`;

  return summary;
}

/**
 * Check if a tier upgrade is available
 */
export function canUpgradeTier(currentTier: TierNumber): boolean {
  return currentTier < 4;
}

/**
 * Check if a tier downgrade is available
 */
export function canDowngradeTier(currentTier: TierNumber): boolean {
  return currentTier > 1;
}

// ============================================
// EXPORTS
// ============================================

export default {
  recommendTier,
  validateIntakeData,
  getTierSummary,
  canUpgradeTier,
  canDowngradeTier,
};
