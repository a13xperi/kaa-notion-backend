/**
 * Tier Router Utility
 * Determines which service tier (1-4) a lead should be assigned to
 * based on their intake form responses.
 *
 * Tiers:
 * - Tier 1: The Concept (No-Touch, Fully Automated) - $299
 * - Tier 2: The Builder (Low-Touch, Systematized) - $1,499
 * - Tier 3: The Concierge (Site Visits, Hybrid) - $4,999+
 * - Tier 4: KAA White Glove (High-Touch, By Invitation)
 */

/**
 * Budget range options for intake form
 */
export type BudgetRange =
  | 'under_500'
  | '500_1500'
  | '1500_5000'
  | '5000_15000'
  | '15000_plus'
  | 'percentage_of_install';

/**
 * Timeline options for intake form
 */
export type Timeline =
  | 'under_2_weeks'
  | '2_4_weeks'
  | '4_8_weeks'
  | '8_12_weeks'
  | 'over_12_weeks';

/**
 * Project type options
 */
export type ProjectType =
  | 'simple_renovation'
  | 'standard_renovation'
  | 'major_renovation'
  | 'small_addition'
  | 'standard_addition'
  | 'new_build'
  | 'complex'
  | 'multiple_properties';

/**
 * Input from the intake form
 */
export interface IntakeFormData {
  budgetRange: BudgetRange;
  timeline: Timeline;
  projectType: ProjectType;
  hasSurvey: boolean;
  hasDrawings: boolean;
  projectAddress: string;
}

/**
 * Tier levels
 */
export type TierLevel = 1 | 2 | 3 | 4;

/**
 * Confidence level for the recommendation
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Result of tier recommendation
 */
export interface TierRecommendation {
  tier: TierLevel;
  reason: string;
  confidence: ConfidenceLevel;
  needsManualReview: boolean;
}

/**
 * Internal scoring result for a factor
 */
interface FactorScore {
  tierSuggestion: TierLevel;
  reason: string;
  needsReview: boolean;
}

/**
 * Analyze budget range and return tier suggestion
 */
function analyzeBudget(budgetRange: BudgetRange): FactorScore {
  switch (budgetRange) {
    case 'under_500':
      return {
        tierSuggestion: 1,
        reason: 'Budget under $500 - ideal for Tier 1 automated service',
        needsReview: false,
      };
    case '500_1500':
      return {
        tierSuggestion: 1,
        reason: 'Budget $500-$1,500 - suitable for Tier 1 or 2',
        needsReview: false,
      };
    case '1500_5000':
      return {
        tierSuggestion: 2,
        reason: 'Budget $1,500-$5,000 - mid-range, suitable for Tier 2',
        needsReview: false,
      };
    case '5000_15000':
      return {
        tierSuggestion: 3,
        reason: 'Budget $5,000-$15,000 - higher budget, suitable for Tier 3',
        needsReview: false,
      };
    case '15000_plus':
      return {
        tierSuggestion: 4,
        reason: 'Budget over $15,000 - premium budget, suitable for Tier 4',
        needsReview: true,
      };
    case 'percentage_of_install':
      return {
        tierSuggestion: 4,
        reason: 'Percentage-based pricing - requires Tier 4 white-glove service',
        needsReview: true,
      };
    default:
      return {
        tierSuggestion: 2,
        reason: 'Budget range not specified',
        needsReview: true,
      };
  }
}

/**
 * Analyze timeline and return tier suggestion
 */
function analyzeTimeline(timeline: Timeline): FactorScore {
  switch (timeline) {
    case 'under_2_weeks':
      return {
        tierSuggestion: 1,
        reason: 'Fast timeline (under 2 weeks) - requires streamlined process',
        needsReview: true,
      };
    case '2_4_weeks':
      return {
        tierSuggestion: 1,
        reason: 'Standard timeline (2-4 weeks) - ideal for Tier 1',
        needsReview: false,
      };
    case '4_8_weeks':
      return {
        tierSuggestion: 2,
        reason: 'Standard timeline (4-8 weeks) - suitable for Tier 2',
        needsReview: false,
      };
    case '8_12_weeks':
      return {
        tierSuggestion: 3,
        reason: 'Extended timeline (8-12 weeks) - allows for site visits',
        needsReview: false,
      };
    case 'over_12_weeks':
      return {
        tierSuggestion: 3,
        reason: 'Extended timeline (12+ weeks) - complex project timeline',
        needsReview: false,
      };
    default:
      return {
        tierSuggestion: 2,
        reason: 'Timeline not specified',
        needsReview: true,
      };
  }
}

