import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { prisma } from '../utils/prisma';
import { createCheckoutSessionSchema, CreateCheckoutSessionInput } from '../utils/validation';
import { createCheckoutSession, getCheckoutSession } from '../utils/stripeHelpers';
import { isPayableTier } from '../utils/stripe';

const router = Router();

/**
 * POST /api/checkout/create-session
 * Create a Stripe checkout session for a lead
 */
router.post('/create-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData: CreateCheckoutSessionInput = createCheckoutSessionSchema.parse(req.body);
    const { leadId, tier, successUrl, cancelUrl } = validatedData;

    // Validate tier is payable
    if (!isPayableTier(tier)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TIER',
          message: 'Tier 4 (Legacy) requires a consultation. Please contact us directly.',
        },
      });
    }

    // Fetch the lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
        },
      });
    }

    // Check lead status - only NEW or QUALIFIED leads can checkout
    if (lead.status === 'CONVERTED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'LEAD_ALREADY_CONVERTED',
          message: 'This lead has already been converted to a client',
        },
      });
    }

    if (lead.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'LEAD_CLOSED',
          message: 'This lead has been closed',
        },
      });
    }

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      leadId: lead.id,
      tier: tier as 1 | 2 | 3,
      customerEmail: lead.email,
      successUrl,
      cancelUrl,
      metadata: {
        lead_email: lead.email,
        project_address: lead.projectAddress,
      },
    });

    // Update lead status to QUALIFIED if it was NEW
    if (lead.status === 'NEW') {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: 'QUALIFIED' },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        url: session.url,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/checkout/session/:sessionId
 * Get checkout session status (for success page)
 */
router.get('/session/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required',
        },
      });
    }

    const session = await getCheckoutSession(sessionId);

    // Extract relevant information
    const responseData = {
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email || session.customer_details?.email,
      amountTotal: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error: unknown) {
    // Handle Stripe errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message?: string };
      if (stripeError.type === 'StripeInvalidRequestError') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Checkout session not found',
          },
        });
      }
    }
    next(error);
  }
});

export default router;
