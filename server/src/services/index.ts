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

// Notion Sync Queue - rate-limited queue for Notion API operations
export {
  NotionSyncQueue,
  getNotionSyncQueue,
  initNotionSync,
  type SyncOperation,
  type SyncEntityType,
  type SyncStatus,
  type SyncTask,
  type SyncResult,
  type QueueStats,
  type NotionSyncConfig,
} from './notionSyncQueue';

// Notion Sync Service - high-level sync operations
export {
  NotionSyncService,
  initNotionSyncService,
  getNotionSyncService,
  type ProjectSyncData,
  type MilestoneSyncData,
  type DeliverableSyncData,
  type SyncOptions,
} from './notionSync';
