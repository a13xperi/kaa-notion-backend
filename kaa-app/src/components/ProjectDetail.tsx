/**
 * ProjectDetail Component
 * Full project view with milestones timeline, deliverables, and status.
 */

import React, { useState, JSX } from 'react';
import { MilestoneTimeline } from './MilestoneTimeline';
import { DeliverableList } from './DeliverableList';
import {
  ProjectDetail as ProjectDetailType,
  Milestone,
  formatDate,
  formatCurrency,
  TIER_NAMES,
} from '../types/portal.types';
import './ProjectDetail.css';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectDetailProps {
  project: ProjectDetailType;
  onBack?: () => void;
  onMilestoneClick?: (milestone: Milestone) => void;
  onDeliverableDownload?: (id: string) => Promise<void>;
  onDeliverableView?: (id: string) => void;
  isLoading?: boolean;
}

type TabId = 'overview' | 'milestones' | 'deliverables' | 'payments';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  count?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ONBOARDING: 'status-blue',
    IN_PROGRESS: 'status-yellow',
    AWAITING_FEEDBACK: 'status-purple',
    REVISIONS: 'status-yellow',
    DELIVERED: 'status-green',
    CLOSED: 'status-gray',
  };
  return colors[status] || 'status-gray';
}

function getPaymentStatusColor(status: string): string {
  if (status === 'paid') return 'payment-green';
  if (status === 'pending') return 'payment-yellow';
  return 'payment-gray';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProjectDetail({
  project,
  onBack,
  onMilestoneClick,
  onDeliverableDownload,
  onDeliverableView,
  isLoading = false,
}: ProjectDetailProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'milestones', label: 'Milestones', icon: '📋', count: project.milestones.length },
    { id: 'deliverables', label: 'Deliverables', icon: '📁', count: project.deliverables.length },
    { id: 'payments', label: 'Payments', icon: '💳', count: project.payments.history.length },
  ];

  const tierName = TIER_NAMES[project.tier] || `Tier ${project.tier}`;

  if (isLoading) {
    return (
      <div className="project-detail project-detail--loading">
        <div className="project-detail__skeleton" />
      </div>
    );
  }

  return (
    <div className="project-detail">
      {/* Header */}
      <header className="project-detail__header">
        {onBack && (
          <button className="project-detail__back" onClick={onBack}>
            ← Back to Projects
          </button>
        )}

        <div className="project-detail__title-section">
          <h1 className="project-detail__title">{project.name}</h1>
          <div className="project-detail__badges">
            <span className={`project-detail__status ${getStatusColor(project.status)}`}>
              {project.status.replace('_', ' ')}
            </span>
            <span className="project-detail__tier">{tierName}</span>
            <span className={`project-detail__payment ${getPaymentStatusColor(project.paymentStatus)}`}>
              {project.paymentStatus}
            </span>
          </div>
        </div>

        <div className="project-detail__meta">
          <span>Created {formatDate(project.createdAt)}</span>
          <span className="project-detail__separator">•</span>
          <span>Updated {formatDate(project.updatedAt)}</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="project-detail__progress-section">
        <div className="project-detail__progress-header">
          <span className="project-detail__progress-label">Project Progress</span>
          <span className="project-detail__progress-value">{project.progress.percentage}%</span>
        </div>
        <div className="project-detail__progress-bar">
          <div
            className="project-detail__progress-fill"
            style={{ width: `${project.progress.percentage}%` }}
          />
        </div>
        <div className="project-detail__progress-meta">
          <span>
            {project.progress.completed} of {project.progress.total} milestones completed
          </span>
          {project.progress.currentMilestone && (
            <span className="project-detail__current-milestone">
              Current: <strong>{project.progress.currentMilestone.name}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <nav className="project-detail__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`project-detail__tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="project-detail__tab-icon">{tab.icon}</span>
            <span className="project-detail__tab-label">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="project-detail__tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="project-detail__content">
        {activeTab === 'overview' && (
          <div className="project-detail__overview">
            {/* Quick stats */}
            <div className="project-detail__stats">
              <div className="project-detail__stat">
                <span className="project-detail__stat-value">{project.progress.completed}</span>
                <span className="project-detail__stat-label">Milestones Complete</span>
              </div>
              <div className="project-detail__stat">
                <span className="project-detail__stat-value">{project.deliverables.length}</span>
                <span className="project-detail__stat-label">Deliverables</span>
              </div>
              <div className="project-detail__stat">
                <span className="project-detail__stat-value">
                  {formatCurrency(project.payments.totalPaid)}
                </span>
                <span className="project-detail__stat-label">Total Paid</span>
              </div>
            </div>

            {/* Client info */}
            <div className="project-detail__section">
              <h3 className="project-detail__section-title">📍 Project Location</h3>
              <p className="project-detail__address">{project.client.projectAddress}</p>
            </div>

            {/* Lead info */}
            {project.lead && (
              <div className="project-detail__section">
                <h3 className="project-detail__section-title">📝 Project Details</h3>
                <div className="project-detail__lead-info">
                  {project.lead.projectType && (
                    <div className="project-detail__info-row">
                      <span className="project-detail__info-label">Type:</span>
                      <span className="project-detail__info-value">
                        {project.lead.projectType.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  {project.lead.budgetRange && (
                    <div className="project-detail__info-row">
                      <span className="project-detail__info-label">Budget:</span>
                      <span className="project-detail__info-value">{project.lead.budgetRange}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mini timeline */}
            <div className="project-detail__section">
              <h3 className="project-detail__section-title">📋 Timeline Preview</h3>
              <MilestoneTimeline
                milestones={project.milestones.slice(0, 5)}
                onMilestoneClick={onMilestoneClick}
                compact
                showDates={false}
              />
              {project.milestones.length > 5 && (
                <button
                  className="project-detail__view-all"
                  onClick={() => setActiveTab('milestones')}
                >
                  View all {project.milestones.length} milestones →
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'milestones' && (
          <MilestoneTimeline
            milestones={project.milestones}
            projectName={project.name}
            summary={{
              total: project.progress.total,
              completed: project.progress.completed,
              inProgress: project.progress.inProgress || 0,
              pending: project.progress.total - project.progress.completed - (project.progress.inProgress || 0),
              percentage: project.progress.percentage,
            }}
            onMilestoneClick={onMilestoneClick}
          />
        )}

        {activeTab === 'deliverables' && (
          <DeliverableList
            deliverables={project.deliverables.map((d) => ({
              ...d,
              projectId: project.id,
              description: null,
              fileSizeFormatted: '',
              uploadedBy: { id: '', email: null },
            }))}
            projectName={project.name}
            onDownload={onDeliverableDownload}
            onView={onDeliverableView}
            emptyMessage="No deliverables have been uploaded yet"
          />
        )}

        {activeTab === 'payments' && (
          <div className="project-detail__payments">
            <div className="project-detail__payment-summary">
              <div className="project-detail__payment-total">
                <span className="project-detail__payment-total-label">Total Paid</span>
                <span className="project-detail__payment-total-value">
                  {formatCurrency(project.payments.totalPaid)}
                </span>
              </div>
            </div>

            {project.payments.history.length === 0 ? (
              <div className="project-detail__empty">
                <span className="project-detail__empty-icon">💳</span>
                <p>No payment history</p>
              </div>
            ) : (
              <div className="project-detail__payment-list">
                {project.payments.history.map((payment) => (
                  <div key={payment.id} className="project-detail__payment-item">
                    <div className="project-detail__payment-info">
                      <span className="project-detail__payment-amount">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className="project-detail__payment-date">
                        {formatDate(payment.createdAt)}
                      </span>
                    </div>
                    <span
                      className={`project-detail__payment-status ${
                        payment.status === 'SUCCEEDED' ? 'status-green' : 'status-yellow'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectDetail;
