/**
 * Milestone Templates
 * Defines tier-specific milestone templates for project creation.
 * These templates are used by projectService to create milestones when a project is created.
 *
 * Single source of truth for milestone definitions across all tiers.
 */

// ============================================================================
// TYPES
// ============================================================================

export type TierId = 1 | 2 | 3 | 4;

export interface MilestoneTemplate {
  /** Display name of the milestone */
  name: string;
  /** Order in the project timeline (1 = first) */
  order: number;
  /** Description of what this milestone involves */
  description: string;
  /** Estimated duration in days (null = variable) */
  estimatedDays: number | null;
  /** Whether this milestone is optional */
  optional: boolean;
  /** Milestone category for grouping */
  category: 'intake' | 'design' | 'review' | 'delivery';
}

export interface TierMilestoneConfig {
  tier: TierId;
  tierName: string;
  milestones: MilestoneTemplate[];
  /** Total estimated project duration in weeks (max = null means variable) */
  estimatedDurationWeeks: { min: number; max: number | null };
  /** Number of revision rounds included (-1 = unlimited) */
  revisionRounds: number;
  /** Whether site visit is included */
  includesSiteVisit: boolean;
}

// ============================================================================
// TIER 1: THE CONCEPT (No-Touch, Fully Automated)
// Milestones: Intake → Concept Design → Delivery
// ============================================================================

const TIER_1_MILESTONES: MilestoneTemplate[] = [
  {
    name: 'Project Intake',
    order: 1,
    description: 'Review intake form and project requirements',
    estimatedDays: 1,
    optional: false,
    category: 'intake',
  },
  {
    name: 'Asset Review',
    order: 2,
    description: 'Review existing survey and drawings provided by client',
    estimatedDays: 2,
    optional: false,
    category: 'intake',
  },
  {
    name: 'Concept Design',
    order: 3,
    description: 'Create conceptual floor plans and basic 3D renderings',
    estimatedDays: 7,
    optional: false,
    category: 'design',
  },
  {
    name: 'Client Review',
    order: 4,
    description: 'Client reviews concept designs and provides feedback',
    estimatedDays: 3,
    optional: false,
    category: 'review',
  },
  {
    name: 'Revisions',
    order: 5,
    description: 'Apply client feedback and finalize designs (1 revision round)',
    estimatedDays: 3,
    optional: false,
    category: 'design',
  },
  {
    name: 'Final Delivery',
    order: 6,
    description: 'Deliver final conceptual plans and renderings',
    estimatedDays: 1,
    optional: false,
    category: 'delivery',
  },
];

// ============================================================================
// TIER 2: THE BUILDER (Low-Touch, Designer Checkpoints)
// Milestones: Intake → Kickoff Call → Draft → Review → Revisions → Final
// ============================================================================

const TIER_2_MILESTONES: MilestoneTemplate[] = [
  {
    name: 'Project Intake',
    order: 1,
    description: 'Review intake form and project requirements',
    estimatedDays: 1,
    optional: false,
    category: 'intake',
  },
  {
    name: 'Asset Review',
    order: 2,
    description: 'Review existing survey and/or drawings',
    estimatedDays: 2,
    optional: false,
    category: 'intake',
  },
  {
    name: 'Designer Kickoff Call',
    order: 3,
    description: 'Video call with designer to discuss project vision and requirements',
    estimatedDays: 3,
    optional: false,
    category: 'intake',
  },
  {
    name: 'Initial Draft',
    order: 4,
    description: 'Create detailed floor plans and 3D renderings',
    estimatedDays: 10,
    optional: false,
    category: 'design',
  },
  {
    name: 'Mid-Project Check-in',
    order: 5,
    description: 'Designer check-in to review progress and gather feedback',
    estimatedDays: 2,
    optional: false,
    category: 'review',
  },
  {
    name: 'Client Review - Round 1',
    order: 6,
    description: 'Client reviews initial designs and provides feedback',
    estimatedDays: 5,
    optional: false,
    category: 'review',
  },
  {
    name: 'Revisions - Round 1',
    order: 7,
    description: 'Apply first round of client feedback',
    estimatedDays: 5,
    optional: false,
    category: 'design',
  },
  {
    name: 'Client Review - Round 2',
    order: 8,
    description: 'Client reviews revised designs',
    estimatedDays: 3,
    optional: false,
    category: 'review',
  },
  {
    name: 'Revisions - Round 2',
    order: 9,
    description: 'Apply second round of client feedback (if needed)',
    estimatedDays: 3,
    optional: true,
    category: 'design',
  },
  {
    name: 'Final Delivery',
    order: 10,
    description: 'Deliver final detailed plans and renderings',
    estimatedDays: 1,
    optional: false,
    category: 'delivery',
  },
];

// ============================================================================
// TIER 3: THE CONCIERGE (Site Visits + 3D Scan)
// Milestones: Intake → Site Visit → Survey → Draft → Collaboration → Reviews → Final
// ============================================================================

