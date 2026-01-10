import { prisma } from '../utils/prisma';
import { syncProjectToNotion } from './notionProjectSync';
import { syncMilestoneToNotion } from './notionMilestoneSync';
import { syncDeliverableToNotion } from './notionDeliverableSync';
import { syncLeadToNotion } from './notionLeadSync';

/**
 * Notion Sync Queue Service
 *
 * Queue-based sync with rate limiting, retry logic, and status tracking.
 * Handles syncing projects, milestones, deliverables, and leads to Notion.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export type SyncEntityType = 'PROJECT' | 'MILESTONE' | 'DELIVERABLE' | 'LEAD';
export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING';

export interface SyncJob {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  status: SyncStatus;
  priority: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  notionPageId?: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
}

export interface QueueOptions {
  maxConcurrent?: number;
  rateLimitPerSecond?: number;
  defaultMaxRetries?: number;
  retryDelayMs?: number;
}

export interface SyncResult {
  success: boolean;
  notionPageId?: string;
  error?: string;
}

// ============================================
// RATE LIMITER
// ============================================

class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;

  constructor(tokensPerSecond: number) {
    this.maxTokens = tokensPerSecond;
    this.tokens = tokensPerSecond;
    this.refillRate = tokensPerSecond;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait for a token to become available
    const waitTime = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
    await this.sleep(waitTime);
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// SYNC QUEUE
// ============================================

class NotionSyncQueue {
  private queue: SyncJob[] = [];
  private processing = false;
  private rateLimiter: RateLimiter;
  private options: Required<QueueOptions>;

  constructor(options: QueueOptions = {}) {
    this.options = {
      maxConcurrent: options.maxConcurrent ?? 3,
      rateLimitPerSecond: options.rateLimitPerSecond ?? 3, // Notion's rate limit is 3 req/sec
      defaultMaxRetries: options.defaultMaxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
    };
    this.rateLimiter = new RateLimiter(this.options.rateLimitPerSecond);
  }

  /**
   * Add a sync job to the queue
   */
  async enqueue(
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperation,
    payload?: Record<string, unknown>,
    priority: number = 5
  ): Promise<SyncJob> {
    const job: SyncJob = {
      id: this.generateId(),
      entityType,
      entityId,
      operation,
      status: 'PENDING',
      priority,
      retryCount: 0,
      maxRetries: this.options.defaultMaxRetries,
      payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert in priority order (lower number = higher priority)
    const insertIndex = this.queue.findIndex((j) => j.priority > priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    // Save to database for persistence
    await this.persistJob(job);

    // Start processing if not already
    if (!this.processing) {
      this.processQueue();
    }

    return job;
  }

  /**
   * Start processing the queue
   */
  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        // Get jobs ready for processing
        const readyJobs = this.queue.filter(
          (job) =>
            job.status === 'PENDING' &&
            (!job.scheduledFor || job.scheduledFor <= new Date())
        );

        if (readyJobs.length === 0) {
          // Check for scheduled jobs
          const nextScheduled = this.queue
            .filter((j) => j.scheduledFor)
            .sort((a, b) => (a.scheduledFor!.getTime() - b.scheduledFor!.getTime()))[0];

          if (nextScheduled) {
            const waitTime = nextScheduled.scheduledFor!.getTime() - Date.now();
            if (waitTime > 0) {
              await this.sleep(Math.min(waitTime, 1000));
              continue;
            }
          } else {
            break;
          }
        }

        // Process batch
        const batch = readyJobs.slice(0, this.options.maxConcurrent);
        await Promise.all(batch.map((job) => this.processJob(job)));
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: SyncJob): Promise<void> {
    job.status = 'PROCESSING';
    job.updatedAt = new Date();
    await this.updateJobStatus(job);

    try {
      // Rate limit before making API call
      await this.rateLimiter.acquire();

      // Execute the sync operation
      const result = await this.executeSync(job);

      if (result.success) {
        job.status = 'COMPLETED';
        job.notionPageId = result.notionPageId;
        this.removeFromQueue(job.id);
      } else {
        throw new Error(result.error || 'Unknown sync error');
      }
    } catch (error) {
      job.lastError = error instanceof Error ? error.message : String(error);
      job.retryCount += 1;

      if (job.retryCount >= job.maxRetries) {
        job.status = 'FAILED';
        this.removeFromQueue(job.id);
      } else {
        job.status = 'RETRYING';
        // Exponential backoff
        const delay = this.options.retryDelayMs * Math.pow(2, job.retryCount - 1);
        job.scheduledFor = new Date(Date.now() + delay);
        job.status = 'PENDING';
      }
    }

    job.updatedAt = new Date();
    await this.updateJobStatus(job);
  }

  /**
   * Execute the actual sync operation
   */
  private async executeSync(job: SyncJob): Promise<SyncResult> {
    switch (job.entityType) {
      case 'PROJECT':
        return this.syncProject(job);
      case 'MILESTONE':
        return this.syncMilestone(job);
      case 'DELIVERABLE':
        return this.syncDeliverable(job);
      case 'LEAD':
        return this.syncLead(job);
      default:
        return { success: false, error: `Unknown entity type: ${job.entityType}` };
    }
  }

  /**
   * Sync a project to Notion
   */
  private async syncProject(job: SyncJob): Promise<SyncResult> {
    const project = await prisma.project.findUnique({
      where: { id: job.entityId },
      include: {
        client: {
          include: {
            user: true,
          },
        },
        milestones: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    try {
      const notionPageId = await this.createOrUpdateNotionProject(project, job.operation);

      // Update project with notion page ID
      if (notionPageId) {
        await prisma.project.update({
          where: { id: job.entityId },
          data: {
            notionPageId,
            lastSyncedAt: new Date(),
            syncStatus: 'SYNCED',
          },
        });
      }

      return { success: true, notionPageId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync project',
      };
    }
  }

  /**
   * Sync a milestone to Notion
   */
  private async syncMilestone(job: SyncJob): Promise<SyncResult> {
    const milestone = await prisma.milestone.findUnique({
      where: { id: job.entityId },
      include: {
        project: true,
      },
    });

    if (!milestone) {
      return { success: false, error: 'Milestone not found' };
    }

    try {
      const notionBlockId = await this.updateNotionMilestone(milestone, job.operation);

      // Update milestone sync status
      await prisma.milestone.update({
        where: { id: job.entityId },
        data: {
          lastSyncedAt: new Date(),
          syncStatus: 'SYNCED',
        },
      });

      return { success: true, notionPageId: notionBlockId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync milestone',
      };
    }
  }

  /**
   * Sync a deliverable to Notion
   */
  private async syncDeliverable(job: SyncJob): Promise<SyncResult> {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: job.entityId },
      include: {
        project: true,
      },
    });

    if (!deliverable) {
      return { success: false, error: 'Deliverable not found' };
    }

    try {
      const notionPageId = await this.createOrUpdateNotionDeliverable(deliverable, job.operation);

      // Update deliverable with notion page ID
      await prisma.deliverable.update({
        where: { id: job.entityId },
        data: {
          notionPageId,
          lastSyncedAt: new Date(),
          syncStatus: 'SYNCED',
        },
      });

      return { success: true, notionPageId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync deliverable',
      };
    }
  }

  /**
   * Sync a lead to Notion (CRM)
   */
  private async syncLead(job: SyncJob): Promise<SyncResult> {
    const lead = await prisma.lead.findUnique({
      where: { id: job.entityId },
    });

    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }

    try {
      const notionPageId = await this.createOrUpdateNotionLead(lead, job.operation);

      // Update lead with notion page ID
      await prisma.lead.update({
        where: { id: job.entityId },
        data: {
          notionPageId,
          lastSyncedAt: new Date(),
          syncStatus: 'SYNCED',
        },
      });

      return { success: true, notionPageId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync lead',
      };
    }
  }

  // ============================================
  // NOTION API OPERATIONS (Stub implementations)
  // ============================================
  // These will be implemented when Notion SDK is integrated

  private async createOrUpdateNotionProject(
    project: any,
    operation: SyncOperation
  ): Promise<string | undefined> {
    // Use the actual Notion sync implementation
    return syncProjectToNotion(project.id, operation);
  }

  private async updateNotionMilestone(
    milestone: any,
    operation: SyncOperation
  ): Promise<string | undefined> {
    // Use the actual Notion sync implementation
    return syncMilestoneToNotion(milestone.id, operation);
  }

  private async createOrUpdateNotionDeliverable(
    deliverable: any,
    operation: SyncOperation
  ): Promise<string | undefined> {
    // Use the actual Notion sync implementation
    return syncDeliverableToNotion(deliverable.id, operation);
  }

  private async createOrUpdateNotionLead(
    lead: any,
    operation: SyncOperation
  ): Promise<string | undefined> {
    // Use the actual Notion sync implementation
    return syncLeadToNotion(lead.id, operation);
  }

  // ============================================
  // PERSISTENCE & HELPERS
  // ============================================

  private async persistJob(job: SyncJob): Promise<void> {
    // Store job in sync_jobs table for durability
    try {
      await prisma.syncJob.create({
        data: {
          id: job.id,
          entityType: job.entityType,
          entityId: job.entityId,
          operation: job.operation,
          status: job.status,
          priority: job.priority,
          retryCount: job.retryCount,
          maxRetries: job.maxRetries,
          payload: job.payload as any,
          scheduledFor: job.scheduledFor,
        },
      });
    } catch (error) {
      // Table might not exist yet - log and continue
      console.warn('[NotionSync] Could not persist job:', error);
    }
  }

  private async updateJobStatus(job: SyncJob): Promise<void> {
    try {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: job.status,
          retryCount: job.retryCount,
          lastError: job.lastError,
          notionPageId: job.notionPageId,
          scheduledFor: job.scheduledFor,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      // Table might not exist yet - log and continue
      console.warn('[NotionSync] Could not update job status:', error);
    }
  }

  private removeFromQueue(jobId: string): void {
    const index = this.queue.findIndex((j) => j.id === jobId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  private generateId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Get queue status
   */
  getStatus(): {
    queueLength: number;
    processing: boolean;
    jobs: SyncJob[];
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      jobs: [...this.queue],
    };
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): SyncJob | undefined {
    return this.queue.find((j) => j.id === jobId);
  }

  /**
   * Cancel a pending job
   */
  cancelJob(jobId: string): boolean {
    const index = this.queue.findIndex(
      (j) => j.id === jobId && j.status === 'PENDING'
    );

    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const job = this.queue.find((j) => j.id === jobId && j.status === 'FAILED');

    if (job) {
      job.status = 'PENDING';
      job.retryCount = 0;
      job.lastError = undefined;
      job.scheduledFor = undefined;
      job.updatedAt = new Date();

      await this.updateJobStatus(job);

      if (!this.processing) {
        this.processQueue();
      }

      return true;
    }

    return false;
  }

  /**
   * Load pending jobs from database on startup
   */
  async loadPendingJobs(): Promise<number> {
    try {
      const pendingJobs = await prisma.syncJob.findMany({
        where: {
          status: { in: ['PENDING', 'RETRYING'] },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      });

      for (const dbJob of pendingJobs) {
        const job: SyncJob = {
          id: dbJob.id,
          entityType: dbJob.entityType as SyncEntityType,
          entityId: dbJob.entityId,
          operation: dbJob.operation as SyncOperation,
          status: dbJob.status as SyncStatus,
          priority: dbJob.priority,
          retryCount: dbJob.retryCount,
          maxRetries: dbJob.maxRetries,
          lastError: dbJob.lastError || undefined,
          notionPageId: dbJob.notionPageId || undefined,
          payload: dbJob.payload as Record<string, unknown> | undefined,
          createdAt: dbJob.createdAt,
          updatedAt: dbJob.updatedAt,
          scheduledFor: dbJob.scheduledFor || undefined,
        };

        this.queue.push(job);
      }

      // Start processing if there are jobs
      if (this.queue.length > 0 && !this.processing) {
        this.processQueue();
      }

      return pendingJobs.length;
    } catch (error) {
      console.warn('[NotionSync] Could not load pending jobs:', error);
      return 0;
    }
  }

  /**
   * Clear completed jobs older than specified days
   */
  async cleanupOldJobs(daysOld: number = 7): Promise<number> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysOld);

      const result = await prisma.syncJob.deleteMany({
        where: {
          status: 'COMPLETED',
          updatedAt: { lt: cutoff },
        },
      });

      return result.count;
    } catch (error) {
      console.warn('[NotionSync] Could not cleanup old jobs:', error);
      return 0;
    }
  }
}

