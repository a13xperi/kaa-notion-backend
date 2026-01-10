/**
 * AdminDashboard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminDashboard } from '../admin/AdminDashboard';
import { DashboardStats } from '../../types/admin.types';

// Mock data
const mockStats: DashboardStats = {
  leads: {
    total: 45,
    thisMonth: 12,
    conversionRate: 25,
    byStatus: {
      NEW: 15,
      REVIEWING: 10,
      QUALIFIED: 8,
      CONVERTED: 7,
      REJECTED: 5,
    },
  },
  projects: {
    total: 28,
    active: 12,
    byTier: {
      1: 10,
      2: 8,
      3: 6,
      4: 4,
    },
    byStatus: {
      IN_PROGRESS: 12,
      AWAITING_FEEDBACK: 5,
      DELIVERED: 11,
    },
  },
  clients: {
    total: 35,
    active: 20,
  },
  revenue: {
    total: 85000000, // $850,000 in cents
    thisMonth: 12500000, // $125,000 in cents
    byTier: {
      1: 5000000,
      2: 20000000,
      3: 40000000,
      4: 20000000,
    },
  },
  recentActivity: [
    {
      id: 'activity-1',
      type: 'lead_created',
      description: 'New lead from john@example.com',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'activity-2',
      type: 'payment_received',
      description: 'Payment of $1,499 received',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
};

describe('AdminDashboard', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render loading state', () => {
      render(
        <AdminDashboard
          stats={null}
          isLoading={true}
          onNavigate={mockOnNavigate}
        />
      );

      const loadingContainer = document.querySelector('.admin-dashboard--loading');
      expect(loadingContainer).toBeInTheDocument();
    });

    it('should render error state when stats are null', () => {
      render(
        <AdminDashboard
          stats={null}
          isLoading={false}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    it('should render dashboard header', () => {
      render(
        <AdminDashboard
          stats={mockStats}
          isLoading={false}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
    });

    it('should render all stats cards', () => {
      render(
        <AdminDashboard
          stats={mockStats}
          isLoading={false}
          onNavigate={mockOnNavigate}
        />
      );

      // Leads card
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('Total Leads')).toBeInTheDocument();

      // Projects card
      expect(screen.getByText('28')).toBeInTheDocument();
      expect(screen.getByText('Total Projects')).toBeInTheDocument();

      // Clients card
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('Total Clients')).toBeInTheDocument();

      // Revenue card - formatCurrency uses minimumFractionDigits: 0
      expect(screen.getByText('$850,000')).toBeInTheDocument();
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    });

    it('should display tier breakdown', () => {
      render(
        <AdminDashboard
          stats={mockStats}
          isLoading={false}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('The Concept')).toBeInTheDocument();
      expect(screen.getByText('The Builder')).toBeInTheDocument();
      expect(screen.getByText('The Concierge')).toBeInTheDocument();
      expect(screen.getByText('KAA White Glove')).toBeInTheDocument();
    });

    it('should display recent activity', () => {
      render(
        <AdminDashboard
          stats={mockStats}
          isLoading={false}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
      expect(screen.getByText(/new lead from john@example.com/i)).toBeInTheDocument();
    });

    it('should show empty state for no activity', () => {
      const statsNoActivity = {
        ...mockStats,
        recentActivity: [],
      };

      render(
        <AdminDashboard
          stats={statsNoActivity}
          isLoading={false}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should navigate to leads when leads card is clicked', () => {
      render(
        <AdminDashboard
          stats={mockStats}
          isLoading={false}
          onNavigate={mockOnNavigate}
        />
      );

      const leadsCard = screen.getByText('Total Leads').closest('.admin-dashboard__card');
      if (leadsCard) {
        fireEvent.click(leadsCard);
        expect(mockOnNavigate).toHaveBeenCalledWith('leads');
      }
    });

    it('should navigate to projects when projects card is clicked', () => {
      render(
        <AdminDashboard
          stats={mockStats}
          isLoading={false}
          onNavigate={mockOnNavigate}
        />
      );

      const projectsCard = screen.getByText('Total Projects').closest('.admin-dashboard__card');
      if (projectsCard) {
        fireEvent.click(projectsCard);
        expect(mockOnNavigate).toHaveBeenCalledWith('projects');
      }
    });

    it('should navigate to clients when clients card is clicked', () => {
      render(
        <AdminDashboard
          stats={mockStats}
          isLoading={false}
          onNavigate={mockOnNavigate}
        />
      );

      const clientsCard = screen.getByText('Total Clients').closest('.admin-dashboard__card');
      if (clientsCard) {
        fireEvent.click(clientsCard);
        expect(mockOnNavigate).toHaveBeenCalledWith('clients');
      }
    });
  });

  describe('formatting', () => {
    it('should format currency correctly', () => {
      render(
        <AdminDashboard
          stats={mockStats}
          isLoading={false}
          onNavigate={mockOnNavigate}
        />
      );

      // Total revenue should be formatted as currency (no decimals)
      expect(screen.getByText('$850,000')).toBeInTheDocument();
      expect(screen.getByText(/\+\$125,000 this month/)).toBeInTheDocument();
    });

    it('should display conversion rate', () => {
      render(
        <AdminDashboard
          stats={mockStats}
          isLoading={false}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('25% conversion')).toBeInTheDocument();
    });
  });
});
