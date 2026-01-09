/**
 * Leads API Client Tests
 */

import {
  getBudgetRangeLabel,
  getTimelineLabel,
  getProjectTypeLabel,
  getLeadStatusLabel,
  getLeadStatusColor,
} from '../leadsApi';

describe('Leads API Client', () => {
  describe('getBudgetRangeLabel', () => {
    it('should return correct labels for all budget ranges', () => {
      expect(getBudgetRangeLabel('under_5000')).toBe('Under $5,000');
      expect(getBudgetRangeLabel('5000_15000')).toBe('$5,000 - $15,000');
      expect(getBudgetRangeLabel('15000_50000')).toBe('$15,000 - $50,000');
      expect(getBudgetRangeLabel('50000_100000')).toBe('$50,000 - $100,000');
      expect(getBudgetRangeLabel('over_100000')).toBe('Over $100,000');
    });

    it('should return raw value for unknown range', () => {
      expect(getBudgetRangeLabel('unknown' as any)).toBe('unknown');
    });
  });

  describe('getTimelineLabel', () => {
    it('should return correct labels for all timelines', () => {
      expect(getTimelineLabel('under_3_months')).toBe('Under 3 months');
      expect(getTimelineLabel('3_6_months')).toBe('3-6 months');
      expect(getTimelineLabel('6_12_months')).toBe('6-12 months');
      expect(getTimelineLabel('over_12_months')).toBe('Over 12 months');
      expect(getTimelineLabel('flexible')).toBe('Flexible');
    });

    it('should return raw value for unknown timeline', () => {
      expect(getTimelineLabel('unknown' as any)).toBe('unknown');
    });
  });

  describe('getProjectTypeLabel', () => {
    it('should return correct labels for all project types', () => {
      expect(getProjectTypeLabel('consultation_only')).toBe('Consultation Only');
      expect(getProjectTypeLabel('planting_plan')).toBe('Planting Plan');
      expect(getProjectTypeLabel('full_landscape')).toBe('Full Landscape Design');
      expect(getProjectTypeLabel('hardscape_focus')).toBe('Hardscape Focus');
      expect(getProjectTypeLabel('outdoor_living')).toBe('Outdoor Living Space');
      expect(getProjectTypeLabel('complete_transformation')).toBe('Complete Transformation');
      expect(getProjectTypeLabel('major_renovation')).toBe('Major Renovation');
    });

    it('should return raw value for unknown type', () => {
      expect(getProjectTypeLabel('unknown' as any)).toBe('unknown');
    });
  });

  describe('getLeadStatusLabel', () => {
    it('should return correct labels for all statuses', () => {
      expect(getLeadStatusLabel('NEW')).toBe('New');
      expect(getLeadStatusLabel('QUALIFIED')).toBe('Qualified');
      expect(getLeadStatusLabel('NEEDS_REVIEW')).toBe('Needs Review');
      expect(getLeadStatusLabel('CLOSED')).toBe('Closed');
    });

    it('should return raw value for unknown status', () => {
      expect(getLeadStatusLabel('unknown' as any)).toBe('unknown');
    });
  });

  describe('getLeadStatusColor', () => {
    it('should return correct colors for all statuses', () => {
      expect(getLeadStatusColor('NEW')).toBe('#3b82f6');
      expect(getLeadStatusColor('QUALIFIED')).toBe('#22c55e');
      expect(getLeadStatusColor('NEEDS_REVIEW')).toBe('#f59e0b');
      expect(getLeadStatusColor('CLOSED')).toBe('#6b7280');
    });

    it('should return gray for unknown status', () => {
      expect(getLeadStatusColor('unknown' as any)).toBe('#6b7280');
    });
  });
});

describe('Lead Data Validation', () => {
  describe('Budget Ranges', () => {
    it('should have 5 budget range options', () => {
      const ranges = [
        'under_5000',
        '5000_15000',
        '15000_50000',
        '50000_100000',
        'over_100000',
      ];
      expect(ranges).toHaveLength(5);
    });

    it('should have labels for all ranges', () => {
      const ranges = [
        'under_5000',
        '5000_15000',
        '15000_50000',
        '50000_100000',
        'over_100000',
      ] as const;

      ranges.forEach(range => {
        const label = getBudgetRangeLabel(range);
        expect(label.length).toBeGreaterThan(0);
        expect(label).not.toBe(range);
      });
    });
  });

  describe('Timelines', () => {
    it('should have 5 timeline options', () => {
      const timelines = [
        'under_3_months',
        '3_6_months',
        '6_12_months',
        'over_12_months',
        'flexible',
      ];
      expect(timelines).toHaveLength(5);
    });

    it('should have labels for all timelines', () => {
      const timelines = [
        'under_3_months',
        '3_6_months',
        '6_12_months',
        'over_12_months',
        'flexible',
      ] as const;

      timelines.forEach(timeline => {
        const label = getTimelineLabel(timeline);
        expect(label.length).toBeGreaterThan(0);
        expect(label).not.toBe(timeline);
      });
    });
  });

  describe('Project Types', () => {
    it('should have 7 project type options', () => {
      const types = [
        'consultation_only',
        'planting_plan',
        'full_landscape',
        'hardscape_focus',
        'outdoor_living',
        'complete_transformation',
        'major_renovation',
      ];
      expect(types).toHaveLength(7);
    });

    it('should have labels for all project types', () => {
      const types = [
        'consultation_only',
        'planting_plan',
        'full_landscape',
        'hardscape_focus',
        'outdoor_living',
        'complete_transformation',
        'major_renovation',
      ] as const;

      types.forEach(type => {
        const label = getProjectTypeLabel(type);
        expect(label.length).toBeGreaterThan(0);
        expect(label).not.toBe(type);
      });
    });
  });

  describe('Lead Statuses', () => {
    it('should have 4 status options', () => {
      const statuses = ['NEW', 'QUALIFIED', 'NEEDS_REVIEW', 'CLOSED'];
      expect(statuses).toHaveLength(4);
    });

    it('should have labels and colors for all statuses', () => {
      const statuses = ['NEW', 'QUALIFIED', 'NEEDS_REVIEW', 'CLOSED'] as const;

      statuses.forEach(status => {
        const label = getLeadStatusLabel(status);
        const color = getLeadStatusColor(status);
        
        expect(label.length).toBeGreaterThan(0);
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });
});
