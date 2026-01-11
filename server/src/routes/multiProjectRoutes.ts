/**
 * Multi-Project Routes
 * API endpoints for project limits, archiving, and project switching
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import * as multiProjectService from '../services/multiProjectService';
import { PrismaClient } from '@prisma/client';
import { sanitizeInput, validateBody, validateParams } from '../middleware';

const router = Router();
const prisma = new PrismaClient();
router.use(sanitizeInput);

const projectIdParamsSchema = z.object({
  id: z.string().uuid('Invalid project ID format'),
});

const clientIdParamsSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
});

const emptyBodySchema = z.object({}).optional();

const projectLimitSchema = z.object({
  maxProjects: z.coerce.number().int().min(1, 'maxProjects must be at least 1'),
});

// ============================================
// PROJECT LIMIT ROUTES
// ============================================

/**
 * GET /api/projects/limits
 * Get project limit info for current user
 */
router.get('/limits', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get client
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const canCreate = await multiProjectService.canCreateProject(client.id);
    res.json(canCreate);
  } catch (error) {
    console.error('Error checking project limits:', error);
    res.status(500).json({ error: 'Failed to check project limits' });
  }
});

/**
 * GET /api/projects/summary
 * Get project summary for dashboard
 */
router.get('/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const summary = await multiProjectService.getProjectSummary(user.id);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching project summary:', error);
    res.status(500).json({ error: 'Failed to fetch project summary' });
  }
});

// ============================================
// ACTIVE PROJECTS ROUTES
// ============================================

/**
 * GET /api/projects/active
 * Get all active projects for project switcher
 */
router.get('/active', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const projects = await multiProjectService.getActiveProjects(user.id);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching active projects:', error);
    res.status(500).json({ error: 'Failed to fetch active projects' });
  }
});

// ============================================
// ARCHIVE ROUTES
// ============================================

/**
 * GET /api/projects/archived
 * Get archived projects for current user
 */
router.get('/archived', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get client
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const { page, limit } = req.query;

    const archived = await multiProjectService.getArchivedProjects(client.id, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(archived);
  } catch (error) {
    console.error('Error fetching archived projects:', error);
    res.status(500).json({ error: 'Failed to fetch archived projects' });
  }
});

/**
 * POST /api/projects/:id/archive
 * Archive a project
 */
router.post(
  '/:id/archive',
  requireAuth,
  validateParams(projectIdParamsSchema),
  validateBody(emptyBodySchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const project = await multiProjectService.archiveProject(id, user.id);
    res.json(project);
  } catch (error: any) {
    console.error('Error archiving project:', error);
    res.status(400).json({ error: error.message || 'Failed to archive project' });
  }
  }
);

/**
 * POST /api/projects/:id/restore
 * Restore an archived project
 */
router.post(
  '/:id/restore',
  requireAuth,
  validateParams(projectIdParamsSchema),
  validateBody(emptyBodySchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const project = await multiProjectService.restoreProject(id, user.id);
    res.json(project);
  } catch (error: any) {
    console.error('Error restoring project:', error);
    res.status(400).json({ error: error.message || 'Failed to restore project' });
  }
  }
);

// ============================================
// TIER LIMITS CONFIGURATION
// ============================================

/**
 * GET /api/projects/tier-limits
 * Get project limits for all tiers
 */
router.get('/tier-limits', async (req: Request, res: Response) => {
  try {
    res.json(multiProjectService.TIER_PROJECT_LIMITS);
  } catch (error) {
    console.error('Error fetching tier limits:', error);
    res.status(500).json({ error: 'Failed to fetch tier limits' });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * PUT /api/projects/admin/:clientId/limit
 * Set project limit for a client (admin only)
 */
router.put(
  '/admin/:clientId/limit',
  requireAuth,
  validateParams(clientIdParamsSchema),
  validateBody(projectLimitSchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { clientId } = req.params;
    const { maxProjects } = (req as any).validatedBody as z.infer<typeof projectLimitSchema>;

    await multiProjectService.setClientProjectLimit(clientId, maxProjects);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error setting project limit:', error);
    res.status(400).json({ error: error.message || 'Failed to set project limit' });
  }
  }
);

/**
 * POST /api/projects/admin/:id/force-archive
 * Force archive a project (admin only)
 */
router.post(
  '/admin/:id/force-archive',
  requireAuth,
  validateParams(projectIdParamsSchema),
  validateBody(emptyBodySchema),
  async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const project = await multiProjectService.forceArchiveProject(id);
    res.json(project);
  } catch (error: any) {
    console.error('Error force archiving project:', error);
    res.status(400).json({ error: error.message || 'Failed to force archive project' });
  }
  }
);

/**
 * GET /api/projects/admin/nearing-archive
 * Get projects nearing auto-archive (admin only)
 */
router.get('/admin/nearing-archive', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const projects = await multiProjectService.getProjectsNearingArchive();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects nearing archive:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

export default router;
