/**
 * Client Service
 * Handles client creation from leads after payment, linking user/client/lead/project.
 * Supports both functional API (for Stripe webhook flows) and class-based API (for advanced use).
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { hashPassword } from './authService';
import { notFound, conflict, ErrorCodes } from '../utils/AppError';

// ============================================================================
// LOCAL TYPE DEFINITIONS (compatible with Prisma schema)
// ============================================================================

type UserType = 'KAA_CLIENT' | 'SAGE_CLIENT' | 'TEAM' | 'ADMIN';
type ClientStatus = 'ONBOARDING' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';
type LeadStatus = 'NEW' | 'QUALIFIED' | 'NEEDS_REVIEW' | 'CONVERTED' | 'CLOSED';
type ProjectStatus = 'INTAKE' | 'ONBOARDING' | 'IN_PROGRESS' | 'AWAITING_FEEDBACK' | 'REVISIONS' | 'DELIVERED' | 'CLOSED';

interface User {
  id: string;
  email: string | null;
  name?: string | null;
  userType: UserType;
  tier: number | null;
  role?: string;
  passwordHash?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Client {
  id: string;
  userId: string;
  leadId?: string | null;
  tier: number;
  status: ClientStatus;
  projectAddress?: string | null;
  stripeCustomerId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Lead {
  id: string;
  email: string;
  name?: string | null;
  projectAddress?: string | null;
  budgetRange?: string;
  timeline?: string;
  projectType?: string;
  hasSurvey?: boolean;
  hasDrawings?: boolean;
  recommendedTier?: number | null;
  routingReason?: string | null;
  status: LeadStatus;
  tierOverride?: number | null;
  overrideReason?: string | null;
  clientId?: string | null;
  client?: Client | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Project {
  id: string;
  clientId: string;
  leadId?: string | null;
  tier: number;
  name: string;
  status: ProjectStatus;
  paymentStatus?: string;
  projectAddress?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// TYPES - Functional API (Stripe Integration)
// ============================================================================

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

// ============================================================================
// TYPES - Class-based API
// ============================================================================

export interface CreateClientFromLeadInput {
  leadId: string;
  tier: 1 | 2 | 3 | 4;
  password?: string; // Optional - if provided, sets user password
}

export interface CreateClientResultDetailed {
  user: Pick<User, 'id' | 'email' | 'userType' | 'tier'>;
  client: Client;
  project: Project;
  lead: Lead;
}

export interface ClientWithDetails extends Client {
  user: Pick<User, 'id' | 'email' | 'userType' | 'tier'>;
  projects: Project[];
  leads: Lead[];
}

// ============================================================================
// FUNCTIONAL API - Stripe Webhook Integration
// ============================================================================

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
    throw notFound('Lead', ErrorCodes.LEAD_NOT_FOUND, leadId);
  }

  if (lead.status === 'CONVERTED') {
    throw conflict('Lead has already been converted', ErrorCodes.LEAD_ALREADY_CONVERTED, { leadId });
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

  const where: Record<string, unknown> = {};

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

// ============================================================================
// CLASS-BASED API - Client Service Class
// ============================================================================

export class ClientService {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Creates a new client from a lead after successful payment.
   * This is the main conversion flow: Lead -> User -> Client -> Project
   */
  async createClientFromLead(input: CreateClientFromLeadInput): Promise<CreateClientResultDetailed> {
    const { leadId, tier, password } = input;

    // Start transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Get the lead
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
        include: { client: true },
      });

      if (!lead) {
        throw notFound('Lead', ErrorCodes.LEAD_NOT_FOUND, leadId);
      }

      if (lead.client) {
        throw conflict('Lead has already been converted to a client', ErrorCodes.LEAD_ALREADY_CONVERTED);
      }

      // 2. Create or find user by email
      let user = await tx.user.findUnique({
        where: { email: lead.email },
      });

      if (!user) {
        // Hash password if provided, otherwise generate temporary one
        const passwordHash = password
          ? await hashPassword(password)
          : await hashPassword(`temp_${Date.now()}_${Math.random().toString(36).substring(7)}`);

        user = await tx.user.create({
          data: {
            email: lead.email,
            passwordHash,
            userType: tier === 4 ? 'KAA_CLIENT' : 'SAGE_CLIENT',
            tier,
          },
        });
      } else {
        // Update existing user's tier if needed
        user = await tx.user.update({
          where: { id: user.id },
          data: { tier },
        });
      }

      // 3. Create client
      const client = await tx.client.create({
        data: {
          userId: user.id,
          tier,
          status: 'ACTIVE',
          projectAddress: lead.projectAddress,
        },
      });

      // 4. Update lead with client reference
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          clientId: client.id,
          status: 'CLOSED',
          recommendedTier: tier,
        },
      });

      // 5. Create project with tier-specific milestones
      const projectName = lead.projectAddress
        ? `${lead.projectAddress} Project`
        : `Project for ${lead.email}`;

      const project = await tx.project.create({
        data: {
          clientId: client.id,
          leadId: lead.id,
          tier,
          name: projectName,
          status: 'ONBOARDING',
          paymentStatus: 'paid',
        },
      });

      // Create tier-specific milestones
      const milestoneConfigs = this.getMilestoneConfigs(tier);
      const startDate = new Date();

      for (let i = 0; i < milestoneConfigs.length; i++) {
        const config = milestoneConfigs[i];
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + config.dayOffset);

        await tx.milestone.create({
          data: {
            projectId: project.id,
            tier,
            name: config.name,
            status: i === 0 ? 'IN_PROGRESS' : 'PENDING',
            order: i + 1,
            dueDate,
          },
        });
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
          tier: user.tier,
        },
        client,
        project,
        lead: updatedLead,
      };
    });
  }

  /**
   * Get milestone configurations for a tier.
   */
  private getMilestoneConfigs(tier: 1 | 2 | 3 | 4) {
    const configs: Record<
      1 | 2 | 3 | 4,
      Array<{ name: string; description: string; dayOffset: number }>
    > = {
      1: [
        { name: 'Intake', description: 'Initial project intake and requirements gathering', dayOffset: 0 },
        { name: 'Concept', description: 'Conceptual design development', dayOffset: 7 },
        { name: 'Delivery', description: 'Final deliverables', dayOffset: 14 },
      ],
      2: [
        { name: 'Intake', description: 'Initial project intake and requirements gathering', dayOffset: 0 },
        { name: 'Draft', description: 'Initial draft design', dayOffset: 14 },
        { name: 'Review', description: 'Client review and feedback', dayOffset: 21 },
        { name: 'Revisions', description: 'Design revisions based on feedback', dayOffset: 28 },
        { name: 'Final', description: 'Final deliverables', dayOffset: 35 },
      ],
      3: [
        { name: 'Intake', description: 'Initial project intake and site assessment', dayOffset: 0 },
        { name: 'Site Visit', description: 'On-site evaluation and measurements', dayOffset: 7 },
        { name: 'Concept', description: 'Conceptual design presentation', dayOffset: 21 },
        { name: 'Design Development', description: 'Detailed design development', dayOffset: 35 },
        { name: 'Review', description: 'Client review and feedback session', dayOffset: 42 },
        { name: 'Revisions', description: 'Design refinements', dayOffset: 49 },
        { name: 'Final', description: 'Final documentation and deliverables', dayOffset: 56 },
      ],
      4: [
        { name: 'Intake', description: 'Initial project intake and discovery', dayOffset: 0 },
        { name: 'Site Assessment', description: 'Comprehensive site analysis', dayOffset: 14 },
        { name: 'Concept', description: 'Initial concept presentation', dayOffset: 28 },
        { name: 'Design Development', description: 'Detailed design development', dayOffset: 45 },
        { name: 'Coordination', description: 'Contractor and vendor coordination', dayOffset: 60 },
        { name: 'Review', description: 'In-depth client review', dayOffset: 75 },
        { name: 'Revisions', description: 'Multiple revision rounds', dayOffset: 90 },
        { name: 'Implementation', description: 'Project implementation oversight', dayOffset: 120 },
        { name: 'Final Walkthrough', description: 'Final site walkthrough and handoff', dayOffset: 150 },
      ],
    };

    return configs[tier];
  }

  /**
   * Get a client with all related data.
   */
  async getClientWithDetails(clientId: string): Promise<ClientWithDetails | null> {
    return this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            userType: true,
            tier: true,
          },
        },
        projects: true,
        leads: true,
      },
    });
  }

  /**
   * Get a client by user ID.
   */
  async getClientByUserId(userId: string): Promise<ClientWithDetails | null> {
    return this.prisma.client.findFirst({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            userType: true,
            tier: true,
          },
        },
        projects: true,
        leads: true,
      },
    });
  }

  /**
   * Update client status.
   */
  async updateClientStatus(
    clientId: string,
    status: 'ONBOARDING' | 'ACTIVE' | 'COMPLETED' | 'CLOSED'
  ): Promise<Client> {
    return this.prisma.client.update({
      where: { id: clientId },
      data: { status },
    });
  }

  /**
   * List all clients with optional filtering.
   */
  async listClients(
    options: {
      status?: string;
      tier?: number;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ clients: ClientWithDetails[]; total: number }> {
    const { status, tier, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (tier) where.tier = tier;

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              userType: true,
              tier: true,
            },
          },
          projects: true,
          leads: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { clients, total };
  }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

export function createClientService(prismaClient: PrismaClient): ClientService {
  return new ClientService(prismaClient);
}

let clientServiceInstance: ClientService | null = null;

export function initClientService(prismaClient: PrismaClient): ClientService {
  clientServiceInstance = new ClientService(prismaClient);
  return clientServiceInstance;
}

export function getClientService(): ClientService {
  if (!clientServiceInstance) {
    throw new Error('Client service not initialized. Call initClientService first.');
  }
  return clientServiceInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Functional API
  createClientFromLead,
  getClientByUserId,
  getClientByLeadId,
  updateClientStatus,
  getClients,
  // Class-based API
  ClientService,
  createClientService,
  initClientService,
  getClientService,
};
