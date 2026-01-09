import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { recommendTier } from '../utils/tierRouter';
import { createLeadSchema, leadFiltersSchema, CreateLeadInput } from '../utils/validation';

const router = Router();

/**
 * GET /api/leads
 * List leads with pagination, filtering by status and tier (admin only)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate query params
    const validationResult = leadFiltersSchema.safeParse(req.query);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
      return;
    }

    const { page, limit, status, tier, email } = validationResult.data;

    // Build where clause for filtering
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (tier) {
      where.recommendedTier = tier;
    }

    if (email) {
      where.email = {
        contains: email,
        mode: 'insensitive',
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.lead.count({ where });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch leads with pagination
    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
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
        tierOverride: true,
        overrideReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: leads,
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    next(error);
  }
});

/**
 * POST /api/leads
 * Create a new lead from intake form and run tier router
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const validationResult = createLeadSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
      return;
    }

    const data: CreateLeadInput = validationResult.data;

    // Run tier router algorithm
    const tierRecommendation = recommendTier({
      budgetRange: data.budgetRange,
      timeline: data.timeline,
      projectType: data.projectType,
      hasSurvey: data.hasSurvey,
      hasDrawings: data.hasDrawings,
      projectAddress: data.projectAddress,
      email: data.email,
      name: data.name,
    });

    // Determine initial lead status based on recommendation
    const initialStatus = tierRecommendation.needsManualReview ? 'NEEDS_REVIEW' : 'NEW';

    // Create lead in database
    const lead = await prisma.lead.create({
      data: {
        email: data.email,
        name: data.name,
        projectAddress: data.projectAddress,
        budgetRange: data.budgetRange,
        timeline: data.timeline,
        projectType: data.projectType,
        hasSurvey: data.hasSurvey,
        hasDrawings: data.hasDrawings,
        recommendedTier: tierRecommendation.tier,
        routingReason: tierRecommendation.reason,
        status: initialStatus,
      },
    });

    // Return success response with lead and tier recommendation
    res.status(201).json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          email: lead.email,
          name: lead.name,
          projectAddress: lead.projectAddress,
          budgetRange: lead.budgetRange,
          timeline: lead.timeline,
          projectType: lead.projectType,
          hasSurvey: lead.hasSurvey,
          hasDrawings: lead.hasDrawings,
          status: lead.status,
          createdAt: lead.createdAt,
        },
        tierRecommendation: {
          tier: tierRecommendation.tier,
          reason: tierRecommendation.reason,
          confidence: tierRecommendation.confidence,
          needsManualReview: tierRecommendation.needsManualReview,
          factors: tierRecommendation.factors,
        },
      },
    });
  } catch (error) {
    console.error('Error creating lead:', error);

    // Handle unique constraint violation (duplicate email in same session)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_LEAD',
          message: 'A lead with this email already exists',
        },
      });
      return;
    }

    // Pass to error handler
    next(error);
  }
});

/**
 * GET /api/leads/:id
 * Get single lead with tier recommendation details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Fetch lead by ID
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lead not found',
        },
      });
      return;
    }

    // Re-calculate tier recommendation for detailed response
    const tierRecommendation = recommendTier({
      budgetRange: lead.budgetRange,
      timeline: lead.timeline,
      projectType: lead.projectType,
      hasSurvey: lead.hasSurvey,
      hasDrawings: lead.hasDrawings,
      projectAddress: lead.projectAddress,
      email: lead.email,
      name: lead.name ?? undefined,
    });

    // Determine effective tier (override or recommended)
    const effectiveTier = lead.tierOverride ?? lead.recommendedTier;

    res.json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          email: lead.email,
          name: lead.name,
          projectAddress: lead.projectAddress,
          budgetRange: lead.budgetRange,
          timeline: lead.timeline,
          projectType: lead.projectType,
          hasSurvey: lead.hasSurvey,
          hasDrawings: lead.hasDrawings,
          status: lead.status,
          recommendedTier: lead.recommendedTier,
          tierOverride: lead.tierOverride,
          overrideReason: lead.overrideReason,
          effectiveTier,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        },
        tierRecommendation: {
          tier: tierRecommendation.tier,
          reason: tierRecommendation.reason,
          confidence: tierRecommendation.confidence,
          needsManualReview: tierRecommendation.needsManualReview,
          factors: tierRecommendation.factors,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    next(error);
  }
});

export default router;
