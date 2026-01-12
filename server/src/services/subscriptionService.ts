/**
 * Subscription Service
 * Handles Stripe subscription management, recurring billing, and tier upgrades
 */

import { Subscription, SubscriptionStatus } from '../types/prisma-types';
import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import { stripe, isStripeEnabled, requireStripe } from '../utils/stripe';
import { logger } from '../config/logger';
import {
  notFound,
  badRequest,
  conflict,
  ErrorCodes,
} from '../utils/AppError';

// ============================================
// TYPES
// ============================================

export interface CreateSubscriptionInput {
  clientId: string;
  tier: number;
  paymentMethodId?: string;
}

export interface SubscriptionWithClient extends Subscription {
  client: {
    id: string;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  };
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Tier pricing configuration
 */
export const TIER_PRICING = {
  1: {
    name: 'Seedling',
    monthlyPrice: 0,
    yearlyPrice: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
  },
  2: {
    name: 'Sprout',
    monthlyPrice: 4900, // $49/month in cents
    yearlyPrice: 47000, // $470/year in cents (20% discount)
    stripePriceIdMonthly: process.env.STRIPE_SPROUT_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_SPROUT_YEARLY_PRICE_ID,
  },
  3: {
    name: 'Canopy',
    monthlyPrice: 9900, // $99/month in cents
    yearlyPrice: 95000, // $950/year in cents
    stripePriceIdMonthly: process.env.STRIPE_CANOPY_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_CANOPY_YEARLY_PRICE_ID,
  },
  4: {
    name: 'KAA White Glove',
    monthlyPrice: null, // Custom pricing
    yearlyPrice: null,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
  },
} as const;

// ============================================
// STRIPE CUSTOMER MANAGEMENT
// ============================================

/**
 * Get or create Stripe customer for a client
 */
export async function getOrCreateStripeCustomer(clientId: string): Promise<string> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
      subscription: true,
    },
  });

  if (!client) {
    throw notFound('Client');
  }

  // Return existing customer ID if available (stripeCustomerId is on Client, not Subscription)
  if (client.stripeCustomerId) {
    return client.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: client.user.email,
    name: client.user.name || undefined,
    metadata: {
      clientId: client.id,
      userId: client.userId,
    },
  });

  return customer.id;
}

/**
 * Attach payment method to customer
 */
export async function attachPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // Set as default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Create a new subscription
 */
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<Subscription> {
  const { clientId, tier, paymentMethodId } = input;

  // Check tier is valid
  const tierConfig = TIER_PRICING[tier as keyof typeof TIER_PRICING];
  if (!tierConfig) {
    throw badRequest('Invalid subscription tier', ErrorCodes.INVALID_INPUT, { tier });
  }

  // Get or create Stripe customer
  const stripeCustomerId = await getOrCreateStripeCustomer(clientId);

  // Attach payment method if provided
  if (paymentMethodId) {
    await attachPaymentMethod(stripeCustomerId, paymentMethodId);
  }

  // Check for existing subscription
  const existingSub = await prisma.subscription.findUnique({
    where: { clientId },
  });

  if (existingSub && existingSub.status === 'ACTIVE') {
    throw conflict('Client already has an active subscription', ErrorCodes.ALREADY_EXISTS);
  }

  // Free tier - create without Stripe subscription
  if (tier === 1 || !tierConfig.stripePriceIdMonthly) {
    // Store stripeCustomerId on Client, not Subscription
    await prisma.client.update({
      where: { id: clientId },
      data: { stripeCustomerId },
    });

    const subscription = await prisma.subscription.upsert({
      where: { clientId },
      create: {
        clientId,
        stripeSubscriptionId: `free_${clientId}`,
        stripePriceId: 'free',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
      update: {
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    // Update client tier and project limit
    await updateClientTier(clientId, tier);

    return subscription;
  }

  // Create Stripe subscription for paid tiers
  const stripeSubscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: tierConfig.stripePriceIdMonthly }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      clientId,
      tier: tier.toString(),
    },
  });

  // Store stripeCustomerId on Client
  await prisma.client.update({
    where: { id: clientId },
    data: { stripeCustomerId },
  });

  // Store subscription in database (tier is stored on Client, not Subscription)
  // Use TRIALING as initial status since PENDING is not a valid SubscriptionStatus
  const subscription = await prisma.subscription.upsert({
    where: { clientId },
    create: {
      clientId,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: tierConfig.stripePriceIdMonthly!,
      status: 'TRIALING',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    },
    update: {
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: tierConfig.stripePriceIdMonthly!,
      status: 'TRIALING',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    },
  });

  return subscription;
}

