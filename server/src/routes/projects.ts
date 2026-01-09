/**
 * Projects Routes
 * API endpoints for project management.
 *
 * Routes:
 * - GET /api/projects - List user's projects with status and progress
 * - GET /api/projects/:id - Get single project with full details
 * - PATCH /api/projects/:id - Update project status (admin only)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from '../services/prismaAdapter';
import { createProjectService, ProjectStatus } from '../services/projectService';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended request with authenticated user info
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    userType: 'KAA_CLIENT' | 'SAGE_CLIENT' | 'TEAM' | 'ADMIN';
    tier?: number;
    clientId?: string;
  };
}

/**
 * Query parameters for listing projects
 */
interface ListProjectsQuery {
  status?: ProjectStatus;
  tier?: string;
  page?: string;
  limit?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response format for project list
 */
interface ProjectListResponse {
  success: boolean;
  data: ProjectSummary[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Project summary for list view
 */
interface ProjectSummary {
  id: string;
  name: string;
  tier: number;
  status: ProjectStatus;
  paymentStatus: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  nextMilestone: {
    id: string;
    name: string;
    dueDate: Date | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware to require authentication
 * TODO: Replace with proper JWT verification in Phase 8
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // For now, check for user info in headers (temporary solution)
  // This should be replaced with proper JWT verification
  const userId = req.headers['x-user-id'] as string;
  const userType = req.headers['x-user-type'] as string;
  const clientId = req.headers['x-client-id'] as string;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  // Validate userType
  const validUserTypes = ['KAA_CLIENT', 'SAGE_CLIENT', 'TEAM', 'ADMIN'] as const;
  const validatedUserType = validUserTypes.includes(userType as any)
    ? (userType as 'KAA_CLIENT' | 'SAGE_CLIENT' | 'TEAM' | 'ADMIN')
    : 'SAGE_CLIENT';

  req.user = {
    id: userId,
    email: (req.headers['x-user-email'] as string) || '',
    userType: validatedUserType,
    tier: req.headers['x-user-tier'] ? parseInt(req.headers['x-user-tier'] as string) : undefined,
    clientId: clientId || undefined,
  };

  next();
}

/**
 * Middleware to require admin or team access
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.userType !== 'ADMIN' && req.user.userType !== 'TEAM')) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin or team access required',
      },
    });
    return;
  }

  next();
}

// ============================================================================
// ROUTE FACTORY
// ============================================================================

/**
 * Create projects router with dependency injection
 */
export function createProjectsRouter(prisma: PrismaClient): Router {
  const router = Router();
  const dbAdapter = createPrismaAdapter(prisma);
  const projectService = createProjectService(dbAdapter);

  // -------------------------------------------------------------------------
  // GET /api/projects - List user's projects
  // -------------------------------------------------------------------------
  router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const query = req.query as ListProjectsQuery;
      const user = req.user!;

      // Pagination
      const page = Math.max(1, parseInt(query.page || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')));
      const skip = (page - 1) * limit;

      // Sorting
      const sortBy = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'desc';

      // Build where clause based on user type
      let whereClause: any = {};

      if (user.userType === 'ADMIN' || user.userType === 'TEAM') {
        // Admin/Team can see all projects, optionally filtered
        if (query.status) {
          whereClause.status = query.status;
        }
        if (query.tier) {
          whereClause.tier = parseInt(query.tier);
        }
      } else {
        // Clients can only see their own projects
        if (!user.clientId) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'NO_CLIENT',
              message: 'No client profile associated with user',
            },
          });
        }
        whereClause.clientId = user.clientId;
      }

      // Get total count for pagination
      const total = await prisma.project.count({ where: whereClause });

      // Get projects with milestones for progress calculation
      const projects = await prisma.project.findMany({
        where: whereClause,
        include: {
          milestones: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              name: true,
              status: true,
              dueDate: true,
              order: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      });

      // Transform to summary format with progress
      const projectSummaries: ProjectSummary[] = projects.map((project) => {
        const totalMilestones = project.milestones.length;
        const completedMilestones = project.milestones.filter(
          (m) => m.status === 'COMPLETED'
        ).length;

        // Find next pending/in-progress milestone
        const nextMilestone = project.milestones.find(
          (m) => m.status === 'PENDING' || m.status === 'IN_PROGRESS'
        );

        return {
          id: project.id,
          name: project.name,
          tier: project.tier,
          status: project.status as ProjectStatus,
          paymentStatus: project.paymentStatus,
          progress: {
            completed: completedMilestones,
            total: totalMilestones,
            percentage: totalMilestones > 0
              ? Math.round((completedMilestones / totalMilestones) * 100)
              : 0,
          },
          nextMilestone: nextMilestone
            ? {
                id: nextMilestone.id,
                name: nextMilestone.name,
                dueDate: nextMilestone.dueDate,
              }
            : null,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      });

      const response: ProjectListResponse = {
        success: true,
        data: projectSummaries,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Error listing projects:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to list projects',
          details: error instanceof Error ? error.message : undefined,
        },
      });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/projects/:id - Get single project with full details
  // -------------------------------------------------------------------------
  router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Get project with all related data
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              tier: true,
              status: true,
              projectAddress: true,
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
          lead: {
            select: {
              id: true,
              email: true,
              name: true,
              projectType: true,
              budgetRange: true,
            },
          },
          milestones: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              name: true,
              order: true,
              status: true,
              dueDate: true,
              completedAt: true,
              createdAt: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              createdAt: true,
            },
          },
          deliverables: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              category: true,
              fileType: true,
              fileSize: true,
              createdAt: true,
            },
          },
        },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      // Authorization check - clients can only see their own projects
      if (user.userType !== 'ADMIN' && user.userType !== 'TEAM') {
        if (project.clientId !== user.clientId) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this project',
            },
          });
        }
      }

      // Calculate progress
      const totalMilestones = project.milestones.length;
      const completedMilestones = project.milestones.filter(
        (m) => m.status === 'COMPLETED'
      ).length;
      const inProgressMilestones = project.milestones.filter(
        (m) => m.status === 'IN_PROGRESS'
      ).length;

      // Get current milestone (first in-progress, or first pending)
      const currentMilestone = project.milestones.find(
        (m) => m.status === 'IN_PROGRESS'
      ) || project.milestones.find(
        (m) => m.status === 'PENDING'
      );

      // Calculate total payments
      const totalPaid = project.payments
        .filter((p) => p.status === 'SUCCEEDED')
        .reduce((sum, p) => sum + p.amount, 0);

      res.json({
        success: true,
        data: {
          id: project.id,
          name: project.name,
          tier: project.tier,
          status: project.status,
          paymentStatus: project.paymentStatus,
          notionPageId: project.notionPageId,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,

          // Client info
          client: {
            id: project.client.id,
            tier: project.client.tier,
            status: project.client.status,
            projectAddress: project.client.projectAddress,
            email: project.client.user.email,
          },

          // Lead info (if exists)
          lead: project.lead ? {
            id: project.lead.id,
            email: project.lead.email,
            name: project.lead.name,
            projectType: project.lead.projectType,
            budgetRange: project.lead.budgetRange,
          } : null,

          // Progress summary
          progress: {
            completed: completedMilestones,
            inProgress: inProgressMilestones,
            total: totalMilestones,
            percentage: totalMilestones > 0
              ? Math.round((completedMilestones / totalMilestones) * 100)
              : 0,
            currentMilestone: currentMilestone ? {
              id: currentMilestone.id,
              name: currentMilestone.name,
              dueDate: currentMilestone.dueDate,
            } : null,
          },

          // Full milestone list
          milestones: project.milestones.map((m) => ({
            id: m.id,
            name: m.name,
            order: m.order,
            status: m.status,
            dueDate: m.dueDate,
            completedAt: m.completedAt,
          })),

          // Payment summary
          payments: {
            totalPaid,
            currency: 'usd',
            history: project.payments.map((p) => ({
              id: p.id,
              amount: p.amount,
              currency: p.currency,
              status: p.status,
              createdAt: p.createdAt,
            })),
          },

          // Deliverables list
          deliverables: project.deliverables.map((d) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            fileType: d.fileType,
            fileSize: d.fileSize,
            createdAt: d.createdAt,
          })),
        },
      });
    } catch (error) {
      logger.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch project',
          details: error instanceof Error ? error.message : undefined,
        },
      });
    }
  });

  // -------------------------------------------------------------------------
  // PATCH /api/projects/:id - Update project status (admin only)
  // -------------------------------------------------------------------------
  router.patch('/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, paymentStatus, notionPageId } = req.body;

      // Validate status if provided
      if (status && !Object.values(ProjectStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Invalid status. Must be one of: ${Object.values(ProjectStatus).join(', ')}`,
          },
        });
      }

      // Check project exists
      const existingProject = await prisma.project.findUnique({
        where: { id },
      });

      if (!existingProject) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      // Build update data
      const updateData: any = {};
      if (status) updateData.status = status;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;
      if (notionPageId !== undefined) updateData.notionPageId = notionPageId;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_UPDATES',
            message: 'No valid fields to update',
          },
        });
      }

      // Update project
      const updatedProject = await prisma.project.update({
        where: { id },
        data: updateData,
        include: {
          client: {
            select: {
              id: true,
              tier: true,
              projectAddress: true,
            },
          },
        },
      });

      // Log the update
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'project_update',
          resourceType: 'project',
          resourceId: id,
          details: {
            previousStatus: existingProject.status,
            newStatus: status || existingProject.status,
            updatedFields: Object.keys(updateData),
          },
        },
      });

      logger.info(`Project ${id} updated by user ${req.user!.id}`, updateData);

      res.json({
        success: true,
        data: {
          id: updatedProject.id,
          name: updatedProject.name,
          tier: updatedProject.tier,
          status: updatedProject.status,
          paymentStatus: updatedProject.paymentStatus,
          notionPageId: updatedProject.notionPageId,
          updatedAt: updatedProject.updatedAt,
          client: updatedProject.client,
        },
      });
    } catch (error) {
      logger.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to update project',
          details: error instanceof Error ? error.message : undefined,
        },
      });
    }
  });

  return router;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default createProjectsRouter;
