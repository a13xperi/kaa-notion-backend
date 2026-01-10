/**
 * Prisma Database Adapter
 * Implements the DatabaseAdapter interface for use with Prisma ORM.
 *
 * This adapter provides the bridge between the abstract ProjectService
 * and the concrete Prisma database implementation.
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import {
  DatabaseAdapter,
  ClientRecord,
  LeadRecord,
  ProjectRecord,
  MilestoneRecord,
  PaymentRecord,
  CreateProjectData,
  CreateMilestoneData,
  CreatePaymentData,
  ClientStatus,
  LeadStatus,
  ProjectStatus,
  MilestoneStatus,
  PaymentStatus,
} from './projectService';

// ============================================================================
// PRISMA DATABASE ADAPTER
// ============================================================================

export class PrismaDatabaseAdapter implements DatabaseAdapter {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // -------------------------------------------------------------------------
  // Client Operations
  // -------------------------------------------------------------------------

  async findClientById(id: string): Promise<ClientRecord | null> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) return null;

    return {
      id: client.id,
      userId: client.userId,
      tier: client.tier,
      status: client.status as ClientStatus,
      projectAddress: client.projectAddress,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  async updateClient(id: string, data: Partial<ClientRecord>): Promise<ClientRecord> {
    const client = await this.prisma.client.update({
      where: { id },
      data: {
        tier: data.tier,
        status: data.status,
        projectAddress: data.projectAddress,
      },
    });

    return {
      id: client.id,
      userId: client.userId,
      tier: client.tier,
      status: client.status as ClientStatus,
      projectAddress: client.projectAddress,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  // -------------------------------------------------------------------------
  // Lead Operations
  // -------------------------------------------------------------------------

  async findLeadById(id: string): Promise<LeadRecord | null> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) return null;

    return {
      id: lead.id,
      email: lead.email,
      name: lead.name,
      projectAddress: lead.projectAddress,
      budgetRange: lead.budgetRange,
      timeline: lead.timeline,
      projectType: lead.projectType,
      hasSurvey: lead.hasSurvey,
      hasDrawings: lead.hasDrawings,
      recommendedTier: lead.recommendedTier,
      routingReason: lead.routingReason,
      status: lead.status as LeadStatus,
      clientId: lead.clientId,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }

  async updateLead(id: string, data: Partial<LeadRecord>): Promise<LeadRecord> {
    const lead = await this.prisma.lead.update({
      where: { id },
      data: {
        status: data.status,
        clientId: data.clientId,
      },
    });

    return {
      id: lead.id,
      email: lead.email,
      name: lead.name,
      projectAddress: lead.projectAddress,
      budgetRange: lead.budgetRange,
      timeline: lead.timeline,
      projectType: lead.projectType,
      hasSurvey: lead.hasSurvey,
      hasDrawings: lead.hasDrawings,
      recommendedTier: lead.recommendedTier,
      routingReason: lead.routingReason,
      status: lead.status as LeadStatus,
      clientId: lead.clientId,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }

  // -------------------------------------------------------------------------
  // Project Operations
  // -------------------------------------------------------------------------

  async createProject(data: CreateProjectData): Promise<ProjectRecord> {
    const project = await this.prisma.project.create({
      data: {
        clientId: data.clientId,
        leadId: data.leadId,
        tier: data.tier,
        name: data.name,
        status: data.status,
        paymentStatus: data.paymentStatus,
      },
    });

    return {
      id: project.id,
      clientId: project.clientId,
      leadId: project.leadId,
      tier: project.tier,
      status: project.status as ProjectStatus,
      name: project.name,
      notionPageId: project.notionPageId,
      paymentStatus: project.paymentStatus,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async findProjectById(id: string): Promise<ProjectRecord | null> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) return null;

    return {
      id: project.id,
      clientId: project.clientId,
      leadId: project.leadId,
      tier: project.tier,
      status: project.status as ProjectStatus,
      name: project.name,
      notionPageId: project.notionPageId,
      paymentStatus: project.paymentStatus,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async findProjectsByClientId(clientId: string): Promise<ProjectRecord[]> {
    const projects = await this.prisma.project.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((project) => ({
      id: project.id,
      clientId: project.clientId,
      leadId: project.leadId,
      tier: project.tier,
      status: project.status as ProjectStatus,
      name: project.name,
      notionPageId: project.notionPageId,
      paymentStatus: project.paymentStatus,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));
  }

  async updateProject(id: string, data: Partial<ProjectRecord>): Promise<ProjectRecord> {
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        status: data.status,
        paymentStatus: data.paymentStatus,
        notionPageId: data.notionPageId,
      },
    });

    return {
      id: project.id,
      clientId: project.clientId,
      leadId: project.leadId,
      tier: project.tier,
      status: project.status as ProjectStatus,
      name: project.name,
      notionPageId: project.notionPageId,
      paymentStatus: project.paymentStatus,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  // -------------------------------------------------------------------------
  // Milestone Operations
  // -------------------------------------------------------------------------

  async createMilestones(data: CreateMilestoneData[]): Promise<MilestoneRecord[]> {
    const milestones = await Promise.all(
      data.map((milestone) =>
        this.prisma.milestone.create({
          data: {
            projectId: milestone.projectId,
            tier: milestone.tier,
            name: milestone.name,
            order: milestone.order,
            status: milestone.status,
            dueDate: milestone.dueDate,
          },
        })
      )
    );

    return milestones.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      tier: m.tier,
      name: m.name,
      order: m.order,
      status: m.status as MilestoneStatus,
      dueDate: m.dueDate,
      completedAt: m.completedAt,
      createdAt: m.createdAt,
    }));
  }

  async findMilestonesByProjectId(projectId: string): Promise<MilestoneRecord[]> {
    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    return milestones.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      tier: m.tier,
      name: m.name,
      order: m.order,
      status: m.status as MilestoneStatus,
      dueDate: m.dueDate,
      completedAt: m.completedAt,
      createdAt: m.createdAt,
    }));
  }

  // -------------------------------------------------------------------------
  // Payment Operations
  // -------------------------------------------------------------------------

  async createPayment(data: CreatePaymentData): Promise<PaymentRecord> {
    const payment = await this.prisma.payment.create({
      data: {
        projectId: data.projectId,
        stripePaymentIntentId: data.stripePaymentIntentId,
        stripeCustomerId: data.stripeCustomerId,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        tier: data.tier,
      },
    });

    return {
      id: payment.id,
      projectId: payment.projectId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      stripeCustomerId: payment.stripeCustomerId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status as PaymentStatus,
      tier: payment.tier,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  async findPaymentsByProjectId(projectId: string): Promise<PaymentRecord[]> {
    const payments = await this.prisma.payment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      stripePaymentIntentId: p.stripePaymentIntentId,
      stripeCustomerId: p.stripeCustomerId,
      amount: p.amount,
      currency: p.currency,
      status: p.status as PaymentStatus,
      tier: p.tier,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  // -------------------------------------------------------------------------
  // Transaction Support
  // -------------------------------------------------------------------------

  async transaction<T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // Create a new adapter with the transaction client
      const txAdapter = new PrismaDatabaseAdapter(tx as unknown as PrismaClient);
      return fn(txAdapter);
    });
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a PrismaDatabaseAdapter instance
 * @param prisma PrismaClient instance
 */
export function createPrismaAdapter(prisma: PrismaClient): PrismaDatabaseAdapter {
  return new PrismaDatabaseAdapter(prisma);
}
