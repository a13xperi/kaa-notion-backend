import React, { useState } from 'react';
import './ProjectsTable.css';

// Types
export interface Project {
  id: string;
  name: string;
  tier: number;
  tierName: string;
  status: string;
  progress: number;
  completedMilestones: number;
  totalMilestones: number;
  deliverableCount: number;
  clientEmail: string | null;
  clientName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsTableProps {
  projects: Project[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onStatusChange?: (projectId: string, newStatus: string) => void;
  onProjectClick?: (project: Project) => void;
  onSearch?: (query: string) => void;
  onFilterStatus?: (status: string | null) => void;
  onFilterTier?: (tier: number | null) => void;
}

// Project statuses
const PROJECT_STATUSES = [
  'INTAKE',
  'ONBOARDING',
  'IN_PROGRESS',
  'AWAITING_FEEDBACK',
  'REVISIONS',
  'DELIVERED',
  'CLOSED',
] as const;

// Tier names
const TIER_NAMES: Record<number, string> = {
  1: 'Seedling',
  2: 'Sprout',
  3: 'Canopy',
  4: 'Forest',
};

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

// Status colors
function getStatusColor(status: string): { bg: string; text: string } {
  const colors: Record<string, { bg: string; text: string }> = {
    INTAKE: { bg: '#f3f4f6', text: '#374151' },
    ONBOARDING: { bg: '#dbeafe', text: '#1d4ed8' },
    IN_PROGRESS: { bg: '#fef3c7', text: '#d97706' },
    AWAITING_FEEDBACK: { bg: '#fce7f3', text: '#be185d' },
    REVISIONS: { bg: '#fee2e2', text: '#dc2626' },
    DELIVERED: { bg: '#d1fae5', text: '#047857' },
    CLOSED: { bg: '#e5e7eb', text: '#6b7280' },
  };
  return colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
}

// Tier color
function getTierColor(tier: number): string {
  const colors: Record<number, string> = {
    1: '#22c55e',
    2: '#10b981',
    3: '#0d9488',
    4: '#f59e0b',
  };
  return colors[tier] || '#6b7280';
}

// Format status for display
function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

// Icons
const SearchIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const ChevronIcon: React.FC<{ direction: 'left' | 'right' }> = ({ direction }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {direction === 'left' ? (
      <polyline points="15 18 9 12 15 6" />
    ) : (
      <polyline points="9 18 15 12 9 6" />
    )}
  </svg>
);

const FolderIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
);

const FileIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// Progress Bar Component
const ProgressBar: React.FC<{ progress: number; size?: 'sm' | 'md' }> = ({
  progress,
  size = 'sm'
}) => (
  <div className={`progress-bar progress-bar--${size}`}>
    <div
      className="progress-bar-fill"
      style={{ width: `${Math.min(progress, 100)}%` }}
    />
  </div>
);

// Status Dropdown Component
const StatusDropdown: React.FC<{
  currentStatus: string;
  onSelect: (status: string) => void;
  disabled?: boolean;
}> = ({ currentStatus, onSelect, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const colors = getStatusColor(currentStatus);

  return (
    <div className="status-dropdown">
      <button
        type="button"
        className="status-dropdown-trigger"
        style={{ backgroundColor: colors.bg, color: colors.text }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {formatStatus(currentStatus)}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-chevron">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="dropdown-overlay" onClick={() => setIsOpen(false)} />
          <div className="status-dropdown-menu">
            {PROJECT_STATUSES.map((status) => {
              const statusColors = getStatusColor(status);
              return (
                <button
                  key={status}
                  type="button"
                  className={`dropdown-item ${status === currentStatus ? 'dropdown-item--active' : ''}`}
                  onClick={() => {
                    onSelect(status);
                    setIsOpen(false);
                  }}
                >
                  <span
                    className="dropdown-item-dot"
                    style={{ backgroundColor: statusColors.text }}
                  />
                  {formatStatus(status)}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// Loading Skeleton
const TableSkeleton: React.FC = () => (
  <div className="projects-table-skeleton">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="skeleton-row">
        <div className="skeleton skeleton-cell-lg" />
        <div className="skeleton skeleton-cell-md" />
        <div className="skeleton skeleton-cell-sm" />
        <div className="skeleton skeleton-cell-md" />
        <div className="skeleton skeleton-cell-sm" />
      </div>
    ))}
  </div>
);

// Empty State
const EmptyState: React.FC<{ hasFilters: boolean }> = ({ hasFilters }) => (
  <div className="projects-table-empty">
    <div className="empty-icon">
      <FolderIcon />
    </div>
    <h3 className="empty-title">
      {hasFilters ? 'No projects match your filters' : 'No projects yet'}
    </h3>
    <p className="empty-description">
      {hasFilters
        ? 'Try adjusting your search or filter criteria'
        : 'Projects will appear here when clients complete payment'}
    </p>
  </div>
);

// Main Component
const ProjectsTable: React.FC<ProjectsTableProps> = ({
  projects,
  isLoading = false,
  pagination,
  onPageChange,
  onStatusChange,
  onProjectClick,
  onSearch,
  onFilterStatus,
  onFilterTier,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<number | null>(null);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  // Handle status filter
  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status);
    onFilterStatus?.(status);
  };

  // Handle tier filter
  const handleTierFilter = (tier: number | null) => {
    setTierFilter(tier);
    onFilterTier?.(tier);
  };

  const hasFilters = !!searchQuery || !!statusFilter || !!tierFilter;

  return (
    <div className="projects-table">
      {/* Toolbar */}
      <div className="projects-table-toolbar">
        <div className="toolbar-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="toolbar-filters">
          <select
            value={statusFilter || ''}
            onChange={(e) => handleStatusFilter(e.target.value || null)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>

          <select
            value={tierFilter || ''}
            onChange={(e) => handleTierFilter(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="filter-select"
          >
            <option value="">All Tiers</option>
            {[1, 2, 3, 4].map((tier) => (
              <option key={tier} value={tier}>
                {TIER_NAMES[tier]}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              className="clear-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter(null);
                setTierFilter(null);
                onSearch?.('');
                onFilterStatus?.(null);
                onFilterTier?.(null);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="projects-table-container">
        {isLoading ? (
          <TableSkeleton />
        ) : projects.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <table className="projects-table-content">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Deliverables</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className={onProjectClick ? 'row--clickable' : ''}
                  onClick={() => onProjectClick?.(project)}
                >
                  <td className="cell-project">
                    <div className="project-info">
                      <span className="project-name">{project.name}</span>
                      <span
                        className="project-tier"
                        style={{ color: getTierColor(project.tier) }}
                      >
                        {project.tierName}
                      </span>
                    </div>
                  </td>
                  <td className="cell-client">
                    <div className="client-info">
                      <span className="client-name">
                        {project.clientName || 'Unknown'}
                      </span>
                      {project.clientEmail && (
                        <span className="client-email">{project.clientEmail}</span>
                      )}
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <StatusDropdown
                      currentStatus={project.status}
                      onSelect={(status) => onStatusChange?.(project.id, status)}
                      disabled={!onStatusChange}
                    />
                  </td>
                  <td className="cell-progress">
                    <div className="progress-info">
                      <div className="progress-header">
                        <span className="progress-label">
                          {project.completedMilestones}/{project.totalMilestones}
                        </span>
                        <span className="progress-percentage">{project.progress}%</span>
                      </div>
                      <ProgressBar progress={project.progress} />
                    </div>
                  </td>
                  <td className="cell-deliverables">
                    <div className="deliverables-count">
                      <FileIcon />
                      <span>{project.deliverableCount}</span>
                    </div>
                  </td>
                  <td className="cell-date">
                    <span className="date-relative" title={formatDate(project.updatedAt)}>
                      {formatRelativeTime(project.updatedAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="projects-table-pagination">
          <span className="pagination-info">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="pagination-controls">
            <button
              type="button"
              className="pagination-btn"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronIcon direction="left" />
            </button>
            <span className="pagination-current">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronIcon direction="right" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsTable;
