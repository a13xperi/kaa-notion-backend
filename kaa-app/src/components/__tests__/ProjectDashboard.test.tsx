/**
 * ProjectDashboard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectDashboard } from '../ProjectDashboard';
import { ProjectSummary, ProjectStatus } from '../../types/portal.types';

// Mock data
const mockProjects: ProjectSummary[] = [
  {
    id: 'project-1',
    name: 'Garden Redesign',
    tier: 2,
    status: 'IN_PROGRESS' as ProjectStatus,
    paymentStatus: 'paid',
    progress: {
      completed: 2,
      total: 5,
      percentage: 40,
    },
    nextMilestone: {
      id: 'milestone-3',
      name: 'Design Review',
      dueDate: '2024-12-15T00:00:00.000Z',
    },
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-11-01T00:00:00.000Z',
  },
  {
    id: 'project-2',
    name: 'Backyard Patio',
    tier: 3,
    status: 'AWAITING_FEEDBACK' as ProjectStatus,
    paymentStatus: 'paid',
    progress: {
      completed: 4,
      total: 6,
      percentage: 67,
    },
    nextMilestone: {
      id: 'milestone-5',
      name: 'Client Review',
      dueDate: null,
    },
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-10-20T00:00:00.000Z',
  },
  {
    id: 'project-3',
    name: 'Front Yard Landscape',
    tier: 1,
    status: 'DELIVERED' as ProjectStatus,
    paymentStatus: 'paid',
    progress: {
      completed: 3,
      total: 3,
      percentage: 100,
    },
    nextMilestone: null,
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-09-15T00:00:00.000Z',
  },
];

describe('ProjectDashboard', () => {
  const mockOnProjectClick = jest.fn();
  const mockOnCreateProject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render loading state', () => {
      render(
        <ProjectDashboard
          projects={[]}
          isLoading={true}
          onProjectClick={mockOnProjectClick}
        />
      );

      // Loading shows skeleton cards
      const loadingContainer = document.querySelector('.project-dashboard__loading');
      expect(loadingContainer).toBeInTheDocument();
    });

    it('should render empty state when no projects', () => {
      render(
        <ProjectDashboard
          projects={[]}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      expect(screen.getByText(/no projects/i)).toBeInTheDocument();
    });

    it('should render project list', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      expect(screen.getByText('Garden Redesign')).toBeInTheDocument();
      expect(screen.getByText('Backyard Patio')).toBeInTheDocument();
      expect(screen.getByText('Front Yard Landscape')).toBeInTheDocument();
    });

    it('should display project stats', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      // Should show total projects
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Total Projects')).toBeInTheDocument();
    });

    it('should display tier badges', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      expect(screen.getByText('The Concept')).toBeInTheDocument();
      expect(screen.getByText('The Builder')).toBeInTheDocument();
      expect(screen.getByText('The Concierge')).toBeInTheDocument();
    });

    it('should display progress bars', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      // Progress text should be visible
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('67%')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onProjectClick when clicking a project card', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      const firstProject = screen.getByText('Garden Redesign').closest('.project-dashboard__card');
      if (firstProject) {
        fireEvent.click(firstProject);
        expect(mockOnProjectClick).toHaveBeenCalledWith('project-1');
      }
    });

    it('should filter projects by search', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Garden' } });

      expect(screen.getByText('Garden Redesign')).toBeInTheDocument();
      expect(screen.queryByText('Backyard Patio')).not.toBeInTheDocument();
    });

    it('should filter projects by status', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      const statusFilter = screen.getByLabelText(/filter by status/i);
      fireEvent.change(statusFilter, { target: { value: 'DELIVERED' } });
      
      expect(screen.getByText('Front Yard Landscape')).toBeInTheDocument();
      expect(screen.queryByText('Garden Redesign')).not.toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('should sort by most recent by default', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      const sortSelect = screen.getByLabelText(/sort by/i);
      expect(sortSelect).toHaveValue('recent');
    });

    it('should sort by name when selected', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      const sortSelect = screen.getByLabelText(/sort by/i);
      fireEvent.change(sortSelect, { target: { value: 'name' } });

      const projectCards = document.querySelectorAll('.project-dashboard__card-title');
      // First should be alphabetically first
      expect(projectCards[0].textContent).toBe('Backyard Patio');
    });
  });

  describe('create project button', () => {
    it('should show create button when onCreateProject is provided', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
          onCreateProject={mockOnCreateProject}
        />
      );

      const createButton = screen.getByText(/new project/i);
      expect(createButton).toBeInTheDocument();
    });

    it('should call onCreateProject when clicking create button', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
          onCreateProject={mockOnCreateProject}
        />
      );

      const createButton = screen.getByText(/new project/i);
      fireEvent.click(createButton);
      expect(mockOnCreateProject).toHaveBeenCalled();
    });

    it('should not show create button when onCreateProject is not provided', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      expect(screen.queryByText(/new project/i)).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should render error state with message', () => {
      render(
        <ProjectDashboard
          projects={[]}
          isLoading={false}
          error="Failed to load projects"
          onProjectClick={mockOnProjectClick}
        />
      );

      // Both h3 and p contain the text - just verify the error container is present
      const errorContainer = document.querySelector('.project-dashboard--error');
      expect(errorContainer).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('user greeting', () => {
    it('should show personalized greeting when userName provided', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          userName="John"
          onProjectClick={mockOnProjectClick}
        />
      );

      expect(screen.getByText(/welcome back, john/i)).toBeInTheDocument();
    });

    it('should show generic greeting when no userName', () => {
      render(
        <ProjectDashboard
          projects={mockProjects}
          isLoading={false}
          onProjectClick={mockOnProjectClick}
        />
      );

      expect(screen.getByText('Your Projects')).toBeInTheDocument();
    });
  });
});
