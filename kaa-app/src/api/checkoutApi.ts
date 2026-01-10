/**
 * Checkout API Client
 * Handles Stripe checkout-related API calls: create session, get pricing, check status.
 */

import { getAuthHeaders } from './authApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ============================================================================
// TYPES
// ============================================================================

export interface TierPricing {
  tier: number;
  name: string;
  description: string;
  amount: number;
  currency: string;
  formattedPrice: string;
}

export interface CheckoutSessionInput {
  leadId: string;
  tier: 1 | 2 | 3;
  email: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  expiresAt: number;
}

export interface CheckoutSessionStatus {
  id: string;
  status: string;
  paymentStatus: string;
  amountTotal: number;
  currency: string;
  customerEmail: string;
  metadata?: Record<string, string>;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get pricing for all available tiers.
 */
export async function getTierPricing(): Promise<TierPricing[]> {
  const response = await fetch(`${API_BASE_URL}/checkout/pricing`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to get pricing');
  }

  return data.data;
}

/**
 * Create a Stripe checkout session.
 */
export async function createCheckoutSession(
  input: CheckoutSessionInput
): Promise<CheckoutSession> {
  const response = await fetch(`${API_BASE_URL}/checkout/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to create checkout session');
  }

  return data.data;
}

/**
 * Get checkout session status.
 */
export async function getCheckoutSessionStatus(
  sessionId: string
): Promise<CheckoutSessionStatus> {
  const response = await fetch(`${API_BASE_URL}/checkout/session/${sessionId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to get session status');
  }

  return data.data;
}

/**
 * Redirect to Stripe checkout.
 */
export async function redirectToCheckout(input: CheckoutSessionInput): Promise<void> {
  const session = await createCheckoutSession(input);
  
  if (session.url) {
    window.location.href = session.url;
  } else {
    throw new Error('No checkout URL received');
  }
}

/**
 * Format price from cents to display string.
 */
export function formatPrice(amountCents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

/**
 * Get tier by number.
 */
export function getTierInfo(tier: number): { name: string; tagline: string } {
  const tiers: Record<number, { name: string; tagline: string }> = {
    1: { name: 'The Concept', tagline: 'DIY Guidance' },
    2: { name: 'The Builder', tagline: 'Low-Touch Design' },
    3: { name: 'The Concierge', tagline: 'Full Service' },
    4: { name: 'White Glove', tagline: 'Premium Experience' },
  };
  return tiers[tier] || { name: `Tier ${tier}`, tagline: '' };
}
