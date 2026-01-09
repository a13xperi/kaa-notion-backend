/**
 * Tier Router - Determines service tier recommendations based on intake form data
 *
 * Tier Definitions:
 * - Tier 1: The Concept (No-Touch, Fully Automated) - $299
 * - Tier 2: The Builder (Low-Touch, Systematized) - $1,499
 * - Tier 3: The Concierge (Site Visits, Hybrid) - $4,999+
 * - Tier 4: KAA White Glove (High-Touch, Invitation Only) - Premium/Custom
 */

// Budget range options (aligned with Stripe products)
export type BudgetRange =
  | 'under_500'      // < $500 - Tier 1
  | '500_2000'       // $500 - $2,000 - Tier 1-2
  | '2000_5000'      // $2,000 - $5,000 - Tier 2
  | '5000_15000'     // $5,000 - $15,000 - Tier 2-3
  | '15000_50000'    // $15,000 - $50,000 - Tier 3
  | 'over_50000'     // $50,000+ - Tier 3-4
  | 'percentage'     // % of install - Tier 4
  | 'not_sure';      // Needs review

// Timeline options
export type Timeline =
  | 'asap'           // < 2 weeks - Fast track
  | '2_4_weeks'      // 2-4 weeks - Tier 1
  | '1_2_months'     // 4-8 weeks - Tier 2
  | '2_4_months'     // 8-16 weeks - Tier 3
  | '4_plus_months'  // 4+ months - Tier 3-4
  | 'flexible';      // No rush - Any tier

// Project type options
export type ProjectType =
  | 'simple_consultation'  // Quick advice - Tier 1
  | 'small_renovation'     // Minor changes - Tier 1-2
  | 'standard_renovation'  // Full renovation - Tier 2
  | 'addition'             // Home addition - Tier 2-3
  | 'new_build'            // New construction - Tier 3-4
  | 'commercial'           // Commercial project - Tier 4
  | 'multiple_properties'  // Multiple sites - Tier 4
  | 'complex';             // Complex/custom - Tier 4

/**
 * Input data from the intake form
 */
export interface IntakeFormData {
  budgetRange: BudgetRange | string;
  timeline: Timeline | string;
  projectType: ProjectType | string;
  hasSurvey: boolean;
  hasDrawings: boolean;
  projectAddress: string;
  email?: string;
  name?: string;
}

/**
 * Confidence level for the tier recommendation
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Output from the tier router
 */
export interface TierRecommendation {
  tier: 1 | 2 | 3 | 4;
  reason: string;
  confidence: ConfidenceLevel;
  needsManualReview: boolean;
  factors: TierFactor[];
}

/**
 * Individual factor that influenced the tier recommendation
 */
export interface TierFactor {
  factor: 'budget' | 'timeline' | 'project_type' | 'assets' | 'complexity';
  suggestedTier: 1 | 2 | 3 | 4;
  weight: number;
  description: string;
}

/**
 * Configuration for tier thresholds
 * Can be overridden with environment variables or database config
 */
export interface TierConfig {
  budgetThresholds: {
    tier1Max: number;
    tier2Max: number;
    tier3Max: number;
  };
  timelineWeeks: {
    fastTrack: number;
    standard: number;
    extended: number;
  };
}

const DEFAULT_CONFIG: TierConfig = {
  budgetThresholds: {
    tier1Max: 500,
    tier2Max: 5000,
    tier3Max: 50000,
  },
  timelineWeeks: {
    fastTrack: 2,
    standard: 8,
    extended: 16,
  },
};

/**
 * Analyze budget range and suggest a tier
 */
function analyzeBudget(budgetRange: string): TierFactor {
  let suggestedTier: 1 | 2 | 3 | 4;
  let description: string;
  let weight = 3; // Budget is a high-weight factor

  switch (budgetRange) {
    case 'under_500':
      suggestedTier = 1;
      description = 'Budget range aligns with Tier 1 (The Concept)';
      break;
    case '500_2000':
      suggestedTier = 1;
      description = 'Budget range suitable for Tier 1-2 services';
      break;
    case '2000_5000':
      suggestedTier = 2;
      description = 'Budget range aligns with Tier 2 (The Builder)';
      break;
    case '5000_15000':
      suggestedTier = 2;
      description = 'Mid-range budget suitable for Tier 2-3';
      weight = 2;
      break;
    case '15000_50000':
      suggestedTier = 3;
      description = 'Budget range aligns with Tier 3 (The Concierge)';
      break;
    case 'over_50000':
      suggestedTier = 4;
      description = 'Premium budget may qualify for Tier 4 (KAA White Glove)';
      break;
    case 'percentage':
      suggestedTier = 4;
      description = 'Percentage-based pricing indicates Tier 4 project';
      break;
    case 'not_sure':
      suggestedTier = 2;
      description = 'Budget unclear - defaulting to mid-tier, needs review';
      weight = 1;
      break;
    default:
      suggestedTier = 2;
      description = 'Unknown budget range - defaulting to mid-tier';
      weight = 1;
  }

  return {
    factor: 'budget',
    suggestedTier,
    weight,
    description,
  };
}

