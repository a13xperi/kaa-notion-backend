import React from 'react';
import './ProjectDetail.css';

// Types
export interface Milestone {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  order: number;
  dueDate?: string | null;
  completedAt?: string | null;
}

export interface Deliverable {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  category: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string | null;
}

export interface ProjectProgress {
  completed: number;
  total: number;
  percentage: number;
  currentMilestone: string | null;
}

export interface ProjectDetailData {
  id: string;
  name: string;
  tier: number;
  status: string;
  projectAddress?: string | null;
  createdAt: string;
  milestones: Milestone[];
  deliverables: Deliverable[];
  payments: Payment[];
  progress?: ProjectProgress;
  client?: {
    user?: {
      name?: string | null;
      email?: string | null;
    };
  };
}

interface ProjectDetailProps {
  project: ProjectDetailData;
  onBack: () => void;
  onDownloadDeliverable: (deliverableId: string) => void;
  onViewAllDeliverables?: () => void;
  isLoading?: boolean;
}

// Status display configuration
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  INTAKE: { label: 'Intake', className: 'status--intake' },
  ONBOARDING: { label: 'Onboarding', className: 'status--onboarding' },
  IN_PROGRESS: { label: 'In Progress', className: 'status--in-progress' },
  AWAITING_FEEDBACK: { label: 'Awaiting Feedback', className: 'status--awaiting' },
  REVISIONS: { label: 'Revisions', className: 'status--revisions' },
  DELIVERED: { label: 'Delivered', className: 'status--delivered' },
  CLOSED: { label: 'Closed', className: 'status--closed' },
};

