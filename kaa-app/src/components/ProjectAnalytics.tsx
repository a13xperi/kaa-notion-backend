/**
 * Project Analytics Component
 * Displays project metrics and progress tracking.
 */

import React from 'react';
import { Skeleton } from './common/Skeleton';
import './ProjectAnalytics.css';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onTrack: number;
  atRisk: number;
  delayed: number;
  averageCompletionDays: number;
  revenueThisMonth: number;
  previousMonthRevenue: number;
}

export interface MilestoneProgress {
  name: string;
  completed: number;
  total: number;
  tier: number;
}

export interface TierDistribution {
  tier: number;
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface ProjectAnalyticsProps {
  metrics?: ProjectMetrics;
  milestones?: MilestoneProgress[];
  tierDistribution?: TierDistribution[];
  loading?: boolean;
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

interface ProgressBarProps {
  value: number;
  max: number;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  max,
  color = 'blue',
  showLabel = true,
  size = 'md',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className={`progress-bar progress-bar--${size}`}>
      <div className="progress-bar__track">
        <div
          className={`progress-bar__fill progress-bar__fill--${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="progress-bar__label">{percentage}%</span>
      )}
    </div>
  );
}

// ============================================================================
// METRICS OVERVIEW
// ============================================================================

interface MetricsOverviewProps {
  metrics: ProjectMetrics;
}

function MetricsOverview({ metrics }: MetricsOverviewProps) {
  const revenueChange = metrics.previousMonthRevenue > 0
    ? Math.round(((metrics.revenueThisMonth - metrics.previousMonthRevenue) / metrics.previousMonthRevenue) * 100)
    : 0;

  return (
    <div className="metrics-overview">
      <div className="metrics-overview__header">
        <h3>Project Metrics</h3>
      </div>
      
      <div className="metrics-overview__grid">
        <div className="metric-item">
          <span className="metric-item__value">{metrics.totalProjects}</span>
          <span className="metric-item__label">Total Projects</span>
        </div>
        
        <div className="metric-item">
          <span className="metric-item__value">{metrics.activeProjects}</span>
          <span className="metric-item__label">Active</span>
        </div>
        
        <div className="metric-item">
          <span className="metric-item__value">{metrics.completedProjects}</span>
          <span className="metric-item__label">Completed</span>
        </div>
        
        <div className="metric-item">
          <span className="metric-item__value">{metrics.averageCompletionDays}d</span>
          <span className="metric-item__label">Avg. Duration</span>
        </div>
      </div>
      
      <div className="metrics-overview__status">
        <div className="status-item status-item--on-track">
          <span className="status-item__count">{metrics.onTrack}</span>
          <span className="status-item__label">On Track</span>
        </div>
        <div className="status-item status-item--at-risk">
          <span className="status-item__count">{metrics.atRisk}</span>
          <span className="status-item__label">At Risk</span>
        </div>
        <div className="status-item status-item--delayed">
          <span className="status-item__count">{metrics.delayed}</span>
          <span className="status-item__label">Delayed</span>
        </div>
      </div>
      
      <div className="metrics-overview__revenue">
        <div className="revenue-display">
          <span className="revenue-display__value">
            ${metrics.revenueThisMonth.toLocaleString()}
          </span>
          <span className="revenue-display__label">This Month</span>
        </div>
        {revenueChange !== 0 && (
          <span className={`revenue-change ${revenueChange > 0 ? 'revenue-change--up' : 'revenue-change--down'}`}>
            {revenueChange > 0 ? '↑' : '↓'} {Math.abs(revenueChange)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MILESTONE PROGRESS
// ============================================================================

interface MilestoneProgressListProps {
  milestones: MilestoneProgress[];
}

function MilestoneProgressList({ milestones }: MilestoneProgressListProps) {
  return (
    <div className="milestone-progress-list">
      <div className="milestone-progress-list__header">
        <h3>Milestone Progress</h3>
      </div>
      
      <div className="milestone-progress-list__items">
        {milestones.map((milestone, index) => (
          <div key={index} className="milestone-progress-item">
            <div className="milestone-progress-item__info">
              <span className="milestone-progress-item__name">{milestone.name}</span>
              <span className="milestone-progress-item__tier">Tier {milestone.tier}</span>
            </div>
            <ProgressBar
              value={milestone.completed}
              max={milestone.total}
              color={milestone.completed === milestone.total ? 'green' : 'blue'}
            />
            <span className="milestone-progress-item__count">
              {milestone.completed}/{milestone.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TIER DISTRIBUTION
// ============================================================================

interface TierDistributionChartProps {
  distribution: TierDistribution[];
}

function TierDistributionChart({ distribution }: TierDistributionChartProps) {
  const colors = ['blue', 'green', 'yellow'] as const;

  return (
    <div className="tier-distribution">
      <div className="tier-distribution__header">
        <h3>Tier Distribution</h3>
      </div>
      
      <div className="tier-distribution__chart">
        {distribution.map((tier, index) => (
          <div key={tier.tier} className="tier-bar">
            <div className="tier-bar__label">
              <span className="tier-bar__name">{tier.name}</span>
              <span className="tier-bar__count">{tier.count} projects</span>
            </div>
            <div className="tier-bar__track">
              <div
                className={`tier-bar__fill tier-bar__fill--${colors[index % colors.length]}`}
                style={{ width: `${tier.percentage}%` }}
              />
            </div>
            <span className="tier-bar__revenue">
              ${tier.revenue.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      
      <div className="tier-distribution__summary">
        <span className="tier-distribution__total">
          Total Revenue: ${distribution.reduce((sum, t) => sum + t.revenue, 0).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function AnalyticsLoadingSkeleton() {
  return (
    <div className="project-analytics project-analytics--loading">
      <div className="project-analytics__section">
        <Skeleton width={150} height={24} className="project-analytics__skeleton-title" />
        <div className="metrics-skeleton-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="metric-skeleton">
              <Skeleton width={60} height={32} />
              <Skeleton width={80} height={14} />
            </div>
          ))}
        </div>
      </div>
      
      <div className="project-analytics__section">
        <Skeleton width={180} height={24} className="project-analytics__skeleton-title" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="milestone-skeleton">
            <Skeleton width="30%" height={14} />
            <Skeleton width="100%" height={8} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectAnalytics({
  metrics,
  milestones,
  tierDistribution,
  loading = false,
}: ProjectAnalyticsProps) {
  if (loading) {
    return <AnalyticsLoadingSkeleton />;
  }

  return (
    <div className="project-analytics">
      {metrics && (
        <div className="project-analytics__section">
          <MetricsOverview metrics={metrics} />
        </div>
      )}
      
      {milestones && milestones.length > 0 && (
        <div className="project-analytics__section">
          <MilestoneProgressList milestones={milestones} />
        </div>
      )}
      
      {tierDistribution && tierDistribution.length > 0 && (
        <div className="project-analytics__section">
          <TierDistributionChart distribution={tierDistribution} />
        </div>
      )}
      
      {!metrics && !milestones?.length && !tierDistribution?.length && (
        <div className="project-analytics__empty">
          <span className="project-analytics__empty-icon">📊</span>
          <span className="project-analytics__empty-text">No analytics data available</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DEMO DATA GENERATOR
// ============================================================================

export function generateDemoAnalytics(): {
  metrics: ProjectMetrics;
  milestones: MilestoneProgress[];
  tierDistribution: TierDistribution[];
} {
  return {
    metrics: {
      totalProjects: 24,
      activeProjects: 12,
      completedProjects: 10,
      onTrack: 8,
      atRisk: 3,
      delayed: 1,
      averageCompletionDays: 45,
      revenueThisMonth: 18500,
      previousMonthRevenue: 15000,
    },
    milestones: [
      { name: 'Concept Design', completed: 8, total: 10, tier: 1 },
      { name: 'Draft Review', completed: 5, total: 8, tier: 2 },
      { name: 'Final Delivery', completed: 3, total: 6, tier: 3 },
    ],
    tierDistribution: [
      { tier: 1, name: 'The Concept', count: 8, revenue: 2392, percentage: 40 },
      { tier: 2, name: 'The Builder', count: 10, revenue: 14990, percentage: 50 },
      { tier: 3, name: 'The Concierge', count: 2, revenue: 9998, percentage: 10 },
    ],
  };
}

export default ProjectAnalytics;
