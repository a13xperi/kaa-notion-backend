import React, { useState, useMemo } from 'react';
import './LeadQueue.css';

// Types
export interface Lead {
  id: string;
  email: string;
  fullName: string | null;
  companyName: string | null;
  phone: string | null;
  status: string;
  recommendedTier: number | null;
  tierName: string | null;
  tierConfidence: number | null;
  tierReason: string | null;
  tierOverrideReason: string | null;
  budgetRange: string | null;
  timeline: string | null;
  projectType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadQueueProps {
  leads: Lead[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onStatusChange?: (leadId: string, newStatus: string) => void;
  onTierOverride?: (leadId: string) => void;
  onLeadClick?: (lead: Lead) => void;
  onConvert?: (leadId: string) => void;
  onSearch?: (query: string) => void;
  onFilterStatus?: (status: string | null) => void;
  onFilterTier?: (tier: number | null) => void;
}

// Lead statuses
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED', 'NURTURE'] as const;

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
    NEW: { bg: '#dbeafe', text: '#1d4ed8' },
    CONTACTED: { bg: '#ede9fe', text: '#7c3aed' },
    QUALIFIED: { bg: '#d1fae5', text: '#047857' },
    CONVERTED: { bg: '#dcfce7', text: '#15803d' },
    CLOSED: { bg: '#f3f4f6', text: '#6b7280' },
    NURTURE: { bg: '#fef3c7', text: '#d97706' },
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

// Search Icon
const SearchIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

// Chevron Icon
const ChevronIcon: React.FC<{ direction: 'left' | 'right' }> = ({ direction }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {direction === 'left' ? (
      <polyline points="15 18 9 12 15 6" />
    ) : (
      <polyline points="9 18 15 12 9 6" />
    )}
  </svg>
);

// More Icon (three dots)
const MoreIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
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
        {currentStatus}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-chevron">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="dropdown-overlay" onClick={() => setIsOpen(false)} />
          <div className="status-dropdown-menu">
            {LEAD_STATUSES.map((status) => {
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
                  {status}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// Action Menu Component
const ActionMenu: React.FC<{
  lead: Lead;
  onTierOverride?: () => void;
  onConvert?: () => void;
  onView?: () => void;
}> = ({ lead, onTierOverride, onConvert, onView }) => {
  const [isOpen, setIsOpen] = useState(false);

  const canConvert = lead.status === 'QUALIFIED' && lead.recommendedTier;

  return (
    <div className="action-menu">
      <button
        type="button"
        className="action-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Actions"
      >
        <MoreIcon />
      </button>
      {isOpen && (
        <>
          <div className="dropdown-overlay" onClick={() => setIsOpen(false)} />
          <div className="action-menu-dropdown">
            {onView && (
              <button
                type="button"
                className="action-item"
                onClick={() => {
                  onView();
                  setIsOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                View Details
              </button>
            )}
            {onTierOverride && (
              <button
                type="button"
                className="action-item"
                onClick={() => {
                  onTierOverride();
                  setIsOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Change Tier
              </button>
            )}
            {canConvert && onConvert && (
              <button
                type="button"
                className="action-item action-item--primary"
                onClick={() => {
                  onConvert();
                  setIsOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Convert to Client
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Loading Skeleton
const TableSkeleton: React.FC = () => (
  <div className="lead-queue-skeleton">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="skeleton-row">
        <div className="skeleton skeleton-cell-lg" />
        <div className="skeleton skeleton-cell-md" />
        <div className="skeleton skeleton-cell-sm" />
        <div className="skeleton skeleton-cell-sm" />
        <div className="skeleton skeleton-cell-sm" />
      </div>
    ))}
  </div>
);

// Empty State
const EmptyState: React.FC<{ hasFilters: boolean }> = ({ hasFilters }) => (
  <div className="lead-queue-empty">
    <div className="empty-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    </div>
    <h3 className="empty-title">
      {hasFilters ? 'No leads match your filters' : 'No leads yet'}
    </h3>
    <p className="empty-description">
      {hasFilters
        ? 'Try adjusting your search or filter criteria'
        : 'Leads will appear here when they submit the intake form'}
    </p>
  </div>
);

// Main Component
const LeadQueue: React.FC<LeadQueueProps> = ({
  leads,
  isLoading = false,
  pagination,
  onPageChange,
  onStatusChange,
  onTierOverride,
  onLeadClick,
  onConvert,
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
    <div className="lead-queue">
      {/* Toolbar */}
      <div className="lead-queue-toolbar">
        <div className="toolbar-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search leads..."
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
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
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
      <div className="lead-queue-table-container">
        {isLoading ? (
          <TableSkeleton />
        ) : leads.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <table className="lead-queue-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Status</th>
                <th>Tier</th>
                <th>Budget / Timeline</th>
                <th>Created</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={onLeadClick ? 'row--clickable' : ''}
                  onClick={() => onLeadClick?.(lead)}
                >
                  <td className="cell-contact">
                    <div className="contact-info">
                      <span className="contact-name">{lead.fullName || 'Unknown'}</span>
                      <span className="contact-email">{lead.email}</span>
                      {lead.companyName && (
                        <span className="contact-company">{lead.companyName}</span>
                      )}
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <StatusDropdown
                      currentStatus={lead.status}
                      onSelect={(status) => onStatusChange?.(lead.id, status)}
                      disabled={!onStatusChange}
                    />
                  </td>
                  <td>
                    {lead.recommendedTier ? (
                      <div className="tier-info">
                        <span
                          className="tier-badge"
                          style={{ color: getTierColor(lead.recommendedTier) }}
                        >
                          {lead.tierName || TIER_NAMES[lead.recommendedTier]}
                        </span>
                        {lead.tierConfidence !== null && (
                          <span className="tier-confidence">
                            {Math.round(lead.tierConfidence * 100)}%
                          </span>
                        )}
                        {lead.tierOverrideReason && (
                          <span className="tier-override-badge" title={lead.tierOverrideReason}>
                            Override
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="tier-none">—</span>
                    )}
                  </td>
                  <td className="cell-details">
                    <div className="details-info">
                      {lead.budgetRange && (
                        <span className="detail-item">{lead.budgetRange}</span>
                      )}
                      {lead.timeline && (
                        <span className="detail-item detail-item--secondary">
                          {lead.timeline}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="cell-date">
                    <span className="date-relative" title={formatDate(lead.createdAt)}>
                      {formatRelativeTime(lead.createdAt)}
                    </span>
                  </td>
                  <td className="cell-actions" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      lead={lead}
                      onTierOverride={onTierOverride ? () => onTierOverride(lead.id) : undefined}
                      onConvert={onConvert ? () => onConvert(lead.id) : undefined}
                      onView={onLeadClick ? () => onLeadClick(lead) : undefined}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="lead-queue-pagination">
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

export default LeadQueue;
