/**
 * Leads API Routes
 * Handles lead creation, listing, and management.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { recommendTier, validateIntakeData, IntakeFormData } from '../services/tierRouter';
import { logger } from '../logger';

const router = Router();

/**
 * Create Lead Request Body
 */
interface CreateLeadBody {
  email: string;
  name?: string;
  projectAddress: string;
  budget: number;
  timelineWeeks: number;
  projectType: string;
  hasSurvey: boolean;
  hasDrawings: boolean;
}

/**
 * GET /api/leads Query Parameters
 */
interface ListLeadsQuery {
  page?: string;
  limit?: string;
  status?: string;
  tier?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * GET /api/leads
 * List leads with pagination, filtering by status and tier (admin only)
 */
router.get('/', async (req: Request<{}, {}, {}, ListLeadsQuery>, res: Response) => {
  try {
    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    // Parse filter parameters
    const { status, tier, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      // Support multiple statuses comma-separated
      const statuses = status.split(',').map((s) => s.trim().toUpperCase());
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }

    if (tier) {
      // Support multiple tiers comma-separated
      const tiers = tier.split(',').map((t) => parseInt(t.trim(), 10)).filter((t) => !isNaN(t));
      if (tiers.length > 0) {
        where.recommendedTier = tiers.length === 1 ? tiers[0] : { in: tiers };
      }
    }

    if (search) {
      // Search in email, name, and projectAddress
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { projectAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Validate sort field
    const allowedSortFields = ['createdAt', 'updatedAt', 'email', 'name', 'status', 'recommendedTier'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderByDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    // Execute queries in parallel
    const [leads, totalCount] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderByDirection },
        select: {
          id: true,
          email: true,
          name: true,
          projectAddress: true,
          budgetRange: true,
          timeline: true,
          projectType: true,
          hasSurvey: true,
          hasDrawings: true,
          recommendedTier: true,
          routingReason: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.lead.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    logger.info('Leads listed', {
      page,
      limit,
      totalCount,
      filters: { status, tier, search },
    });

    res.json({
      success: true,
      data: {
        leads,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    logger.error('Error listing leads', { error });
    res.status(500).json({
      error: 'Internal server error',
      details: ['Failed to fetch leads. Please try again.'],
    });
  }
});

/**
 * POST /api/leads
 * Create a new lead from intake form data, run tier router, return recommendation
 */
router.post('/', async (req: Request<{}, {}, CreateLeadBody>, res: Response) => {
  try {
    const {
      email,
      name,
      projectAddress,
      budget,
      timelineWeeks,
      projectType,
      hasSurvey,
      hasDrawings,
    } = req.body;

    // Validate required fields
    if (!email || !projectAddress) {
      return res.status(400).json({
        error: 'Validation error',
        details: ['Email and project address are required'],
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation error',
        details: ['Invalid email format'],
      });
    }

    // Prepare intake form data for tier router
    const intakeData: Partial<IntakeFormData> = {
      budget,
      timelineWeeks,
      projectType: projectType as IntakeFormData['projectType'],
      hasSurvey: Boolean(hasSurvey),
      hasDrawings: Boolean(hasDrawings),
      projectAddress,
    };

    // Validate intake data
    const validationErrors = validateIntakeData(intakeData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation error',
        details: validationErrors,
      });
    }

    // Run tier router to get recommendation
    const recommendation = recommendTier(intakeData as IntakeFormData);

    logger.info('Tier recommendation generated', {
      email,
      tier: recommendation.tier,
      confidence: recommendation.confidence,
      needsManualReview: recommendation.needsManualReview,
    });

    // Determine lead status based on recommendation
    const leadStatus = recommendation.needsManualReview ? 'NEEDS_REVIEW' : 'QUALIFIED';

    // Create lead in database
    const lead = await prisma.lead.create({
      data: {
        email,
        name: name || null,
        projectAddress,
        budgetRange: `$${budget.toLocaleString()}`,
        timeline: `${timelineWeeks} weeks`,
        projectType,
        hasSurvey: Boolean(hasSurvey),
        hasDrawings: Boolean(hasDrawings),
        recommendedTier: recommendation.tier,
        routingReason: recommendation.reason,
        status: leadStatus,
      },
    });

    logger.info('Lead created', { leadId: lead.id, email, tier: recommendation.tier });

    // Return lead with tier recommendation details
    res.status(201).json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          email: lead.email,
          name: lead.name,
          projectAddress: lead.projectAddress,
          status: lead.status,
          createdAt: lead.createdAt,
        },
        recommendation: {
          tier: recommendation.tier,
          tierName: recommendation.tierName,
          reason: recommendation.reason,
          confidence: recommendation.confidence,
          needsManualReview: recommendation.needsManualReview,
          factors: recommendation.factors,
          redFlags: recommendation.redFlags,
        },
      },
    });
  } catch (error) {
    logger.error('Error creating lead', { error });

    // Handle Prisma unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(409).json({
        error: 'Conflict',
        details: ['A lead with this email already exists for this project'],
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      details: ['Failed to create lead. Please try again.'],
    });
  }
});

export default router;
