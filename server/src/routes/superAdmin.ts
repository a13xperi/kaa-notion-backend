/**
 * Super Admin Routes (Karen & Pam Special Access)
 * Extended admin functionality for platform owners/operators.
 *
 * Routes:
 * - GET /api/super-admin/overview - Complete platform overview
 * - GET /api/super-admin/users - All users with detailed info
 * - GET /api/super-admin/revenue - Detailed revenue analytics
 * - GET /api/super-admin/activity - Platform-wide activity log
 * - GET /api/super-admin/health - System health status
 * - POST /api/super-admin/impersonate/:userId - Impersonate a user (view-only)
 */

import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { forbidden, notFound } from '../utils/AppError';
import { AuditActions, ResourceTypes, logAuditFromRequest } from '../services/auditService';

// ============================================================================
// TYPES
// ============================================================================

// Super admin emails - Karen and Pam's access
const SUPER_ADMIN_EMAILS = [
  'karen@kaalandscape.com',
  'pam@kaalandscape.com',
  // Add additional super admin emails as needed
  process.env.SUPER_ADMIN_EMAIL_1,
  process.env.SUPER_ADMIN_EMAIL_2,
].filter(Boolean).map(email => email!.toLowerCase());

interface PlatformOverview {
  timestamp: string;
  users: {
    total: number;
    clients: number;
    team: number;
    admins: number;
    newThisMonth: number;
  };
  leads: {
    total: number;
    newThisMonth: number;
    conversionRate: number;
    byTier: Record<number, number>;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    byTier: Record<number, number>;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
    byTier: Record<number, number>;
  };
  systemHealth: {
    database: 'healthy' | 'degraded' | 'down';
    notion: 'healthy' | 'degraded' | 'down';
    stripe: 'healthy' | 'degraded' | 'down';
    email: 'healthy' | 'degraded' | 'down';
  };
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware to check if user is a super admin (Karen or Pam).
 */
function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userEmail = req.user?.email?.toLowerCase();

  if (!userEmail || !SUPER_ADMIN_EMAILS.includes(userEmail)) {
    logger.warn('Super admin access denied', {
      userId: req.user?.id,
      email: userEmail,
      path: req.path
    });
    throw forbidden('Super admin access required');
  }

  logger.info('Super admin access granted', { userId: req.user?.id, email: userEmail });
  next();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStartOfMonth(monthsAgo = 0): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
}

function getEndOfMonth(monthsAgo = 0): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59, 999);
}

// ============================================================================
// ROUTE FACTORY
// ============================================================================

