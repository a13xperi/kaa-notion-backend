/**
 * Metrics Service
 *
 * Tracks and calculates business metrics for analytics dashboard.
 * Provides conversion rates, revenue trends, tier distribution, and more.
 */

import { logger } from '../config/logger';
import { prisma } from '../utils/prisma';

// ========================================
// Types
// ========================================

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ConversionMetrics {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageTimeToConvert: number; // in days
  byTier: {
    tier: number;
    leads: number;
    converted: number;
    rate: number;
  }[];
}

export interface RevenueMetrics {
  totalRevenue: number;
  averageOrderValue: number;
  revenueByTier: {
    tier: number;
    revenue: number;
    count: number;
  }[];
  revenueByMonth: {
    month: string;
    revenue: number;
    count: number;
  }[];
}

export interface TierDistribution {
  tier: number;
  tierName: string;
  count: number;
  percentage: number;
  revenue: number;
}

export interface LeadMetrics {
  totalLeads: number;
  byStatus: {
    status: string;
    count: number;
  }[];
  bySource: {
    source: string;
    count: number;
  }[];
  leadsByMonth: {
    month: string;
    count: number;
  }[];
}

export interface ProjectMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  byStatus: {
    status: string;
    count: number;
  }[];
  averageCompletionTime: number; // in days
  projectsByMonth: {
    month: string;
    created: number;
    completed: number;
  }[];
}

export interface DashboardSummary {
  leads: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  conversions: {
    rate: number;
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  projects: {
    active: number;
    completed: number;
    thisMonth: number;
  };
}

// ========================================
// Helper Functions
// ========================================

function getDateRange(period: 'week' | 'month' | 'quarter' | 'year' | 'all'): DateRange {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'week':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case 'all':
      startDate.setFullYear(2020); // Beginning of time for our purposes
      break;
  }

