/**
 * Checkout Routes
 * POST /api/checkout/create-session - Create Stripe checkout session
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  createCheckoutSession, 
  getTierPricing, 
  isValidTier,
  TIER_PRICING
} from '../utils/stripeHelpers';
import { validationError, notFound } from '../utils/AppError';
import { logger } from '../logger';

// ============================================================================
// SCHEMAS
// ============================================================================

const createSessionSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  tier: z.coerce.number().min(1).max(3, 'Tier must be between 1 and 3'),
  email: z.string().email('Valid email is required'),
  projectId: z.string().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createCheckoutRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * POST /create-session
   * Creates a Stripe checkout session for a tier purchase.
   */
  router.post(
    '/create-session',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate input
        const validation = createSessionSchema.safeParse(req.body);
        if (!validation.success) {
          throw validationError(
            validation.error.issues.map((e: { message: string }) => e.message).join(', '),
            { errors: validation.error.issues }
          );
        }

        const { leadId, tier, email, projectId, successUrl, cancelUrl } = validation.data;

        // Validate tier is payable (1-3, not 4)
        if (!isValidTier(tier) || tier === 4) {
          throw validationError('Invalid tier for checkout. Tier must be 1, 2, or 3.');
        }

        // Verify lead exists
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          include: { client: true },
        });

        if (!lead) {
          throw notFound('Lead not found');
        }

        // Check if lead already has a client/payment
        if (lead.client) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'ALREADY_CONVERTED',
              message: 'This lead has already been converted to a client',
            },
          });
        }

        // Create checkout session
        const session = await createCheckoutSession({
          leadId,
          tier: tier as 1 | 2 | 3,
          email,
          projectId,
          successUrl,
          cancelUrl,
          metadata: {
            leadEmail: lead.email,
            projectAddress: lead.projectAddress,
          },
        });

        logger.info('Checkout session created', {
          sessionId: session.id,
          leadId,
          tier,
          email,
        });

        res.status(201).json({
          success: true,
          data: {
            sessionId: session.id,
            url: session.url,
            expiresAt: session.expires_at,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /session/:sessionId
   * Retrieves a checkout session status.
   */
  router.get(
    '/session/:sessionId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId } = req.params;

        const { getCheckoutSession } = await import('../utils/stripeHelpers');
        const session = await getCheckoutSession(sessionId);

        res.json({
          success: true,
          data: {
            id: session.id,
            status: session.status,
            paymentStatus: session.payment_status,
            amountTotal: session.amount_total,
            currency: session.currency,
            customerEmail: session.customer_email,
            metadata: session.metadata,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /pricing
   * Returns tier pricing information.
   */
  router.get('/pricing', (_req: Request, res: Response) => {
    const pricing = Object.values(TIER_PRICING)
      .filter(p => p.tier !== 4) // Exclude Tier 4 (custom pricing)
      .map(p => ({
        tier: p.tier,
        name: p.name,
        description: p.description,
        amount: p.amount,
        currency: p.currency,
        formattedPrice: `$${(p.amount / 100).toLocaleString()}`,
      }));

    res.json({
      success: true,
      data: pricing,
    });
  });

  return router;
}
