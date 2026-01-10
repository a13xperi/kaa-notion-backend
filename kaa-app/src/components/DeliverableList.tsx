import React, { useState, useMemo } from 'react';
import './DeliverableList.css';

// Types
export interface Deliverable {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  category?: string | null;
  description?: string | null;
  uploadedAt: string;
  milestoneId?: string | null;
  milestoneName?: string | null;
  thumbnailUrl?: string | null;
}

export interface DeliverableListProps {
  deliverables: Deliverable[];
  viewMode?: 'grid' | 'list';
  groupBy?: 'none' | 'category' | 'milestone';
  onDownload: (deliverableId: string) => void;
  onPreview?: (deliverable: Deliverable) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  showViewToggle?: boolean;
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
  color: string;
  bgColor: string;
}

function getFileTypeInfo(fileType: string): FileTypeInfo {
  const type = fileType.toLowerCase();

  if (type.includes('pdf')) {
    return { label: 'PDF', color: '#dc2626', bgColor: '#fee2e2' };
  }
  if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].some(ext => type.includes(ext))) {
    return { label: 'IMG', color: '#2563eb', bgColor: '#dbeafe' };
  }
  if (type.includes('zip') || type.includes('rar') || type.includes('7z') || type.includes('tar')) {
    return { label: 'ZIP', color: '#d97706', bgColor: '#fef3c7' };
  }
  if (type.includes('doc') || type.includes('word')) {
    return { label: 'DOC', color: '#1d4ed8', bgColor: '#dbeafe' };
  }
  if (type.includes('xls') || type.includes('excel') || type.includes('spreadsheet')) {
    return { label: 'XLS', color: '#047857', bgColor: '#d1fae5' };
  }
  if (type.includes('ppt') || type.includes('presentation')) {
    return { label: 'PPT', color: '#ea580c', bgColor: '#ffedd5' };
  }
  if (type.includes('dwg') || type.includes('dxf') || type.includes('cad')) {
    return { label: 'CAD', color: '#7c3aed', bgColor: '#ede9fe' };
  }
  if (type.includes('video') || ['mp4', 'mov', 'avi', 'webm'].some(ext => type.includes(ext))) {
    return { label: 'VID', color: '#be185d', bgColor: '#fce7f3' };
  }

  return { label: 'FILE', color: '#6b7280', bgColor: '#e5e7eb' };
}

// File icon component
const FileIcon: React.FC<{ fileType: string; size?: 'sm' | 'md' | 'lg' }> = ({
  fileType,
  size = 'md',
}) => {
  const { label, color, bgColor } = getFileTypeInfo(fileType);

  return (
    <div
      className={`file-icon file-icon--${size}`}
      style={{ backgroundColor: bgColor, color }}
    >
      {label}
    </div>
  );
};

