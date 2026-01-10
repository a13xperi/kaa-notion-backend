/**
 * Revision Request Routes
 *
 * POST /api/milestones/:milestoneId/revisions - Request a revision
 * GET /api/milestones/:milestoneId/revisions - Get revisions for a milestone
 * PATCH /api/revisions/:id - Update revision status
 * GET /api/projects/:projectId/revisions - Get all revisions for a project
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../config/logger';
import { notifyRevisionRequested, notifyRevisionCompleted } from '../services/notificationService';

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

// ========================================
// Validation Schemas
// ========================================

const createRevisionSchema = z.object({
  description: z.string().min(10, 'Please provide more detail about the revision needed').max(2000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  attachments: z.array(z.string().url()).optional(),
});

const updateRevisionSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']),
  response: z.string().max(2000).optional(),
});

// ========================================
// Milestone Revision Routes
// ========================================

/**
 * POST /api/milestones/:milestoneId/revisions
 *
 * Request a revision for a milestone.
 */
router.post('/milestones/:milestoneId/revisions', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { milestoneId } = req.params;

    // Get milestone with project info
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Milestone not found' },
      });
    }

    // Check access - only project owner can request revisions
    const isProjectOwner = milestone.project.client.userId === user.id;
    const isTeamOrAdmin = user.role === 'ADMIN' || user.role === 'TEAM';

    if (!isProjectOwner && !isTeamOrAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this milestone' },
      });
    }

    // Validate request body
    const validation = createRevisionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.issues[0].message,
        },
      });
    }

    const { description, priority, attachments } = validation.data;

    // Create revision request
    const revision = await prisma.revisionRequest.create({
      data: {
        milestoneId,
        requestedById: user.id,
        description,
        priority,
        attachments: attachments || [],
        status: 'PENDING',
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Update milestone status
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: 'REVISION_REQUESTED' },
    });

    // Notify team about revision request
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'TEAM'] } },
      select: { id: true },
    });

    for (const admin of admins) {
      await notifyRevisionRequested(
        admin.id,
        milestone.project.id,
        milestone.project.name,
        milestone.name
      );
    }

    logger.info('Revision requested', {
      revisionId: revision.id,
      milestoneId,
      requestedBy: user.id,
    });

    return res.status(201).json({
      success: true,
      data: revision,
    });
  } catch (error) {
    logger.error('Failed to create revision request', { milestoneId: req.params.milestoneId }, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create revision request' },
    });
  }
});

/**
 * GET /api/milestones/:milestoneId/revisions
 *
 * Get all revisions for a milestone.
 */
router.get('/milestones/:milestoneId/revisions', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { milestoneId } = req.params;

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: {
          include: { client: true },
        },
      },
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Milestone not found' },
      });
    }

    // Check access
    const isProjectOwner = milestone.project.client.userId === user.id;
    const isTeamOrAdmin = user.role === 'ADMIN' || user.role === 'TEAM';

    if (!isProjectOwner && !isTeamOrAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this milestone' },
      });
    }

    const revisions = await prisma.revisionRequest.findMany({
      where: { milestoneId },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: revisions,
    });
  } catch (error) {
    logger.error('Failed to get revisions', { milestoneId: req.params.milestoneId }, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch revisions' },
    });
  }
});

// ========================================
// Individual Revision Routes
// ========================================

/**
 * PATCH /api/revisions/:id
 *
 * Update revision status (team only).
 */
router.patch('/revisions/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Only team/admin can update revision status
    if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only team members can update revision status' },
      });
    }

    const { id } = req.params;

    const revision = await prisma.revisionRequest.findUnique({
      where: { id },
      include: {
        milestone: {
          include: {
            project: {
              include: { client: true },
            },
          },
        },
        requestedBy: true,
      },
    });

    if (!revision) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Revision request not found' },
      });
    }

    const validation = updateRevisionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.issues[0].message,
        },
      });
    }

    const { status, response } = validation.data;

    // Update revision
    const updatedRevision = await prisma.revisionRequest.update({
      where: { id },
      data: {
        status,
        response,
        resolvedAt: status === 'COMPLETED' || status === 'REJECTED' ? new Date() : null,
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Update milestone status based on revision outcome
    if (status === 'COMPLETED') {
      await prisma.milestone.update({
        where: { id: revision.milestoneId },
        data: { status: 'IN_PROGRESS' },
      });

      // Notify client that revision is complete
      await notifyRevisionCompleted(
        revision.milestone.project.client.userId,
        revision.milestone.project.id,
        revision.milestone.project.name,
        revision.milestone.name
      );
    } else if (status === 'IN_PROGRESS') {
      await prisma.milestone.update({
        where: { id: revision.milestoneId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    logger.info('Revision updated', {
      revisionId: id,
      status,
      updatedBy: user.id,
    });

    return res.json({
      success: true,
      data: updatedRevision,
    });
  } catch (error) {
    logger.error('Failed to update revision', { id: req.params.id }, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update revision' },
    });
  }
});

/**
 * GET /api/projects/:projectId/revisions
 *
 * Get all revisions for a project.
 */
router.get('/projects/:projectId/revisions', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Check access
    const isProjectOwner = project.client.userId === user.id;
    const isTeamOrAdmin = user.role === 'ADMIN' || user.role === 'TEAM';

    if (!isProjectOwner && !isTeamOrAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this project' },
      });
    }

    const revisions = await prisma.revisionRequest.findMany({
      where: {
        milestone: {
          projectId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: revisions,
    });
  } catch (error) {
    logger.error('Failed to get project revisions', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch revisions' },
    });
  }
});

export default router;
