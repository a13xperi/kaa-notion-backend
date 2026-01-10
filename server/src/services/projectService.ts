/**
 * Project Service
 * Handles project creation with tier-specific milestones after payment.
 *
 * This service is responsible for:
 * - Creating projects from successful payments
 * - Generating tier-specific milestones
 * - Linking projects to clients and leads
 * - Updating related entities (client status, lead status)
 */

import {
  TierId,
  getMilestoneTemplates,
  generateMilestoneDueDates,
  getEstimatedCompletionDate,
  isValidTier,
  getTierConfig,
} from './milestoneTemplates';
import { logger } from '../logger';

// ============================================================================
// STATUS ENUMS (matching Prisma schema)
// ============================================================================

export enum ProjectStatus {
  ONBOARDING = 'ONBOARDING',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_FEEDBACK = 'AWAITING_FEEDBACK',
  REVISIONS = 'REVISIONS',
  DELIVERED = 'DELIVERED',
  CLOSED = 'CLOSED',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum LeadStatus {
  NEW = 'NEW',
  QUALIFIED = 'QUALIFIED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  CLOSED = 'CLOSED',
}

export enum ClientStatus {
  ONBOARDING = 'ONBOARDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// ============================================================================
// DATABASE ADAPTER INTERFACE
// ============================================================================

/**
 * Database adapter interface for abstracting database operations
 * This allows the service to work with different database implementations
 */
export interface DatabaseAdapter {
  // Client operations
  findClientById(id: string): Promise<ClientRecord | null>;
  updateClient(id: string, data: Partial<ClientRecord>): Promise<ClientRecord>;

  // Lead operations
  findLeadById(id: string): Promise<LeadRecord | null>;
  updateLead(id: string, data: Partial<LeadRecord>): Promise<LeadRecord>;

  // Project operations
  createProject(data: CreateProjectData): Promise<ProjectRecord>;
  findProjectById(id: string): Promise<ProjectRecord | null>;
  findProjectsByClientId(clientId: string): Promise<ProjectRecord[]>;
  updateProject(id: string, data: Partial<ProjectRecord>): Promise<ProjectRecord>;

  // Milestone operations
  createMilestones(data: CreateMilestoneData[]): Promise<MilestoneRecord[]>;
  findMilestonesByProjectId(projectId: string): Promise<MilestoneRecord[]>;

  // Payment operations
  createPayment(data: CreatePaymentData): Promise<PaymentRecord>;
  findPaymentsByProjectId(projectId: string): Promise<PaymentRecord[]>;

