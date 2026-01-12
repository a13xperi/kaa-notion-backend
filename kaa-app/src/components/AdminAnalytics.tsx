import React, { useState } from 'react';
import {
  useAnalyticsSummary,
  useRevenueMetrics,
  useLeadMetrics,
  useProjectMetrics,
  useConversionMetrics,
  Period,
} from '../hooks/useAnalytics';
import './AdminAnalytics.css';

interface AdminAnalyticsProps {
  onExport?: () => void;
}

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ onExport }) => {
  const [period, setPeriod] = useState<Period>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'leads' | 'projects'>('overview');

  // Fetch data
  const { summary, tierDistribution, isLoading: summaryLoading, isError: summaryError } = useAnalyticsSummary();
  const { metrics: revenueMetrics, isLoading: revenueLoading } = useRevenueMetrics(period);
  const { metrics: leadMetrics, isLoading: leadsLoading } = useLeadMetrics(period);
  const { metrics: projectMetrics, isLoading: projectsLoading } = useProjectMetrics(period);
  const { metrics: conversionMetrics } = useConversionMetrics(period);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value}%`;
  };

  const getTierColor = (tier: number) => {
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];
    return colors[tier - 1] || '#6b7280';
  };

  if (summaryLoading) {
    return (
      <div className="admin-analytics">
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className="admin-analytics">
        <div className="analytics-error">
          <p>Failed to load analytics data</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-analytics">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-left">
          <h2>Analytics Dashboard</h2>
          <p className="header-subtitle">Business performance metrics and insights</p>
        </div>
        <div className="header-actions">
          <select
            className="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 90 days</option>
            <option value="year">Last 12 months</option>
            <option value="all">All time</option>
          </select>
          <button className="export-btn" onClick={onExport}>
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-header">
            <span className="card-icon">👥</span>
            <span className={`card-change ${(summary?.leads?.change ?? 0) >= 0 ? 'positive' : 'negative'}`}>
              {formatPercentage(summary?.leads?.change ?? 0)}
            </span>
          </div>
          <div className="card-value">{summary?.leads?.total ?? 0}</div>
          <div className="card-label">Total Leads</div>
          <div className="card-detail">
            {summary?.leads?.thisMonth ?? 0} this month
          </div>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <span className="card-icon">📈</span>
            <span className={`card-change ${(summary?.conversions?.change ?? 0) >= 0 ? 'positive' : 'negative'}`}>
              {formatPercentage(summary?.conversions?.change ?? 0)}
            </span>
          </div>
          <div className="card-value">{summary?.conversions?.rate ?? 0}%</div>
          <div className="card-label">Conversion Rate</div>
          <div className="card-detail">
            {summary?.conversions?.thisMonth ?? 0} conversions this month
          </div>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <span className="card-icon">💰</span>
            <span className={`card-change ${(summary?.revenue?.change ?? 0) >= 0 ? 'positive' : 'negative'}`}>
              {formatPercentage(summary?.revenue?.change ?? 0)}
            </span>
          </div>
          <div className="card-value">{formatCurrency(summary?.revenue?.total ?? 0)}</div>
          <div className="card-label">Total Revenue</div>
          <div className="card-detail">
            {formatCurrency(summary?.revenue?.thisMonth ?? 0)} this month
          </div>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <span className="card-icon">📋</span>
          </div>
          <div className="card-value">{summary?.projects?.active ?? 0}</div>
          <div className="card-label">Active Projects</div>
          <div className="card-detail">
            {summary?.projects?.completed ?? 0} completed
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="analytics-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          Revenue
        </button>
        <button
          className={`tab-btn ${activeTab === 'leads' ? 'active' : ''}`}
          onClick={() => setActiveTab('leads')}
        >
          Leads
        </button>
        <button
          className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects
        </button>
      </div>

      {/* Tab Content */}
      <div className="analytics-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Tier Distribution */}
            <div className="chart-section">
              <h3>Tier Distribution</h3>
              <div className="tier-distribution">
                {tierDistribution.map((tier) => (
                  <div key={tier.tier} className="tier-bar-container">
                    <div className="tier-info">
                      <span className="tier-name">{tier.tierName}</span>
                      <span className="tier-count">{tier.count} projects</span>
                    </div>
                    <div className="tier-bar-wrapper">
                      <div
                        className="tier-bar"
                        style={{
                          width: `${tier.percentage}%`,
                          backgroundColor: getTierColor(tier.tier),
                        }}
                      />
                    </div>
                    <div className="tier-revenue">{formatCurrency(tier.revenue)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion by Tier */}
            <div className="chart-section">
              <h3>Conversion by Tier</h3>
              <div className="conversion-grid">
                {conversionMetrics?.byTier.map((tier) => (
                  <div key={tier.tier} className="conversion-card">
                    <div className="conversion-header" style={{ borderColor: getTierColor(tier.tier) }}>
                      Tier {tier.tier}
                    </div>
                    <div className="conversion-stats">
                      <div className="stat-row">
                        <span>Leads</span>
                        <span className="stat-value">{tier.leads}</span>
                      </div>
                      <div className="stat-row">
                        <span>Converted</span>
                        <span className="stat-value">{tier.converted}</span>
                      </div>
                      <div className="stat-row highlight">
                        <span>Rate</span>
                        <span className="stat-value">{tier.rate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="revenue-tab">
            <div className="chart-section">
              <h3>Revenue Trend</h3>
              {revenueLoading ? (
                <div className="loading-inline">Loading...</div>
              ) : (
                <div className="revenue-chart">
                  <div className="chart-summary">
                    <div className="summary-item">
                      <span className="summary-label">Total Revenue</span>
                      <span className="summary-value">{formatCurrency(revenueMetrics?.totalRevenue || 0)}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Average Order</span>
                      <span className="summary-value">{formatCurrency(revenueMetrics?.averageOrderValue || 0)}</span>
                    </div>
                  </div>
                  <div className="monthly-bars">
                    {revenueMetrics?.revenueByMonth.slice(-6).map((month) => (
                      <div key={month.month} className="month-bar">
                        <div
                          className="bar-fill"
                          style={{
                            height: `${Math.min((month.revenue / (revenueMetrics.totalRevenue || 1)) * 400, 100)}%`,
                          }}
                        />
                        <div className="bar-label">{month.month.slice(5)}</div>
                        <div className="bar-value">{formatCurrency(month.revenue)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="chart-section">
              <h3>Revenue by Tier</h3>
              <div className="tier-revenue-grid">
                {revenueMetrics?.revenueByTier.map((tier) => (
                  <div key={tier.tier} className="tier-revenue-card">
                    <div
                      className="tier-badge"
                      style={{ backgroundColor: getTierColor(tier.tier) }}
                    >
                      Tier {tier.tier}
                    </div>
                    <div className="tier-amount">{formatCurrency(tier.revenue)}</div>
                    <div className="tier-transactions">{tier.count} transactions</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="leads-tab">
            <div className="chart-section">
              <h3>Lead Status</h3>
              {leadsLoading ? (
                <div className="loading-inline">Loading...</div>
              ) : (
                <div className="status-grid">
                  {leadMetrics?.byStatus.map((status) => (
                    <div key={status.status} className="status-card">
                      <div className="status-count">{status.count}</div>
                      <div className="status-label">{status.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="chart-section">
              <h3>Lead Trend</h3>
              <div className="monthly-bars">
                {leadMetrics?.leadsByMonth.slice(-6).map((month) => (
                  <div key={month.month} className="month-bar leads-bar">
                    <div
                      className="bar-fill"
                      style={{
                        height: `${Math.min((month.count / (leadMetrics.totalLeads || 1)) * 300, 100)}%`,
                      }}
                    />
                    <div className="bar-label">{month.month.slice(5)}</div>
                    <div className="bar-value">{month.count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-section">
              <h3>Lead Sources</h3>
              <div className="source-list">
                {leadMetrics?.bySource.map((source) => (
                  <div key={source.source} className="source-item">
                    <span className="source-name">{source.source}</span>
                    <div className="source-bar-wrapper">
                      <div
                        className="source-bar"
                        style={{
                          width: `${(source.count / (leadMetrics.totalLeads || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="source-count">{source.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="projects-tab">
            <div className="chart-section">
              <h3>Project Status</h3>
              {projectsLoading ? (
                <div className="loading-inline">Loading...</div>
              ) : (
                <>
                  <div className="project-summary">
                    <div className="project-stat">
                      <span className="stat-value">{projectMetrics?.totalProjects || 0}</span>
                      <span className="stat-label">Total</span>
                    </div>
                    <div className="project-stat active">
                      <span className="stat-value">{projectMetrics?.activeProjects || 0}</span>
                      <span className="stat-label">Active</span>
                    </div>
                    <div className="project-stat completed">
                      <span className="stat-value">{projectMetrics?.completedProjects || 0}</span>
                      <span className="stat-label">Completed</span>
                    </div>
                    <div className="project-stat">
                      <span className="stat-value">{projectMetrics?.averageCompletionTime || 0}d</span>
                      <span className="stat-label">Avg. Completion</span>
                    </div>
                  </div>
                  <div className="status-breakdown">
                    {projectMetrics?.byStatus.map((status) => (
                      <div key={status.status} className="status-item">
                        <span className="status-name">{status.status}</span>
                        <span className="status-count">{status.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="chart-section">
              <h3>Project Activity</h3>
              <div className="activity-chart">
                {projectMetrics?.projectsByMonth.slice(-6).map((month) => (
                  <div key={month.month} className="activity-month">
                    <div className="month-label">{month.month.slice(5)}</div>
                    <div className="activity-bars">
                      <div className="created-bar">
                        <span className="bar-label">Created</span>
                        <div className="bar" style={{ width: `${month.created * 20}px` }} />
                        <span className="bar-value">{month.created}</span>
                      </div>
                      <div className="completed-bar">
                        <span className="bar-label">Completed</span>
                        <div className="bar" style={{ width: `${month.completed * 20}px` }} />
                        <span className="bar-value">{month.completed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
