import React from 'react';
import './AdminDashboard.css';

// Types
export interface DashboardSummary {
  totalLeads: number;
  totalProjects: number;
  totalClients: number;
  totalRevenue: number;
  paymentCount: number;
  conversionRate: number;
}

export interface LeadsByStatus {
  NEW: number;
  CONTACTED: number;
  QUALIFIED: number;
  CONVERTED: number;
  CLOSED: number;
  NURTURE: number;
}

export interface ProjectByTier {
  tier: number;
  tierName: string;
  count: number;
}

export interface RecentLead {
  id: string;
  email: string;
  fullName: string | null;
  status: string;
  recommendedTier: number | null;
  tierName: string | null;
  createdAt: string;
}

export interface RecentProject {
  id: string;
  name: string;
  tier: number;
  tierName: string;
  status: string;
  clientEmail: string | null;
  clientName: string | null;
  createdAt: string;
}

export interface AdminDashboardData {
  summary: DashboardSummary;
  leadsByStatus: LeadsByStatus;
  projectsByTier: ProjectByTier[];
  projectsByStatus: Record<string, number>;
  recentLeads: RecentLead[];
  recentProjects: RecentProject[];
}

export interface AdminDashboardProps {
  data: AdminDashboardData;
  isLoading?: boolean;
  onViewAllLeads?: () => void;
  onViewAllProjects?: () => void;
  onViewAllClients?: () => void;
  onLeadClick?: (leadId: string) => void;
  onProjectClick?: (projectId: string) => void;
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
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

// Status badge colors
function getLeadStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NEW: '#3b82f6',
    CONTACTED: '#8b5cf6',
    QUALIFIED: '#10b981',
    CONVERTED: '#059669',
    CLOSED: '#6b7280',
    NURTURE: '#f59e0b',
  };
  return colors[status] || '#6b7280';
}

function getProjectStatusColor(status: string): string {
  const colors: Record<string, string> = {
    INTAKE: '#6b7280',
    ONBOARDING: '#3b82f6',
    IN_PROGRESS: '#f59e0b',
    AWAITING_FEEDBACK: '#ec4899',
    REVISIONS: '#ef4444',
    DELIVERED: '#10b981',
    CLOSED: '#6b7280',
  };
  return colors[status] || '#6b7280';
}

// Tier colors
function getTierColor(tier: number): string {
  const colors: Record<number, string> = {
    1: '#22c55e',
    2: '#10b981',
    3: '#0d9488',
    4: '#f59e0b',
  };
  return colors[tier] || '#6b7280';
}