/**
 * Analyze timeline and suggest a tier
 */
function analyzeTimeline(timeline: string): TierFactor {
  let suggestedTier: 1 | 2 | 3 | 4;
  let description: string;
  let weight = 2; // Timeline is a medium-weight factor

  switch (timeline) {
    case 'asap':
      suggestedTier = 1;
      description = 'Fast turnaround requires automated Tier 1-2 process';
      weight = 3; // Tight timeline is important
      break;
    case '2_4_weeks':
      suggestedTier = 1;
      description = 'Short timeline aligns with Tier 1 delivery';
      break;
    case '1_2_months':
      suggestedTier = 2;
      description = 'Standard timeline suitable for Tier 2';
      break;
    case '2_4_months':
      suggestedTier = 3;
      description = 'Extended timeline allows for Tier 3 site visits';
      break;
    case '4_plus_months':
      suggestedTier = 3;
      description = 'Long timeline suitable for complex Tier 3-4 projects';
      break;
    case 'flexible':
      suggestedTier = 2;
      description = 'Flexible timeline - tier based on other factors';
      weight = 1;
      break;
    default:
      suggestedTier = 2;
      description = 'Unknown timeline - defaulting to standard';
      weight = 1;
  }

  return {
    factor: 'timeline',
    suggestedTier,
    weight,
    description,
  };
}

/**
 * Analyze project type and suggest a tier
 */
function analyzeProjectType(projectType: string): TierFactor {
  let suggestedTier: 1 | 2 | 3 | 4;
  let description: string;
  let weight = 3; // Project type is a high-weight factor

  switch (projectType) {
    case 'simple_consultation':
      suggestedTier = 1;
      description = 'Simple consultation fits Tier 1 automated guidance';
      break;
    case 'small_renovation':
      suggestedTier = 1;
      description = 'Small renovation suitable for Tier 1-2';
      break;
    case 'standard_renovation':
      suggestedTier = 2;
      description = 'Standard renovation aligns with Tier 2 package';
      break;
    case 'addition':
      suggestedTier = 2;
      description = 'Addition project may need Tier 2-3 depending on scope';
      weight = 2;
      break;
    case 'new_build':
      suggestedTier = 3;
      description = 'New build requires Tier 3+ site visits and planning';
      break;
    case 'commercial':
      suggestedTier = 4;
      description = 'Commercial projects require Tier 4 white-glove service';
      break;
    case 'multiple_properties':
      suggestedTier = 4;
      description = 'Multiple properties require Tier 4 coordination';
      break;
    case 'complex':
      suggestedTier = 4;
      description = 'Complex project requires Tier 4 custom approach';
      break;
    default:
      suggestedTier = 2;
      description = 'Unknown project type - defaulting to mid-tier';
      weight = 1;
  }

  return {
    factor: 'project_type',
    suggestedTier,
    weight,
    description,
  };
}

/**
 * Analyze existing assets and suggest a tier
 */
function analyzeAssets(hasSurvey: boolean, hasDrawings: boolean): TierFactor {
  let suggestedTier: 1 | 2 | 3 | 4;
  let description: string;
  let weight = 2; // Assets are a medium-weight factor

  if (hasSurvey && hasDrawings) {
    suggestedTier = 1;
    description = 'Has survey and drawings - ready for Tier 1-2 fast track';
    weight = 3;
  } else if (hasSurvey || hasDrawings) {
    suggestedTier = 2;
    description = 'Partial assets - some preparation needed (Tier 2)';
  } else {
    suggestedTier = 3;
    description = 'No existing assets - site visit required (Tier 3+)';
    weight = 3;
  }

  return {
    factor: 'assets',
    suggestedTier,
    weight,
    description,
  };
}

/**
 * Calculate weighted average tier from all factors
 */
function calculateWeightedTier(factors: TierFactor[]): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const factor of factors) {
    weightedSum += factor.suggestedTier * factor.weight;
    totalWeight += factor.weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 2;
}

/**
 * Determine confidence level based on factor agreement
 */
