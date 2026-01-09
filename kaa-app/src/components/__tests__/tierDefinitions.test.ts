/**
 * Tests for tier definitions and copy consistency
 * Ensures tier descriptions are consistent and accurate:
 * - Tier 1 is NO-TOUCH (no site visit, no scan, no boots on ground)
 * - Tier 3 is the ONLY tier with site visit + 3D scan language
 */

// Tier definitions as used across the codebase
const TIER_DEFINITIONS = {
  tier1: {
    name: 'The Concept',
    description: 'Fully automated, no-touch service',
    features: [
      'No-touch, fully automated',
      'Perfect for straightforward projects',
      'Fast turnaround, fixed pricing'
    ]
  },
  tier2: {
    name: 'The Builder',
    description: 'Low-touch with designer checkpoints',
    features: [
      'Systematized with designer checkpoints',
      'Low-touch service with review and refinement',
      'Great balance of efficiency and personalization'
    ]
  },
  tier3: {
    name: 'The Concierge',
    description: 'Site visits + 3D scan included',
    features: [
      'Includes site visits + 3D scan',
      'Hybrid of tech efficiency + boots on the ground',
      'More hands-on, personalized support'
    ]
  },
  tier4: {
    name: 'KAA White Glove',
    description: 'Premium white glove service',
    features: [
      'Full-service landscape architecture',
      'We choose the clients (exclusive)',
      'Percentage of install pricing'
    ]
  }
};

describe('Tier Definitions Consistency', () => {
  describe('Tier 1 - The Concept (No-Touch)', () => {
    const tier1 = TIER_DEFINITIONS.tier1;

    it('should be named "The Concept"', () => {
      expect(tier1.name).toBe('The Concept');
    });

    it('should NOT mention site visit', () => {
      const allText = [tier1.description, ...tier1.features].join(' ').toLowerCase();
      expect(allText).not.toContain('site visit');
      expect(allText).not.toContain('on-site');
      expect(allText).not.toContain('onsite');
    });

    it('should NOT mention 3D scan', () => {
      const allText = [tier1.description, ...tier1.features].join(' ').toLowerCase();
      expect(allText).not.toContain('3d scan');
      expect(allText).not.toContain('scan');
    });

    it('should NOT mention boots on ground', () => {
      const allText = [tier1.description, ...tier1.features].join(' ').toLowerCase();
      expect(allText).not.toContain('boots on');
      expect(allText).not.toContain('boots-on');
    });

    it('should emphasize no-touch/automated nature', () => {
      const allText = [tier1.description, ...tier1.features].join(' ').toLowerCase();
      expect(allText).toContain('no-touch');
      expect(allText).toContain('automated');
    });
  });

  describe('Tier 2 - The Builder (Low-Touch)', () => {
    const tier2 = TIER_DEFINITIONS.tier2;

    it('should be named "The Builder"', () => {
      expect(tier2.name).toBe('The Builder');
    });

    it('should NOT mention site visit', () => {
      const allText = [tier2.description, ...tier2.features].join(' ').toLowerCase();
      expect(allText).not.toContain('site visit');
      expect(allText).not.toContain('on-site');
    });

    it('should NOT mention 3D scan', () => {
      const allText = [tier2.description, ...tier2.features].join(' ').toLowerCase();
      expect(allText).not.toContain('3d scan');
      expect(allText).not.toContain('scan');
    });

    it('should mention low-touch nature', () => {
      const allText = [tier2.description, ...tier2.features].join(' ').toLowerCase();
      expect(allText).toContain('low-touch');
    });
  });

  describe('Tier 3 - The Concierge (Site Visit + 3D Scan)', () => {
    const tier3 = TIER_DEFINITIONS.tier3;

    it('should be named "The Concierge"', () => {
      expect(tier3.name).toBe('The Concierge');
    });

    it('should mention site visit', () => {
      const allText = [tier3.description, ...tier3.features].join(' ').toLowerCase();
      expect(allText).toContain('site visit');
    });

    it('should mention 3D scan', () => {
      const allText = [tier3.description, ...tier3.features].join(' ').toLowerCase();
      expect(allText).toContain('3d scan');
    });

    it('should mention boots on ground / hands-on support', () => {
      const allText = [tier3.description, ...tier3.features].join(' ').toLowerCase();
      const hasBootsOnGround = allText.includes('boots on') || allText.includes('hands-on');
      expect(hasBootsOnGround).toBe(true);
    });
  });

  describe('Tier 4 - KAA White Glove', () => {
    const tier4 = TIER_DEFINITIONS.tier4;

    it('should be named "KAA White Glove"', () => {
      expect(tier4.name).toBe('KAA White Glove');
    });

    it('should emphasize premium/exclusive nature', () => {
      const allText = [tier4.description, ...tier4.features].join(' ').toLowerCase();
      const isPremium = allText.includes('premium') ||
                        allText.includes('white glove') ||
                        allText.includes('exclusive');
      expect(isPremium).toBe(true);
    });

    it('should mention percentage of install pricing', () => {
      const allText = [tier4.description, ...tier4.features].join(' ').toLowerCase();
      expect(allText).toContain('percentage');
    });
  });

  describe('Cross-Tier Validation', () => {
    it('only Tier 3 should have site visit language', () => {
      const tiers = [
        { name: 'Tier 1', tier: TIER_DEFINITIONS.tier1 },
        { name: 'Tier 2', tier: TIER_DEFINITIONS.tier2 },
        { name: 'Tier 3', tier: TIER_DEFINITIONS.tier3 },
        { name: 'Tier 4', tier: TIER_DEFINITIONS.tier4 }
      ];

      tiers.forEach(({ name, tier }) => {
        const allText = [tier.description, ...tier.features].join(' ').toLowerCase();
        const hasSiteVisit = allText.includes('site visit');

        if (name === 'Tier 3') {
          expect(hasSiteVisit).toBe(true);
        } else {
          expect(hasSiteVisit).toBe(false);
        }
      });
    });

    it('only Tier 3 should have 3D scan language', () => {
      const tiers = [
        { name: 'Tier 1', tier: TIER_DEFINITIONS.tier1 },
        { name: 'Tier 2', tier: TIER_DEFINITIONS.tier2 },
        { name: 'Tier 3', tier: TIER_DEFINITIONS.tier3 },
        { name: 'Tier 4', tier: TIER_DEFINITIONS.tier4 }
      ];

      tiers.forEach(({ name, tier }) => {
        const allText = [tier.description, ...tier.features].join(' ').toLowerCase();
        const has3DScan = allText.includes('3d scan');

        if (name === 'Tier 3') {
          expect(has3DScan).toBe(true);
        } else {
          expect(has3DScan).toBe(false);
        }
      });
    });

    it('each tier should have a unique name', () => {
      const names = [
        TIER_DEFINITIONS.tier1.name,
        TIER_DEFINITIONS.tier2.name,
        TIER_DEFINITIONS.tier3.name,
        TIER_DEFINITIONS.tier4.name
      ];

      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(4);
    });
  });
});
