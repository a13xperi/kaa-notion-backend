/**
 * Milestone Templates Tests
 * Tests for tier-specific milestone configuration.
 */

import {
  getMilestoneTemplates,
  getTierConfig,
  getRequiredMilestones,
  generateMilestoneDueDates,
  getEstimatedCompletionDate,
  isValidTier,
  TIER_MILESTONE_CONFIGS,
} from '../services/milestoneTemplates';

describe('Milestone Templates', () => {
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
    });
  });

  describe('getTierConfig', () => {
    it('should return config for valid tier', () => {
      const config = getTierConfig(2);
      expect(config).toBeDefined();
      expect(config?.tier).toBe(2);
      expect(config?.tierName).toBe('The Builder');
    });

    it('should throw for invalid tier', () => {
      expect(() => getTierConfig(5 as any)).toThrow('Invalid tier');
      expect(() => getTierConfig(0 as any)).toThrow('Invalid tier');
    });
  });

  describe('getMilestoneTemplates', () => {
    it('should return milestones for valid tier', () => {
      const milestones = getMilestoneTemplates(1);
      expect(milestones).toBeInstanceOf(Array);
      expect(milestones.length).toBeGreaterThan(0);
    });

    it('should throw for invalid tier', () => {
      expect(() => getMilestoneTemplates(5 as any)).toThrow('Invalid tier');
    });

    it('should have milestones in correct order', () => {
      const milestones = getMilestoneTemplates(2);
      for (let i = 1; i < milestones.length; i++) {
        expect(milestones[i].order).toBeGreaterThan(milestones[i - 1].order);
      }
    });
  });

  describe('getRequiredMilestones', () => {
    it('should return only non-optional milestones', () => {
      const required = getRequiredMilestones(3);
      expect(required.every((m) => !m.optional)).toBe(true);
    });
  });

  describe('generateMilestoneDueDates', () => {
    it('should generate due dates from start date', () => {
      const startDate = new Date('2024-01-01');
      const dueDates = generateMilestoneDueDates(2, startDate);

      expect(dueDates).toBeInstanceOf(Array);
      expect(dueDates.length).toBeGreaterThan(0);

      // All due dates should be after start date
      dueDates.forEach(({ dueDate }) => {
        if (dueDate) {
          expect(dueDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        }
      });
    });

    it('should throw for invalid tier', () => {
      expect(() => generateMilestoneDueDates(5 as any, new Date())).toThrow('Invalid tier');
    });
  });

  describe('getEstimatedCompletionDate', () => {
    it('should return estimated completion date', () => {
      const startDate = new Date('2024-01-01');
      const completionDate = getEstimatedCompletionDate(1, startDate);

      expect(completionDate).toBeInstanceOf(Date);
      expect(completionDate!.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it('should return null for tier with variable duration', () => {
      const startDate = new Date('2024-01-01');
      const completionDate = getEstimatedCompletionDate(4, startDate);
      // Tier 4 has null max duration
      expect(completionDate).toBeNull();
    });

    it('should throw for invalid tier', () => {
      expect(() => getEstimatedCompletionDate(5 as any, new Date())).toThrow('Invalid tier');
    });
  });

  describe('TIER_MILESTONE_CONFIGS', () => {
    it('should have configurations for all 4 tiers', () => {
      expect(TIER_MILESTONE_CONFIGS[1]).toBeDefined();
      expect(TIER_MILESTONE_CONFIGS[2]).toBeDefined();
      expect(TIER_MILESTONE_CONFIGS[3]).toBeDefined();
      expect(TIER_MILESTONE_CONFIGS[4]).toBeDefined();
    });

    it('Tier 1 should have correct name', () => {
      expect(TIER_MILESTONE_CONFIGS[1].tierName).toBe('The Concept');
    });

    it('Tier 2 should have correct name', () => {
      expect(TIER_MILESTONE_CONFIGS[2].tierName).toBe('The Builder');
    });

    it('Tier 3 should have correct name', () => {
      expect(TIER_MILESTONE_CONFIGS[3].tierName).toBe('The Concierge');
    });

    it('Tier 4 should have correct name', () => {
      expect(TIER_MILESTONE_CONFIGS[4].tierName).toBe('KAA White Glove');
    });

    it('higher tiers should have more milestones', () => {
      const tier1Count = TIER_MILESTONE_CONFIGS[1].milestones.length;
      const tier4Count = TIER_MILESTONE_CONFIGS[4].milestones.length;
      expect(tier4Count).toBeGreaterThan(tier1Count);
    });

    it('each tier should include site visit info', () => {
      expect(TIER_MILESTONE_CONFIGS[1].includesSiteVisit).toBe(false);
      expect(TIER_MILESTONE_CONFIGS[2].includesSiteVisit).toBe(false);
      expect(TIER_MILESTONE_CONFIGS[3].includesSiteVisit).toBe(true);
      expect(TIER_MILESTONE_CONFIGS[4].includesSiteVisit).toBe(true);
    });
  });
});
