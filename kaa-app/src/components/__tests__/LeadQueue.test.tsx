/**
 * LeadQueue Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LeadQueue } from '../admin/LeadQueue';
import { Lead, LeadFilters, LeadStatus } from '../../types/admin.types';

// Mock data
const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    email: 'john@example.com',
    name: 'John Doe',
    projectAddress: '123 Main St, Anytown, CA',
    budgetRange: '$10,000-$25,000',
    timeline: '3-6 months',
    projectType: 'Full Landscape',
    hasSurvey: false,
    hasDrawings: true,
    status: 'NEW' as LeadStatus,
    recommendedTier: 2,
    routingReason: 'Medium budget, full service needed',
    isConverted: false,
    client: null,
    projects: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lead-2',
    email: 'jane@example.com',
    name: 'Jane Smith',
    projectAddress: '456 Oak Ave, Somewhere, CA',
    budgetRange: '$50,000+',
    timeline: '6-12 months',
    projectType: 'Pool Landscape',
    hasSurvey: true,
    hasDrawings: true,
    status: 'QUALIFIED' as LeadStatus,
    recommendedTier: 3,
    routingReason: 'High budget, concierge service',
    isConverted: false,
    client: null,
    projects: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lead-3',
    email: 'bob@example.com',
    name: null,
    projectAddress: '789 Pine Rd, Elsewhere, CA',
    budgetRange: 'Under $5,000',
    timeline: null,
    projectType: 'DIY Guidance',
    hasSurvey: false,
    hasDrawings: false,
    status: 'CLOSED' as LeadStatus,
    recommendedTier: 1,
    routingReason: null,
    isConverted: true,
    client: { id: 'client-1', status: 'ACTIVE' },
    projects: [{ id: 'project-1', name: 'DIY Project', status: 'IN_PROGRESS' }],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultFilters: LeadFilters = {
  search: '',
  status: undefined,
  tier: undefined,
};

describe('LeadQueue', () => {
  const mockOnFilterChange = jest.fn();
  const mockOnViewLead = jest.fn();
  const mockOnOverrideTier = jest.fn();
  const mockOnConvertLead = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component header', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      expect(screen.getByText(/lead queue/i)).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <LeadQueue
          leads={[]}
          isLoading={true}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      expect(screen.getByText(/loading leads/i)).toBeInTheDocument();
    });

    it('should render empty state when no leads', () => {
      render(
        <LeadQueue
          leads={[]}
          isLoading={false}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      expect(screen.getByText(/no leads found/i)).toBeInTheDocument();
    });

    it('should render all leads in table', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('should display lead addresses', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      expect(screen.getByText('123 Main St, Anytown, CA')).toBeInTheDocument();
    });

    it('should display lead statuses', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      // Use querySelectorAll since statuses also appear in filter dropdown
      const statusCells = document.querySelectorAll('.lead-queue__status');
      expect(statusCells.length).toBe(3);
      
      const statusTexts = Array.from(statusCells).map((el) => el.textContent);
      expect(statusTexts).toContain('New');
      expect(statusTexts).toContain('Qualified');
      expect(statusTexts).toContain('Closed');
    });

    it('should display recommended tier', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      // Use querySelectorAll since tiers also appear in filter dropdown
      const tierCells = document.querySelectorAll('.lead-queue__tier');
      expect(tierCells.length).toBe(3);
      
      const tierTexts = Array.from(tierCells).map((el) => el.textContent);
      expect(tierTexts).toContain('The Builder');
      expect(tierTexts).toContain('The Concierge');
      expect(tierTexts).toContain('The Concept');
    });

    it('should show routing reason tooltip when available', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      // Info icon should be present for leads with routing reason
      const infoIcons = screen.getAllByText('ℹ️');
      expect(infoIcons.length).toBeGreaterThan(0);
    });
  });

  describe('filters', () => {
    it('should render search input', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should call onFilterChange when search is submitted', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'john' } });
      
      const form = searchInput.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultFilters,
        search: 'john',
      });
    });

    it('should render status filter', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      expect(screen.getByText('All Statuses')).toBeInTheDocument();
    });

    it('should call onFilterChange when status filter changes', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      const selects = document.querySelectorAll('.lead-queue__filter-select');
      const statusSelect = selects[0]; // First select is status
      
      fireEvent.change(statusSelect, { target: { value: 'NEW' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultFilters,
        status: 'NEW',
      });
    });

    it('should render tier filter', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      expect(screen.getByText('All Tiers')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('should call onViewLead when view button is clicked', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      const viewButtons = screen.getAllByTitle('View Details');
      fireEvent.click(viewButtons[0]);

      expect(mockOnViewLead).toHaveBeenCalledWith(mockLeads[0]);
    });

    it('should call onOverrideTier when override button is clicked', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
        />
      );

      const overrideButtons = screen.getAllByTitle('Override Tier');
      fireEvent.click(overrideButtons[0]);

      expect(mockOnOverrideTier).toHaveBeenCalledWith(mockLeads[0]);
    });

    it('should show convert button for non-converted leads', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
          onConvertLead={mockOnConvertLead}
        />
      );

      const convertButtons = screen.getAllByTitle('Convert to Client');
      expect(convertButtons.length).toBe(2); // 2 non-converted leads
    });

    it('should call onConvertLead when convert button is clicked', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
          onConvertLead={mockOnConvertLead}
        />
      );

      const convertButtons = screen.getAllByTitle('Convert to Client');
      fireEvent.click(convertButtons[0]);

      expect(mockOnConvertLead).toHaveBeenCalledWith(mockLeads[0]);
    });

    it('should show converted indicator for converted leads', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
          onConvertLead={mockOnConvertLead}
        />
      );

      expect(screen.getByTitle('Converted')).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    const mockPagination = {
      page: 2,
      totalPages: 5,
      total: 45,
      onPageChange: jest.fn(),
    };

    it('should render pagination when provided', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
          pagination={mockPagination}
        />
      );

      expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
    });

    it('should call onPageChange when prev is clicked', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
          pagination={mockPagination}
        />
      );

      const prevButton = screen.getByText(/prev/i);
      fireEvent.click(prevButton);

      expect(mockPagination.onPageChange).toHaveBeenCalledWith(1);
    });

    it('should call onPageChange when next is clicked', () => {
      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
          pagination={mockPagination}
        />
      );

      const nextButton = screen.getByText(/next/i);
      fireEvent.click(nextButton);

      expect(mockPagination.onPageChange).toHaveBeenCalledWith(3);
    });

    it('should disable prev button on first page', () => {
      const firstPagePagination = { ...mockPagination, page: 1 };

      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
          pagination={firstPagePagination}
        />
      );

      const prevButton = screen.getByText(/prev/i);
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      const lastPagePagination = { ...mockPagination, page: 5 };

      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
          pagination={lastPagePagination}
        />
      );

      const nextButton = screen.getByText(/next/i);
      expect(nextButton).toBeDisabled();
    });

    it('should not render pagination for single page', () => {
      const singlePagePagination = { ...mockPagination, page: 1, totalPages: 1 };

      render(
        <LeadQueue
          leads={mockLeads}
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onViewLead={mockOnViewLead}
          onOverrideTier={mockOnOverrideTier}
          pagination={singlePagePagination}
        />
      );

      expect(screen.queryByText(/prev/i)).not.toBeInTheDocument();
    });
  });
});
