/**
 * SAGE Tier Configuration
 * Single source of truth for tier definitions, thresholds, and Stripe integration.
 * Used by both UI components and API logic.
 */

// ============================================================================
// TIER DEFINITIONS
// ============================================================================

export type TierId = 1 | 2 | 3 | 4;

export type TouchLevel = 'no-touch' | 'low-touch' | 'hybrid' | 'high-touch';

export type ProjectType =
  | 'simple_renovation'
  | 'standard_renovation'
  | 'small_addition'
  | 'standard_addition'
  | 'major_renovation'
  | 'new_build'
  | 'complex'
  | 'multiple_properties';

export type TimelineCategory = 'fast' | 'standard' | 'extended';

export interface TierDeliverable {
  name: string;
  included: boolean;
  description?: string;
}

export interface TierDefinition {
  id: TierId;
  name: string;
  tagline: string;
  touchLevel: TouchLevel;
  description: string;
  deliverables: TierDeliverable[];
  autoRoute: boolean;
  requiresManualReview: boolean;
}

export const TIER_DEFINITIONS: Record<TierId, TierDefinition> = {
  1: {
    id: 1,
    name: 'The Concept',
    tagline: 'No-Touch, Fully Automated',
    touchLevel: 'no-touch',
    description:
      'Self-service design package with automated delivery. Perfect for simple projects with existing documentation.',
    deliverables: [
      { name: 'Conceptual Floor Plans', included: true },
      { name: 'Basic 3D Renderings', included: true },
      { name: 'Digital Delivery', included: true },
      { name: 'Revision Round (1x)', included: true },
      { name: 'Designer Check-in', included: false },
      { name: 'Site Visit', included: false },
    ],
    autoRoute: true,
    requiresManualReview: false,
  },
  2: {
    id: 2,
    name: 'The Builder',
    tagline: 'Low-Touch, Systematized with Checkpoints',
    touchLevel: 'low-touch',
    description:
      'Guided design process with designer checkpoints. Ideal for standard renovations and additions.',
    deliverables: [
      { name: 'Detailed Floor Plans', included: true },
      { name: '3D Renderings', included: true },
      { name: 'Designer Kickoff Call', included: true },
      { name: 'Mid-project Check-in', included: true },
      { name: 'Revision Rounds (2x)', included: true },
      { name: 'Site Visit', included: false },
    ],
    autoRoute: true,
    requiresManualReview: false,
  },
  3: {
    id: 3,
    name: 'The Concierge',
    tagline: 'Site Visits, Hybrid Tech + Boots on Ground',
    touchLevel: 'hybrid',
    description:
      'Full-service design with site visits and hands-on collaboration. For new builds and major renovations.',
    deliverables: [
      { name: 'Comprehensive Floor Plans', included: true },
      { name: 'Premium 3D Renderings', included: true },
      { name: 'Site Survey Visit', included: true },
      { name: 'Designer Collaboration Sessions', included: true },
      { name: 'Revision Rounds (3x)', included: true },
      { name: 'Contractor Coordination', included: true },
    ],
    autoRoute: false,
    requiresManualReview: true,
  },
  4: {
    id: 4,
    name: 'KAA White Glove',
    tagline: 'High-Touch, We Choose the Client',
    touchLevel: 'high-touch',
    description:
      'Premium full-service experience for select clients. Percentage-based pricing for complex, high-value projects.',
    deliverables: [
      { name: 'Full Architectural Design', included: true },
      { name: 'Unlimited Revisions', included: true },
      { name: 'Multiple Site Visits', included: true },
      { name: 'Dedicated Design Team', included: true },
      { name: 'Project Management', included: true },
      { name: 'Contractor Selection Support', included: true },
      { name: 'Construction Oversight', included: true },
    ],
    autoRoute: false,
    requiresManualReview: true,
  },
};

// ============================================================================
// BUDGET THRESHOLDS
// ============================================================================

export interface BudgetBand {
  tier: TierId;
  min: number;
  max: number | null; // null = no upper limit
  label: string;
}

export const BUDGET_BANDS: BudgetBand[] = [
  { tier: 1, min: 2500, max: 7500, label: '$2,500 - $7,500' },
  { tier: 2, min: 7500, max: 15000, label: '$7,500 - $15,000' },
  { tier: 3, min: 15000, max: 35000, label: '$15,000 - $35,000' },
  { tier: 4, min: 35000, max: null, label: '$35,000+' },
];

