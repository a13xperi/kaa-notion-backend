/**
 * Team Routes
 * API endpoints for team member management and invitations.
 *
 * Routes:
 * - POST /api/team/invite - Create a new team invite (admin only)
 * - GET /api/team/invite/:token - Validate an invite token
 * - POST /api/team/invite/:token/accept - Accept an invite
 * - POST /api/team/invite/:id/resend - Resend an invite (admin only)
 * - DELETE /api/team/invite/:id - Cancel an invite (admin only)
 * - GET /api/team/invites - List pending invites (admin only)
 * - GET /api/team/members - List team members (admin only)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, TeamRole } from '@prisma/client';
import { TeamInviteService } from '../services/teamInviteService';
import { validationError, notFound, forbidden } from '../utils/AppError';
import { logger } from '../logger';
import {
  requireAuth,
  requireAdmin,
  validateBody,
  AuthenticatedRequest,
} from '../middleware';
import { teamInviteRateLimit } from '../middleware/rateLimit';
import { z } from 'zod';
import { getEmailService } from '../services/emailService';

// ============================================================================
// SCHEMAS
// ============================================================================

const createInviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['OWNER', 'ADMIN', 'DESIGNER', 'VIEWER']).default('DESIGNER'),
});

const acceptInviteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createTeamRouter(prisma: PrismaClient): Router {
  const router = Router();
  const teamInviteService = new TeamInviteService(prisma);
  const authMiddleware = requireAuth(prisma);

  // -------------------------------------------------------------------------
  // POST /api/team/invite - Create a new team invite (admin only)
  // -------------------------------------------------------------------------
  router.post(
    '/invite',
    authMiddleware,
    requireAdmin,
    validateBody(createInviteSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as unknown as AuthenticatedRequest).user;
        const { email, role } = req.body as z.infer<typeof createInviteSchema>;
        const invitedById = user!.id;

        const result = await teamInviteService.createInvite(
          email,
          role as TeamRole,
          invitedById
        );

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVITE_FAILED',
              message: result.error,
            },
          });
        }

        // Send invite email
        try {
          const emailService = getEmailService();
          // Use a generic email for now - you could create a specific invite template
          await emailService.sendWelcomeEmail({
            to: email,
            name: 'Team Member',
            tier: 0, // Not applicable for team
            loginUrl: result.inviteUrl,
          });
          logger.info('Team invite email sent', { email });
        } catch (emailError) {
          logger.error('Failed to send invite email', { email, error: emailError });
          // Don't fail the request if email fails
        }

        res.status(201).json({
          success: true,
          data: {
            teamMemberId: result.teamMemberId,
            inviteUrl: result.inviteUrl,
            expiresAt: result.expiresAt,
            // Only include token in development
            ...(process.env.NODE_ENV === 'development' && { token: result.inviteToken }),
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /api/team/invite/:token - Validate an invite token (public)
  // -------------------------------------------------------------------------
  router.get(
    '/invite/:token',
    teamInviteRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { token } = req.params;

        if (!token) {
          throw validationError('Token is required');
        }

        const result = await teamInviteService.validateInvite(token);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_INVITE',
              message: result.error,
            },
          });
        }

        res.json({
          success: true,
          data: {
            email: result.email,
            role: result.role,
            invitedBy: result.invitedByName,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /api/team/invite/:token/accept - Accept an invite (public)
  // -------------------------------------------------------------------------
  router.post(
    '/invite/:token/accept',
    teamInviteRateLimit,
    validateBody(acceptInviteSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { token } = req.params;
        const { name, password } = req.body as z.infer<typeof acceptInviteSchema>;

        if (!token) {
          throw validationError('Token is required');
        }

        const result = await teamInviteService.acceptInvite(token, {
          name,
          password,
        });

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'ACCEPT_FAILED',
              message: result.error,
            },
          });
        }

        res.json({
          success: true,
          message: 'Invite accepted successfully. You can now log in.',
          data: {
            userId: result.userId,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /api/team/invite/:id/resend - Resend an invite (admin only)
  // -------------------------------------------------------------------------
  router.post(
    '/invite/:id/resend',
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as unknown as AuthenticatedRequest).user;
        const { id } = req.params;
        const invitedById = user!.id;

        const result = await teamInviteService.resendInvite(id, invitedById);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'RESEND_FAILED',
              message: result.error,
            },
          });
        }

        res.json({
          success: true,
          message: 'Invite resent successfully',
          data: {
            inviteUrl: result.inviteUrl,
            expiresAt: result.expiresAt,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // -------------------------------------------------------------------------
  // DELETE /api/team/invite/:id - Cancel an invite (admin only)
  // -------------------------------------------------------------------------
  router.delete(
    '/invite/:id',
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as unknown as AuthenticatedRequest).user;
        const { id } = req.params;
        const cancelledById = user!.id;

        const result = await teamInviteService.cancelInvite(id, cancelledById);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'CANCEL_FAILED',
              message: result.error,
            },
          });
        }

        res.json({
          success: true,
          message: 'Invite cancelled successfully',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /api/team/invites - List pending invites (admin only)
  // -------------------------------------------------------------------------
  router.get(
    '/invites',
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const invites = await teamInviteService.getPendingInvites();

        res.json({
          success: true,
          data: invites,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /api/team/members - List team members (admin only)
  // -------------------------------------------------------------------------
  router.get(
    '/members',
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const members = await prisma.teamMember.findMany({
          where: {
            isActive: true,
            acceptedAt: { not: null },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            invitedBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const formattedMembers = members.map((member: typeof members[number]) => ({
          id: member.id,
          userId: member.user.id,
          email: member.user.email,
          name: member.user.name,
          role: member.role,
          invitedBy: member.invitedBy
            ? { name: member.invitedBy.name, email: member.invitedBy.email }
            : null,
          invitedAt: member.invitedAt,
          acceptedAt: member.acceptedAt,
          isActive: member.isActive,
        }));

        res.json({
          success: true,
          data: formattedMembers,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // -------------------------------------------------------------------------
  // PATCH /api/team/members/:id - Update team member role (admin only)
  // -------------------------------------------------------------------------
  router.patch(
    '/members/:id',
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as unknown as AuthenticatedRequest).user;
        const { id } = req.params;
        const { role, isActive } = req.body;

        const teamMember = await prisma.teamMember.findUnique({
          where: { id },
        });

        if (!teamMember) {
          throw notFound('Team member not found');
        }

        const updateData: { role?: TeamRole; isActive?: boolean } = {};

        if (role && ['OWNER', 'ADMIN', 'DESIGNER', 'VIEWER'].includes(role)) {
          updateData.role = role as TeamRole;
        }

        if (typeof isActive === 'boolean') {
          updateData.isActive = isActive;
        }

        const updated = await prisma.teamMember.update({
          where: { id },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: user!.id,
            action: 'team_member_updated',
            resourceType: 'team_member',
            resourceId: id,
            details: JSON.stringify(updateData),
          },
        });

        res.json({
          success: true,
          data: {
            id: updated.id,
            userId: updated.user.id,
            email: updated.user.email,
            name: updated.user.name,
            role: updated.role,
            isActive: updated.isActive,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

export default createTeamRouter;
