/**
 * Services Index
 * Central export point for all backend services.
 */

// Project Service - handles project creation with tier-specific milestones
export {
  ProjectService,
  createProjectService,
  // Types
  type CreateProjectInput,
  type CreateProjectResult,
  type ProjectWithDetails,
  type DatabaseAdapter,
  // Status enums
  ProjectStatus,
  MilestoneStatus,
  LeadStatus,
  ClientStatus,
  PaymentStatus,
} from './projectService';

// Prisma Database Adapter - Prisma implementation of DatabaseAdapter
export { PrismaDatabaseAdapter, createPrismaAdapter } from './prismaAdapter';

// Milestone Templates - tier-specific milestone definitions
export {
  type TierId,
  type MilestoneTemplate,
  type TierMilestoneConfig,
  getMilestoneTemplates,
  getTierConfig,
  getRequiredMilestones,
  generateMilestoneDueDates,
  getEstimatedCompletionDate,
  isValidTier,
  TIER_MILESTONE_CONFIGS,
} from './milestoneTemplates';
