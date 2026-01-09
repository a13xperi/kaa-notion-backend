import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { verifyToken } from '../utils/auth';
import { updateMilestoneStatus } from '../services/projectService';

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

/**
 * Middleware to verify JWT token and attach user to request
 */
async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided',
      },
    });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token, JWT_SECRET);

  if (!payload || typeof payload.userId !== 'string') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }

  (req as Request & { user: { userId: string; role: string } }).user = {
    userId: payload.userId,
    role: (payload.role as string) || 'CLIENT',
  };

  next();
}

/**
 * GET /api/projects/:projectId/milestones
 * Get all milestones for a project
 */
router.get(
  '/projects/:projectId/milestones',
  authenticateUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const user = (req as Request & { user: { userId: string; role: string } }).user;

      // Get project to verify access
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          client: true,
        },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      // Check authorization
      if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
        const client = await prisma.client.findUnique({
          where: { userId: user.userId },
        });

        if (!client || project.clientId !== client.id) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have access to this project',
            },
          });
        }
      }

      // Get milestones
      const milestones = await prisma.milestone.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
      });

      // Calculate progress
      const total = milestones.length;
      const completed = milestones.filter((m) => m.status === 'COMPLETED').length;
      const currentMilestone = milestones.find((m) => m.status === 'IN_PROGRESS');

      return res.status(200).json({
        success: true,
        data: {
          milestones,
          progress: {
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            currentMilestone: currentMilestone?.name || null,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/milestones/:id
 * Get a single milestone by ID
 */
router.get('/:id', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as Request & { user: { userId: string; role: string } }).user;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
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
        error: {
          code: 'MILESTONE_NOT_FOUND',
          message: 'Milestone not found',
        },
      });
    }

    // Check authorization
    if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
      const client = await prisma.client.findUnique({
        where: { userId: user.userId },
      });

      if (!client || milestone.project.clientId !== client.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this milestone',
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: milestone,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/milestones/:id
 * Update milestone status (admin only)
 */
router.patch('/:id', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as Request & { user: { userId: string; role: string } }).user;

    // Only admins can update milestone status
    if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can update milestone status',
        },
      });
    }

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status is required',
        },
      });
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
      });
    }

    // Check milestone exists
    const existing = await prisma.milestone.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MILESTONE_NOT_FOUND',
          message: 'Milestone not found',
        },
      });
    }

    // Update milestone (this also handles auto-advancing to next milestone)
    const milestone = await updateMilestoneStatus(id, status);

    return res.status(200).json({
      success: true,
      data: milestone,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
