import React from 'react';
import './MilestoneTimeline.css';

// Types
export interface Milestone {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  order: number;
  dueDate?: string | null;
  completedAt?: string | null;
  description?: string | null;
}

export interface MilestoneTimelineProps {
  milestones: Milestone[];
  orientation?: 'vertical' | 'horizontal';
  showDates?: boolean;
  showDescriptions?: boolean;
  compact?: boolean;
  onMilestoneClick?: (milestone: Milestone) => void;
}

// Format date helper
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format relative date
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return 'Yesterday';
    if (absDays < 7) return `${absDays} days ago`;
    if (absDays < 30) return `${Math.floor(absDays / 7)} weeks ago`;
    return formatDate(dateString);
  }

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
  return formatDate(dateString);
}

// Status icon component
const StatusIcon: React.FC<{ status: Milestone['status']; order: number }> = ({
  status,
  order,
}) => {
  if (status === 'COMPLETED') {
    return (
      <svg
        className="status-icon status-icon--completed"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  if (status === 'IN_PROGRESS') {
    return <span className="status-icon status-icon--in-progress" aria-hidden="true" />;
  }

  return (
    <span className="status-icon status-icon--pending" aria-hidden="true">
      {order}
    </span>
  );
};

// Get status label
function getStatusLabel(status: Milestone['status']): string {
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

const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  milestones,
  orientation = 'vertical',
  showDates = true,
  showDescriptions = false,
  compact = false,
  onMilestoneClick,
}) => {
  // Sort milestones by order
  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);

  // Calculate progress
  const completedCount = sortedMilestones.filter((m) => m.status === 'COMPLETED').length;
  const totalCount = sortedMilestones.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Find current milestone
  const currentMilestone = sortedMilestones.find((m) => m.status === 'IN_PROGRESS');

  if (sortedMilestones.length === 0) {
    return (
      <div className="milestone-timeline milestone-timeline--empty">
        <p className="timeline-empty-text">No milestones defined</p>
      </div>
    );
  }

  return (
    <div
      className={`milestone-timeline milestone-timeline--${orientation} ${compact ? 'milestone-timeline--compact' : ''}`}
      role="list"
      aria-label="Project milestones"
    >
      {/* Progress Summary */}
      {!compact && (
        <div className="timeline-summary">
          <div className="summary-progress">
            <span className="progress-fraction">
              {completedCount}/{totalCount}
            </span>
            <span className="progress-label">milestones complete</span>
          </div>
          <div className="summary-bar">
            <div
              className="summary-bar-fill"
              style={{ width: `${progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {currentMilestone && (
            <div className="summary-current">
              <span className="current-indicator" />
              <span className="current-text">
                Currently: <strong>{currentMilestone.name}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Timeline Items */}
      <div className="timeline-items">
        {sortedMilestones.map((milestone, index) => {
          const isFirst = index === 0;
          const isLast = index === sortedMilestones.length - 1;
          const isClickable = !!onMilestoneClick;

          const itemContent = (
            <>
              {/* Connector line before */}
              {!isFirst && (
                <div
                  className={`timeline-connector timeline-connector--before ${
                    milestone.status === 'COMPLETED' || milestone.status === 'IN_PROGRESS'
                      ? 'timeline-connector--active'
                      : ''
                  }`}
                />
              )}

              {/* Marker */}
              <div
                className={`timeline-marker timeline-marker--${milestone.status.toLowerCase()}`}
              >
                <StatusIcon status={milestone.status} order={milestone.order} />
              </div>

              {/* Connector line after */}
              {!isLast && (
                <div
                  className={`timeline-connector timeline-connector--after ${
                    milestone.status === 'COMPLETED' ? 'timeline-connector--active' : ''
                  }`}
                />
              )}

              {/* Content */}
              <div className="timeline-content">
                <h4 className="milestone-name">{milestone.name}</h4>

                {showDescriptions && milestone.description && (
                  <p className="milestone-description">{milestone.description}</p>
                )}

                <div className="milestone-meta">
                  <span
                    className={`milestone-status milestone-status--${milestone.status.toLowerCase()}`}
                  >
                    {getStatusLabel(milestone.status)}
                  </span>

                  {showDates && (
                    <>
                      {milestone.completedAt && (
                        <span className="milestone-date milestone-date--completed">
                          Completed {formatDate(milestone.completedAt)}
                        </span>
                      )}
                      {!milestone.completedAt && milestone.dueDate && (
                        <span
                          className={`milestone-date ${
                            new Date(milestone.dueDate) < new Date() &&
                            milestone.status !== 'COMPLETED'
                              ? 'milestone-date--overdue'
                              : ''
                          }`}
                        >
                          {milestone.status === 'IN_PROGRESS' ? 'Due ' : 'Expected '}
                          {formatRelativeDate(milestone.dueDate)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          );

          if (isClickable) {
            return (
              <button
                key={milestone.id}
                type="button"
                className={`timeline-item timeline-item--${milestone.status.toLowerCase()} timeline-item--clickable`}
                onClick={() => onMilestoneClick(milestone)}
                role="listitem"
                aria-label={`${milestone.name}: ${getStatusLabel(milestone.status)}`}
              >
                {itemContent}
              </button>
            );
          }

          return (
            <div
              key={milestone.id}
              className={`timeline-item timeline-item--${milestone.status.toLowerCase()}`}
              role="listitem"
            >
              {itemContent}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MilestoneTimeline;