/**
 * Analyze existing assets (survey/drawings) and return tier suggestion
 */
function analyzeAssets(hasSurvey: boolean, hasDrawings: boolean): FactorScore {
  if (hasSurvey && hasDrawings) {
    return {
      tierSuggestion: 1,
      reason: 'Has both survey and drawings - ready for streamlined process',
      needsReview: false,
    };
  }
  if (hasSurvey || hasDrawings) {
    return {
      tierSuggestion: 2,
      reason: 'Has some existing assets - suitable for Tier 2',
      needsReview: false,
    };
  }
  return {
    tierSuggestion: 3,
    reason: 'No existing assets - site visit likely required',
    needsReview: false,
  };
}

/**
 * Analyze project type and return tier suggestion
 */
function analyzeProjectType(projectType: ProjectType): FactorScore {
  switch (projectType) {
    case 'simple_renovation':
      return {
        tierSuggestion: 1,
        reason: 'Simple renovation - ideal for Tier 1',
        needsReview: false,
      };
    case 'standard_renovation':
      return {
        tierSuggestion: 2,
        reason: 'Standard renovation - suitable for Tier 2',
        needsReview: false,
      };
    case 'major_renovation':
      return {
        tierSuggestion: 3,
        reason: 'Major renovation - requires Tier 3 services',
        needsReview: false,
      };
    case 'small_addition':
      return {
        tierSuggestion: 2,
        reason: 'Small addition - suitable for Tier 2',
        needsReview: false,
      };
    case 'standard_addition':
      return {
        tierSuggestion: 3,
        reason: 'Standard addition - requires Tier 3 services',
        needsReview: false,
      };
    case 'new_build':
      return {
        tierSuggestion: 3,
        reason: 'New build - requires site visits and full service',
        needsReview: false,
      };
    case 'complex':
      return {
        tierSuggestion: 4,
        reason: 'Complex project - requires white-glove service',
        needsReview: true,
      };
    case 'multiple_properties':
      return {
        tierSuggestion: 4,
        reason: 'Multiple properties - requires dedicated project management',
        needsReview: true,
      };
    default:
      return {
        tierSuggestion: 2,
        reason: 'Project type not specified',
        needsReview: true,
      };
  }
}

/**
 * Determine confidence level based on factors
 */
function determineConfidence(
  scores: FactorScore[],
  finalTier: TierLevel,
  needsReview: boolean
): ConfidenceLevel {
  if (needsReview) {
    return 'low';
  }

  // Count how many factors agree with the final tier
  const agreementCount = scores.filter(
    (s) => s.tierSuggestion === finalTier
  ).length;

  // Check for conflicting signals (high variance in suggestions)
  const tierSuggestions = scores.map((s) => s.tierSuggestion);
  const maxTier = Math.max(...tierSuggestions);
  const minTier = Math.min(...tierSuggestions);
  const tierSpread = maxTier - minTier;

  if (agreementCount >= 3 && tierSpread <= 1) {
    return 'high';
  }
  if (agreementCount >= 2 || tierSpread <= 2) {
    return 'medium';
  }
  return 'low';
}

/**
 * Main tier recommendation function
 *
 * Analyzes intake form data and recommends a service tier (1-4)
 * based on budget, timeline, existing assets, and project type.
 *
 * @param data - Intake form data from the lead
 * @returns TierRecommendation with tier, reason, confidence, and review flag
 */
