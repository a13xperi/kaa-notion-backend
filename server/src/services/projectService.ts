import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { getMilestoneTemplates, calculateMilestoneDueDates, getTierName } from '../utils/milestoneTemplates';

export interface CreateProjectParams {
  clientId: string;
  leadId?: string;
  tier: 1 | 2 | 3 | 4;
  name?: string;
  projectAddress?: string;
}

export interface CreateProjectResult {
  project: {
    id: string;
    name: string;
    tier: number;
    status: string;
    projectAddress: string | null;
  };
  milestones: Array<{
    id: string;
    name: string;
    order: number;
    status: string;
    dueDate: Date | null;
  }>;
}

/**
 * Create a new project with tier-specific milestones
 */
export async function createProjectWithMilestones(
  params: CreateProjectParams
): Promise<CreateProjectResult> {
  const { clientId, leadId, tier, name, projectAddress } = params;

  // Get milestone templates for this tier
  const milestoneConfig = getMilestoneTemplates(tier);
  const milestonesWithDates = calculateMilestoneDueDates(tier);

  // Generate project name if not provided
  const projectName = name || `${getTierName(tier)} Project`;

  // Create project and milestones in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create project
    const project = await tx.project.create({
      data: {
        clientId,
        leadId,
        tier,
        name: projectName,
        projectAddress,
        status: 'INTAKE',
        paymentStatus: 'pending',
      },
    });

    // Create milestones
    const milestones = await Promise.all(
      milestonesWithDates.map((template) =>
        tx.milestone.create({
          data: {
            projectId: project.id,
            tier,
            name: template.name,
            order: template.order,
            status: 'PENDING',
            dueDate: template.dueDate,
          },
        })
      )
    );

    // Mark first milestone as in progress
    if (milestones.length > 0) {
      await tx.milestone.update({
        where: { id: milestones[0].id },
        data: { status: 'IN_PROGRESS' },
      });
      milestones[0].status = 'IN_PROGRESS';
    }

    return { project, milestones };
  });

  return {
    project: {
      id: result.project.id,
      name: result.project.name,
      tier: result.project.tier,
      status: result.project.status,
      projectAddress: result.project.projectAddress,
    },
    milestones: result.milestones.map((m) => ({
      id: m.id,
      name: m.name,
      order: m.order,
      status: m.status,
      dueDate: m.dueDate,
    })),
  };
}

/**
 * Get project by ID with all related data
 */
export async function getProjectById(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: {
        select: {
          id: true,
          tier: true,
          status: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      milestones: {
        orderBy: { order: 'asc' },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
      deliverables: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

/**
 * Get projects for a client
 */
export async function getProjectsByClientId(clientId: string) {
  return prisma.project.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    include: {
      milestones: {
        orderBy: { order: 'asc' },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          status: true,
          paidAt: true,
        },
      },
    },
  });
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  projectId: string,
  status: 'INTAKE' | 'ONBOARDING' | 'IN_PROGRESS' | 'AWAITING_FEEDBACK' | 'REVISIONS' | 'DELIVERED' | 'CLOSED'
) {
  return prisma.project.update({
    where: { id: projectId },
    data: { status },
  });
}

/**
 * Update milestone status
 */
export async function updateMilestoneStatus(
  milestoneId: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
) {
  const updateData: Prisma.MilestoneUpdateInput = { status };

  if (status === 'COMPLETED') {
    updateData.completedAt = new Date();
  }

  const milestone = await prisma.milestone.update({
    where: { id: milestoneId },
    data: updateData,
    include: {
      project: true,
    },
  });

  // If milestone completed, check if we should start the next one
  if (status === 'COMPLETED') {
    const nextMilestone = await prisma.milestone.findFirst({
      where: {
        projectId: milestone.projectId,
        order: milestone.order + 1,
        status: 'PENDING',
      },
    });

    if (nextMilestone) {
      await prisma.milestone.update({
        where: { id: nextMilestone.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Check if all milestones are completed
    const pendingMilestones = await prisma.milestone.count({
      where: {
        projectId: milestone.projectId,
        status: { not: 'COMPLETED' },
      },
    });

    if (pendingMilestones === 0) {
      // All milestones completed - update project status
      await prisma.project.update({
        where: { id: milestone.projectId },
        data: { status: 'DELIVERED' },
      });
    }
  }

  return milestone;
}

/**
 * Get all projects with pagination (admin)
 */
export async function getProjects(options: {
  page?: number;
  limit?: number;
  tier?: number;
  status?: string;
  clientId?: string;
}) {
  const { page = 1, limit = 20, tier, status, clientId } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.ProjectWhereInput = {};

  if (tier) {
    where.tier = tier;
  }

  if (status) {
    where.status = status as Prisma.EnumProjectStatusFilter;
  }

  if (clientId) {
    where.clientId = clientId;
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            tier: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        milestones: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            status: true,
            order: true,
          },
        },
        _count: {
          select: {
            deliverables: true,
            payments: true,
          },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Calculate project progress based on milestones
 */
export async function getProjectProgress(projectId: string): Promise<{
  completed: number;
  total: number;
  percentage: number;
  currentMilestone: string | null;
}> {
  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  });

  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === 'COMPLETED').length;
  const currentMilestone = milestones.find((m) => m.status === 'IN_PROGRESS');

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    currentMilestone: currentMilestone?.name || null,
  };
}
