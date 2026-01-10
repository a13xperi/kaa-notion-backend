/**
 * ProjectDashboard Component
 * Main portal view with project list, status, and quick actions.
 */

import React, { useState, useMemo, JSX } from 'react';
import {
  ProjectSummary,
  ProjectStatus,
  formatDate,
  TIER_NAMES,
} from '../types/portal.types';
import './ProjectDashboard.css';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectDashboardProps {
  projects: ProjectSummary[];
  userName?: string;
  onProjectClick?: (projectId: string) => void;
  onCreateProject?: () => void;
  isLoading?: boolean;
  error?: string;
}

type SortOption = 'recent' | 'name' | 'progress' | 'status';
type FilterOption = 'all' | ProjectStatus;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusColor(status: ProjectStatus): string {
  const colors: Record<ProjectStatus, string> = {
    ONBOARDING: 'status-blue',
    IN_PROGRESS: 'status-yellow',
    AWAITING_FEEDBACK: 'status-purple',
    REVISIONS: 'status-yellow',
    DELIVERED: 'status-green',
    CLOSED: 'status-gray',
  };
  return colors[status] || 'status-gray';
}

function getStatusLabel(status: ProjectStatus): string {
  return status.replace('_', ' ');
}

function getProgressColor(percentage: number): string {
  if (percentage >= 75) return 'progress-green';
  if (percentage >= 50) return 'progress-yellow';
  if (percentage >= 25) return 'progress-orange';
  return 'progress-gray';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProjectDashboard({
  projects,
  userName,
  onProjectClick,
  onCreateProject,
  isLoading = false,
  error,
}: ProjectDashboardProps): JSX.Element {
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Filter by status
    if (filterBy !== 'all') {
      result = result.filter((p) => p.status === filterBy);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'progress':
        result.sort((a, b) => b.progress.percentage - a.progress.percentage);
        break;
      case 'status':
        const statusOrder: ProjectStatus[] = [
          'IN_PROGRESS',
          'AWAITING_FEEDBACK',
          'REVISIONS',
          'ONBOARDING',
          'DELIVERED',
          'CLOSED',
        ];
        result.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
        break;
    }

    return result;
  }, [projects, sortBy, filterBy, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const active = projects.filter(
      (p) => p.status !== 'DELIVERED' && p.status !== 'CLOSED'
    ).length;
    const completed = projects.filter((p) => p.status === 'DELIVERED').length;
    const avgProgress = projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + p.progress.percentage, 0) / projects.length)
      : 0;

    return { total: projects.length, active, completed, avgProgress };
  }, [projects]);

  // Get unique statuses for filter
  const availableStatuses = useMemo(() => {
    const statuses = new Set(projects.map((p) => p.status));
    return Array.from(statuses);
  }, [projects]);

  if (error) {
    return (
      <div className="project-dashboard project-dashboard--error">
        <div className="project-dashboard__error">
          <span className="project-dashboard__error-icon">⚠️</span>
          <h3>Failed to load projects</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-dashboard">
      {/* Header */}
      <header className="project-dashboard__header">
        <div className="project-dashboard__greeting">
          <h1 className="project-dashboard__title">
            {userName ? `Welcome back, ${userName}!` : 'Your Projects'}
          </h1>
          <p className="project-dashboard__subtitle">
            {stats.active > 0
              ? `You have ${stats.active} active project${stats.active !== 1 ? 's' : ''}`
              : 'No active projects'}
          </p>
        </div>

        {onCreateProject && (
          <button className="project-dashboard__new-btn" onClick={onCreateProject}>
            + New Project
          </button>
        )}
      </header>

      {/* Stats */}
      <div className="project-dashboard__stats">
        <div className="project-dashboard__stat">
          <span className="project-dashboard__stat-value">{stats.total}</span>
          <span className="project-dashboard__stat-label">Total Projects</span>
        </div>
        <div className="project-dashboard__stat">
          <span className="project-dashboard__stat-value">{stats.active}</span>
          <span className="project-dashboard__stat-label">Active</span>
        </div>
        <div className="project-dashboard__stat">
          <span className="project-dashboard__stat-value">{stats.completed}</span>
          <span className="project-dashboard__stat-label">Completed</span>
        </div>
        <div className="project-dashboard__stat">
          <span className="project-dashboard__stat-value">{stats.avgProgress}%</span>
          <span className="project-dashboard__stat-label">Avg Progress</span>
        </div>
      </div>

      {/* Controls */}
      <div className="project-dashboard__controls">
        <div className="project-dashboard__search">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="project-dashboard__search-input"
            aria-label="Search projects"
          />
          {searchQuery && (
            <button
              className="project-dashboard__search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="project-dashboard__filters">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="project-dashboard__select"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="project-dashboard__select"
            aria-label="Sort by"
          >
            <option value="recent">Most Recent</option>
            <option value="name">Name</option>
            <option value="progress">Progress</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Project list */}
      {isLoading ? (
        <div className="project-dashboard__loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="project-dashboard__skeleton-card" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="project-dashboard__empty">
          <span className="project-dashboard__empty-icon">📋</span>
          <h3>
            {searchQuery || filterBy !== 'all'
              ? 'No projects match your filters'
              : 'No projects yet'}
          </h3>
          <p>
            {searchQuery || filterBy !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Your projects will appear here once they are created'}
          </p>
          {(searchQuery || filterBy !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterBy('all');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="project-dashboard__list">
          {filteredProjects.map((project) => (
            <article
              key={project.id}
              className="project-dashboard__card"
              onClick={() => onProjectClick?.(project.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onProjectClick?.(project.id);
                }
              }}
            >
              <div className="project-dashboard__card-header">
                <h3 className="project-dashboard__card-title">{project.name}</h3>
                <div className="project-dashboard__card-badges">
                  <span className={`project-dashboard__card-status ${getStatusColor(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                  <span className="project-dashboard__card-tier">
                    {TIER_NAMES[project.tier] || `Tier ${project.tier}`}
                  </span>
                </div>
              </div>

              <div className="project-dashboard__card-progress">
                <div className="project-dashboard__card-progress-header">
                  <span>Progress</span>
                  <span>{project.progress.percentage}%</span>
                </div>
                <div className="project-dashboard__card-progress-bar">
                  <div
                    className={`project-dashboard__card-progress-fill ${getProgressColor(project.progress.percentage)}`}
                    style={{ width: `${project.progress.percentage}%` }}
                  />
                </div>
                <div className="project-dashboard__card-progress-meta">
                  {project.progress.completed} of {project.progress.total} milestones
                </div>
              </div>

              {project.nextMilestone && (
                <div className="project-dashboard__card-next">
                  <span className="project-dashboard__card-next-label">Next:</span>
                  <span className="project-dashboard__card-next-name">
                    {project.nextMilestone.name}
                  </span>
                  {project.nextMilestone.dueDate && (
                    <span className="project-dashboard__card-next-date">
                      Due {formatDate(project.nextMilestone.dueDate)}
                    </span>
                  )}
                </div>
              )}

              <div className="project-dashboard__card-footer">
                <span className="project-dashboard__card-updated">
                  Updated {formatDate(project.updatedAt)}
                </span>
                <span className="project-dashboard__card-arrow">→</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectDashboard;