// ============================================
// SINGLETON INSTANCE & HELPERS
// ============================================

// Create singleton instance
const notionSyncQueue = new NotionSyncQueue();

/**
 * Queue a project for sync
 */
export async function queueProjectSync(
  projectId: string,
  operation: SyncOperation = 'UPDATE'
): Promise<SyncJob> {
  return notionSyncQueue.enqueue('PROJECT', projectId, operation, undefined, 3);
}

/**
 * Queue a milestone for sync
 */
export async function queueMilestoneSync(
  milestoneId: string,
  operation: SyncOperation = 'UPDATE'
): Promise<SyncJob> {
  return notionSyncQueue.enqueue('MILESTONE', milestoneId, operation, undefined, 4);
}

/**
 * Queue a deliverable for sync
 */
export async function queueDeliverableSync(
  deliverableId: string,
  operation: SyncOperation = 'CREATE'
): Promise<SyncJob> {
  return notionSyncQueue.enqueue('DELIVERABLE', deliverableId, operation, undefined, 5);
}

/**
 * Queue a lead for sync (CRM)
 */
export async function queueLeadSync(
  leadId: string,
  operation: SyncOperation = 'CREATE'
): Promise<SyncJob> {
  return notionSyncQueue.enqueue('LEAD', leadId, operation, undefined, 6);
}

/**
 * Get sync queue status
 */
export function getSyncQueueStatus() {
  return notionSyncQueue.getStatus();
}

/**
 * Initialize sync queue on app startup
 */
export async function initializeSyncQueue(): Promise<void> {
  const loaded = await notionSyncQueue.loadPendingJobs();
  console.log(`[NotionSync] Loaded ${loaded} pending jobs from database`);
}

/**
 * Cleanup old completed jobs
 */
export async function cleanupSyncJobs(daysOld?: number): Promise<number> {
  return notionSyncQueue.cleanupOldJobs(daysOld);
}

export { notionSyncQueue };
export default notionSyncQueue;