// Convenience constants for thresholds
export const BUDGET_THRESHOLDS = {
  TIER_1_MIN: 2500,
  TIER_1_MAX: 7500,
  TIER_2_MIN: 7500,
  TIER_2_MAX: 15000,
  TIER_3_MIN: 15000,
  TIER_3_MAX: 35000,
  TIER_4_MIN: 35000,
} as const;

// ============================================================================
// TIMELINE THRESHOLDS
// ============================================================================

export interface TimelineThreshold {
  category: TimelineCategory;
  minWeeks: number;
  maxWeeks: number | null;
  label: string;
  eligibleTiers: TierId[];
}

export const TIMELINE_THRESHOLDS: TimelineThreshold[] = [
  {
    category: 'fast',
    minWeeks: 0,
    maxWeeks: 2,
    label: 'Fast Track (< 2 weeks)',
    eligibleTiers: [1, 2],
  },
  {
    category: 'standard',
    minWeeks: 2,
    maxWeeks: 8,
    label: 'Standard (2-8 weeks)',
    eligibleTiers: [1, 2, 3],
  },
  {
    category: 'extended',
    minWeeks: 8,
    maxWeeks: null,
    label: 'Extended (8+ weeks)',
    eligibleTiers: [3, 4],
  },
];

export const TIMELINE_WEEKS = {
  FAST_MAX: 2,
  STANDARD_MAX: 8,
} as const;

// ============================================================================
// ASSET ROUTING RULES
// ============================================================================

export interface AssetCriteria {
  hasSurvey: boolean;
  hasDrawings: boolean;
  eligibleTiers: TierId[];
  description: string;
}

export const ASSET_ROUTING: AssetCriteria[] = [
  {
    hasSurvey: true,
    hasDrawings: true,
    eligibleTiers: [1, 2],
    description: 'Ready to go - has both survey and drawings',
  },
  {
    hasSurvey: true,
    hasDrawings: false,
    eligibleTiers: [2, 3],
    description: 'Partial assets - has survey only',
  },
  {
    hasSurvey: false,
    hasDrawings: true,
    eligibleTiers: [2, 3],
    description: 'Partial assets - has drawings only',
  },
  {
    hasSurvey: false,
    hasDrawings: false,
    eligibleTiers: [3, 4],
    description: 'Site visit required - no existing assets',
  },
];

// ============================================================================
// PROJECT TYPE ROUTING
// ============================================================================

export interface ProjectTypeRouting {
  type: ProjectType;
  label: string;
  eligibleTiers: TierId[];
  requiresSiteVisit: boolean;
}

export const PROJECT_TYPE_ROUTING: ProjectTypeRouting[] = [
  {
    type: 'simple_renovation',
    label: 'Simple Renovation',
    eligibleTiers: [1, 2],
    requiresSiteVisit: false,
  },
  {
    type: 'standard_renovation',
    label: 'Standard Renovation',
    eligibleTiers: [1, 2, 3],
    requiresSiteVisit: false,
  },
  {
    type: 'small_addition',
    label: 'Small Addition',
    eligibleTiers: [1, 2],
    requiresSiteVisit: false,
  },
  {
    type: 'standard_addition',
    label: 'Standard Addition',
    eligibleTiers: [2, 3],
    requiresSiteVisit: false,
  },
  {
    type: 'major_renovation',
    label: 'Major Renovation',
    eligibleTiers: [3, 4],
    requiresSiteVisit: true,
  },
  {
    type: 'new_build',
    label: 'New Build',
    eligibleTiers: [3, 4],
    requiresSiteVisit: true,
  },
  {
    type: 'complex',
    label: 'Complex Project',
    eligibleTiers: [4],
    requiresSiteVisit: true,
  },
  {
    type: 'multiple_properties',
    label: 'Multiple Properties',
    eligibleTiers: [4],
    requiresSiteVisit: true,
  },
];

// ============================================================================
// STRIPE CONFIGURATION (Environment-driven)
// ============================================================================

export interface StripeTierConfig {
  tier: TierId;
  productId: string;
  priceId: string;
  depositPriceId?: string; // For Tier 3 deposits
}

