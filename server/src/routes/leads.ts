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
