import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { verifyToken } from '../utils/auth';
import crypto from 'crypto';

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

// Supabase storage URL (for signed URLs)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

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
 * GET /api/projects/:projectId/deliverables
 * Get all deliverables for a project
 */
router.get(
  '/projects/:projectId/deliverables',
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

      // Get deliverables
      const deliverables = await prisma.deliverable.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Group by category
      const byCategory = deliverables.reduce(
        (acc, deliverable) => {
          const category = deliverable.category || 'Other';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(deliverable);
          return acc;
        },
        {} as Record<string, typeof deliverables>
      );

      return res.status(200).json({
        success: true,
        data: {
          deliverables,
          byCategory,
          total: deliverables.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/projects/:projectId/deliverables
 * Upload a new deliverable (admin only)
 * Note: Actual file upload should be handled separately via Supabase Storage
 * This endpoint creates the metadata record
 */
router.post(
  '/projects/:projectId/deliverables',
  authenticateUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const user = (req as Request & { user: { userId: string; role: string } }).user;

      // Only admins can upload deliverables
      if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only admins can upload deliverables',
          },
        });
      }

      // Validate request body
      const { name, filePath, fileUrl, fileSize, fileType, category, description } = req.body;

      if (!name || !filePath || !fileUrl || !fileSize || !fileType || !category) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: name, filePath, fileUrl, fileSize, fileType, category',
          },
        });
      }

      // Check project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
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

      // Create deliverable
      const deliverable = await prisma.deliverable.create({
        data: {
          projectId,
          name,
          filePath,
          fileUrl,
          fileSize: parseInt(fileSize, 10),
          fileType,
          category,
          description,
          uploadedById: user.userId,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        data: deliverable,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/deliverables/:id
 * Get a single deliverable by ID
 */
router.get('/:id', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as Request & { user: { userId: string; role: string } }).user;

    const deliverable = await prisma.deliverable.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!deliverable) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DELIVERABLE_NOT_FOUND',
          message: 'Deliverable not found',
        },
      });
    }

    // Check authorization
    if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
      const client = await prisma.client.findUnique({
        where: { userId: user.userId },
      });

      if (!client || deliverable.project.clientId !== client.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this deliverable',
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: deliverable,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/deliverables/:id/download
 * Get a signed download URL for the file
 */
router.get(
  '/:id/download',
  authenticateUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as Request & { user: { userId: string; role: string } }).user;

      const deliverable = await prisma.deliverable.findUnique({
        where: { id },
        include: {
          project: {
            include: {
              client: true,
            },
          },
        },
      });

      if (!deliverable) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DELIVERABLE_NOT_FOUND',
            message: 'Deliverable not found',
          },
        });
      }

      // Check authorization
      if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
        const client = await prisma.client.findUnique({
          where: { userId: user.userId },
        });

        if (!client || deliverable.project.clientId !== client.id) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have access to this deliverable',
            },
          });
        }
      }

      // Generate signed URL
      // In production, this would call Supabase Storage API to create a signed URL
      // For now, we'll create a simple time-limited token
      const expiresAt = Date.now() + 3600000; // 1 hour from now
      const token = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${deliverable.id}:${expiresAt}`)
        .digest('hex');

      // If Supabase is configured, generate actual signed URL
      let downloadUrl = deliverable.fileUrl;

      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        // Construct Supabase signed URL
        // Format: {SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}
        downloadUrl = `${SUPABASE_URL}/storage/v1/object/public/${deliverable.filePath}?token=${token}&expires=${expiresAt}`;
      }

      return res.status(200).json({
        success: true,
        data: {
          downloadUrl,
          fileName: deliverable.name,
          fileType: deliverable.fileType,
          fileSize: deliverable.fileSize,
          expiresAt: new Date(expiresAt).toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/deliverables/:id
 * Delete a deliverable (admin only)
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as Request & { user: { userId: string; role: string } }).user;

    // Only admins can delete deliverables
    if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can delete deliverables',
        },
      });
    }

    const deliverable = await prisma.deliverable.findUnique({
      where: { id },
    });

    if (!deliverable) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DELIVERABLE_NOT_FOUND',
          message: 'Deliverable not found',
        },
      });
    }

    // Delete the deliverable record
    // Note: Actual file deletion from Supabase Storage should be handled separately
    await prisma.deliverable.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Deliverable deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
