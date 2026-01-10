import Stripe from 'stripe';
import stripe, { getTierPricing, isPayableTier } from './stripe';

export interface CreateCheckoutSessionParams {
  leadId: string;
  tier: 1 | 2 | 3;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

/**
 * Create a Stripe Checkout session for a tier purchase
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const { leadId, tier, customerEmail, successUrl, cancelUrl, metadata = {} } = params;

  // Validate tier is payable
  if (!isPayableTier(tier)) {
    throw new Error(`Tier ${tier} is not available for online checkout. Please request a consultation.`);
  }

  const pricing = getTierPricing(tier);

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: [
      {
        price: pricing.priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      lead_id: leadId,
      tier: tier.toString(),
      tier_name: pricing.name,
      ...metadata,
    },
    payment_intent_data: {
      metadata: {
        lead_id: leadId,
        tier: tier.toString(),
        tier_name: pricing.name,
      },
    },
    // Allow promotion codes
    allow_promotion_codes: true,
    // Collect billing address
    billing_address_collection: 'required',
    // Custom text
    custom_text: {
      submit: {
        message: `You're purchasing the ${pricing.name} tier landscape design package.`,
      },
    },
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session URL');
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Retrieve a checkout session by ID
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'customer'],
  });
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Extract relevant data from checkout.session.completed event
 */
export interface CheckoutCompletedData {
  sessionId: string;
  paymentIntentId: string;
  customerId: string | null;
  customerEmail: string | null;
  leadId: string;
  tier: 1 | 2 | 3;
  tierName: string;
  amountTotal: number;
  currency: string;
  paymentStatus: string;
}

export function extractCheckoutCompletedData(session: Stripe.Checkout.Session): CheckoutCompletedData {
  const metadata = session.metadata || {};
  const tier = parseInt(metadata.tier || '0', 10);

  if (!isPayableTier(tier)) {
    throw new Error(`Invalid tier in session metadata: ${metadata.tier}`);
  }

  return {
    sessionId: session.id,
    paymentIntentId: typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || '',
    customerId: typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id || null,
    customerEmail: session.customer_email || session.customer_details?.email || null,
    leadId: metadata.lead_id || '',
    tier: tier,
    tierName: metadata.tier_name || '',
    amountTotal: session.amount_total || 0,
    currency: session.currency || 'usd',
    paymentStatus: session.payment_status,
  };
}

/**
 * Extract data from payment_intent.succeeded event
 */
export interface PaymentSucceededData {
  paymentIntentId: string;
  customerId: string | null;
  amount: number;
  currency: string;
  leadId: string;
  tier: 1 | 2 | 3;
  receiptEmail: string | null;
}

export function extractPaymentSucceededData(paymentIntent: Stripe.PaymentIntent): PaymentSucceededData {
  const metadata = paymentIntent.metadata || {};
  const tier = parseInt(metadata.tier || '0', 10);

  if (!isPayableTier(tier)) {
    throw new Error(`Invalid tier in payment intent metadata: ${metadata.tier}`);
  }

  return {
    paymentIntentId: paymentIntent.id,
    customerId: typeof paymentIntent.customer === 'string'
      ? paymentIntent.customer
      : paymentIntent.customer?.id || null,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    leadId: metadata.lead_id || '',
    tier: tier,
    receiptEmail: paymentIntent.receipt_email,
  };
}

/**
 * Idempotency key generator for webhook processing
 */
export function generateIdempotencyKey(eventId: string, action: string): string {
  return `${eventId}_${action}`;
}

/**
 * Create a Stripe customer from lead data
 */
export async function createStripeCustomer(params: {
  email: string;
  name?: string;
  leadId: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      lead_id: params.leadId,
      ...params.metadata,
    },
  });
}

/**
 * Retrieve or create a Stripe customer by email
 */
export async function getOrCreateCustomer(params: {
  email: string;
  name?: string;
  leadId: string;
}): Promise<Stripe.Customer> {
  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return createStripeCustomer(params);
}