function determineConfidence(factors: TierFactor[], finalTier: number): ConfidenceLevel {
  const tierSuggestions = factors.map(f => f.suggestedTier);
  const agreementCount = tierSuggestions.filter(t => t === finalTier).length;
  const totalFactors = factors.length;

  // Check for conflicting high-weight factors
  const highWeightFactors = factors.filter(f => f.weight >= 3);
  const highWeightConflict = highWeightFactors.some(f =>
    Math.abs(f.suggestedTier - finalTier) >= 2
  );

  if (highWeightConflict) {
    return 'low';
  }

  const agreementRatio = agreementCount / totalFactors;

  if (agreementRatio >= 0.75) {
    return 'high';
  } else if (agreementRatio >= 0.5) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Determine if manual review is needed
 */
function needsReview(
  tier: number,
  confidence: ConfidenceLevel,
  factors: TierFactor[],
  data: IntakeFormData
): boolean {
  // Tier 4 always needs manual review (we choose the client)
  if (tier === 4) {
    return true;
  }

  // Low confidence needs review
  if (confidence === 'low') {
    return true;
  }

  // Budget unclear needs review
  if (data.budgetRange === 'not_sure') {
    return true;
  }

  // ASAP timeline with high tier needs review (may not be feasible)
  if (data.timeline === 'asap' && tier >= 3) {
    return true;
  }

  // Complex or commercial projects always need review
  if (data.projectType === 'complex' ||
      data.projectType === 'commercial' ||
      data.projectType === 'multiple_properties') {
    return true;
  }

  // High-weight factor suggests significantly different tier
  const majorMismatch = factors.some(f =>
    f.weight >= 3 && Math.abs(f.suggestedTier - tier) >= 2
  );
  if (majorMismatch) {
    return true;
  }

  return false;
}

/**
 * Generate human-readable reason for tier recommendation
 */
function generateReason(factors: TierFactor[], tier: number): string {
  // Get the most influential factors (highest weight)
  const sortedFactors = [...factors].sort((a, b) => b.weight - a.weight);
  const topFactors = sortedFactors.slice(0, 3);

  const reasons = topFactors
    .filter(f => f.suggestedTier === tier || Math.abs(f.suggestedTier - tier) <= 1)
    .map(f => f.description);

  if (reasons.length === 0) {
    return `Tier ${tier} recommended based on weighted analysis of project factors`;
  }

  return reasons.join('; ');
}

/**
 * Main tier router function
 * Analyzes intake form data and returns a tier recommendation
 */
export function recommendTier(
  data: IntakeFormData,
  config: TierConfig = DEFAULT_CONFIG
): TierRecommendation {
  // Analyze each factor
  const factors: TierFactor[] = [
    analyzeBudget(data.budgetRange),
    analyzeTimeline(data.timeline),
    analyzeProjectType(data.projectType),
    analyzeAssets(data.hasSurvey, data.hasDrawings),
  ];

  // Calculate weighted tier
  const weightedTier = calculateWeightedTier(factors);

  // Round to nearest tier (1-4)
  let tier = Math.round(weightedTier);
  tier = Math.max(1, Math.min(4, tier)) as 1 | 2 | 3 | 4;

  // Determine confidence
  const confidence = determineConfidence(factors, tier);

  // Check if manual review is needed
  const manualReview = needsReview(tier, confidence, factors, data);

  // Generate reason
  const reason = generateReason(factors, tier);

  return {
    tier,
    reason,
    confidence,
    needsManualReview: manualReview,
    factors,
  };
}

/**
 * Get tier display information
 */
export interface TierInfo {
  id: 1 | 2 | 3 | 4;
  name: string;
  tagline: string;
  priceDisplay: string;
  features: string[];
}

export function getTierInfo(tier: 1 | 2 | 3 | 4): TierInfo {
  const tiers: Record<number, TierInfo> = {
    1: {
      id: 1,
      name: 'The Concept',
      tagline: 'DIY Guidance',
      priceDisplay: '$299',
      features: [
        'Professional concept design',
        'Plant and material recommendations',
        'DIY implementation guide',
        'Digital delivery in 2-4 weeks',
      ],
    },
    2: {
      id: 2,
      name: 'The Builder',
      tagline: 'Design Package',
      priceDisplay: '$1,499',
      features: [
        'Complete design package',
        'Detailed planting plans',
        'Material specifications',
        'Designer review sessions',
        'Revision rounds included',
      ],
    },
    3: {
      id: 3,
      name: 'The Concierge',
      tagline: 'Full Service',
      priceDisplay: 'Starting at $4,999',
      features: [
        'On-site consultation',
        'Complete design and planning',
        'Contractor coordination',
        'Project management',
        'Multiple revision rounds',
      ],
    },
    4: {
      id: 4,
      name: 'KAA White Glove',
      tagline: 'Luxury Service',
      priceDisplay: 'By Invitation',
      features: [
        'Exclusive, invitation-only service',
        'Dedicated design team',
        'Full project oversight',
        'Premium materials sourcing',
        'Ongoing maintenance planning',
      ],
    },
  };

  return tiers[tier];
}

/**
 * Get all tiers for comparison display
 */
export function getAllTiers(): TierInfo[] {
  return [1, 2, 3, 4].map(tier => getTierInfo(tier as 1 | 2 | 3 | 4));
}

export default recommendTier;
