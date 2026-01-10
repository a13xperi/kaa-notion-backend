/**
 * Tier Router - Server-side tier recommendation algorithm
 * Mirrors the frontend implementation for consistency
 */

export interface IntakeFormData {
  budgetRange: string;
  timeline: string;
  projectType: string;
  hasSurvey: boolean;
  hasDrawings: boolean;
  projectAddress: string;
  email?: string;
  name?: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface TierFactor {
  factor: 'budget' | 'timeline' | 'project_type' | 'assets' | 'complexity';
  suggestedTier: 1 | 2 | 3 | 4;
  weight: number;
  description: string;
}

export interface TierRecommendation {
  tier: 1 | 2 | 3 | 4;
  reason: string;
  confidence: ConfidenceLevel;
  needsManualReview: boolean;
  factors: TierFactor[];
}

function analyzeBudget(budgetRange: string): TierFactor {
  let suggestedTier: 1 | 2 | 3 | 4;
  let description: string;
  let weight = 3;

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

  return { factor: 'budget', suggestedTier, weight, description };
}

function analyzeTimeline(timeline: string): TierFactor {
  let suggestedTier: 1 | 2 | 3 | 4;
  let description: string;
  let weight = 2;

  switch (timeline) {
    case 'asap':
      suggestedTier = 1;
      description = 'Fast turnaround requires automated Tier 1-2 process';
      weight = 3;
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

  return { factor: 'timeline', suggestedTier, weight, description };
}

function analyzeProjectType(projectType: string): TierFactor {
  let suggestedTier: 1 | 2 | 3 | 4;
  let description: string;
  let weight = 3;

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

  return { factor: 'project_type', suggestedTier, weight, description };
}

function analyzeAssets(hasSurvey: boolean, hasDrawings: boolean): TierFactor {
  let suggestedTier: 1 | 2 | 3 | 4;
  let description: string;
  let weight = 2;

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

  return { factor: 'assets', suggestedTier, weight, description };
}

function calculateWeightedTier(factors: TierFactor[]): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const factor of factors) {
    weightedSum += factor.suggestedTier * factor.weight;
    totalWeight += factor.weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 2;
}

function determineConfidence(factors: TierFactor[], finalTier: number): ConfidenceLevel {
  const tierSuggestions = factors.map(f => f.suggestedTier);
  const agreementCount = tierSuggestions.filter(t => t === finalTier).length;
  const totalFactors = factors.length;

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

function needsReview(
  tier: number,
  confidence: ConfidenceLevel,
  factors: TierFactor[],
  data: IntakeFormData
): boolean {
  if (tier === 4) return true;
  if (confidence === 'low') return true;
  if (data.budgetRange === 'not_sure') return true;
  if (data.timeline === 'asap' && tier >= 3) return true;
  if (
    data.projectType === 'complex' ||
    data.projectType === 'commercial' ||
    data.projectType === 'multiple_properties'
  ) {
    return true;
  }

  const majorMismatch = factors.some(f =>
    f.weight >= 3 && Math.abs(f.suggestedTier - tier) >= 2
  );
  if (majorMismatch) return true;

  return false;
}

function generateReason(factors: TierFactor[], tier: number): string {
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

export function recommendTier(data: IntakeFormData): TierRecommendation {
  const factors: TierFactor[] = [
    analyzeBudget(data.budgetRange),
    analyzeTimeline(data.timeline),
    analyzeProjectType(data.projectType),
    analyzeAssets(data.hasSurvey, data.hasDrawings),
  ];

  const weightedTier = calculateWeightedTier(factors);
  const roundedTier = Math.round(weightedTier);
  const tier = Math.max(1, Math.min(4, roundedTier)) as 1 | 2 | 3 | 4;

  const confidence = determineConfidence(factors, tier);
  const manualReview = needsReview(tier, confidence, factors, data);
  const reason = generateReason(factors, tier);

  return {
    tier,
    reason,
    confidence,
    needsManualReview: manualReview,
    factors,
  };
}

export default recommendTier;