  return { startDate, endDate };
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ========================================
// Conversion Metrics
// ========================================

export async function getConversionMetrics(
  period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month'
): Promise<ConversionMetrics> {
  const { startDate, endDate } = getDateRange(period);

  try {
    // Get all leads in the period
    // Get all leads in the period
    // Note: Lead model has no convertedAt field - use updatedAt for converted leads as proxy
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        status: true,
        recommendedTier: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.status === 'CONVERTED').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Calculate average time to convert using updatedAt as conversion time proxy
    const convertedWithTime = leads.filter(l => l.status === 'CONVERTED');
    const totalDays = convertedWithTime.reduce((sum, lead) => {
      const days = (lead.updatedAt.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    const averageTimeToConvert = convertedWithTime.length > 0 ? totalDays / convertedWithTime.length : 0;

    // Group by tier
    const tierMap = new Map<number, { leads: number; converted: number }>();
    leads.forEach(lead => {
      const tier = lead.recommendedTier;
      const current = tierMap.get(tier) || { leads: 0, converted: 0 };
      current.leads++;
      if (lead.status === 'CONVERTED') current.converted++;
      tierMap.set(tier, current);
    });

    const byTier = Array.from(tierMap.entries())
      .map(([tier, data]) => ({
        tier,
        leads: data.leads,
        converted: data.converted,
        rate: data.leads > 0 ? (data.converted / data.leads) * 100 : 0,
      }))
      .sort((a, b) => a.tier - b.tier);

    return {
      totalLeads,
      convertedLeads,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageTimeToConvert: Math.round(averageTimeToConvert * 10) / 10,
      byTier,
    };
  } catch (error) {
    logger.error('Failed to get conversion metrics', { period }, error as Error);
    throw error;
  }
}

// ========================================
// Revenue Metrics
// ========================================

export async function getRevenueMetrics(
  period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'year'
): Promise<RevenueMetrics> {
  const { startDate, endDate } = getDateRange(period);

  try {
    // Get all succeeded payments (PaymentStatus uses SUCCEEDED not COMPLETED)
    const payments = await prisma.payment.findMany({
      where: {
        status: 'SUCCEEDED',
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        project: true,
      },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const averageOrderValue = payments.length > 0 ? totalRevenue / payments.length : 0;

    // Revenue by tier (tier is on Project directly, not a relation)
    const tierRevenueMap = new Map<number, { revenue: number; count: number }>();
    payments.forEach(payment => {
      const tier = payment.project.tier || 0;
      const current = tierRevenueMap.get(tier) || { revenue: 0, count: 0 };
      current.revenue += payment.amount;
      current.count++;
      tierRevenueMap.set(tier, current);
    });

    const revenueByTier = Array.from(tierRevenueMap.entries())
      .map(([tier, data]) => ({
        tier,
        revenue: data.revenue,
        count: data.count,
      }))
      .sort((a, b) => a.tier - b.tier);

    // Revenue by month
    const monthRevenueMap = new Map<string, { revenue: number; count: number }>();
    payments.forEach(payment => {
      const month = getMonthKey(payment.createdAt);
      const current = monthRevenueMap.get(month) || { revenue: 0, count: 0 };
      current.revenue += payment.amount;
      current.count++;
      monthRevenueMap.set(month, current);
    });

    const revenueByMonth = Array.from(monthRevenueMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalRevenue,
      averageOrderValue: Math.round(averageOrderValue),
      revenueByTier,
      revenueByMonth,
    };
  } catch (error) {
    logger.error('Failed to get revenue metrics', { period }, error as Error);
    throw error;
  }
}

// ========================================
// Tier Distribution
// ========================================

export async function getTierDistribution(): Promise<TierDistribution[]> {
  try {
    // Tier model has no projects relation - query tiers and projects separately
    const tiers = await prisma.tier.findMany();

    // Get project counts and revenue by tier
    const projectsByTier = await prisma.project.groupBy({
      by: ['tier'],
      _count: { id: true },
    });

    // Get revenue by tier from succeeded payments
    const revenueByTier = await prisma.payment.groupBy({
      by: ['tier'],
      where: { status: 'SUCCEEDED' },
      _sum: { amount: true },
    });

    const projectCountMap = new Map<number, number>(projectsByTier.map(p => [p.tier, p._count.id]));
    const revenueMap = new Map<number, number>(revenueByTier.map(r => [r.tier || 0, r._sum.amount || 0]));

    const totalProjects: number = projectsByTier.reduce((sum, p) => sum + p._count.id, 0);

    return tiers.map(tier => {
      const count: number = projectCountMap.get(tier.id) || 0;
      return {
        tier: tier.id,
        tierName: tier.name,
        count,
        percentage: totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0,
        revenue: revenueMap.get(tier.id) || 0,
      };
    }).sort((a, b) => a.tier - b.tier);
  } catch (error) {
    logger.error('Failed to get tier distribution', {}, error as Error);
    throw error;
  }
}

// ========================================
// Lead Metrics
// ========================================

export async function getLeadMetrics(
  period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'year'
): Promise<LeadMetrics> {
  const { startDate, endDate } = getDateRange(period);

  try {
    // Lead model has no source field
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    // By status
    const statusMap = new Map<string, number>();
    leads.forEach(lead => {
      statusMap.set(lead.status, (statusMap.get(lead.status) || 0) + 1);
    });

    const byStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // By source - not available in schema, return placeholder
    const bySource = [{ source: 'Direct', count: leads.length }];

    // By month
    const monthMap = new Map<string, number>();
    leads.forEach(lead => {
      const month = getMonthKey(lead.createdAt);
      monthMap.set(month, (monthMap.get(month) || 0) + 1);
    });

    const leadsByMonth = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalLeads: leads.length,
      byStatus,
      bySource,
      leadsByMonth,
    };
  } catch (error) {
    logger.error('Failed to get lead metrics', { period }, error as Error);
    throw error;
  }
}

// ========================================
// Project Metrics
// ========================================

export async function getProjectMetrics(
  period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'year'
): Promise<ProjectMetrics> {
  const { startDate, endDate } = getDateRange(period);

  try {
    // Project model has no completedAt field - use status and updatedAt as proxy
    // ProjectStatus: INTAKE, ONBOARDING, IN_PROGRESS, AWAITING_FEEDBACK, REVISIONS, DELIVERED, CLOSED
    const projects = await prisma.project.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalProjects = projects.length;
    // Active = not DELIVERED or CLOSED
    const activeProjects = projects.filter(p =>
      p.status !== 'DELIVERED' && p.status !== 'CLOSED'
    ).length;
    // Completed = DELIVERED or CLOSED
    const completedProjects = projects.filter(p => 
      p.status === 'DELIVERED' || p.status === 'CLOSED'
    ).length;

    // By status
    const statusMap = new Map<string, number>();
    projects.forEach(project => {
      statusMap.set(project.status, (statusMap.get(project.status) || 0) + 1);
    });

    const byStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Average completion time using updatedAt for DELIVERED/CLOSED projects
    const completedWithTime = projects.filter(p => 
      p.status === 'DELIVERED' || p.status === 'CLOSED'
    );
    const totalDays = completedWithTime.reduce((sum, project) => {
      const days = (project.updatedAt.getTime() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    const averageCompletionTime = completedWithTime.length > 0 ? totalDays / completedWithTime.length : 0;

    // By month - track completed by status change to DELIVERED/CLOSED
    const monthMap = new Map<string, { created: number; completed: number }>();
    projects.forEach(project => {
      const createdMonth = getMonthKey(project.createdAt);
      const current = monthMap.get(createdMonth) || { created: 0, completed: 0 };
      current.created++;
      monthMap.set(createdMonth, current);

      if (project.status === 'DELIVERED' || project.status === 'CLOSED') {
        const completedMonth = getMonthKey(project.updatedAt);
        const completedCurrent = monthMap.get(completedMonth) || { created: 0, completed: 0 };
        completedCurrent.completed++;
        monthMap.set(completedMonth, completedCurrent);
      }
    });

    const projectsByMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        created: data.created,
        completed: data.completed,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      byStatus,
      averageCompletionTime: Math.round(averageCompletionTime),
      projectsByMonth,
    };
  } catch (error) {
    logger.error('Failed to get project metrics', { period }, error as Error);
    throw error;
  }
}

// ========================================
// Dashboard Summary
// ========================================

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  try {
    // Leads
    const [totalLeads, leadsThisMonth, leadsLastMonth] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({
        where: { createdAt: { gte: thisMonthStart } },
      }),
      prisma.lead.count({
        where: {
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
    ]);

    // Conversions - Lead has no convertedAt field, use updatedAt for CONVERTED leads
    const [conversionsThisMonth, conversionsLastMonth, leadsForConversionThisMonth, leadsForConversionLastMonth] = await Promise.all([
      prisma.lead.count({
        where: {
          status: 'CONVERTED',
          updatedAt: { gte: thisMonthStart },
        },
      }),
      prisma.lead.count({
        where: {
          status: 'CONVERTED',
          updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      prisma.lead.count({
        where: { createdAt: { gte: thisMonthStart } },
      }),
      prisma.lead.count({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
    ]);

    const conversionRateThisMonth = leadsForConversionThisMonth > 0
      ? (conversionsThisMonth / leadsForConversionThisMonth) * 100
      : 0;
    const conversionRateLastMonth = leadsForConversionLastMonth > 0
      ? (conversionsLastMonth / leadsForConversionLastMonth) * 100
      : 0;

    // Revenue - PaymentStatus uses SUCCEEDED not COMPLETED
    const [revenueThisMonth, revenueLastMonth, totalRevenue] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: 'SUCCEEDED',
          createdAt: { gte: thisMonthStart },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: 'SUCCEEDED',
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'SUCCEEDED' },
        _sum: { amount: true },
      }),
    ]);

    // Projects - ProjectStatus uses DELIVERED/CLOSED not COMPLETED/CANCELLED
    const [activeProjects, completedProjects, projectsThisMonth] = await Promise.all([
      prisma.project.count({
        where: { status: { notIn: ['DELIVERED', 'CLOSED'] } },
      }),
      prisma.project.count({
        where: { status: { in: ['DELIVERED', 'CLOSED'] } },
      }),
      prisma.project.count({
        where: { createdAt: { gte: thisMonthStart } },
      }),
    ]);

    return {
      leads: {
        total: totalLeads,
        thisMonth: leadsThisMonth,
        lastMonth: leadsLastMonth,
        change: calculatePercentageChange(leadsThisMonth, leadsLastMonth),
      },
      conversions: {
        rate: Math.round(conversionRateThisMonth * 10) / 10,
        thisMonth: conversionsThisMonth,
        lastMonth: conversionsLastMonth,
        change: calculatePercentageChange(conversionsThisMonth, conversionsLastMonth),
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        thisMonth: revenueThisMonth._sum.amount || 0,
        lastMonth: revenueLastMonth._sum.amount || 0,
        change: calculatePercentageChange(
          revenueThisMonth._sum.amount || 0,
          revenueLastMonth._sum.amount || 0
        ),
      },
      projects: {
        active: activeProjects,
        completed: completedProjects,
        thisMonth: projectsThisMonth,
      },
    };
  } catch (error) {
    logger.error('Failed to get dashboard summary', {}, error as Error);
    throw error;
  }
}

// ========================================
// Monthly Report
// ========================================

export interface MonthlyReport {
  period: string;
  generatedAt: string;
  summary: DashboardSummary;
  conversions: ConversionMetrics;
  revenue: RevenueMetrics;
  tierDistribution: TierDistribution[];
  leads: LeadMetrics;
  projects: ProjectMetrics;
}

export async function generateMonthlyReport(
  year: number,
  month: number
): Promise<MonthlyReport> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const period = `${year}-${String(month).padStart(2, '0')}`;

  try {
    const [summary, conversions, revenue, tierDistribution, leads, projects] = await Promise.all([
      getDashboardSummary(),
      getConversionMetrics('month'),
      getRevenueMetrics('month'),
      getTierDistribution(),
      getLeadMetrics('month'),
      getProjectMetrics('month'),
    ]);

    return {
      period,
      generatedAt: new Date().toISOString(),
      summary,
      conversions,
      revenue,
      tierDistribution,
      leads,
      projects,
    };
  } catch (error) {
    logger.error('Failed to generate monthly report', { year, month }, error as Error);
    throw error;
  }
}

export default {
  getConversionMetrics,
  getRevenueMetrics,
  getTierDistribution,
  getLeadMetrics,
  getProjectMetrics,
  getDashboardSummary,
  generateMonthlyReport,
};