const TIER_3_MILESTONES: MilestoneTemplate[] = [
  {
    name: 'Project Intake',
    order: 1,
    description: 'Review intake form and project requirements',
    estimatedDays: 1,
    optional: false,
    category: 'intake',
  },
  {
    name: 'Site Visit Scheduling',
    order: 2,
    description: 'Schedule and coordinate site visit with client',
    estimatedDays: 5,
    optional: false,
    category: 'intake',
  },
  {
    name: 'Site Survey & 3D Scan',
    order: 3,
    description: 'Conduct site visit, take measurements, and perform 3D scan',
    estimatedDays: 2,
    optional: false,
    category: 'intake',
  },
  {
    name: 'Survey Processing',
    order: 4,
    description: 'Process site data and create base drawings',
    estimatedDays: 5,
    optional: false,
    category: 'design',
  },
  {
    name: 'Designer Collaboration Session 1',
    order: 5,
    description: 'In-depth design session to develop initial concepts',
    estimatedDays: 3,
    optional: false,
    category: 'design',
  },
  {
    name: 'Initial Concept',
    order: 6,
    description: 'Create comprehensive floor plans and premium 3D renderings',
    estimatedDays: 12,
    optional: false,
    category: 'design',
  },
  {
    name: 'Client Review - Round 1',
    order: 7,
    description: 'Detailed client review and feedback session',
    estimatedDays: 5,
    optional: false,
    category: 'review',
  },
  {
    name: 'Revisions - Round 1',
    order: 8,
    description: 'Apply first round of comprehensive feedback',
    estimatedDays: 7,
    optional: false,
    category: 'design',
  },
  {
    name: 'Designer Collaboration Session 2',
    order: 9,
    description: 'Follow-up design session to refine direction',
    estimatedDays: 2,
    optional: false,
    category: 'design',
  },
  {
    name: 'Client Review - Round 2',
    order: 10,
    description: 'Second round of client review',
    estimatedDays: 4,
    optional: false,
    category: 'review',
  },
  {
    name: 'Revisions - Round 2',
    order: 11,
    description: 'Apply second round of feedback',
    estimatedDays: 5,
    optional: false,
    category: 'design',
  },
  {
    name: 'Client Review - Round 3',
    order: 12,
    description: 'Final review before completion',
    estimatedDays: 3,
    optional: false,
    category: 'review',
  },
  {
    name: 'Revisions - Round 3',
    order: 13,
    description: 'Final adjustments (if needed)',
    estimatedDays: 3,
    optional: true,
    category: 'design',
  },
  {
    name: 'Contractor Coordination',
    order: 14,
    description: 'Prepare drawings for contractor handoff and coordinate requirements',
    estimatedDays: 5,
    optional: false,
    category: 'delivery',
  },
  {
    name: 'Final Delivery',
    order: 15,
    description: 'Deliver complete design package with contractor-ready documents',
    estimatedDays: 1,
    optional: false,
    category: 'delivery',
  },
];

// ============================================================================
// TIER 4: KAA WHITE GLOVE (High-Touch, Full Service)
// Milestones: Custom project structure with multiple phases
// ============================================================================

const TIER_4_MILESTONES: MilestoneTemplate[] = [
  {
    name: 'Project Initiation',
    order: 1,
    description: 'Dedicated team assignment and project kickoff meeting',
    estimatedDays: 3,
    optional: false,
    category: 'intake',
  },
  {
    name: 'Property Assessment',
    order: 2,
    description: 'Comprehensive property assessment with multiple site visits',
    estimatedDays: 7,
    optional: false,
    category: 'intake',
  },
  {
    name: 'Vision & Discovery',
    order: 3,
    description: 'In-depth discovery sessions to understand lifestyle and design preferences',
    estimatedDays: 7,
    optional: false,
    category: 'intake',
  },
  {
    name: 'Conceptual Design Phase',
    order: 4,
    description: 'Development of multiple conceptual directions',
    estimatedDays: 14,
    optional: false,
    category: 'design',
  },
  {
    name: 'Concept Presentation',
    order: 5,
    description: 'Formal presentation of design concepts',
    estimatedDays: 3,
    optional: false,
    category: 'review',
  },
  {
    name: 'Design Development',
    order: 6,
    description: 'Detailed development of selected concept',
    estimatedDays: 21,
    optional: false,
    category: 'design',
  },
  {
    name: 'Collaborative Review Sessions',
    order: 7,
    description: 'Ongoing collaborative sessions with unlimited revisions',
    estimatedDays: null, // Variable - ongoing
    optional: false,
    category: 'review',
  },
  {
    name: 'Contractor Selection Support',
    order: 8,
    description: 'Assist in evaluating and selecting contractors',
    estimatedDays: 14,
    optional: false,
    category: 'delivery',
  },
  {
    name: 'Construction Documents',
    order: 9,
    description: 'Prepare detailed construction documents and specifications',
    estimatedDays: 21,
    optional: false,
    category: 'design',
  },
  {
    name: 'Bid Management',
    order: 10,
    description: 'Manage contractor bidding process',
    estimatedDays: 14,
    optional: true,
    category: 'delivery',
  },
  {
    name: 'Construction Oversight',
    order: 11,
    description: 'Provide ongoing construction oversight and quality control',
    estimatedDays: null, // Variable - throughout construction
    optional: false,
    category: 'delivery',
  },
  {
    name: 'Project Completion',
    order: 12,
    description: 'Final walkthrough and project handoff',
    estimatedDays: 3,
    optional: false,
    category: 'delivery',
  },
];

