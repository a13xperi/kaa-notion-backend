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

import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { Client as NotionClient } from '@notionhq/client';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { getPageTitle, mapNotionStatusToPostgres } from '../utils/notionHelpers';
import { logger } from '../config/logger';
import { internalError } from '../utils/AppError';
import { AuditActions, ResourceTypes, logAuditFromRequest } from '../services/auditService';
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPaymentConfirmation,
  sendMilestoneNotification,
  sendDeliverableNotification,
} from '../services/emailService';

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
  const authMiddleware = requireAuth(prisma);

  // -------------------------------------------------------------------------
  // GET /api/admin/dashboard - Dashboard stats
  // -------------------------------------------------------------------------
  router.get('/dashboard', authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
      void logAuditFromRequest(req, AuditActions.ADMIN_VIEW_DASHBOARD, ResourceTypes.ADMIN, undefined, {
        periodStart: startOfMonth.toISOString(),
      });
    } catch (error) {
      next(internalError('Failed to fetch dashboard stats', error as Error));
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/leads - All leads with filtering
  // -------------------------------------------------------------------------
  router.get('/leads', authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
      void logAuditFromRequest(req, AuditActions.ADMIN_VIEW_LEADS, ResourceTypes.ADMIN, undefined, {
        page,
        limit,
        status,
        tier,
        search,
        startDate,
        endDate,
      });
    } catch (error) {
      next(internalError('Failed to fetch leads', error as Error));
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/projects - All projects with filtering
  // -------------------------------------------------------------------------
  router.get('/projects', authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
      void logAuditFromRequest(req, AuditActions.ADMIN_VIEW_PROJECTS, ResourceTypes.ADMIN, undefined, {
        page,
        limit,
        status,
        tier,
        paymentStatus,
        search,
      });
    } catch (error) {
      next(internalError('Failed to fetch projects', error as Error));
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/clients - All clients with stats
  // -------------------------------------------------------------------------
  router.get('/clients', authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
      void logAuditFromRequest(req, AuditActions.ADMIN_VIEW_CLIENTS, ResourceTypes.ADMIN, undefined, {
        page,
        limit,
        status,
        tier,
        search,
      });
    } catch (error) {
      next(internalError('Failed to fetch clients', error as Error));
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/users - All users with filtering
  // -------------------------------------------------------------------------
  router.get('/users', authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit, sortBy, sortOrder } = parsePaginationParams(req.query);
      const { userType, search, hasClient } = req.query;

      // Build where clause
      const where: any = {};

      if (userType) {
        where.userType = userType;
      }

      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { name: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (hasClient === 'true') {
        where.client = { isNot: null };
      } else if (hasClient === 'false') {
        where.client = null;
      }

      // Get total count
      const total = await prisma.user.count({ where });

      // Get users
      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          userType: true,
          tier: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              status: true,
              _count: {
                select: { projects: true },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      });

      res.json({
        success: true,
        data: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.userType,
          tier: user.tier,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          client: user.client ? {
            id: user.client.id,
            status: user.client.status,
            projectCount: user.client._count.projects,
          } : null,
        })),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
      void logAuditFromRequest(req, AuditActions.ADMIN_VIEW_USERS, ResourceTypes.ADMIN, undefined, {
        page,
        limit,
        userType,
        search,
        hasClient,
      });
    } catch (error) {
      next(internalError('Failed to fetch users', error as Error));
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/admin/sync/health - Notion-Postgres reconciliation health check
  // -------------------------------------------------------------------------
  router.get(
    '/sync/health',
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const notionApiKey = process.env.NOTION_API_KEY;
        const projectsDatabaseId = process.env.NOTION_PROJECTS_DATABASE_ID;

        if (!notionApiKey) {
          return res.status(503).json({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Notion API not configured',
            },
          });
        }

        if (!projectsDatabaseId) {
          return res.status(503).json({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Notion projects database ID not configured',
            },
          });
        }

        const notion = new NotionClient({ auth: notionApiKey });

        const comparison = {
          timestamp: new Date().toISOString(),
          projects: {
            postgres: {
              total: 0,
              withNotionLink: 0,
              withoutNotionLink: 0,
            },
            notion: {
              total: 0,
              linked: 0,
              unlinked: 0,
            },
            discrepancies: [] as Array<{
              projectId: string;
              notionPageId: string;
              issues: Array<{
                field: string;
                postgres?: string;
                notion?: string;
                error?: string;
                message?: string;
                timeDiffSeconds?: number;
              }>;
            }>,
          },
          syncStatus: 'unknown' as string,
        };

        // Get all projects from Postgres
        const postgresProjects = await prisma.project.findMany({
          where: {
            notionPageId: { not: null },
          },
          select: {
            id: true,
            name: true,
            status: true,
            notionPageId: true,
            updatedAt: true,
            tier: true,
          },
        });

        comparison.projects.postgres.total = await prisma.project.count();
        comparison.projects.postgres.withNotionLink = postgresProjects.length;
        comparison.projects.postgres.withoutNotionLink =
          comparison.projects.postgres.total - postgresProjects.length;

        // Compare with Notion if database ID is configured
        try {
          const notionPages = await (notion as any).databases.query({
            database_id: projectsDatabaseId,
            page_size: 100, // Limit for performance
          });

          comparison.projects.notion.total = notionPages.results.length;

          // Compare each project
          for (const project of postgresProjects) {
            if (!project.notionPageId) continue;

            try {
              const notionPage = await notion.pages.retrieve({
                page_id: project.notionPageId,
              });
              const notionTitle = getPageTitle(notionPage);
              const properties = (notionPage as any).properties || {};
              const notionStatus = properties.Status?.select?.name;
              const mappedNotionStatus = mapNotionStatusToPostgres(notionStatus);

              const discrepancy: {
                projectId: string;
                notionPageId: string;
                issues: Array<{
                  field: string;
                  postgres?: string;
                  notion?: string;
                  timeDiffSeconds?: number;
                  error?: string;
                  message?: string;
                }>;
              } = {
                projectId: project.id,
                notionPageId: project.notionPageId,
                issues: [],
              };

              // Check for name mismatch
              if (notionTitle && notionTitle !== 'Untitled' && notionTitle !== project.name) {
                discrepancy.issues.push({
                  field: 'name',
                  postgres: project.name,
                  notion: notionTitle,
                });
              }

              // Check for status mismatch
              if (mappedNotionStatus && mappedNotionStatus !== project.status) {
                discrepancy.issues.push({
                  field: 'status',
                  postgres: project.status,
                  notion: mappedNotionStatus,
                });
              }

              // Check timestamp (Notion should be newer or equal if synced)
              const notionTimestamp = new Date((notionPage as any).last_edited_time);
              const postgresTimestamp = new Date(project.updatedAt);

              // If Notion is significantly newer (> 1 minute), might need sync
              const timeDiff = notionTimestamp.getTime() - postgresTimestamp.getTime();
              if (timeDiff > 60000) {
                // 1 minute threshold
                discrepancy.issues.push({
                  field: 'timestamp',
                  postgres: project.updatedAt.toISOString(),
                  notion: (notionPage as any).last_edited_time,
                  timeDiffSeconds: Math.floor(timeDiff / 1000),
                });
              }

              if (discrepancy.issues.length > 0) {
                comparison.projects.discrepancies.push(discrepancy);
              } else {
                comparison.projects.notion.linked++;
              }
            } catch (notionError) {
              // Notion page not found or inaccessible
              comparison.projects.discrepancies.push({
                projectId: project.id,
                notionPageId: project.notionPageId,
                issues: [
                  {
                    field: 'notion_access',
                    error: 'Notion page not found or inaccessible',
                    message: (notionError as Error).message,
                  },
                ],
              });
            }
          }

          comparison.projects.notion.unlinked =
            comparison.projects.notion.total - comparison.projects.notion.linked;

          // Determine sync status
          const discrepancyCount = comparison.projects.discrepancies.length;
          const totalLinked = comparison.projects.notion.linked;
          const totalWithIssues =
            discrepancyCount + comparison.projects.postgres.withoutNotionLink;

          if (totalWithIssues === 0) {
            comparison.syncStatus = 'healthy';
          } else if (
            totalLinked > 0 &&
            discrepancyCount / (totalLinked + discrepancyCount) < 0.1
          ) {
            comparison.syncStatus = 'mostly_synced'; // Less than 10% discrepancies
          } else {
            comparison.syncStatus = 'needs_attention';
          }
        } catch (notionError) {
          logger.error('Error querying Notion database', {
            error: (notionError as Error).message,
            databaseId: projectsDatabaseId,
          });
          comparison.syncStatus = 'error';
          comparison.projects.notion.total = -1; // Indicate error
        }

        // Log audit
        void logAuditFromRequest(req, AuditActions.SYNC_HEALTH_CHECK, ResourceTypes.SYNC, undefined, {
          syncStatus: comparison.syncStatus,
          discrepancyCount: comparison.projects.discrepancies.length,
        });

        res.json({
          success: true,
          data: comparison,
        });
      } catch (error) {
        next(internalError('Failed to perform sync health check', error as Error));
      }
    }
  );

  // -------------------------------------------------------------------------
  // DATABASE EXPLORER ENDPOINTS
  // -------------------------------------------------------------------------

  // Supported tables for database explorer
  const SUPPORTED_TABLES: Record<string, { model: string; displayName: string }> = {
    users: { model: 'user', displayName: 'Users' },
    clients: { model: 'client', displayName: 'Clients' },
    projects: { model: 'project', displayName: 'Projects' },
    leads: { model: 'lead', displayName: 'Leads' },
    payments: { model: 'payment', displayName: 'Payments' },
    milestones: { model: 'milestone', displayName: 'Milestones' },
    deliverables: { model: 'deliverable', displayName: 'Deliverables' },
    audit_log: { model: 'auditLog', displayName: 'Audit Log' },
  };

  // Table schema definitions (column info)
  const TABLE_SCHEMAS: Record<string, Array<{ name: string; type: string; nullable: boolean }>> = {
    users: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'email', type: 'string', nullable: true },
      { name: 'name', type: 'string', nullable: true },
      { name: 'role', type: 'string', nullable: false },
      { name: 'userType', type: 'enum', nullable: false },
      { name: 'tier', type: 'int', nullable: true },
      { name: 'createdAt', type: 'datetime', nullable: false },
      { name: 'updatedAt', type: 'datetime', nullable: false },
      { name: 'lastLogin', type: 'datetime', nullable: true },
    ],
    clients: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'userId', type: 'uuid', nullable: false },
      { name: 'tier', type: 'int', nullable: false },
      { name: 'status', type: 'enum', nullable: false },
      { name: 'projectAddress', type: 'string', nullable: true },
      { name: 'stripeCustomerId', type: 'string', nullable: true },
      { name: 'maxProjects', type: 'int', nullable: false },
      { name: 'referralCode', type: 'string', nullable: true },
      { name: 'createdAt', type: 'datetime', nullable: false },
      { name: 'updatedAt', type: 'datetime', nullable: false },
    ],
    projects: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'clientId', type: 'uuid', nullable: false },
      { name: 'leadId', type: 'uuid', nullable: true },
      { name: 'tier', type: 'int', nullable: false },
      { name: 'status', type: 'enum', nullable: false },
      { name: 'name', type: 'string', nullable: false },
      { name: 'projectAddress', type: 'string', nullable: true },
      { name: 'notionPageId', type: 'string', nullable: true },
      { name: 'paymentStatus', type: 'string', nullable: false },
      { name: 'syncStatus', type: 'enum', nullable: false },
      { name: 'createdAt', type: 'datetime', nullable: false },
      { name: 'updatedAt', type: 'datetime', nullable: false },
    ],
    leads: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'email', type: 'string', nullable: false },
      { name: 'name', type: 'string', nullable: true },
      { name: 'projectAddress', type: 'string', nullable: false },
      { name: 'budgetRange', type: 'string', nullable: true },
      { name: 'timeline', type: 'string', nullable: true },
      { name: 'projectType', type: 'string', nullable: true },
      { name: 'hasSurvey', type: 'boolean', nullable: false },
      { name: 'hasDrawings', type: 'boolean', nullable: false },
      { name: 'recommendedTier', type: 'int', nullable: false },
      { name: 'status', type: 'enum', nullable: false },
      { name: 'clientId', type: 'uuid', nullable: true },
      { name: 'createdAt', type: 'datetime', nullable: false },
      { name: 'updatedAt', type: 'datetime', nullable: false },
    ],
    payments: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'projectId', type: 'uuid', nullable: false },
      { name: 'stripePaymentIntentId', type: 'string', nullable: false },
      { name: 'amount', type: 'int', nullable: false },
      { name: 'currency', type: 'string', nullable: false },
      { name: 'status', type: 'enum', nullable: false },
      { name: 'tier', type: 'int', nullable: true },
      { name: 'paidAt', type: 'datetime', nullable: true },
      { name: 'failureReason', type: 'string', nullable: true },
      { name: 'createdAt', type: 'datetime', nullable: false },
      { name: 'updatedAt', type: 'datetime', nullable: false },
    ],
    milestones: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'projectId', type: 'uuid', nullable: false },
      { name: 'tier', type: 'int', nullable: false },
      { name: 'name', type: 'string', nullable: false },
      { name: 'order', type: 'int', nullable: false },
      { name: 'status', type: 'enum', nullable: false },
      { name: 'dueDate', type: 'datetime', nullable: true },
      { name: 'completedAt', type: 'datetime', nullable: true },
      { name: 'syncStatus', type: 'enum', nullable: false },
      { name: 'createdAt', type: 'datetime', nullable: false },
    ],
    deliverables: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'projectId', type: 'uuid', nullable: false },
      { name: 'name', type: 'string', nullable: false },
      { name: 'filePath', type: 'string', nullable: false },
      { name: 'fileUrl', type: 'string', nullable: false },
      { name: 'fileSize', type: 'int', nullable: false },
      { name: 'fileType', type: 'string', nullable: false },
      { name: 'category', type: 'string', nullable: false },
      { name: 'description', type: 'string', nullable: true },
      { name: 'uploadedById', type: 'uuid', nullable: false },
      { name: 'createdAt', type: 'datetime', nullable: false },
    ],
    audit_log: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'userId', type: 'uuid', nullable: true },
      { name: 'action', type: 'string', nullable: false },
      { name: 'resourceType', type: 'string', nullable: true },
      { name: 'resourceId', type: 'uuid', nullable: true },
      { name: 'details', type: 'json', nullable: true },
      { name: 'ip', type: 'string', nullable: true },
      { name: 'userAgent', type: 'string', nullable: true },
      { name: 'createdAt', type: 'datetime', nullable: false },
    ],
  };

  // GET /api/admin/database/tables - List all tables with record counts
  router.get(
    '/database/tables',
    authMiddleware,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Get counts for all supported tables in parallel
        const counts = await Promise.all([
          prisma.user.count(),
          prisma.client.count(),
          prisma.project.count(),
          prisma.lead.count(),
          prisma.payment.count(),
          prisma.milestone.count(),
          prisma.deliverable.count(),
          prisma.auditLog.count(),
        ]);

        const tables = [
          { name: 'users', displayName: 'Users', recordCount: counts[0] },
          { name: 'clients', displayName: 'Clients', recordCount: counts[1] },
          { name: 'projects', displayName: 'Projects', recordCount: counts[2] },
          { name: 'leads', displayName: 'Leads', recordCount: counts[3] },
          { name: 'payments', displayName: 'Payments', recordCount: counts[4] },
          { name: 'milestones', displayName: 'Milestones', recordCount: counts[5] },
          { name: 'deliverables', displayName: 'Deliverables', recordCount: counts[6] },
          { name: 'audit_log', displayName: 'Audit Log', recordCount: counts[7] },
        ];

        res.json({
          success: true,
          data: tables,
        });

        void logAuditFromRequest(
          req,
          AuditActions.DATABASE_VIEW_TABLES,
          ResourceTypes.DATABASE,
          undefined,
          { tableCount: tables.length }
        );
      } catch (error) {
        next(internalError('Failed to fetch database tables', error as Error));
      }
    }
  );

  // GET /api/admin/database/tables/:tableName - Get table schema
  router.get(
    '/database/tables/:tableName',
    authMiddleware,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { tableName } = req.params;

        if (!SUPPORTED_TABLES[tableName]) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Table '${tableName}' not found or not supported`,
            },
          });
        }

        const schema = TABLE_SCHEMAS[tableName];
        const tableInfo = SUPPORTED_TABLES[tableName];

        res.json({
          success: true,
          data: {
            name: tableName,
            displayName: tableInfo.displayName,
            columns: schema,
          },
        });

        void logAuditFromRequest(
          req,
          AuditActions.DATABASE_VIEW_SCHEMA,
          ResourceTypes.DATABASE,
          tableName,
          { tableName }
        );
      } catch (error) {
        next(internalError('Failed to fetch table schema', error as Error));
      }
    }
  );

  // GET /api/admin/database/tables/:tableName/records - Get paginated records
  router.get(
    '/database/tables/:tableName/records',
    authMiddleware,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { tableName } = req.params;
        const { page, limit, sortBy, sortOrder } = parsePaginationParams(req.query);
        const { search } = req.query;

        if (!SUPPORTED_TABLES[tableName]) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Table '${tableName}' not found or not supported`,
            },
          });
        }

        const tableInfo = SUPPORTED_TABLES[tableName];
        const modelName = tableInfo.model as keyof typeof prisma;

        // Build where clause for search
        let where: any = {};
        if (search) {
          const searchStr = search as string;
          // Add search filters based on table
          switch (tableName) {
            case 'users':
              where = {
                OR: [
                  { email: { contains: searchStr, mode: 'insensitive' } },
                  { name: { contains: searchStr, mode: 'insensitive' } },
                ],
              };
              break;
            case 'clients':
              where = {
                OR: [
                  { projectAddress: { contains: searchStr, mode: 'insensitive' } },
                  { referralCode: { contains: searchStr, mode: 'insensitive' } },
                ],
              };
              break;
            case 'projects':
              where = {
                OR: [
                  { name: { contains: searchStr, mode: 'insensitive' } },
                  { projectAddress: { contains: searchStr, mode: 'insensitive' } },
                ],
              };
              break;
            case 'leads':
              where = {
                OR: [
                  { email: { contains: searchStr, mode: 'insensitive' } },
                  { name: { contains: searchStr, mode: 'insensitive' } },
                  { projectAddress: { contains: searchStr, mode: 'insensitive' } },
                ],
              };
              break;
            case 'payments':
              where = {
                OR: [
                  { stripePaymentIntentId: { contains: searchStr, mode: 'insensitive' } },
                ],
              };
              break;
            case 'milestones':
              where = {
                OR: [{ name: { contains: searchStr, mode: 'insensitive' } }],
              };
              break;
            case 'deliverables':
              where = {
                OR: [
                  { name: { contains: searchStr, mode: 'insensitive' } },
                  { category: { contains: searchStr, mode: 'insensitive' } },
                ],
              };
              break;
            case 'audit_log':
              where = {
                OR: [
                  { action: { contains: searchStr, mode: 'insensitive' } },
                  { resourceType: { contains: searchStr, mode: 'insensitive' } },
                ],
              };
              break;
          }
        }

        // Get total count and records
        const model = prisma[modelName] as any;
        const [total, records] = await Promise.all([
          model.count({ where }),
          model.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
          }),
        ]);

        res.json({
          success: true,
          data: records,
          meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            tableName,
          },
        });

        void logAuditFromRequest(
          req,
          AuditActions.DATABASE_VIEW_RECORDS,
          ResourceTypes.DATABASE,
          tableName,
          { tableName, page, limit, search, recordCount: records.length }
        );
      } catch (error) {
        next(internalError('Failed to fetch table records', error as Error));
      }
    }
  );

  // GET /api/admin/database/tables/:tableName/records/:id - Get single record
  router.get(
    '/database/tables/:tableName/records/:id',
    authMiddleware,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { tableName, id } = req.params;

        if (!SUPPORTED_TABLES[tableName]) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Table '${tableName}' not found or not supported`,
            },
          });
        }

        const tableInfo = SUPPORTED_TABLES[tableName];
        const modelName = tableInfo.model as keyof typeof prisma;
        const model = prisma[modelName] as any;

        const record = await model.findUnique({
          where: { id },
        });

        if (!record) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Record with id '${id}' not found in table '${tableName}'`,
            },
          });
        }

        res.json({
          success: true,
          data: record,
        });

        void logAuditFromRequest(
          req,
          AuditActions.DATABASE_VIEW_RECORD,
          ResourceTypes.DATABASE,
          id,
          { tableName, recordId: id }
        );
      } catch (error) {
        next(internalError('Failed to fetch record', error as Error));
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /api/admin/test-email - Send test emails (for development/testing)
  // -------------------------------------------------------------------------
  router.post(
    '/test-email',
    authMiddleware,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { type, to } = req.body;

        if (!type || !to) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Both "type" and "to" fields are required',
            },
          });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid email address format',
            },
          });
        }

        let result;
        const testData = {
          userName: 'Test User',
          projectName: 'Test Project',
          milestoneName: 'Design Review',
          deliverableName: 'Final Design Package',
        };

        switch (type) {
          case 'welcome':
            result = await sendWelcomeEmail({
              to,
              name: testData.userName,
              tier: 2,
              loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
            });
            break;

          case 'password-reset':
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=test-token-12345`;
            result = await sendPasswordResetEmail(
              to,
              resetUrl,
              new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
            );
            break;

          case 'payment':
            result = await sendPaymentConfirmation({
              to,
              name: testData.userName,
              projectName: testData.projectName,
              projectId: 'test-project-id',
              amount: 250000, // $2,500.00 in cents
              currency: 'usd',
              tier: 2,
              receiptUrl: 'https://stripe.com/receipt/test',
            });
            break;

          case 'milestone':
            result = await sendMilestoneNotification({
              to,
              name: testData.userName,
              projectName: testData.projectName,
              projectId: 'test-project-id',
              milestoneName: testData.milestoneName,
              nextMilestone: 'Final Delivery',
            });
            break;

          case 'deliverable':
            result = await sendDeliverableNotification({
              to,
              name: testData.userName,
              projectName: testData.projectName,
              projectId: 'test-project-id',
              deliverableName: testData.deliverableName,
              downloadUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/deliverables/test-file`,
            });
            break;

          default:
            return res.status(400).json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: `Unknown email type: ${type}. Valid types: welcome, password-reset, payment, milestone, deliverable`,
              },
            });
        }

        if (result.success) {
          logger.info(`Test email sent: ${type} to ${to}`, { messageId: result.messageId });
          void logAuditFromRequest(
            req,
            AuditActions.ADMIN_SEND_TEST_EMAIL,
            ResourceTypes.EMAIL,
            undefined,
            { emailType: type, to, messageId: result.messageId }
          );

          return res.json({
            success: true,
            message: `Test ${type} email sent successfully`,
            messageId: result.messageId,
          });
        } else {
          logger.error(`Failed to send test email: ${type} to ${to}`, { error: result.error });
          return res.status(500).json({
            success: false,
            error: {
              code: 'EMAIL_SEND_FAILED',
              message: result.error || 'Failed to send email',
            },
          });
        }
      } catch (error) {
        next(internalError('Failed to send test email', error as Error));
      }
    }
  );

  return router;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default createAdminRouter;
