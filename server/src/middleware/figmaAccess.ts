import { NextFunction, Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { AuthenticatedRequest } from './auth';
import { internalError } from '../utils/AppError';

const ADMIN_ROLES = ['ADMIN', 'TEAM'];

function isAdminOrTeam(user: AuthenticatedRequest['user']): boolean {
  if (!user) {
    return false;
  }

  return ADMIN_ROLES.includes(user.role) || ADMIN_ROLES.includes(user.userType);
}

function getProjectId(req: Request): string | null {
  const projectId = req.query.projectId;

  if (typeof projectId === 'string' && projectId.trim().length > 0) {
    return projectId;
  }

  return null;
}

export function createFigmaAccessMiddleware(prismaClient: PrismaClient) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        });
      }

      if (isAdminOrTeam(user)) {
        return next();
      }

      const projectId = getProjectId(req);

      if (!projectId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PROJECT_ACCESS_REQUIRED',
            message: 'Project access is required for this resource.',
          },
        });
      }

      const accessFilters = [{ projectAssignments: { some: { userId: user.id } } }];

      if (user.clientId) {
        accessFilters.push({ clientId: user.clientId });
      }

      const project = await prismaClient.project.findFirst({
        where: {
          id: projectId,
          OR: accessFilters,
        },
        select: { id: true },
      });

      if (!project) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this project.',
          },
        });
      }

      return next();
    } catch (error) {
      return next(internalError('Failed to authorize Figma access', error as Error));
    }
  };
}
