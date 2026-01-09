/**
 * Webhook Routes
 * POST /api/webhooks/stripe - Handle Stripe webhook events
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import {
  constructWebhookEvent,
  isEventProcessed,
  handleCheckoutCompleted,
  handlePaymentSucceeded,
  handlePaymentFailed,
} from '../utils/stripeHelpers';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

interface StripeWebhookRequest extends Request {
  rawBody?: Buffer;
}

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createWebhooksRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * POST /stripe
   * Handles Stripe webhook events.
   * 
   * Note: This route requires raw body parsing. The main app should configure
   * express.raw({ type: 'application/json' }) for this path BEFORE json parsing.
   */
  router.post(
    '/stripe',
    async (req: StripeWebhookRequest, res: Response, next: NextFunction) => {
      try {
        const signature = req.headers['stripe-signature'];

        if (!signature || typeof signature !== 'string') {
          logger.warn('Webhook received without signature');
          return res.status(400).json({
            success: false,
            error: { code: 'MISSING_SIGNATURE', message: 'Missing Stripe signature' },
          });
        }

        // Get raw body (should be set by express.raw middleware)
        const rawBody = req.rawBody || req.body;
        if (!rawBody) {
          logger.warn('Webhook received without body');
          return res.status(400).json({
            success: false,
            error: { code: 'MISSING_BODY', message: 'Missing request body' },
          });
        }

        // Verify and construct event
        let event: Stripe.Event;
        try {
          event = constructWebhookEvent(rawBody, signature);
        } catch (err) {
          logger.warn('Webhook signature verification failed', { error: (err as Error).message });
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_SIGNATURE', message: (err as Error).message },
          });
        }

        logger.info('Stripe webhook received', {
          eventId: event.id,
          eventType: event.type,
        });

        // Check for duplicate processing (idempotency)
        const paymentIntentId = 
          (event.data.object as { id?: string; payment_intent?: string }).payment_intent ||
          (event.data.object as { id?: string }).id;
        
        if (paymentIntentId && await isEventProcessed(prisma, paymentIntentId)) {
          logger.info('Event already processed', { eventId: event.id, paymentIntentId });
          return res.json({
            success: true,
            message: 'Event already processed',
          });
        }

        // Handle specific event types
        let result;
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            result = await handleCheckoutCompleted(prisma, session);
            break;
          }

          case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            result = await handlePaymentSucceeded(prisma, paymentIntent);
            break;
          }

          case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            result = await handlePaymentFailed(prisma, paymentIntent);
            break;
          }

          case 'customer.subscription.created':
          case 'customer.subscription.updated':
          case 'customer.subscription.deleted': {
            // For future subscription support
            logger.info('Subscription event received', { eventType: event.type });
            result = {
              success: true,
              eventType: event.type,
              eventId: event.id,
              processed: false,
              message: 'Subscription events not yet implemented',
            };
            break;
          }

          default: {
            logger.info('Unhandled webhook event type', { eventType: event.type });
            result = {
              success: true,
              eventType: event.type,
              eventId: event.id,
              processed: false,
              message: `Unhandled event type: ${event.type}`,
            };
          }
        }

        // Log result
        if (result.success) {
          logger.info('Webhook processed successfully', {
            eventId: event.id,
            eventType: event.type,
            processed: result.processed,
          });
        } else {
          logger.warn('Webhook processing failed', {
            eventId: event.id,
            eventType: event.type,
            message: result.message,
          });
        }

        res.json({
          success: result.success,
          received: true,
          eventId: event.id,
          eventType: event.type,
          processed: result.processed,
        });
      } catch (error) {
        logger.error('Webhook error', { error: (error as Error).message });
        next(error);
      }
    }
  );

  return router;
}

// ============================================================================
// MIDDLEWARE FOR RAW BODY CAPTURE
// ============================================================================

/**
 * Middleware to capture raw body for webhook signature verification.
 * Use this before express.json() for webhook routes.
 */
export function captureRawBody(
  req: StripeWebhookRequest,
  _res: Response,
  next: NextFunction
): void {
  if (req.headers['stripe-signature']) {
    let data = '';
    req.setEncoding('utf8');
    
    req.on('data', (chunk) => {
      data += chunk;
    });
    
    req.on('end', () => {
      req.rawBody = Buffer.from(data);
      next();
    });
  } else {
    next();
  }
}
