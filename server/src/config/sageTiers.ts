/**
 * SAGE Tier Configuration (Server-side)
 * Single source of truth for tier definitions and routing thresholds.
 */

export type TierId = 1 | 2 | 3 | 4;

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

export interface TierDefinition {
  id: TierId;
  name: string;
  tagline: string;
  autoRoute: boolean;
  requiresManualReview: boolean;
}

export const TIER_DEFINITIONS: Record<TierId, TierDefinition> = {
  1: {
    id: 1,
    name: 'The Concept',
    tagline: 'No-Touch, Fully Automated',
    autoRoute: true,
    requiresManualReview: false,
  },
  2: {
    id: 2,
    name: 'The Builder',
    tagline: 'Low-Touch, Systematized with Checkpoints',
    autoRoute: true,
    requiresManualReview: false,
  },
  3: {
    id: 3,
    name: 'The Concierge',
    tagline: 'Site Visits, Hybrid Tech + Boots on Ground',
    autoRoute: false,
    requiresManualReview: true,
  },
  4: {
    id: 4,
    name: 'KAA White Glove',
    tagline: 'High-Touch, We Choose the Client',
    autoRoute: false,
    requiresManualReview: true,
  },
};

export const BUDGET_THRESHOLDS = {
  TIER_1_MIN: 2500,
  TIER_1_MAX: 7500,
  TIER_2_MIN: 7500,
  TIER_2_MAX: 15000,
  TIER_3_MIN: 15000,
  TIER_3_MAX: 35000,
  TIER_4_MIN: 35000,
} as const;

export const TIMELINE_WEEKS = {
  FAST_MAX: 2,
  STANDARD_MAX: 8,
} as const;

export interface AssetCriteria {
  hasSurvey: boolean;
  hasDrawings: boolean;
  eligibleTiers: TierId[];
}

export const ASSET_ROUTING: AssetCriteria[] = [
  { hasSurvey: true, hasDrawings: true, eligibleTiers: [1, 2] },
  { hasSurvey: true, hasDrawings: false, eligibleTiers: [2, 3] },
  { hasSurvey: false, hasDrawings: true, eligibleTiers: [2, 3] },
  { hasSurvey: false, hasDrawings: false, eligibleTiers: [3, 4] },
];

export interface ProjectTypeRouting {
  type: ProjectType;
  label: string;
  eligibleTiers: TierId[];
  requiresSiteVisit: boolean;
}

export const PROJECT_TYPE_ROUTING: ProjectTypeRouting[] = [
  { type: 'simple_renovation', label: 'Simple Renovation', eligibleTiers: [1, 2], requiresSiteVisit: false },
  { type: 'standard_renovation', label: 'Standard Renovation', eligibleTiers: [1, 2, 3], requiresSiteVisit: false },
  { type: 'small_addition', label: 'Small Addition', eligibleTiers: [1, 2], requiresSiteVisit: false },
  { type: 'standard_addition', label: 'Standard Addition', eligibleTiers: [2, 3], requiresSiteVisit: false },
  { type: 'major_renovation', label: 'Major Renovation', eligibleTiers: [3, 4], requiresSiteVisit: true },
  { type: 'new_build', label: 'New Build', eligibleTiers: [3, 4], requiresSiteVisit: true },
  { type: 'complex', label: 'Complex Project', eligibleTiers: [4], requiresSiteVisit: true },
  { type: 'multiple_properties', label: 'Multiple Properties', eligibleTiers: [4], requiresSiteVisit: true },
];

export function getTierForBudget(amount: number): TierId {
  if (amount >= BUDGET_THRESHOLDS.TIER_4_MIN) return 4;
  if (amount >= BUDGET_THRESHOLDS.TIER_3_MIN) return 3;
  if (amount >= BUDGET_THRESHOLDS.TIER_2_MIN) return 2;
  return 1;
}

export function getTimelineCategory(weeks: number): TimelineCategory {
  if (weeks < TIMELINE_WEEKS.FAST_MAX) return 'fast';
  if (weeks <= TIMELINE_WEEKS.STANDARD_MAX) return 'standard';
  return 'extended';
}

export function getProjectTypeInfo(type: ProjectType): ProjectTypeRouting | undefined {
  return PROJECT_TYPE_ROUTING.find((p) => p.type === type);
}

export function formatBudget(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
