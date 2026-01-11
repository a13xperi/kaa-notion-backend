/**
 * Notion Sync Routes
 * API endpoints for manual sync operations and status monitoring (JWT-authenticated).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { PrismaClient, SyncStatus } from '@prisma/client';
import { getNotionSyncService, NotionSyncService } from '../services';
import { internalError } from '../utils/AppError';
import { sanitizeInput, validateBody, validateParams } from '../middleware';

// ============================================================================
// TYPES
// ============================================================================

interface NotionRouterDependencies {
  prisma: PrismaClient;
}

interface NotionServiceRequest extends Request {
  notionSyncService?: NotionSyncService;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        userType: 'KAA_CLIENT' | 'SAGE_CLIENT' | 'TEAM' | 'ADMIN';
      };
    }
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Require admin or team access
 */
function requireAdmin(req: Request, res: Response, next: Function): void {
  // In production, this would verify JWT and check user type
  // For now, check for admin header (development only)
  const userId = req.headers['x-user-id'] as string;
  const userType = req.headers['x-user-type'] as string;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  const validAdminTypes = ['ADMIN', 'TEAM'];
  if (!validAdminTypes.includes(userType)) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
    return;
  }

  req.user = {
    id: userId,
    email: req.headers['x-user-email'] as string || '',
    userType: userType as 'ADMIN' | 'TEAM',
  };

  next();
}

// ============================================================================
// ROUTER
// ============================================================================

export function createNotionRouter({ prisma }: NotionRouterDependencies): Router {
  const router = Router();
  router.use(sanitizeInput);

  const emptyBodySchema = z.object({}).optional();
  const projectIdParamsSchema = z.object({
    id: z.string().uuid('Invalid project ID format'),
  });

  // ============================================================================
  // GET /api/notion/status - Get sync status and statistics
  // ============================================================================
  router.get('/status', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
  router.post(
    '/sync',
    requireAdmin,
    validateBody(emptyBodySchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const syncService = (req as NotionServiceRequest).notionSyncService as NotionSyncService;

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
        return next(internalError('Failed to trigger sync', error as Error));
      }
    }
  );

  // ============================================================================
  // POST /api/notion/retry - Retry failed syncs
  // ============================================================================
  router.post(
    '/retry',
    requireAdmin,
    validateBody(emptyBodySchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const syncService = (req as NotionServiceRequest).notionSyncService as NotionSyncService;

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
        return next(internalError('Failed to retry syncs', error as Error));
      }
    }
  );

  // ============================================================================
  // POST /api/notion/sync/project/:id - Manually sync a specific project
  // ============================================================================
  router.post(
    '/sync/project/:id',
    requireAdmin,
    validateParams(projectIdParamsSchema),
    validateBody(emptyBodySchema),
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;

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
        return next(internalError('Failed to sync project', error as Error));
      }
    }
  );

  // ============================================================================
  // GET /api/notion/failed - Get list of failed syncs
  // ============================================================================
  router.get('/failed', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
      return next(internalError('Failed to get failed syncs', error as Error));
    }
  });

  return router;
}

export default createNotionRouter;
