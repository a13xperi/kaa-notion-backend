/**
 * Multi-Project Service
 * Handles project limits, archiving, and multi-project management
 */

import { Project, ProjectStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';

// ============================================
// TIER PROJECT LIMITS
// ============================================

/**
 * Default project limits per tier
 */
export const TIER_PROJECT_LIMITS: Record<number, number> = {
  1: 1,   // Seedling - 1 project
  2: 3,   // Sprout - 3 projects
  3: 5,   // Canopy - 5 projects
  4: -1,  // KAA White Glove - unlimited (-1)
};

/**
 * Get project limit for a tier
 */
export function getProjectLimit(tier: number): number {
  return TIER_PROJECT_LIMITS[tier] ?? 1;
}

/**
 * Check if client can create a new project
 */
export async function canCreateProject(clientId: string): Promise<{
  allowed: boolean;
  currentCount: number;
  maxProjects: number;
  reason?: string;
}> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      projects: {
        where: {
          archivedAt: null, // Only count active (non-archived) projects
        },
      },
    },
  });

  if (!client) {
    return {
      allowed: false,
      currentCount: 0,
      maxProjects: 0,
      reason: 'Client not found',
    };
  }

  const maxProjects = client.maxProjects;
  const currentCount = client.projects.length;

  // Unlimited projects
  if (maxProjects === -1) {
    return {
      allowed: true,
      currentCount,
      maxProjects: -1,
    };
  }

  if (currentCount >= maxProjects) {
    return {
      allowed: false,
      currentCount,
      maxProjects,
      reason: `Project limit reached. You have ${currentCount}/${maxProjects} active projects. Archive a project or upgrade your tier.`,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxProjects,
  };
}

/**
 * Set max projects for a client based on tier
 */
export async function updateClientProjectLimit(
  clientId: string,
  tier: number
): Promise<void> {
  const maxProjects = getProjectLimit(tier);

  await prisma.client.update({
    where: { id: clientId },
    data: { maxProjects },
  });
}

// ============================================
// PROJECT ARCHIVING
// ============================================

/**
 * Archive a project
 */
export async function archiveProject(
  projectId: string,
  userId: string
): Promise<Project> {
  // Verify project exists and user has access
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      client: {
        userId,
      },
    },
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  if (project.archivedAt) {
    throw new Error('Project is already archived');
  }

  // Only allow archiving completed or closed projects
  const archivableStatuses: ProjectStatus[] = ['DELIVERED', 'CLOSED'];
  if (!archivableStatuses.includes(project.status)) {
    throw new Error(
      `Cannot archive project with status "${project.status}". Project must be delivered or closed.`
    );
  }

  return prisma.project.update({
    where: { id: projectId },
    data: {
      archivedAt: new Date(),
    },
  });
}

/**
 * Restore an archived project
 */
export async function restoreProject(
  projectId: string,
  userId: string
): Promise<Project> {
  // Verify project exists and user has access
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      client: {
        userId,
      },
    },
    include: {
      client: true,
    },
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  if (!project.archivedAt) {
    throw new Error('Project is not archived');
  }

  // Check if client can have another active project
  const canCreate = await canCreateProject(project.clientId);
  if (!canCreate.allowed) {
    throw new Error(canCreate.reason || 'Cannot restore project - project limit reached');
  }

  return prisma.project.update({
    where: { id: projectId },
    data: {
      archivedAt: null,
    },
  });
}

/**
 * Get archived projects for a client
 */
export async function getArchivedProjects(
  clientId: string,
  options: {
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  projects: Project[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(Math.max(1, options.limit || 10), 50);
  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: {
        clientId,
        archivedAt: { not: null },
      },
      orderBy: { archivedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.project.count({
      where: {
        clientId,
        archivedAt: { not: null },
      },
    }),
  ]);

  return {
    projects,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================
// PROJECT SWITCHING
// ============================================

/**
 * Get all active projects for a user (for project switcher)
 */
export async function getActiveProjects(userId: string): Promise<
  Array<{
    id: string;
    name: string;
    status: ProjectStatus;
    projectAddress: string | null;
    tier: number;
    progress: number;
    updatedAt: Date;
  }>
> {
  const client = await prisma.client.findUnique({
    where: { userId },
  });

  if (!client) {
    return [];
  }

  const projects = await prisma.project.findMany({
    where: {
      clientId: client.id,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      status: true,
      projectAddress: true,
      tier: true,
      updatedAt: true,
      milestones: {
        select: {
          status: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return projects.map((project) => {
    const totalMilestones = project.milestones.length;
    const completedMilestones = project.milestones.filter(
      (m) => m.status === 'COMPLETED'
    ).length;
    const progress = totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      projectAddress: project.projectAddress,
      tier: project.tier,
      progress,
      updatedAt: project.updatedAt,
    };
  });
}

/**
 * Get project summary for dashboard
 */
export async function getProjectSummary(userId: string): Promise<{
  activeCount: number;
  archivedCount: number;
  maxProjects: number;
  canCreateNew: boolean;
}> {
  const client = await prisma.client.findUnique({
    where: { userId },
    include: {
      projects: {
        select: {
          archivedAt: true,
        },
      },
    },
  });

  if (!client) {
    return {
      activeCount: 0,
      archivedCount: 0,
      maxProjects: 1,
      canCreateNew: false,
    };
  }

  const activeCount = client.projects.filter((p) => !p.archivedAt).length;
  const archivedCount = client.projects.filter((p) => p.archivedAt).length;
  const maxProjects = client.maxProjects;
  const canCreateNew = maxProjects === -1 || activeCount < maxProjects;

  return {
    activeCount,
    archivedCount,
    maxProjects,
    canCreateNew,
  };
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Update project limit for a client (admin only)
 */
export async function setClientProjectLimit(
  clientId: string,
  maxProjects: number
): Promise<void> {
  await prisma.client.update({
    where: { id: clientId },
    data: { maxProjects },
  });
}

/**
 * Force archive a project (admin only)
 */
export async function forceArchiveProject(projectId: string): Promise<Project> {
  return prisma.project.update({
    where: { id: projectId },
    data: {
      archivedAt: new Date(),
    },
  });
}

/**
 * Get projects nearing archive (delivered for 30+ days)
 */
export async function getProjectsNearingArchive(): Promise<Project[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return prisma.project.findMany({
    where: {
      status: 'DELIVERED',
      archivedAt: null,
      updatedAt: {
        lt: thirtyDaysAgo,
      },
    },
    include: {
      client: {
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export default {
  TIER_PROJECT_LIMITS,
  getProjectLimit,
  canCreateProject,
  updateClientProjectLimit,
  archiveProject,
  restoreProject,
  getArchivedProjects,
  getActiveProjects,
  getProjectSummary,
  setClientProjectLimit,
  forceArchiveProject,
  getProjectsNearingArchive,
};
