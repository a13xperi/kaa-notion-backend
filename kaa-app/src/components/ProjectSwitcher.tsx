import React, { useState, useEffect, useRef } from 'react';
import './ProjectSwitcher.css';

interface Project {
  id: string;
  name: string;
  status: string;
  projectAddress: string | null;
  tier: number;
  progress: number;
  updatedAt: string;
}

interface ProjectSummary {
  activeCount: number;
  archivedCount: number;
  maxProjects: number;
  canCreateNew: boolean;
}

interface ProjectSwitcherProps {
  currentProjectId?: string;
  onProjectSelect: (projectId: string) => void;
  onNewProject?: () => void;
}

const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  currentProjectId,
  onProjectSelect,
  onNewProject,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const [projectsRes, summaryRes] = await Promise.all([
        fetch('/api/projects/active', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/projects/summary', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data);
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      INQUIRY: '#6b7280',
      PROPOSAL: '#f59e0b',
      PLANNING: '#3b82f6',
      IN_PROGRESS: '#8b5cf6',
      REVIEW: '#ec4899',
      DELIVERED: '#10b981',
      CLOSED: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  const formatStatus = (status: string): string => {
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="project-switcher">
        <div className="project-switcher-trigger skeleton" />
      </div>
    );
  }

  return (
    <div className="project-switcher" ref={dropdownRef}>
      <button
        className="project-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="project-switcher-current">
          {currentProject ? (
            <>
              <div className="project-icon">
                <span className="tier-badge">T{currentProject.tier}</span>
              </div>
              <div className="project-info">
                <span className="project-name">{currentProject.name}</span>
                <span
                  className="project-status"
                  style={{ color: getStatusColor(currentProject.status) }}
                >
                  {formatStatus(currentProject.status)}
                </span>
              </div>
            </>
          ) : (
            <span className="no-project">Select a project</span>
          )}
        </div>
        <svg
          className={`chevron ${isOpen ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="project-switcher-dropdown" role="listbox">
          <div className="dropdown-header">
            <span className="header-title">Your Projects</span>
            {summary && (
              <span className="project-count">
                {summary.activeCount}
                {summary.maxProjects > 0 && ` / ${summary.maxProjects}`}
              </span>
            )}
          </div>

          <div className="project-list">
            {projects.map((project) => (
              <button
                key={project.id}
                className={`project-item ${project.id === currentProjectId ? 'active' : ''}`}
                onClick={() => {
                  onProjectSelect(project.id);
                  setIsOpen(false);
                }}
                role="option"
                aria-selected={project.id === currentProjectId}
              >
                <div className="project-item-icon">
                  <span className="tier-badge small">T{project.tier}</span>
                </div>
                <div className="project-item-info">
                  <span className="project-item-name">{project.name}</span>
                  <div className="project-item-meta">
                    <span
                      className="status-dot"
                      style={{ backgroundColor: getStatusColor(project.status) }}
                    />
                    <span className="project-item-status">
                      {formatStatus(project.status)}
                    </span>
                    <span className="project-item-progress">{project.progress}%</span>
                  </div>
                </div>
                {project.id === currentProjectId && (
                  <svg className="check-icon" width="16" height="16" viewBox="0 0 16 16">
                    <path
                      d="M13.5 4L6 11.5L2.5 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {(summary?.archivedCount ?? 0) > 0 && (
            <div className="archived-info">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.5 2h-9a.5.5 0 00-.5.5v2a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-2a.5.5 0 00-.5-.5zM3 6v7.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V6H3zm4.5 2h1v3h-1V8z" />
              </svg>
              <span>{summary?.archivedCount} archived</span>
            </div>
          )}

          {summary?.canCreateNew && onNewProject && (
            <button className="new-project-btn" onClick={onNewProject}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span>New Project</span>
            </button>
          )}

          {!summary?.canCreateNew && summary?.maxProjects !== -1 && (
            <div className="upgrade-prompt">
              <span>Project limit reached</span>
              <a href="/settings/subscription">Upgrade</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectSwitcher;
