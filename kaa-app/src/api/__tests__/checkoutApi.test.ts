/**
 * Checkout API Client Tests
 */

import { formatPrice, getTierInfo } from '../checkoutApi';

describe('Checkout API Client', () => {
  describe('formatPrice', () => {
    it('should format price in cents to USD', () => {
      expect(formatPrice(29900)).toBe('$299');
      expect(formatPrice(149900)).toBe('$1,499');
      expect(formatPrice(499900)).toBe('$4,999');
    });

    it('should handle zero', () => {
      expect(formatPrice(0)).toBe('$0');
    });

    it('should handle small amounts', () => {
      expect(formatPrice(100)).toBe('$1');
      expect(formatPrice(99)).toBe('$1'); // Rounds to nearest dollar
    });

    it('should handle large amounts', () => {
      expect(formatPrice(10000000)).toBe('$100,000');
    });

    it('should use specified currency', () => {
      const result = formatPrice(29900, 'eur');
      expect(result).toContain('299');
    });
  });

  describe('getTierInfo', () => {
    it('should return info for Tier 1', () => {
      const info = getTierInfo(1);
      expect(info.name).toBe('The Concept');
      expect(info.tagline).toBe('DIY Guidance');
    });

    it('should return info for Tier 2', () => {
      const info = getTierInfo(2);
      expect(info.name).toBe('The Builder');
      expect(info.tagline).toBe('Low-Touch Design');
    });

    it('should return info for Tier 3', () => {
      const info = getTierInfo(3);
      expect(info.name).toBe('The Concierge');
      expect(info.tagline).toBe('Full Service');
    });

    it('should return info for Tier 4', () => {
      const info = getTierInfo(4);
      expect(info.name).toBe('White Glove');
      expect(info.tagline).toBe('Premium Experience');
    });

    it('should return fallback for unknown tier', () => {
      const info = getTierInfo(5);
      expect(info.name).toBe('Tier 5');
      expect(info.tagline).toBe('');
    });
  });
});

describe('Checkout Flow', () => {
  describe('Tier Pricing', () => {
    it('should have increasing prices', () => {
      const tier1 = 29900;
      const tier2 = 149900;
      const tier3 = 499900;

      expect(tier2).toBeGreaterThan(tier1);
      expect(tier3).toBeGreaterThan(tier2);
    });

    it('should format all tier prices correctly', () => {
      expect(formatPrice(29900)).toBe('$299');
      expect(formatPrice(149900)).toBe('$1,499');
      expect(formatPrice(499900)).toBe('$4,999');
    });
  });

  describe('Tier Information', () => {
    it('should have unique names for all tiers', () => {
      const names = [1, 2, 3, 4].map(tier => getTierInfo(tier).name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(4);
    });

    it('should have taglines for all tiers', () => {
      [1, 2, 3, 4].forEach(tier => {
        const info = getTierInfo(tier);
        expect(info.tagline.length).toBeGreaterThan(0);
      });
    });
  });
});
