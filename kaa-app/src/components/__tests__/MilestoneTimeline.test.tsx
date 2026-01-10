/**
 * MilestoneTimeline Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MilestoneTimeline } from '../MilestoneTimeline';
import { Milestone, MilestoneStatus, MilestoneSummary } from '../../types/portal.types';

// Mock data
const mockMilestones: Milestone[] = [
  {
    id: 'milestone-1',
    name: 'Intake',
    order: 1,
    status: 'COMPLETED' as MilestoneStatus,
    dueDate: '2024-10-01T00:00:00.000Z',
    completedAt: '2024-09-28T00:00:00.000Z',
  },
  {
    id: 'milestone-2',
    name: 'Concept Design',
    order: 2,
    status: 'COMPLETED' as MilestoneStatus,
    dueDate: '2024-10-15T00:00:00.000Z',
    completedAt: '2024-10-12T00:00:00.000Z',
  },
  {
    id: 'milestone-3',
    name: 'Design Review',
    order: 3,
    status: 'IN_PROGRESS' as MilestoneStatus,
    dueDate: '2024-11-01T00:00:00.000Z',
    completedAt: null,
  },
  {
    id: 'milestone-4',
    name: 'Revisions',
    order: 4,
    status: 'PENDING' as MilestoneStatus,
    dueDate: '2024-11-15T00:00:00.000Z',
    completedAt: null,
  },
  {
    id: 'milestone-5',
    name: 'Final Delivery',
    order: 5,
    status: 'PENDING' as MilestoneStatus,
    dueDate: '2024-12-01T00:00:00.000Z',
    completedAt: null,
  },
];

const mockSummary: MilestoneSummary = {
  total: 5,
  completed: 2,
  inProgress: 1,
  pending: 2,
  percentage: 40,
};

describe('MilestoneTimeline', () => {
  describe('rendering', () => {
    it('should render all milestones', () => {
      render(<MilestoneTimeline milestones={mockMilestones} />);

      expect(screen.getByText('Intake')).toBeInTheDocument();
      expect(screen.getByText('Concept Design')).toBeInTheDocument();
      expect(screen.getByText('Design Review')).toBeInTheDocument();
      expect(screen.getByText('Revisions')).toBeInTheDocument();
      expect(screen.getByText('Final Delivery')).toBeInTheDocument();
    });

    it('should render timeline title', () => {
      render(<MilestoneTimeline milestones={mockMilestones} />);

      expect(screen.getByText(/project timeline/i)).toBeInTheDocument();
    });

    it('should display milestone status badges', () => {
      render(<MilestoneTimeline milestones={mockMilestones} />);

      // Status badges appear for each milestone + in legend
      // 2 completed milestones + 1 in legend = 3 "Completed" texts
      expect(screen.getAllByText('Completed')).toHaveLength(3);
      // 1 in-progress milestone + 1 in legend = 2 "In Progress" texts  
      expect(screen.getAllByText('In Progress')).toHaveLength(2);
      // 2 pending milestones + 1 in legend = 3 "Pending" texts
      expect(screen.getAllByText('Pending')).toHaveLength(3);
    });

    it('should display status icons', () => {
      render(<MilestoneTimeline milestones={mockMilestones} />);

      // ✓ for completed, ● for in progress, ○ for pending
      expect(screen.getAllByText('✓')).toHaveLength(3); // 2 milestones + 1 in legend
      expect(screen.getAllByText('●')).toHaveLength(2); // 1 milestone + 1 in legend
      expect(screen.getAllByText('○')).toHaveLength(3); // 2 milestones + 1 in legend
    });

    it('should show progress summary when provided', () => {
      render(<MilestoneTimeline milestones={mockMilestones} summary={mockSummary} />);

      expect(screen.getByText('2 of 5 completed')).toBeInTheDocument();
    });

    it('should show project name when provided', () => {
      render(
        <MilestoneTimeline
          milestones={mockMilestones}
          projectName="Garden Project"
        />
      );

      expect(screen.getByText(/garden project/i)).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('should render progress bar with correct percentage', () => {
      render(<MilestoneTimeline milestones={mockMilestones} />);

      const progressFill = document.querySelector('.milestone-timeline__progress-fill');
      expect(progressFill).toBeInTheDocument();
      // 2/5 = 40%
      expect(progressFill).toHaveStyle({ width: '40%' });
    });

    it('should display percentage text', () => {
      render(<MilestoneTimeline milestones={mockMilestones} />);

      expect(screen.getByText('40%')).toBeInTheDocument();
    });

    it('should show 0% for no completed milestones', () => {
      const pendingMilestones: Milestone[] = mockMilestones.map((m) => ({
        ...m,
        status: 'PENDING' as MilestoneStatus,
        completedAt: null,
      }));

      render(<MilestoneTimeline milestones={pendingMilestones} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show 100% for all completed milestones', () => {
      const completedMilestones: Milestone[] = mockMilestones.map((m) => ({
        ...m,
        status: 'COMPLETED' as MilestoneStatus,
        completedAt: '2024-11-01T00:00:00.000Z',
      }));

      render(<MilestoneTimeline milestones={completedMilestones} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should use summary percentage when provided', () => {
      render(<MilestoneTimeline milestones={mockMilestones} summary={mockSummary} />);

      const progressFill = document.querySelector('.milestone-timeline__progress-fill');
      expect(progressFill).toHaveStyle({ width: '40%' });
    });
  });

  describe('compact mode', () => {
    it('should render in compact mode when specified', () => {
      render(<MilestoneTimeline milestones={mockMilestones} compact={true} />);

      const timeline = document.querySelector('.milestone-timeline--compact');
      expect(timeline).toBeInTheDocument();
    });

    it('should hide legend in compact mode', () => {
      render(<MilestoneTimeline milestones={mockMilestones} compact={true} />);

      const legend = document.querySelector('.milestone-timeline__legend');
      expect(legend).not.toBeInTheDocument();
    });
  });

  describe('order', () => {
    it('should display milestones in correct order', () => {
      const unorderedMilestones: Milestone[] = [
        { ...mockMilestones[4] }, // Order 5
        { ...mockMilestones[0] }, // Order 1
        { ...mockMilestones[2] }, // Order 3
        { ...mockMilestones[1] }, // Order 2
        { ...mockMilestones[3] }, // Order 4
      ];

      render(<MilestoneTimeline milestones={unorderedMilestones} />);

      const milestoneNames = document.querySelectorAll('.milestone-timeline__name');

      // Should be sorted by order
      expect(milestoneNames[0].textContent).toBe('Intake');
      expect(milestoneNames[1].textContent).toBe('Concept Design');
      expect(milestoneNames[2].textContent).toBe('Design Review');
    });
  });

  describe('due dates', () => {
    it('should display due dates when showDates is true', () => {
      render(<MilestoneTimeline milestones={mockMilestones} showDates={true} />);

      // Check for "Due" prefix in due dates
      expect(screen.getAllByText(/due/i).length).toBeGreaterThan(0);
    });

    it('should show completed date for finished milestones', () => {
      render(<MilestoneTimeline milestones={mockMilestones} showDates={true} />);

      // Completed milestones show "Completed [date]"
      expect(screen.getByText(/completed sep 28/i)).toBeInTheDocument();
    });

    it('should not show dates when showDates is false', () => {
      render(<MilestoneTimeline milestones={mockMilestones} showDates={false} />);

      // No "Completed" or "Due" text for dates
      expect(screen.queryByText(/completed sep/i)).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onMilestoneClick when milestone is clicked', () => {
      const handleClick = jest.fn();
      
      render(
        <MilestoneTimeline
          milestones={mockMilestones}
          onMilestoneClick={handleClick}
        />
      );

      const firstMilestone = screen.getByText('Intake').closest('.milestone-timeline__item');
      if (firstMilestone) {
        fireEvent.click(firstMilestone);
        expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({
          id: 'milestone-1',
          name: 'Intake',
        }));
      }
    });

    it('should support keyboard navigation when clickable', () => {
      const handleClick = jest.fn();
      
      render(
        <MilestoneTimeline
          milestones={mockMilestones}
          onMilestoneClick={handleClick}
        />
      );

      const firstMilestone = screen.getByText('Intake').closest('.milestone-timeline__item');
      if (firstMilestone) {
        fireEvent.keyDown(firstMilestone, { key: 'Enter' });
        expect(handleClick).toHaveBeenCalled();
      }
    });
  });

  describe('orientation', () => {
    it('should default to vertical orientation', () => {
      render(<MilestoneTimeline milestones={mockMilestones} />);

      const timeline = document.querySelector('.milestone-timeline--vertical');
      expect(timeline).toBeInTheDocument();
    });

    it('should support horizontal orientation', () => {
      render(
        <MilestoneTimeline
          milestones={mockMilestones}
          orientation="horizontal"
        />
      );

      const timeline = document.querySelector('.milestone-timeline--horizontal');
      expect(timeline).toBeInTheDocument();
    });
  });

  describe('legend', () => {
    it('should display legend with all statuses', () => {
      render(<MilestoneTimeline milestones={mockMilestones} />);

      const legend = document.querySelector('.milestone-timeline__legend');
      expect(legend).toBeInTheDocument();
      
      // Legend items contain status text
      expect(legend?.textContent).toContain('Completed');
      expect(legend?.textContent).toContain('In Progress');
      expect(legend?.textContent).toContain('Pending');
    });
  });
});