// These should be populated from environment variables
// Fallback to empty strings for type safety
const getEnvVar = (key: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || '';
  }
  // Browser environment - check for window.__ENV__ or similar pattern
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key] || '';
  }
  return '';
};

export const STRIPE_CONFIG: Record<TierId, StripeTierConfig> = {
  1: {
    tier: 1,
    productId: getEnvVar('REACT_APP_STRIPE_TIER1_PRODUCT_ID'),
    priceId: getEnvVar('REACT_APP_STRIPE_TIER1_PRICE_ID'),
  },
  2: {
    tier: 2,
    productId: getEnvVar('REACT_APP_STRIPE_TIER2_PRODUCT_ID'),
    priceId: getEnvVar('REACT_APP_STRIPE_TIER2_PRICE_ID'),
  },
  3: {
    tier: 3,
    productId: getEnvVar('REACT_APP_STRIPE_TIER3_PRODUCT_ID'),
    priceId: getEnvVar('REACT_APP_STRIPE_TIER3_PRICE_ID'),
    depositPriceId: getEnvVar('REACT_APP_STRIPE_TIER3_DEPOSIT_PRICE_ID'),
  },
  4: {
    tier: 4,
    productId: getEnvVar('REACT_APP_STRIPE_TIER4_PRODUCT_ID'),
    priceId: getEnvVar('REACT_APP_STRIPE_TIER4_PRICE_ID'),
  },
};

// ============================================================================
// RED FLAGS (Trigger Manual Review)
// ============================================================================

export interface RedFlag {
  id: string;
  description: string;
  severity: 'warning' | 'critical';
}

export const RED_FLAGS: RedFlag[] = [
  {
    id: 'budget_unclear',
    description: 'Budget unclear or below minimum',
    severity: 'warning',
  },
  {
    id: 'timeline_unrealistic',
    description: 'Timeline unrealistic (< 2 weeks for complex project)',
    severity: 'warning',
  },
  {
    id: 'budget_timeline_mismatch',
    description: 'Budget and timeline expectations do not align',
    severity: 'warning',
  },
  {
    id: 'no_assets_fast_timeline',
    description: 'No existing assets but expecting fast delivery',
    severity: 'critical',
  },
  {
    id: 'complex_low_budget',
    description: 'Complex project with insufficient budget',
    severity: 'critical',
  },
  {
    id: 'multiple_properties',
    description: 'Multiple properties require white-glove service',
    severity: 'warning',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tier definition by ID
 */
export function getTierById(id: TierId): TierDefinition {
  return TIER_DEFINITIONS[id];
}

/**
 * Get all tier definitions as an array
 */
export function getAllTiers(): TierDefinition[] {
  return Object.values(TIER_DEFINITIONS);
}

/**
 * Get the budget band for a given amount
 */
export function getBudgetBandForAmount(amount: number): BudgetBand | null {
  return (
    BUDGET_BANDS.find((band) => {
      if (band.max === null) {
        return amount >= band.min;
      }
      return amount >= band.min && amount < band.max;
    }) || null
  );
}

/**
 * Get recommended tier based on budget amount
 */
export function getTierForBudget(amount: number): TierId {
  const band = getBudgetBandForAmount(amount);
  return band?.tier || 1;
}

/**
 * Get timeline category for a given number of weeks
 */
export function getTimelineCategory(weeks: number): TimelineCategory {
  if (weeks < TIMELINE_WEEKS.FAST_MAX) return 'fast';
  if (weeks <= TIMELINE_WEEKS.STANDARD_MAX) return 'standard';
  return 'extended';
}

/**
 * Get project type routing info
 */
export function getProjectTypeInfo(type: ProjectType): ProjectTypeRouting | undefined {
  return PROJECT_TYPE_ROUTING.find((p) => p.type === type);
}

/**
 * Check if a tier requires site visit based on project type
 */
export function tierRequiresSiteVisit(tier: TierId): boolean {
  return tier >= 3;
}

/**
 * Format budget as currency string
 */
export function formatBudget(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get Stripe price ID for a tier
 */
export function getStripePriceId(tier: TierId): string {
  return STRIPE_CONFIG[tier].priceId;
}

/**
 * Get Stripe product ID for a tier
 */
export function getStripeProductId(tier: TierId): string {
  return STRIPE_CONFIG[tier].productId;
}
