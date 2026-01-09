/**
 * Tier Router
 * Deterministic tier recommendation based on intake form data.
 * Uses configuration from sageTiers.ts as the single source of truth.
 */

import {
  TierId,
  ProjectType,
  TimelineCategory,
  BUDGET_THRESHOLDS,
  TIMELINE_WEEKS,
  TIER_DEFINITIONS,
  PROJECT_TYPE_ROUTING,
  ASSET_ROUTING,
  RED_FLAGS,
  getTierForBudget,
  getTimelineCategory,
  getProjectTypeInfo,
  formatBudget,
} from '../config/sageTiers';

// ============================================================================
// TYPES
// ============================================================================

export interface IntakeFormData {
  /** Budget amount in dollars */
  budget: number;
  /** Timeline in weeks */
  timelineWeeks: number;
  /** Type of project */
  projectType: ProjectType;
  /** Whether client has an existing survey */
  hasSurvey: boolean;
  /** Whether client has existing drawings */
  hasDrawings: boolean;
  /** Project address (optional, for location-based adjustments) */
  projectAddress?: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface RoutingReason {
  factor: 'budget' | 'timeline' | 'assets' | 'project_type' | 'red_flag';
  description: string;
  suggestedTier: TierId;
  weight: number;
}

export interface TierRecommendation {
  /** Recommended tier (1-4) */
  tier: TierId;
  /** Human-readable reason for the recommendation */
  reason: string;
  /** Confidence level in the recommendation */
  confidence: ConfidenceLevel;
  /** Whether manual review is required */
  needsManualReview: boolean;
  /** Detailed breakdown of routing factors */
  factors: RoutingReason[];
  /** Any red flags detected */
  redFlags: string[];
  /** Alternative tiers that could apply */
  alternativeTiers: TierId[];
}

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

const FACTOR_WEIGHTS = {
  budget: 40,
  timeline: 20,
  assets: 25,
  project_type: 15,
} as const;

// ============================================================================
// TIER ROUTER IMPLEMENTATION
// ============================================================================

/**
 * Analyzes budget and returns routing reason
 */
function analyzeBudget(budget: number): RoutingReason {
  const tier = getTierForBudget(budget);
  const thresholds = BUDGET_THRESHOLDS;

  let description: string;
  if (budget < thresholds.TIER_1_MIN) {
    description = `Budget (${formatBudget(budget)}) is below minimum threshold`;
  } else if (budget < thresholds.TIER_2_MIN) {
    description = `Budget (${formatBudget(budget)}) fits Tier 1 range (${formatBudget(thresholds.TIER_1_MIN)} - ${formatBudget(thresholds.TIER_1_MAX)})`;
  } else if (budget < thresholds.TIER_3_MIN) {
    description = `Budget (${formatBudget(budget)}) fits Tier 2 range (${formatBudget(thresholds.TIER_2_MIN)} - ${formatBudget(thresholds.TIER_2_MAX)})`;
  } else if (budget < thresholds.TIER_4_MIN) {
    description = `Budget (${formatBudget(budget)}) fits Tier 3 range (${formatBudget(thresholds.TIER_3_MIN)} - ${formatBudget(thresholds.TIER_3_MAX)})`;
  } else {
    description = `Budget (${formatBudget(budget)}) qualifies for Tier 4 (${formatBudget(thresholds.TIER_4_MIN)}+)`;
  }

  return {
    factor: 'budget',
    description,
    suggestedTier: tier,
    weight: FACTOR_WEIGHTS.budget,
  };
}

/**
 * Analyzes timeline and returns routing reason
 */
function analyzeTimeline(weeks: number): RoutingReason {
  const category = getTimelineCategory(weeks);
  let suggestedTier: TierId;
  let description: string;

  switch (category) {
    case 'fast':
      suggestedTier = 1;
      description = `Fast timeline (${weeks} weeks) suits automated Tier 1/2 delivery`;
      break;
    case 'standard':
      suggestedTier = 2;
      description = `Standard timeline (${weeks} weeks) allows for Tier 1-3 options`;
      break;
    case 'extended':
      suggestedTier = 3;
      description = `Extended timeline (${weeks} weeks) indicates complex project requiring Tier 3/4`;
      break;
  }

  return {
    factor: 'timeline',
    description,
    suggestedTier,
    weight: FACTOR_WEIGHTS.timeline,
  };
}

/**
 * Analyzes existing assets and returns routing reason
 */
function analyzeAssets(hasSurvey: boolean, hasDrawings: boolean): RoutingReason {
  const assetMatch = ASSET_ROUTING.find(
    (a) => a.hasSurvey === hasSurvey && a.hasDrawings === hasDrawings
  );

  if (!assetMatch) {
    return {
      factor: 'assets',
      description: 'Unable to determine asset status',
      suggestedTier: 3,
      weight: FACTOR_WEIGHTS.assets,
    };
  }

  const suggestedTier = assetMatch.eligibleTiers[0];
  let description: string;

  if (hasSurvey && hasDrawings) {
    description = 'Has both survey and drawings - ready for streamlined delivery (Tier 1/2)';
  } else if (hasSurvey || hasDrawings) {
    description = `Has ${hasSurvey ? 'survey' : 'drawings'} only - some additional work needed (Tier 2/3)`;
  } else {
    description = 'No existing assets - site visit required (Tier 3/4)';
  }

  return {
    factor: 'assets',
    description,
    suggestedTier,
    weight: FACTOR_WEIGHTS.assets,
  };
}

/**
 * Analyzes project type and returns routing reason
 */
function analyzeProjectType(projectType: ProjectType): RoutingReason {
  const typeInfo = getProjectTypeInfo(projectType);

  if (!typeInfo) {
    return {
      factor: 'project_type',
      description: `Unknown project type: ${projectType}`,
      suggestedTier: 3,
      weight: FACTOR_WEIGHTS.project_type,
    };
  }

  const suggestedTier = typeInfo.eligibleTiers[0];
  const siteVisitNote = typeInfo.requiresSiteVisit ? ' (site visit required)' : '';

  return {
    factor: 'project_type',
    description: `${typeInfo.label} project eligible for Tier ${typeInfo.eligibleTiers.join('/')}${siteVisitNote}`,
    suggestedTier,
    weight: FACTOR_WEIGHTS.project_type,
  };
}

/**
 * Detects red flags that require manual review
 */
function detectRedFlags(data: IntakeFormData, factors: RoutingReason[]): string[] {
  const redFlags: string[] = [];
  const budgetTier = getTierForBudget(data.budget);
  const timelineCategory = getTimelineCategory(data.timelineWeeks);
  const projectInfo = getProjectTypeInfo(data.projectType);

  // Budget below minimum
  if (data.budget < BUDGET_THRESHOLDS.TIER_1_MIN) {
    redFlags.push('Budget below minimum threshold');
  }

  // Unrealistic timeline for complex projects
  if (
    timelineCategory === 'fast' &&
    (data.projectType === 'new_build' ||
      data.projectType === 'complex' ||
      data.projectType === 'major_renovation')
  ) {
    redFlags.push('Timeline unrealistic for project complexity');
  }

  // No assets but expecting fast delivery
  if (!data.hasSurvey && !data.hasDrawings && data.timelineWeeks < TIMELINE_WEEKS.FAST_MAX) {
    redFlags.push('No existing assets but expecting fast delivery');
  }

  // Complex project with low budget
  if (
    (data.projectType === 'complex' || data.projectType === 'multiple_properties') &&
    budgetTier < 3
  ) {
    redFlags.push('Complex project type with insufficient budget');
  }

  // Budget-timeline mismatch (high budget but fast timeline)
  if (budgetTier >= 3 && timelineCategory === 'fast') {
    redFlags.push('High budget project with unrealistic timeline');
  }

  // Multiple properties always needs review
  if (data.projectType === 'multiple_properties') {
    redFlags.push('Multiple properties require white-glove service evaluation');
  }

  return redFlags;
}

/**
 * Calculates weighted tier score from all factors
 */
function calculateWeightedTier(factors: RoutingReason[]): TierId {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const factor of factors) {
    weightedSum += factor.suggestedTier * factor.weight;
    totalWeight += factor.weight;
  }

