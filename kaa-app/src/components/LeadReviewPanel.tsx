import React from 'react';
import './LeadReviewPanel.css';

// Types
export interface LeadDetail {
  id: string;
  email: string;
  fullName: string | null;
  companyName: string | null;
  phone: string | null;
  status: string;

  // Intake form data
  budgetRange: string | null;
  timeline: string | null;
  projectType: string | null;
  projectAddress: string | null;
  propertySize: string | null;
  hasSurvey: boolean | null;
  hasDrawings: boolean | null;
  additionalNotes: string | null;

  // Tier recommendation
  recommendedTier: number | null;
  tierName: string | null;
  tierConfidence: number | null;
  tierReason: string | null;
  tierFactors: TierFactor[] | null;
  needsManualReview: boolean;
  tierOverrideReason: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface TierFactor {
  factor: string;
  value: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
}

export interface LeadReviewPanelProps {
  lead: LeadDetail;
  isLoading?: boolean;
  onClose?: () => void;
  onStatusChange?: (status: string) => void;
  onTierOverride?: () => void;
  onConvert?: () => void;
  onContact?: () => void;
}

// Lead statuses with metadata
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; nextActions: string[] }> = {
  NEW: { label: 'New', color: '#1d4ed8', bgColor: '#dbeafe', nextActions: ['CONTACTED', 'QUALIFIED', 'CLOSED'] },
  CONTACTED: { label: 'Contacted', color: '#7c3aed', bgColor: '#ede9fe', nextActions: ['QUALIFIED', 'NURTURE', 'CLOSED'] },
  QUALIFIED: { label: 'Qualified', color: '#047857', bgColor: '#d1fae5', nextActions: ['CONVERTED', 'NURTURE', 'CLOSED'] },
  CONVERTED: { label: 'Converted', color: '#15803d', bgColor: '#dcfce7', nextActions: [] },
  CLOSED: { label: 'Closed', color: '#6b7280', bgColor: '#f3f4f6', nextActions: ['NEW', 'NURTURE'] },
  NURTURE: { label: 'Nurture', color: '#d97706', bgColor: '#fef3c7', nextActions: ['CONTACTED', 'QUALIFIED', 'CLOSED'] },
};

// Tier info
const TIER_INFO: Record<number, { name: string; price: string; color: string; bgColor: string }> = {
  1: { name: 'Seedling', price: '$500', color: '#22c55e', bgColor: '#f0fdf4' },
  2: { name: 'Sprout', price: '$1,500', color: '#10b981', bgColor: '#ecfdf5' },
  3: { name: 'Canopy', price: '$3,500', color: '#0d9488', bgColor: '#f0fdfa' },
  4: { name: 'Forest', price: 'Custom', color: '#f59e0b', bgColor: '#fef3c7' },
};

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateString);
}

// Icons
const CloseIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MailIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const PhoneIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const BuildingIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18z" />
    <path d="M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2" />
    <path d="M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2" />
    <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
  </svg>
);

const MapPinIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const EditIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// Section Component
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="panel-section">
    <h3 className="section-title">{title}</h3>
    <div className="section-content">{children}</div>
  </div>
);

// Info Row Component
const InfoRow: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({
  label,
  value,
  icon
}) => (
  <div className="info-row">
    {icon && <span className="info-icon">{icon}</span>}
    <span className="info-label">{label}</span>
    <span className="info-value">{value || '—'}</span>
  </div>
);

