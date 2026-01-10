/**
 * Milestone templates for each tier
 * Defines the standard milestones and their order for project creation
 */

export interface MilestoneTemplate {
  name: string;
  order: number;
  description?: string;
  estimatedDays?: number; // Estimated days from project start
}

export interface TierMilestoneConfig {
  tier: 1 | 2 | 3 | 4;
  tierName: string;
  milestones: MilestoneTemplate[];
  totalEstimatedDays: number;
}

/**
 * Tier 1: Seedling - Quick concept for simple projects
 * 48-hour turnaround, one revision round
 */
export const TIER_1_MILESTONES: MilestoneTemplate[] = [
  {
    name: 'Intake',
    order: 1,
    description: 'Project information received and reviewed',
    estimatedDays: 0,
  },
  {
    name: 'Concept Design',
    order: 2,
    description: 'AI-assisted concept design creation',
    estimatedDays: 1,
  },
  {
    name: 'Delivery',
    order: 3,
    description: 'Final concept delivered to client',
    estimatedDays: 2,
  },
];

/**
 * Tier 2: Sprout - Detailed plans for confident DIYers
 * 1-week turnaround, two revision rounds
 */
export const TIER_2_MILESTONES: MilestoneTemplate[] = [
  {
    name: 'Intake',
    order: 1,
    description: 'Project information received and reviewed',
    estimatedDays: 0,
  },
  {
    name: 'Initial Draft',
    order: 2,
    description: 'First draft of landscape design',
    estimatedDays: 3,
  },
  {
    name: 'Client Review',
    order: 3,
    description: 'Client reviews and provides feedback',
    estimatedDays: 4,
  },
  {
    name: 'Revisions',
    order: 4,
    description: 'Design revisions based on feedback',
    estimatedDays: 6,
  },
  {
    name: 'Final Delivery',
    order: 5,
    description: 'Final design package delivered',
    estimatedDays: 7,
  },
];

/**
 * Tier 3: Canopy - Comprehensive design with ongoing support
 * 2-week turnaround, three revision rounds
 */
export const TIER_3_MILESTONES: MilestoneTemplate[] = [
  {
    name: 'Intake',
    order: 1,
    description: 'Project information and site analysis',
    estimatedDays: 0,
  },
  {
    name: 'Concept Development',
    order: 2,
    description: 'Initial concept and design direction',
    estimatedDays: 3,
  },
  {
    name: 'Design Draft',
    order: 3,
    description: 'Detailed design draft with specifications',
    estimatedDays: 6,
  },
  {
    name: 'Client Review',
    order: 4,
    description: 'Client reviews and provides feedback',
    estimatedDays: 8,
  },
  {
    name: 'Revisions Round 1',
    order: 5,
    description: 'First round of design revisions',
    estimatedDays: 10,
  },
  {
    name: 'Revisions Round 2',
    order: 6,
    description: 'Second round of refinements',
    estimatedDays: 12,
  },
  {
    name: 'Construction Documents',
    order: 7,
    description: 'Final construction-ready documents',
    estimatedDays: 14,
  },
  {
    name: 'Delivery & Handoff',
    order: 8,
    description: 'Final delivery with contractor coordination',
    estimatedDays: 14,
  },
];

/**
 * Tier 4: Legacy - Full-service estate and commercial projects
 * Custom timeline, unlimited revisions
 */
export const TIER_4_MILESTONES: MilestoneTemplate[] = [
  {
    name: 'Discovery & Consultation',
    order: 1,
    description: 'Initial consultation and project scoping',
    estimatedDays: 0,
  },
  {
    name: 'Site Analysis',
    order: 2,
    description: 'Comprehensive site assessment',
    estimatedDays: 7,
  },
  {
    name: 'Master Plan Development',
    order: 3,
    description: 'Multi-phase master plan creation',
    estimatedDays: 21,
  },
  {
    name: 'Client Presentation',
    order: 4,
    description: 'Formal presentation of master plan',
    estimatedDays: 28,
  },
  {
    name: 'Design Refinement',
    order: 5,
    description: 'Iterative design refinement',
    estimatedDays: 42,
  },
  {
    name: 'Phase 1 Documents',
    order: 6,
    description: 'Construction documents for phase 1',
    estimatedDays: 56,
  },
  {
    name: 'Vendor Coordination',
    order: 7,
    description: 'Vendor selection and coordination',
    estimatedDays: 63,
  },
  {
    name: 'Implementation Support',
    order: 8,
    description: 'Ongoing implementation oversight',
    estimatedDays: 90,
  },
  {
    name: 'Project Completion',
    order: 9,
    description: 'Final walkthrough and handoff',
    estimatedDays: 120,
  },
];

/**
 * Get milestone templates for a specific tier
 */
export function getMilestoneTemplates(tier: 1 | 2 | 3 | 4): TierMilestoneConfig {
  const configs: Record<1 | 2 | 3 | 4, TierMilestoneConfig> = {
    1: {
      tier: 1,
      tierName: 'Seedling',
      milestones: TIER_1_MILESTONES,
      totalEstimatedDays: 2,
    },
    2: {
      tier: 2,
      tierName: 'Sprout',
      milestones: TIER_2_MILESTONES,
      totalEstimatedDays: 7,
    },
    3: {
      tier: 3,
      tierName: 'Canopy',
      milestones: TIER_3_MILESTONES,
      totalEstimatedDays: 14,
    },
    4: {
      tier: 4,
      tierName: 'Legacy',
      milestones: TIER_4_MILESTONES,
      totalEstimatedDays: 120,
    },
  };

  return configs[tier];
}

/**
 * Calculate due dates for milestones based on project start date
 */
export function calculateMilestoneDueDates(
  tier: 1 | 2 | 3 | 4,
  startDate: Date = new Date()
): Array<MilestoneTemplate & { dueDate: Date }> {
  const config = getMilestoneTemplates(tier);

  return config.milestones.map((milestone) => ({
    ...milestone,
    dueDate: new Date(startDate.getTime() + (milestone.estimatedDays || 0) * 24 * 60 * 60 * 1000),
  }));
}

/**
 * Get tier name by number
 */
export function getTierName(tier: 1 | 2 | 3 | 4): string {
  const names: Record<1 | 2 | 3 | 4, string> = {
    1: 'Seedling',
    2: 'Sprout',
    3: 'Canopy',
    4: 'Legacy',
  };
  return names[tier];
}
