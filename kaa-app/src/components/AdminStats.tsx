/**
 * Admin Stats Component
 * Displays key business metrics for administrators.
 */

import React from 'react';
import { Skeleton } from './common/Skeleton';
import './AdminStats.css';

// ============================================================================
// TYPES
// ============================================================================

export interface StatCardData {
  id: string;
  label: string;
  value: string | number;
  change?: number; // Percentage change
  changeLabel?: string;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: 'up' | 'down' | 'neutral';
}

export interface AdminStatsProps {
  stats: StatCardData[];
  loading?: boolean;
  period?: string;
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ stat }: { stat: StatCardData }) {
  const trendClass = stat.trend === 'up' 
    ? 'stat-card__change--positive' 
    : stat.trend === 'down' 
      ? 'stat-card__change--negative'
      : '';

  return (
    <div className={`stat-card stat-card--${stat.color}`}>
      <div className="stat-card__header">
        <span className="stat-card__icon">{stat.icon}</span>
        <span className="stat-card__label">{stat.label}</span>
      </div>
      
      <div className="stat-card__value">{stat.value}</div>
      
      {stat.change !== undefined && (
        <div className={`stat-card__change ${trendClass}`}>
          <span className="stat-card__change-value">
            {stat.change > 0 ? '↑' : stat.change < 0 ? '↓' : '→'} 
            {Math.abs(stat.change)}%
          </span>
          {stat.changeLabel && (
            <span className="stat-card__change-label">{stat.changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function StatCardSkeleton() {
  return (
    <div className="stat-card stat-card--skeleton">
      <div className="stat-card__header">
        <Skeleton width={24} height={24} borderRadius="50%" />
        <Skeleton width={80} height={14} />
      </div>
      <Skeleton width="60%" height={32} className="stat-card__value-skeleton" />
      <Skeleton width={100} height={12} />
    </div>
  );
}

// ============================================================================
// ADMIN STATS
// ============================================================================

export function AdminStats({ stats, loading = false, period }: AdminStatsProps) {
  if (loading) {
    return (
      <div className="admin-stats">
        {period && <div className="admin-stats__period">{period}</div>}
        <div className="admin-stats__grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-stats">
      {period && <div className="admin-stats__period">{period}</div>}
      <div className="admin-stats__grid">
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// QUICK INSIGHTS
// ============================================================================

export interface InsightData {
  id: string;
  type: 'success' | 'warning' | 'info' | 'alert';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface QuickInsightsProps {
  insights: InsightData[];
  onDismiss?: (id: string) => void;
}

export function QuickInsights({ insights, onDismiss }: QuickInsightsProps) {
  if (insights.length === 0) return null;

  const getIcon = (type: InsightData['type']) => {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      case 'alert': return '!';
    }
  };

  return (
    <div className="quick-insights">
      <h3 className="quick-insights__title">Quick Insights</h3>
      <div className="quick-insights__list">
        {insights.map((insight) => (
          <div key={insight.id} className={`insight-card insight-card--${insight.type}`}>
            <span className="insight-card__icon">{getIcon(insight.type)}</span>
            <div className="insight-card__content">
              <span className="insight-card__title">{insight.title}</span>
              <span className="insight-card__description">{insight.description}</span>
            </div>
            <div className="insight-card__actions">
              {insight.action && (
                <button 
                  className="insight-card__action"
                  onClick={insight.action.onClick}
                >
                  {insight.action.label}
                </button>
              )}
              {onDismiss && (
                <button 
                  className="insight-card__dismiss"
                  onClick={() => onDismiss(insight.id)}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

export interface ActivityItem {
  id: string;
  type: 'lead' | 'payment' | 'project' | 'user' | 'milestone';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  loading?: boolean;
  onViewAll?: () => void;
}

export function RecentActivity({ activities, loading, onViewAll }: RecentActivityProps) {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'lead': return '📋';
      case 'payment': return '💳';
      case 'project': return '📁';
      case 'user': return '👤';
      case 'milestone': return '🎯';
    }
  };

  if (loading) {
    return (
      <div className="recent-activity">
        <div className="recent-activity__header">
          <h3 className="recent-activity__title">Recent Activity</h3>
        </div>
        <div className="recent-activity__list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="activity-item activity-item--skeleton">
              <Skeleton width={32} height={32} borderRadius="50%" />
              <div className="activity-item__content">
                <Skeleton width="70%" height={14} />
                <Skeleton width="50%" height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="recent-activity">
      <div className="recent-activity__header">
        <h3 className="recent-activity__title">Recent Activity</h3>
        {onViewAll && (
          <button className="recent-activity__view-all" onClick={onViewAll}>
            View All
          </button>
        )}
      </div>
      <div className="recent-activity__list">
        {activities.length === 0 ? (
          <div className="recent-activity__empty">No recent activity</div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className={`activity-item activity-item--${activity.type}`}>
              <span className="activity-item__icon">{getIcon(activity.type)}</span>
              <div className="activity-item__content">
                <span className="activity-item__title">{activity.title}</span>
                <span className="activity-item__description">{activity.description}</span>
              </div>
              <span className="activity-item__timestamp">{activity.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DEFAULT STATS GENERATOR
// ============================================================================

export function generateDefaultStats(): StatCardData[] {
  return [
    {
      id: 'leads',
      label: 'New Leads',
      value: 0,
      change: 0,
      changeLabel: 'vs last period',
      icon: '📋',
      color: 'blue',
      trend: 'neutral',
    },
    {
      id: 'revenue',
      label: 'Revenue',
      value: '$0',
      change: 0,
      changeLabel: 'vs last period',
      icon: '💰',
      color: 'green',
      trend: 'neutral',
    },
    {
      id: 'projects',
      label: 'Active Projects',
      value: 0,
      icon: '📁',
      color: 'yellow',
    },
    {
      id: 'clients',
      label: 'Total Clients',
      value: 0,
      change: 0,
      changeLabel: 'this month',
      icon: '👥',
      color: 'purple',
      trend: 'neutral',
    },
  ];
}

export default AdminStats;
