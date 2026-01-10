/**
 * MilestoneTimeline Component Tests
 *
 * Tests for milestone rendering, status indicators, and timeline display.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MilestoneTimeline, { Milestone } from '../MilestoneTimeline';

// Mock CSS import
jest.mock('../MilestoneTimeline.css', () => ({}));

describe('MilestoneTimeline', () => {
  const mockOnMilestoneClick = jest.fn();

  const createMilestone = (overrides: Partial<Milestone> = {}): Milestone => ({
    id: 'milestone-1',
    name: 'Test Milestone',
    status: 'PENDING',
    order: 1,
    dueDate: null,
    completedAt: null,
    description: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderTimeline = (props: Partial<Parameters<typeof MilestoneTimeline>[0]> = {}) => {
    return render(
      <MilestoneTimeline
        milestones={[]}
        {...props}
      />
    );
  };

  describe('Empty State', () => {
    it('should show empty message when no milestones', () => {
      renderTimeline({ milestones: [] });

      expect(screen.getByText(/no milestones defined/i)).toBeInTheDocument();
    });
  });

  describe('Basic Rendering', () => {
    it('should render all milestones', () => {
      const milestones = [
        createMilestone({ id: 'm1', name: 'Intake', order: 1 }),
        createMilestone({ id: 'm2', name: 'Design', order: 2 }),
        createMilestone({ id: 'm3', name: 'Review', order: 3 }),
      ];

      renderTimeline({ milestones });

      expect(screen.getByText('Intake')).toBeInTheDocument();
      expect(screen.getByText('Design')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('should sort milestones by order', () => {
      const milestones = [
        createMilestone({ id: 'm3', name: 'Third', order: 3 }),
        createMilestone({ id: 'm1', name: 'First', order: 1 }),
        createMilestone({ id: 'm2', name: 'Second', order: 2 }),
      ];

      renderTimeline({ milestones });

      const items = screen.getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('First');
      expect(items[1]).toHaveTextContent('Second');
      expect(items[2]).toHaveTextContent('Third');
    });

    it('should have accessible list role', () => {
      renderTimeline({
        milestones: [createMilestone()],
      });

      expect(screen.getByRole('list', { name: /project milestones/i })).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display PENDING status', () => {
      renderTimeline({
        milestones: [createMilestone({ status: 'PENDING' })],
      });

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should display IN_PROGRESS status', () => {
      renderTimeline({
        milestones: [createMilestone({ status: 'IN_PROGRESS' })],
      });

      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('should display COMPLETED status', () => {
      renderTimeline({
        milestones: [createMilestone({ status: 'COMPLETED' })],
      });

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should show order number for pending milestones', () => {
      renderTimeline({
        milestones: [createMilestone({ status: 'PENDING', order: 3 })],
      });

      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Progress Summary', () => {
    it('should show progress fraction', () => {
      const milestones = [
        createMilestone({ id: 'm1', status: 'COMPLETED', order: 1 }),
        createMilestone({ id: 'm2', status: 'COMPLETED', order: 2 }),
        createMilestone({ id: 'm3', status: 'IN_PROGRESS', order: 3 }),
        createMilestone({ id: 'm4', status: 'PENDING', order: 4 }),
        createMilestone({ id: 'm5', status: 'PENDING', order: 5 }),
      ];

      renderTimeline({ milestones });

      expect(screen.getByText('2/5')).toBeInTheDocument();
      expect(screen.getByText('milestones complete')).toBeInTheDocument();
    });

    it('should show progress bar with correct percentage', () => {
      const milestones = [
        createMilestone({ id: 'm1', status: 'COMPLETED', order: 1 }),
        createMilestone({ id: 'm2', status: 'PENDING', order: 2 }),
      ];

      renderTimeline({ milestones });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should show current milestone indicator', () => {
      const milestones = [
        createMilestone({ id: 'm1', status: 'COMPLETED', order: 1, name: 'Intake' }),
        createMilestone({ id: 'm2', status: 'IN_PROGRESS', order: 2, name: 'Design Phase' }),
        createMilestone({ id: 'm3', status: 'PENDING', order: 3, name: 'Review' }),
      ];

      renderTimeline({ milestones });

      expect(screen.getByText(/currently:/i)).toBeInTheDocument();
      expect(screen.getByText('Design Phase')).toBeInTheDocument();
    });

    it('should hide summary in compact mode', () => {
      const milestones = [
        createMilestone({ id: 'm1', status: 'COMPLETED', order: 1 }),
        createMilestone({ id: 'm2', status: 'PENDING', order: 2 }),
      ];

      renderTimeline({ milestones, compact: true });

      expect(screen.queryByText('milestones complete')).not.toBeInTheDocument();
    });
  });

  describe('Date Display', () => {
    it('should show completed date for completed milestones', () => {
      const completedDate = '2024-01-15T10:00:00.000Z';
      renderTimeline({
        milestones: [createMilestone({ status: 'COMPLETED', completedAt: completedDate })],
        showDates: true,
      });

      expect(screen.getByText(/completed jan 15, 2024/i)).toBeInTheDocument();
    });

    it('should show due date for in-progress milestones', () => {
      // Set due date to future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      renderTimeline({
        milestones: [createMilestone({
          status: 'IN_PROGRESS',
          dueDate: futureDate.toISOString(),
        })],
        showDates: true,
      });

      expect(screen.getByText(/due in \d+ days/i)).toBeInTheDocument();
    });

    it('should hide dates when showDates is false', () => {
      renderTimeline({
        milestones: [createMilestone({
          status: 'COMPLETED',
          completedAt: '2024-01-15T00:00:00.000Z',
        })],
        showDates: false,
      });

      expect(screen.queryByText(/completed/i)).not.toBeInTheDocument();
    });
  });

  describe('Description Display', () => {
    it('should show description when showDescriptions is true', () => {
      renderTimeline({
        milestones: [createMilestone({
          name: 'Design',
          description: 'Create initial design concepts',
        })],
        showDescriptions: true,
      });

      expect(screen.getByText('Create initial design concepts')).toBeInTheDocument();
    });

    it('should hide description when showDescriptions is false', () => {
      renderTimeline({
        milestones: [createMilestone({
          description: 'Hidden description',
        })],
        showDescriptions: false,
      });

      expect(screen.queryByText('Hidden description')).not.toBeInTheDocument();
    });
  });

  describe('Orientation', () => {
    it('should have vertical class by default', () => {
      const { container } = renderTimeline({
        milestones: [createMilestone()],
      });

      expect(container.querySelector('.milestone-timeline--vertical')).toBeInTheDocument();
    });

    it('should have horizontal class when specified', () => {
      const { container } = renderTimeline({
        milestones: [createMilestone()],
        orientation: 'horizontal',
      });

      expect(container.querySelector('.milestone-timeline--horizontal')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should have compact class when compact is true', () => {
      const { container } = renderTimeline({
        milestones: [createMilestone()],
        compact: true,
      });

      expect(container.querySelector('.milestone-timeline--compact')).toBeInTheDocument();
    });
  });

  describe('Click Interaction', () => {
    it('should call onMilestoneClick when milestone is clicked', () => {
      const milestone = createMilestone({ id: 'm1', name: 'Clickable' });

      renderTimeline({
        milestones: [milestone],
        onMilestoneClick: mockOnMilestoneClick,
      });

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnMilestoneClick).toHaveBeenCalledWith(milestone);
    });

    it('should render as button when onMilestoneClick is provided', () => {
      renderTimeline({
        milestones: [createMilestone()],
        onMilestoneClick: mockOnMilestoneClick,
      });

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render as div when onMilestoneClick is not provided', () => {
      renderTimeline({
        milestones: [createMilestone()],
      });

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should have accessible label when clickable', () => {
      renderTimeline({
        milestones: [createMilestone({ name: 'Design', status: 'IN_PROGRESS' })],
        onMilestoneClick: mockOnMilestoneClick,
      });

      expect(screen.getByRole('button', { name: /design: in progress/i })).toBeInTheDocument();
    });
  });

  describe('Connector Lines', () => {
    it('should render connector lines between milestones', () => {
      const { container } = renderTimeline({
        milestones: [
          createMilestone({ id: 'm1', order: 1 }),
          createMilestone({ id: 'm2', order: 2 }),
          createMilestone({ id: 'm3', order: 3 }),
        ],
      });

      // Should have connector elements
      const connectors = container.querySelectorAll('.timeline-connector');
      expect(connectors.length).toBeGreaterThan(0);
    });

    it('should have active connector for completed milestones', () => {
      const { container } = renderTimeline({
        milestones: [
          createMilestone({ id: 'm1', order: 1, status: 'COMPLETED' }),
          createMilestone({ id: 'm2', order: 2, status: 'PENDING' }),
        ],
      });

      const activeConnectors = container.querySelectorAll('.timeline-connector--active');
      expect(activeConnectors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single milestone', () => {
      renderTimeline({
        milestones: [createMilestone({ name: 'Only One' })],
      });

      expect(screen.getByText('Only One')).toBeInTheDocument();
      expect(screen.getByText('1/1')).toBeInTheDocument();
    });

    it('should handle all completed milestones', () => {
      const milestones = [
        createMilestone({ id: 'm1', status: 'COMPLETED', order: 1 }),
        createMilestone({ id: 'm2', status: 'COMPLETED', order: 2 }),
        createMilestone({ id: 'm3', status: 'COMPLETED', order: 3 }),
      ];

      renderTimeline({ milestones });

      expect(screen.getByText('3/3')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should handle all pending milestones', () => {
      const milestones = [
        createMilestone({ id: 'm1', status: 'PENDING', order: 1 }),
        createMilestone({ id: 'm2', status: 'PENDING', order: 2 }),
      ];

      renderTimeline({ milestones });

      expect(screen.getByText('0/2')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should not show current milestone when none in progress', () => {
      const milestones = [
        createMilestone({ id: 'm1', status: 'COMPLETED', order: 1 }),
        createMilestone({ id: 'm2', status: 'PENDING', order: 2 }),
      ];

      renderTimeline({ milestones });

      expect(screen.queryByText(/currently:/i)).not.toBeInTheDocument();
    });
  });

  describe('Status Icon', () => {
    it('should render checkmark for completed status', () => {
      const { container } = renderTimeline({
        milestones: [createMilestone({ status: 'COMPLETED' })],
      });

      expect(container.querySelector('.status-icon--completed')).toBeInTheDocument();
    });

    it('should render indicator for in-progress status', () => {
      const { container } = renderTimeline({
        milestones: [createMilestone({ status: 'IN_PROGRESS' })],
      });

      expect(container.querySelector('.status-icon--in-progress')).toBeInTheDocument();
    });

    it('should render order number for pending status', () => {
      const { container } = renderTimeline({
        milestones: [createMilestone({ status: 'PENDING', order: 2 })],
      });

      expect(container.querySelector('.status-icon--pending')).toHaveTextContent('2');
    });
  });
});
