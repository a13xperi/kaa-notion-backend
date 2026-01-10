/**
 * Tier Features Tests
 * Tests for tier-based feature access control.
 */

import {
  TIER_FEATURES,
  hasFeature,
  getFeaturesForTier,
} from '../middleware/requireTier';

describe('Tier Features', () => {
  describe('TIER_FEATURES', () => {
    it('should define features for all tiers', () => {
      expect(TIER_FEATURES[1]).toBeDefined();
      expect(TIER_FEATURES[2]).toBeDefined();
      expect(TIER_FEATURES[3]).toBeDefined();
      expect(TIER_FEATURES[4]).toBeDefined();
    });

    it('all tiers should have basic features', () => {
      const basicFeatures = ['view_project', 'view_deliverables', 'download_deliverables', 'view_milestones'];
      
      [1, 2, 3, 4].forEach((tier) => {
        basicFeatures.forEach((feature) => {
          expect(TIER_FEATURES[tier as 1 | 2 | 3 | 4]).toContain(feature);
        });
      });
    });

    it('higher tiers should have more features', () => {
      expect(TIER_FEATURES[2].length).toBeGreaterThanOrEqual(TIER_FEATURES[1].length);
      expect(TIER_FEATURES[3].length).toBeGreaterThanOrEqual(TIER_FEATURES[2].length);
      expect(TIER_FEATURES[4].length).toBeGreaterThanOrEqual(TIER_FEATURES[3].length);
    });

    it('Tier 2+ should have revision requests', () => {
      expect(TIER_FEATURES[1]).not.toContain('request_revisions');
      expect(TIER_FEATURES[2]).toContain('request_revisions');
      expect(TIER_FEATURES[3]).toContain('request_revisions');
      expect(TIER_FEATURES[4]).toContain('request_revisions');
    });

    it('Tier 3+ should have scheduling calls', () => {
      expect(TIER_FEATURES[1]).not.toContain('schedule_calls');
      expect(TIER_FEATURES[2]).not.toContain('schedule_calls');
      expect(TIER_FEATURES[3]).toContain('schedule_calls');
      expect(TIER_FEATURES[4]).toContain('schedule_calls');
    });

    it('Tier 4 should have concierge service', () => {
      expect(TIER_FEATURES[1]).not.toContain('concierge_service');
      expect(TIER_FEATURES[2]).not.toContain('concierge_service');
      expect(TIER_FEATURES[3]).not.toContain('concierge_service');
      expect(TIER_FEATURES[4]).toContain('concierge_service');
    });
  });

  describe('hasFeature', () => {
    it('should return true for features included in tier', () => {
      expect(hasFeature(1, 'view_project')).toBe(true);
      expect(hasFeature(2, 'request_revisions')).toBe(true);
      expect(hasFeature(3, 'schedule_calls')).toBe(true);
      expect(hasFeature(4, 'concierge_service')).toBe(true);
    });

    it('should return false for features not included in tier', () => {
      expect(hasFeature(1, 'request_revisions')).toBe(false);
      expect(hasFeature(2, 'schedule_calls')).toBe(false);
      expect(hasFeature(3, 'concierge_service')).toBe(false);
    });

    it('should return false for invalid tier', () => {
      expect(hasFeature(0, 'view_project')).toBe(false);
      expect(hasFeature(5, 'view_project')).toBe(false);
    });

    it('should return false for non-existent feature', () => {
      expect(hasFeature(4, 'non_existent_feature')).toBe(false);
    });
  });

  describe('getFeaturesForTier', () => {
    it('should return all features for a tier', () => {
      const tier1Features = getFeaturesForTier(1);
      expect(tier1Features).toEqual(expect.arrayContaining(['view_project', 'view_deliverables']));
    });

    it('should return empty array for invalid tier', () => {
      expect(getFeaturesForTier(0)).toEqual([]);
      expect(getFeaturesForTier(5)).toEqual([]);
    });

    it('should return a copy, not the original array', () => {
      const features = getFeaturesForTier(1);
      features.push('fake_feature');
      
      const featuresAgain = getFeaturesForTier(1);
      expect(featuresAgain).not.toContain('fake_feature');
    });
  });
});
