import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { verifyToken } from '../utils/auth';

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

// Extend Request type for authenticated user
interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: string;
  };
}

/**
 * Middleware to verify JWT token and attach user to request
 */
async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided',
      },
    });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token, JWT_SECRET);

  if (!payload || typeof payload.userId !== 'string') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }

  (req as AuthenticatedRequest).user = {
    userId: payload.userId,
    role: (payload.role as string) || 'CLIENT',
  };

  next();
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;

  if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
  }

  next();
}

/**
 * GET /api/admin/dashboard
 * Dashboard stats: leads by status, projects by tier, revenue
 */
router.get('/dashboard', authenticateUser, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Run all queries in parallel for efficiency
    const [
      leadsByStatus,
      projectsByTier,
      projectsByStatus,
      revenueStats,
      recentLeads,
      recentProjects,
      clientCount,
    ] = await Promise.all([
      // Leads by status
      prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Projects by tier
      prisma.project.groupBy({
        by: ['tier'],
        _count: { id: true },
      }),

      // Projects by status
      prisma.project.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Revenue stats - sum of successful payments
      prisma.payment.aggregate({
        where: { status: 'SUCCEEDED' },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // Recent leads (last 5)
      prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          recommendedTier: true,
          createdAt: true,
        },
      }),

      // Recent projects (last 5)
      prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
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
      }),

      // Total client count
      prisma.client.count(),
    ]);

    // Calculate tier names
    const tierNames: Record<number, string> = {
      1: 'Seedling',
      2: 'Sprout',
      3: 'Canopy',
      4: 'Forest',
    };

    // Format leads by status
    const formattedLeadsByStatus = leadsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    // Ensure all statuses are present
    const allLeadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED', 'NURTURE'];
    allLeadStatuses.forEach((status) => {
      if (!(status in formattedLeadsByStatus)) {
        formattedLeadsByStatus[status] = 0;
      }
    });

    // Format projects by tier
    const formattedProjectsByTier = projectsByTier.map((item) => ({
      tier: item.tier,
      tierName: tierNames[item.tier] || `Tier ${item.tier}`,
      count: item._count.id,
    }));

    // Format projects by status
    const formattedProjectsByStatus = projectsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate revenue in dollars (stored as cents)
    const totalRevenue = (revenueStats._sum.amount || 0) / 100;
    const paymentCount = revenueStats._count.id;

    // Format recent leads
    const formattedRecentLeads = recentLeads.map((lead) => ({
      id: lead.id,
      email: lead.email,
      fullName: lead.fullName,
      status: lead.status,
      recommendedTier: lead.recommendedTier,
      tierName: lead.recommendedTier ? tierNames[lead.recommendedTier] : null,
      createdAt: lead.createdAt,
    }));

    // Format recent projects
    const formattedRecentProjects = recentProjects.map((project) => ({
      id: project.id,
      name: project.name,
      tier: project.tier,
      tierName: tierNames[project.tier] || `Tier ${project.tier}`,
      status: project.status,
      clientEmail: project.client?.user?.email || null,
      clientName: project.client?.user?.name || project.client?.companyName || null,
      createdAt: project.createdAt,
    }));

    // Summary stats
    const totalLeads = Object.values(formattedLeadsByStatus).reduce((a, b) => a + b, 0);
    const totalProjects = projectsByTier.reduce((acc, item) => acc + item._count.id, 0);
    const conversionRate = totalLeads > 0
      ? Math.round((formattedLeadsByStatus['CONVERTED'] / totalLeads) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalLeads,
          totalProjects,
          totalClients: clientCount,
          totalRevenue,
          paymentCount,
          conversionRate,
        },
        leadsByStatus: formattedLeadsByStatus,
        projectsByTier: formattedProjectsByTier,
        projectsByStatus: formattedProjectsByStatus,
        recentLeads: formattedRecentLeads,
        recentProjects: formattedRecentProjects,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/leads
 * All leads with filtering, sorting, pagination
 */
router.get('/leads', authenticateUser, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      tier,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status as string;
    }

    if (tier) {
      where.recommendedTier = parseInt(tier as string, 10);
    }

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { companyName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const validSortFields = ['createdAt', 'updatedAt', 'email', 'fullName', 'status', 'recommendedTier'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
    const orderBy = { [sortField as string]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.lead.count({ where }),
    ]);

    const tierNames: Record<number, string> = {
      1: 'Seedling',
      2: 'Sprout',
      3: 'Canopy',
      4: 'Forest',
    };

    const formattedLeads = leads.map((lead) => ({
      ...lead,
      tierName: lead.recommendedTier ? tierNames[lead.recommendedTier] : null,
    }));

    return res.status(200).json({
      success: true,
      data: formattedLeads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/projects
 * All projects with filtering, sorting, pagination
 */
router.get('/projects', authenticateUser, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      tier,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status as string;
    }

    if (tier) {
      where.tier = parseInt(tier as string, 10);
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { client: { user: { email: { contains: search as string, mode: 'insensitive' } } } },
        { client: { companyName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    // Build orderBy
    const validSortFields = ['createdAt', 'updatedAt', 'name', 'status', 'tier'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
    const orderBy = { [sortField as string]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          client: {
            include: {
              user: {
                select: { email: true, name: true },
              },
            },
          },
          milestones: {
            select: { status: true },
          },
          _count: {
            select: { deliverables: true },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    const tierNames: Record<number, string> = {
      1: 'Seedling',
      2: 'Sprout',
      3: 'Canopy',
      4: 'Forest',
    };

    const formattedProjects = projects.map((project) => {
      const completedMilestones = project.milestones.filter((m) => m.status === 'COMPLETED').length;
      const totalMilestones = project.milestones.length;
      const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

      return {
        id: project.id,
        name: project.name,
        tier: project.tier,
        tierName: tierNames[project.tier] || `Tier ${project.tier}`,
        status: project.status,
        progress,
        completedMilestones,
        totalMilestones,
        deliverableCount: project._count.deliverables,
        clientEmail: project.client?.user?.email || null,
        clientName: project.client?.user?.name || project.client?.companyName || null,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedProjects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/clients
 * All clients with tier, status, project count
 */
router.get('/clients', authenticateUser, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      tier,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (tier) {
      where.tier = parseInt(tier as string, 10);
    }

    if (search) {
      where.OR = [
        { user: { email: { contains: search as string, mode: 'insensitive' } } },
        { user: { name: { contains: search as string, mode: 'insensitive' } } },
        { companyName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const validSortFields = ['createdAt', 'updatedAt', 'tier'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
    const orderBy = { [sortField as string]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
          _count: {
            select: { projects: true },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    const tierNames: Record<number, string> = {
      1: 'Seedling',
      2: 'Sprout',
      3: 'Canopy',
      4: 'Forest',
    };

    const formattedClients = clients.map((client) => ({
      id: client.id,
      email: client.user?.email || null,
      name: client.user?.name || null,
      companyName: client.companyName,
      tier: client.tier,
      tierName: tierNames[client.tier] || `Tier ${client.tier}`,
      projectCount: client._count.projects,
      stripeCustomerId: client.stripeCustomerId,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: formattedClients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