/**
 * Get subscription for a client
 */
export async function getSubscription(
  clientId: string
): Promise<SubscriptionWithClient | null> {
  return prisma.subscription.findUnique({
    where: { clientId },
    include: {
      client: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  }) as Promise<SubscriptionWithClient | null>;
}

/**
 * Update subscription tier (upgrade/downgrade)
 */
export async function updateSubscriptionTier(
  clientId: string,
  newTier: number
): Promise<Subscription> {
  const subscription = await prisma.subscription.findUnique({
    where: { clientId },
  });

  if (!subscription) {
    throw notFound('Subscription');
  }

  const tierConfig = TIER_PRICING[newTier as keyof typeof TIER_PRICING];
  if (!tierConfig) {
    throw badRequest('Invalid subscription tier', ErrorCodes.INVALID_INPUT, { tier: newTier });
  }

  // If downgrading to free tier
  if (newTier === 1 || !tierConfig.stripePriceIdMonthly) {
    // Cancel Stripe subscription if exists
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }

    const updated = await prisma.subscription.update({
      where: { clientId },
      data: {
        stripeSubscriptionId: `free_${clientId}`,
        stripePriceId: 'free',
        status: 'ACTIVE',
        canceledAt: null,
        cancelAtPeriodEnd: false,
      },
    });

    await updateClientTier(clientId, newTier);
    return updated;
  }

  // Update Stripe subscription for paid tiers
  if (subscription.stripeSubscriptionId) {
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: tierConfig.stripePriceIdMonthly,
        },
      ],
      proration_behavior: 'create_prorations',
      metadata: {
        tier: newTier.toString(),
      },
    });
  }

  // tier is stored on Client, not Subscription
  const updated = await prisma.subscription.update({
    where: { clientId },
    data: {
      stripePriceId: tierConfig.stripePriceIdMonthly,
    },
  });

  await updateClientTier(clientId, newTier);
  return updated;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  clientId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Subscription> {
  const subscription = await prisma.subscription.findUnique({
    where: { clientId },
  });

  if (!subscription) {
    throw notFound('Subscription');
  }

  if (subscription.stripeSubscriptionId) {
    if (cancelAtPeriodEnd) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }
  }

  return prisma.subscription.update({
    where: { clientId },
    data: {
      cancelAtPeriodEnd,
      canceledAt: cancelAtPeriodEnd ? null : new Date(),
      status: cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELED',
    },
  });
}

/**
 * Resume canceled subscription
 */
export async function resumeSubscription(clientId: string): Promise<Subscription> {
  const subscription = await prisma.subscription.findUnique({
    where: { clientId },
  });

  if (!subscription) {
    throw notFound('Subscription');
  }

  if (!subscription.cancelAtPeriodEnd) {
    throw badRequest('Subscription is not scheduled for cancellation', ErrorCodes.INVALID_STATE);
  }

  if (subscription.stripeSubscriptionId) {
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  return prisma.subscription.update({
    where: { clientId },
    data: {
      cancelAtPeriodEnd: false,
    },
  });
}

// ============================================
// BILLING PORTAL
// ============================================

/**
 * Create Stripe billing portal session
 */
export async function createBillingPortalSession(
  clientId: string,
  returnUrl: string
): Promise<string> {
  // stripeCustomerId is on Client, not Subscription
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { stripeCustomerId: true },
  });

  if (!client?.stripeCustomerId) {
    throw notFound('Stripe customer');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: client.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Create checkout session for subscription
 */
export async function createCheckoutSession(
  clientId: string,
  tier: number,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const tierConfig = TIER_PRICING[tier as keyof typeof TIER_PRICING];
  if (!tierConfig || !tierConfig.stripePriceIdMonthly) {
    throw badRequest('Invalid tier or tier does not support checkout', ErrorCodes.INVALID_INPUT, { tier });
  }

  const stripeCustomerId = await getOrCreateStripeCustomer(clientId);

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [
      {
        price: tierConfig.stripePriceIdMonthly,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      clientId,
      tier: tier.toString(),
    },
  });

  return session.url || '';
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      logger.debug('Unhandled Stripe event type', { eventType: event.type });
  }
}

