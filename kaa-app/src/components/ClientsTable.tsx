import React, { useState } from 'react';
import './ClientsTable.css';

// Types
export interface Client {
  id: string;
  email: string | null;
  name: string | null;
  companyName: string | null;
  tier: number;
  tierName: string;
  projectCount: number;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientsTableProps {
  clients: Client[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onClientClick?: (client: Client) => void;
  onViewProjects?: (clientId: string) => void;
  onSearch?: (query: string) => void;
  onFilterTier?: (tier: number | null) => void;
}

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
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return formatDate(dateString);
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

// Tier background color
function getTierBgColor(tier: number): string {
  const colors: Record<number, string> = {
    1: '#f0fdf4',
    2: '#ecfdf5',
    3: '#f0fdfa',
    4: '#fef3c7',
  };
  return colors[tier] || '#f3f4f6';
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

const UserIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const FolderIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
);

const ExternalLinkIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// Avatar Component
const Avatar: React.FC<{ name: string | null; email: string | null }> = ({ name, email }) => {
  const displayName = name || email || 'U';
  const initial = displayName.charAt(0).toUpperCase();

  // Generate consistent color based on name/email
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
  const colorIndex = Math.abs(hashCode(displayName)) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div className="client-avatar" style={{ backgroundColor: bgColor }}>
      {initial}
    </div>
  );
};

// Tier Badge Component
const TierBadge: React.FC<{ tier: number; tierName: string }> = ({ tier, tierName }) => (
  <span
    className="tier-badge"
    style={{
      backgroundColor: getTierBgColor(tier),
      color: getTierColor(tier),
    }}
  >
    {tierName}
  </span>
);

// Loading Skeleton
const TableSkeleton: React.FC = () => (
  <div className="clients-table-skeleton">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="skeleton-row">
        <div className="skeleton-avatar" />
        <div className="skeleton-info">
          <div className="skeleton skeleton-name" />
          <div className="skeleton skeleton-email" />
        </div>
        <div className="skeleton skeleton-tier" />
        <div className="skeleton skeleton-projects" />
        <div className="skeleton skeleton-date" />
      </div>
    ))}
  </div>
);

// Empty State
const EmptyState: React.FC<{ hasFilters: boolean }> = ({ hasFilters }) => (
  <div className="clients-table-empty">
    <div className="empty-icon">
      <UserIcon />
    </div>
    <h3 className="empty-title">
      {hasFilters ? 'No clients match your filters' : 'No clients yet'}
    </h3>
    <p className="empty-description">
      {hasFilters
        ? 'Try adjusting your search or filter criteria'
        : 'Clients will appear here after completing payment'}
    </p>
  </div>
);

// Main Component
const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  isLoading = false,
  pagination,
  onPageChange,
  onClientClick,
  onViewProjects,
  onSearch,
  onFilterTier,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<number | null>(null);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  // Handle tier filter
  const handleTierFilter = (tier: number | null) => {
    setTierFilter(tier);
    onFilterTier?.(tier);
  };

  const hasFilters = !!searchQuery || !!tierFilter;

  return (
    <div className="clients-table">
      {/* Toolbar */}
      <div className="clients-table-toolbar">
        <div className="toolbar-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="toolbar-filters">
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
                setTierFilter(null);
                onSearch?.('');
                onFilterTier?.(null);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="clients-table-container">
        {isLoading ? (
          <TableSkeleton />
        ) : clients.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <table className="clients-table-content">
            <thead>
              <tr>
                <th>Client</th>
                <th>Tier</th>
                <th>Projects</th>
                <th>Stripe</th>
                <th>Joined</th>
                <th className="th-actions"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className={onClientClick ? 'row--clickable' : ''}
                  onClick={() => onClientClick?.(client)}
                >
                  <td className="cell-client">
                    <div className="client-info">
                      <Avatar name={client.name} email={client.email} />
                      <div className="client-details">
                        <span className="client-name">
                          {client.name || client.companyName || 'Unknown'}
                        </span>
                        {client.email && (
                          <span className="client-email">{client.email}</span>
                        )}
                        {client.companyName && client.name && (
                          <span className="client-company">{client.companyName}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <TierBadge tier={client.tier} tierName={client.tierName} />
                  </td>
                  <td className="cell-projects">
                    <div className="projects-count">
                      <FolderIcon />
                      <span>{client.projectCount}</span>
                      <span className="projects-label">
                        project{client.projectCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </td>
                  <td className="cell-stripe">
                    {client.stripeCustomerId ? (
                      <span className="stripe-badge stripe-badge--connected">
                        Connected
                      </span>
                    ) : (
                      <span className="stripe-badge stripe-badge--none">
                        —
                      </span>
                    )}
                  </td>
                  <td className="cell-date">
                    <span className="date-relative" title={formatDate(client.createdAt)}>
                      {formatRelativeTime(client.createdAt)}
                    </span>
                  </td>
                  <td className="cell-actions" onClick={(e) => e.stopPropagation()}>
                    {onViewProjects && client.projectCount > 0 && (
                      <button
                        type="button"
                        className="view-projects-btn"
                        onClick={() => onViewProjects(client.id)}
                        title="View projects"
                      >
                        <ExternalLinkIcon />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="clients-table-pagination">
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

export default ClientsTable;