// Single deliverable item for list view
const DeliverableListItem: React.FC<{
  deliverable: Deliverable;
  onDownload: () => void;
  onPreview?: () => void;
}> = ({ deliverable, onDownload, onPreview }) => {
  const { label } = getFileTypeInfo(deliverable.fileType);

  return (
    <div className="deliverable-list-item">
      <div className="item-icon">
        <FileIcon fileType={deliverable.fileType} size="md" />
      </div>

      <div className="item-info">
        <h4 className="item-name">{deliverable.name}</h4>
        <div className="item-meta">
          <span className="meta-type">{label}</span>
          <span className="meta-separator">·</span>
          <span className="meta-size">{formatFileSize(deliverable.fileSize)}</span>
          <span className="meta-separator">·</span>
          <span className="meta-date">{formatDate(deliverable.uploadedAt)}</span>
        </div>
        {deliverable.description && (
          <p className="item-description">{deliverable.description}</p>
        )}
      </div>

      <div className="item-actions">
        {onPreview && (
          <button
            type="button"
            className="action-btn action-btn--preview"
            onClick={onPreview}
            aria-label={`Preview ${deliverable.name}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="action-btn action-btn--download"
          onClick={onDownload}
          aria-label={`Download ${deliverable.name}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Single deliverable card for grid view
const DeliverableGridCard: React.FC<{
  deliverable: Deliverable;
  onDownload: () => void;
  onPreview?: () => void;
}> = ({ deliverable, onDownload, onPreview }) => {
  const isImage = deliverable.fileType.toLowerCase().includes('image') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext =>
      deliverable.fileType.toLowerCase().includes(ext)
    );

  return (
    <div className="deliverable-grid-card">
      <div
        className="card-thumbnail"
        onClick={onPreview}
        role={onPreview ? 'button' : undefined}
        tabIndex={onPreview ? 0 : undefined}
      >
        {deliverable.thumbnailUrl && isImage ? (
          <img
            src={deliverable.thumbnailUrl}
            alt={deliverable.name}
            className="thumbnail-image"
          />
        ) : (
          <FileIcon fileType={deliverable.fileType} size="lg" />
        )}
        {onPreview && (
          <div className="thumbnail-overlay">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        )}
      </div>

      <div className="card-content">
        <h4 className="card-name" title={deliverable.name}>{deliverable.name}</h4>
        <div className="card-meta">
          <span>{formatFileSize(deliverable.fileSize)}</span>
          <span className="meta-separator">·</span>
          <span>{formatDate(deliverable.uploadedAt)}</span>
        </div>
      </div>

      <button
        type="button"
        className="card-download-btn"
        onClick={onDownload}
        aria-label={`Download ${deliverable.name}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        <span>Download</span>
      </button>
    </div>
  );
};

// Group header component
const GroupHeader: React.FC<{ title: string; count: number }> = ({ title, count }) => (
  <div className="deliverable-group-header">
    <h3 className="group-title">{title}</h3>
    <span className="group-count">{count} file{count !== 1 ? 's' : ''}</span>
  </div>
);

// Loading skeleton
const LoadingSkeleton: React.FC<{ viewMode: 'grid' | 'list' }> = ({ viewMode }) => {
  const items = Array.from({ length: 6 }, (_, i) => i);

  if (viewMode === 'grid') {
    return (
      <div className="deliverable-grid">
        {items.map((i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton skeleton-thumbnail" />
            <div className="skeleton skeleton-name" />
            <div className="skeleton skeleton-meta" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="deliverable-list">
      {items.map((i) => (
        <div key={i} className="skeleton-list-item">
          <div className="skeleton skeleton-icon" />
          <div className="skeleton-info">
            <div className="skeleton skeleton-name" />
            <div className="skeleton skeleton-meta" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Empty state
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="deliverable-empty">
    <div className="empty-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    </div>
    <p className="empty-text">{message}</p>
  </div>
);

// Main component
const DeliverableList: React.FC<DeliverableListProps> = ({
  deliverables,
  viewMode: initialViewMode = 'grid',
  groupBy = 'none',
  onDownload,
  onPreview,
  isLoading = false,
  emptyMessage = 'No deliverables yet',
  showViewToggle = true,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);

  // Group deliverables
  const groupedDeliverables = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', title: '', items: deliverables }];
    }

    const groups = new Map<string, Deliverable[]>();
    const ungrouped: Deliverable[] = [];

    deliverables.forEach((d) => {
      let groupKey: string | null = null;

      if (groupBy === 'category') {
        groupKey = d.category || null;
      } else if (groupBy === 'milestone') {
        groupKey = d.milestoneName || null;
      }

      if (groupKey) {
        const existing = groups.get(groupKey) || [];
        groups.set(groupKey, [...existing, d]);
      } else {
        ungrouped.push(d);
      }
    });

    const result = Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, title: key, items }));

    if (ungrouped.length > 0) {
      result.push({ key: 'other', title: 'Other', items: ungrouped });
    }

    return result;
  }, [deliverables, groupBy]);

  // Total count
  const totalCount = deliverables.length;

  if (isLoading) {
    return (
      <div className="deliverable-list-container">
        <LoadingSkeleton viewMode={viewMode} />
      </div>
    );
  }

  if (deliverables.length === 0) {
    return (
      <div className="deliverable-list-container">
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="deliverable-list-container">
      {/* Header with view toggle */}
      {showViewToggle && (
        <div className="deliverable-list-header">
          <span className="total-count">
            {totalCount} deliverable{totalCount !== 1 ? 's' : ''}
          </span>
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'grid' ? 'toggle-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'list' ? 'toggle-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="4" width="18" height="4" rx="1" />
                <rect x="3" y="10" width="18" height="4" rx="1" />
                <rect x="3" y="16" width="18" height="4" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Grouped content */}
      {groupedDeliverables.map((group) => (
        <div key={group.key} className="deliverable-group">
          {group.title && groupBy !== 'none' && (
            <GroupHeader title={group.title} count={group.items.length} />
          )}

          {viewMode === 'grid' ? (
            <div className="deliverable-grid">
              {group.items.map((deliverable) => (
                <DeliverableGridCard
                  key={deliverable.id}
                  deliverable={deliverable}
                  onDownload={() => onDownload(deliverable.id)}
                  onPreview={onPreview ? () => onPreview(deliverable) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="deliverable-list">
              {group.items.map((deliverable) => (
                <DeliverableListItem
                  key={deliverable.id}
                  deliverable={deliverable}
                  onDownload={() => onDownload(deliverable.id)}
                  onPreview={onPreview ? () => onPreview(deliverable) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DeliverableList;
