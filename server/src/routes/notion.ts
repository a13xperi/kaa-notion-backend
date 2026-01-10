/**
 * Notion Sync Routes
 * API endpoints for manual sync operations and status monitoring (JWT-authenticated).
 */

import { Router, Request, Response } from 'express';
import type { PrismaClient, SyncStatus } from '@prisma/client';
import { getNotionSyncService, NotionSyncService } from '../services';
import { logger } from '../logger';
import { requireAdmin } from '../middleware';

// ============================================================================
// TYPES
// ============================================================================

interface NotionRouterDependencies {
  prisma: PrismaClient;
}

// ============================================================================
// ROUTER
// ============================================================================

export function createNotionRouter({ prisma }: NotionRouterDependencies): Router {
  const router = Router();

  // ============================================================================
  // GET /api/notion/status - Get sync status and statistics
  // ============================================================================
  router.get('/status', requireAdmin(), async (req: Request, res: Response) => {
    try {
      let syncService: NotionSyncService;
      try {
        syncService = getNotionSyncService();
      } catch {
        // Service not initialized
        return res.json({
          success: true,
          data: {
            initialized: false,
            message: 'Notion sync service not configured',
          },
        });
      }

      const stats = await syncService.getSyncStats();

      return res.json({
        success: true,
        data: {
          initialized: true,
          queue: stats.queue,
          database: stats.database,
          summary: {
            totalPending:
              stats.database.projects.pending +
              stats.database.milestones.pending +
              stats.database.deliverables.pending,
            totalSyncing:
              stats.database.projects.syncing +
              stats.database.milestones.syncing +
              stats.database.deliverables.syncing,
            totalSynced:
              stats.database.projects.synced +
              stats.database.milestones.synced +
              stats.database.deliverables.synced,
            totalFailed:
              stats.database.projects.failed +
              stats.database.milestones.failed +
              stats.database.deliverables.failed,
          },
        },
      });
    } catch (error) {
      logger.error('Error getting sync status', {
        error: (error as Error).message,
        correlationId: req.correlationId,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get sync status',
        },
      });
    }
  });

  // ============================================================================
  // POST /api/notion/sync - Trigger sync for pending entities
  // ============================================================================
  router.post('/sync', requireAdmin(), async (req: Request, res: Response) => {
    try {
      let syncService: NotionSyncService;
      try {
        syncService = getNotionSyncService();
      } catch {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Notion sync service not configured',
          },
        });
      }

      const results = await syncService.syncAllPending();

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'notion_sync_triggered',
          resourceType: 'notion_sync',
          details: results,
        },
      });

      return res.json({
        success: true,
        data: {
          message: 'Sync triggered for pending entities',
          queued: results,
        },
      });
    } catch (error) {
      logger.error('Error triggering sync', {
        error: (error as Error).message,
        correlationId: req.correlationId,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to trigger sync',
        },
      });
    }
  });

  // ============================================================================
  // POST /api/notion/retry - Retry failed syncs
  // ============================================================================
  router.post('/retry', requireAdmin(), async (req: Request, res: Response) => {
    try {
      let syncService: NotionSyncService;
      try {
        syncService = getNotionSyncService();
      } catch {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Notion sync service not configured',
          },
        });
      }

      const count = await syncService.retryFailed();

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'notion_retry_triggered',
          resourceType: 'notion_sync',
          details: { retriedCount: count },
        },
      });

      return res.json({
        success: true,
        data: {
          message: 'Retry triggered for failed syncs',
          retriedCount: count,
        },
      });
    } catch (error) {
      logger.error('Error retrying failed syncs', {
        error: (error as Error).message,
        correlationId: req.correlationId,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retry syncs',
        },
      });
    }
  });

  // ============================================================================
  // POST /api/notion/sync/project/:id - Manually sync a specific project
  // ============================================================================
  router.post('/sync/project/:id', requireAdmin(), async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
      let syncService: NotionSyncService;
      try {
        syncService = getNotionSyncService();
      } catch {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Notion sync service not configured',
          },
        });
      }

      // Get project with client info
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          client: {
            include: { user: true },
          },
        },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const taskId = await syncService.onProjectCreated({
        id: project.id,
        name: project.name,
        tier: project.tier,
        status: project.status,
        notionPageId: project.notionPageId,
        clientEmail: project.client.user.email,
        projectAddress: project.client.projectAddress,
        createdAt: project.createdAt,
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'notion_project_sync',
          resourceType: 'project',
          resourceId: id,
          details: { taskId },
        },
      });

      return res.json({
        success: true,
        data: {
          message: 'Project sync queued',
          taskId,
          projectId: id,
        },
      });
    } catch (error) {
      logger.error('Error syncing project', {
        error: (error as Error).message,
        correlationId: req.correlationId,
        projectId: id,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to sync project',
        },
      });
    }
  });

  // ============================================================================
  // GET /api/notion/failed - Get list of failed syncs
  // ============================================================================
  router.get('/failed', requireAdmin(), async (req: Request, res: Response) => {
    try {
      const [projects, milestones, deliverables] = await Promise.all([
        prisma.project.findMany({
          where: { syncStatus: 'FAILED' as SyncStatus },
          select: {
            id: true,
            name: true,
            syncError: true,
            updatedAt: true,
          },
        }),
        prisma.milestone.findMany({
          where: { syncStatus: 'FAILED' as SyncStatus },
          select: {
            id: true,
            name: true,
            projectId: true,
          },
        }),
        prisma.deliverable.findMany({
          where: { syncStatus: 'FAILED' as SyncStatus },
          select: {
            id: true,
            name: true,
            projectId: true,
          },
        }),
      ]);

      return res.json({
        success: true,
        data: {
          projects: projects.map((p) => ({
            type: 'project',
            ...p,
          })),
          milestones: milestones.map((m) => ({
            type: 'milestone',
            ...m,
          })),
          deliverables: deliverables.map((d) => ({
            type: 'deliverable',
            ...d,
          })),
          total: projects.length + milestones.length + deliverables.length,
        },
      });
    } catch (error) {
      logger.error('Error getting failed syncs', {
        error: (error as Error).message,
        correlationId: req.correlationId,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get failed syncs',
        },
      });
    }
  });

  return router;
}

export default createNotionRouter;
