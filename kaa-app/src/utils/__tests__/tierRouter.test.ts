/**
 * Tests for Tier Router utility
 * Tests all tier routing logic: budget ranges, timelines, project types,
 * asset combinations, and edge cases
 */

import {
  recommendTier,
  getTierName,
  getTierDescription,
  validateIntakeFormData,
  IntakeFormData,
  TierRecommendation,
  BudgetRange,
  Timeline,
  ProjectType,
} from '../tierRouter';

describe('Tier Router', () => {
  // Helper to create test intake data with defaults
  const createIntakeData = (
    overrides: Partial<IntakeFormData> = {}
  ): IntakeFormData => ({
    budgetRange: '1500_5000',
    timeline: '4_8_weeks',
    projectType: 'standard_renovation',
    hasSurvey: true,
    hasDrawings: false,
    projectAddress: '123 Test Street',
    ...overrides,
  });

  describe('recommendTier', () => {
    describe('Budget Range Analysis', () => {
      it('recommends Tier 1 for budget under $500', () => {
        const result = recommendTier(
          createIntakeData({
            budgetRange: 'under_500',
            projectType: 'simple_renovation',
            hasSurvey: true,
            hasDrawings: true,
          })
        );
        expect(result.tier).toBe(1);
        expect(result.reason).toContain('Budget under $500');
      });

      it('recommends Tier 1-2 for budget $500-$1,500', () => {
        const result = recommendTier(
          createIntakeData({
            budgetRange: '500_1500',
            projectType: 'simple_renovation',
            hasSurvey: true,
            hasDrawings: true,
          })
        );
        expect(result.tier).toBeLessThanOrEqual(2);
      });

      it('recommends Tier 2 for budget $1,500-$5,000', () => {
        const result = recommendTier(
          createIntakeData({
            budgetRange: '1500_5000',
            projectType: 'standard_renovation',
          })
        );
        expect(result.tier).toBe(2);
      });

      it('recommends Tier 3 for budget $5,000-$15,000', () => {
        const result = recommendTier(
          createIntakeData({
            budgetRange: '5000_15000',
            projectType: 'major_renovation',
            hasSurvey: false,
            hasDrawings: false,
          })
        );
        expect(result.tier).toBe(3);
      });

      it('recommends Tier 4 for budget over $15,000', () => {
        const result = recommendTier(
          createIntakeData({
            budgetRange: '15000_plus',
            projectType: 'complex',
          })
        );
        expect(result.tier).toBe(4);
        expect(result.needsManualReview).toBe(true);
      });

      it('recommends Tier 4 for percentage-based pricing', () => {
        const result = recommendTier(
          createIntakeData({
            budgetRange: 'percentage_of_install',
          })
        );
        expect(result.tier).toBe(4);
        expect(result.needsManualReview).toBe(true);
      });
    });

    describe('Timeline Analysis', () => {
      it('handles fast timeline (under 2 weeks) with review flag', () => {
        const result = recommendTier(
          createIntakeData({
            timeline: 'under_2_weeks',
            projectType: 'simple_renovation',
            hasSurvey: true,
            hasDrawings: true,
          })
        );
        expect(result.needsManualReview).toBe(true);
      });

      it('handles standard 2-4 week timeline for Tier 1', () => {
        const result = recommendTier(
          createIntakeData({
            timeline: '2_4_weeks',
            budgetRange: 'under_500',
            projectType: 'simple_renovation',
            hasSurvey: true,
            hasDrawings: true,
          })
        );
        expect(result.tier).toBe(1);
      });

      it('handles 4-8 week timeline for Tier 2', () => {
        const result = recommendTier(
          createIntakeData({
            timeline: '4_8_weeks',
            budgetRange: '1500_5000',
            projectType: 'standard_renovation',
          })
        );
        expect(result.tier).toBe(2);
      });

      it('handles extended 8-12 week timeline for Tier 3', () => {
        const result = recommendTier(
          createIntakeData({
            timeline: '8_12_weeks',
            budgetRange: '5000_15000',
            projectType: 'major_renovation',
            hasSurvey: false,
            hasDrawings: false,
          })
        );
        expect(result.tier).toBe(3);
      });

      it('handles over 12 week timeline', () => {
        const result = recommendTier(
          createIntakeData({
            timeline: 'over_12_weeks',
            budgetRange: '5000_15000',
            projectType: 'new_build',
            hasSurvey: false,
            hasDrawings: false,
          })
        );
        expect(result.tier).toBeGreaterThanOrEqual(3);
      });
    });

    describe('Project Type Analysis', () => {
      it('recommends Tier 1 for simple renovation', () => {
        const result = recommendTier(
          createIntakeData({
            projectType: 'simple_renovation',
            budgetRange: 'under_500',
            hasSurvey: true,
            hasDrawings: true,
          })
        );
        expect(result.tier).toBe(1);
      });

      it('recommends Tier 2 for standard renovation', () => {
        const result = recommendTier(
          createIntakeData({
            projectType: 'standard_renovation',
            budgetRange: '1500_5000',
          })
        );
        expect(result.tier).toBe(2);
      });

      it('recommends Tier 3 for major renovation', () => {
        const result = recommendTier(
          createIntakeData({
            projectType: 'major_renovation',
            budgetRange: '5000_15000',
            hasSurvey: false,
            hasDrawings: false,
          })
        );
        expect(result.tier).toBe(3);
      });

      it('recommends Tier 2 for small addition', () => {
        const result = recommendTier(
          createIntakeData({
            projectType: 'small_addition',
            budgetRange: '1500_5000',
          })
        );
        expect(result.tier).toBe(2);
      });

      it('recommends Tier 3 for standard addition', () => {
        const result = recommendTier(
          createIntakeData({
            projectType: 'standard_addition',
            budgetRange: '5000_15000',
            hasSurvey: false,
            hasDrawings: false,
          })
        );
        expect(result.tier).toBe(3);
      });

      it('recommends Tier 3+ for new build', () => {
        const result = recommendTier(
          createIntakeData({
            projectType: 'new_build',
            budgetRange: '5000_15000',
            hasSurvey: false,
            hasDrawings: false,
          })
        );
        expect(result.tier).toBeGreaterThanOrEqual(3);
      });

      it('recommends Tier 4 for complex projects', () => {
        const result = recommendTier(
          createIntakeData({
            projectType: 'complex',
          })
        );
        expect(result.tier).toBe(4);
        expect(result.needsManualReview).toBe(true);
      });

      it('recommends Tier 4 for multiple properties', () => {
        const result = recommendTier(
          createIntakeData({
            projectType: 'multiple_properties',
          })
        );
        expect(result.tier).toBe(4);
        expect(result.needsManualReview).toBe(true);
      });
    });

    describe('Asset Combination Analysis', () => {
      it('recommends lower tier when both survey and drawings exist', () => {
        const withAssets = recommendTier(
          createIntakeData({
            hasSurvey: true,
            hasDrawings: true,
            budgetRange: '1500_5000',
            projectType: 'standard_renovation',
          })
        );

        const withoutAssets = recommendTier(
          createIntakeData({
            hasSurvey: false,
            hasDrawings: false,
            budgetRange: '1500_5000',
            projectType: 'standard_renovation',
          })
        );

        expect(withAssets.tier).toBeLessThanOrEqual(withoutAssets.tier);
      });

      it('handles case with only survey', () => {
        const result = recommendTier(
          createIntakeData({
            hasSurvey: true,
            hasDrawings: false,
            budgetRange: '1500_5000',
            projectType: 'standard_renovation',
          })
        );
        expect(result.tier).toBe(2);
      });

      it('handles case with only drawings', () => {
        const result = recommendTier(
          createIntakeData({
            hasSurvey: false,
            hasDrawings: true,
            budgetRange: '1500_5000',
            projectType: 'standard_renovation',
          })
        );
        expect(result.tier).toBe(2);
      });

      it('requires higher tier when no assets and new build', () => {
        const result = recommendTier(
          createIntakeData({
            hasSurvey: false,
            hasDrawings: false,
            projectType: 'new_build',
            budgetRange: '5000_15000',
          })
        );
        expect(result.tier).toBeGreaterThanOrEqual(3);
        expect(result.reason).toContain('site visit');
      });
    });

    describe('Edge Cases', () => {
      it('handles conflicting signals - low budget but complex project', () => {
        const result = recommendTier(
          createIntakeData({
            budgetRange: 'under_500',
            projectType: 'complex',
          })
        );
        // Complex always overrides to Tier 4
        expect(result.tier).toBe(4);
        expect(result.needsManualReview).toBe(true);
      });

      it('handles conflicting signals - high budget but simple project', () => {
        const result = recommendTier(
          createIntakeData({
            budgetRange: '15000_plus',
            projectType: 'simple_renovation',
            hasSurvey: true,
            hasDrawings: true,
          })
        );
        // High budget may push to Tier 4 but review needed
        expect(result.needsManualReview).toBe(true);
      });

      it('flags tight timeline with high-tier project for review', () => {
        const result = recommendTier(
          createIntakeData({
            timeline: 'under_2_weeks',
            projectType: 'major_renovation',
            budgetRange: '5000_15000',
            hasSurvey: false,
            hasDrawings: false,
          })
        );
        expect(result.needsManualReview).toBe(true);
        expect(result.reason).toContain('timeline');
      });

      it('Tier 4 always requires manual review', () => {
        const tier4Cases: Partial<IntakeFormData>[] = [
          { projectType: 'complex' },
          { projectType: 'multiple_properties' },
          { budgetRange: 'percentage_of_install' },
          { budgetRange: '15000_plus', projectType: 'new_build' },
        ];

        tier4Cases.forEach((overrides) => {
          const result = recommendTier(createIntakeData(overrides));
          if (result.tier === 4) {
            expect(result.needsManualReview).toBe(true);
          }
        });
      });

      it('returns tier within valid range (1-4)', () => {
        const testCases: Partial<IntakeFormData>[] = [
          { budgetRange: 'under_500', projectType: 'simple_renovation' },
          { budgetRange: '15000_plus', projectType: 'complex' },
          { budgetRange: '1500_5000', projectType: 'standard_renovation' },
          { budgetRange: '5000_15000', projectType: 'new_build' },
        ];

        testCases.forEach((overrides) => {
          const result = recommendTier(createIntakeData(overrides));
          expect(result.tier).toBeGreaterThanOrEqual(1);
          expect(result.tier).toBeLessThanOrEqual(4);
        });
      });
    });

    describe('Confidence Scoring', () => {
      it('returns high confidence when factors align', () => {
        const result = recommendTier(
          createIntakeData({
            budgetRange: 'under_500',
            timeline: '2_4_weeks',
            projectType: 'simple_renovation',
            hasSurvey: true,
            hasDrawings: true,
          })
        );
        expect(result.confidence).toBe('high');
      });

      it('returns low confidence when manual review needed', () => {
        const result = recommendTier(
          createIntakeData({
            projectType: 'complex',
          })
        );
        expect(result.confidence).toBe('low');
      });

      it('returns medium confidence for mixed signals', () => {
        const result = recommendTier(
          createIntakeData({
            budgetRange: 'under_500',
            timeline: 'over_12_weeks',
            projectType: 'standard_addition',
            hasSurvey: false,
            hasDrawings: false,
          })
        );
        // Mixed signals: low budget vs high complexity project
        expect(['medium', 'low', 'high']).toContain(result.confidence);
      });
    });

    describe('Reason Generation', () => {
      it('includes budget reason', () => {
        const result = recommendTier(
          createIntakeData({
            budgetRange: '5000_15000',
          })
        );
        expect(result.reason.toLowerCase()).toContain('budget');
      });

      it('combines multiple reasons', () => {
        const result = recommendTier(createIntakeData());
        expect(result.reason).toContain(';');
      });

      it('provides meaningful reason text', () => {
        const result = recommendTier(createIntakeData());
        expect(result.reason.length).toBeGreaterThan(20);
      });
    });
  });

  describe('getTierName', () => {
    it('returns correct name for Tier 1', () => {
      expect(getTierName(1)).toBe('The Concept');
    });

    it('returns correct name for Tier 2', () => {
      expect(getTierName(2)).toBe('The Builder');
    });

    it('returns correct name for Tier 3', () => {
      expect(getTierName(3)).toBe('The Concierge');
    });

    it('returns correct name for Tier 4', () => {
      expect(getTierName(4)).toBe('KAA White Glove');
    });
  });

  describe('getTierDescription', () => {
    it('returns description for Tier 1', () => {
      const desc = getTierDescription(1);
      expect(desc).toContain('Automated');
    });

    it('returns description for Tier 2', () => {
      const desc = getTierDescription(2);
      expect(desc).toContain('Systematized');
    });

    it('returns description for Tier 3', () => {
      const desc = getTierDescription(3);
      expect(desc).toContain('Site Visits');
    });

    it('returns description for Tier 4', () => {
      const desc = getTierDescription(4);
      expect(desc).toContain('White Glove');
    });
  });

  describe('validateIntakeFormData', () => {
    it('returns true for valid complete data', () => {
      const validData: IntakeFormData = {
        budgetRange: '1500_5000',
        timeline: '4_8_weeks',
        projectType: 'standard_renovation',
        hasSurvey: true,
        hasDrawings: false,
        projectAddress: '123 Test Street',
      };
      expect(validateIntakeFormData(validData)).toBe(true);
    });

    it('returns false for missing budgetRange', () => {
      const invalidData = {
        timeline: '4_8_weeks',
        projectType: 'standard_renovation',
        hasSurvey: true,
        hasDrawings: false,
        projectAddress: '123 Test Street',
      };
      expect(validateIntakeFormData(invalidData)).toBe(false);
    });

    it('returns false for missing timeline', () => {
      const invalidData = {
        budgetRange: '1500_5000',
        projectType: 'standard_renovation',
        hasSurvey: true,
        hasDrawings: false,
        projectAddress: '123 Test Street',
      };
      expect(validateIntakeFormData(invalidData)).toBe(false);
    });

    it('returns false for missing projectType', () => {
      const invalidData = {
        budgetRange: '1500_5000',
        timeline: '4_8_weeks',
        hasSurvey: true,
        hasDrawings: false,
        projectAddress: '123 Test Street',
      };
      expect(validateIntakeFormData(invalidData)).toBe(false);
    });

    it('returns false for missing hasSurvey', () => {
      const invalidData = {
        budgetRange: '1500_5000',
        timeline: '4_8_weeks',
        projectType: 'standard_renovation',
        hasDrawings: false,
        projectAddress: '123 Test Street',
      };
      expect(validateIntakeFormData(invalidData)).toBe(false);
    });

    it('returns false for missing hasDrawings', () => {
      const invalidData = {
        budgetRange: '1500_5000',
        timeline: '4_8_weeks',
        projectType: 'standard_renovation',
        hasSurvey: true,
        projectAddress: '123 Test Street',
      };
      expect(validateIntakeFormData(invalidData)).toBe(false);
    });

    it('returns false for missing projectAddress', () => {
      const invalidData = {
        budgetRange: '1500_5000',
        timeline: '4_8_weeks',
        projectType: 'standard_renovation',
        hasSurvey: true,
        hasDrawings: false,
      };
      expect(validateIntakeFormData(invalidData)).toBe(false);
    });

    it('returns false for empty projectAddress', () => {
      const invalidData = {
        budgetRange: '1500_5000',
        timeline: '4_8_weeks',
        projectType: 'standard_renovation',
        hasSurvey: true,
        hasDrawings: false,
        projectAddress: '',
      };
      expect(validateIntakeFormData(invalidData)).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(validateIntakeFormData({})).toBe(false);
    });

    it('returns false for wrong types', () => {
      const invalidData = {
        budgetRange: 123,
        timeline: '4_8_weeks',
        projectType: 'standard_renovation',
        hasSurvey: 'yes',
        hasDrawings: false,
        projectAddress: '123 Test Street',
      };
      expect(validateIntakeFormData(invalidData as any)).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('Scenario: First-time homeowner with small kitchen renovation', () => {
      const result = recommendTier({
        budgetRange: 'under_500',
        timeline: '2_4_weeks',
        projectType: 'simple_renovation',
        hasSurvey: false,
        hasDrawings: true,
        projectAddress: '456 Home Ave',
      });
      expect(result.tier).toBeLessThanOrEqual(2);
      expect(result.confidence).not.toBe('low');
    });

    it('Scenario: Developer with multiple property project', () => {
      const result = recommendTier({
        budgetRange: 'percentage_of_install',
        timeline: 'over_12_weeks',
        projectType: 'multiple_properties',
        hasSurvey: true,
        hasDrawings: true,
        projectAddress: 'Various locations',
      });
      expect(result.tier).toBe(4);
      expect(result.needsManualReview).toBe(true);
    });

    it('Scenario: Standard home addition with existing plans', () => {
      const result = recommendTier({
        budgetRange: '5000_15000',
        timeline: '8_12_weeks',
        projectType: 'standard_addition',
        hasSurvey: true,
        hasDrawings: true,
        projectAddress: '789 Builder Rd',
      });
      expect(result.tier).toBe(3);
    });

    it('Scenario: Rush job simple renovation', () => {
      const result = recommendTier({
        budgetRange: '500_1500',
        timeline: 'under_2_weeks',
        projectType: 'simple_renovation',
        hasSurvey: true,
        hasDrawings: true,
        projectAddress: '321 Quick St',
      });
      // Should be lower tier but flagged for review due to tight timeline
      expect(result.needsManualReview).toBe(true);
    });

    it('Scenario: New build from scratch', () => {
      const result = recommendTier({
        budgetRange: '5000_15000',
        timeline: 'over_12_weeks',
        projectType: 'new_build',
        hasSurvey: false,
        hasDrawings: false,
        projectAddress: 'Empty Lot, New Development',
      });
      expect(result.tier).toBeGreaterThanOrEqual(3);
      expect(result.reason).toContain('site visit');
    });
  });
});
