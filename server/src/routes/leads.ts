import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { recommendTier } from '../utils/tierRouter';
import { createLeadSchema, CreateLeadInput } from '../utils/validation';

const router = Router();

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

export default router;
