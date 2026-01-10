/**
 * Client Service
 * Handles client creation from leads after payment, linking user/client/lead/project.
 */

import { PrismaClient, Client, User, Project, Lead } from '@prisma/client';
import { hashPassword } from './authService';
import { ProjectService, createProjectService } from './projectService';
import { createPrismaAdapter } from './prismaAdapter';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateClientFromLeadInput {
  leadId: string;
  tier: 1 | 2 | 3 | 4;
  password?: string; // Optional - if provided, sets user password
}

export interface CreateClientResult {
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
// CLIENT SERVICE CLASS
// ============================================================================

export class ClientService {
  private prisma: PrismaClient;
  private projectService: ProjectService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    const adapter = createPrismaAdapter(prisma);
    this.projectService = createProjectService(adapter);
  }

  /**
   * Creates a new client from a lead after successful payment.
   * This is the main conversion flow: Lead -> User -> Client -> Project
   */
  async createClientFromLead(
    input: CreateClientFromLeadInput
  ): Promise<CreateClientResult> {
    const { leadId, tier, password } = input;

    // Start transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Get the lead
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
        include: { client: true },
      });

      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      if (lead.client) {
        throw new Error('Lead has already been converted to a client');
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
      // Note: We need to use the transaction for creating the project
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

      // Create tier-specific milestones (using project service in non-transactional context)
      // We'll create milestones directly here within the transaction
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
  async listClients(options: {
    status?: string;
    tier?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<{ clients: ClientWithDetails[]; total: number }> {
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
// FACTORY FUNCTION
// ============================================================================

export function createClientService(prisma: PrismaClient): ClientService {
  return new ClientService(prisma);
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let clientServiceInstance: ClientService | null = null;

export function initClientService(prisma: PrismaClient): ClientService {
  clientServiceInstance = new ClientService(prisma);
  return clientServiceInstance;
}

export function getClientService(): ClientService {
  if (!clientServiceInstance) {
    throw new Error('Client service not initialized. Call initClientService first.');
  }
  return clientServiceInstance;
}
