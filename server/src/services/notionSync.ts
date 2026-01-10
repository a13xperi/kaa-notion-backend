/**
 * Notion Sync Service
 * High-level service for syncing entities to Notion.
 * Uses the NotionSyncQueue for rate-limited, retry-enabled operations.
 */

import type { PrismaClient, SyncStatus } from '@prisma/client';
import {
  NotionSyncQueue,
  SyncOperation,
  getNotionSyncQueue,
  initNotionSync,
  NotionSyncConfig,
} from './notionSyncQueue';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectSyncData {
  id: string;
  name: string;
  tier: number;
  status: string;
  notionPageId?: string | null;
  clientEmail?: string | null;
  projectAddress: string;
  createdAt: string | Date;
}

export interface MilestoneSyncData {
  id: string;
  projectId: string;
  projectNotionPageId?: string | null;
  name: string;
  order: number;
  status: string;
  dueDate?: string | Date | null;
  completedAt?: string | Date | null;
}

export interface DeliverableSyncData {
  id: string;
  projectId: string;
  projectNotionPageId?: string | null;
  name: string;
  category: string;
  fileUrl?: string | null;
  fileType: string;
  fileSize: number;
  description?: string | null;
}

export interface SyncOptions {
  priority?: number;
  immediate?: boolean;
}

// ============================================================================
// NOTION SYNC SERVICE
// ============================================================================

