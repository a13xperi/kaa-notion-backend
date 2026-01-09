import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { recommendTier } from '../utils/tierRouter';
import {
  createLeadSchema,
  leadFiltersSchema,
  updateLeadSchema,
  convertLeadSchema,
  CreateLeadInput,
} from '../utils/validation';

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

/**
 * PATCH /api/leads/:id
 * Update lead status, override tier recommendation (admin only)
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateLeadSchema.safeParse(req.body);

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

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existingLead) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lead not found',
        },
      });
      return;
    }

    const data = validationResult.data;

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.tierOverride !== undefined) {
      updateData.tierOverride = data.tierOverride;
    }

    if (data.overrideReason !== undefined) {
      updateData.overrideReason = data.overrideReason;
    }

    // Update lead
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    // Calculate effective tier
    const effectiveTier = updatedLead.tierOverride ?? updatedLead.recommendedTier;

    res.json({
      success: true,
      data: {
        id: updatedLead.id,
        email: updatedLead.email,
        name: updatedLead.name,
        projectAddress: updatedLead.projectAddress,
        budgetRange: updatedLead.budgetRange,
        timeline: updatedLead.timeline,
        projectType: updatedLead.projectType,
        hasSurvey: updatedLead.hasSurvey,
        hasDrawings: updatedLead.hasDrawings,
        status: updatedLead.status,
        recommendedTier: updatedLead.recommendedTier,
        tierOverride: updatedLead.tierOverride,
        overrideReason: updatedLead.overrideReason,
        effectiveTier,
        createdAt: updatedLead.createdAt,
        updatedAt: updatedLead.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    next(error);
  }
});

/**
 * POST /api/leads/:id/convert
 * Convert lead to client after payment
 */
router.post('/:id/convert', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = convertLeadSchema.safeParse(req.body);

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

    // Check if lead exists
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

    // Check if lead is already converted
    if (lead.clientId) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_CONVERTED',
          message: 'Lead has already been converted to a client',
        },
      });
      return;
    }

    const data = validationResult.data;
    const effectiveTier = lead.tierOverride ?? lead.recommendedTier;

    // Use a transaction to create user, client, project, and update lead
    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const user = await tx.user.create({
        data: {
          email: lead.email,
          passwordHash: data.password ?? 'PENDING_PASSWORD_SETUP', // In production, hash the password
          userType: effectiveTier === 4 ? 'KAA_CLIENT' : 'SAGE_CLIENT',
          tier: effectiveTier,
        },
      });

      // Create client
      const client = await tx.client.create({
        data: {
          userId: user.id,
          tier: effectiveTier,
          projectAddress: lead.projectAddress,
          status: 'ONBOARDING',
        },
      });

      // Create project
      const projectName = data.projectName ?? `${lead.name ?? lead.email}'s Project`;
      const project = await tx.project.create({
        data: {
          clientId: client.id,
          leadId: lead.id,
          tier: effectiveTier,
          name: projectName,
          status: 'ONBOARDING',
          paymentStatus: 'paid',
        },
      });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          projectId: project.id,
          stripePaymentIntentId: data.stripePaymentIntentId,
          stripeCustomerId: data.stripeCustomerId,
          amount: data.amount,
          currency: 'usd',
          status: 'SUCCEEDED',
          tier: effectiveTier,
        },
      });

      // Update lead to mark as converted
      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          clientId: client.id,
          status: 'CONVERTED',
        },
      });

      return { user, client, project, payment, lead: updatedLead };
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          userType: result.user.userType,
          tier: result.user.tier,
        },
        client: {
          id: result.client.id,
          tier: result.client.tier,
          status: result.client.status,
          projectAddress: result.client.projectAddress,
        },
        project: {
          id: result.project.id,
          name: result.project.name,
          tier: result.project.tier,
          status: result.project.status,
          paymentStatus: result.project.paymentStatus,
        },
        payment: {
          id: result.payment.id,
          amount: result.payment.amount,
          currency: result.payment.currency,
          status: result.payment.status,
        },
        lead: {
          id: result.lead.id,
          status: result.lead.status,
          clientId: result.lead.clientId,
        },
      },
    });
  } catch (error) {
    console.error('Error converting lead:', error);

    // Handle unique constraint violation (duplicate email)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email already exists',
        },
      });
      return;
    }

    next(error);
  }
});

export default router;
