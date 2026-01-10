/**
 * ProjectDashboard Component Tests
 *
 * Tests for loading states, project list rendering, and navigation.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectDashboard, { Project, ProjectProgress } from '../ProjectDashboard';

// Mock CSS import
jest.mock('../ProjectDashboard.css', () => ({}));

describe('ProjectDashboard', () => {
  const mockOnProjectClick = jest.fn();
  const mockOnViewAllProjects = jest.fn();

  const createProject = (overrides: Partial<Project> = {}): Project => ({
    id: 'project-1',
    name: 'Test Project',
    tier: 2,
    status: 'IN_PROGRESS',
    projectAddress: '123 Main St, City, ST 12345',
    createdAt: '2024-01-15T00:00:00.000Z',
    progress: {
      completed: 2,
      total: 5,
      percentage: 40,
      currentMilestone: 'Design Phase',
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderDashboard = (props: Partial<Parameters<typeof ProjectDashboard>[0]> = {}) => {
    return render(
      <ProjectDashboard
        projects={[]}
        onProjectClick={mockOnProjectClick}
        {...props}
      />
    );
  };

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      renderDashboard({ isLoading: true });

      expect(screen.getByLabelText(/loading projects/i)).toBeInTheDocument();
      expect(screen.getByText(/loading your projects/i)).toBeInTheDocument();
    });

    it('should not show projects when loading', () => {
      renderDashboard({
        isLoading: true,
        projects: [createProject()],
      });

      expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when error is provided', () => {
      renderDashboard({ error: 'Failed to load projects' });

      expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument();
    });

    it('should not show projects when there is an error', () => {
      renderDashboard({
        error: 'Error',
        projects: [createProject()],
      });

      expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no projects', () => {
      renderDashboard({ projects: [] });

      expect(screen.getByText(/no active projects/i)).toBeInTheDocument();
      expect(screen.getByText(/your projects will appear here/i)).toBeInTheDocument();
    });

    it('should show welcome message when no projects', () => {
      renderDashboard({ projects: [] });

      expect(screen.getByText(/welcome to your project portal/i)).toBeInTheDocument();
    });
  });

  describe('Greeting', () => {
    it('should display user name in greeting', () => {
      renderDashboard({ projects: [], userName: 'John' });

      expect(screen.getByText(/, John/i)).toBeInTheDocument();
    });

    it('should show time-appropriate greeting', () => {
      renderDashboard({ projects: [] });

      // One of these should be present based on time of day
      const greetingElement = screen.getByRole('heading', { level: 1 });
      expect(
        greetingElement.textContent?.includes('Good morning') ||
        greetingElement.textContent?.includes('Good afternoon') ||
        greetingElement.textContent?.includes('Good evening')
      ).toBe(true);
    });
  });

  describe('Project List', () => {
    it('should render project cards', () => {
      const projects = [
        createProject({ id: 'p1', name: 'Project Alpha' }),
        createProject({ id: 'p2', name: 'Project Beta' }),
      ];

      renderDashboard({ projects });

      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });

    it('should show project count in subtitle', () => {
      const projects = [
        createProject({ id: 'p1' }),
        createProject({ id: 'p2' }),
      ];

      renderDashboard({ projects });

      expect(screen.getByText(/you have 2 active projects/i)).toBeInTheDocument();
    });

    it('should show singular form for one project', () => {
      renderDashboard({ projects: [createProject()] });

      expect(screen.getByText(/you have 1 active project$/i)).toBeInTheDocument();
    });

    it('should display project address', () => {
      renderDashboard({
        projects: [createProject({ projectAddress: '456 Oak Ave' })],
      });

      expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
    });
  });

  describe('Project Card', () => {
    it('should display tier badge', () => {
      renderDashboard({ projects: [createProject({ tier: 2 })] });

      expect(screen.getByText('Sprout')).toBeInTheDocument();
    });

    it('should display status badge', () => {
      renderDashboard({
        projects: [createProject({ status: 'IN_PROGRESS' })],
      });

      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('should display progress bar', () => {
      const project = createProject({
        progress: { completed: 3, total: 5, percentage: 60, currentMilestone: 'Review' },
      });

      renderDashboard({ projects: [project] });

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
      expect(screen.getByText('60% complete')).toBeInTheDocument();
    });

    it('should display current milestone', () => {
      const project = createProject({
        progress: { completed: 2, total: 5, percentage: 40, currentMilestone: 'Design Phase' },
      });

      renderDashboard({ projects: [project] });

      expect(screen.getByText('Design Phase')).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      renderDashboard({ projects: [createProject({ name: 'My Project' })] });

      expect(screen.getByLabelText(/view project: my project/i)).toBeInTheDocument();
    });

    it('should call onProjectClick when clicked', () => {
      renderDashboard({
        projects: [createProject({ id: 'project-123' })],
      });

      fireEvent.click(screen.getByLabelText(/view project/i));

      expect(mockOnProjectClick).toHaveBeenCalledWith('project-123');
    });
  });

  describe('Tier Display', () => {
    it.each([
      [1, 'Seedling'],
      [2, 'Sprout'],
      [3, 'Canopy'],
      [4, 'Legacy'],
    ])('should display tier %i as %s', (tier, expectedName) => {
      renderDashboard({ projects: [createProject({ tier })] });

      expect(screen.getByText(expectedName)).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it.each([
      ['INTAKE', 'Intake'],
      ['ONBOARDING', 'Onboarding'],
      ['IN_PROGRESS', 'In Progress'],
      ['AWAITING_FEEDBACK', 'Awaiting Feedback'],
      ['REVISIONS', 'Revisions'],
      ['DELIVERED', 'Delivered'],
      ['CLOSED', 'Closed'],
    ])('should display status %s as %s', (status, expectedLabel) => {
      renderDashboard({
        projects: [createProject({ status })],
      });

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });

  describe('Active vs Completed Projects', () => {
    it('should separate active and completed projects', () => {
      const projects = [
        createProject({ id: 'p1', name: 'Active Project', status: 'IN_PROGRESS' }),
        createProject({ id: 'p2', name: 'Completed Project', status: 'DELIVERED' }),
      ];

      renderDashboard({ projects });

      expect(screen.getByText('Active Projects')).toBeInTheDocument();
      expect(screen.getByText('Recently Completed')).toBeInTheDocument();
    });

    it('should not show completed section when no completed projects', () => {
      const projects = [
        createProject({ id: 'p1', status: 'IN_PROGRESS' }),
      ];

      renderDashboard({ projects });

      expect(screen.queryByText('Recently Completed')).not.toBeInTheDocument();
    });

    it('should exclude CLOSED projects from active count', () => {
      const projects = [
        createProject({ id: 'p1', status: 'IN_PROGRESS' }),
        createProject({ id: 'p2', status: 'CLOSED' }),
      ];

      renderDashboard({ projects });

      expect(screen.getByText(/you have 1 active project$/i)).toBeInTheDocument();
    });
  });

  describe('Quick Stats', () => {
    it('should display stats cards when projects exist', () => {
      const projects = [
        createProject({ id: 'p1', status: 'IN_PROGRESS' }),
        createProject({ id: 'p2', status: 'DELIVERED' }),
        createProject({ id: 'p3', status: 'AWAITING_FEEDBACK' }),
      ];

      renderDashboard({ projects });

      // Should show active count (2: IN_PROGRESS and AWAITING_FEEDBACK)
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();

      // Should show completed count (1: DELIVERED)
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();

      // Should show total count (3)
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('should not show stats when no projects', () => {
      renderDashboard({ projects: [] });

      expect(screen.queryByText('Active')).not.toBeInTheDocument();
      expect(screen.queryByText('Completed')).not.toBeInTheDocument();
      expect(screen.queryByText('Total')).not.toBeInTheDocument();
    });
  });

  describe('View All Button', () => {
    it('should show View All button when more than 3 projects', () => {
      const projects = [
        createProject({ id: 'p1' }),
        createProject({ id: 'p2' }),
        createProject({ id: 'p3' }),
        createProject({ id: 'p4' }),
      ];

      renderDashboard({ projects, onViewAllProjects: mockOnViewAllProjects });

      expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
    });

    it('should not show View All button when 3 or fewer projects', () => {
      const projects = [
        createProject({ id: 'p1' }),
        createProject({ id: 'p2' }),
      ];

      renderDashboard({ projects, onViewAllProjects: mockOnViewAllProjects });

      expect(screen.queryByRole('button', { name: /view all/i })).not.toBeInTheDocument();
    });

    it('should call onViewAllProjects when clicked', () => {
      const projects = Array(5).fill(null).map((_, i) => createProject({ id: `p${i}` }));

      renderDashboard({ projects, onViewAllProjects: mockOnViewAllProjects });

      fireEvent.click(screen.getByRole('button', { name: /view all/i }));

      expect(mockOnViewAllProjects).toHaveBeenCalledTimes(1);
    });

    it('should not show View All when onViewAllProjects not provided', () => {
      const projects = Array(5).fill(null).map((_, i) => createProject({ id: `p${i}` }));

      renderDashboard({ projects }); // No onViewAllProjects prop

      expect(screen.queryByRole('button', { name: /view all/i })).not.toBeInTheDocument();
    });
  });

  describe('Project Limit', () => {
    it('should show max 6 active projects in grid', () => {
      const projects = Array(10).fill(null).map((_, i) =>
        createProject({ id: `p${i}`, name: `Project ${i}`, status: 'IN_PROGRESS' })
      );

      renderDashboard({ projects });

      // Should only show 6 project cards in active section
      const projectCards = screen.getAllByLabelText(/view project/i);
      expect(projectCards.length).toBe(6);
    });

    it('should show max 3 completed projects', () => {
      const projects = Array(5).fill(null).map((_, i) =>
        createProject({ id: `p${i}`, name: `Completed ${i}`, status: 'DELIVERED' })
      );

      renderDashboard({ projects });

      // Recently Completed section shows max 3
      const deliveredBadges = screen.getAllByText('Delivered');
      expect(deliveredBadges.length).toBe(3);
    });
  });
});
