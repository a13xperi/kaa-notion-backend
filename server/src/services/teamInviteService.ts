/**
 * Team Invite Service
 * Handles secure team member invitation and acceptance.
 */

import crypto from 'crypto';
import { PrismaClient, TeamRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateInviteResult {
  success: boolean;
  inviteToken?: string;
  inviteUrl?: string;
  expiresAt?: Date;
  teamMemberId?: string;
  error?: string;
}

export interface ValidateInviteResult {
  success: boolean;
  teamMemberId?: string;
  email?: string;
  role?: TeamRole;
  invitedByName?: string;
  error?: string;
}

export interface AcceptInviteResult {
  success: boolean;
  userId?: string;
  teamMemberId?: string;
  error?: string;
}

export interface InviteDetails {
  id: string;
  email: string;
  role: TeamRole;
  invitedBy: {
    name: string | null;
    email: string;
  } | null;
  expiresAt: Date;
  createdAt: Date;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const TOKEN_LENGTH = 32; // 256 bits
const INVITE_EXPIRY_DAYS = 7; // Invite valid for 7 days
const BCRYPT_ROUNDS = 12;

// ============================================================================
// TEAM INVITE SERVICE
// ============================================================================

export class TeamInviteService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a team invite for a new member
   */
  async createInvite(
    email: string,
    role: TeamRole,
    invitedById: string
  ): Promise<CreateInviteResult> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { teamMember: true },
      });

      if (existingUser?.teamMember) {
        return {
          success: false,
          error: 'User is already a team member',
        };
      }

      // Check if there's already a pending invite for this email
      const existingInvite = await this.prisma.teamMember.findFirst({
        where: {
          user: { email: normalizedEmail },
          acceptedAt: null,
          inviteTokenExpiresAt: { gt: new Date() },
        },
      });

      if (existingInvite) {
        return {
          success: false,
          error: 'A pending invite already exists for this email',
        };
      }

      // Generate secure random token
      const inviteToken = crypto.randomBytes(TOKEN_LENGTH).toString('hex');

      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

      // Create user account (inactive until invite accepted)
      let user = existingUser;
      if (!user) {
        // Create placeholder user with temporary password
        const tempPasswordHash = await bcrypt.hash(
          crypto.randomBytes(32).toString('hex'),
          BCRYPT_ROUNDS
        );

        user = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: tempPasswordHash,
            userType: 'TEAM',
            role: role,
          },
        });
      }

      // Create team member record with invite token
      const teamMember = await this.prisma.teamMember.create({
        data: {
          userId: user.id,
          role: role,
          invitedById: invitedById,
          inviteToken: inviteToken,
          inviteTokenExpiresAt: expiresAt,
          isActive: false, // Not active until invite accepted
        },
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          userId: invitedById,
          action: 'team_invite_created',
          resourceType: 'team_member',
          resourceId: teamMember.id,
          details: {
            invitedEmail: normalizedEmail,
            role: role,
          },
        },
      });

      const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${inviteToken}`;

      logger.info('Team invite created', {
        teamMemberId: teamMember.id,
        email: normalizedEmail,
        role,
      });

      return {
        success: true,
        inviteToken,
        inviteUrl,
        expiresAt,
        teamMemberId: teamMember.id,
      };
    } catch (error) {
      logger.error('Error creating team invite', { error });
      return {
        success: false,
        error: 'Failed to create invite',
      };
    }
  }

  /**
   * Validate an invite token
   */
  async validateInvite(token: string): Promise<ValidateInviteResult> {
    try {
      const teamMember = await this.prisma.teamMember.findFirst({
        where: {
          inviteToken: token,
          acceptedAt: null,
          inviteTokenExpiresAt: { gt: new Date() },
        },
        include: {
          user: {
            select: { email: true },
          },
          invitedBy: {
            select: { name: true, email: true },
          },
        },
      });

      if (!teamMember) {
        return {
          success: false,
          error: 'Invalid or expired invite',
        };
      }

      return {
        success: true,
        teamMemberId: teamMember.id,
        email: teamMember.user.email || undefined,
        role: teamMember.role,
        invitedByName: teamMember.invitedBy?.name || teamMember.invitedBy?.email || undefined,
      };
    } catch (error) {
      logger.error('Error validating invite', { error });
      return {
        success: false,
        error: 'Failed to validate invite',
      };
    }
  }

  /**
   * Accept an invite and set up the user account
   */
  async acceptInvite(
    token: string,
    userData: {
      name: string;
      password: string;
    }
  ): Promise<AcceptInviteResult> {
    try {
      // Validate token first
      const validation = await this.validateInvite(token);

      if (!validation.success || !validation.teamMemberId) {
        return {
          success: false,
          error: validation.error || 'Invalid invite',
        };
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);

      // Use transaction to update user and team member
      const result = await this.prisma.$transaction(async (tx) => {
        // Get team member with user
        const teamMember = await tx.teamMember.findUnique({
          where: { id: validation.teamMemberId },
          include: { user: true },
        });

        if (!teamMember) {
          throw new Error('Team member not found');
        }

        // Update user with name and password
        await tx.user.update({
          where: { id: teamMember.userId },
          data: {
            name: userData.name,
            passwordHash: passwordHash,
          },
        });

        // Mark invite as accepted
        const updatedTeamMember = await tx.teamMember.update({
          where: { id: teamMember.id },
          data: {
            acceptedAt: new Date(),
            isActive: true,
            inviteToken: null, // Clear token after use
            inviteTokenExpiresAt: null,
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId: teamMember.userId,
            action: 'team_invite_accepted',
            resourceType: 'team_member',
            resourceId: teamMember.id,
            details: {
              role: teamMember.role,
            },
          },
        });

        return {
          userId: teamMember.userId,
          teamMemberId: updatedTeamMember.id,
        };
      });

      logger.info('Team invite accepted', {
        teamMemberId: result.teamMemberId,
        userId: result.userId,
      });

      return {
        success: true,
        userId: result.userId,
        teamMemberId: result.teamMemberId,
      };
    } catch (error) {
      logger.error('Error accepting invite', { error });
      return {
        success: false,
        error: 'Failed to accept invite',
      };
    }
  }

  /**
   * Resend an invite (generates new token)
   */
  async resendInvite(teamMemberId: string, invitedById: string): Promise<CreateInviteResult> {
    try {
      const teamMember = await this.prisma.teamMember.findUnique({
        where: { id: teamMemberId },
        include: {
          user: { select: { email: true } },
        },
      });

      if (!teamMember) {
        return {
          success: false,
          error: 'Team member not found',
        };
      }

      if (teamMember.acceptedAt) {
        return {
          success: false,
          error: 'Invite has already been accepted',
        };
      }

      // Generate new token
      const inviteToken = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

      // Update team member with new token
      await this.prisma.teamMember.update({
        where: { id: teamMemberId },
        data: {
          inviteToken,
          inviteTokenExpiresAt: expiresAt,
        },
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          userId: invitedById,
          action: 'team_invite_resent',
          resourceType: 'team_member',
          resourceId: teamMemberId,
          details: {
            email: teamMember.user.email,
          },
        },
      });

      const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${inviteToken}`;

      logger.info('Team invite resent', {
        teamMemberId,
        email: teamMember.user.email,
      });

      return {
        success: true,
        inviteToken,
        inviteUrl,
        expiresAt,
        teamMemberId,
      };
    } catch (error) {
      logger.error('Error resending invite', { error });
      return {
        success: false,
        error: 'Failed to resend invite',
      };
    }
  }

  /**
   * Cancel a pending invite
   */
  async cancelInvite(teamMemberId: string, cancelledById: string): Promise<{ success: boolean; error?: string }> {
    try {
      const teamMember = await this.prisma.teamMember.findUnique({
        where: { id: teamMemberId },
        include: {
          user: { select: { id: true, email: true } },
        },
      });

      if (!teamMember) {
        return {
          success: false,
          error: 'Team member not found',
        };
      }

      if (teamMember.acceptedAt) {
        return {
          success: false,
          error: 'Cannot cancel accepted invite',
        };
      }

      // Delete team member and user (if user has no other data)
      await this.prisma.$transaction(async (tx) => {
        // Delete team member
        await tx.teamMember.delete({
          where: { id: teamMemberId },
        });

        // Delete user if they have no other data
        const userHasData = await tx.project.findFirst({
          where: { client: { userId: teamMember.user.id } },
        });

        if (!userHasData) {
          await tx.user.delete({
            where: { id: teamMember.user.id },
          });
        }

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId: cancelledById,
            action: 'team_invite_cancelled',
            resourceType: 'team_member',
            resourceId: teamMemberId,
            details: {
              email: teamMember.user.email,
            },
          },
        });
      });

      logger.info('Team invite cancelled', {
        teamMemberId,
        email: teamMember.user.email,
      });

      return { success: true };
    } catch (error) {
      logger.error('Error cancelling invite', { error });
      return {
        success: false,
        error: 'Failed to cancel invite',
      };
    }
  }

  /**
   * Get all pending invites
   */
  async getPendingInvites(): Promise<InviteDetails[]> {
    try {
      const invites = await this.prisma.teamMember.findMany({
        where: {
          acceptedAt: null,
          inviteTokenExpiresAt: { gt: new Date() },
        },
        include: {
          user: { select: { email: true } },
          invitedBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return invites.map((invite) => ({
        id: invite.id,
        email: invite.user.email || '',
        role: invite.role,
        invitedBy: invite.invitedBy
          ? { name: invite.invitedBy.name, email: invite.invitedBy.email || '' }
          : null,
        expiresAt: invite.inviteTokenExpiresAt!,
        createdAt: invite.createdAt,
      }));
    } catch (error) {
      logger.error('Error getting pending invites', { error });
      return [];
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let teamInviteServiceInstance: TeamInviteService | null = null;

export function initTeamInviteService(prisma: PrismaClient): TeamInviteService {
  teamInviteServiceInstance = new TeamInviteService(prisma);
  return teamInviteServiceInstance;
}

export function getTeamInviteService(): TeamInviteService {
  if (!teamInviteServiceInstance) {
    throw new Error('TeamInviteService not initialized. Call initTeamInviteService first.');
  }
  return teamInviteServiceInstance;
}

export default TeamInviteService;
