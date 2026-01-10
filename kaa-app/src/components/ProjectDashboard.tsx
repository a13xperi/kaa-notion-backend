import React from 'react';
import './ProjectDashboard.css';

// Types
export interface ProjectProgress {
  completed: number;
  total: number;
  percentage: number;
  currentMilestone: string | null;
}

export interface Project {
  id: string;
  name: string;
  tier: number;
  status: string;
  projectAddress?: string | null;
  createdAt: string;
  progress?: ProjectProgress;
  milestones?: Array<{
    id: string;
    name: string;
    status: string;
    order: number;
  }>;
}

interface ProjectDashboardProps {
  projects: Project[];
  userName?: string;
  onProjectClick: (projectId: string) => void;
  onViewAllProjects?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

// Status display configuration
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  INTAKE: { label: 'Intake', className: 'status--intake' },
  ONBOARDING: { label: 'Onboarding', className: 'status--onboarding' },
  IN_PROGRESS: { label: 'In Progress', className: 'status--in-progress' },
  AWAITING_FEEDBACK: { label: 'Awaiting Feedback', className: 'status--awaiting' },
  REVISIONS: { label: 'Revisions', className: 'status--revisions' },
  DELIVERED: { label: 'Delivered', className: 'status--delivered' },
  CLOSED: { label: 'Closed', className: 'status--closed' },
};

// Tier display configuration
const TIER_CONFIG: Record<number, { name: string; className: string }> = {
  1: { name: 'Seedling', className: 'tier--1' },
  2: { name: 'Sprout', className: 'tier--2' },
  3: { name: 'Canopy', className: 'tier--3' },
  4: { name: 'Legacy', className: 'tier--4' },
};

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  userName,
  onProjectClick,
  onViewAllProjects,
  isLoading = false,
  error = null,
}) => {
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get active projects (not delivered or closed)
  const activeProjects = projects.filter(
    (p) => p.status !== 'DELIVERED' && p.status !== 'CLOSED'
  );

  // Get completed projects
  const completedProjects = projects.filter((p) => p.status === 'DELIVERED');

  if (isLoading) {
    return (
      <div className="project-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner" aria-label="Loading projects" />
          <p>Loading your projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-dashboard">
        <div className="dashboard-error">
          <span className="error-icon" aria-hidden="true">!</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-greeting">
          <h1>
            {getGreeting()}
            {userName && <span className="user-name">, {userName}</span>}
          </h1>
          <p className="dashboard-subtitle">
            {activeProjects.length > 0
              ? `You have ${activeProjects.length} active project${activeProjects.length !== 1 ? 's' : ''}`
              : 'Welcome to your project portal'}
          </p>
        </div>
      </header>

      {/* Quick Stats */}
      {projects.length > 0 && (
        <div className="dashboard-stats">
          <div className="stat-card">
            <span className="stat-value">{activeProjects.length}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{completedProjects.length}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{projects.length}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
      )}

      {/* Active Projects */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Active Projects</h2>
          {onViewAllProjects && projects.length > 3 && (
            <button
              type="button"
              className="view-all-btn"
              onClick={onViewAllProjects}
            >
              View All
            </button>
          )}
        </div>

        {activeProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p>No active projects</p>
            <span className="empty-hint">Your projects will appear here once started</span>
          </div>
        ) : (
          <div className="project-grid">
            {activeProjects.slice(0, 6).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onProjectClick(project.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recently Completed */}
      {completedProjects.length > 0 && (
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Recently Completed</h2>
          </div>
          <div className="project-grid">
            {completedProjects.slice(0, 3).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onProjectClick(project.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// Project Card Sub-component
interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const status = STATUS_CONFIG[project.status] || { label: project.status, className: '' };
  const tier = TIER_CONFIG[project.tier] || { name: `Tier ${project.tier}`, className: '' };
  const progress = project.progress;

  return (
    <button
      type="button"
      className="project-card"
      onClick={onClick}
      aria-label={`View project: ${project.name}`}
    >
      <div className="project-card-header">
        <span className={`tier-badge ${tier.className}`}>{tier.name}</span>
        <span className={`status-badge ${status.className}`}>{status.label}</span>
      </div>

      <h3 className="project-name">{project.name}</h3>

      {project.projectAddress && (
        <p className="project-address">{project.projectAddress}</p>
      )}

      {progress && (
        <div className="project-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress.percentage}%` }}
              aria-valuenow={progress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>
          <div className="progress-info">
            <span className="progress-text">
              {progress.percentage}% complete
            </span>
            {progress.currentMilestone && (
              <span className="current-milestone">
                {progress.currentMilestone}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="project-card-footer">
        <span className="view-details">View Details</span>
        <span className="arrow" aria-hidden="true">→</span>
      </div>
    </button>
  );
};

export default ProjectDashboard;
