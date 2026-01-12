/**
 * Notion Sync Routes
 * API endpoints for manual sync operations and status monitoring (JWT-authenticated).
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { PrismaClient, SyncStatus } from '@prisma/client';
import { getNotionSyncService, NotionSyncService } from '../services';
import { internalError } from '../utils/AppError';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware';

// ============================================================================
// TYPES
// ============================================================================

interface NotionRouterDependencies {
  prisma: PrismaClient;
}

interface NotionServiceRequest extends Request {
  notionSyncService?: NotionSyncService;
}

// Note: Express Request.user type is defined in ../middleware/auth.ts

// ============================================================================
// ROUTER
// ============================================================================

export function createNotionRouter({ prisma }: NotionRouterDependencies): Router {
  const router = Router();

  // Apply JWT auth to all routes - requireAuth validates token and attaches user
  const authMiddleware = requireAuth(prisma);

  // ============================================================================
  // GET /api/notion/status - Get sync status and statistics
  // ============================================================================
  router.get('/status', authMiddleware, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const syncService = (req as NotionServiceRequest).notionSyncService as NotionSyncService;

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
      return next(internalError('Failed to get sync status', error as Error));
    }
  });

  // ============================================================================
  // POST /api/notion/sync - Trigger sync for pending entities
  // ============================================================================
  router.post('/sync', authMiddleware, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as unknown as AuthenticatedRequest).user;
      const syncService = (req as NotionServiceRequest).notionSyncService as NotionSyncService;

      const results = await syncService.syncAllPending();

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user!.id,
          action: 'notion_sync_triggered',
          resourceType: 'notion_sync',
          details: JSON.stringify(results),
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
      return next(internalError('Failed to trigger sync', error as Error));
    }
  });

  // ============================================================================
  // POST /api/notion/retry - Retry failed syncs
  // ============================================================================
  router.post('/retry', authMiddleware, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as unknown as AuthenticatedRequest).user;
      const syncService = (req as NotionServiceRequest).notionSyncService as NotionSyncService;

      const count = await syncService.retryFailed();

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: user!.id,
          action: 'notion_retry_triggered',
          resourceType: 'notion_sync',
          details: JSON.stringify({ retriedCount: count }),
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
      return next(internalError('Failed to retry syncs', error as Error));
    }
  });

  // ============================================================================
  // POST /api/notion/sync/project/:id - Manually sync a specific project
  // ============================================================================
  router.post('/sync/project/:id', authMiddleware, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const user = (req as unknown as AuthenticatedRequest).user;

    try {
      const syncService = (req as NotionServiceRequest).notionSyncService as NotionSyncService;

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
          userId: user!.id,
          action: 'notion_project_sync',
          resourceType: 'project',
          resourceId: id,
          details: JSON.stringify({ taskId }),
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
      return next(internalError('Failed to sync project', error as Error));
    }
  });

  // ============================================================================
  // GET /api/notion/failed - Get list of failed syncs
  // ============================================================================
  router.get('/failed', authMiddleware, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
          projects: projects.map((p: typeof projects[number]) => ({
            type: 'project',
            ...p,
          })),
          milestones: milestones.map((m: typeof milestones[number]) => ({
            type: 'milestone',
            ...m,
          })),
          deliverables: deliverables.map((d: typeof deliverables[number]) => ({
            type: 'deliverable',
            ...d,
          })),
          total: projects.length + milestones.length + deliverables.length,
        },
      });
    } catch (error) {
      return next(internalError('Failed to get failed syncs', error as Error));
    }
  });

  return router;
}

export default createNotionRouter;
