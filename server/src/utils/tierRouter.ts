/**
 * Tier Router Logic
 * Based on docs/tier-router-rules.md
 *
 * Tiers:
 * - Tier 1: The Concept (No-Touch, Fully Automated)
 * - Tier 2: The Builder (Low-Touch, Systematized with Checkpoints)
 * - Tier 3: The Concierge (Site Visits, Hybrid Tech + Boots on Ground)
 * - Tier 4: KAA White Glove (High-Touch, We Choose the Client)
 */

export interface IntakeFormData {
  budgetRange: string;
  timeline: string;
  projectType: string;
  hasSurvey: boolean;
  hasDrawings: boolean;
  projectAddress?: string;
}

export interface TierRecommendation {
  tier: 1 | 2 | 3 | 4;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  needsManualReview: boolean;
}

// Budget thresholds (in thousands)
const BUDGET_THRESHOLDS = {
  TIER_1_MAX: 25,    // $0-$25k
  TIER_2_MAX: 75,    // $25k-$75k
  TIER_3_MAX: 200,   // $75k-$200k
  // Tier 4: > $200k or percentage-based
};

// Parse budget range string to get the midpoint value
function parseBudgetRange(budgetRange: string): number {
  const normalized = budgetRange.toLowerCase().replace(/\s/g, '');

  // Handle percentage-based pricing
  if (normalized.includes('percentage') || normalized.includes('%')) {
    return 999; // High value triggers Tier 4
  }

  // Handle specific ranges
  if (normalized.includes('0-25') || normalized.includes('under25') || normalized.includes('<25')) {
    return 15;
  }
  if (normalized.includes('25-50') || normalized.includes('25k-50k')) {
    return 37;
  }
  if (normalized.includes('50-75') || normalized.includes('50k-75k')) {
    return 62;
  }
  if (normalized.includes('75-100') || normalized.includes('75k-100k')) {
    return 87;
  }
  if (normalized.includes('100-150') || normalized.includes('100k-150k')) {
    return 125;
  }
  if (normalized.includes('150-200') || normalized.includes('150k-200k')) {
    return 175;
  }
  if (normalized.includes('200+') || normalized.includes('200k+') || normalized.includes('>200')) {
    return 250;
  }

  // Try to extract numbers
  const numbers = budgetRange.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    const values = numbers.map(n => parseInt(n, 10));
    const max = Math.max(...values);
    // If single digit, assume it's in thousands
    return max < 1000 ? max : max / 1000;
  }

  // Default to mid-range
  return 50;
}

// Parse timeline string to get weeks
function parseTimeline(timeline: string): number {
  const normalized = timeline.toLowerCase().replace(/\s/g, '');

  if (normalized.includes('asap') || normalized.includes('<2') || normalized.includes('1-2')) {
    return 1;
  }
  if (normalized.includes('2-4') || normalized.includes('2weeks') || normalized.includes('month')) {
    return 3;
  }
  if (normalized.includes('4-8') || normalized.includes('1-2month')) {
    return 6;
  }
  if (normalized.includes('8-12') || normalized.includes('2-3month') || normalized.includes('3month')) {
    return 10;
  }
  if (normalized.includes('6+month') || normalized.includes('6month') || normalized.includes('flexible')) {
    return 26;
  }

  // Try to extract numbers
  const numbers = timeline.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    return parseInt(numbers[0], 10);
  }

  // Default to standard timeline
  return 4;
}

// Normalize project type
function normalizeProjectType(projectType: string): string {
  const normalized = projectType.toLowerCase().replace(/\s/g, '_');

  if (normalized.includes('simple') || normalized.includes('minor')) {
    return 'simple_renovation';
  }
  if (normalized.includes('renovation') && !normalized.includes('major')) {
    return 'standard_renovation';
  }
  if (normalized.includes('major') || normalized.includes('full')) {
    return 'major_renovation';
  }
  if (normalized.includes('addition')) {
    return 'addition';
  }
  if (normalized.includes('new') || normalized.includes('build')) {
    return 'new_build';
  }
  if (normalized.includes('multiple') || normalized.includes('complex')) {
    return 'complex';
  }

  return normalized;
}

