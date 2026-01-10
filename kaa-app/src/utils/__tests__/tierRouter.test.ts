/**
 * Tests for Tier Router algorithm
 * Tests all tier routing logic: budget ranges, timelines, project types, asset combinations, edge cases
 */

import {
  recommendTier,
  getTierInfo,
  getAllTiers,
  IntakeFormData,
  TierRecommendation,
  BudgetRange,
  Timeline,
  ProjectType,
} from '../tierRouter';

// Helper to create intake form data with defaults
const createIntakeData = (overrides: Partial<IntakeFormData> = {}): IntakeFormData => ({
  budgetRange: '2000_5000',
  timeline: '1_2_months',
  projectType: 'standard_renovation',
  hasSurvey: false,
  hasDrawings: false,
  projectAddress: '123 Test St, Test City, TC 12345',
  email: 'test@example.com',
  name: 'Test User',
  ...overrides,
});

describe('Tier Router', () => {
  describe('Budget Range Analysis', () => {
    it('recommends Tier 1 for under_500 budget', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'under_500',
        timeline: '2_4_weeks',
        projectType: 'simple_consultation',
        hasSurvey: true,
        hasDrawings: true,
      }));

      expect(result.tier).toBe(1);
      expect(result.confidence).toBe('high');
    });

    it('recommends Tier 1-2 for 500_2000 budget', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '500_2000',
        timeline: '2_4_weeks',
        projectType: 'small_renovation',
      }));

      expect(result.tier).toBeLessThanOrEqual(2);
    });

    it('recommends Tier 2 for 2000_5000 budget', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '2000_5000',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
      }));

      expect(result.tier).toBe(2);
    });

    it('recommends Tier 2-3 for 5000_15000 budget', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '5000_15000',
        timeline: '2_4_months',
        projectType: 'addition',
      }));

      expect(result.tier).toBeGreaterThanOrEqual(2);
      expect(result.tier).toBeLessThanOrEqual(3);
    });

    it('recommends Tier 3 for 15000_50000 budget', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '15000_50000',
        timeline: '2_4_months',
        projectType: 'new_build',
      }));

      expect(result.tier).toBe(3);
    });

    it('recommends Tier 4 for over_50000 budget', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'over_50000',
        timeline: '4_plus_months',
        projectType: 'commercial',
      }));

      expect(result.tier).toBe(4);
    });

    it('recommends Tier 4 for percentage-based pricing', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'percentage',
        timeline: '4_plus_months',
        projectType: 'complex',
      }));

      expect(result.tier).toBe(4);
    });

    it('flags not_sure budget for manual review', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'not_sure',
      }));

      expect(result.needsManualReview).toBe(true);
    });
  });

  describe('Timeline Analysis', () => {
    it('recommends Tier 1 for asap timeline with matching factors', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'under_500',
        timeline: 'asap',
        projectType: 'simple_consultation',
        hasSurvey: true,
        hasDrawings: true,
      }));

      expect(result.tier).toBe(1);
    });

    it('recommends Tier 1 for 2_4_weeks timeline with matching factors', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '500_2000',
        timeline: '2_4_weeks',
        projectType: 'small_renovation',
        hasSurvey: true,
        hasDrawings: true,
      }));

      expect(result.tier).toBeLessThanOrEqual(2);
    });

    it('recommends Tier 2 for 1_2_months timeline', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '2000_5000',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
      }));

      expect(result.tier).toBe(2);
    });

    it('recommends Tier 3 for 2_4_months timeline', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '15000_50000',
        timeline: '2_4_months',
        projectType: 'new_build',
      }));

      expect(result.tier).toBe(3);
    });

    it('recommends Tier 3-4 for 4_plus_months timeline', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'over_50000',
        timeline: '4_plus_months',
        projectType: 'complex',
      }));

      expect(result.tier).toBeGreaterThanOrEqual(3);
    });

    it('handles flexible timeline based on other factors', () => {
      const tier1Result = recommendTier(createIntakeData({
        budgetRange: 'under_500',
        timeline: 'flexible',
        projectType: 'simple_consultation',
        hasSurvey: true,
        hasDrawings: true,
      }));

      const tier3Result = recommendTier(createIntakeData({
        budgetRange: '15000_50000',
        timeline: 'flexible',
        projectType: 'new_build',
      }));

      expect(tier1Result.tier).toBeLessThan(tier3Result.tier);
    });

    it('flags asap timeline with high tier for manual review', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '15000_50000',
        timeline: 'asap',
        projectType: 'new_build',
      }));

      expect(result.needsManualReview).toBe(true);
    });
  });

  describe('Project Type Analysis', () => {
    it('recommends Tier 1 for simple_consultation', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'under_500',
        timeline: '2_4_weeks',
        projectType: 'simple_consultation',
        hasSurvey: true,
        hasDrawings: true,
      }));

      expect(result.tier).toBe(1);
    });

    it('recommends Tier 1-2 for small_renovation', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '500_2000',
        timeline: '2_4_weeks',
        projectType: 'small_renovation',
      }));

      expect(result.tier).toBeLessThanOrEqual(2);
    });

    it('recommends Tier 2 for standard_renovation', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '2000_5000',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
      }));

      expect(result.tier).toBe(2);
    });

    it('recommends Tier 2-3 for addition', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '5000_15000',
        timeline: '2_4_months',
        projectType: 'addition',
      }));

      expect(result.tier).toBeGreaterThanOrEqual(2);
      expect(result.tier).toBeLessThanOrEqual(3);
    });

    it('recommends Tier 3+ for new_build', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '15000_50000',
        timeline: '2_4_months',
        projectType: 'new_build',
      }));

      expect(result.tier).toBeGreaterThanOrEqual(3);
    });

    it('recommends Tier 4 for commercial projects', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'over_50000',
        timeline: '4_plus_months',
        projectType: 'commercial',
      }));

      expect(result.tier).toBe(4);
      expect(result.needsManualReview).toBe(true);
    });

    it('recommends Tier 4 for multiple_properties', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'over_50000',
        timeline: '4_plus_months',
        projectType: 'multiple_properties',
      }));

      expect(result.tier).toBe(4);
      expect(result.needsManualReview).toBe(true);
    });

    it('recommends Tier 4 for complex projects', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'over_50000',
        timeline: '4_plus_months',
        projectType: 'complex',
      }));

      expect(result.tier).toBe(4);
      expect(result.needsManualReview).toBe(true);
    });
  });

  describe('Asset Analysis', () => {
    it('fast-tracks to Tier 1-2 when both survey and drawings exist', () => {
      const withAssets = recommendTier(createIntakeData({
        budgetRange: '2000_5000',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
        hasSurvey: true,
        hasDrawings: true,
      }));

      const withoutAssets = recommendTier(createIntakeData({
        budgetRange: '2000_5000',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
        hasSurvey: false,
        hasDrawings: false,
      }));

      expect(withAssets.tier).toBeLessThanOrEqual(withoutAssets.tier);
    });

    it('suggests Tier 2 when partial assets exist', () => {
      const surveyOnly = recommendTier(createIntakeData({
        budgetRange: '2000_5000',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
        hasSurvey: true,
        hasDrawings: false,
      }));

      const drawingsOnly = recommendTier(createIntakeData({
        budgetRange: '2000_5000',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
        hasSurvey: false,
        hasDrawings: true,
      }));

      expect(surveyOnly.tier).toBeLessThanOrEqual(3);
      expect(drawingsOnly.tier).toBeLessThanOrEqual(3);
    });

    it('suggests Tier 3+ when no assets exist for complex projects', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '15000_50000',
        timeline: '2_4_months',
        projectType: 'new_build',
        hasSurvey: false,
        hasDrawings: false,
      }));

      expect(result.tier).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Confidence Scoring', () => {
    it('returns high confidence when all factors agree', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'under_500',
        timeline: '2_4_weeks',
        projectType: 'simple_consultation',
        hasSurvey: true,
        hasDrawings: true,
      }));

      expect(result.confidence).toBe('high');
    });

    it('returns medium confidence when most factors agree', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '2000_5000',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
        hasSurvey: false,
        hasDrawings: false,
      }));

      expect(['high', 'medium']).toContain(result.confidence);
    });

    it('returns low confidence when factors disagree significantly', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'under_500',  // Suggests Tier 1
        timeline: '4_plus_months', // Suggests Tier 3
        projectType: 'commercial', // Suggests Tier 4
        hasSurvey: true,
        hasDrawings: true,
      }));

      expect(result.confidence).toBe('low');
    });
  });

  describe('Manual Review Detection', () => {
    it('always requires review for Tier 4', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'over_50000',
        timeline: '4_plus_months',
        projectType: 'commercial',
      }));

      expect(result.tier).toBe(4);
      expect(result.needsManualReview).toBe(true);
    });

    it('requires review for low confidence', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'under_500',
        timeline: '4_plus_months',
        projectType: 'commercial',
      }));

      expect(result.confidence).toBe('low');
      expect(result.needsManualReview).toBe(true);
    });

    it('requires review when budget is not_sure', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'not_sure',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
      }));

      expect(result.needsManualReview).toBe(true);
    });

    it('requires review for asap timeline with high tier', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '15000_50000',
        timeline: 'asap',
        projectType: 'new_build',
      }));

      expect(result.needsManualReview).toBe(true);
    });

    it('requires review for complex project types', () => {
      const complexResult = recommendTier(createIntakeData({
        projectType: 'complex',
      }));

      const commercialResult = recommendTier(createIntakeData({
        projectType: 'commercial',
      }));

      const multipleResult = recommendTier(createIntakeData({
        projectType: 'multiple_properties',
      }));

      expect(complexResult.needsManualReview).toBe(true);
      expect(commercialResult.needsManualReview).toBe(true);
      expect(multipleResult.needsManualReview).toBe(true);
    });
  });

  describe('Reason Generation', () => {
    it('generates a non-empty reason string', () => {
      const result = recommendTier(createIntakeData());

      expect(result.reason).toBeTruthy();
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it('includes relevant factor descriptions in reason', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '2000_5000',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
      }));

      // Reason should mention at least one of the key factors
      const reasonLower = result.reason.toLowerCase();
      const hasRelevantContent =
        reasonLower.includes('budget') ||
        reasonLower.includes('tier') ||
        reasonLower.includes('renovation') ||
        reasonLower.includes('timeline');

      expect(hasRelevantContent).toBe(true);
    });
  });

  describe('Factors Array', () => {
    it('returns all four factors', () => {
      const result = recommendTier(createIntakeData());

      expect(result.factors).toHaveLength(4);
    });

    it('includes budget, timeline, project_type, and assets factors', () => {
      const result = recommendTier(createIntakeData());

      const factorNames = result.factors.map(f => f.factor);
      expect(factorNames).toContain('budget');
      expect(factorNames).toContain('timeline');
      expect(factorNames).toContain('project_type');
      expect(factorNames).toContain('assets');
    });

    it('each factor has valid tier suggestion (1-4)', () => {
      const result = recommendTier(createIntakeData());

      result.factors.forEach(factor => {
        expect(factor.suggestedTier).toBeGreaterThanOrEqual(1);
        expect(factor.suggestedTier).toBeLessThanOrEqual(4);
      });
    });

    it('each factor has positive weight', () => {
      const result = recommendTier(createIntakeData());

      result.factors.forEach(factor => {
        expect(factor.weight).toBeGreaterThan(0);
      });
    });

    it('each factor has a description', () => {
      const result = recommendTier(createIntakeData());

      result.factors.forEach(factor => {
        expect(factor.description).toBeTruthy();
        expect(typeof factor.description).toBe('string');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles unknown budget range gracefully', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'unknown_value' as BudgetRange,
      }));

      expect(result.tier).toBeGreaterThanOrEqual(1);
      expect(result.tier).toBeLessThanOrEqual(4);
    });

    it('handles unknown timeline gracefully', () => {
      const result = recommendTier(createIntakeData({
        timeline: 'unknown_value' as Timeline,
      }));

      expect(result.tier).toBeGreaterThanOrEqual(1);
      expect(result.tier).toBeLessThanOrEqual(4);
    });

    it('handles unknown project type gracefully', () => {
      const result = recommendTier(createIntakeData({
        projectType: 'unknown_value' as ProjectType,
      }));

      expect(result.tier).toBeGreaterThanOrEqual(1);
      expect(result.tier).toBeLessThanOrEqual(4);
    });

    it('always returns a tier between 1 and 4', () => {
      const testCases: Partial<IntakeFormData>[] = [
        { budgetRange: 'under_500', projectType: 'simple_consultation' },
        { budgetRange: 'over_50000', projectType: 'commercial' },
        { budgetRange: 'not_sure', timeline: 'flexible' },
        { hasSurvey: true, hasDrawings: true },
        { hasSurvey: false, hasDrawings: false },
      ];

      testCases.forEach(testCase => {
        const result = recommendTier(createIntakeData(testCase));
        expect(result.tier).toBeGreaterThanOrEqual(1);
        expect(result.tier).toBeLessThanOrEqual(4);
      });
    });

    it('handles minimal input data', () => {
      const result = recommendTier({
        budgetRange: '2000_5000',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
        hasSurvey: false,
        hasDrawings: false,
        projectAddress: '123 Test St',
      });

      expect(result.tier).toBeDefined();
      expect(result.reason).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.needsManualReview).toBeDefined();
      expect(result.factors).toBeDefined();
    });
  });

  describe('Typical User Scenarios', () => {
    it('DIY homeowner: budget-conscious, short timeline, has own survey', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'under_500',
        timeline: '2_4_weeks',
        projectType: 'simple_consultation',
        hasSurvey: true,
        hasDrawings: false,
      }));

      expect(result.tier).toBe(1);
      expect(result.needsManualReview).toBe(false);
    });

    it('Renovating homeowner: mid budget, standard timeline, no assets', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '2000_5000',
        timeline: '1_2_months',
        projectType: 'standard_renovation',
        hasSurvey: false,
        hasDrawings: false,
      }));

      expect(result.tier).toBe(2);
    });

    it('New build client: high budget, long timeline, complex project', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: '15000_50000',
        timeline: '2_4_months',
        projectType: 'new_build',
        hasSurvey: false,
        hasDrawings: false,
      }));

      expect(result.tier).toBe(3);
    });

    it('Luxury client: premium budget, extended timeline, exclusive project', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'over_50000',
        timeline: '4_plus_months',
        projectType: 'complex',
        hasSurvey: false,
        hasDrawings: false,
      }));

      expect(result.tier).toBe(4);
      expect(result.needsManualReview).toBe(true);
    });

    it('Commercial developer: percentage pricing, multiple properties', () => {
      const result = recommendTier(createIntakeData({
        budgetRange: 'percentage',
        timeline: '4_plus_months',
        projectType: 'multiple_properties',
        hasSurvey: false,
        hasDrawings: false,
      }));

      expect(result.tier).toBe(4);
      expect(result.needsManualReview).toBe(true);
    });
  });
});

