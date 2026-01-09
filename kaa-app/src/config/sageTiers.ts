/**
 * Sage Tier Configuration
 *
 * Single source of truth for:
 * - Tier definitions (name, touch level, key deliverables)
 * - Stripe price IDs (environment-driven)
 * - Tier routing thresholds (budget bands + asset heuristics)
 *
 * This config is used by both UI components and API/backend logic.
 *
 * @module config/sageTiers
 * @version 1.0.0
 */

// ============================================
// TIER NUMBER TYPE
// ============================================

export type TierNumber = 1 | 2 | 3 | 4;

// ============================================
// TOUCH LEVELS
// ============================================

export type TouchLevel = 'no-touch' | 'low-touch' | 'hybrid' | 'high-touch';

export const TOUCH_LEVEL_LABELS: Record<TouchLevel, string> = {
  'no-touch': 'Fully Automated',
  'low-touch': 'Systematized with Checkpoints',
  'hybrid': 'Tech + Boots on Ground',
  'high-touch': 'We Choose the Client',
};

// ============================================
// BUDGET THRESHOLDS (in USD)
// ============================================

/**
 * Budget thresholds for tier routing.
 * These values define the boundaries between tiers.
 */
export const BUDGET_THRESHOLDS = {
  /** Minimum budget for Tier 1 */
  TIER_1_MIN: 500,
  /** Maximum budget for Tier 1 / Minimum for Tier 2 */
  TIER_1_MAX: 2500,
  /** Maximum budget for Tier 2 / Minimum for Tier 3 */
  TIER_2_MAX: 10000,
  /** Maximum budget for Tier 3 / Minimum for Tier 4 */
  TIER_3_MAX: 50000,
} as const;

/**
 * Budget range labels for intake forms
 */
export const BUDGET_RANGES = [
  { value: 'under_500', label: 'Under $500', min: 0, max: 499 },
  { value: '500_2500', label: '$500 - $2,500', min: 500, max: 2500 },
  { value: '2500_10000', label: '$2,500 - $10,000', min: 2500, max: 10000 },
  { value: '10000_50000', label: '$10,000 - $50,000', min: 10000, max: 50000 },
  { value: '50000_plus', label: '$50,000+', min: 50000, max: Infinity },
  { value: 'percent_of_install', label: 'Percentage of Install', min: 0, max: Infinity },
] as const;

export type BudgetRangeValue = typeof BUDGET_RANGES[number]['value'];

// ============================================
// TIMELINE THRESHOLDS (in weeks)
// ============================================

export const TIMELINE_THRESHOLDS = {
  /** Fast track threshold (under this = expedited) */
  FAST_TRACK: 2,
  /** Standard timeline upper bound */
  STANDARD_MAX: 8,
  /** Extended timeline threshold (over this = complex) */
  EXTENDED: 8,
} as const;

/**
 * Timeline options for intake forms
 */
export const TIMELINE_OPTIONS = [
  { value: 'under_2_weeks', label: 'Under 2 weeks', weeks: 1 },
  { value: '2_4_weeks', label: '2-4 weeks', weeks: 3 },
  { value: '4_8_weeks', label: '4-8 weeks', weeks: 6 },
  { value: '8_12_weeks', label: '8-12 weeks', weeks: 10 },
  { value: '3_6_months', label: '3-6 months', weeks: 18 },
  { value: '6_plus_months', label: '6+ months', weeks: 26 },
] as const;

export type TimelineValue = typeof TIMELINE_OPTIONS[number]['value'];

// ============================================
// PROJECT TYPES
// ============================================

export const PROJECT_TYPES = [
  { value: 'simple_renovation', label: 'Simple Renovation', complexity: 'low' },
  { value: 'standard_renovation', label: 'Standard Renovation', complexity: 'medium' },
  { value: 'small_addition', label: 'Small Addition', complexity: 'low' },
  { value: 'medium_addition', label: 'Medium Addition', complexity: 'medium' },
  { value: 'large_addition', label: 'Large Addition', complexity: 'high' },
  { value: 'new_build', label: 'New Build', complexity: 'high' },
  { value: 'multiple_properties', label: 'Multiple Properties', complexity: 'high' },
  { value: 'commercial', label: 'Commercial Project', complexity: 'high' },
] as const;

