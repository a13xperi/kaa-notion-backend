/**
 * Demo Routes
 * Provides demo/test endpoints for Stripe payment simulation.
 * These routes only work in development mode or when STRIPE_SECRET_KEY is not set.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, PaymentStatus, ProjectStatus, LeadStatus, ClientStatus } from '@prisma/client';
import {
  isStripeMockMode,
  createMockCheckoutSession,
  getMockCheckoutSession,
  completeMockCheckoutSession,
  listMockSessions,
  clearMockData,
} from '../utils/stripeMock';
import { TIER_PRICING } from '../utils/stripeHelpers';
import { logger } from '../logger';

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createDemoRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * GET /demo/status
   * Check if demo mode is enabled.
   */
  router.get('/status', (_req: Request, res: Response) => {
    const isDemoMode = isStripeMockMode();
    const env = process.env.NODE_ENV || 'development';

    res.json({
      success: true,
      data: {
        demoMode: isDemoMode,
        environment: env,
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY && !isDemoMode,
        message: isDemoMode
          ? 'Demo mode enabled - payments will be simulated'
          : 'Live mode - real Stripe payments enabled',
      },
    });
  });

  /**
   * POST /demo/checkout/create-session
   * Create a mock checkout session for demo purposes.
   */
  router.post(
    '/checkout/create-session',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!isStripeMockMode() && process.env.NODE_ENV === 'production') {
          return res.status(403).json({
            success: false,
            error: { code: 'DEMO_DISABLED', message: 'Demo mode is not available in production' },
          });
        }

        const { leadId, tier, email } = req.body;

        if (!leadId || !tier || !email) {
          return res.status(400).json({
            success: false,
            error: { code: 'MISSING_FIELDS', message: 'leadId, tier, and email are required' },
          });
        }

        if (![1, 2, 3].includes(tier)) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_TIER', message: 'Tier must be 1, 2, or 3' },
          });
        }

        // Verify lead exists
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
        });

        if (!lead) {
          return res.status(404).json({
            success: false,
            error: { code: 'LEAD_NOT_FOUND', message: 'Lead not found' },
          });
        }

        const pricing = TIER_PRICING[tier as 1 | 2 | 3];
        const baseUrl = process.env.APP_URL || 'http://localhost:3000';

        const session = createMockCheckoutSession({
          leadId,
          tier,
          email,
          amount: pricing.amount,
          currency: pricing.currency,
          tierName: pricing.name,
          successUrl: `${baseUrl}/checkout/success`,
          cancelUrl: `${baseUrl}/checkout/cancel`,
          metadata: {
            projectAddress: lead.projectAddress,
          },
        });

        logger.info('Mock checkout session created', {
          sessionId: session.id,
          leadId,
          tier,
          amount: pricing.amount,
        });

        res.status(201).json({
          success: true,
          data: {
            sessionId: session.id,
            url: `${baseUrl}${session.url}`,
            expiresAt: session.expires_at,
            demoMode: true,
            message: 'This is a demo session - use /demo/checkout/complete to simulate payment',
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /demo/checkout/:sessionId
   * Get mock checkout session details.
   */
  router.get(
    '/checkout/:sessionId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId } = req.params;
        const session = getMockCheckoutSession(sessionId);

        if (!session) {
          return res.status(404).json({
            success: false,
            error: { code: 'SESSION_NOT_FOUND', message: 'Checkout session not found' },
          });
        }

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
            demoMode: true,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /demo/checkout/complete
   * Complete a mock checkout session (simulate successful payment).
   * This creates the necessary database records as if payment was received.
   */
  router.post(
    '/checkout/complete',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!isStripeMockMode() && process.env.NODE_ENV === 'production') {
          return res.status(403).json({
            success: false,
            error: { code: 'DEMO_DISABLED', message: 'Demo mode is not available in production' },
          });
        }

        const { sessionId, customerName } = req.body;

        if (!sessionId) {
          return res.status(400).json({
            success: false,
            error: { code: 'MISSING_SESSION_ID', message: 'sessionId is required' },
          });
        }

        const session = getMockCheckoutSession(sessionId);
        if (!session) {
          return res.status(404).json({
            success: false,
            error: { code: 'SESSION_NOT_FOUND', message: 'Checkout session not found' },
          });
        }

        if (session.status === 'complete') {
          return res.status(400).json({
            success: false,
            error: { code: 'ALREADY_COMPLETED', message: 'Session has already been completed' },
          });
        }

        // Complete the mock session
        completeMockCheckoutSession(sessionId, customerName || 'Demo Customer');

        // Process the "payment" - create database records
        const leadId = session.metadata.leadId;
        const tier = parseInt(session.metadata.tier, 10) as 1 | 2 | 3;

        const result = await prisma.$transaction(async (tx) => {
          // Get lead
          const lead = await tx.lead.findUnique({
            where: { id: leadId },
            include: { client: true },
          });

          if (!lead) {
            throw new Error(`Lead not found: ${leadId}`);
          }

          let client = lead.client;
          let user;

          // Create user and client if not exists
          if (!client) {
            user = await tx.user.create({
              data: {
                email: lead.email,
                name: customerName || 'Demo Customer',
                passwordHash: `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                userType: 'SAGE_CLIENT',
                tier,
              },
            });

            client = await tx.client.create({
              data: {
                userId: user.id,
                tier,
                status: ClientStatus.ACTIVE,
                projectAddress: lead.projectAddress,
              },
            });

            await tx.lead.update({
              where: { id: leadId },
              data: {
                clientId: client.id,
                status: LeadStatus.CLOSED,
              },
            });
          }

          // Create project
          const project = await tx.project.create({
            data: {
              clientId: client.id,
              leadId,
              tier,
              name: `${lead.projectAddress} Project`,
              projectAddress: lead.projectAddress,
              status: ProjectStatus.ONBOARDING,
              paymentStatus: 'paid',
            },
          });

          // Create payment record
          const payment = await tx.payment.create({
            data: {
              projectId: project.id,
              stripePaymentIntentId: session.payment_intent,
              stripeCheckoutSessionId: session.id,
              stripeCustomerId: `cus_demo_${Date.now()}`,
              amount: session.amount_total,
              currency: session.currency,
              status: PaymentStatus.SUCCEEDED,
              tier,
              paidAt: new Date(),
            },
          });

          return { client, project, payment, user };
        });

        logger.info('Mock payment completed successfully', {
          sessionId,
          leadId,
          clientId: result.client.id,
          projectId: result.project.id,
          paymentId: result.payment.id,
        });

        res.json({
          success: true,
          data: {
            message: 'Demo payment completed successfully',
            demoMode: true,
            clientId: result.client.id,
            projectId: result.project.id,
            paymentId: result.payment.id,
            amount: session.amount_total,
            tier,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /demo/sessions
   * List all mock sessions (for debugging).
   */
  router.get('/sessions', (_req: Request, res: Response) => {
    if (!isStripeMockMode() && process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: { code: 'DEMO_DISABLED', message: 'Demo mode is not available in production' },
      });
    }

    const sessions = listMockSessions();
    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  });

  /**
   * POST /demo/reset
   * Clear all mock data (for testing).
   */
  router.post('/reset', (_req: Request, res: Response) => {
    if (!isStripeMockMode() && process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: { code: 'DEMO_DISABLED', message: 'Demo mode is not available in production' },
      });
    }

    clearMockData();
    res.json({
      success: true,
      message: 'All mock session data cleared',
    });
  });

  /**
   * POST /demo/seed-lead
   * Create a demo lead for testing the checkout flow.
   */
  router.post(
    '/seed-lead',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!isStripeMockMode() && process.env.NODE_ENV === 'production') {
          return res.status(403).json({
            success: false,
            error: { code: 'DEMO_DISABLED', message: 'Demo mode is not available in production' },
          });
        }

        const {
          email = `demo_${Date.now()}@example.com`,
          name = 'Demo Lead',
          projectAddress = '123 Demo Street, Portland, OR 97201',
          budgetRange = '$5,000 - $10,000',
          recommendedTier = 2,
        } = req.body;

        const lead = await prisma.lead.create({
          data: {
            email,
            name,
            projectAddress,
            budgetRange,
            timeline: '1-3 months',
            projectType: 'Demo Project',
            hasSurvey: true,
            hasDrawings: false,
            recommendedTier,
            routingReason: 'Demo lead for testing',
            status: LeadStatus.QUALIFIED,
          },
        });

        logger.info('Demo lead created', { leadId: lead.id, email });

        res.status(201).json({
          success: true,
          data: {
            lead,
            message: 'Demo lead created. Use this leadId to test checkout.',
            nextSteps: [
              `POST /api/demo/checkout/create-session with { leadId: "${lead.id}", tier: ${recommendedTier}, email: "${email}" }`,
              `Then POST /api/demo/checkout/complete with { sessionId: "<from previous response>" }`,
            ],
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /demo/full-flow
   * Run the complete demo flow: create lead, create checkout, complete payment.
   */
  router.post(
    '/full-flow',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!isStripeMockMode() && process.env.NODE_ENV === 'production') {
          return res.status(403).json({
            success: false,
            error: { code: 'DEMO_DISABLED', message: 'Demo mode is not available in production' },
          });
        }

        const {
          tier = 2,
          email = `demo_${Date.now()}@example.com`,
          name = 'Demo Customer',
          projectAddress = '456 Demo Avenue, Seattle, WA 98101',
        } = req.body;

        if (![1, 2, 3].includes(tier)) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_TIER', message: 'Tier must be 1, 2, or 3' },
          });
        }

        // Step 1: Create lead
        const lead = await prisma.lead.create({
          data: {
            email,
            name,
            projectAddress,
            budgetRange: tier === 1 ? '$500 - $1,000' : tier === 2 ? '$1,500 - $3,000' : '$3,500+',
            timeline: '1-3 months',
            projectType: 'Demo Full Flow',
            hasSurvey: true,
            hasDrawings: tier >= 2,
            recommendedTier: tier,
            routingReason: 'Demo full flow test',
            status: LeadStatus.QUALIFIED,
          },
        });

        // Step 2: Create mock checkout session
        const pricing = TIER_PRICING[tier as 1 | 2 | 3];
        const baseUrl = process.env.APP_URL || 'http://localhost:3000';

        const session = createMockCheckoutSession({
          leadId: lead.id,
          tier,
          email,
          amount: pricing.amount,
          currency: pricing.currency,
          tierName: pricing.name,
          successUrl: `${baseUrl}/checkout/success`,
          cancelUrl: `${baseUrl}/checkout/cancel`,
          metadata: { projectAddress },
        });

        // Step 3: Complete the checkout
        completeMockCheckoutSession(session.id, name);

        // Step 4: Create database records
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email,
              name,
              passwordHash: `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              userType: 'SAGE_CLIENT',
              tier,
            },
          });

          const client = await tx.client.create({
            data: {
              userId: user.id,
              tier,
              status: ClientStatus.ACTIVE,
              projectAddress,
            },
          });

          await tx.lead.update({
            where: { id: lead.id },
            data: {
              clientId: client.id,
              status: LeadStatus.CLOSED,
            },
          });

          const project = await tx.project.create({
            data: {
              clientId: client.id,
              leadId: lead.id,
              tier,
              name: `${projectAddress} Project`,
              projectAddress,
              status: ProjectStatus.ONBOARDING,
              paymentStatus: 'paid',
            },
          });

          const payment = await tx.payment.create({
            data: {
              projectId: project.id,
              stripePaymentIntentId: session.payment_intent,
              stripeCheckoutSessionId: session.id,
              stripeCustomerId: `cus_demo_${Date.now()}`,
              amount: session.amount_total,
              currency: session.currency,
              status: PaymentStatus.SUCCEEDED,
              tier,
              paidAt: new Date(),
            },
          });

          return { user, client, project, payment };
        });

        logger.info('Demo full flow completed', {
          leadId: lead.id,
          clientId: result.client.id,
          projectId: result.project.id,
          paymentId: result.payment.id,
        });

        res.status(201).json({
          success: true,
          data: {
            message: 'Demo full flow completed successfully',
            demoMode: true,
            lead: { id: lead.id, email, name },
            client: { id: result.client.id, tier },
            project: { id: result.project.id, name: result.project.name },
            payment: {
              id: result.payment.id,
              amount: result.payment.amount,
              formattedAmount: `$${(result.payment.amount / 100).toFixed(2)}`,
            },
            user: { id: result.user.id, email: result.user.email },
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
