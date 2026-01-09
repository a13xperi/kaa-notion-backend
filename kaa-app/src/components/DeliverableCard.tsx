import React, { useState } from 'react';
import './DeliverableCard.css';

// Types
export interface DeliverableCardData {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  category?: string | null;
  description?: string | null;
  uploadedAt: string;
  thumbnailUrl?: string | null;
  milestoneName?: string | null;
}

export interface DeliverableCardProps {
  deliverable: DeliverableCardData;
  onDownload: (id: string) => void;
  onPreview?: (deliverable: DeliverableCardData) => void;
  variant?: 'default' | 'compact' | 'featured';
  showCategory?: boolean;
  showMilestone?: boolean;
  showDescription?: boolean;
  isDownloading?: boolean;
}

// File size formatter
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Get file type info
interface FileTypeInfo {
  label: string;
  extension: string;
  color: string;
  bgColor: string;
  isImage: boolean;
  isPreviewable: boolean;
}

function getFileTypeInfo(fileType: string): FileTypeInfo {
  const type = fileType.toLowerCase();

  if (type.includes('pdf')) {
    return { label: 'PDF', extension: 'pdf', color: '#dc2626', bgColor: '#fee2e2', isImage: false, isPreviewable: true };
  }
  if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].some(ext => type.includes(ext))) {
    const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].find(e => type.includes(e)) || 'img';
    return { label: ext.toUpperCase(), extension: ext, color: '#2563eb', bgColor: '#dbeafe', isImage: true, isPreviewable: true };
  }
  if (type.includes('zip') || type.includes('rar') || type.includes('7z') || type.includes('tar')) {
    return { label: 'ZIP', extension: 'zip', color: '#d97706', bgColor: '#fef3c7', isImage: false, isPreviewable: false };
  }
  if (type.includes('doc') || type.includes('word')) {
    return { label: 'DOC', extension: 'doc', color: '#1d4ed8', bgColor: '#dbeafe', isImage: false, isPreviewable: false };
  }
  if (type.includes('xls') || type.includes('excel') || type.includes('spreadsheet')) {
    return { label: 'XLS', extension: 'xls', color: '#047857', bgColor: '#d1fae5', isImage: false, isPreviewable: false };
  }
  if (type.includes('ppt') || type.includes('presentation')) {
    return { label: 'PPT', extension: 'ppt', color: '#ea580c', bgColor: '#ffedd5', isImage: false, isPreviewable: false };
  }
  if (type.includes('dwg') || type.includes('dxf') || type.includes('cad')) {
    return { label: 'CAD', extension: 'dwg', color: '#7c3aed', bgColor: '#ede9fe', isImage: false, isPreviewable: false };
  }
  if (type.includes('video') || ['mp4', 'mov', 'avi', 'webm'].some(ext => type.includes(ext))) {
    return { label: 'VID', extension: 'mp4', color: '#be185d', bgColor: '#fce7f3', isImage: false, isPreviewable: true };
  }

  return { label: 'FILE', extension: 'file', color: '#6b7280', bgColor: '#e5e7eb', isImage: false, isPreviewable: false };
}

