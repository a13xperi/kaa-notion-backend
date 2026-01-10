/**
 * DeliverableCard Component
 * Displays an individual deliverable with thumbnail, name, and download action.
 */

import React, { useState, JSX } from 'react';
import {
  Deliverable,
  DeliverableSummary,
  formatDate,
  formatFileSize,
} from '../types/portal.types';
import './DeliverableCard.css';

// ============================================================================
// TYPES
// ============================================================================

interface DeliverableCardProps {
  deliverable: Deliverable | DeliverableSummary;
  onDownload?: (id: string) => void;
  onView?: (id: string) => void;
  compact?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get file icon based on file type
 */
function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
  if (fileType.includes('dwg') || fileType.includes('acad')) return '📐';
  return '📎';
}

/**
 * Get category badge color
 */
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Document: 'category-blue',
    Photo: 'category-green',
    Rendering: 'category-purple',
    FloorPlan: 'category-orange',
    Invoice: 'category-yellow',
    Contract: 'category-red',
    Other: 'category-gray',
  };
  return colors[category] || 'category-gray';
}

/**
 * Check if file type is previewable
 */
function isPreviewable(fileType: string): boolean {
  return (
    fileType.startsWith('image/') ||
    fileType === 'application/pdf'
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DeliverableCard({
  deliverable,
  onDownload,
  onView,
  compact = false,
}: DeliverableCardProps): JSX.Element {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (onDownload && !isDownloading) {
      setIsDownloading(true);
      try {
        await onDownload(deliverable.id);
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleView = () => {
    if (onView) {
      onView(deliverable.id);
    }
  };

  const fileIcon = getFileIcon(deliverable.fileType);
  const categoryClass = getCategoryColor(deliverable.category);
  const canPreview = isPreviewable(deliverable.fileType);

  // Get file size - handle both formats
  const fileSizeDisplay = 'fileSizeFormatted' in deliverable
    ? deliverable.fileSizeFormatted
    : formatFileSize(deliverable.fileSize);

  if (compact) {
    return (
      <div className="deliverable-card deliverable-card--compact">
        <div className="deliverable-card__icon">{fileIcon}</div>
        <div className="deliverable-card__info">
          <span className="deliverable-card__name" title={deliverable.name}>
            {deliverable.name}
          </span>
          <span className="deliverable-card__meta">
            {fileSizeDisplay}
          </span>
        </div>
        <button
          className="deliverable-card__action"
          onClick={handleDownload}
          disabled={isDownloading}
          aria-label={`Download ${deliverable.name}`}
        >
          {isDownloading ? '⏳' : '⬇️'}
        </button>
      </div>
    );
  }

  return (
    <div className="deliverable-card">
      {/* Thumbnail/Icon */}
      <div className="deliverable-card__thumbnail">
        <span className="deliverable-card__file-icon">{fileIcon}</span>
      </div>

      {/* Content */}
      <div className="deliverable-card__content">
        <div className="deliverable-card__header">
          <h4 className="deliverable-card__name" title={deliverable.name}>
            {deliverable.name}
          </h4>
          <span className={`deliverable-card__category ${categoryClass}`}>
            {deliverable.category}
          </span>
        </div>

        {'description' in deliverable && deliverable.description && (
          <p className="deliverable-card__description">
            {deliverable.description}
          </p>
        )}

        <div className="deliverable-card__meta">
          <span className="deliverable-card__size">{fileSizeDisplay}</span>
          <span className="deliverable-card__separator">•</span>
          <span className="deliverable-card__date">
            {formatDate(deliverable.createdAt)}
          </span>
        </div>

        {'uploadedBy' in deliverable && deliverable.uploadedBy.email && (
          <div className="deliverable-card__uploader">
            Uploaded by {deliverable.uploadedBy.email}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="deliverable-card__actions">
        {canPreview && onView && (
          <button
            className="deliverable-card__btn deliverable-card__btn--view"
            onClick={handleView}
            aria-label={`Preview ${deliverable.name}`}
          >
            👁️ Preview
          </button>
        )}
        <button
          className="deliverable-card__btn deliverable-card__btn--download"
          onClick={handleDownload}
          disabled={isDownloading}
          aria-label={`Download ${deliverable.name}`}
        >
          {isDownloading ? '⏳ Downloading...' : '⬇️ Download'}
        </button>
      </div>
    </div>
  );
}

export default DeliverableCard;
