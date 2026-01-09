/**
 * Admin Routes
 * API endpoints for admin dashboard and management.
 *
 * Routes:
 * - GET /api/admin/dashboard - Dashboard stats (leads, projects, revenue)
 * - GET /api/admin/leads - All leads with filtering, sorting, pagination
 * - GET /api/admin/projects - All projects with filtering, sorting, pagination
 * - GET /api/admin/clients - All clients with tier, status, project count
 */

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, requireAuth, requireAdmin } from './projects';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  leads: {
    total: number;
    byStatus: Record<string, number>;
    thisMonth: number;
    conversionRate: number;
  };
  projects: {
    total: number;
    active: number;
    byTier: Record<number, number>;
    byStatus: Record<string, number>;
  };
  clients: {
    total: number;
    active: number;
    byTier: Record<number, number>;
  };
  revenue: {
    total: number;
    thisMonth: number;
    byTier: Record<number, number>;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
  }>;
}

interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parsePaginationParams(query: any): PaginationParams {
  return {
    page: Math.max(1, parseInt(query.page || '1')),
    limit: Math.min(100, Math.max(1, parseInt(query.limit || '20'))),
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// ============================================================================
// ROUTE FACTORY
// ============================================================================

export function createAdminRouter(prisma: PrismaClient): Router {
  const router = Router();

  // -------------------------------------------------------------------------
  // GET /api/admin/dashboard - Dashboard stats
  // -------------------------------------------------------------------------
  router.get('/dashboard', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const startOfMonth = getStartOfMonth();

      // Parallel queries for dashboard stats
      const [
        // Leads stats
        totalLeads,
        leadsThisMonth,
        leadsByStatus,
        convertedLeads,

        // Projects stats
        totalProjects,
        activeProjects,
        projectsByTier,
        projectsByStatus,

        // Clients stats
        totalClients,
        activeClients,
        clientsByTier,

        // Revenue stats
        totalRevenue,
        revenueThisMonth,
        revenueByTier,

        // Recent activity
        recentAuditLogs,
      ] = await Promise.all([
        // Leads
        prisma.lead.count(),
        prisma.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.lead.groupBy({ by: ['status'], _count: true }),
        prisma.lead.count({ where: { status: 'CLOSED', clientId: { not: null } } }),

        // Projects
        prisma.project.count(),
        prisma.project.count({
          where: { status: { notIn: ['DELIVERED', 'CLOSED'] } },
        }),
        prisma.project.groupBy({ by: ['tier'], _count: true }),
        prisma.project.groupBy({ by: ['status'], _count: true }),

        // Clients
        prisma.client.count(),
        prisma.client.count({ where: { status: 'ACTIVE' } }),
        prisma.client.groupBy({ by: ['tier'], _count: true }),

        // Revenue
        prisma.payment.aggregate({
          where: { status: 'SUCCEEDED' },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { status: 'SUCCEEDED', createdAt: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        prisma.payment.groupBy({
          by: ['tier'],
          where: { status: 'SUCCEEDED' },
          _sum: { amount: true },
        }),

        // Recent activity
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { email: true } },
          },
        }),
      ]);

      // Transform grouped data
      const leadsByStatusMap: Record<string, number> = {};
      leadsByStatus.forEach((item) => {
        leadsByStatusMap[item.status] = item._count;
      });

      const projectsByTierMap: Record<number, number> = {};
      projectsByTier.forEach((item) => {
        projectsByTierMap[item.tier] = item._count;
      });

      const projectsByStatusMap: Record<string, number> = {};
      projectsByStatus.forEach((item) => {
        projectsByStatusMap[item.status] = item._count;
      });

      const clientsByTierMap: Record<number, number> = {};
      clientsByTier.forEach((item) => {
        clientsByTierMap[item.tier] = item._count;
      });

      const revenueByTierMap: Record<number, number> = {};
      revenueByTier.forEach((item) => {
        revenueByTierMap[item.tier] = item._sum.amount || 0;
      });

      // Calculate conversion rate
      const conversionRate = totalLeads > 0 
        ? Math.round((convertedLeads / totalLeads) * 100) 
        : 0;

      // Format recent activity
      const recentActivity = recentAuditLogs.map((log) => ({
        id: log.id,
        type: log.action,
        description: `${log.user?.email || 'System'} ${log.action.replace('_', ' ')} ${log.resourceType || ''}`,
        timestamp: log.createdAt,
      }));

      const stats: DashboardStats = {
        leads: {
          total: totalLeads,
          byStatus: leadsByStatusMap,
          thisMonth: leadsThisMonth,
          conversionRate,
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
          byTier: projectsByTierMap,
          byStatus: projectsByStatusMap,
        },
        clients: {
          total: totalClients,
          active: activeClients,
          byTier: clientsByTierMap,
        },
        revenue: {
          total: totalRevenue._sum.amount || 0,
          thisMonth: revenueThisMonth._sum.amount || 0,
          byTier: revenueByTierMap,
        },
        recentActivity,
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch dashboard stats',
          details: error instanceof Error ? error.message : undefined,
        },
      });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/leads - All leads with filtering
  // -------------------------------------------------------------------------
  router.get('/leads', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page, limit, sortBy, sortOrder } = parsePaginationParams(req.query);
      const { status, tier, search, startDate, endDate } = req.query;

      // Build where clause
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (tier) {
        where.recommendedTier = parseInt(tier as string);
      }

      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { name: { contains: search as string, mode: 'insensitive' } },
          { projectAddress: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Get total count
      const total = await prisma.lead.count({ where });

      // Get leads
      const leads = await prisma.lead.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              status: true,
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
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      });

      res.json({
        success: true,
        data: leads.map((lead) => ({
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
          status: lead.status,
          isConverted: !!lead.clientId,
          client: lead.client,
          projects: lead.projects,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        })),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching leads:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch leads',
          details: error instanceof Error ? error.message : undefined,
        },
      });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/projects - All projects with filtering
  // -------------------------------------------------------------------------
  router.get('/projects', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page, limit, sortBy, sortOrder } = parsePaginationParams(req.query);
      const { status, tier, paymentStatus, search } = req.query;

      // Build where clause
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (tier) {
        where.tier = parseInt(tier as string);
      }

      if (paymentStatus) {
        where.paymentStatus = paymentStatus;
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { client: { projectAddress: { contains: search as string, mode: 'insensitive' } } },
        ];
      }

      // Get total count
      const total = await prisma.project.count({ where });

      // Get projects
      const projects = await prisma.project.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              tier: true,
              status: true,
              projectAddress: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          milestones: {
            select: {
              id: true,
              status: true,
            },
          },
          payments: {
            where: { status: 'SUCCEEDED' },
            select: {
              amount: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      });

      res.json({
        success: true,
        data: projects.map((project) => {
          const totalMilestones = project.milestones.length;
          const completedMilestones = project.milestones.filter(
            (m) => m.status === 'COMPLETED'
          ).length;
          const totalPaid = project.payments.reduce((sum, p) => sum + p.amount, 0);

          return {
            id: project.id,
            name: project.name,
            tier: project.tier,
            status: project.status,
            paymentStatus: project.paymentStatus,
            notionPageId: project.notionPageId,
            client: {
              id: project.client.id,
              email: project.client.user.email,
              projectAddress: project.client.projectAddress,
              status: project.client.status,
            },
            progress: {
              completed: completedMilestones,
              total: totalMilestones,
              percentage: totalMilestones > 0
                ? Math.round((completedMilestones / totalMilestones) * 100)
                : 0,
            },
            totalPaid,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          };
        }),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch projects',
          details: error instanceof Error ? error.message : undefined,
        },
      });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/clients - All clients with stats
  // -------------------------------------------------------------------------
  router.get('/clients', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page, limit, sortBy, sortOrder } = parsePaginationParams(req.query);
      const { status, tier, search } = req.query;

      // Build where clause
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (tier) {
        where.tier = parseInt(tier as string);
      }

      if (search) {
        where.OR = [
          { user: { email: { contains: search as string, mode: 'insensitive' } } },
          { projectAddress: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await prisma.client.count({ where });

      // Get clients
      const clients = await prisma.client.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              lastLogin: true,
            },
          },
          projects: {
            select: {
              id: true,
              name: true,
              status: true,
              tier: true,
            },
          },
          leads: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      });

      // Get payment totals for each client
      const clientIds = clients.map((c) => c.id);
      const payments = await prisma.payment.groupBy({
        by: ['projectId'],
        where: {
          status: 'SUCCEEDED',
          project: { clientId: { in: clientIds } },
        },
        _sum: { amount: true },
      });

      // Create payment map
      const paymentMap = new Map<string, number>();
      for (const client of clients) {
        const projectIds = client.projects.map((p) => p.id);
        const total = payments
          .filter((p) => projectIds.includes(p.projectId))
          .reduce((sum, p) => sum + (p._sum.amount || 0), 0);
        paymentMap.set(client.id, total);
      }

      res.json({
        success: true,
        data: clients.map((client) => ({
          id: client.id,
          userId: client.userId,
          email: client.user.email,
          tier: client.tier,
          status: client.status,
          projectAddress: client.projectAddress,
          lastLogin: client.user.lastLogin,
          stats: {
            projectCount: client.projects.length,
            activeProjects: client.projects.filter(
              (p) => p.status !== 'DELIVERED' && p.status !== 'CLOSED'
            ).length,
            leadCount: client.leads.length,
            totalPaid: paymentMap.get(client.id) || 0,
          },
          projects: client.projects.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            tier: p.tier,
          })),
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
        })),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching clients:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch clients',
          details: error instanceof Error ? error.message : undefined,
        },
      });
    }
  });

  return router;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default createAdminRouter;