// File type icon component
const FileTypeIcon: React.FC<{ fileType: string; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({
  fileType,
  size = 'md',
}) => {
  const { label, color, bgColor } = getFileTypeInfo(fileType);

  return (
    <div
      className={`deliverable-file-icon deliverable-file-icon--${size}`}
      style={{ backgroundColor: bgColor, color }}
    >
      <span className="file-icon-label">{label}</span>
    </div>
  );
};

// Download icon
const DownloadIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// Preview icon
const PreviewIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// Loading spinner
const Spinner: React.FC = () => (
  <div className="deliverable-spinner" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0110 10" strokeLinecap="round" />
    </svg>
  </div>
);

const DeliverableCard: React.FC<DeliverableCardProps> = ({
  deliverable,
  onDownload,
  onPreview,
  variant = 'default',
  showCategory = false,
  showMilestone = false,
  showDescription = false,
  isDownloading = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const fileInfo = getFileTypeInfo(deliverable.fileType);
  const canPreview = fileInfo.isPreviewable && onPreview;
  const hasThumbnail = deliverable.thumbnailUrl && fileInfo.isImage && !imageError;

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDownloading) {
      onDownload(deliverable.id);
    }
  };

  const handlePreviewClick = () => {
    if (onPreview) {
      onPreview(deliverable);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (canPreview) {
        handlePreviewClick();
      }
    }
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className="deliverable-card deliverable-card--compact">
        <div className="compact-icon">
          <FileTypeIcon fileType={deliverable.fileType} size="sm" />
        </div>
        <div className="compact-info">
          <span className="compact-name" title={deliverable.name}>
            {deliverable.name}
          </span>
          <span className="compact-size">{formatFileSize(deliverable.fileSize)}</span>
        </div>
        <button
          type="button"
          className="compact-download"
          onClick={handleDownloadClick}
          disabled={isDownloading}
          aria-label={`Download ${deliverable.name}`}
        >
          {isDownloading ? <Spinner /> : <DownloadIcon />}
        </button>
      </div>
    );
  }

  // Featured variant
  if (variant === 'featured') {
    return (
      <div className="deliverable-card deliverable-card--featured">
        <div
          className={`featured-thumbnail ${canPreview ? 'featured-thumbnail--clickable' : ''}`}
          onClick={canPreview ? handlePreviewClick : undefined}
          onKeyDown={canPreview ? handleKeyDown : undefined}
          role={canPreview ? 'button' : undefined}
          tabIndex={canPreview ? 0 : undefined}
          aria-label={canPreview ? `Preview ${deliverable.name}` : undefined}
        >
          {hasThumbnail ? (
            <img
              src={deliverable.thumbnailUrl!}
              alt={deliverable.name}
              className="featured-image"
              onError={() => setImageError(true)}
            />
          ) : (
            <FileTypeIcon fileType={deliverable.fileType} size="xl" />
          )}
          {canPreview && (
            <div className="featured-overlay">
              <PreviewIcon />
              <span>Preview</span>
            </div>
          )}
        </div>

        <div className="featured-content">
          <div className="featured-header">
            {(showCategory && deliverable.category) || (showMilestone && deliverable.milestoneName) ? (
              <div className="featured-badges">
                {showCategory && deliverable.category && (
                  <span className="featured-badge featured-badge--category">
                    {deliverable.category}
                  </span>
                )}
                {showMilestone && deliverable.milestoneName && (
                  <span className="featured-badge featured-badge--milestone">
                    {deliverable.milestoneName}
                  </span>
                )}
              </div>
            ) : null}
            <h3 className="featured-name">{deliverable.name}</h3>
          </div>

          {showDescription && deliverable.description && (
            <p className="featured-description">{deliverable.description}</p>
          )}

          <div className="featured-meta">
            <span className="meta-item">
              <span className="meta-label">{fileInfo.label}</span>
            </span>
            <span className="meta-separator">·</span>
            <span className="meta-item">{formatFileSize(deliverable.fileSize)}</span>
            <span className="meta-separator">·</span>
            <span className="meta-item">{formatDate(deliverable.uploadedAt)}</span>
          </div>

          <button
            type="button"
            className="featured-download-btn"
            onClick={handleDownloadClick}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <Spinner />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <DownloadIcon />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="deliverable-card deliverable-card--default">
      <div
        className={`card-thumbnail ${canPreview ? 'card-thumbnail--clickable' : ''}`}
        onClick={canPreview ? handlePreviewClick : undefined}
        onKeyDown={canPreview ? handleKeyDown : undefined}
        role={canPreview ? 'button' : undefined}
        tabIndex={canPreview ? 0 : undefined}
        aria-label={canPreview ? `Preview ${deliverable.name}` : undefined}
      >
        {hasThumbnail ? (
          <img
            src={deliverable.thumbnailUrl!}
            alt={deliverable.name}
            className="thumbnail-image"
            onError={() => setImageError(true)}
          />
        ) : (
          <FileTypeIcon fileType={deliverable.fileType} size="lg" />
        )}
        {canPreview && (
          <div className="thumbnail-overlay">
            <PreviewIcon />
          </div>
        )}
      </div>

      <div className="card-body">
        <div className="card-info">
          {(showCategory && deliverable.category) || (showMilestone && deliverable.milestoneName) ? (
            <div className="card-badges">
              {showCategory && deliverable.category && (
                <span className="card-badge">{deliverable.category}</span>
              )}
              {showMilestone && deliverable.milestoneName && (
                <span className="card-badge">{deliverable.milestoneName}</span>
              )}
            </div>
          ) : null}
          <h4 className="card-name" title={deliverable.name}>
            {deliverable.name}
          </h4>
          <div className="card-meta">
            <span>{formatFileSize(deliverable.fileSize)}</span>
            <span className="meta-dot">·</span>
            <span>{formatDate(deliverable.uploadedAt)}</span>
          </div>
        </div>

        <button
          type="button"
          className="card-download-btn"
          onClick={handleDownloadClick}
          disabled={isDownloading}
          aria-label={`Download ${deliverable.name}`}
        >
          {isDownloading ? <Spinner /> : <DownloadIcon />}
          <span>Download</span>
        </button>
      </div>
    </div>
  );
};

export default DeliverableCard;
