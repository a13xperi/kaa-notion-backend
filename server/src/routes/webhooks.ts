/**
 * Webhook Routes
 * POST /api/webhooks/stripe - Handle Stripe webhook events
 * POST /api/webhooks/notion - Handle Notion webhook events (receiving updates FROM Notion)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { Client as NotionClient } from '@notionhq/client';
import {
  constructWebhookEvent,
  isEventProcessed,
  handleCheckoutCompleted,
  handlePaymentSucceeded,
  handlePaymentFailed,
} from '../utils/stripeHelpers';
import { getPageTitle, mapNotionStatusToPostgres } from '../utils/notionHelpers';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

interface StripeWebhookRequest extends Request {
  rawBody?: Buffer;
}

interface NotionWebhookPayload {
  type: 'webhook_challenge' | 'page.updated' | 'database.updated';
  challenge?: string;
  object?: {
    id: string;
    last_edited_time: string;
    properties?: Record<string, any>;
  };
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

  /**
   * POST /notion
   * Handles Notion webhook events (receiving updates FROM Notion).
   * 
   * Notion webhooks notify us when pages or databases are updated.
   * We sync these changes to Postgres to keep data in sync.
   * 
   * Notion webhook verification:
   * - Initial setup: Notion sends a challenge request, we must respond with the challenge token
   * - Subsequent requests: Notion sends signed payloads (if configured)
   */
  router.post(
    '/notion',
    async (req: Request<{}, {}, NotionWebhookPayload>, res: Response, next: NextFunction) => {
      const correlationId = req.correlationId || `notion-webhook-${Date.now()}`;
      
      try {
        // Handle Notion webhook challenge (initial setup)
        if (req.body.type === 'webhook_challenge') {
          const challenge = req.body.challenge;
          if (!challenge) {
            return res.status(400).json({
              success: false,
              error: { code: 'MISSING_CHALLENGE', message: 'Missing challenge token' },
            });
          }
          
          logger.info('Notion webhook challenge received', { correlationId, challenge });
          return res.json({ challenge });
        }

        // Handle Notion webhook events
        const event = req.body;
        const eventType = event.type;

        if (!eventType || (eventType !== 'page.updated' && eventType !== 'database.updated')) {
          logger.warn('Notion webhook received without valid event type', { 
            correlationId, 
            eventType,
            body: req.body 
          });
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_EVENT_TYPE', message: 'Missing or invalid event type' },
            correlationId,
          });
        }

        if (!event.object?.id) {
          logger.warn('Notion webhook event missing object ID', { correlationId, eventType });
          return res.status(400).json({
            success: false,
            error: { code: 'MISSING_OBJECT_ID', message: 'Missing object ID' },
            correlationId,
          });
        }

        logger.info('Processing Notion webhook event', {
          correlationId,
          eventType,
          objectId: event.object.id,
        });

        // Check if Notion API is configured
        const notionApiKey = process.env.NOTION_API_KEY;
        if (!notionApiKey) {
          logger.warn('Notion API not configured, skipping webhook processing', { correlationId });
          return res.json({
            success: true,
            received: true,
            message: 'Notion API not configured, webhook ignored',
            correlationId,
          });
        }

        const notion = new NotionClient({ auth: notionApiKey });
        const pageId = event.object.id;
        const lastEditedTime = event.object.last_edited_time;

        // Check idempotency - prevent duplicate processing
        const eventId = pageId;
        let alreadyProcessed = false;

        try {
          // Check if we've already processed this Notion update
          const existing = await prisma.auditLog.findFirst({
            where: {
              action: 'notion_webhook',
              resourceType: 'notion_page',
              resourceId: eventId,
            },
            orderBy: { createdAt: 'desc' },
          });

          if (existing) {
            // Check if this is a newer update (based on last_edited_time)
            if (lastEditedTime && existing.details) {
              const details = existing.details as any;
              const existingTime = details.last_edited_time;
              if (existingTime && new Date(lastEditedTime) <= new Date(existingTime)) {
                alreadyProcessed = true;
              }
            } else {
              // If we have an existing log but no timestamp comparison, check if processed recently (within 1 minute)
              const recentThreshold = new Date(Date.now() - 60 * 1000);
              if (existing.createdAt > recentThreshold) {
                alreadyProcessed = true;
              }
            }
          }
        } catch (dbError) {
          logger.error('Failed to check idempotency for Notion webhook', {
            error: (dbError as Error).message,
            correlationId,
            eventId,
          });
          // Continue processing if we can't check
        }

        if (alreadyProcessed) {
          logger.info('Notion webhook event already processed, skipping', { correlationId, eventId });
          return res.json({
            success: true,
            received: true,
            message: 'Event already processed',
            correlationId,
          });
        }

        // Find project by Notion page ID
        const project = await prisma.project.findFirst({
          where: { notionPageId: pageId },
        });

        if (!project) {
          // Page not linked to a project - log for reference
          logger.debug('Notion page update received but no linked project found', {
            correlationId,
            notionPageId: pageId,
          });

          // Still log the event
          await prisma.auditLog.create({
            data: {
              action: 'notion_webhook',
              resourceType: 'notion_page',
              resourceId: pageId,
              details: {
                event_type: eventType,
                page_id: pageId,
                last_edited_time: lastEditedTime,
                synced: false,
                reason: 'No linked project found',
              },
            },
          });

          return res.json({
            success: true,
            received: true,
            message: 'Page not linked to any project',
            correlationId,
          });
        }

        // Fetch full page details from Notion API to get all properties
        let notionPage;
        try {
          notionPage = await notion.pages.retrieve({ page_id: pageId });
        } catch (notionError) {
          logger.warn('Failed to fetch Notion page details, using webhook payload', {
            correlationId,
            notionPageId: pageId,
            error: (notionError as Error).message,
          });
          notionPage = event.object as any;
        }

        // Extract properties from Notion page
        const properties = (notionPage as any).properties || {};
        const updateData: any = {};
        let hasUpdates = false;

        // Sync project status if changed in Notion
        const notionStatus = properties.Status?.select?.name;
        if (notionStatus) {
          const postgresStatus = mapNotionStatusToPostgres(notionStatus);
          if (postgresStatus && postgresStatus !== project.status) {
            updateData.status = postgresStatus;
            hasUpdates = true;
          }
        }

        // Sync project name if changed in Notion
        const notionTitle = getPageTitle(notionPage as any);
        if (notionTitle && notionTitle !== 'Untitled' && notionTitle !== project.name) {
          updateData.name = notionTitle;
          hasUpdates = true;
        }

        // Only update if there are changes and Notion timestamp is newer
        if (hasUpdates) {
          const notionTimestamp = new Date(lastEditedTime);
          const postgresTimestamp = new Date(project.updatedAt);

          // Only sync if Notion is newer (timestamp-based sync)
          if (notionTimestamp > postgresTimestamp) {
            updateData.updatedAt = notionTimestamp;

            await prisma.project.update({
              where: { id: project.id },
              data: updateData,
            });

            logger.info('Synced project from Notion to Postgres', {
              correlationId,
              projectId: project.id,
              notionPageId: pageId,
              updates: Object.keys(updateData),
              notionTimestamp: lastEditedTime,
              postgresTimestamp: project.updatedAt.toISOString(),
            });
          } else {
            logger.debug('Notion update is older than Postgres, skipping sync', {
              correlationId,
              projectId: project.id,
              notionTimestamp: lastEditedTime,
              postgresTimestamp: project.updatedAt.toISOString(),
            });
          }
        }

        // Log the sync
        await prisma.auditLog.create({
          data: {
            action: 'notion_webhook',
            resourceType: 'notion_page',
            resourceId: pageId,
            details: {
              event_type: eventType,
              page_id: pageId,
              last_edited_time: lastEditedTime,
              project_id: project.id,
              synced: hasUpdates,
            },
          },
        });

        logger.info('Notion webhook processed successfully', {
          correlationId,
          eventType,
          projectId: project.id,
          notionPageId: pageId,
          synced: hasUpdates,
        });

        res.json({
          success: true,
          received: true,
          synced: hasUpdates,
          correlationId,
        });
      } catch (error) {
        logger.error('Error processing Notion webhook', {
          error: (error as Error).message,
          correlationId,
        });
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