// Stat Card Component
const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  onClick?: () => void;
}> = ({ label, value, icon, trend, onClick }) => (
  <div
    className={`stat-card ${onClick ? 'stat-card--clickable' : ''}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-content">
      <span className="stat-card-value">{value}</span>
      <span className="stat-card-label">{label}</span>
      {trend && (
        <span className={`stat-card-trend ${trend.value >= 0 ? 'trend--up' : 'trend--down'}`}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </span>
      )}
    </div>
  </div>
);

// Lead Status Chart
const LeadStatusChart: React.FC<{ data: LeadsByStatus }> = ({ data }) => {
  const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED', 'NURTURE'] as const;
  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <div className="status-chart">
      <div className="status-bars">
        {statuses.map((status) => {
          const count = data[status] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={status} className="status-bar-item">
              <div className="status-bar-header">
                <span className="status-name">{status.replace('_', ' ')}</span>
                <span className="status-count">{count}</span>
              </div>
              <div className="status-bar-track">
                <div
                  className="status-bar-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: getLeadStatusColor(status),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Projects by Tier Chart
const TierChart: React.FC<{ data: ProjectByTier[] }> = ({ data }) => {
  const total = data.reduce((a, b) => a + b.count, 0);

  return (
    <div className="tier-chart">
      <div className="tier-donut">
        {data.length > 0 ? (
          <svg viewBox="0 0 100 100" className="donut-svg">
            {(() => {
              let cumulativePercentage = 0;
              return data.map((item) => {
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                const startAngle = (cumulativePercentage / 100) * 360;
                const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
                cumulativePercentage += percentage;

                const startRad = ((startAngle - 90) * Math.PI) / 180;
                const endRad = ((endAngle - 90) * Math.PI) / 180;

                const x1 = 50 + 40 * Math.cos(startRad);
                const y1 = 50 + 40 * Math.sin(startRad);
                const x2 = 50 + 40 * Math.cos(endRad);
                const y2 = 50 + 40 * Math.sin(endRad);

                const largeArc = percentage > 50 ? 1 : 0;

                return (
                  <path
                    key={item.tier}
                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={getTierColor(item.tier)}
                  />
                );
              });
            })()}
            <circle cx="50" cy="50" r="25" fill="white" />
            <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="donut-total">
              {total}
            </text>
          </svg>
        ) : (
          <div className="donut-empty">No projects</div>
        )}
      </div>
      <div className="tier-legend">
        {data.map((item) => (
          <div key={item.tier} className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: getTierColor(item.tier) }}
            />
            <span className="legend-label">{item.tierName}</span>
            <span className="legend-value">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Recent Leads Table
const RecentLeadsTable: React.FC<{
  leads: RecentLead[];
  onViewAll?: () => void;
  onLeadClick?: (id: string) => void;
}> = ({ leads, onViewAll, onLeadClick }) => (
  <div className="dashboard-card">
    <div className="card-header">
      <h3 className="card-title">Recent Leads</h3>
      {onViewAll && (
        <button type="button" className="view-all-btn" onClick={onViewAll}>
          View All
        </button>
      )}
    </div>
    <div className="recent-table">
      {leads.length === 0 ? (
        <div className="table-empty">No leads yet</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Contact</th>
              <th>Status</th>
              <th>Tier</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onLeadClick?.(lead.id)}
                className={onLeadClick ? 'row--clickable' : ''}
              >
                <td className="cell-contact">
                  <span className="contact-name">{lead.fullName || 'Unknown'}</span>
                  <span className="contact-email">{lead.email}</span>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: `${getLeadStatusColor(lead.status)}20`, color: getLeadStatusColor(lead.status) }}
                  >
                    {lead.status}
                  </span>
                </td>
                <td>
                  {lead.tierName ? (
                    <span className="tier-badge" style={{ color: getTierColor(lead.recommendedTier || 1) }}>
                      {lead.tierName}
                    </span>
                  ) : (
                    <span className="tier-badge tier-badge--none">—</span>
                  )}
                </td>
                <td className="cell-time">{formatRelativeTime(lead.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

// Recent Projects Table
const RecentProjectsTable: React.FC<{
  projects: RecentProject[];
  onViewAll?: () => void;
  onProjectClick?: (id: string) => void;
}> = ({ projects, onViewAll, onProjectClick }) => (
  <div className="dashboard-card">
    <div className="card-header">
      <h3 className="card-title">Recent Projects</h3>
      {onViewAll && (
        <button type="button" className="view-all-btn" onClick={onViewAll}>
          View All
        </button>
      )}
    </div>
    <div className="recent-table">
      {projects.length === 0 ? (
        <div className="table-empty">No projects yet</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Client</th>
              <th>Status</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                onClick={() => onProjectClick?.(project.id)}
                className={onProjectClick ? 'row--clickable' : ''}
              >
                <td className="cell-project">
                  <span className="project-name">{project.name}</span>
                  <span className="project-tier" style={{ color: getTierColor(project.tier) }}>
                    {project.tierName}
                  </span>
                </td>
                <td className="cell-client">
                  <span className="client-name">{project.clientName || 'Unknown'}</span>
                  {project.clientEmail && (
                    <span className="client-email">{project.clientEmail}</span>
                  )}
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: `${getProjectStatusColor(project.status)}20`, color: getProjectStatusColor(project.status) }}
                  >
                    {project.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="cell-time">{formatRelativeTime(project.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

// Loading skeleton
const DashboardSkeleton: React.FC = () => (
  <div className="admin-dashboard admin-dashboard--loading">
    <div className="stats-grid">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="stat-card skeleton-card">
          <div className="skeleton skeleton-icon" />
          <div className="skeleton-content">
            <div className="skeleton skeleton-value" />
            <div className="skeleton skeleton-label" />
          </div>
        </div>
      ))}
    </div>
    <div className="charts-grid">
      <div className="dashboard-card skeleton-chart" />
      <div className="dashboard-card skeleton-chart" />
    </div>
    <div className="tables-grid">
      <div className="dashboard-card skeleton-table" />
      <div className="dashboard-card skeleton-table" />
    </div>
  </div>
);

// Main Component
const AdminDashboard: React.FC<AdminDashboardProps> = ({
  data,
  isLoading = false,
  onViewAllLeads,
  onViewAllProjects,
  onViewAllClients,
  onLeadClick,
  onProjectClick,
}) => {
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const { summary, leadsByStatus, projectsByTier, recentLeads, recentProjects } = data;

  return (
    <div className="admin-dashboard">
      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Leads"
          value={summary.totalLeads}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
          onClick={onViewAllLeads}
        />
        <StatCard
          label="Active Projects"
          value={summary.totalProjects}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          }
          onClick={onViewAllProjects}
        />
        <StatCard
          label="Total Clients"
          value={summary.totalClients}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
          onClick={onViewAllClients}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(summary.totalRevenue)}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
        />
      </div>

      {/* Conversion Rate Banner */}
      <div className="conversion-banner">
        <div className="conversion-content">
          <span className="conversion-label">Lead Conversion Rate</span>
          <span className="conversion-value">{summary.conversionRate}%</span>
        </div>
        <div className="conversion-bar">
          <div
            className="conversion-fill"
            style={{ width: `${Math.min(summary.conversionRate, 100)}%` }}
          />
        </div>
        <span className="conversion-detail">
          {summary.paymentCount} successful payment{summary.paymentCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Leads by Status</h3>
          </div>
          <LeadStatusChart data={leadsByStatus} />
        </div>
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Projects by Tier</h3>
          </div>
          <TierChart data={projectsByTier} />
        </div>
      </div>

      {/* Recent Tables */}
      <div className="tables-grid">
        <RecentLeadsTable
          leads={recentLeads}
          onViewAll={onViewAllLeads}
          onLeadClick={onLeadClick}
        />
        <RecentProjectsTable
          projects={recentProjects}
          onViewAll={onViewAllProjects}
          onProjectClick={onProjectClick}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
