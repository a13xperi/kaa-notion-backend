/**
 * Admin Stats Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AdminStats,
  QuickInsights,
  RecentActivity,
  generateDefaultStats,
  StatCardData,
  InsightData,
  ActivityItem,
} from '../AdminStats';

const mockStats: StatCardData[] = [
  {
    id: 'leads',
    label: 'New Leads',
    value: 42,
    change: 15,
    changeLabel: 'vs last week',
    icon: '📋',
    color: 'blue',
    trend: 'up',
  },
  {
    id: 'revenue',
    label: 'Revenue',
    value: '$12,500',
    change: -5,
    changeLabel: 'vs last week',
    icon: '💰',
    color: 'green',
    trend: 'down',
  },
];

const mockInsights: InsightData[] = [
  {
    id: '1',
    type: 'success',
    title: 'Great month!',
    description: 'Revenue is up 20% from last month.',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Action needed',
    description: '3 leads awaiting follow-up.',
    action: {
      label: 'View Leads',
      onClick: jest.fn(),
    },
  },
];

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'lead',
    title: 'New lead submitted',
    description: 'John Doe submitted intake form',
    timestamp: '2 min ago',
  },
  {
    id: '2',
    type: 'payment',
    title: 'Payment received',
    description: 'Tier 2 purchase - $1,499',
    timestamp: '1 hour ago',
  },
];

describe('AdminStats', () => {
  it('renders stat cards correctly', () => {
    render(<AdminStats stats={mockStats} />);

    expect(screen.getByText('New Leads')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$12,500')).toBeInTheDocument();
  });

  it('shows positive trend indicator', () => {
    render(<AdminStats stats={mockStats} />);

    // Check for the trend value (15%)
    expect(screen.getByText(/15%/)).toBeInTheDocument();
  });

  it('shows negative trend indicator', () => {
    render(<AdminStats stats={mockStats} />);

    // Check for the trend value (5%)
    expect(screen.getAllByText(/5%/).length).toBeGreaterThan(0);
  });

  it('displays period when provided', () => {
    render(<AdminStats stats={mockStats} period="Last 30 days" />);

    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('shows loading skeletons when loading', () => {
    const { container } = render(<AdminStats stats={[]} loading={true} />);

    expect(container.querySelectorAll('.stat-card--skeleton').length).toBeGreaterThan(0);
  });
});

describe('QuickInsights', () => {
  it('renders insights correctly', () => {
    render(<QuickInsights insights={mockInsights} />);

    expect(screen.getByText('Great month!')).toBeInTheDocument();
    expect(screen.getByText('Action needed')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    render(<QuickInsights insights={mockInsights} />);

    expect(screen.getByText('View Leads')).toBeInTheDocument();
  });

  it('calls action onClick when clicked', () => {
    const handleAction = jest.fn();
    const insightsWithAction: InsightData[] = [
      {
        id: '1',
        type: 'info',
        title: 'Test',
        description: 'Description',
        action: {
          label: 'Click Me',
          onClick: handleAction,
        },
      },
    ];

    render(<QuickInsights insights={insightsWithAction} />);

    fireEvent.click(screen.getByText('Click Me'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when dismiss is clicked', () => {
    const handleDismiss = jest.fn();
    render(<QuickInsights insights={mockInsights} onDismiss={handleDismiss} />);

    const dismissButtons = screen.getAllByLabelText('Dismiss');
    fireEvent.click(dismissButtons[0]);

    expect(handleDismiss).toHaveBeenCalledWith('1');
  });

  it('returns null when no insights', () => {
    const { container } = render(<QuickInsights insights={[]} />);

    expect(container.firstChild).toBeNull();
  });
});

describe('RecentActivity', () => {
  it('renders activity items correctly', () => {
    render(<RecentActivity activities={mockActivities} />);

    expect(screen.getByText('New lead submitted')).toBeInTheDocument();
    expect(screen.getByText('Payment received')).toBeInTheDocument();
    expect(screen.getByText('2 min ago')).toBeInTheDocument();
  });

  it('shows view all button when callback provided', () => {
    const handleViewAll = jest.fn();
    render(<RecentActivity activities={mockActivities} onViewAll={handleViewAll} />);

    const viewAllButton = screen.getByText('View All');
    fireEvent.click(viewAllButton);

    expect(handleViewAll).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no activities', () => {
    render(<RecentActivity activities={[]} />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const { container } = render(<RecentActivity activities={[]} loading={true} />);

    expect(container.querySelectorAll('.activity-item--skeleton').length).toBeGreaterThan(0);
  });
});

describe('generateDefaultStats', () => {
  it('returns 4 stat cards', () => {
    const stats = generateDefaultStats();

    expect(stats).toHaveLength(4);
  });

  it('includes expected stat types', () => {
    const stats = generateDefaultStats();
    const ids = stats.map((s) => s.id);

    expect(ids).toContain('leads');
    expect(ids).toContain('revenue');
    expect(ids).toContain('projects');
    expect(ids).toContain('clients');
  });

  it('all stats have required properties', () => {
    const stats = generateDefaultStats();

    stats.forEach((stat) => {
      expect(stat.id).toBeDefined();
      expect(stat.label).toBeDefined();
      expect(stat.value).toBeDefined();
      expect(stat.icon).toBeDefined();
      expect(stat.color).toBeDefined();
    });
  });
});