// Tier display configuration
const TIER_CONFIG: Record<number, { name: string; className: string }> = {
  1: { name: 'Seedling', className: 'tier--1' },
  2: { name: 'Sprout', className: 'tier--2' },
  3: { name: 'Canopy', className: 'tier--3' },
  4: { name: 'Legacy', className: 'tier--4' },
};

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  onBack,
  onDownloadDeliverable,
  onViewAllDeliverables,
  isLoading = false,
}) => {
  const status = STATUS_CONFIG[project.status] || { label: project.status, className: '' };
  const tier = TIER_CONFIG[project.tier] || { name: `Tier ${project.tier}`, className: '' };
  const progress = project.progress;

  // Sort milestones by order
  const sortedMilestones = [...project.milestones].sort((a, b) => a.order - b.order);

  // Get recent deliverables (latest 4)
  const recentDeliverables = [...project.deliverables]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Get latest payment
  const latestPayment = project.payments[0];

  return (
    <div className="project-detail">
      {/* Header */}
      <header className="detail-header">
        <button type="button" className="back-btn" onClick={onBack} aria-label="Go back">
          <span aria-hidden="true">←</span>
          <span>Back to Projects</span>
        </button>

        <div className="header-content">
          <div className="header-badges">
            <span className={`tier-badge ${tier.className}`}>{tier.name}</span>
            <span className={`status-badge ${status.className}`}>{status.label}</span>
          </div>
          <h1 className="project-title">{project.name}</h1>
          {project.projectAddress && (
            <p className="project-address">{project.projectAddress}</p>
          )}
        </div>
      </header>

      {/* Progress Overview */}
      {progress && (
        <section className="detail-section progress-section">
          <div className="progress-overview">
            <div className="progress-ring-container">
              <svg className="progress-ring" viewBox="0 0 100 100">
                <circle
                  className="progress-ring-bg"
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  strokeWidth="8"
                />
                <circle
                  className="progress-ring-fill"
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  strokeWidth="8"
                  strokeDasharray={`${progress.percentage * 2.83} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="progress-ring-text">
                <span className="progress-value">{progress.percentage}%</span>
                <span className="progress-label">Complete</span>
              </div>
            </div>
            <div className="progress-details">
              <div className="progress-stat">
                <span className="stat-value">{progress.completed}</span>
                <span className="stat-label">Milestones Done</span>
              </div>
              <div className="progress-stat">
                <span className="stat-value">{progress.total - progress.completed}</span>
                <span className="stat-label">Remaining</span>
              </div>
              {progress.currentMilestone && (
                <div className="current-milestone-info">
                  <span className="current-label">Currently working on:</span>
                  <span className="current-name">{progress.currentMilestone}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Milestones Timeline */}
      <section className="detail-section">
        <h2 className="section-title">Project Timeline</h2>
        <div className="milestones-timeline">
          {sortedMilestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className={`timeline-item timeline-item--${milestone.status.toLowerCase()}`}
            >
              <div className="timeline-marker">
                {milestone.status === 'COMPLETED' ? (
                  <span className="marker-check">✓</span>
                ) : milestone.status === 'IN_PROGRESS' ? (
                  <span className="marker-progress" />
                ) : (
                  <span className="marker-pending">{index + 1}</span>
                )}
              </div>
              <div className="timeline-content">
                <h3 className="milestone-name">{milestone.name}</h3>
                <div className="milestone-meta">
                  {milestone.completedAt ? (
                    <span className="milestone-date">
                      Completed {formatDate(milestone.completedAt)}
                    </span>
                  ) : milestone.dueDate ? (
                    <span className="milestone-date">
                      Due {formatDate(milestone.dueDate)}
                    </span>
                  ) : null}
                  <span className={`milestone-status status--${milestone.status.toLowerCase()}`}>
                    {milestone.status === 'IN_PROGRESS' ? 'In Progress' : milestone.status}
                  </span>
                </div>
              </div>
              {index < sortedMilestones.length - 1 && (
                <div className={`timeline-connector ${milestone.status === 'COMPLETED' ? 'connector--completed' : ''}`} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Deliverables */}
      <section className="detail-section">
        <div className="section-header">
          <h2 className="section-title">Deliverables</h2>
          {project.deliverables.length > 4 && onViewAllDeliverables && (
            <button type="button" className="view-all-btn" onClick={onViewAllDeliverables}>
              View All ({project.deliverables.length})
            </button>
          )}
        </div>

        {recentDeliverables.length === 0 ? (
          <div className="empty-deliverables">
            <p>No deliverables yet</p>
            <span>Files will appear here as they are uploaded</span>
          </div>
        ) : (
          <div className="deliverables-grid">
            {recentDeliverables.map((deliverable) => (
              <button
                key={deliverable.id}
                type="button"
                className="deliverable-card"
                onClick={() => onDownloadDeliverable(deliverable.id)}
                aria-label={`Download ${deliverable.name}`}
              >
                <div className="deliverable-icon">
                  {getFileIcon(deliverable.fileType)}
                </div>
                <div className="deliverable-info">
                  <span className="deliverable-name">{deliverable.name}</span>
                  <span className="deliverable-meta">
                    {formatFileSize(deliverable.fileSize)} • {deliverable.category}
                  </span>
                </div>
                <span className="download-icon" aria-hidden="true">↓</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Payment Info */}
      {latestPayment && (
        <section className="detail-section payment-section">
          <h2 className="section-title">Payment</h2>
          <div className="payment-card">
            <div className="payment-amount">
              <span className="amount-value">
                ${(latestPayment.amount / 100).toLocaleString()}
              </span>
              <span className="amount-currency">{latestPayment.currency.toUpperCase()}</span>
            </div>
            <div className="payment-status">
              <span className={`payment-badge payment-badge--${latestPayment.status.toLowerCase()}`}>
                {latestPayment.status}
              </span>
              {latestPayment.paidAt && (
                <span className="payment-date">
                  Paid on {formatDate(latestPayment.paidAt)}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Project Info */}
      <section className="detail-section info-section">
        <h2 className="section-title">Project Info</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Created</span>
            <span className="info-value">{formatDate(project.createdAt)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Tier</span>
            <span className="info-value">{tier.name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Status</span>
            <span className="info-value">{status.label}</span>
          </div>
          {project.projectAddress && (
            <div className="info-item info-item--full">
              <span className="info-label">Address</span>
              <span className="info-value">{project.projectAddress}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// File icon helper
function getFileIcon(fileType: string): React.ReactNode {
  const type = fileType.toLowerCase();

  if (type.includes('pdf')) {
    return <span className="file-icon file-icon--pdf">PDF</span>;
  }
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
    return <span className="file-icon file-icon--image">IMG</span>;
  }
  if (type.includes('zip') || type.includes('rar')) {
    return <span className="file-icon file-icon--archive">ZIP</span>;
  }
  if (type.includes('doc') || type.includes('word')) {
    return <span className="file-icon file-icon--doc">DOC</span>;
  }
  return <span className="file-icon file-icon--generic">FILE</span>;
}

export default ProjectDetail;
