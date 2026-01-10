/**
 * LeadQueue Component
 * Lead management table with actions (view, tier override, convert).
 */

import React, { JSX, useState } from 'react';
import {
  Lead,
  LeadStatus,
  LeadFilters,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  formatDate,
  getTimeAgo,
} from '../../types/admin.types';
import { TIER_NAMES } from '../../types/portal.types';
import './LeadQueue.css';

// ============================================================================
// TYPES
// ============================================================================

interface LeadQueueProps {
  leads: Lead[];
  isLoading?: boolean;
  filters: LeadFilters;
  onFilterChange: (filters: LeadFilters) => void;
  onViewLead: (lead: Lead) => void;
  onOverrideTier: (lead: Lead) => void;
  onConvertLead?: (lead: Lead) => void;
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

export function LeadQueue({
  leads,
  isLoading = false,
  filters,
  onFilterChange,
  onViewLead,
  onOverrideTier,
  onConvertLead,
  pagination,
}: LeadQueueProps): JSX.Element {
  const [search, setSearch] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search });
  };

  const handleStatusFilter = (status: LeadStatus | '') => {
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
    <div className="lead-queue">
      {/* Header */}
      <div className="lead-queue__header">
        <h2 className="lead-queue__title">📋 Lead Queue</h2>
        <p className="lead-queue__subtitle">
          Manage and route incoming leads
        </p>
      </div>

      {/* Filters */}
      <div className="lead-queue__filters">
        <form onSubmit={handleSearchSubmit} className="lead-queue__search">
          <input
            type="text"
            placeholder="Search by email or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lead-queue__search-input"
          />
          <button type="submit" className="lead-queue__search-btn">
            🔍
          </button>
        </form>

        <select
          value={filters.status || ''}
          onChange={(e) => handleStatusFilter(e.target.value as LeadStatus | '')}
          className="lead-queue__filter-select"
        >
          <option value="">All Statuses</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filters.tier || ''}
          onChange={(e) => handleTierFilter(e.target.value ? Number(e.target.value) : '')}
          className="lead-queue__filter-select"
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
      <div className="lead-queue__table-container">
        {isLoading ? (
          <div className="lead-queue__loading">
            <div className="lead-queue__spinner" />
            <p>Loading leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="lead-queue__empty">
            <p>No leads found</p>
          </div>
        ) : (
          <table className="lead-queue__table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Status</th>
                <th>Recommended Tier</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="lead-queue__row">
                  <td className="lead-queue__cell lead-queue__cell--lead">
                    <div className="lead-queue__lead-info">
                      <span className="lead-queue__lead-email">
                        {lead.email}
                      </span>
                      <span className="lead-queue__lead-address">
                        {lead.projectAddress}
                      </span>
                      {lead.name && (
                        <span className="lead-queue__lead-name">
                          {lead.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="lead-queue__cell">
                    <span
                      className={`lead-queue__status ${LEAD_STATUS_COLORS[lead.status]}`}
                    >
                      {LEAD_STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="lead-queue__cell">
                    <span className={`lead-queue__tier tier-${lead.recommendedTier}`}>
                      {TIER_NAMES[lead.recommendedTier] || `Tier ${lead.recommendedTier}`}
                    </span>
                    {lead.routingReason && (
                      <span className="lead-queue__reason" title={lead.routingReason}>
                        ℹ️
                      </span>
                    )}
                  </td>
                  <td className="lead-queue__cell">
                    <span className="lead-queue__date" title={formatDate(lead.createdAt)}>
                      {getTimeAgo(lead.createdAt)}
                    </span>
                  </td>
                  <td className="lead-queue__cell lead-queue__cell--actions">
                    <div className="lead-queue__actions">
                      <button
                        className="lead-queue__action lead-queue__action--view"
                        onClick={() => onViewLead(lead)}
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button
                        className="lead-queue__action lead-queue__action--tier"
                        onClick={() => onOverrideTier(lead)}
                        title="Override Tier"
                      >
                        ⚙️
                      </button>
                      {!lead.isConverted && onConvertLead && (
                        <button
                          className="lead-queue__action lead-queue__action--convert"
                          onClick={() => onConvertLead(lead)}
                          title="Convert to Client"
                        >
                          ✅
                        </button>
                      )}
                      {lead.isConverted && (
                        <span className="lead-queue__converted" title="Converted">
                          🎉
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="lead-queue__pagination">
          <button
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="lead-queue__page-btn"
          >
            ← Prev
          </button>
          <span className="lead-queue__page-info">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="lead-queue__page-btn"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default LeadQueue;