export type ProjectTypeValue = typeof PROJECT_TYPES[number]['value'];

// ============================================
// STRIPE CONFIGURATION
// ============================================

/**
 * Stripe price IDs for each tier.
 * These should be set via environment variables in production.
 *
 * Format: REACT_APP_STRIPE_PRICE_TIER_X for frontend
 *         STRIPE_PRICE_TIER_X for backend
 */
export const getStripePriceIds = () => ({
  tier1: process.env.REACT_APP_STRIPE_PRICE_TIER_1 || process.env.STRIPE_PRICE_TIER_1 || '',
  tier2: process.env.REACT_APP_STRIPE_PRICE_TIER_2 || process.env.STRIPE_PRICE_TIER_2 || '',
  tier3: process.env.REACT_APP_STRIPE_PRICE_TIER_3 || process.env.STRIPE_PRICE_TIER_3 || '',
  tier4: process.env.REACT_APP_STRIPE_PRICE_TIER_4 || process.env.STRIPE_PRICE_TIER_4 || '',
});

/**
 * Stripe product IDs for each tier.
 */
export const getStripeProductIds = () => ({
  tier1: process.env.REACT_APP_STRIPE_PRODUCT_TIER_1 || process.env.STRIPE_PRODUCT_TIER_1 || '',
  tier2: process.env.REACT_APP_STRIPE_PRODUCT_TIER_2 || process.env.STRIPE_PRODUCT_TIER_2 || '',
  tier3: process.env.REACT_APP_STRIPE_PRODUCT_TIER_3 || process.env.STRIPE_PRODUCT_TIER_3 || '',
  tier4: process.env.REACT_APP_STRIPE_PRODUCT_TIER_4 || process.env.STRIPE_PRODUCT_TIER_4 || '',
});

// ============================================
// TIER DEFINITIONS
// ============================================

export interface TierDeliverable {
  name: string;
  included: boolean;
}

export interface TierDefinition {
  tier: TierNumber;
  name: string;
  tagline: string;
  touchLevel: TouchLevel;
  touchLevelLabel: string;
  description: string;
  budgetRange: {
    min: number;
    max: number;
    label: string;
  };
  timelineRange: {
    minWeeks: number;
    maxWeeks: number;
    label: string;
  };
  keyDeliverables: TierDeliverable[];
  features: string[];
  autoRoute: boolean;
  requiresManualReview: boolean;
  ctaLabel: string;
  ctaAction: 'checkout' | 'schedule' | 'deposit' | 'consult';
}

/**
 * Complete tier definitions - the single source of truth
 */
