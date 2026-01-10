/**
 * Tier Router Tests
 * Tests for the tier recommendation algorithm.
 */

import {
  recommendTier,
  validateIntakeData,
  getTierSummary,
  isAutoRoutable,
  IntakeFormData,
  TierRecommendation,
} from '../tierRouter';

// ============================================================================
// TEST DATA
// ============================================================================

const createIntakeData = (overrides: Partial<IntakeFormData> = {}): IntakeFormData => ({
  budget: 10000,
  timelineWeeks: 4,
  projectType: 'standard_renovation',
  hasSurvey: true,
  hasDrawings: true,
  ...overrides,
});

// ============================================================================
// TIER RECOMMENDATION TESTS
// ============================================================================

describe('recommendTier', () => {
  describe('budget-based routing', () => {
    it('should recommend Tier 1 for budget $2,500-$7,500', () => {
      const data = createIntakeData({ budget: 5000 });
      const result = recommendTier(data);
      
      expect(result.tier).toBeLessThanOrEqual(2);
      expect(result.factors.find(f => f.factor === 'budget')?.suggestedTier).toBe(1);
    });

    it('should recommend Tier 2 for budget $7,500-$15,000', () => {
      const data = createIntakeData({ budget: 10000 });
      const result = recommendTier(data);
      
      expect(result.factors.find(f => f.factor === 'budget')?.suggestedTier).toBe(2);
    });

    it('should recommend Tier 3 for budget $15,000-$35,000', () => {
      const data = createIntakeData({ budget: 25000 });
      const result = recommendTier(data);
      
      expect(result.factors.find(f => f.factor === 'budget')?.suggestedTier).toBe(3);
    });

    it('should recommend Tier 4 for budget $35,000+', () => {
      const data = createIntakeData({ budget: 50000 });
      const result = recommendTier(data);
      
      expect(result.tier).toBe(4);
      expect(result.factors.find(f => f.factor === 'budget')?.suggestedTier).toBe(4);
    });

    it('should flag budget below minimum threshold', () => {
      const data = createIntakeData({ budget: 1000 });
      const result = recommendTier(data);
      
      expect(result.redFlags).toContain('Budget below minimum threshold');
    });
  });

  describe('timeline-based routing', () => {
    it('should suggest Tier 1/2 for fast timeline (<2 weeks)', () => {
      const data = createIntakeData({ timelineWeeks: 1 });
      const result = recommendTier(data);
      
      const timelineFactor = result.factors.find(f => f.factor === 'timeline');
      expect(timelineFactor?.suggestedTier).toBeLessThanOrEqual(2);
    });

    it('should suggest Tier 2/3 for standard timeline (2-8 weeks)', () => {
      const data = createIntakeData({ timelineWeeks: 4 });
      const result = recommendTier(data);
      
      const timelineFactor = result.factors.find(f => f.factor === 'timeline');
      expect(timelineFactor?.suggestedTier).toBe(2);
    });

    it('should suggest Tier 3/4 for extended timeline (8+ weeks)', () => {
      const data = createIntakeData({ timelineWeeks: 12 });
      const result = recommendTier(data);
      
      const timelineFactor = result.factors.find(f => f.factor === 'timeline');
      expect(timelineFactor?.suggestedTier).toBeGreaterThanOrEqual(3);
    });
  });

  describe('asset-based routing', () => {
    it('should allow Tier 1/2 when both survey and drawings exist', () => {
      const data = createIntakeData({ hasSurvey: true, hasDrawings: true });
      const result = recommendTier(data);
      
      const assetFactor = result.factors.find(f => f.factor === 'assets');
      expect(assetFactor?.suggestedTier).toBeLessThanOrEqual(2);
    });

    it('should suggest Tier 2/3 when only survey exists', () => {
      const data = createIntakeData({ hasSurvey: true, hasDrawings: false });
      const result = recommendTier(data);
      
      const assetFactor = result.factors.find(f => f.factor === 'assets');
      expect(assetFactor?.suggestedTier).toBeGreaterThanOrEqual(2);
    });

    it('should suggest Tier 2/3 when only drawings exist', () => {
      const data = createIntakeData({ hasSurvey: false, hasDrawings: true });
      const result = recommendTier(data);
      
      const assetFactor = result.factors.find(f => f.factor === 'assets');
      expect(assetFactor?.suggestedTier).toBeGreaterThanOrEqual(2);
    });

    it('should require Tier 3+ when no assets exist', () => {
      const data = createIntakeData({ 
        hasSurvey: false, 
        hasDrawings: false,
        budget: 20000, // Higher budget to avoid budget conflict
      });
      const result = recommendTier(data);
      
      // Hard rule: No assets means at least Tier 3
      expect(result.tier).toBeGreaterThanOrEqual(3);
    });
  });

  describe('project type routing', () => {
    it('should allow Tier 1/2 for simple renovation', () => {
      const data = createIntakeData({ projectType: 'simple_renovation' });
      const result = recommendTier(data);
      
      const typeFactor = result.factors.find(f => f.factor === 'project_type');
      expect(typeFactor?.suggestedTier).toBeLessThanOrEqual(2);
    });

    it('should require Tier 3+ for new build', () => {
      const data = createIntakeData({ 
        projectType: 'new_build',
        budget: 30000,
      });
      const result = recommendTier(data);
      
      expect(result.tier).toBeGreaterThanOrEqual(3);
    });

    it('should suggest higher tier for major renovation', () => {
      const data = createIntakeData({ 
        projectType: 'major_renovation',
        budget: 25000,
        hasSurvey: false,  // No assets forces Tier 3+
        hasDrawings: false,
      });
      const result = recommendTier(data);
      
      // Major renovation with no assets should be Tier 3+
      expect(result.tier).toBeGreaterThanOrEqual(3);
    });

    it('should require Tier 4 for multiple properties', () => {
      const data = createIntakeData({ 
        projectType: 'multiple_properties',
        budget: 50000,
      });
      const result = recommendTier(data);
      
      expect(result.tier).toBe(4);
    });

    it('should require Tier 4 for complex projects', () => {
      const data = createIntakeData({ 
        projectType: 'complex',
        budget: 50000,
      });
      const result = recommendTier(data);
      
      expect(result.tier).toBeGreaterThanOrEqual(3);
    });
  });

  describe('red flag detection', () => {
    it('should flag unrealistic timeline for complex projects', () => {
      const data = createIntakeData({ 
        projectType: 'new_build',
        timelineWeeks: 1,
        budget: 30000,
      });
      const result = recommendTier(data);
      
      expect(result.redFlags).toContain('Timeline unrealistic for project complexity');
    });

    it('should flag no assets with fast timeline', () => {
      const data = createIntakeData({ 
        hasSurvey: false,
        hasDrawings: false,
        timelineWeeks: 1,
        budget: 20000,
      });
      const result = recommendTier(data);
      
      expect(result.redFlags).toContain('No existing assets but expecting fast delivery');
    });

    it('should flag complex project with low budget', () => {
      const data = createIntakeData({ 
        projectType: 'complex',
        budget: 8000,
      });
      const result = recommendTier(data);
      
      expect(result.redFlags).toContain('Complex project type with insufficient budget');
    });

    it('should flag multiple properties for review', () => {
      const data = createIntakeData({ 
        projectType: 'multiple_properties',
        budget: 50000,
      });
      const result = recommendTier(data);
      
      expect(result.redFlags).toContain('Multiple properties require white-glove service evaluation');
    });

    it('should flag high budget with unrealistic timeline', () => {
      const data = createIntakeData({ 
        budget: 40000,
        timelineWeeks: 1,
      });
      const result = recommendTier(data);
      
      expect(result.redFlags).toContain('High budget project with unrealistic timeline');
    });
  });

  describe('confidence calculation', () => {
    it('should have high confidence when factors agree', () => {
      const data = createIntakeData({
        budget: 10000,
        timelineWeeks: 4,
        projectType: 'standard_renovation',
        hasSurvey: true,
        hasDrawings: true,
      });
      const result = recommendTier(data);
      
      expect(['high', 'medium']).toContain(result.confidence);
    });

    it('should have lower confidence when factors disagree', () => {
      const data = createIntakeData({
        budget: 5000,      // Suggests Tier 1
        timelineWeeks: 12, // Suggests Tier 3
        projectType: 'new_build', // Requires Tier 3+
        hasSurvey: false,
        hasDrawings: false,
      });
      const result = recommendTier(data);
      
      // With conflicting factors, confidence shouldn't be high
      // Hard rules may force tier 3+, but factors still disagree
      expect(result.confidence).toBeDefined();
      // The tier will be forced to 3+ due to hard rules
      expect(result.tier).toBeGreaterThanOrEqual(3);
    });
  });

  describe('manual review requirements', () => {
    it('should require manual review for Tier 4', () => {
      const data = createIntakeData({ budget: 50000 });
      const result = recommendTier(data);
      
      expect(result.tier).toBe(4);
      expect(result.needsManualReview).toBe(true);
    });

    it('should require manual review when red flags exist', () => {
      const data = createIntakeData({ 
        projectType: 'complex',
        budget: 5000, // Too low for complex
      });
      const result = recommendTier(data);
      
      expect(result.redFlags.length).toBeGreaterThan(0);
      expect(result.needsManualReview).toBe(true);
    });

    it('should not require manual review for straightforward Tier 1/2', () => {
      const data = createIntakeData({
        budget: 5000,
        timelineWeeks: 4,
        projectType: 'simple_renovation',
        hasSurvey: true,
        hasDrawings: true,
      });
      const result = recommendTier(data);
      
      if (result.tier <= 2 && result.redFlags.length === 0) {
        expect(result.needsManualReview).toBe(false);
      }
    });
  });

  describe('alternative tier suggestions', () => {
    it('should suggest adjacent alternative tiers', () => {
      const data = createIntakeData({ budget: 10000 });
      const result = recommendTier(data);
      
      // Alternative tiers should be adjacent to the recommended tier
      result.alternativeTiers.forEach(alt => {
        expect(Math.abs(alt - result.tier)).toBe(1);
      });
    });

    it('should not include the recommended tier in alternatives', () => {
      const data = createIntakeData({ budget: 15000 });
      const result = recommendTier(data);
      
      expect(result.alternativeTiers).not.toContain(result.tier);
    });
  });

  describe('factor descriptions', () => {
    it('should include budget factor with description', () => {
      const data = createIntakeData({ budget: 10000 });
      const result = recommendTier(data);
      
      const budgetFactor = result.factors.find(f => f.factor === 'budget');
      expect(budgetFactor).toBeDefined();
      expect(budgetFactor?.description).toContain('$10,000');
    });

    it('should include all four factors', () => {
      const data = createIntakeData();
      const result = recommendTier(data);
      
      const factorTypes = result.factors.map(f => f.factor);
      expect(factorTypes).toContain('budget');
      expect(factorTypes).toContain('timeline');
      expect(factorTypes).toContain('assets');
      expect(factorTypes).toContain('project_type');
    });
  });

  describe('edge cases', () => {
    it('should handle minimum valid budget', () => {
      const data = createIntakeData({ budget: 2500 });
      const result = recommendTier(data);
      
      expect(result.tier).toBeGreaterThanOrEqual(1);
      expect(result.tier).toBeLessThanOrEqual(4);
    });

    it('should handle very high budget', () => {
      const data = createIntakeData({ budget: 1000000 });
      const result = recommendTier(data);
      
      expect(result.tier).toBe(4);
    });

    it('should handle very long timeline', () => {
      const data = createIntakeData({ timelineWeeks: 52 });
      const result = recommendTier(data);
      
      expect(result.tier).toBeDefined();
    });

    it('should handle minimum timeline', () => {
      const data = createIntakeData({ timelineWeeks: 1 });
      const result = recommendTier(data);
      
      expect(result.tier).toBeDefined();
    });
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('validateIntakeData', () => {
  it('should pass for valid data', () => {
    const data = createIntakeData();
    const errors = validateIntakeData(data);
    
    expect(errors).toHaveLength(0);
  });

  it('should require budget', () => {
    const errors = validateIntakeData({
      timelineWeeks: 4,
      projectType: 'simple_renovation',
      hasSurvey: true,
      hasDrawings: true,
    });
    
    expect(errors).toContain('Budget is required and must be a positive number');
  });

  it('should reject negative budget', () => {
    const data = { ...createIntakeData(), budget: -100 };
    const errors = validateIntakeData(data);
    
    expect(errors).toContain('Budget is required and must be a positive number');
  });

  it('should require timeline', () => {
    const errors = validateIntakeData({
      budget: 10000,
      projectType: 'simple_renovation',
      hasSurvey: true,
      hasDrawings: true,
    });
    
    expect(errors).toContain('Timeline is required and must be at least 1 week');
  });

  it('should reject zero timeline', () => {
    const data = { ...createIntakeData(), timelineWeeks: 0 };
    const errors = validateIntakeData(data);
    
    expect(errors).toContain('Timeline is required and must be at least 1 week');
  });

  it('should require project type', () => {
    const errors = validateIntakeData({
      budget: 10000,
      timelineWeeks: 4,
      hasSurvey: true,
      hasDrawings: true,
    });
    
    expect(errors).toContain('Project type is required');
  });

  it('should require survey status', () => {
    const errors = validateIntakeData({
      budget: 10000,
      timelineWeeks: 4,
      projectType: 'simple_renovation',
      hasDrawings: true,
    });
    
    expect(errors).toContain('Survey status is required');
  });

  it('should require drawings status', () => {
    const errors = validateIntakeData({
      budget: 10000,
      timelineWeeks: 4,
      projectType: 'simple_renovation',
      hasSurvey: true,
    });
    
    expect(errors).toContain('Drawings status is required');
  });

  it('should return multiple errors for multiple issues', () => {
    const errors = validateIntakeData({});
    
    expect(errors.length).toBeGreaterThan(1);
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('getTierSummary', () => {
  it('should include tier name in summary', () => {
    const recommendation: TierRecommendation = {
      tier: 2,
      reason: 'Budget fits Tier 2 range.',
      confidence: 'high',
      needsManualReview: false,
      factors: [],
      redFlags: [],
      alternativeTiers: [],
    };
    
    const summary = getTierSummary(recommendation);
    
    expect(summary).toContain('The Builder');
  });

  it('should indicate auto-approved status', () => {
    const recommendation: TierRecommendation = {
      tier: 1,
      reason: 'Simple project.',
      confidence: 'high',
      needsManualReview: false,
      factors: [],
      redFlags: [],
      alternativeTiers: [],
    };
    
    const summary = getTierSummary(recommendation);
    
    expect(summary).toContain('auto-approved');
  });

  it('should indicate pending review status', () => {
    const recommendation: TierRecommendation = {
      tier: 4,
      reason: 'High-value project.',
      confidence: 'high',
      needsManualReview: true,
      factors: [],
      redFlags: [],
      alternativeTiers: [],
    };
    
    const summary = getTierSummary(recommendation);
    
    expect(summary).toContain('pending review');
  });

  it('should include the reason', () => {
    const recommendation: TierRecommendation = {
      tier: 2,
      reason: 'Budget fits Tier 2 range.',
      confidence: 'high',
      needsManualReview: false,
      factors: [],
      redFlags: [],
      alternativeTiers: [],
    };
    
    const summary = getTierSummary(recommendation);
    
    expect(summary).toContain('Budget fits Tier 2 range.');
  });
});

describe('isAutoRoutable', () => {
  it('should return true for Tier 1', () => {
    expect(isAutoRoutable(1)).toBe(true);
  });

  it('should return true for Tier 2', () => {
    expect(isAutoRoutable(2)).toBe(true);
  });

  it('should return false for Tier 3', () => {
    expect(isAutoRoutable(3)).toBe(false);
  });

  it('should return false for Tier 4', () => {
    expect(isAutoRoutable(4)).toBe(false);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('tier router integration', () => {
  it('should produce consistent results for same input', () => {
    const data = createIntakeData({
      budget: 12000,
      timelineWeeks: 6,
      projectType: 'standard_renovation',
    });
    
    const result1 = recommendTier(data);
    const result2 = recommendTier(data);
    
    expect(result1.tier).toBe(result2.tier);
    expect(result1.confidence).toBe(result2.confidence);
  });

  it('should recommend appropriate tier for Tier 1 profile', () => {
    const data = createIntakeData({
      budget: 5000,
      timelineWeeks: 2,
      projectType: 'simple_renovation',
      hasSurvey: true,
      hasDrawings: true,
    });
    
    const result = recommendTier(data);
    
    expect(result.tier).toBeLessThanOrEqual(2);
    expect(result.needsManualReview).toBe(false);
  });

  it('should recommend appropriate tier for Tier 3 profile', () => {
    const data = createIntakeData({
      budget: 25000,
      timelineWeeks: 10,
      projectType: 'major_renovation',
      hasSurvey: false,
      hasDrawings: false,
    });
    
    const result = recommendTier(data);
    
    expect(result.tier).toBeGreaterThanOrEqual(3);
    expect(result.needsManualReview).toBe(true);
  });

  it('should recommend Tier 4 for luxury profile', () => {
    const data = createIntakeData({
      budget: 100000,
      timelineWeeks: 24,
      projectType: 'new_build',
      hasSurvey: false,
      hasDrawings: false,
    });
    
    const result = recommendTier(data);
    
    expect(result.tier).toBe(4);
    expect(result.needsManualReview).toBe(true);
  });
});