export class NotionSyncService {
  private queue: NotionSyncQueue;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient, queue?: NotionSyncQueue) {
    this.prisma = prisma;
    this.queue = queue || getNotionSyncQueue();
  }

  // ============================================================================
  // PROJECT SYNC
  // ============================================================================

  /**
   * Sync a project to Notion (create or update)
   */
  async syncProject(
    project: ProjectSyncData,
    operation: SyncOperation = 'CREATE',
    options: SyncOptions = {}
  ): Promise<string> {
    // Mark project as syncing in database
    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        syncStatus: 'SYNCING' as SyncStatus,
      },
    });

    // Enqueue the sync task
    const taskId = this.queue.enqueue({
      entityType: 'PROJECT',
      entityId: project.id,
      operation,
      priority: options.priority ?? 1,
      payload: {
        name: project.name,
        tier: project.tier,
        status: project.status,
        notionPageId: project.notionPageId,
        clientEmail: project.clientEmail,
        projectAddress: project.projectAddress,
        createdAt: project.createdAt instanceof Date
          ? project.createdAt.toISOString()
          : project.createdAt,
      },
      maxAttempts: 3,
    });

    // Set up completion handler
    this.watchTaskCompletion(taskId, project.id, 'PROJECT');

    return taskId;
  }

  /**
   * Sync a project when created
   */
  async onProjectCreated(project: ProjectSyncData): Promise<string> {
    return this.syncProject(project, 'CREATE', { priority: 1 });
  }

  /**
   * Sync a project when updated
   */
  async onProjectUpdated(project: ProjectSyncData): Promise<string> {
    if (!project.notionPageId) {
      // No Notion page yet, create it
      return this.syncProject(project, 'CREATE', { priority: 2 });
    }
    return this.syncProject(project, 'UPDATE', { priority: 2 });
  }

  /**
   * Archive a project in Notion when deleted
   */
  async onProjectDeleted(project: ProjectSyncData): Promise<string | null> {
    if (!project.notionPageId) {
      return null; // Nothing to delete
    }
    return this.syncProject(project, 'DELETE', { priority: 3 });
  }

  // ============================================================================
  // MILESTONE SYNC
  // ============================================================================

  /**
   * Sync a milestone to Notion
   */
  async syncMilestone(
    milestone: MilestoneSyncData,
    operation: SyncOperation = 'CREATE',
    options: SyncOptions = {}
  ): Promise<string | null> {
    // Can only sync if parent project has a Notion page
    if (!milestone.projectNotionPageId) {
      // Try to get project's Notion page ID
      const project = await this.prisma.project.findUnique({
        where: { id: milestone.projectId },
        select: { notionPageId: true },
      });

      if (!project?.notionPageId) {
        logger.debug(`Cannot sync milestone ${milestone.id}: project has no Notion page`);
        return null;
      }

      milestone.projectNotionPageId = project.notionPageId;
    }

    // Mark milestone as syncing
    await this.prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        syncStatus: 'SYNCING' as SyncStatus,
      },
    });

    const taskId = this.queue.enqueue({
      entityType: 'MILESTONE',
      entityId: milestone.id,
      operation,
      priority: options.priority ?? 2,
      payload: {
        projectNotionPageId: milestone.projectNotionPageId,
        name: milestone.name,
        order: milestone.order,
        status: milestone.status,
        dueDate: milestone.dueDate instanceof Date
          ? milestone.dueDate.toISOString()
          : milestone.dueDate,
        completedAt: milestone.completedAt instanceof Date
          ? milestone.completedAt.toISOString()
          : milestone.completedAt,
      },
      maxAttempts: 3,
    });

    this.watchTaskCompletion(taskId, milestone.id, 'MILESTONE');

    return taskId;
  }

  /**
   * Sync a milestone when status changes
   */
  async onMilestoneStatusChanged(milestone: MilestoneSyncData): Promise<string | null> {
    return this.syncMilestone(milestone, 'UPDATE', { priority: 2 });
  }

  /**
   * Sync all milestones for a project
   */
  async syncAllMilestones(projectId: string): Promise<string[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { milestones: true },
    });

    if (!project?.notionPageId) {
      logger.debug(`Cannot sync milestones: project ${projectId} has no Notion page`);
      return [];
    }

    const taskIds: string[] = [];

    for (const milestone of project.milestones) {
      const taskId = await this.syncMilestone({
        id: milestone.id,
        projectId: milestone.projectId,
        projectNotionPageId: project.notionPageId,
        name: milestone.name,
        order: milestone.order,
        status: milestone.status,
        dueDate: milestone.dueDate,
        completedAt: milestone.completedAt,
      }, 'CREATE', { priority: 3 });

      if (taskId) {
        taskIds.push(taskId);
      }
    }

    return taskIds;
  }

  // ============================================================================
  // DELIVERABLE SYNC
  // ============================================================================

  /**
   * Sync a deliverable to Notion
   */
  async syncDeliverable(
    deliverable: DeliverableSyncData,
    operation: SyncOperation = 'CREATE',
    options: SyncOptions = {}
  ): Promise<string | null> {
    // Can only sync if parent project has a Notion page
    if (!deliverable.projectNotionPageId) {
      const project = await this.prisma.project.findUnique({
        where: { id: deliverable.projectId },
        select: { notionPageId: true },
      });

      if (!project?.notionPageId) {
        logger.debug(`Cannot sync deliverable ${deliverable.id}: project has no Notion page`);
        return null;
      }

      deliverable.projectNotionPageId = project.notionPageId;
    }

    // Mark deliverable as syncing
    await this.prisma.deliverable.update({
      where: { id: deliverable.id },
      data: {
        syncStatus: 'SYNCING' as SyncStatus,
      },
    });

    const taskId = this.queue.enqueue({
      entityType: 'DELIVERABLE',
      entityId: deliverable.id,
      operation,
      priority: options.priority ?? 2,
      payload: {
        projectNotionPageId: deliverable.projectNotionPageId,
        name: deliverable.name,
        category: deliverable.category,
        fileUrl: deliverable.fileUrl,
        fileType: deliverable.fileType,
        fileSize: deliverable.fileSize,
        description: deliverable.description,
      },
      maxAttempts: 3,
    });

    this.watchTaskCompletion(taskId, deliverable.id, 'DELIVERABLE');

    return taskId;
  }

  /**
   * Sync a deliverable when uploaded
   */
  async onDeliverableUploaded(deliverable: DeliverableSyncData): Promise<string | null> {
    return this.syncDeliverable(deliverable, 'CREATE', { priority: 2 });
  }

  /**
   * Remove a deliverable from Notion when deleted
   */
  async onDeliverableDeleted(deliverable: DeliverableSyncData): Promise<string | null> {
    return this.syncDeliverable(deliverable, 'DELETE', { priority: 3 });
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Sync all pending entities
   */
  async syncAllPending(): Promise<{ projects: number; milestones: number; deliverables: number }> {
    const results = { projects: 0, milestones: 0, deliverables: 0 };

    // Sync pending projects
    const pendingProjects = await this.prisma.project.findMany({
      where: {
        syncStatus: 'PENDING' as SyncStatus,
        notionPageId: null,
      },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
    });

    for (const project of pendingProjects) {
      if (!project.client || !project.client.user) {
        logger.warn('Project missing client or user data', { projectId: project.id });
        continue;
      }
      await this.onProjectCreated({
        id: project.id,
        name: project.name,
        tier: project.tier,
        status: project.status,
        notionPageId: project.notionPageId,
        clientEmail: project.client.user.email || '',
        projectAddress: project.client.projectAddress,
        createdAt: project.createdAt,
      });
      results.projects++;
    }

    // Sync pending milestones (only if project has Notion page)
    const pendingMilestones = await this.prisma.milestone.findMany({
      where: {
        syncStatus: 'PENDING' as SyncStatus,
        project: {
          notionPageId: { not: null },
        },
      },
      include: {
        project: true,
      },
    });

    for (const milestone of pendingMilestones) {
      if (!milestone.project) {
        logger.warn('Milestone missing project data', { milestoneId: milestone.id });
        continue;
      }
      await this.syncMilestone({
        id: milestone.id,
        projectId: milestone.projectId,
        projectNotionPageId: milestone.project.notionPageId,
        name: milestone.name,
        order: milestone.order,
        status: milestone.status,
        dueDate: milestone.dueDate,
        completedAt: milestone.completedAt,
      });
      results.milestones++;
    }

    // Sync pending deliverables
    const pendingDeliverables = await this.prisma.deliverable.findMany({
      where: {
        syncStatus: 'PENDING' as SyncStatus,
        project: {
          notionPageId: { not: null },
        },
      },
      include: {
        project: true,
      },
    });

    for (const deliverable of pendingDeliverables) {
      await this.syncDeliverable({
        id: deliverable.id,
        projectId: deliverable.projectId,
        projectNotionPageId: deliverable.project.notionPageId,
        name: deliverable.name,
        category: deliverable.category,
        fileUrl: deliverable.fileUrl,
        fileType: deliverable.fileType,
        fileSize: deliverable.fileSize,
        description: deliverable.description,
      });
      results.deliverables++;
    }

    return results;
  }

  /**
   * Retry all failed syncs
   */
  async retryFailed(): Promise<number> {
    let count = 0;

    // Reset failed projects to pending
    const failedProjects = await this.prisma.project.updateMany({
      where: { syncStatus: 'FAILED' as SyncStatus },
      data: { syncStatus: 'PENDING' as SyncStatus },
    });
    count += failedProjects.count;

    // Reset failed milestones
    const failedMilestones = await this.prisma.milestone.updateMany({
      where: { syncStatus: 'FAILED' as SyncStatus },
      data: { syncStatus: 'PENDING' as SyncStatus },
    });
    count += failedMilestones.count;

    // Reset failed deliverables
    const failedDeliverables = await this.prisma.deliverable.updateMany({
      where: { syncStatus: 'FAILED' as SyncStatus },
      data: { syncStatus: 'PENDING' as SyncStatus },
    });
    count += failedDeliverables.count;

    // Trigger sync
    if (count > 0) {
      await this.syncAllPending();
    }

    return count;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Watch for task completion and update database
   */
  private watchTaskCompletion(
    taskId: string,
    entityId: string,
    entityType: 'PROJECT' | 'MILESTONE' | 'DELIVERABLE'
  ): void {
    const checkInterval = setInterval(async () => {
      const task = this.queue.getTask(taskId);

      if (!task) {
        clearInterval(checkInterval);
        return;
      }

      if (task.status === 'COMPLETED') {
        clearInterval(checkInterval);
        await this.markSynced(entityType, entityId, task.payload.notionPageId as string);
      } else if (task.status === 'FAILED') {
        clearInterval(checkInterval);
        await this.markFailed(entityType, entityId, task.lastError || 'Unknown error');
      }
    }, 1000);

    // Stop checking after 5 minutes
    setTimeout(() => clearInterval(checkInterval), 5 * 60 * 1000);
  }

  /**
   * Mark entity as synced in database
   */
  private async markSynced(
    entityType: 'PROJECT' | 'MILESTONE' | 'DELIVERABLE',
    entityId: string,
    notionPageId?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      syncStatus: 'SYNCED' as SyncStatus,
      lastSyncedAt: new Date(),
    };

    if (notionPageId && entityType === 'PROJECT') {
      updateData.notionPageId = notionPageId;
      updateData.syncError = null;
    }

    switch (entityType) {
      case 'PROJECT':
        await this.prisma.project.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
      case 'MILESTONE':
        await this.prisma.milestone.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
      case 'DELIVERABLE':
        await this.prisma.deliverable.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
    }
  }

  /**
   * Mark entity as failed in database
   */
  private async markFailed(
    entityType: 'PROJECT' | 'MILESTONE' | 'DELIVERABLE',
    entityId: string,
    error: string
  ): Promise<void> {
    switch (entityType) {
      case 'PROJECT':
        await this.prisma.project.update({
          where: { id: entityId },
          data: {
            syncStatus: 'FAILED' as SyncStatus,
            syncError: error,
          },
        });
        break;
      case 'MILESTONE':
        await this.prisma.milestone.update({
          where: { id: entityId },
          data: {
            syncStatus: 'FAILED' as SyncStatus,
          },
        });
        break;
      case 'DELIVERABLE':
        await this.prisma.deliverable.update({
          where: { id: entityId },
          data: {
            syncStatus: 'FAILED' as SyncStatus,
          },
        });
        break;
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    queue: ReturnType<NotionSyncQueue['getStats']>;
    database: {
      projects: { pending: number; syncing: number; synced: number; failed: number };
      milestones: { pending: number; syncing: number; synced: number; failed: number };
      deliverables: { pending: number; syncing: number; synced: number; failed: number };
    };
  }> {
    const [
      projectStats,
      milestoneStats,
      deliverableStats,
    ] = await Promise.all([
      this.prisma.project.groupBy({
        by: ['syncStatus'],
        _count: true,
      }),
      this.prisma.milestone.groupBy({
        by: ['syncStatus'],
        _count: true,
      }),
      this.prisma.deliverable.groupBy({
        by: ['syncStatus'],
        _count: true,
      }),
    ]);

    const mapStats = (stats: Array<{ syncStatus: string; _count: number }>) => {
      const result = { pending: 0, syncing: 0, synced: 0, failed: 0 };
      for (const stat of stats) {
        const key = stat.syncStatus.toLowerCase() as keyof typeof result;
        if (key in result) {
          result[key] = stat._count;
        }
      }
      return result;
    };

    return {
      queue: this.queue.getStats(),
      database: {
        projects: mapStats(projectStats as any),
        milestones: mapStats(milestoneStats as any),
        deliverables: mapStats(deliverableStats as any),
      },
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let syncServiceInstance: NotionSyncService | null = null;

/**
 * Initialize the Notion sync service
 */
export function initNotionSyncService(
  prisma: PrismaClient,
  config: NotionSyncConfig
): NotionSyncService {
  const queue = initNotionSync(config);
  syncServiceInstance = new NotionSyncService(prisma, queue);
  return syncServiceInstance;
}

/**
 * Get the Notion sync service instance
 */
export function getNotionSyncService(): NotionSyncService {
  if (!syncServiceInstance) {
    throw new Error('NotionSyncService not initialized. Call initNotionSyncService first.');
  }
  return syncServiceInstance;
}

export default NotionSyncService;
