import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { verifyToken } from '../utils/auth';
import {
  getProjectById,
  getProjectsByClientId,
  updateProjectStatus,
  getProjects,
  getProjectProgress,
} from '../services/projectService';

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

  // Attach user info to request
  (req as Request & { user: { userId: string; role: string } }).user = {
    userId: payload.userId,
    role: (payload.role as string) || 'CLIENT',
  };

  next();
}

/**
 * GET /api/projects
 * List user's projects with status and progress
 */
router.get('/', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as Request & { user: { userId: string; role: string } }).user;

    // Admin can see all projects
    if (user.role === 'ADMIN' || user.role === 'TEAM') {
      const { page, limit, tier, status } = req.query;

      const result = await getProjects({
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        tier: tier ? parseInt(tier as string, 10) : undefined,
        status: status as string | undefined,
      });

      return res.status(200).json({
        success: true,
        data: result.projects,
        pagination: result.pagination,
      });
    }

    // Regular users can only see their own projects
    const client = await prisma.client.findUnique({
      where: { userId: user.userId },
    });

    if (!client) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No client account found',
      });
    }

    const projects = await getProjectsByClientId(client.id);

    // Add progress to each project
    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const progress = await getProjectProgress(project.id);
        return {
          ...project,
          progress,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: projectsWithProgress,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id
 * Get project with milestones, deliverables, payment status
 */
router.get('/:id', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as Request & { user: { userId: string; role: string } }).user;

    const project = await getProjectById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        },
      });
    }

    // Check authorization - user must own the project or be admin
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

    // Add progress
    const progress = await getProjectProgress(id);

    return res.status(200).json({
      success: true,
      data: {
        ...project,
        progress,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/projects/:id
 * Update project status (admin only)
 */
router.patch('/:id', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as Request & { user: { userId: string; role: string } }).user;

    // Only admins can update project status
    if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can update project status',
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

    const validStatuses = ['INTAKE', 'ONBOARDING', 'IN_PROGRESS', 'AWAITING_FEEDBACK', 'REVISIONS', 'DELIVERED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
      });
    }

    // Check project exists
    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        },
      });
    }

    const project = await updateProjectStatus(id, status);

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