  const weightedAverage = weightedSum / totalWeight;
  // Round to nearest tier (1-4)
  return Math.max(1, Math.min(4, Math.round(weightedAverage))) as TierId;
}

/**
 * Determines confidence level based on factor agreement
 */
function calculateConfidence(factors: RoutingReason[], finalTier: TierId): ConfidenceLevel {
  // Count how many factors agree with the final tier (within 1 tier)
  const agreementCount = factors.filter(
    (f) => Math.abs(f.suggestedTier - finalTier) <= 1
  ).length;

  const agreementRatio = agreementCount / factors.length;

  if (agreementRatio >= 0.75) return 'high';
  if (agreementRatio >= 0.5) return 'medium';
  return 'low';
}

/**
 * Gets alternative tiers that could also apply
 */
function getAlternativeTiers(factors: RoutingReason[], finalTier: TierId): TierId[] {
  const uniqueTiers = new Set(factors.map((f) => f.suggestedTier));
  uniqueTiers.delete(finalTier);

  return Array.from(uniqueTiers)
    .filter((t) => Math.abs(t - finalTier) === 1) // Only adjacent tiers
    .sort((a, b) => a - b);
}

/**
 * Main tier recommendation function
 * Returns a deterministic tier recommendation based on intake form data
 */
export function recommendTier(data: IntakeFormData): TierRecommendation {
  // Analyze each factor
  const factors: RoutingReason[] = [
    analyzeBudget(data.budget),
    analyzeTimeline(data.timelineWeeks),
    analyzeAssets(data.hasSurvey, data.hasDrawings),
    analyzeProjectType(data.projectType),
  ];

  // Detect red flags
  const redFlags = detectRedFlags(data, factors);

  // Calculate weighted tier
  let tier = calculateWeightedTier(factors);

  // Apply hard rules that override weighted calculation
  // Rule: No assets always means at least Tier 3
  if (!data.hasSurvey && !data.hasDrawings && tier < 3) {
    tier = 3;
  }

  // Rule: New build or complex projects always Tier 3+
  if (
    (data.projectType === 'new_build' ||
      data.projectType === 'complex' ||
      data.projectType === 'multiple_properties') &&
    tier < 3
  ) {
    tier = data.projectType === 'multiple_properties' ? 4 : 3;
  }

  // Rule: Very high budget goes to Tier 4
  if (data.budget >= BUDGET_THRESHOLDS.TIER_4_MIN) {
    tier = Math.max(tier, 4) as TierId;
  }

  // Calculate confidence
  const confidence = calculateConfidence(factors, tier);

  // Determine if manual review is needed
  const needsManualReview =
    tier === 4 || // Tier 4 always needs review
    confidence === 'low' ||
    redFlags.length > 0 ||
    TIER_DEFINITIONS[tier].requiresManualReview;

  // Get alternative tiers
  const alternativeTiers = getAlternativeTiers(factors, tier);

  // Build human-readable reason
  const primaryFactors = factors
    .filter((f) => f.suggestedTier === tier || Math.abs(f.suggestedTier - tier) <= 1)
    .map((f) => f.description);

  const reason = primaryFactors.slice(0, 2).join('. ') + '.';

  return {
    tier,
    reason,
    confidence,
    needsManualReview,
    factors,
    redFlags,
    alternativeTiers,
  };
}

