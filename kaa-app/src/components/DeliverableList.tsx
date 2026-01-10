/**
 * DeliverableList Component
 * Grid/list view of project deliverables with filtering and download buttons.
 */

import React, { useState, useMemo, JSX } from 'react';
import { DeliverableCard } from './DeliverableCard';
import {
  Deliverable,
  DeliverableCategory,
  formatFileSize,
} from '../types/portal.types';
import './DeliverableList.css';

// ============================================================================
// TYPES
// ============================================================================

interface DeliverableListProps {
  deliverables: Deliverable[];
  projectName?: string;
  summary?: {
    total: number;
    byCategory: Record<string, number>;
    totalSize: number;
    totalSizeFormatted: string;
  };
  onDownload?: (id: string) => Promise<void>;
  onView?: (id: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

type ViewMode = 'grid' | 'list';

const CATEGORIES: DeliverableCategory[] = [
  'Document',
  'Photo',
  'Rendering',
  'FloorPlan',
  'Invoice',
  'Contract',
  'Other',
];

// ============================================================================
// COMPONENT
// ============================================================================

export function DeliverableList({
  deliverables,
  projectName,
  summary,
  onDownload,
  onView,
  isLoading = false,
  emptyMessage = 'No deliverables yet',
}: DeliverableListProps): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter deliverables
  const filteredDeliverables = useMemo(() => {
    return deliverables.filter((d) => {
      // Category filter
      if (selectedCategory !== 'all' && d.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(query) ||
          (d.description?.toLowerCase().includes(query) ?? false)
        );
      }
      return true;
    });
  }, [deliverables, selectedCategory, searchQuery]);

  // Get available categories from deliverables
  const availableCategories = useMemo(() => {
    const categories = new Set(deliverables.map((d) => d.category));
    return CATEGORIES.filter((c) => categories.has(c));
  }, [deliverables]);

  if (isLoading) {
    return (
      <div className="deliverable-list deliverable-list--loading">
        <div className="deliverable-list__skeleton">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="deliverable-list__skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="deliverable-list">
      {/* Header */}
      <div className="deliverable-list__header">
        <div className="deliverable-list__title-section">
          <h3 className="deliverable-list__title">
            📁 Deliverables
            {projectName && <span className="deliverable-list__project"> — {projectName}</span>}
          </h3>
          {summary && (
            <div className="deliverable-list__summary">
              <span className="deliverable-list__count">
                {summary.total} file{summary.total !== 1 ? 's' : ''}
              </span>
              <span className="deliverable-list__separator">•</span>
              <span className="deliverable-list__size">
                {summary.totalSizeFormatted}
              </span>
            </div>
          )}
        </div>

        <div className="deliverable-list__controls">
          {/* Search */}
          <div className="deliverable-list__search">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="deliverable-list__search-input"
              aria-label="Search deliverables"
            />
            {searchQuery && (
              <button
                className="deliverable-list__search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="deliverable-list__view-toggle">
            <button
              className={`deliverable-list__view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              ▦
            </button>
            <button
              className={`deliverable-list__view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Category filters */}
      {availableCategories.length > 1 && (
        <div className="deliverable-list__filters">
          <button
            className={`deliverable-list__filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All ({deliverables.length})
          </button>
          {availableCategories.map((category) => (
            <button
              key={category}
              className={`deliverable-list__filter-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category} ({summary?.byCategory[category] || 0})
            </button>
          ))}
        </div>
      )}

      {/* Deliverables grid/list */}
      {filteredDeliverables.length === 0 ? (
        <div className="deliverable-list__empty">
          <div className="deliverable-list__empty-icon">📭</div>
          <p className="deliverable-list__empty-text">
            {searchQuery || selectedCategory !== 'all'
              ? 'No deliverables match your filters'
              : emptyMessage}
          </p>
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              className="deliverable-list__empty-reset"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className={`deliverable-list__grid deliverable-list__grid--${viewMode}`}>
          {filteredDeliverables.map((deliverable) => (
            <DeliverableCard
              key={deliverable.id}
              deliverable={deliverable}
              onDownload={onDownload}
              onView={onView}
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      )}

      {/* Download all button */}
      {filteredDeliverables.length > 1 && onDownload && (
        <div className="deliverable-list__footer">
          <button
            className="deliverable-list__download-all"
            onClick={() => {
              // TODO: Implement batch download
              alert('Batch download coming soon!');
            }}
          >
            ⬇️ Download All ({filteredDeliverables.length} files)
          </button>
        </div>
      )}
    </div>
  );
}

export default DeliverableList;
