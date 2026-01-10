/**
 * Analytics Routes
 *
 * GET /api/admin/analytics - Dashboard summary and metrics
 * GET /api/admin/analytics/conversions - Conversion metrics
 * GET /api/admin/analytics/revenue - Revenue metrics
 * GET /api/admin/analytics/leads - Lead metrics
 * GET /api/admin/analytics/projects - Project metrics
 * GET /api/admin/analytics/tiers - Tier distribution
 * GET /api/admin/analytics/report/:year/:month - Monthly report
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import metricsService from '../services/metricsService';
import { logger } from '../config/logger';

const router = Router();

// ========================================
// Validation Schemas
// ========================================

const periodSchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional().default('month'),
});

const monthlyReportSchema = z.object({
  year: z.string().transform((v) => parseInt(v, 10)),
  month: z.string().transform((v) => parseInt(v, 10)),
});

// ========================================
// Middleware - Admin Check
// ========================================

function requireAdmin(req: Request, res: Response, next: () => void) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
  }

  next();
}

// ========================================
// Routes
// ========================================

/**
 * GET /api/admin/analytics
 *
 * Get dashboard summary with all key metrics.
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const [summary, tierDistribution] = await Promise.all([
      metricsService.getDashboardSummary(),
      metricsService.getTierDistribution(),
    ]);

    return res.json({
      success: true,
      data: {
        summary,
        tierDistribution,
      },
    });
  } catch (error) {
    logger.error('Failed to get analytics summary', {}, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch analytics' },
    });
  }
});

/**
 * GET /api/admin/analytics/conversions
 *
 * Get conversion metrics with optional period filter.
 */
router.get('/conversions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const validation = periodSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid period' },
      });
    }

    const { period } = validation.data;
    const metrics = await metricsService.getConversionMetrics(period);

    return res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to get conversion metrics', {}, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch conversion metrics' },
    });
  }
});

/**
 * GET /api/admin/analytics/revenue
 *
 * Get revenue metrics with optional period filter.
 */
router.get('/revenue', requireAdmin, async (req: Request, res: Response) => {
  try {
    const validation = periodSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid period' },
      });
    }

    const { period } = validation.data;
    const metrics = await metricsService.getRevenueMetrics(period);

    return res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to get revenue metrics', {}, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch revenue metrics' },
    });
  }
});

/**
 * GET /api/admin/analytics/leads
 *
 * Get lead metrics with optional period filter.
 */
router.get('/leads', requireAdmin, async (req: Request, res: Response) => {
  try {
    const validation = periodSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid period' },
      });
    }

    const { period } = validation.data;
    const metrics = await metricsService.getLeadMetrics(period);

    return res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to get lead metrics', {}, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch lead metrics' },
    });
  }
});

/**
 * GET /api/admin/analytics/projects
 *
 * Get project metrics with optional period filter.
 */
router.get('/projects', requireAdmin, async (req: Request, res: Response) => {
  try {
    const validation = periodSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid period' },
      });
    }

    const { period } = validation.data;
    const metrics = await metricsService.getProjectMetrics(period);

    return res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to get project metrics', {}, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch project metrics' },
    });
  }
});

/**
 * GET /api/admin/analytics/tiers
 *
 * Get tier distribution.
 */
router.get('/tiers', requireAdmin, async (req: Request, res: Response) => {
  try {
    const distribution = await metricsService.getTierDistribution();

    return res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    logger.error('Failed to get tier distribution', {}, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch tier distribution' },
    });
  }
});

/**
 * GET /api/admin/analytics/report/:year/:month
 *
 * Generate monthly report.
 */
router.get('/report/:year/:month', requireAdmin, async (req: Request, res: Response) => {
  try {
    const validation = monthlyReportSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid year or month' },
      });
    }

    const { year, month } = validation.data;

    // Validate month range
    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Month must be between 1 and 12' },
      });
    }

    const report = await metricsService.generateMonthlyReport(year, month);

    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Failed to generate monthly report', req.params, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate report' },
    });
  }
});

/**
 * GET /api/admin/analytics/export
 *
 * Export analytics data as CSV (basic implementation).
 */
router.get('/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'year';
    const validPeriod = ['week', 'month', 'quarter', 'year', 'all'].includes(period)
      ? (period as 'week' | 'month' | 'quarter' | 'year' | 'all')
      : 'year';

    const [leads, revenue, projects] = await Promise.all([
      metricsService.getLeadMetrics(validPeriod),
      metricsService.getRevenueMetrics(validPeriod),
      metricsService.getProjectMetrics(validPeriod),
    ]);

    // Build CSV
    let csv = 'Analytics Export\n';
    csv += `Period: ${validPeriod}\n`;
    csv += `Generated: ${new Date().toISOString()}\n\n`;

    csv += 'Lead Metrics\n';
    csv += 'Month,Count\n';
    leads.leadsByMonth.forEach(item => {
      csv += `${item.month},${item.count}\n`;
    });

    csv += '\nRevenue Metrics\n';
    csv += 'Month,Revenue,Transactions\n';
    revenue.revenueByMonth.forEach(item => {
      csv += `${item.month},${item.revenue / 100},${item.count}\n`;
    });

    csv += '\nProject Metrics\n';
    csv += 'Month,Created,Completed\n';
    projects.projectsByMonth.forEach(item => {
      csv += `${item.month},${item.created},${item.completed}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${validPeriod}-${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    logger.error('Failed to export analytics', {}, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to export analytics' },
    });
  }
});

export default router;