/**
 * Validates intake form data before routing
 */
export function validateIntakeData(data: Partial<IntakeFormData>): string[] {
  const errors: string[] = [];

  if (data.budget === undefined || data.budget < 0) {
    errors.push('Budget is required and must be a positive number');
  }

  if (data.timelineWeeks === undefined || data.timelineWeeks < 1) {
    errors.push('Timeline is required and must be at least 1 week');
  }

  if (!data.projectType) {
    errors.push('Project type is required');
  }

  if (data.hasSurvey === undefined) {
    errors.push('Survey status is required');
  }

  if (data.hasDrawings === undefined) {
    errors.push('Drawings status is required');
  }

  return errors;
}

/**
 * Gets a summary of the tier recommendation for display
 */
export function getTierSummary(recommendation: TierRecommendation): string {
  const tierDef = TIER_DEFINITIONS[recommendation.tier];
  const reviewStatus = recommendation.needsManualReview
    ? ' (pending review)'
    : ' (auto-approved)';

  return `${tierDef.name}${reviewStatus}: ${recommendation.reason}`;
}

/**
 * Checks if a tier is eligible for auto-routing (no manual review)
 */
export function isAutoRoutable(tier: TierId): boolean {
  return TIER_DEFINITIONS[tier].autoRoute && !TIER_DEFINITIONS[tier].requiresManualReview;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export types from sageTiers for convenience
export type { TierId, ProjectType, TimelineCategory } from '../config/sageTiers';