  // Transaction support
  transaction<T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T>;
}

// ============================================================================
// RECORD TYPES (matching Prisma schema)
// ============================================================================

export interface ClientRecord {
  id: string;
  userId: string;
  tier: number;
  status: ClientStatus;
  projectAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadRecord {
  id: string;
  email: string;
  name: string | null;
  projectAddress: string;
  budgetRange: string | null;
  timeline: string | null;
  projectType: string | null;
  hasSurvey: boolean;
  hasDrawings: boolean;
  recommendedTier: number;
  routingReason: string | null;
  status: LeadStatus;
  clientId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectRecord {
  id: string;
  clientId: string;
  leadId: string | null;
  tier: number;
  status: ProjectStatus;
  name: string;
  notionPageId: string | null;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MilestoneRecord {
  id: string;
  projectId: string;
  tier: number;
  name: string;
  order: number;
  status: MilestoneStatus;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface PaymentRecord {
  id: string;
  projectId: string;
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  tier: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CREATE DATA TYPES
// ============================================================================

export interface CreateProjectData {
  clientId: string;
  leadId: string | null;
  tier: number;
  name: string;
  status: ProjectStatus;
  paymentStatus: string;
}

export interface CreateMilestoneData {
  projectId: string;
  tier: number;
  name: string;
  order: number;
  status: MilestoneStatus;
  dueDate: Date | null;
}

export interface CreatePaymentData {
  projectId: string;
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  tier: number;
}

// ============================================================================
// INPUT/OUTPUT TYPES
// ============================================================================

export interface CreateProjectInput {
  /** Client ID (required) */
  clientId: string;
  /** Lead ID (optional - if created from a lead) */
  leadId?: string;
  /** Project tier (1-4, required) */
  tier: TierId;
  /** Project name */
  name: string;
  /** Stripe payment intent ID (for tracking) */
  stripePaymentIntentId?: string;
  /** Stripe customer ID (for tracking) */
  stripeCustomerId?: string;
  /** Payment amount in cents */
  paymentAmount?: number;
}

export interface CreateProjectResult {
  success: boolean;
  project?: {
    id: string;
    name: string;
    tier: number;
    status: ProjectStatus;
    clientId: string;
    leadId: string | null;
    createdAt: Date;
  };
  milestones?: Array<{
    id: string;
    name: string;
    order: number;
    status: MilestoneStatus;
    dueDate: Date | null;
  }>;
  payment?: {
    id: string;
    amount: number;
    status: string;
  };
  estimatedCompletionDate?: Date | null;
  error?: string;
}

export interface ProjectWithDetails {
  id: string;
  name: string;
  tier: number;
  status: ProjectStatus;
  clientId: string;
  leadId: string | null;
  notionPageId: string | null;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  client: {
    id: string;
    tier: number;
    status: ClientStatus;
    projectAddress: string;
  };
  milestones: Array<{
    id: string;
    name: string;
    order: number;
    status: MilestoneStatus;
    dueDate: Date | null;
    completedAt: Date | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: Date;
  }>;
}

// ============================================================================
// PROJECT SERVICE CLASS
// ============================================================================

export class ProjectService {
  private db: DatabaseAdapter;

  constructor(databaseAdapter: DatabaseAdapter) {
    this.db = databaseAdapter;
  }

  /**
   * Create a new project with tier-specific milestones
   * Called after successful payment completion
   */
  async createProjectWithMilestones(input: CreateProjectInput): Promise<CreateProjectResult> {
    const { clientId, leadId, tier, name, stripePaymentIntentId, stripeCustomerId, paymentAmount } =
      input;

    // Validate tier
    if (!isValidTier(tier)) {
      return {
        success: false,
        error: `Invalid tier: ${tier}. Must be 1, 2, 3, or 4.`,
      };
    }

    try {
      // Verify client exists
      const client = await this.db.findClientById(clientId);

      if (!client) {
        return {
          success: false,
          error: `Client not found: ${clientId}`,
        };
      }

      // Verify lead exists (if provided)
      if (leadId) {
        const lead = await this.db.findLeadById(leadId);

        if (!lead) {
          return {
            success: false,
            error: `Lead not found: ${leadId}`,
          };
        }
      }

      // Generate milestone templates with due dates
      const projectStartDate = new Date();
      const milestoneData = generateMilestoneDueDates(tier, projectStartDate);
      const estimatedCompletionDate = getEstimatedCompletionDate(tier, projectStartDate);

      // Create project with milestones in a transaction
      const result = await this.db.transaction(async (tx) => {
        // 1. Create the project
        const project = await tx.createProject({
          clientId,
          leadId: leadId || null,
          tier,
          name,
          status: ProjectStatus.ONBOARDING,
          paymentStatus: stripePaymentIntentId ? 'paid' : 'pending',
        });

        logger.info(`Created project ${project.id} for client ${clientId}, tier ${tier}`);

        // 2. Create milestones for the project
        const milestonesToCreate: CreateMilestoneData[] = milestoneData.map((template) => ({
          projectId: project.id,
          tier,
          name: template.name,
          order: template.order,
          status: template.order === 1 ? MilestoneStatus.IN_PROGRESS : MilestoneStatus.PENDING,
          dueDate: template.dueDate,
        }));

        const milestones = await tx.createMilestones(milestonesToCreate);

        logger.info(`Created ${milestones.length} milestones for project ${project.id}`);

        // 3. Create payment record (if payment info provided)
        let payment: PaymentRecord | null = null;
        if (stripePaymentIntentId && stripeCustomerId && paymentAmount) {
          payment = await tx.createPayment({
            projectId: project.id,
            stripePaymentIntentId,
            stripeCustomerId,
            amount: paymentAmount,
            currency: 'usd',
            status: PaymentStatus.SUCCEEDED,
            tier,
          });

          logger.info(`Created payment record ${payment.id} for project ${project.id}`);
        }

        // 4. Update client status to ACTIVE
        await tx.updateClient(clientId, {
          status: ClientStatus.ACTIVE,
          tier, // Update client tier to match project tier
        });

        // 5. Update lead status to CLOSED (if lead provided)
        if (leadId) {
          await tx.updateLead(leadId, {
            status: LeadStatus.CLOSED,
            clientId, // Link lead to client
          });

          logger.info(`Updated lead ${leadId} status to CLOSED`);
        }

        return { project, milestones, payment };
      });

      return {
        success: true,
        project: {
          id: result.project.id,
          name: result.project.name,
          tier: result.project.tier,
          status: result.project.status,
          clientId: result.project.clientId,
          leadId: result.project.leadId,
          createdAt: result.project.createdAt,
        },
        milestones: result.milestones.map((m) => ({
          id: m.id,
          name: m.name,
          order: m.order,
          status: m.status,
          dueDate: m.dueDate,
        })),
        payment: result.payment
          ? {
              id: result.payment.id,
              amount: result.payment.amount,
              status: result.payment.status,
            }
          : undefined,
        estimatedCompletionDate,
      };
    } catch (error) {
      logger.error('Error creating project with milestones:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      };
    }
  }

  /**
   * Get a project with all its details (client, milestones, payments)
   */
  async getProjectWithDetails(projectId: string): Promise<ProjectWithDetails | null> {
    try {
      const project = await this.db.findProjectById(projectId);

      if (!project) {
        return null;
      }

      const client = await this.db.findClientById(project.clientId);
      if (!client) {
        return null;
      }

      const milestones = await this.db.findMilestonesByProjectId(projectId);
      const payments = await this.db.findPaymentsByProjectId(projectId);

      // Sort milestones by order
      milestones.sort((a, b) => a.order - b.order);

      // Sort payments by date descending
      payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        id: project.id,
        name: project.name,
        tier: project.tier,
        status: project.status,
        clientId: project.clientId,
        leadId: project.leadId,
        notionPageId: project.notionPageId,
        paymentStatus: project.paymentStatus,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        client: {
          id: client.id,
          tier: client.tier,
          status: client.status,
          projectAddress: client.projectAddress,
        },
        milestones: milestones.map((m) => ({
          id: m.id,
          name: m.name,
          order: m.order,
          status: m.status,
          dueDate: m.dueDate,
          completedAt: m.completedAt,
        })),
        payments: payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          createdAt: p.createdAt,
        })),
      };
    } catch (error) {
      logger.error('Error fetching project details:', error);
      throw error;
    }
  }

  /**
   * Get all projects for a client
   */
  async getProjectsByClient(clientId: string): Promise<ProjectWithDetails[]> {
    try {
      const projects = await this.db.findProjectsByClientId(clientId);

      const client = await this.db.findClientById(clientId);
      if (!client) {
        return [];
      }

      const results: ProjectWithDetails[] = [];

      for (const project of projects) {
        const milestones = await this.db.findMilestonesByProjectId(project.id);
        const payments = await this.db.findPaymentsByProjectId(project.id);

        // Sort milestones by order
        milestones.sort((a, b) => a.order - b.order);

        // Sort payments by date descending
        payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        results.push({
          id: project.id,
          name: project.name,
          tier: project.tier,
          status: project.status,
          clientId: project.clientId,
          leadId: project.leadId,
          notionPageId: project.notionPageId,
          paymentStatus: project.paymentStatus,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          client: {
            id: client.id,
            tier: client.tier,
            status: client.status,
            projectAddress: client.projectAddress,
          },
          milestones: milestones.map((m) => ({
            id: m.id,
            name: m.name,
            order: m.order,
            status: m.status,
            dueDate: m.dueDate,
            completedAt: m.completedAt,
          })),
          payments: payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            status: p.status,
            createdAt: p.createdAt,
          })),
        });
      }

      // Sort by creation date descending
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return results;
    } catch (error) {
      logger.error('Error fetching client projects:', error);
      throw error;
    }
  }

  /**
   * Update project status
   */
  async updateProjectStatus(projectId: string, status: ProjectStatus): Promise<boolean> {
    try {
      await this.db.updateProject(projectId, { status });

      logger.info(`Updated project ${projectId} status to ${status}`);
      return true;
    } catch (error) {
      logger.error('Error updating project status:', error);
      return false;
    }
  }

  /**
   * Get project progress (percentage of completed milestones)
   */
  async getProjectProgress(
    projectId: string
  ): Promise<{ completed: number; total: number; percentage: number }> {
    try {
      const milestones = await this.db.findMilestonesByProjectId(projectId);

      const total = milestones.length;
      const completed = milestones.filter((m) => m.status === MilestoneStatus.COMPLETED).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { completed, total, percentage };
    } catch (error) {
      logger.error('Error calculating project progress:', error);
      return { completed: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Get tier configuration (for displaying tier info)
   */
  getTierInfo(tier: TierId) {
    return getTierConfig(tier);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a ProjectService instance
 * @param databaseAdapter Database adapter implementation
 */
export function createProjectService(databaseAdapter: DatabaseAdapter): ProjectService {
  return new ProjectService(databaseAdapter);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { TierId, getMilestoneTemplates, isValidTier } from './milestoneTemplates';
