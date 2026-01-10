/**
 * AdminDashboard Component
 * Overview with stats cards, recent leads, recent projects.
 */

import React, { JSX } from 'react';
import {
  DashboardStats,
  formatCurrency,
  getTimeAgo,
} from '../../types/admin.types';
import { TIER_NAMES } from '../../types/portal.types';
import './AdminDashboard.css';

// ============================================================================
// TYPES
// ============================================================================

interface AdminDashboardProps {
  stats: DashboardStats | null;
  isLoading?: boolean;
  onNavigate?: (section: 'leads' | 'projects' | 'clients') => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AdminDashboard({
  stats,
  isLoading = false,
  onNavigate,
}: AdminDashboardProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="admin-dashboard admin-dashboard--loading">
        <div className="admin-dashboard__skeleton-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-dashboard__skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="admin-dashboard admin-dashboard--error">
        <p>Failed to load dashboard stats</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-dashboard__header">
        <h1 className="admin-dashboard__title">📊 Admin Dashboard</h1>
        <p className="admin-dashboard__subtitle">
          Overview of leads, projects, and revenue
        </p>
      </header>

      {/* Stats Cards */}
      <div className="admin-dashboard__stats">
        {/* Leads Card */}
        <div
          className="admin-dashboard__card admin-dashboard__card--leads"
          onClick={() => onNavigate?.('leads')}
          role="button"
          tabIndex={0}
        >
          <div className="admin-dashboard__card-icon">📋</div>
          <div className="admin-dashboard__card-content">
            <h3 className="admin-dashboard__card-value">{stats.leads.total}</h3>
            <p className="admin-dashboard__card-label">Total Leads</p>
            <div className="admin-dashboard__card-meta">
              <span className="admin-dashboard__card-badge">
                +{stats.leads.thisMonth} this month
              </span>
              <span className="admin-dashboard__card-rate">
                {stats.leads.conversionRate}% conversion
              </span>
            </div>
          </div>
        </div>

        {/* Projects Card */}
        <div
          className="admin-dashboard__card admin-dashboard__card--projects"
          onClick={() => onNavigate?.('projects')}
          role="button"
          tabIndex={0}
        >
          <div className="admin-dashboard__card-icon">🏗️</div>
          <div className="admin-dashboard__card-content">
            <h3 className="admin-dashboard__card-value">{stats.projects.total}</h3>
            <p className="admin-dashboard__card-label">Total Projects</p>
            <div className="admin-dashboard__card-meta">
              <span className="admin-dashboard__card-badge admin-dashboard__card-badge--active">
                {stats.projects.active} active
              </span>
            </div>
          </div>
        </div>

        {/* Clients Card */}
        <div
          className="admin-dashboard__card admin-dashboard__card--clients"
          onClick={() => onNavigate?.('clients')}
          role="button"
          tabIndex={0}
        >
          <div className="admin-dashboard__card-icon">👥</div>
          <div className="admin-dashboard__card-content">
            <h3 className="admin-dashboard__card-value">{stats.clients.total}</h3>
            <p className="admin-dashboard__card-label">Total Clients</p>
            <div className="admin-dashboard__card-meta">
              <span className="admin-dashboard__card-badge admin-dashboard__card-badge--active">
                {stats.clients.active} active
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="admin-dashboard__card admin-dashboard__card--revenue">
          <div className="admin-dashboard__card-icon">💰</div>
          <div className="admin-dashboard__card-content">
            <h3 className="admin-dashboard__card-value">
              {formatCurrency(stats.revenue.total)}
            </h3>
            <p className="admin-dashboard__card-label">Total Revenue</p>
            <div className="admin-dashboard__card-meta">
              <span className="admin-dashboard__card-badge admin-dashboard__card-badge--revenue">
                +{formatCurrency(stats.revenue.thisMonth)} this month
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="admin-dashboard__breakdown">
        {/* Projects by Tier */}
        <div className="admin-dashboard__section">
          <h3 className="admin-dashboard__section-title">Projects by Tier</h3>
          <div className="admin-dashboard__tier-list">
            {[1, 2, 3, 4].map((tier) => (
              <div key={tier} className="admin-dashboard__tier-item">
                <span className="admin-dashboard__tier-name">
                  {TIER_NAMES[tier] || `Tier ${tier}`}
                </span>
                <span className="admin-dashboard__tier-count">
                  {stats.projects.byTier[tier] || 0}
                </span>
                <span className="admin-dashboard__tier-revenue">
                  {formatCurrency(stats.revenue.byTier[tier] || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Leads by Status */}
        <div className="admin-dashboard__section">
          <h3 className="admin-dashboard__section-title">Leads by Status</h3>
          <div className="admin-dashboard__status-list">
            {Object.entries(stats.leads.byStatus).map(([status, count]) => (
              <div key={status} className="admin-dashboard__status-item">
                <span className={`admin-dashboard__status-badge status-${status.toLowerCase()}`}>
                  {status.replace('_', ' ')}
                </span>
                <span className="admin-dashboard__status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Projects by Status */}
        <div className="admin-dashboard__section">
          <h3 className="admin-dashboard__section-title">Projects by Status</h3>
          <div className="admin-dashboard__status-list">
            {Object.entries(stats.projects.byStatus).map(([status, count]) => (
              <div key={status} className="admin-dashboard__status-item">
                <span className={`admin-dashboard__status-badge status-${status.toLowerCase()}`}>
                  {status.replace('_', ' ')}
                </span>
                <span className="admin-dashboard__status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-dashboard__activity">
        <h3 className="admin-dashboard__section-title">Recent Activity</h3>
        {stats.recentActivity.length === 0 ? (
          <p className="admin-dashboard__empty">No recent activity</p>
        ) : (
          <div className="admin-dashboard__activity-list">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="admin-dashboard__activity-item">
                <span className="admin-dashboard__activity-type">
                  {activity.type.replace('_', ' ')}
                </span>
                <span className="admin-dashboard__activity-desc">
                  {activity.description}
                </span>
                <span className="admin-dashboard__activity-time">
                  {getTimeAgo(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