export const TIER_DEFINITIONS: Record<TierNumber, TierDefinition> = {
  1: {
    tier: 1,
    name: 'The Concept',
    tagline: 'Fast, automated design delivery',
    touchLevel: 'no-touch',
    touchLevelLabel: TOUCH_LEVEL_LABELS['no-touch'],
    description: 'Perfect for straightforward projects with existing documentation. Get your design concept delivered quickly through our automated system.',
    budgetRange: {
      min: BUDGET_THRESHOLDS.TIER_1_MIN,
      max: BUDGET_THRESHOLDS.TIER_1_MAX,
      label: `$${BUDGET_THRESHOLDS.TIER_1_MIN.toLocaleString()} - $${BUDGET_THRESHOLDS.TIER_1_MAX.toLocaleString()}`,
    },
    timelineRange: {
      minWeeks: 2,
      maxWeeks: 4,
      label: '2-4 weeks',
    },
    keyDeliverables: [
      { name: 'Concept Design Package', included: true },
      { name: 'Plant Palette Selection', included: true },
      { name: 'Basic Layout Plan', included: true },
      { name: 'Material Recommendations', included: true },
      { name: 'Designer Consultation', included: false },
      { name: 'Site Visit', included: false },
      { name: 'Revisions', included: false },
    ],
    features: [
      'Fully automated process',
      'Fixed pricing',
      'Fast turnaround',
      'Digital delivery',
    ],
    autoRoute: true,
    requiresManualReview: false,
    ctaLabel: 'Checkout Now',
    ctaAction: 'checkout',
  },
  2: {
    tier: 2,
    name: 'The Builder',
    tagline: 'Guided design with expert checkpoints',
    touchLevel: 'low-touch',
    touchLevelLabel: TOUCH_LEVEL_LABELS['low-touch'],
    description: 'Ideal for projects that need some customization. Work with our systematized process featuring designer checkpoints at key milestones.',
    budgetRange: {
      min: BUDGET_THRESHOLDS.TIER_1_MAX,
      max: BUDGET_THRESHOLDS.TIER_2_MAX,
      label: `$${BUDGET_THRESHOLDS.TIER_1_MAX.toLocaleString()} - $${BUDGET_THRESHOLDS.TIER_2_MAX.toLocaleString()}`,
    },
    timelineRange: {
      minWeeks: 4,
      maxWeeks: 8,
      label: '4-8 weeks',
    },
    keyDeliverables: [
      { name: 'Concept Design Package', included: true },
      { name: 'Plant Palette Selection', included: true },
      { name: 'Detailed Layout Plan', included: true },
      { name: 'Material Specifications', included: true },
      { name: 'Designer Checkpoints (2)', included: true },
      { name: 'One Round of Revisions', included: true },
      { name: 'Site Visit', included: false },
    ],
    features: [
      'Designer checkpoints',
      'Some customization',
      'One revision round',
      'Email support',
    ],
    autoRoute: true,
    requiresManualReview: false,
    ctaLabel: 'Checkout / Schedule Kickoff',
    ctaAction: 'schedule',
  },
  3: {
    tier: 3,
    name: 'The Concierge',
    tagline: 'Full-service design with site visits',
    touchLevel: 'hybrid',
    touchLevelLabel: TOUCH_LEVEL_LABELS['hybrid'],
    description: 'Comprehensive design service for complex projects. Includes on-site visits, detailed documentation, and personalized support throughout.',
    budgetRange: {
      min: BUDGET_THRESHOLDS.TIER_2_MAX,
      max: BUDGET_THRESHOLDS.TIER_3_MAX,
      label: `$${BUDGET_THRESHOLDS.TIER_2_MAX.toLocaleString()} - $${BUDGET_THRESHOLDS.TIER_3_MAX.toLocaleString()}`,
    },
    timelineRange: {
      minWeeks: 8,
      maxWeeks: 12,
      label: '8-12 weeks',
    },
    keyDeliverables: [
      { name: 'Full Design Package', included: true },
      { name: 'Custom Plant Design', included: true },
      { name: 'Construction Documents', included: true },
      { name: 'Material Specifications', included: true },
      { name: 'Site Visit(s)', included: true },
      { name: 'Designer Consultations', included: true },
      { name: 'Multiple Revisions', included: true },
    ],
    features: [
      'Site visits included',
      'Full customization',
      'Multiple revisions',
      'Phone & email support',
      'Project management',
    ],
    autoRoute: false,
    requiresManualReview: true,
    ctaLabel: 'Deposit / Schedule Site Visit',
    ctaAction: 'deposit',
  },
  4: {
    tier: 4,
    name: 'KAA White Glove',
    tagline: 'Premium service for select projects',
    touchLevel: 'high-touch',
    touchLevelLabel: TOUCH_LEVEL_LABELS['high-touch'],
    description: 'Our most exclusive offering for high-value, complex projects. We select clients carefully to ensure exceptional results and long-term relationships.',
    budgetRange: {
      min: BUDGET_THRESHOLDS.TIER_3_MAX,
      max: Infinity,
      label: `$${BUDGET_THRESHOLDS.TIER_3_MAX.toLocaleString()}+ or % of Install`,
    },
    timelineRange: {
      minWeeks: 12,
      maxWeeks: 52,
      label: '3-12 months',
    },
    keyDeliverables: [
      { name: 'Comprehensive Design Package', included: true },
      { name: 'Custom Plant Design', included: true },
      { name: 'Full Construction Documents', included: true },
      { name: 'Premium Material Sourcing', included: true },
      { name: 'Multiple Site Visits', included: true },
      { name: 'Dedicated Designer', included: true },
      { name: 'Unlimited Revisions', included: true },
      { name: 'Installation Oversight', included: true },
    ],
    features: [
      'Dedicated design team',
      'Unlimited revisions',
      'Installation oversight',
      'VIP support',
      'Long-term relationship',
      'Premium materials',
    ],
    autoRoute: false,
    requiresManualReview: true,
    ctaLabel: 'Book Consultation',
    ctaAction: 'consult',
  },
};

