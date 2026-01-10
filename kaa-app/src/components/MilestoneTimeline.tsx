/**
 * MilestoneTimeline Component
 * Visual timeline of project milestones with status indicators.
 */

import React, { JSX } from 'react';
import {
  Milestone,
  MilestoneStatus,
  MilestoneSummary,
  formatDate,
  STATUS_COLORS,
} from '../types/portal.types';
import './MilestoneTimeline.css';

// ============================================================================
// TYPES
// ============================================================================

interface MilestoneTimelineProps {
  milestones: Milestone[];
  summary?: MilestoneSummary;
  projectName?: string;
  onMilestoneClick?: (milestone: Milestone) => void;
  orientation?: 'vertical' | 'horizontal';
  showDates?: boolean;
  compact?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusIcon(status: MilestoneStatus): string {
  switch (status) {
    case 'COMPLETED':
      return '✓';
    case 'IN_PROGRESS':
      return '●';
    case 'PENDING':
      return '○';
    default:
      return '○';
  }
}

function getStatusLabel(status: MilestoneStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'Completed';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'PENDING':
      return 'Pending';
    default:
      return status;
  }
}

function getDaysUntilDue(dueDate: string | null): { text: string; isOverdue: boolean } | null {
  if (!dueDate) return null;
  
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)} days overdue`, isOverdue: true };
  } else if (diffDays === 0) {
    return { text: 'Due today', isOverdue: false };
  } else if (diffDays === 1) {
    return { text: 'Due tomorrow', isOverdue: false };
  } else if (diffDays <= 7) {
    return { text: `${diffDays} days left`, isOverdue: false };
  }
  
  return null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MilestoneTimeline({
  milestones,
  summary,
  projectName,
  onMilestoneClick,
  orientation = 'vertical',
  showDates = true,
  compact = false,
}: MilestoneTimelineProps): JSX.Element {
  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);
  
  // Calculate progress
  const progressPercentage = summary?.percentage ?? 
    (milestones.length > 0
      ? Math.round(
          (milestones.filter((m) => m.status === 'COMPLETED').length / milestones.length) * 100
        )
      : 0);

  return (
    <div className={`milestone-timeline milestone-timeline--${orientation} ${compact ? 'milestone-timeline--compact' : ''}`}>
      {/* Header */}
      <div className="milestone-timeline__header">
        <div className="milestone-timeline__title-section">
          <h3 className="milestone-timeline__title">
            📋 Project Timeline
            {projectName && (
              <span className="milestone-timeline__project"> — {projectName}</span>
            )}
          </h3>
          {summary && (
            <div className="milestone-timeline__summary">
              <span className="milestone-timeline__completed">
                {summary.completed} of {summary.total} completed
              </span>
            </div>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="milestone-timeline__progress">
          <div className="milestone-timeline__progress-bar">
            <div
              className="milestone-timeline__progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="milestone-timeline__progress-text">{progressPercentage}%</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="milestone-timeline__content">
        <div className="milestone-timeline__track">
          {sortedMilestones.map((milestone, index) => {
            const statusClass = `milestone--${milestone.status.toLowerCase()}`;
            const dueInfo = milestone.status !== 'COMPLETED' 
              ? getDaysUntilDue(milestone.dueDate) 
              : null;
            const isClickable = !!onMilestoneClick;

            return (
              <div
                key={milestone.id}
                className={`milestone-timeline__item ${statusClass} ${isClickable ? 'milestone-timeline__item--clickable' : ''}`}
                onClick={() => onMilestoneClick?.(milestone)}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onMilestoneClick?.(milestone);
                  }
                }}
              >
                {/* Connector line */}
                {index < sortedMilestones.length - 1 && (
                  <div
                    className={`milestone-timeline__connector ${
                      milestone.status === 'COMPLETED' ? 'milestone-timeline__connector--completed' : ''
                    }`}
                  />
                )}

                {/* Status indicator */}
                <div className={`milestone-timeline__indicator ${statusClass}`}>
                  <span className="milestone-timeline__icon">
                    {getStatusIcon(milestone.status)}
                  </span>
                </div>

                {/* Content */}
                <div className="milestone-timeline__details">
                  <div className="milestone-timeline__name-row">
                    <span className="milestone-timeline__name">{milestone.name}</span>
                    <span className={`milestone-timeline__status-badge ${statusClass}`}>
                      {getStatusLabel(milestone.status)}
                    </span>
                  </div>

                  {showDates && (
                    <div className="milestone-timeline__dates">
                      {milestone.completedAt ? (
                        <span className="milestone-timeline__completed-date">
                          ✓ Completed {formatDate(milestone.completedAt)}
                        </span>
                      ) : milestone.dueDate ? (
                        <span className={`milestone-timeline__due-date ${dueInfo?.isOverdue ? 'overdue' : ''}`}>
                          📅 Due {formatDate(milestone.dueDate)}
                          {dueInfo && (
                            <span className="milestone-timeline__due-badge">
                              {dueInfo.text}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="milestone-timeline__no-date">
                          No due date set
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Order number */}
                {!compact && (
                  <div className="milestone-timeline__order">
                    {milestone.order}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {!compact && (
        <div className="milestone-timeline__legend">
          <div className="milestone-timeline__legend-item">
            <span className="milestone-timeline__legend-icon milestone--completed">✓</span>
            <span>Completed</span>
          </div>
          <div className="milestone-timeline__legend-item">
            <span className="milestone-timeline__legend-icon milestone--in_progress">●</span>
            <span>In Progress</span>
          </div>
          <div className="milestone-timeline__legend-item">
            <span className="milestone-timeline__legend-icon milestone--pending">○</span>
            <span>Pending</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MilestoneTimeline;
