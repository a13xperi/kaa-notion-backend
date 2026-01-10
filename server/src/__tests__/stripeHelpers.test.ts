/**
 * Stripe Helpers Tests
 * Tests for checkout session creation, webhook handling, and payment processing.
 */

import {
  TIER_PRICING,
  getTierPricing,
  isValidTier,
  formatAmount,
} from '../utils/stripeHelpers';

describe('Stripe Helpers', () => {
  describe('TIER_PRICING', () => {
    it('should have pricing for all 4 tiers', () => {
      expect(TIER_PRICING[1]).toBeDefined();
      expect(TIER_PRICING[2]).toBeDefined();
      expect(TIER_PRICING[3]).toBeDefined();
      expect(TIER_PRICING[4]).toBeDefined();
    });

    it('should have correct Tier 1 pricing', () => {
      const tier1 = TIER_PRICING[1];
      expect(tier1.tier).toBe(1);
      expect(tier1.amount).toBe(29900); // $299.00
      expect(tier1.currency).toBe('usd');
      expect(tier1.name).toContain('Tier 1');
      expect(tier1.name).toContain('Concept');
    });

    it('should have correct Tier 2 pricing', () => {
      const tier2 = TIER_PRICING[2];
      expect(tier2.tier).toBe(2);
      expect(tier2.amount).toBe(149900); // $1,499.00
      expect(tier2.currency).toBe('usd');
      expect(tier2.name).toContain('Tier 2');
      expect(tier2.name).toContain('Builder');
    });

    it('should have correct Tier 3 pricing', () => {
      const tier3 = TIER_PRICING[3];
      expect(tier3.tier).toBe(3);
      expect(tier3.amount).toBe(499900); // $4,999.00
      expect(tier3.currency).toBe('usd');
      expect(tier3.name).toContain('Tier 3');
      expect(tier3.name).toContain('Concierge');
    });

    it('should have custom pricing for Tier 4', () => {
      const tier4 = TIER_PRICING[4];
      expect(tier4.tier).toBe(4);
      expect(tier4.amount).toBe(0); // Custom pricing
      expect(tier4.name).toContain('Tier 4');
      expect(tier4.name).toContain('White Glove');
    });

    it('should have increasing prices for tiers 1-3', () => {
      expect(TIER_PRICING[2].amount).toBeGreaterThan(TIER_PRICING[1].amount);
      expect(TIER_PRICING[3].amount).toBeGreaterThan(TIER_PRICING[2].amount);
    });
  });

  describe('getTierPricing', () => {
    it('should return pricing for valid tier', () => {
      const pricing = getTierPricing(2);
      expect(pricing).toEqual(TIER_PRICING[2]);
    });

    it('should return pricing for each tier', () => {
      expect(getTierPricing(1).tier).toBe(1);
      expect(getTierPricing(2).tier).toBe(2);
      expect(getTierPricing(3).tier).toBe(3);
      expect(getTierPricing(4).tier).toBe(4);
    });
  });

  describe('isValidTier', () => {
    it('should return true for valid tiers', () => {
      expect(isValidTier(1)).toBe(true);
      expect(isValidTier(2)).toBe(true);
      expect(isValidTier(3)).toBe(true);
      expect(isValidTier(4)).toBe(true);
    });

    it('should return false for invalid tiers', () => {
      expect(isValidTier(0)).toBe(false);
      expect(isValidTier(5)).toBe(false);
      expect(isValidTier(-1)).toBe(false);
      expect(isValidTier(100)).toBe(false);
    });

    it('should return false for non-integer values', () => {
      expect(isValidTier(1.5)).toBe(false);
      expect(isValidTier(2.9)).toBe(false);
    });
  });

  describe('formatAmount', () => {
    it('should format USD amounts correctly', () => {
      expect(formatAmount(29900)).toBe('$299.00');
      expect(formatAmount(149900)).toBe('$1,499.00');
      expect(formatAmount(499900)).toBe('$4,999.00');
    });

    it('should handle zero amounts', () => {
      expect(formatAmount(0)).toBe('$0.00');
    });

    it('should handle small amounts', () => {
      expect(formatAmount(100)).toBe('$1.00');
      expect(formatAmount(50)).toBe('$0.50');
      expect(formatAmount(1)).toBe('$0.01');
    });

    it('should handle large amounts', () => {
      expect(formatAmount(10000000)).toBe('$100,000.00');
    });

    it('should respect currency parameter', () => {
      const eurFormatted = formatAmount(29900, 'eur');
      expect(eurFormatted).toContain('299');
    });
  });
});

describe('Checkout Session Validation', () => {
  describe('Tier validation for checkout', () => {
    it('should allow checkout for tiers 1-3', () => {
      [1, 2, 3].forEach(tier => {
        expect(isValidTier(tier)).toBe(true);
        expect(TIER_PRICING[tier as 1 | 2 | 3].amount).toBeGreaterThan(0);
      });
    });

    it('should have zero amount for tier 4 (custom pricing)', () => {
      expect(TIER_PRICING[4].amount).toBe(0);
    });
  });

  describe('Pricing consistency', () => {
    it('should have USD as default currency for all tiers', () => {
      [1, 2, 3, 4].forEach(tier => {
        expect(TIER_PRICING[tier as 1 | 2 | 3 | 4].currency).toBe('usd');
      });
    });

    it('should have descriptive names for all tiers', () => {
      [1, 2, 3, 4].forEach(tier => {
        const pricing = TIER_PRICING[tier as 1 | 2 | 3 | 4];
        expect(pricing.name.length).toBeGreaterThan(10);
        expect(pricing.description.length).toBeGreaterThan(10);
      });
    });
  });
});

describe('Payment Amount Calculations', () => {
  it('should calculate correct totals in cents', () => {
    // Verify amounts are in cents
    expect(TIER_PRICING[1].amount % 100).toBe(0); // $299.00
    expect(TIER_PRICING[2].amount % 100).toBe(0); // $1,499.00
    expect(TIER_PRICING[3].amount % 100).toBe(0); // $4,999.00
  });

  it('should have amounts that match formatted prices', () => {
    expect(formatAmount(TIER_PRICING[1].amount)).toBe('$299.00');
    expect(formatAmount(TIER_PRICING[2].amount)).toBe('$1,499.00');
    expect(formatAmount(TIER_PRICING[3].amount)).toBe('$4,999.00');
  });
});