// ============================================================================
// TIER CONFIGURATIONS
// ============================================================================

export const TIER_MILESTONE_CONFIGS: Record<TierId, TierMilestoneConfig> = {
  1: {
    tier: 1,
    tierName: 'The Concept',
    milestones: TIER_1_MILESTONES,
    estimatedDurationWeeks: { min: 2, max: 4 },
    revisionRounds: 1,
    includesSiteVisit: false,
  },
  2: {
    tier: 2,
    tierName: 'The Builder',
    milestones: TIER_2_MILESTONES,
    estimatedDurationWeeks: { min: 4, max: 8 },
    revisionRounds: 2,
    includesSiteVisit: false,
  },
  3: {
    tier: 3,
    tierName: 'The Concierge',
    milestones: TIER_3_MILESTONES,
    estimatedDurationWeeks: { min: 8, max: 12 },
    revisionRounds: 3,
    includesSiteVisit: true,
  },
  4: {
    tier: 4,
    tierName: 'KAA White Glove',
    milestones: TIER_4_MILESTONES,
    estimatedDurationWeeks: { min: 12, max: null }, // Variable based on project
    revisionRounds: -1, // Unlimited
    includesSiteVisit: true,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get milestone templates for a specific tier
 */
export function getMilestoneTemplates(tier: TierId): MilestoneTemplate[] {
  const config = TIER_MILESTONE_CONFIGS[tier];
  if (!config) {
    throw new Error(`Invalid tier: ${tier}`);
  }
  return config.milestones;
}

/**
 * Get tier configuration by ID
 */
export function getTierConfig(tier: TierId): TierMilestoneConfig {
  const config = TIER_MILESTONE_CONFIGS[tier];
  if (!config) {
    throw new Error(`Invalid tier: ${tier}`);
  }
  return config;
}

/**
 * Get all required (non-optional) milestones for a tier
 */
export function getRequiredMilestones(tier: TierId): MilestoneTemplate[] {
  return getMilestoneTemplates(tier).filter((m) => !m.optional);
}

/**
 * Calculate estimated due date for a milestone based on project start date
 * @param startDate Project start date
 * @param milestones Array of milestones up to and including the target
 * @returns Estimated due date or null if duration is variable
 */
export function calculateMilestoneDueDate(
  startDate: Date,
  milestones: MilestoneTemplate[]
): Date | null {
  let totalDays = 0;

  for (const milestone of milestones) {
    if (milestone.estimatedDays === null) {
      return null; // Cannot calculate if any milestone has variable duration
    }
    totalDays += milestone.estimatedDays;
  }

  const dueDate = new Date(startDate);
  dueDate.setDate(dueDate.getDate() + totalDays);
  return dueDate;
}

/**
 * Generate milestone due dates for a project
 * @param tier Project tier
 * @param startDate Project start date
 * @returns Array of milestones with calculated due dates
 */
export function generateMilestoneDueDates(
  tier: TierId,
  startDate: Date
): Array<MilestoneTemplate & { dueDate: Date | null }> {
  const templates = getMilestoneTemplates(tier);
  let cumulativeDays = 0;

  return templates.map((template) => {
    if (template.estimatedDays !== null) {
      cumulativeDays += template.estimatedDays;
    }

    const dueDate =
      template.estimatedDays !== null
        ? (() => {
            const date = new Date(startDate);
            date.setDate(date.getDate() + cumulativeDays);
            return date;
          })()
        : null;

    return {
      ...template,
      dueDate,
    };
  });
}

/**
 * Get estimated project completion date
 * @param tier Project tier
 * @param startDate Project start date
 * @returns Estimated completion date or null if variable
 */
export function getEstimatedCompletionDate(tier: TierId, startDate: Date): Date | null {
  const templates = getMilestoneTemplates(tier);
  let totalDays = 0;

  for (const template of templates) {
    if (template.estimatedDays === null) {
      return null;
    }
    totalDays += template.estimatedDays;
  }

  const completionDate = new Date(startDate);
  completionDate.setDate(completionDate.getDate() + totalDays);
  return completionDate;
}

/**
 * Validate tier ID
 */
export function isValidTier(tier: number): tier is TierId {
  return tier >= 1 && tier <= 4 && Number.isInteger(tier);
}