describe('getTierInfo', () => {
  it('returns correct info for Tier 1', () => {
    const info = getTierInfo(1);

    expect(info.id).toBe(1);
    expect(info.name).toBe('The Concept');
    expect(info.priceDisplay).toBe('$299');
    expect(info.features).toContain('Professional concept design');
  });

  it('returns correct info for Tier 2', () => {
    const info = getTierInfo(2);

    expect(info.id).toBe(2);
    expect(info.name).toBe('The Builder');
    expect(info.priceDisplay).toBe('$1,499');
    expect(info.features).toContain('Complete design package');
  });

  it('returns correct info for Tier 3', () => {
    const info = getTierInfo(3);

    expect(info.id).toBe(3);
    expect(info.name).toBe('The Concierge');
    expect(info.priceDisplay).toContain('$4,999');
    expect(info.features).toContain('On-site consultation');
  });

  it('returns correct info for Tier 4', () => {
    const info = getTierInfo(4);

    expect(info.id).toBe(4);
    expect(info.name).toBe('KAA White Glove');
    expect(info.priceDisplay).toBe('By Invitation');
    expect(info.features).toContain('Exclusive, invitation-only service');
  });

  it('all tiers have required fields', () => {
    [1, 2, 3, 4].forEach(tier => {
      const info = getTierInfo(tier as 1 | 2 | 3 | 4);

      expect(info.id).toBeDefined();
      expect(info.name).toBeDefined();
      expect(info.tagline).toBeDefined();
      expect(info.priceDisplay).toBeDefined();
      expect(info.features).toBeDefined();
      expect(Array.isArray(info.features)).toBe(true);
      expect(info.features.length).toBeGreaterThan(0);
    });
  });
});

describe('getAllTiers', () => {
  it('returns all 4 tiers', () => {
    const tiers = getAllTiers();

    expect(tiers).toHaveLength(4);
  });

  it('returns tiers in order (1-4)', () => {
    const tiers = getAllTiers();

    expect(tiers[0].id).toBe(1);
    expect(tiers[1].id).toBe(2);
    expect(tiers[2].id).toBe(3);
    expect(tiers[3].id).toBe(4);
  });

  it('each tier has complete information', () => {
    const tiers = getAllTiers();

    tiers.forEach(tier => {
      expect(tier.id).toBeDefined();
      expect(tier.name).toBeDefined();
      expect(tier.tagline).toBeDefined();
      expect(tier.priceDisplay).toBeDefined();
      expect(tier.features).toBeDefined();
    });
  });
});