/**
 * Recommend a tier based on intake form data
 * Implements the decision tree from tier-router-rules.md
 */
export function recommendTier(data: IntakeFormData): TierRecommendation {
  let tier: 1 | 2 | 3 | 4 = 1;
  const reasons: string[] = [];
  let needsReview = false;

  const budget = parseBudgetRange(data.budgetRange);
  const timelineWeeks = parseTimeline(data.timeline);
  const projectType = normalizeProjectType(data.projectType);

  // === Budget Analysis (Primary Factor) ===
  if (budget > BUDGET_THRESHOLDS.TIER_3_MAX) {
    tier = 4;
    reasons.push('High budget range (>$200k)');
    needsReview = true; // Always review Tier 4
  } else if (budget > BUDGET_THRESHOLDS.TIER_2_MAX) {
    tier = 3;
    reasons.push('Mid-high budget range ($75k-$200k)');
  } else if (budget > BUDGET_THRESHOLDS.TIER_1_MAX) {
    tier = 2;
    reasons.push('Mid-range budget ($25k-$75k)');
  } else {
    tier = 1;
    reasons.push('Standard budget range (<$25k)');
  }

  // === Timeline Analysis ===
  if (timelineWeeks > 8) {
    // Extended timeline suggests complex project
    if (tier < 3) {
      tier = 3;
      reasons.push('Extended timeline (8+ weeks) suggests site visits needed');
    }
  } else if (timelineWeeks < 2) {
    // Very tight timeline
    if (tier > 2) {
      needsReview = true;
      reasons.push('Tight timeline may not be feasible for this tier');
    }
  }

  // === Asset Analysis ===
  if (!data.hasSurvey && !data.hasDrawings) {
    // No existing assets - site visit likely required
    if (tier < 3) {
      tier = 3;
      reasons.push('Site visit required (no existing survey or drawings)');
    }
  } else if (data.hasSurvey && data.hasDrawings) {
    // Has both assets - can potentially streamline
    if (tier > 1 && tier < 4) {
      reasons.push('Existing assets allow for streamlined process');
      // Don't automatically downgrade, but note it
    }
  } else {
    // Has one asset
    if (tier === 1) {
      tier = 2;
      reasons.push('Partial assets available (survey or drawings only)');
    }
  }

  // === Project Type Analysis ===
  if (projectType === 'new_build') {
    if (tier < 3) {
      tier = 3;
      reasons.push('New build requires site visits and comprehensive planning');
    }
  } else if (projectType === 'complex' || projectType === 'multiple') {
    tier = 4;
    needsReview = true;
    reasons.push('Complex or multiple-property project requires white-glove service');
  } else if (projectType === 'major_renovation') {
    if (tier < 2) {
      tier = 2;
      reasons.push('Major renovation requires designer checkpoints');
    }
  } else if (projectType === 'simple_renovation') {
    // Simple renovation is fine for any tier, but don't upgrade unnecessarily
    if (tier === 1 && reasons.length === 1) {
      reasons.push('Simple renovation suitable for automated process');
    }
  }

  // === Determine Confidence ===
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (needsReview) {
    confidence = 'low';
  } else if (reasons.length > 3) {
    confidence = 'medium';
  }

  // Tier 4 always requires manual review
  if (tier === 4) {
    needsReview = true;
    confidence = 'low';
  }

  return {
    tier,
    reason: reasons.join('; '),
    confidence,
    needsManualReview: needsReview,
  };
}

/**
 * Get the next URL based on the recommended tier
 */
export function getNextUrl(tier: 1 | 2 | 3 | 4): string {
  switch (tier) {
    case 1:
      // Tier 1: Direct to checkout
      return '/sage/checkout?tier=1';
    case 2:
      // Tier 2: Checkout or schedule kickoff
      return '/sage/checkout?tier=2';
    case 3:
      // Tier 3: Deposit and schedule site visit
      return '/sage/checkout?tier=3';
    case 4:
      // Tier 4: Book consultation call
      return '/sage/book-call';
    default:
      return '/sage/checkout';
  }
}
