/**
 * LeadReviewPanel Component
 * Detailed lead view with intake data, history, and actions.
 */

import React, { JSX } from 'react';
import {
  Lead,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  formatDate,
  formatDateTime,
} from '../../types/admin.types';
import { TIER_NAMES, TIER_PRICES } from '../../types/portal.types';
import './LeadReviewPanel.css';

// ============================================================================
// TYPES
// ============================================================================

interface LeadReviewPanelProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onOverrideTier: () => void;
  onConvert?: () => void;
  onUpdateStatus?: (status: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LeadReviewPanel({
  lead,
  isOpen,
  onClose,
  onOverrideTier,
  onConvert,
  onUpdateStatus,
}: LeadReviewPanelProps): JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div className="lead-panel__overlay" onClick={onClose}>
      <div className="lead-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="lead-panel__header">
          <div className="lead-panel__header-content">
            <h2 className="lead-panel__title">Lead Details</h2>
            <span className={`lead-panel__status ${LEAD_STATUS_COLORS[lead.status]}`}>
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
          </div>
          <button
            className="lead-panel__close"
            onClick={onClose}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="lead-panel__content">
          {/* Contact Information */}
          <section className="lead-panel__section">
            <h3 className="lead-panel__section-title">📧 Contact Information</h3>
            <div className="lead-panel__info-grid">
              <div className="lead-panel__info-item">
                <span className="lead-panel__info-label">Email</span>
                <span className="lead-panel__info-value">{lead.email}</span>
              </div>
              {lead.name && (
                <div className="lead-panel__info-item">
                  <span className="lead-panel__info-label">Name</span>
                  <span className="lead-panel__info-value">{lead.name}</span>
                </div>
              )}
              <div className="lead-panel__info-item lead-panel__info-item--full">
                <span className="lead-panel__info-label">Project Address</span>
                <span className="lead-panel__info-value">{lead.projectAddress}</span>
              </div>
            </div>
          </section>

          {/* Project Details */}
          <section className="lead-panel__section">
            <h3 className="lead-panel__section-title">🏠 Project Details</h3>
            <div className="lead-panel__info-grid">
              {lead.projectType && (
                <div className="lead-panel__info-item">
                  <span className="lead-panel__info-label">Project Type</span>
                  <span className="lead-panel__info-value">{lead.projectType}</span>
                </div>
              )}
              {lead.budgetRange && (
                <div className="lead-panel__info-item">
                  <span className="lead-panel__info-label">Budget Range</span>
                  <span className="lead-panel__info-value">{lead.budgetRange}</span>
                </div>
              )}
              {lead.timeline && (
                <div className="lead-panel__info-item">
                  <span className="lead-panel__info-label">Timeline</span>
                  <span className="lead-panel__info-value">{lead.timeline}</span>
                </div>
              )}
              <div className="lead-panel__info-item">
                <span className="lead-panel__info-label">Has Survey</span>
                <span className="lead-panel__info-value">
                  {lead.hasSurvey ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="lead-panel__info-item">
                <span className="lead-panel__info-label">Has Drawings</span>
                <span className="lead-panel__info-value">
                  {lead.hasDrawings ? '✅ Yes' : '❌ No'}
                </span>
              </div>
            </div>
          </section>

          {/* Tier Recommendation */}
          <section className="lead-panel__section">
            <h3 className="lead-panel__section-title">🎯 Tier Recommendation</h3>
            <div className="lead-panel__tier-card">
              <div className="lead-panel__tier-header">
                <span className={`lead-panel__tier-badge tier-${lead.recommendedTier}`}>
                  {TIER_NAMES[lead.recommendedTier]}
                </span>
                <span className="lead-panel__tier-price">
                  {TIER_PRICES[lead.recommendedTier]}
                </span>
              </div>
              {lead.routingReason && (
                <p className="lead-panel__tier-reason">
                  <strong>Routing Reason:</strong> {lead.routingReason}
                </p>
              )}
              <button
                className="lead-panel__btn lead-panel__btn--secondary"
                onClick={onOverrideTier}
              >
                ⚙️ Override Tier
              </button>
            </div>
          </section>

          {/* Timeline */}
          <section className="lead-panel__section">
            <h3 className="lead-panel__section-title">📅 Timeline</h3>
            <div className="lead-panel__timeline">
              <div className="lead-panel__timeline-item">
                <span className="lead-panel__timeline-label">Created</span>
                <span className="lead-panel__timeline-value">
                  {formatDateTime(lead.createdAt)}
                </span>
              </div>
              <div className="lead-panel__timeline-item">
                <span className="lead-panel__timeline-label">Last Updated</span>
                <span className="lead-panel__timeline-value">
                  {formatDateTime(lead.updatedAt)}
                </span>
              </div>
            </div>
          </section>

          {/* Conversion Status */}
          {lead.isConverted ? (
            <section className="lead-panel__section lead-panel__section--converted">
              <h3 className="lead-panel__section-title">🎉 Converted</h3>
              <p className="lead-panel__converted-text">
                This lead has been converted to a client.
              </p>
              {lead.client && (
                <div className="lead-panel__client-link">
                  <span>Client Status: {lead.client.status}</span>
                </div>
              )}
              {lead.projects.length > 0 && (
                <div className="lead-panel__projects-list">
                  <span className="lead-panel__projects-label">Projects:</span>
                  {lead.projects.map((project) => (
                    <div key={project.id} className="lead-panel__project-item">
                      <span className="lead-panel__project-name">{project.name}</span>
                      <span className="lead-panel__project-status">{project.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="lead-panel__section">
              <h3 className="lead-panel__section-title">📋 Status & Actions</h3>
              {onUpdateStatus && (
                <div className="lead-panel__status-actions">
                  <label className="lead-panel__status-label">Update Status:</label>
                  <div className="lead-panel__status-buttons">
                    {(['NEW', 'QUALIFIED', 'NEEDS_REVIEW', 'CLOSED'] as const).map((status) => (
                      <button
                        key={status}
                        className={`lead-panel__status-btn ${
                          lead.status === status ? 'lead-panel__status-btn--active' : ''
                        }`}
                        onClick={() => onUpdateStatus(status)}
                        disabled={lead.status === status}
                      >
                        {LEAD_STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="lead-panel__footer">
          <button
            className="lead-panel__btn lead-panel__btn--secondary"
            onClick={onClose}
          >
            Close
          </button>
          {!lead.isConverted && onConvert && (
            <button
              className="lead-panel__btn lead-panel__btn--primary"
              onClick={onConvert}
            >
              ✅ Convert to Client
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeadReviewPanel;
