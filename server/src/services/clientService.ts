import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';

export interface CreateClientFromLeadParams {
  leadId: string;
  tier: 1 | 2 | 3 | 4;
  stripeCustomerId?: string | null;
  stripePaymentIntentId: string;
  stripeCheckoutSessionId?: string;
  amount: number;
  currency?: string;
}

export interface CreateClientResult {
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
  client: {
    id: string;
    tier: number;
    status: string;
  };
  project: {
    id: string;
    name: string;
    tier: number;
    status: string;
  };
  payment: {
    id: string;
    amount: number;
    status: string;
  };
}

/**
 * Create a client from a lead after successful payment
 * This is an atomic operation that creates user, client, project, and payment
 */
export async function createClientFromLead(
  params: CreateClientFromLeadParams
): Promise<CreateClientResult> {
  const {
    leadId,
    tier,
    stripeCustomerId,
    stripePaymentIntentId,
    stripeCheckoutSessionId,
    amount,
    currency = 'USD',
  } = params;

  // Fetch the lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  if (lead.status === 'CONVERTED') {
    throw new Error(`Lead already converted: ${leadId}`);
  }

  // Check for existing payment with this intent (idempotency)
  const existingPayment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId },
    include: {
      project: {
        include: {
          client: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (existingPayment) {
    // Return existing records
    const client = existingPayment.project.client;
    return {
      user: {
        id: client.user.id,
        email: client.user.email,
        name: client.user.name,
      },
      client: {
        id: client.id,
        tier: client.tier,
        status: client.status,
      },
      project: {
        id: existingPayment.project.id,
        name: existingPayment.project.name,
        tier: existingPayment.project.tier,
        status: existingPayment.project.status,
      },
      payment: {
        id: existingPayment.id,
        amount: existingPayment.amount,
        status: existingPayment.status,
      },
    };
  }

  // Create everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find or create user
    let user = await tx.user.findUnique({
      where: { email: lead.email },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          email: lead.email,
          name: lead.name,
          role: 'CLIENT',
          userType: 'SAGE_CLIENT',
        },
      });
    }

    // 2. Create client
    const client = await tx.client.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        tier,
        status: 'ACTIVE',
        projectAddress: lead.projectAddress,
        stripeCustomerId,
      },
    });

    // 3. Create project
    const tierNames: Record<number, string> = {
      1: 'Seedling',
      2: 'Sprout',
      3: 'Canopy',
      4: 'Legacy',
    };

    const project = await tx.project.create({
      data: {
        clientId: client.id,
        leadId: lead.id,
        tier,
        name: `${lead.name || 'Project'} - ${tierNames[tier] || `Tier ${tier}`}`,
        projectAddress: lead.projectAddress,
        status: 'INTAKE',
        paymentStatus: 'paid',
      },
    });

    // 4. Create payment record
    const payment = await tx.payment.create({
      data: {
        projectId: project.id,
        stripePaymentIntentId,
        stripeCheckoutSessionId,
        stripeCustomerId,
        amount,
        currency: currency.toUpperCase(),
        status: 'SUCCEEDED',
        tier,
        paidAt: new Date(),
      },
    });

    // 5. Update lead status
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        status: 'CONVERTED',
        clientId: client.id,
      },
    });

    return { user, client, project, payment };
  });

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    },
    client: {
      id: result.client.id,
      tier: result.client.tier,
      status: result.client.status,
    },
    project: {
      id: result.project.id,
      name: result.project.name,
      tier: result.project.tier,
      status: result.project.status,
    },
    payment: {
      id: result.payment.id,
      amount: result.payment.amount,
      status: result.payment.status,
    },
  };
}

/**
 * Get client by user ID
 */
export async function getClientByUserId(userId: string) {
  return prisma.client.findUnique({
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
      projects: {
        orderBy: { createdAt: 'desc' },
        include: {
          milestones: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });
}

/**
 * Get client by lead ID
 */
export async function getClientByLeadId(leadId: string) {
  return prisma.client.findUnique({
    where: { leadId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      projects: true,
    },
  });
}

/**
 * Update client status
 */
export async function updateClientStatus(
  clientId: string,
  status: 'ONBOARDING' | 'ACTIVE' | 'COMPLETED' | 'CLOSED'
) {
  return prisma.client.update({
    where: { id: clientId },
    data: { status },
  });
}

/**
 * Get all clients with pagination
 */
export async function getClients(options: {
  page?: number;
  limit?: number;
  tier?: number;
  status?: string;
}) {
  const { page = 1, limit = 20, tier, status } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.ClientWhereInput = {};

  if (tier) {
    where.tier = tier;
  }

  if (status) {
    where.status = status as 'ONBOARDING' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);

  return {
    clients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
