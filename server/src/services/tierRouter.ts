/**
 * Tier Router Service
 * Determines tier recommendation based on intake form data.
 */

import {
  TierId,
  ProjectType,
  BUDGET_THRESHOLDS,
  TIMELINE_WEEKS,
  TIER_DEFINITIONS,
  ASSET_ROUTING,
  getTierForBudget,
  getTimelineCategory,
  getProjectTypeInfo,
  formatBudget,
} from '../config/sageTiers';

export interface IntakeFormData {
  budget: number;
  timelineWeeks: number;
  projectType: ProjectType;
  hasSurvey: boolean;
  hasDrawings: boolean;
  projectAddress?: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface RoutingFactor {
  factor: 'budget' | 'timeline' | 'assets' | 'project_type';
  description: string;
  suggestedTier: TierId;
  weight: number;
}

export interface TierRecommendation {
  tier: TierId;
  tierName: string;
  reason: string;
  confidence: ConfidenceLevel;
  needsManualReview: boolean;
  factors: RoutingFactor[];
  redFlags: string[];
}

const FACTOR_WEIGHTS = {
  budget: 40,
  timeline: 20,
  assets: 25,
  project_type: 15,
} as const;

function analyzeBudget(budget: number): RoutingFactor {
  const tier = getTierForBudget(budget);
  let description: string;

  if (budget < BUDGET_THRESHOLDS.TIER_1_MIN) {
    description = `Budget (${formatBudget(budget)}) is below minimum threshold`;
  } else if (budget < BUDGET_THRESHOLDS.TIER_2_MIN) {
    description = `Budget (${formatBudget(budget)}) fits Tier 1 range`;
  } else if (budget < BUDGET_THRESHOLDS.TIER_3_MIN) {
    description = `Budget (${formatBudget(budget)}) fits Tier 2 range`;
  } else if (budget < BUDGET_THRESHOLDS.TIER_4_MIN) {
    description = `Budget (${formatBudget(budget)}) fits Tier 3 range`;
  } else {
    description = `Budget (${formatBudget(budget)}) qualifies for Tier 4`;
  }

  return {
    factor: 'budget',
    description,
    suggestedTier: tier,
    weight: FACTOR_WEIGHTS.budget,
  };
}

function analyzeTimeline(weeks: number): RoutingFactor {
  const category = getTimelineCategory(weeks);
  let suggestedTier: TierId;
  let description: string;

  switch (category) {
    case 'fast':
      suggestedTier = 1;
      description = `Fast timeline (${weeks} weeks) suits automated delivery`;
      break;
    case 'standard':
      suggestedTier = 2;
      description = `Standard timeline (${weeks} weeks) allows for guided process`;
      break;
    case 'extended':
      suggestedTier = 3;
      description = `Extended timeline (${weeks} weeks) indicates complex project`;
      break;
  }

  return {
    factor: 'timeline',
    description,
    suggestedTier,
    weight: FACTOR_WEIGHTS.timeline,
  };
}

function analyzeAssets(hasSurvey: boolean, hasDrawings: boolean): RoutingFactor {
  const assetMatch = ASSET_ROUTING.find(
    (a) => a.hasSurvey === hasSurvey && a.hasDrawings === hasDrawings
  );

  const suggestedTier = assetMatch?.eligibleTiers[0] || 3;
  let description: string;

  if (hasSurvey && hasDrawings) {
    description = 'Has both survey and drawings - ready for streamlined delivery';
  } else if (hasSurvey || hasDrawings) {
    description = `Has ${hasSurvey ? 'survey' : 'drawings'} only - some additional work needed`;
  } else {
    description = 'No existing assets - site visit required';
  }

  return {
    factor: 'assets',
    description,
    suggestedTier,
    weight: FACTOR_WEIGHTS.assets,
  };
}

function analyzeProjectType(projectType: ProjectType): RoutingFactor {
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
    description: `${typeInfo.label} project${siteVisitNote}`,
    suggestedTier,
    weight: FACTOR_WEIGHTS.project_type,
  };
}

function detectRedFlags(data: IntakeFormData): string[] {
  const redFlags: string[] = [];
  const budgetTier = getTierForBudget(data.budget);
  const timelineCategory = getTimelineCategory(data.timelineWeeks);

  if (data.budget < BUDGET_THRESHOLDS.TIER_1_MIN) {
    redFlags.push('Budget below minimum threshold');
  }

  if (
    timelineCategory === 'fast' &&
    (data.projectType === 'new_build' ||
      data.projectType === 'complex' ||
      data.projectType === 'major_renovation')
  ) {
    redFlags.push('Timeline unrealistic for project complexity');
  }

  if (!data.hasSurvey && !data.hasDrawings && data.timelineWeeks < TIMELINE_WEEKS.FAST_MAX) {
    redFlags.push('No existing assets but expecting fast delivery');
  }

  if (
    (data.projectType === 'complex' || data.projectType === 'multiple_properties') &&
    budgetTier < 3
  ) {
    redFlags.push('Complex project type with insufficient budget');
  }

  if (budgetTier >= 3 && timelineCategory === 'fast') {
    redFlags.push('High budget project with unrealistic timeline');
  }

  if (data.projectType === 'multiple_properties') {
    redFlags.push('Multiple properties require white-glove service evaluation');
  }

  return redFlags;
}

function calculateWeightedTier(factors: RoutingFactor[]): TierId {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const factor of factors) {
    weightedSum += factor.suggestedTier * factor.weight;
    totalWeight += factor.weight;
  }

  const weightedAverage = weightedSum / totalWeight;
  return Math.max(1, Math.min(4, Math.round(weightedAverage))) as TierId;
}

function calculateConfidence(factors: RoutingFactor[], finalTier: TierId): ConfidenceLevel {
  const agreementCount = factors.filter(
    (f) => Math.abs(f.suggestedTier - finalTier) <= 1
  ).length;

  const agreementRatio = agreementCount / factors.length;

  if (agreementRatio >= 0.75) return 'high';
  if (agreementRatio >= 0.5) return 'medium';
  return 'low';
}

export function recommendTier(data: IntakeFormData): TierRecommendation {
  const factors: RoutingFactor[] = [
    analyzeBudget(data.budget),
    analyzeTimeline(data.timelineWeeks),
    analyzeAssets(data.hasSurvey, data.hasDrawings),
    analyzeProjectType(data.projectType),
  ];

  const redFlags = detectRedFlags(data);
  let tier = calculateWeightedTier(factors);

  // Apply hard rules
  if (!data.hasSurvey && !data.hasDrawings && tier < 3) {
    tier = 3;
  }

  if (
    (data.projectType === 'new_build' ||
      data.projectType === 'complex' ||
      data.projectType === 'multiple_properties') &&
    tier < 3
  ) {
    tier = data.projectType === 'multiple_properties' ? 4 : 3;
  }

  if (data.budget >= BUDGET_THRESHOLDS.TIER_4_MIN) {
    tier = Math.max(tier, 4) as TierId;
  }

  const confidence = calculateConfidence(factors, tier);

  const needsManualReview =
    tier === 4 ||
    confidence === 'low' ||
    redFlags.length > 0 ||
    TIER_DEFINITIONS[tier].requiresManualReview;

  const primaryFactors = factors
    .filter((f) => Math.abs(f.suggestedTier - tier) <= 1)
    .map((f) => f.description);

  const reason = primaryFactors.slice(0, 2).join('. ') + '.';

  return {
    tier,
    tierName: TIER_DEFINITIONS[tier].name,
    reason,
    confidence,
    needsManualReview,
    factors,
    redFlags,
  };
}

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
