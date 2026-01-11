/**
 * Team Service
 * Handles team collaboration, roles, and permissions
 */

import { TeamRole, TeamMember, User } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';

// ============================================
// TYPES
// ============================================

export interface TeamMemberWithUser extends TeamMember {
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>;
}

export interface InviteTeamMemberInput {
  email: string;
  name?: string;
  role: TeamRole;
  invitedById: string;
}

export interface ProjectAssignmentInput {
  projectId: string;
  userId: string;
  role?: string;
}

// ============================================
// ROLE PERMISSIONS
// ============================================

export const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  OWNER: [
    'manage_team',
    'manage_billing',
    'manage_projects',
    'manage_clients',
    'manage_portfolio',
    'view_analytics',
    'manage_settings',
    'delete_resources',
  ],
  ADMIN: [
    'manage_projects',
    'manage_clients',
    'manage_portfolio',
    'view_analytics',
    'assign_team',
  ],
  DESIGNER: [
    'view_projects',
    'edit_projects',
    'upload_deliverables',
    'manage_milestones',
    'send_messages',
  ],
  VIEWER: [
    'view_projects',
    'view_deliverables',
    'view_messages',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: TeamRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: TeamRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

// ============================================
// TEAM MEMBER MANAGEMENT
// ============================================

/**
 * Get all team members
 */
export async function getTeamMembers(): Promise<TeamMemberWithUser[]> {
  return prisma.teamMember.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: [
      { role: 'asc' },
      { createdAt: 'asc' },
    ],
  }) as Promise<TeamMemberWithUser[]>;
}

/**
 * Get team member by user ID
 */
export async function getTeamMemberByUserId(
  userId: string
): Promise<TeamMemberWithUser | null> {
  return prisma.teamMember.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  }) as Promise<TeamMemberWithUser | null>;
}

/**
 * Invite a new team member
 */
export async function inviteTeamMember(
  input: InviteTeamMemberInput
): Promise<{ user: User; teamMember: TeamMember; inviteToken: string }> {
  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (user) {
    // Check if already a team member
    const existingMember = await prisma.teamMember.findUnique({
      where: { userId: user.id },
    });

    if (existingMember) {
      throw new Error('User is already a team member');
    }
  } else {
    // Create new user with temporary password
    const tempPassword = crypto.randomBytes(16).toString('hex');

    user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: 'TEAM',
        userType: 'TEAM',
        passwordHash: tempPassword, // Will be reset on first login
      },
    });
  }

  // Create team member record
  const teamMember = await prisma.teamMember.create({
    data: {
      userId: user.id,
      role: input.role,
      invitedById: input.invitedById,
    },
  });

  // Generate invite token
  const inviteToken = crypto.randomBytes(32).toString('hex');

  // TODO: Store invite token and send email

  return { user, teamMember, inviteToken };
}

/**
 * Accept team invitation
 */
export async function acceptInvite(
  userId: string,
  password: string
): Promise<TeamMember> {
  const teamMember = await prisma.teamMember.findUnique({
    where: { userId },
  });

  if (!teamMember) {
    throw new Error('Team member not found');
  }

  if (teamMember.acceptedAt) {
    throw new Error('Invitation already accepted');
  }

  // Update user password
  // Note: In production, hash the password properly
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: password, // Should be hashed
    },
  });

  // Mark invitation as accepted
  return prisma.teamMember.update({
    where: { userId },
    data: {
      acceptedAt: new Date(),
    },
  });
}

/**
 * Update team member role
 */
export async function updateTeamMemberRole(
  userId: string,
  newRole: TeamRole,
  updatedById: string
): Promise<TeamMember> {
  // Check if updater has permission
  const updater = await getTeamMemberByUserId(updatedById);
  if (!updater || !hasPermission(updater.role, 'manage_team')) {
    throw new Error('Insufficient permissions to update team roles');
  }

  // Cannot change owner role
  const member = await prisma.teamMember.findUnique({
    where: { userId },
  });

  if (member?.role === 'OWNER') {
    throw new Error('Cannot change the role of the owner');
  }

  return prisma.teamMember.update({
    where: { userId },
    data: { role: newRole },
  });
}

/**
 * Remove team member
 */
export async function removeTeamMember(
  userId: string,
  removedById: string
): Promise<void> {
  // Check if remover has permission
  const remover = await getTeamMemberByUserId(removedById);
  if (!remover || !hasPermission(remover.role, 'manage_team')) {
    throw new Error('Insufficient permissions to remove team members');
  }

  const member = await prisma.teamMember.findUnique({
    where: { userId },
  });

  if (!member) {
    throw new Error('Team member not found');
  }

  if (member.role === 'OWNER') {
    throw new Error('Cannot remove the owner');
  }

  // Soft delete - mark as inactive
  await prisma.teamMember.update({
    where: { userId },
    data: { isActive: false },
  });

  // Remove project assignments
  await prisma.projectAssignment.updateMany({
    where: { userId },
    data: { unassignedAt: new Date() },
  });
}

