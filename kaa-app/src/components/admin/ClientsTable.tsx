/**
 * ClientsTable Component
 * Client list with tier, projects, status, and revenue stats.
 */

import React, { JSX, useState } from 'react';
import {
  AdminClient,
  ClientStatus,
  ClientFilters,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  formatCurrency,
  formatDate,
  formatDateTime,
} from '../../types/admin.types';
import { TIER_NAMES } from '../../types/portal.types';
import './ClientsTable.css';

// ============================================================================
// TYPES
// ============================================================================

interface ClientsTableProps {
  clients: AdminClient[];
  isLoading?: boolean;
  filters: ClientFilters;
  onFilterChange: (filters: ClientFilters) => void;
  onViewClient: (client: AdminClient) => void;
  onViewProjects?: (client: AdminClient) => void;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClientsTable({
  clients,
  isLoading = false,
  filters,
  onFilterChange,
  onViewClient,
  onViewProjects,
  pagination,
}: ClientsTableProps): JSX.Element {
  const [search, setSearch] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search });
  };

  const handleStatusFilter = (status: ClientStatus | '') => {
    onFilterChange({
      ...filters,
      status: status || undefined,
    });
  };

  const handleTierFilter = (tier: number | '') => {
    onFilterChange({
      ...filters,
      tier: tier ? Number(tier) : undefined,
    });
  };

  return (
    <div className="clients-table">
      {/* Header */}
      <div className="clients-table__header">
        <h2 className="clients-table__title">👥 Clients</h2>
        <p className="clients-table__subtitle">
          Manage all registered clients
        </p>
      </div>

      {/* Filters */}
      <div className="clients-table__filters">
        <form onSubmit={handleSearchSubmit} className="clients-table__search">
          <input
            type="text"
            placeholder="Search by email or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="clients-table__search-input"
          />
          <button type="submit" className="clients-table__search-btn">
            🔍
          </button>
        </form>

        <select
          value={filters.status || ''}
          onChange={(e) => handleStatusFilter(e.target.value as ClientStatus | '')}
          className="clients-table__filter-select"
        >
          <option value="">All Statuses</option>
          {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filters.tier || ''}
          onChange={(e) => handleTierFilter(e.target.value ? Number(e.target.value) : '')}
          className="clients-table__filter-select"
        >
          <option value="">All Tiers</option>
          {[1, 2, 3, 4].map((tier) => (
            <option key={tier} value={tier}>
              {TIER_NAMES[tier] || `Tier ${tier}`}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="clients-table__container">
        {isLoading ? (
          <div className="clients-table__loading">
            <div className="clients-table__spinner" />
            <p>Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="clients-table__empty">
            <p>No clients found</p>
          </div>
        ) : (
          <table className="clients-table__table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Projects</th>
                <th>Revenue</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="clients-table__row">
                  <td className="clients-table__cell clients-table__cell--client">
                    <div className="clients-table__client-info">
                      <span className="clients-table__client-email">
                        {client.email || 'No email'}
                      </span>
                      <span className="clients-table__client-address">
                        {client.projectAddress}
                      </span>
                    </div>
                  </td>
                  <td className="clients-table__cell">
                    <span className={`clients-table__tier tier-${client.tier}`}>
                      {TIER_NAMES[client.tier] || `Tier ${client.tier}`}
                    </span>
                  </td>
                  <td className="clients-table__cell">
                    <span
                      className={`clients-table__status ${CLIENT_STATUS_COLORS[client.status]}`}
                    >
                      {CLIENT_STATUS_LABELS[client.status]}
                    </span>
                  </td>
                  <td className="clients-table__cell">
                    <div className="clients-table__projects">
                      <span className="clients-table__project-count">
                        {client.stats.projectCount} total
                      </span>
                      <span className="clients-table__project-active">
                        {client.stats.activeProjects} active
                      </span>
                    </div>
                  </td>
                  <td className="clients-table__cell">
                    <span className="clients-table__revenue">
                      {formatCurrency(client.stats.totalPaid)}
                    </span>
                  </td>
                  <td className="clients-table__cell">
                    <span
                      className="clients-table__date"
                      title={client.lastLogin ? formatDateTime(client.lastLogin) : 'Never'}
                    >
                      {client.lastLogin ? formatDate(client.lastLogin) : 'Never'}
                    </span>
                  </td>
                  <td className="clients-table__cell clients-table__cell--actions">
                    <div className="clients-table__actions">
                      <button
                        className="clients-table__action clients-table__action--view"
                        onClick={() => onViewClient(client)}
                        title="View Client"
                      >
                        👁️
                      </button>
                      {onViewProjects && client.stats.projectCount > 0 && (
                        <button
                          className="clients-table__action clients-table__action--projects"
                          onClick={() => onViewProjects(client)}
                          title="View Projects"
                        >
                          🏗️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {clients.length > 0 && (
        <div className="clients-table__summary">
          <div className="clients-table__summary-item">
            <span className="clients-table__summary-label">Total Clients:</span>
            <span className="clients-table__summary-value">
              {pagination?.total || clients.length}
            </span>
          </div>
          <div className="clients-table__summary-item">
            <span className="clients-table__summary-label">Total Revenue:</span>
            <span className="clients-table__summary-value clients-table__summary-value--revenue">
              {formatCurrency(clients.reduce((sum, c) => sum + c.stats.totalPaid, 0))}
            </span>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="clients-table__pagination">
          <button
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="clients-table__page-btn"
          >
            ← Prev
          </button>
          <span className="clients-table__page-info">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="clients-table__page-btn"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default ClientsTable;
