import { Router, Request, Response } from 'express';
import { LeadModel, LeadData } from '../models/Lead';
import { recommendTier, getNextUrl, IntakeFormData } from '../utils/tierRouter';

const router = Router();

/**
 * Intake form validation schema
 */
interface IntakePayload {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  projectAddress?: string;
  budgetRange: string;
  timeline: string;
  projectType: string;
  hasSurvey: boolean;
  hasDrawings: boolean;
  projectDescription?: string;
}

/**
 * Validate intake payload
 */
function validateIntakePayload(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!body.email || typeof body.email !== 'string') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('Invalid email format');
  }

  if (!body.budgetRange || typeof body.budgetRange !== 'string') {
    errors.push('Budget range is required');
  }

  if (!body.timeline || typeof body.timeline !== 'string') {
    errors.push('Timeline is required');
  }

  if (!body.projectType || typeof body.projectType !== 'string') {
    errors.push('Project type is required');
  }

  if (typeof body.hasSurvey !== 'boolean') {
    errors.push('hasSurvey must be a boolean');
  }

  if (typeof body.hasDrawings !== 'boolean') {
    errors.push('hasDrawings must be a boolean');
  }

  // Optional field validation
  if (body.firstName && typeof body.firstName !== 'string') {
    errors.push('First name must be a string');
  }

  if (body.lastName && typeof body.lastName !== 'string') {
    errors.push('Last name must be a string');
  }

  if (body.phone && typeof body.phone !== 'string') {
    errors.push('Phone must be a string');
  }

  if (body.projectAddress && typeof body.projectAddress !== 'string') {
    errors.push('Project address must be a string');
  }

  if (body.projectDescription && typeof body.projectDescription !== 'string') {
    errors.push('Project description must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * POST /api/sage/intake
 *
 * Process a new lead intake form submission.
 * - Validates the payload
 * - Runs tier router logic
 * - Creates a Lead in the database
 * - Returns the next URL and recommended tier
 */
router.post('/intake', async (req: Request, res: Response) => {
  try {
    // Validate payload
    const validation = validateIntakePayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const payload: IntakePayload = req.body;

    // Run tier router logic
    const intakeData: IntakeFormData = {
      budgetRange: payload.budgetRange,
      timeline: payload.timeline,
      projectType: payload.projectType,
      hasSurvey: payload.hasSurvey,
      hasDrawings: payload.hasDrawings,
      projectAddress: payload.projectAddress,
    };

    const tierResult = recommendTier(intakeData);
    const nextUrl = getNextUrl(tierResult.tier);

    // Create Lead in database
    const leadData: LeadData = {
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      projectAddress: payload.projectAddress,
      budgetRange: payload.budgetRange,
      timeline: payload.timeline,
      projectType: payload.projectType,
      hasSurvey: payload.hasSurvey,
      hasDrawings: payload.hasDrawings,
      projectDescription: payload.projectDescription,
      recommendedTier: tierResult.tier,
      tierReason: tierResult.reason,
      tierConfidence: tierResult.confidence,
      needsManualReview: tierResult.needsManualReview,
    };

    const lead = await LeadModel.create(leadData);

    console.log(`Lead created: ${lead.id} - Tier ${tierResult.tier} (${tierResult.confidence} confidence)`);

    // Return response
    res.status(201).json({
      success: true,
      leadId: lead.id,
      recommendedTier: tierResult.tier,
      tierReason: tierResult.reason,
      confidence: tierResult.confidence,
      needsManualReview: tierResult.needsManualReview,
      nextUrl,
    });
  } catch (error) {
    console.error('Error processing intake:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process intake form',
    });
  }
});

/**
 * GET /api/sage/lead/:id
 *
 * Get a lead by ID (for reference/debugging)
 */
router.get('/lead/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lead ID',
      });
    }

    const lead = await LeadModel.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    res.json({
      success: true,
      lead,
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead',
    });
  }
});

/**
 * GET /api/sage/leads/pending-review
 *
 * Get all leads pending manual review
 */
router.get('/leads/pending-review', async (req: Request, res: Response) => {
  try {
    const leads = await LeadModel.findPendingReview();

    res.json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error('Error fetching pending leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending leads',
    });
  }
});

export default router;