export function recommendTier(data: IntakeFormData): TierRecommendation {
  const reasons: string[] = [];
  let needsManualReview = false;

  // Analyze each factor
  const budgetScore = analyzeBudget(data.budgetRange);
  const timelineScore = analyzeTimeline(data.timeline);
  const assetScore = analyzeAssets(data.hasSurvey, data.hasDrawings);
  const projectTypeScore = analyzeProjectType(data.projectType);

  const allScores = [budgetScore, timelineScore, assetScore, projectTypeScore];

  // Collect all reasons
  reasons.push(budgetScore.reason);
  reasons.push(timelineScore.reason);
  reasons.push(assetScore.reason);
  reasons.push(projectTypeScore.reason);

  // Check if any factor requires manual review
  if (allScores.some((s) => s.needsReview)) {
    needsManualReview = true;
  }

  // Calculate weighted tier suggestion
  // Budget and project type have higher weight
  const weightedSum =
    budgetScore.tierSuggestion * 2 +
    projectTypeScore.tierSuggestion * 2 +
    timelineScore.tierSuggestion * 1 +
    assetScore.tierSuggestion * 1;

  const totalWeight = 6;
  const weightedAverage = weightedSum / totalWeight;

  // Round to nearest tier (1-4)
  let suggestedTier = Math.round(weightedAverage) as TierLevel;

  // Apply floor and ceiling rules
  // If no assets and new build, minimum Tier 3
  if (!data.hasSurvey && !data.hasDrawings && data.projectType === 'new_build') {
    suggestedTier = Math.max(suggestedTier, 3) as TierLevel;
    reasons.push('New build without assets requires site visit (Tier 3+)');
  }

  // Complex projects or multiple properties always Tier 4
  if (
    data.projectType === 'complex' ||
    data.projectType === 'multiple_properties'
  ) {
    suggestedTier = 4;
    needsManualReview = true;
  }

  // Percentage-based pricing always Tier 4
  if (data.budgetRange === 'percentage_of_install') {
    suggestedTier = 4;
    needsManualReview = true;
  }

  // Fast timeline with high-tier project needs review
  if (
    data.timeline === 'under_2_weeks' &&
    suggestedTier >= 3
  ) {
    needsManualReview = true;
    reasons.push('Tight timeline may not be feasible for this project scope');
  }

  // Tier 4 always requires manual review
  if (suggestedTier === 4) {
    needsManualReview = true;
  }

  // Ensure tier is within bounds
  suggestedTier = Math.max(1, Math.min(4, suggestedTier)) as TierLevel;

  // Determine confidence
  const confidence = determineConfidence(allScores, suggestedTier, needsManualReview);

  // Build final reason string (deduplicate and combine)
  const uniqueReasons = [...new Set(reasons)];
  const primaryReasons = uniqueReasons.slice(0, 3); // Keep top 3 reasons

  return {
    tier: suggestedTier,
    reason: primaryReasons.join('; '),
    confidence,
    needsManualReview,
  };
}

/**
 * Get tier name by number
 */
export function getTierName(tier: TierLevel): string {
  const tierNames: Record<TierLevel, string> = {
    1: 'The Concept',
    2: 'The Builder',
    3: 'The Concierge',
    4: 'KAA White Glove',
  };
  return tierNames[tier];
}

/**
 * Get tier description by number
 */
export function getTierDescription(tier: TierLevel): string {
  const descriptions: Record<TierLevel, string> = {
    1: 'No-Touch, Fully Automated - Perfect for simple projects with existing assets',
    2: 'Low-Touch, Systematized with Checkpoints - Ideal for standard renovations',
    3: 'Site Visits, Hybrid Tech + Boots on Ground - For complex projects requiring hands-on attention',
    4: 'High-Touch, White Glove Service - Premium service by invitation only',
  };
  return descriptions[tier];
}

/**
 * Validate intake form data has required fields
 */
export function validateIntakeFormData(
  data: Partial<IntakeFormData>
): data is IntakeFormData {
  return (
    typeof data.budgetRange === 'string' &&
    typeof data.timeline === 'string' &&
    typeof data.projectType === 'string' &&
    typeof data.hasSurvey === 'boolean' &&
    typeof data.hasDrawings === 'boolean' &&
    typeof data.projectAddress === 'string' &&
    data.projectAddress.length > 0
  );
}

export default recommendTier;
