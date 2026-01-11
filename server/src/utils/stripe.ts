import Stripe from 'stripe';

// Initialize Stripe with API key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeOptional = process.env.STRIPE_OPTIONAL === 'true';

// Track if Stripe is properly configured
export const isStripeEnabled = Boolean(stripeSecretKey);

// Validate Stripe configuration at startup
if (!stripeSecretKey) {
  if (stripeOptional) {
    // Stripe is optional - log warning but don't fail
    console.warn('[Stripe] STRIPE_SECRET_KEY not set. Payment features disabled. Set STRIPE_OPTIONAL=false to require.');
  } else if (process.env.NODE_ENV === 'production') {
    // In production without optional flag, throw error
    throw new Error(
      'STRIPE_SECRET_KEY is required in production. ' +
      'Set STRIPE_OPTIONAL=true to disable payment features.'
    );
  } else {
    // In development, warn but continue
    console.warn('[Stripe] STRIPE_SECRET_KEY not set. Payment features will not work.');
  }
}

export const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

/**
 * Guard function to check if Stripe is enabled before making API calls
 * @throws Error if Stripe is not configured
 */
export function requireStripe(): void {
  if (!isStripeEnabled) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.');
  }
}

// Tier pricing configuration
// These should match your Stripe product/price IDs
export interface TierPricing {
  tier: 1 | 2 | 3;
  name: string;
  priceId: string; // Stripe Price ID
  amount: number; // Amount in cents
  currency: string;
  description: string;
}

export const TIER_PRICING: Record<1 | 2 | 3, TierPricing> = {
  1: {
    tier: 1,
    name: 'Seedling',
    priceId: process.env.STRIPE_PRICE_TIER_1 || 'price_tier1_placeholder',
    amount: 50000, // $500.00
    currency: 'usd',
    description: 'Quick concept for simple projects - AI-assisted design with 48hr turnaround',
  },
  2: {
    tier: 2,
    name: 'Sprout',
    priceId: process.env.STRIPE_PRICE_TIER_2 || 'price_tier2_placeholder',
    amount: 150000, // $1,500.00
    currency: 'usd',
    description: 'Full landscape design package with 3D visualization and planting plan',
  },
  3: {
    tier: 3,
    name: 'Canopy',
    priceId: process.env.STRIPE_PRICE_TIER_3 || 'price_tier3_placeholder',
    amount: 350000, // $3,500.00
    currency: 'usd',
    description: 'Comprehensive design with construction documents and project management',
  },
};

// Get tier pricing info
export function getTierPricing(tier: 1 | 2 | 3): TierPricing {
  return TIER_PRICING[tier];
}

// Validate tier is payable (1-3, not 4)
export function isPayableTier(tier: number): tier is 1 | 2 | 3 {
  return tier >= 1 && tier <= 3;
}

export default stripe;