async function handleSubscriptionUpdate(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const clientId = stripeSubscription.metadata.clientId;
  if (!clientId) return;

  const status = mapStripeStatus(stripeSubscription.status);

  await prisma.subscription.update({
    where: { clientId },
    data: {
      status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
  });

  // Update client tier if subscription is active
  if (status === 'ACTIVE') {
    const tier = parseInt(stripeSubscription.metadata.tier || '1', 10);
    await updateClientTier(clientId, tier);
  }
}

async function handleSubscriptionCanceled(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const clientId = stripeSubscription.metadata.clientId;
  if (!clientId) return;

  await prisma.subscription.update({
    where: { clientId },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  });

  // Downgrade to free tier
  await updateClientTier(clientId, 1);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  // stripeCustomerId is on Client, not Subscription
  const client = await prisma.client.findFirst({
    where: { stripeCustomerId: customerId },
    include: { subscription: true },
  });

  if (client?.subscription) {
    // Subscription model has no lastPaymentDate/lastPaymentAmount fields
    await prisma.subscription.update({
      where: { id: client.subscription.id },
      data: {
        status: 'ACTIVE',
      },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  // stripeCustomerId is on Client, not Subscription
  const client = await prisma.client.findFirst({
    where: { stripeCustomerId: customerId },
    include: { subscription: true },
  });

  if (client?.subscription) {
    await prisma.subscription.update({
      where: { id: client.subscription.id },
      data: {
        status: 'PAST_DUE',
      },
    });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid: 'PAST_DUE',
    incomplete: 'PAUSED',
    incomplete_expired: 'CANCELED',
    trialing: 'TRIALING',
    paused: 'PAUSED',
  };

  return statusMap[status] || 'PAUSED';
}

async function updateClientTier(clientId: string, tier: number): Promise<void> {
  // Import tier project limits
  const TIER_PROJECT_LIMITS: Record<number, number> = {
    1: 1,
    2: 3,
    3: 5,
    4: -1,
  };

  await prisma.client.update({
    where: { id: clientId },
    data: {
      maxProjects: TIER_PROJECT_LIMITS[tier] ?? 1,
    },
  });
}

// ============================================
// SUBSCRIPTION ANALYTICS
// ============================================

/**
 * Get subscription metrics
 */
export async function getSubscriptionMetrics(): Promise<{
  totalSubscriptions: number;
  activeSubscriptions: number;
  byTier: Record<number, number>;
  mrr: number;
  churnRate: number;
}> {
  const subscriptions = await prisma.subscription.findMany({
    where: { status: { not: 'CANCELED' } },
  });

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE').length;

  // tier is on Client, not Subscription - need to get it from clients
  const clientsWithTier = await prisma.client.findMany({
    where: { subscription: { status: { not: 'CANCELED' } } },
    select: { tier: true },
  });

  const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  clientsWithTier.forEach((c) => {
    byTier[c.tier] = (byTier[c.tier] || 0) + 1;
  });

  // Calculate MRR using client tiers
  let mrr = 0;
  clientsWithTier.forEach((c) => {
    const pricing = TIER_PRICING[c.tier as keyof typeof TIER_PRICING];
    if (pricing?.monthlyPrice) {
      mrr += pricing.monthlyPrice;
    }
  });

  // Calculate churn rate (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const canceledCount = await prisma.subscription.count({
    where: {
      status: 'CANCELED',
      canceledAt: { gte: thirtyDaysAgo },
    },
  });

  const churnRate = activeSubscriptions > 0
    ? (canceledCount / activeSubscriptions) * 100
    : 0;

  return {
    totalSubscriptions: subscriptions.length,
    activeSubscriptions,
    byTier,
    mrr: mrr / 100, // Convert cents to dollars
    churnRate: Math.round(churnRate * 100) / 100,
  };
}

export default {
  TIER_PRICING,
  getOrCreateStripeCustomer,
  createSubscription,
  getSubscription,
  updateSubscriptionTier,
  cancelSubscription,
  resumeSubscription,
  createBillingPortalSession,
  createCheckoutSession,
  handleStripeWebhook,
  getSubscriptionMetrics,
};
