import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import {
  verifyWebhookSignature,
  extractCheckoutCompletedData,
  extractPaymentSucceededData,
  generateIdempotencyKey,
} from '../utils/stripeHelpers';
import { isPayableTier } from '../utils/stripe';

const router = Router();

// Webhook secret from environment
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * IMPORTANT: This route must use raw body parsing for signature verification.
 * The raw body is expected to be available as req.body (Buffer) when using
 * express.raw() middleware on this specific route.
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || typeof signature !== 'string') {
    console.error('Webhook error: Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  if (!webhookSecret) {
    console.error('Webhook error: STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    // req.body should be the raw Buffer when using express.raw() middleware
    event = verifyWebhookSignature(req.body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${message}`);
    return res.status(400).json({ error: `Webhook signature verification failed: ${message}` });
  }

  // Log the event for debugging
  console.log(`Received Stripe webhook: ${event.type} (${event.id})`);

  try {
    // Handle specific event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Error handling webhook ${event.type}: ${message}`);
    // Still return 200 to prevent Stripe from retrying
    // Log the error for investigation
    return res.status(200).json({ received: true, error: message });
  }
});

/**
 * Handle checkout.session.completed event
 * This is fired when a customer completes the checkout flow
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const idempotencyKey = generateIdempotencyKey(event.id, 'checkout_completed');

  // Check if we've already processed this event
  const existingPayment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: session.payment_intent as string },
  });

  if (existingPayment) {
    console.log(`Payment already processed for session ${session.id}, skipping`);
    return;
  }

  // Extract data from session
  const data = extractCheckoutCompletedData(session);

  if (!data.leadId) {
    console.error(`No lead_id in session metadata for session ${session.id}`);
    return;
  }

  // Verify payment status
  if (data.paymentStatus !== 'paid') {
    console.log(`Payment not yet complete for session ${session.id}, status: ${data.paymentStatus}`);
    return;
  }

  // Find the lead
  const lead = await prisma.lead.findUnique({
    where: { id: data.leadId },
  });

  if (!lead) {
    console.error(`Lead not found: ${data.leadId}`);
    return;
  }

  // Check if lead is already converted
  if (lead.status === 'CONVERTED') {
    console.log(`Lead ${data.leadId} already converted, skipping`);
    return;
  }

  // Validate tier
  if (!isPayableTier(data.tier)) {
    console.error(`Invalid tier ${data.tier} for lead ${data.leadId}`);
    return;
  }

  console.log(`Processing checkout completion for lead ${data.leadId}, tier ${data.tier}`);

  // Create user, client, project, and payment in a transaction
  await prisma.$transaction(async (tx) => {
    // Create or find user
    let user = await tx.user.findUnique({
      where: { email: data.customerEmail || lead.email },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          email: data.customerEmail || lead.email,
          name: lead.name,
          role: 'CLIENT',
        },
      });
      console.log(`Created user ${user.id} for email ${user.email}`);
    }

    // Create client
    const client = await tx.client.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        tier: data.tier,
        stripeCustomerId: data.customerId,
        status: 'ACTIVE',
      },
    });
    console.log(`Created client ${client.id} for user ${user.id}`);

    // Create project
    const project = await tx.project.create({
      data: {
        clientId: client.id,
        name: `${lead.name || 'Project'} - ${data.tierName}`,
        tier: data.tier,
        status: 'INTAKE',
        projectAddress: lead.projectAddress,
      },
    });
    console.log(`Created project ${project.id} for client ${client.id}`);

    // Create payment record
    const payment = await tx.payment.create({
      data: {
        projectId: project.id,
        amount: data.amountTotal,
        currency: data.currency.toUpperCase(),
        status: 'SUCCEEDED',
        stripePaymentIntentId: data.paymentIntentId,
        stripeCheckoutSessionId: data.sessionId,
        paidAt: new Date(),
      },
    });
    console.log(`Created payment ${payment.id} for project ${project.id}`);

    // Update lead status to CONVERTED
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: 'CONVERTED' },
    });
    console.log(`Updated lead ${lead.id} status to CONVERTED`);
  });

  console.log(`Successfully processed checkout for lead ${data.leadId}`);
}

/**
 * Handle payment_intent.succeeded event
 * This is a backup handler in case checkout.session.completed fails
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  // Check if we've already processed this payment
  const existingPayment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (existingPayment) {
    // Update status if needed
    if (existingPayment.status !== 'SUCCEEDED') {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: 'SUCCEEDED',
          paidAt: new Date(),
        },
      });
      console.log(`Updated payment ${existingPayment.id} status to SUCCEEDED`);
    }
    return;
  }

  // If no existing payment, the checkout.session.completed handler should have created it
  // Log for investigation
  const data = extractPaymentSucceededData(paymentIntent);
  console.log(`Payment intent succeeded but no payment record found: ${paymentIntent.id}, lead: ${data.leadId}`);
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log(`Payment failed for intent ${paymentIntent.id}`);

  // Check if we have a payment record
  const existingPayment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (existingPayment) {
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: 'FAILED',
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
      },
    });
    console.log(`Updated payment ${existingPayment.id} status to FAILED`);
  }

  // Get lead ID from metadata if available
  const leadId = paymentIntent.metadata?.lead_id;
  if (leadId) {
    // Optionally update lead status or send notification
    console.log(`Payment failed for lead ${leadId}`);
  }
}

export default router;
