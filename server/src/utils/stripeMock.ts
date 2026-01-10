/**
 * Stripe Mock Utilities
 * Provides mock Stripe functionality for development and demo purposes.
 * Used when STRIPE_SECRET_KEY is not configured or in test mode.
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface MockCheckoutSession {
  id: string;
  url: string;
  status: 'open' | 'complete' | 'expired';
  payment_status: 'unpaid' | 'paid';
  amount_total: number;
  currency: string;
  customer_email: string | null;
  customer_details: {
    name: string | null;
    email: string | null;
  } | null;
  metadata: Record<string, string>;
  payment_intent: string;
  expires_at: number;
}

export interface MockPaymentIntent {
  id: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled';
  amount: number;
  currency: string;
  customer: string | null;
  metadata: Record<string, string>;
}

// ============================================================================
// MOCK DATA STORE
// ============================================================================

const mockSessions = new Map<string, MockCheckoutSession>();
const mockPaymentIntents = new Map<string, MockPaymentIntent>();

// ============================================================================
// MOCK FUNCTIONS
// ============================================================================

/**
 * Check if we're in mock/demo mode (no real Stripe key).
 */
export function isStripeMockMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return !key || key.startsWith('sk_test_mock') || key === 'demo' || key === 'mock';
}

/**
 * Create a mock checkout session.
 */
export function createMockCheckoutSession(options: {
  leadId: string;
  tier: number;
  email: string;
  amount: number;
  currency: string;
  tierName: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): MockCheckoutSession {
  const sessionId = `cs_mock_${uuidv4().replace(/-/g, '')}`;
  const paymentIntentId = `pi_mock_${uuidv4().replace(/-/g, '')}`;

  const session: MockCheckoutSession = {
    id: sessionId,
    url: `/demo/checkout/${sessionId}`,
    status: 'open',
    payment_status: 'unpaid',
    amount_total: options.amount,
    currency: options.currency,
    customer_email: options.email,
    customer_details: {
      name: null,
      email: options.email,
    },
    metadata: {
      leadId: options.leadId,
      tier: String(options.tier),
      tierName: options.tierName,
      ...options.metadata,
    },
    payment_intent: paymentIntentId,
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  const paymentIntent: MockPaymentIntent = {
    id: paymentIntentId,
    status: 'requires_payment_method',
    amount: options.amount,
    currency: options.currency,
    customer: null,
    metadata: session.metadata,
  };

  mockSessions.set(sessionId, session);
  mockPaymentIntents.set(paymentIntentId, paymentIntent);

  return session;
}

/**
 * Get a mock checkout session.
 */
export function getMockCheckoutSession(sessionId: string): MockCheckoutSession | null {
  return mockSessions.get(sessionId) || null;
}

/**
 * Complete a mock checkout session (simulate successful payment).
 */
export function completeMockCheckoutSession(sessionId: string, customerName?: string): MockCheckoutSession | null {
  const session = mockSessions.get(sessionId);
  if (!session) {
    return null;
  }

  session.status = 'complete';
  session.payment_status = 'paid';
  session.customer_details = {
    name: customerName || 'Demo Customer',
    email: session.customer_email,
  };

  // Update payment intent
  const paymentIntent = mockPaymentIntents.get(session.payment_intent);
  if (paymentIntent) {
    paymentIntent.status = 'succeeded';
  }

  mockSessions.set(sessionId, session);
  return session;
}

/**
 * Get a mock payment intent.
 */
export function getMockPaymentIntent(paymentIntentId: string): MockPaymentIntent | null {
  return mockPaymentIntents.get(paymentIntentId) || null;
}

/**
 * List all mock sessions (for debugging).
 */
export function listMockSessions(): MockCheckoutSession[] {
  return Array.from(mockSessions.values());
}

/**
 * Clear all mock data (for testing).
 */
export function clearMockData(): void {
  mockSessions.clear();
  mockPaymentIntents.clear();
}

/**
 * Generate a mock webhook event.
 */
export function createMockWebhookEvent(
  type: 'checkout.session.completed' | 'payment_intent.succeeded' | 'payment_intent.payment_failed',
  sessionId: string
): { event: any; signature: string } {
  const session = mockSessions.get(sessionId);
  const paymentIntent = session ? mockPaymentIntents.get(session.payment_intent) : null;

  let data: any;
  switch (type) {
    case 'checkout.session.completed':
      data = session;
      break;
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
      data = paymentIntent;
      break;
  }

  return {
    event: {
      id: `evt_mock_${uuidv4().replace(/-/g, '')}`,
      type,
      data: { object: data },
      created: Math.floor(Date.now() / 1000),
      livemode: false,
    },
    signature: 'mock_signature_for_demo',
  };
}