// Confidence Meter Component
const ConfidenceMeter: React.FC<{ confidence: number }> = ({ confidence }) => {
  const percentage = Math.round(confidence * 100);
  const level = percentage >= 80 ? 'high' : percentage >= 60 ? 'medium' : 'low';

  return (
    <div className="confidence-meter">
      <div className="confidence-bar">
        <div
          className={`confidence-fill confidence-fill--${level}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`confidence-label confidence-label--${level}`}>
        {percentage}% confidence
      </span>
    </div>
  );
};

// Factor Tag Component
const FactorTag: React.FC<{ factor: TierFactor }> = ({ factor }) => (
  <div className={`factor-tag factor-tag--${factor.impact}`}>
    <span className="factor-name">{factor.factor}</span>
    <span className="factor-value">{factor.value}</span>
  </div>
);

// Loading Skeleton
const PanelSkeleton: React.FC = () => (
  <div className="lead-review-panel lead-review-panel--loading">
    <div className="panel-header">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-subtitle" />
    </div>
    <div className="panel-body">
      <div className="skeleton skeleton-section" />
      <div className="skeleton skeleton-section" />
      <div className="skeleton skeleton-section" />
    </div>
  </div>
);

// Main Component
const LeadReviewPanel: React.FC<LeadReviewPanelProps> = ({
  lead,
  isLoading = false,
  onClose,
  onStatusChange,
  onTierOverride,
  onConvert,
  onContact,
}) => {
  if (isLoading) {
    return <PanelSkeleton />;
  }

  const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.NEW;
  const tierInfo = lead.recommendedTier ? TIER_INFO[lead.recommendedTier] : null;
  const canConvert = lead.status === 'QUALIFIED' && lead.recommendedTier;

  return (
    <div className="lead-review-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-content">
          <div className="header-top">
            <span
              className="status-badge"
              style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
            >
              {statusConfig.label}
            </span>
            <span className="lead-date" title={formatDate(lead.createdAt)}>
              {formatRelativeTime(lead.createdAt)}
            </span>
          </div>
          <h2 className="lead-name">{lead.fullName || 'Unknown'}</h2>
          <div className="lead-contact">
            <a href={`mailto:${lead.email}`} className="contact-link">
              <MailIcon />
              {lead.email}
            </a>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="contact-link">
                <PhoneIcon />
                {lead.phone}
              </a>
            )}
          </div>
        </div>
        {onClose && (
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close panel">
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="panel-body">
        {/* Tier Recommendation */}
        <Section title="Tier Recommendation">
          {tierInfo ? (
            <div className="tier-recommendation">
              <div
                className="tier-card"
                style={{ borderColor: tierInfo.color, backgroundColor: tierInfo.bgColor }}
              >
                <div className="tier-card-header">
                  <span className="tier-name" style={{ color: tierInfo.color }}>
                    {tierInfo.name}
                  </span>
                  <span className="tier-price">{tierInfo.price}</span>
                </div>
                {lead.tierConfidence !== null && (
                  <ConfidenceMeter confidence={lead.tierConfidence} />
                )}
                {lead.needsManualReview && (
                  <div className="manual-review-badge">
                    <AlertIcon />
                    Needs Manual Review
                  </div>
                )}
              </div>

              {lead.tierReason && (
                <p className="tier-reason">{lead.tierReason}</p>
              )}

              {lead.tierOverrideReason && (
                <div className="tier-override-info">
                  <span className="override-label">Override reason:</span>
                  <span className="override-reason">{lead.tierOverrideReason}</span>
                </div>
              )}

              {lead.tierFactors && lead.tierFactors.length > 0 && (
                <div className="tier-factors">
                  <span className="factors-label">Factors:</span>
                  <div className="factors-list">
                    {lead.tierFactors.map((factor, idx) => (
                      <FactorTag key={idx} factor={factor} />
                    ))}
                  </div>
                </div>
              )}

              {onTierOverride && (
                <button type="button" className="override-btn" onClick={onTierOverride}>
                  <EditIcon />
                  Override Tier
                </button>
              )}
            </div>
          ) : (
            <p className="no-tier-message">No tier recommendation available</p>
          )}
        </Section>

        {/* Intake Data */}
        <Section title="Project Details">
          <div className="info-grid">
            <InfoRow label="Budget Range" value={lead.budgetRange} />
            <InfoRow label="Timeline" value={lead.timeline} />
            <InfoRow label="Project Type" value={lead.projectType} />
            <InfoRow label="Property Size" value={lead.propertySize} />
          </div>

          {lead.projectAddress && (
            <div className="address-info">
              <MapPinIcon />
              <span>{lead.projectAddress}</span>
            </div>
          )}

          <div className="asset-checks">
            <div className={`asset-check ${lead.hasSurvey ? 'asset-check--yes' : 'asset-check--no'}`}>
              {lead.hasSurvey ? <CheckIcon /> : <span className="check-x">×</span>}
              Has Survey
            </div>
            <div className={`asset-check ${lead.hasDrawings ? 'asset-check--yes' : 'asset-check--no'}`}>
              {lead.hasDrawings ? <CheckIcon /> : <span className="check-x">×</span>}
              Has Drawings
            </div>
          </div>

          {lead.additionalNotes && (
            <div className="notes-section">
              <span className="notes-label">Additional Notes:</span>
              <p className="notes-content">{lead.additionalNotes}</p>
            </div>
          )}
        </Section>

        {/* Company Info */}
        {lead.companyName && (
          <Section title="Company">
            <div className="company-info">
              <BuildingIcon />
              <span>{lead.companyName}</span>
            </div>
          </Section>
        )}

        {/* Status Actions */}
        {onStatusChange && statusConfig.nextActions.length > 0 && (
          <Section title="Change Status">
            <div className="status-actions">
              {statusConfig.nextActions.map((status) => {
                const config = STATUS_CONFIG[status];
                return (
                  <button
                    key={status}
                    type="button"
                    className="status-action-btn"
                    onClick={() => onStatusChange(status)}
                    style={{ borderColor: config.color, color: config.color }}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </Section>
        )}
      </div>

      {/* Footer Actions */}
      <div className="panel-footer">
        {onContact && (
          <button type="button" className="action-btn action-btn--secondary" onClick={onContact}>
            <MailIcon />
            Contact
          </button>
        )}
        {canConvert && onConvert && (
          <button type="button" className="action-btn action-btn--primary" onClick={onConvert}>
            <CheckIcon />
            Convert to Client
          </button>
        )}
      </div>
    </div>
  );
};

export default LeadReviewPanel;
