/**
 * ProjectsTable Component
 * Admin project list with client, tier, status, and progress.
 */

import React, { JSX, useState } from 'react';
import {
  AdminProject,
  ProjectFilters,
  formatCurrency,
  formatDate,
  getTimeAgo,
} from '../../types/admin.types';
import {
  ProjectStatus,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  TIER_NAMES,
} from '../../types/portal.types';
import './ProjectsTable.css';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectsTableProps {
  projects: AdminProject[];
  isLoading?: boolean;
  filters: ProjectFilters;
  onFilterChange: (filters: ProjectFilters) => void;
  onViewProject: (project: AdminProject) => void;
  onUpdateStatus?: (project: AdminProject, newStatus: ProjectStatus) => void;
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

export function ProjectsTable({
  projects,
  isLoading = false,
  filters,
  onFilterChange,
  onViewProject,
  onUpdateStatus,
  pagination,
}: ProjectsTableProps): JSX.Element {
  const [search, setSearch] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search });
  };

  const handleStatusFilter = (status: ProjectStatus | '') => {
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

  const handlePaymentFilter = (paymentStatus: string) => {
    onFilterChange({
      ...filters,
      paymentStatus: paymentStatus || undefined,
    });
  };

  return (
    <div className="projects-table">
      {/* Header */}
      <div className="projects-table__header">
        <h2 className="projects-table__title">🏗️ Projects</h2>
        <p className="projects-table__subtitle">
          Manage all client projects
        </p>
      </div>

      {/* Filters */}
      <div className="projects-table__filters">
        <form onSubmit={handleSearchSubmit} className="projects-table__search">
          <input
            type="text"
            placeholder="Search by name or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="projects-table__search-input"
          />
          <button type="submit" className="projects-table__search-btn">
            🔍
          </button>
        </form>

        <select
          value={filters.status || ''}
          onChange={(e) => handleStatusFilter(e.target.value as ProjectStatus | '')}
          className="projects-table__filter-select"
        >
          <option value="">All Statuses</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filters.tier || ''}
          onChange={(e) => handleTierFilter(e.target.value ? Number(e.target.value) : '')}
          className="projects-table__filter-select"
        >
          <option value="">All Tiers</option>
          {[1, 2, 3, 4].map((tier) => (
            <option key={tier} value={tier}>
              {TIER_NAMES[tier] || `Tier ${tier}`}
            </option>
          ))}
        </select>

        <select
          value={filters.paymentStatus || ''}
          onChange={(e) => handlePaymentFilter(e.target.value)}
          className="projects-table__filter-select"
        >
          <option value="">All Payment Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="UNPAID">Unpaid</option>
        </select>
      </div>

      {/* Table */}
      <div className="projects-table__container">
        {isLoading ? (
          <div className="projects-table__loading">
            <div className="projects-table__spinner" />
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="projects-table__empty">
            <p>No projects found</p>
          </div>
        ) : (
          <table className="projects-table__table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Payment</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="projects-table__row">
                  <td className="projects-table__cell projects-table__cell--name">
                    <span className="projects-table__name">{project.name}</span>
                    {project.notionPageId && (
                      <span className="projects-table__notion-badge" title="Synced to Notion">
                        📝
                      </span>
                    )}
                  </td>
                  <td className="projects-table__cell">
                    <div className="projects-table__client">
                      <span className="projects-table__client-email">
                        {project.client.email || 'No email'}
                      </span>
                      <span className="projects-table__client-address">
                        {project.client.projectAddress}
                      </span>
                    </div>
                  </td>
                  <td className="projects-table__cell">
                    <span className={`projects-table__tier tier-${project.tier}`}>
                      {TIER_NAMES[project.tier] || `Tier ${project.tier}`}
                    </span>
                  </td>
                  <td className="projects-table__cell">
                    <span
                      className={`projects-table__status ${PROJECT_STATUS_COLORS[project.status]}`}
                    >
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </td>
                  <td className="projects-table__cell">
                    <div className="projects-table__progress">
                      <div className="projects-table__progress-bar">
                        <div
                          className="projects-table__progress-fill"
                          style={{ width: `${project.progress.percentage}%` }}
                        />
                      </div>
                      <span className="projects-table__progress-text">
                        {project.progress.completed}/{project.progress.total}
                      </span>
                    </div>
                  </td>
                  <td className="projects-table__cell">
                    <div className="projects-table__payment">
                      <span
                        className={`projects-table__payment-status payment-${project.paymentStatus.toLowerCase()}`}
                      >
                        {project.paymentStatus}
                      </span>
                      <span className="projects-table__payment-amount">
                        {formatCurrency(project.totalPaid)}
                      </span>
                    </div>
                  </td>
                  <td className="projects-table__cell">
                    <span className="projects-table__date" title={formatDate(project.createdAt)}>
                      {getTimeAgo(project.createdAt)}
                    </span>
                  </td>
                  <td className="projects-table__cell projects-table__cell--actions">
                    <div className="projects-table__actions">
                      <button
                        className="projects-table__action projects-table__action--view"
                        onClick={() => onViewProject(project)}
                        title="View Project"
                      >
                        👁️
                      </button>
                      {onUpdateStatus && (
                        <button
                          className="projects-table__action projects-table__action--status"
                          onClick={() => {
                            const newStatus = prompt(
                              'Enter new status (ONBOARDING, IN_PROGRESS, AWAITING_FEEDBACK, REVISIONS, DELIVERED, COMPLETED, PAUSED, CANCELLED):'
                            );
                            if (newStatus) {
                              onUpdateStatus(project, newStatus as ProjectStatus);
                            }
                          }}
                          title="Change Status"
                        >
                          ⚙️
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="projects-table__pagination">
          <button
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="projects-table__page-btn"
          >
            ← Prev
          </button>
          <span className="projects-table__page-info">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="projects-table__page-btn"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default ProjectsTable;