// ============================================
// ROUTING HEURISTICS
// ============================================

/**
 * Asset requirements for tier routing
 */
export const ASSET_HEURISTICS = {
  /** If client has both survey and drawings, can potentially streamline */
  HAS_BOTH_ASSETS: {
    canDowngrade: true,
    maxDowngrade: 1,
  },
  /** If client has only one of survey or drawings */
  HAS_ONE_ASSET: {
    suggestedMinTier: 2,
  },
  /** If client has no survey and no drawings */
  HAS_NO_ASSETS: {
    suggestedMinTier: 3,
    reason: 'Site visit required - no existing assets',
  },
} as const;

/**
 * Project type to minimum tier mapping
 */
export const PROJECT_TYPE_MIN_TIERS: Record<ProjectTypeValue, TierNumber> = {
  simple_renovation: 1,
  standard_renovation: 2,
  small_addition: 1,
  medium_addition: 2,
  large_addition: 3,
  new_build: 3,
  multiple_properties: 4,
  commercial: 4,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get tier definition by tier number
 */
export function getTierDefinition(tier: TierNumber): TierDefinition {
  return TIER_DEFINITIONS[tier];
}

/**
 * Get all tier definitions as an array
 */
export function getAllTierDefinitions(): TierDefinition[] {
  return Object.values(TIER_DEFINITIONS);
}

/**
 * Get tier number from budget value
 */
export function getTierFromBudget(budgetValue: number): TierNumber {
  if (budgetValue < BUDGET_THRESHOLDS.TIER_1_MAX) return 1;
  if (budgetValue < BUDGET_THRESHOLDS.TIER_2_MAX) return 2;
  if (budgetValue < BUDGET_THRESHOLDS.TIER_3_MAX) return 3;
  return 4;
}

/**
 * Parse budget range string to get min/max values
 */
export function parseBudgetRange(rangeValue: BudgetRangeValue): { min: number; max: number } {
  const range = BUDGET_RANGES.find(r => r.value === rangeValue);
  if (!range) {
    return { min: 0, max: BUDGET_THRESHOLDS.TIER_1_MAX };
  }
  return { min: range.min, max: range.max };
}

/**
 * Parse timeline option to get weeks estimate
 */
export function parseTimelineWeeks(timelineValue: TimelineValue): number {
  const option = TIMELINE_OPTIONS.find(t => t.value === timelineValue);
  return option?.weeks || 4;
}

/**
 * Check if a tier requires manual review
 */
export function tierRequiresReview(tier: TierNumber): boolean {
  return TIER_DEFINITIONS[tier].requiresManualReview;
}

/**
 * Get Stripe price ID for a tier
 */
export function getStripePriceForTier(tier: TierNumber): string {
  const priceIds = getStripePriceIds();
  const key = `tier${tier}` as keyof ReturnType<typeof getStripePriceIds>;
  return priceIds[key];
}

// ============================================
// EXPORTS FOR EXTERNAL USE
// ============================================

export default {
  TIER_DEFINITIONS,
  BUDGET_THRESHOLDS,
  BUDGET_RANGES,
  TIMELINE_THRESHOLDS,
  TIMELINE_OPTIONS,
  PROJECT_TYPES,
  ASSET_HEURISTICS,
  PROJECT_TYPE_MIN_TIERS,
  TOUCH_LEVEL_LABELS,
  getTierDefinition,
  getAllTierDefinitions,
  getTierFromBudget,
  parseBudgetRange,
  parseTimelineWeeks,
  tierRequiresReview,
  getStripePriceForTier,
  getStripePriceIds,
  getStripeProductIds,
};
