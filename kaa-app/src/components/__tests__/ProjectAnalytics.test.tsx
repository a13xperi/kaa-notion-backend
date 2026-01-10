/**
 * Project Analytics Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ProjectAnalytics,
  ProgressBar,
  generateDemoAnalytics,
  ProjectMetrics,
  MilestoneProgress,
  TierDistribution,
} from '../ProjectAnalytics';

const mockMetrics: ProjectMetrics = {
  totalProjects: 24,
  activeProjects: 12,
  completedProjects: 10,
  onTrack: 8,
  atRisk: 3,
  delayed: 1,
  averageCompletionDays: 45,
  revenueThisMonth: 18500,
  previousMonthRevenue: 15000,
};

const mockMilestones: MilestoneProgress[] = [
  { name: 'Concept Design', completed: 8, total: 10, tier: 1 },
  { name: 'Draft Review', completed: 5, total: 8, tier: 2 },
];

const mockTierDistribution: TierDistribution[] = [
  { tier: 1, name: 'The Concept', count: 8, revenue: 2392, percentage: 40 },
  { tier: 2, name: 'The Builder', count: 10, revenue: 14990, percentage: 50 },
];

describe('ProgressBar', () => {
  it('renders with correct percentage', () => {
    render(<ProgressBar value={50} max={100} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('handles zero max value', () => {
    render(<ProgressBar value={50} max={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<ProgressBar value={50} max={100} showLabel={false} />);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('applies correct color class', () => {
    const { container } = render(<ProgressBar value={50} max={100} color="green" />);
    expect(container.querySelector('.progress-bar__fill--green')).toBeInTheDocument();
  });
});

describe('ProjectAnalytics', () => {
  it('renders metrics correctly', () => {
    render(<ProjectAnalytics metrics={mockMetrics} />);

    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('Total Projects')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders status indicators', () => {
    render(<ProjectAnalytics metrics={mockMetrics} />);

    expect(screen.getByText('On Track')).toBeInTheDocument();
    expect(screen.getByText('At Risk')).toBeInTheDocument();
    expect(screen.getByText('Delayed')).toBeInTheDocument();
  });

  it('shows revenue with change indicator', () => {
    render(<ProjectAnalytics metrics={mockMetrics} />);

    expect(screen.getByText('$18,500')).toBeInTheDocument();
    expect(screen.getByText('This Month')).toBeInTheDocument();
    // 23% increase from 15000 to 18500
    expect(screen.getByText(/23%/)).toBeInTheDocument();
  });

  it('renders milestones correctly', () => {
    render(<ProjectAnalytics milestones={mockMilestones} />);

    expect(screen.getByText('Milestone Progress')).toBeInTheDocument();
    expect(screen.getByText('Concept Design')).toBeInTheDocument();
    expect(screen.getByText('Draft Review')).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(screen.getByText('5/8')).toBeInTheDocument();
  });

  it('renders tier distribution correctly', () => {
    render(<ProjectAnalytics tierDistribution={mockTierDistribution} />);

    expect(screen.getByText('Tier Distribution')).toBeInTheDocument();
    expect(screen.getByText('The Concept')).toBeInTheDocument();
    expect(screen.getByText('The Builder')).toBeInTheDocument();
    expect(screen.getByText('8 projects')).toBeInTheDocument();
    expect(screen.getByText('10 projects')).toBeInTheDocument();
  });

  it('calculates total revenue', () => {
    render(<ProjectAnalytics tierDistribution={mockTierDistribution} />);

    // Total: 2392 + 14990 = 17382
    expect(screen.getByText('Total Revenue: $17,382')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    const { container } = render(<ProjectAnalytics loading={true} />);

    expect(container.querySelector('.project-analytics--loading')).toBeInTheDocument();
  });

  it('shows empty state when no data provided', () => {
    render(<ProjectAnalytics />);

    expect(screen.getByText('No analytics data available')).toBeInTheDocument();
  });

  it('renders all sections when data provided', () => {
    render(
      <ProjectAnalytics
        metrics={mockMetrics}
        milestones={mockMilestones}
        tierDistribution={mockTierDistribution}
      />
    );

    expect(screen.getByText('Project Metrics')).toBeInTheDocument();
    expect(screen.getByText('Milestone Progress')).toBeInTheDocument();
    expect(screen.getByText('Tier Distribution')).toBeInTheDocument();
  });
});

describe('generateDemoAnalytics', () => {
  it('returns metrics, milestones, and tier distribution', () => {
    const data = generateDemoAnalytics();

    expect(data.metrics).toBeDefined();
    expect(data.milestones).toBeDefined();
    expect(data.tierDistribution).toBeDefined();
  });

  it('returns valid metrics structure', () => {
    const { metrics } = generateDemoAnalytics();

    expect(metrics.totalProjects).toBeGreaterThanOrEqual(0);
    expect(metrics.activeProjects).toBeGreaterThanOrEqual(0);
    expect(metrics.completedProjects).toBeGreaterThanOrEqual(0);
    expect(metrics.onTrack).toBeGreaterThanOrEqual(0);
    expect(metrics.atRisk).toBeGreaterThanOrEqual(0);
    expect(metrics.delayed).toBeGreaterThanOrEqual(0);
  });

  it('returns milestones with valid structure', () => {
    const { milestones } = generateDemoAnalytics();

    expect(milestones.length).toBeGreaterThan(0);
    milestones.forEach((m) => {
      expect(m.name).toBeDefined();
      expect(m.completed).toBeGreaterThanOrEqual(0);
      expect(m.total).toBeGreaterThanOrEqual(m.completed);
      expect(m.tier).toBeGreaterThanOrEqual(1);
    });
  });

  it('returns tier distribution with percentages summing to 100', () => {
    const { tierDistribution } = generateDemoAnalytics();

    const totalPercentage = tierDistribution.reduce((sum, t) => sum + t.percentage, 0);
    expect(totalPercentage).toBe(100);
  });
});