export function createSuperAdminRouter(prisma: PrismaClient): Router {
  const router = Router();
  const authMiddleware = requireAuth(prisma);

  // Apply authentication + super admin check to all routes
  router.use(authMiddleware, requireAdmin, requireSuperAdmin);

  // -------------------------------------------------------------------------
  // GET /api/super-admin/overview - Complete platform overview
  // -------------------------------------------------------------------------
  router.get('/overview', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const startOfMonth = getStartOfMonth();
      const startOfLastMonth = getStartOfMonth(1);
      const endOfLastMonth = getEndOfMonth(1);

      // Parallel queries for comprehensive overview
      const [
        // User stats
        totalUsers,
        clientUsers,
        teamUsers,
        adminUsers,
        newUsersThisMonth,

        // Lead stats
        totalLeads,
        leadsThisMonth,
        convertedLeads,
        leadsByTier,

        // Project stats
        totalProjects,
        activeProjects,
        completedProjects,
        projectsByTier,

        // Revenue stats
        totalRevenue,
        revenueThisMonth,
        revenueLastMonth,
        revenueByTier,

        // Recent activity
        recentActivity,
      ] = await Promise.all([
        // Users
        prisma.user.count(),
        prisma.user.count({ where: { userType: 'SAGE_CLIENT' } }),
        prisma.user.count({ where: { userType: 'TEAM' } }),
        prisma.user.count({ where: { userType: 'ADMIN' } }),
        prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),

        // Leads
        prisma.lead.count(),
        prisma.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.lead.count({ where: { status: 'CLOSED', clientId: { not: null } } }),
        prisma.lead.groupBy({ by: ['recommendedTier'], _count: true }),

        // Projects
        prisma.project.count(),
        prisma.project.count({ where: { status: { notIn: ['DELIVERED', 'CLOSED'] } } }),
        prisma.project.count({ where: { status: { in: ['DELIVERED', 'CLOSED'] } } }),
        prisma.project.groupBy({ by: ['tier'], _count: true }),

        // Revenue
        prisma.payment.aggregate({
          where: { status: 'SUCCEEDED' },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { status: 'SUCCEEDED', createdAt: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            status: 'SUCCEEDED',
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
          _sum: { amount: true },
        }),
        prisma.payment.groupBy({
          by: ['tier'],
          where: { status: 'SUCCEEDED' },
          _sum: { amount: true },
        }),

        // Recent activity (last 20)
        prisma.auditLog.findMany({
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { email: true, name: true } },
          },
        }),
      ]);

      // Transform grouped data
      const leadsByTierMap: Record<number, number> = {};
      leadsByTier.forEach((item) => {
        leadsByTierMap[item.recommendedTier] = item._count;
      });

      const projectsByTierMap: Record<number, number> = {};
      projectsByTier.forEach((item) => {
        projectsByTierMap[item.tier] = item._count;
      });

      const revenueByTierMap: Record<number, number> = {};
      revenueByTier.forEach((item) => {
        if (item.tier) {
          revenueByTierMap[item.tier] = item._sum.amount || 0;
        }
      });

      // Calculate metrics
      const conversionRate = totalLeads > 0
        ? Math.round((convertedLeads / totalLeads) * 100)
        : 0;

      const thisMonthRevenue = revenueThisMonth._sum.amount || 0;
      const lastMonthRevenue = revenueLastMonth._sum.amount || 0;
      const revenueGrowth = lastMonthRevenue > 0
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

      const overview: PlatformOverview = {
        timestamp: new Date().toISOString(),
        users: {
          total: totalUsers,
          clients: clientUsers,
          team: teamUsers,
          admins: adminUsers,
          newThisMonth: newUsersThisMonth,
        },
        leads: {
          total: totalLeads,
          newThisMonth: leadsThisMonth,
          conversionRate,
          byTier: leadsByTierMap,
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          byTier: projectsByTierMap,
        },
        revenue: {
          total: totalRevenue._sum.amount || 0,
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          growth: revenueGrowth,
          byTier: revenueByTierMap,
        },
        systemHealth: {
          database: 'healthy',
          notion: process.env.NOTION_API_KEY ? 'healthy' : 'down',
          stripe: process.env.STRIPE_SECRET_KEY ? 'healthy' : 'down',
          email: process.env.RESEND_API_KEY ? 'healthy' : 'down',
        },
      };

      void logAuditFromRequest(req, 'SUPER_ADMIN_VIEW_OVERVIEW' as any, ResourceTypes.ADMIN);

      res.json({
        success: true,
        data: {
          overview,
          recentActivity: recentActivity.map(log => ({
            id: log.id,
            action: log.action,
            user: log.user?.email || 'System',
            userName: log.user?.name || null,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            timestamp: log.createdAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/super-admin/users - All users with detailed info
  // -------------------------------------------------------------------------
  router.get('/users', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { search, userType, tier, page = '1', limit = '50' } = req.query;

      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { name: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (userType) {
        where.userType = userType;
      }

      if (tier) {
        where.tier = parseInt(tier as string);
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            client: {
              include: {
                projects: {
                  select: { id: true, name: true, status: true, tier: true },
                },
                _count: {
                  select: { projects: true, leads: true },
                },
              },
            },
            teamMember: {
              select: { role: true, isActive: true, acceptedAt: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (parseInt(page as string) - 1) * parseInt(limit as string),
          take: parseInt(limit as string),
        }),
        prisma.user.count({ where }),
      ]);

      void logAuditFromRequest(req, 'SUPER_ADMIN_VIEW_USERS' as any, ResourceTypes.ADMIN, undefined, {
        search,
        userType,
        tier,
        resultCount: users.length,
      });

      res.json({
        success: true,
        data: users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.userType,
          tier: user.tier,
          role: user.role,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          client: user.client ? {
            id: user.client.id,
            status: user.client.status,
            projectCount: user.client._count.projects,
            leadCount: user.client._count.leads,
            stripeCustomerId: user.client.stripeCustomerId,
          } : null,
          teamMember: user.teamMember,
        })),
        meta: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/super-admin/revenue - Detailed revenue analytics
  // -------------------------------------------------------------------------
  router.get('/revenue', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, groupBy = 'month' } = req.query;

      // Get payments with filtering
      const where: any = { status: 'SUCCEEDED' };

      if (startDate) {
        where.createdAt = { ...where.createdAt, gte: new Date(startDate as string) };
      }
      if (endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };
      }

      const payments = await prisma.payment.findMany({
        where,
        include: {
          project: {
            include: {
              client: {
                include: {
                  user: { select: { email: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Group by month
      const monthlyRevenue: Record<string, { total: number; count: number; byTier: Record<number, number> }> = {};

      payments.forEach(payment => {
        const monthKey = payment.createdAt.toISOString().slice(0, 7); // YYYY-MM

        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = { total: 0, count: 0, byTier: {} };
        }

        monthlyRevenue[monthKey].total += payment.amount;
        monthlyRevenue[monthKey].count += 1;

        if (payment.tier) {
          monthlyRevenue[monthKey].byTier[payment.tier] =
            (monthlyRevenue[monthKey].byTier[payment.tier] || 0) + payment.amount;
        }
      });

      // Calculate tier breakdown
      const tierBreakdown: Record<number, { total: number; count: number; avgValue: number }> = {};
      payments.forEach(payment => {
        if (payment.tier) {
          if (!tierBreakdown[payment.tier]) {
            tierBreakdown[payment.tier] = { total: 0, count: 0, avgValue: 0 };
          }
          tierBreakdown[payment.tier].total += payment.amount;
          tierBreakdown[payment.tier].count += 1;
        }
      });

      // Calculate averages
      Object.keys(tierBreakdown).forEach(tier => {
        const t = tierBreakdown[parseInt(tier)];
        t.avgValue = t.count > 0 ? Math.round(t.total / t.count) : 0;
      });

      void logAuditFromRequest(req, 'SUPER_ADMIN_VIEW_REVENUE' as any, ResourceTypes.ADMIN);

      res.json({
        success: true,
        data: {
          summary: {
            totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
            totalPayments: payments.length,
            avgPaymentValue: payments.length > 0
              ? Math.round(payments.reduce((sum, p) => sum + p.amount, 0) / payments.length)
              : 0,
          },
          monthlyRevenue: Object.entries(monthlyRevenue)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, data]) => ({
              month,
              ...data,
            })),
          tierBreakdown,
          recentPayments: payments.slice(0, 20).map(p => ({
            id: p.id,
            amount: p.amount,
            tier: p.tier,
            status: p.status,
            createdAt: p.createdAt,
            client: p.project?.client?.user?.email || 'Unknown',
            projectName: p.project?.name || 'Unknown',
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/super-admin/activity - Platform-wide activity log
  // -------------------------------------------------------------------------
  router.get('/activity', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        action,
        userId,
        resourceType,
        startDate,
        endDate,
        page = '1',
        limit = '100'
      } = req.query;

      const where: any = {};

      if (action) where.action = action;
      if (userId) where.userId = userId;
      if (resourceType) where.resourceType = resourceType;
      if (startDate) {
        where.createdAt = { ...where.createdAt, gte: new Date(startDate as string) };
      }
      if (endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: { select: { email: true, name: true, userType: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (parseInt(page as string) - 1) * parseInt(limit as string),
          take: parseInt(limit as string),
        }),
        prisma.auditLog.count({ where }),
      ]);

      // Get action summary
      const actionSummary = await prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 20,
      });

      res.json({
        success: true,
        data: logs.map(log => ({
          id: log.id,
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          user: log.user ? {
            email: log.user.email,
            name: log.user.name,
            userType: log.user.userType,
          } : null,
          details: log.details ? JSON.parse(log.details) : null,
          ip: log.ip,
          userAgent: log.userAgent,
          createdAt: log.createdAt,
        })),
        summary: {
          actionBreakdown: actionSummary.map(a => ({
            action: a.action,
            count: a._count,
          })),
        },
        meta: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/super-admin/health - System health status
  // -------------------------------------------------------------------------
  router.get('/health', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const health: Record<string, { status: string; latency?: number; error?: string }> = {};

      // Check database
      const dbStart = Date.now();
      try {
        await prisma.$queryRaw`SELECT 1`;
        health.database = { status: 'healthy', latency: Date.now() - dbStart };
      } catch (error) {
        health.database = { status: 'down', error: (error as Error).message };
      }

      // Check Notion (if configured)
      if (process.env.NOTION_API_KEY) {
        health.notion = { status: 'configured' };
      } else {
        health.notion = { status: 'not_configured' };
      }

      // Check Stripe (if configured)
      if (process.env.STRIPE_SECRET_KEY) {
        health.stripe = { status: 'configured' };
      } else {
        health.stripe = { status: 'not_configured' };
      }

      // Check Email (if configured)
      if (process.env.RESEND_API_KEY) {
        health.email = { status: 'configured' };
      } else {
        health.email = { status: 'not_configured' };
      }

      // Check Redis (if configured)
      if (process.env.REDIS_URL) {
        health.redis = { status: 'configured' };
      } else {
        health.redis = { status: 'not_configured' };
      }

      // Get sync job status
      const syncStats = await prisma.syncJob.groupBy({
        by: ['status'],
        _count: true,
      });

      const overallStatus = Object.values(health).every(h =>
        h.status === 'healthy' || h.status === 'configured' || h.status === 'not_configured'
      ) ? 'healthy' : 'degraded';

      res.json({
        success: true,
        data: {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          services: health,
          syncJobs: syncStats.reduce((acc, s) => {
            acc[s.status] = s._count;
            return acc;
          }, {} as Record<string, number>),
          environment: {
            nodeEnv: process.env.NODE_ENV,
            version: process.env.npm_package_version || 'unknown',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/super-admin/impersonate/:userId - View-only impersonation
  // -------------------------------------------------------------------------
  router.post('/impersonate/:userId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          client: {
            include: {
              projects: true,
              leads: true,
            },
          },
        },
      });

      if (!targetUser) {
        throw notFound('User not found');
      }

      // Log the impersonation attempt
      void logAuditFromRequest(req, 'SUPER_ADMIN_IMPERSONATE' as any, ResourceTypes.USER, userId, {
        targetEmail: targetUser.email,
        viewOnly: true,
      });

      logger.info('Super admin impersonation', {
        adminId: req.user!.id,
        adminEmail: req.user!.email,
        targetUserId: userId,
        targetEmail: targetUser.email,
      });

      // Return user data for view-only access (no token generation for safety)
      res.json({
        success: true,
        data: {
          message: 'View-only impersonation data',
          user: {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
            userType: targetUser.userType,
            tier: targetUser.tier,
            createdAt: targetUser.createdAt,
            lastLogin: targetUser.lastLogin,
          },
          client: targetUser.client,
          // Note: This is view-only - no token is issued for security
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createSuperAdminRouter;
