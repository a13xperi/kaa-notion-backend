/**
 * Checkout Routes
 * POST /api/checkout/create-session - Create Stripe checkout session
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  createCheckoutSession, 
  getTierPricing, 
  isValidTier,
  TIER_PRICING
} from '../utils/stripeHelpers';
import { validationError, notFound } from '../utils/AppError';
import { logger } from '../logger';
import { createCheckoutSchema, type CreateCheckoutInput } from '../utils';
import { validateBody } from '../middleware';
import { AuditActions, ResourceTypes, getRequestAuditMetadata, logAudit } from '../services/auditService';

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createCheckoutRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * @openapi
   * /api/checkout/create-session:
   *   post:
   *     summary: Create Stripe checkout session
   *     description: Create a checkout session for tier 1-3 purchase
   *     tags: [Checkout]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateCheckoutRequest'
   *     responses:
   *       200:
   *         description: Checkout session created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CheckoutResponse'
   *       400:
   *         description: Lead already converted
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   *       422:
   *         $ref: '#/components/responses/ValidationError'
   */
  router.post(
    '/create-session',
    validateBody(createCheckoutSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { leadId, tier, email, projectId, successUrl, cancelUrl } =
          req.body as CreateCheckoutInput;

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
        void logAudit({
          action: AuditActions.CHECKOUT_START,
          resourceType: ResourceTypes.LEAD,
          resourceId: leadId,
          details: {
            sessionId: session.id,
            tier,
            email,
            projectId,
          },
          metadata: getRequestAuditMetadata(req),
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
   * @openapi
   * /api/checkout/pricing:
   *   get:
   *     summary: Get tier pricing
   *     description: Returns pricing information for all service tiers
   *     tags: [Checkout]
   *     security: []
   *     responses:
   *       200:
   *         description: Pricing information
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/TierPricing'
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