/**
 * Reactivate team member
 */
export async function reactivateTeamMember(userId: string): Promise<TeamMember> {
  return prisma.teamMember.update({
    where: { userId },
    data: { isActive: true },
  });
}

// ============================================
// PROJECT ASSIGNMENTS
// ============================================

/**
 * Assign team member to project
 */
export async function assignToProject(
  input: ProjectAssignmentInput
): Promise<void> {
  // Check if user is a team member
  const teamMember = await prisma.teamMember.findUnique({
    where: { userId: input.userId },
  });

  if (!teamMember || !teamMember.isActive) {
    throw new Error('User is not an active team member');
  }

  await prisma.projectAssignment.upsert({
    where: {
      projectId_userId: {
        projectId: input.projectId,
        userId: input.userId,
      },
    },
    create: {
      projectId: input.projectId,
      userId: input.userId,
      role: input.role || 'contributor',
    },
    update: {
      role: input.role || 'contributor',
      unassignedAt: null,
    },
  });
}

/**
 * Unassign team member from project
 */
export async function unassignFromProject(
  projectId: string,
  userId: string
): Promise<void> {
  await prisma.projectAssignment.update({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    data: {
      unassignedAt: new Date(),
    },
  });
}

/**
 * Get team members assigned to a project
 */
export async function getProjectTeam(
  projectId: string
): Promise<Array<{
  user: Pick<User, 'id' | 'email' | 'name'>;
  role: string;
  assignedAt: Date;
}>> {
  const assignments = await prisma.projectAssignment.findMany({
    where: {
      projectId,
      unassignedAt: null,
    },
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

  return assignments.map((a) => ({
    user: a.user,
    role: a.role,
    assignedAt: a.assignedAt,
  }));
}

/**
 * Get projects assigned to a team member
 */
export async function getMemberProjects(
  userId: string
): Promise<Array<{
  projectId: string;
  projectName: string;
  role: string;
  assignedAt: Date;
}>> {
  const assignments = await prisma.projectAssignment.findMany({
    where: {
      userId,
      unassignedAt: null,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return assignments.map((a) => ({
    projectId: a.project.id,
    projectName: a.project.name,
    role: a.role,
    assignedAt: a.assignedAt,
  }));
}

/**
 * Check if user has access to project
 */
export async function hasProjectAccess(
  userId: string,
  projectId: string
): Promise<boolean> {
  const teamMember = await prisma.teamMember.findUnique({
    where: { userId },
  });

  if (!teamMember || !teamMember.isActive) {
    return false;
  }

  // Owners and Admins have access to all projects
  if (teamMember.role === 'OWNER' || teamMember.role === 'ADMIN') {
    return true;
  }

  // Check project assignment
  const assignment = await prisma.projectAssignment.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  return assignment !== null && assignment.unassignedAt === null;
}

// ============================================
// TEAM STATISTICS
// ============================================

/**
 * Get team statistics
 */
export async function getTeamStats(): Promise<{
  totalMembers: number;
  byRole: Record<TeamRole, number>;
  pendingInvites: number;
  activeProjects: number;
}> {
  const members = await prisma.teamMember.findMany({
    where: { isActive: true },
  });

  const pendingInvites = members.filter((m) => !m.acceptedAt).length;

  const byRole: Record<TeamRole, number> = {
    OWNER: 0,
    ADMIN: 0,
    DESIGNER: 0,
    VIEWER: 0,
  };

  members.forEach((m) => {
    byRole[m.role]++;
  });

  const activeProjects = await prisma.project.count({
    where: {
      archivedAt: null,
      status: {
        notIn: ['CLOSED', 'DELIVERED'],
      },
    },
  });

  return {
    totalMembers: members.length,
    byRole,
    pendingInvites,
    activeProjects,
  };
}

export default {
  ROLE_PERMISSIONS,
  hasPermission,
  getRolePermissions,
  getTeamMembers,
  getTeamMemberByUserId,
  inviteTeamMember,
  acceptInvite,
  updateTeamMemberRole,
  removeTeamMember,
  reactivateTeamMember,
  assignToProject,
  unassignFromProject,
  getProjectTeam,
  getMemberProjects,
  hasProjectAccess,
  getTeamStats,
};
