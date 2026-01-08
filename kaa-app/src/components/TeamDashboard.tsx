import React, { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import MessagingSystem from './MessagingSystem';
import NotificationSystem from './NotificationSystem';
import SageChat from './SageChat';
import './TeamDashboard.css';

interface TeamDashboardProps {
  teamMember: string;
  role: string;
  onLogout: () => void;
}

interface Project {
  id: string;
  name: string;
  clientAddress: string;
  status: string;
  lastClientActivity: string;
  pendingDeliverables: number;
  clientUploads: number;
  priority: 'High' | 'Medium' | 'Low';
}

interface ClientActivity {
  id: string;
  clientAddress: string;
  activity: string;
  timestamp: string;
  type: 'login' | 'upload' | 'view' | 'message';
}

interface Deliverable {
  id: string;
  title: string;
  project: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'High' | 'Medium' | 'Low';
}

const TeamDashboard: React.FC<TeamDashboardProps> = ({ teamMember, role, onLogout }) => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'projects' | 'deliverables' | 'communications' | 'messages' | 'notifications'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientActivity, setClientActivity] = useState<ClientActivity[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

  useEffect(() => {
    loadTeamData();
  }, [teamMember]);

  const loadTeamData = () => {
    // Demo data - in production this would come from the API
    setProjects([
      {
        id: '1',
        name: '123 Main Street Renovation',
        clientAddress: '123 Main Street, Austin TX',
        status: 'In Progress',
        lastClientActivity: '2 hours ago',
        pendingDeliverables: 3,
        clientUploads: 2,
        priority: 'High'
      },
      {
        id: '2',
        name: 'Oak Avenue Commercial',
        clientAddress: '456 Oak Avenue, Austin TX',
        status: 'Planning',
        lastClientActivity: '1 day ago',
        pendingDeliverables: 5,
        clientUploads: 1,
        priority: 'Medium'
      },
      {
        id: '3',
        name: 'Demo Project',
        clientAddress: 'Demo Project Address',
        status: 'Active',
        lastClientActivity: 'Just now',
        pendingDeliverables: 2,
        clientUploads: 0,
        priority: 'Low'
      }
    ]);

    setClientActivity([
      {
        id: '1',
        clientAddress: '123 Main Street, Austin TX',
        activity: 'Logged in and viewed project documents',
        timestamp: '2 hours ago',
        type: 'login'
      },
      {
        id: '2',
        clientAddress: '123 Main Street, Austin TX',
        activity: 'Uploaded permit application',
        timestamp: '4 hours ago',
        type: 'upload'
      },
      {
        id: '3',
        clientAddress: '456 Oak Avenue, Austin TX',
        activity: 'Viewed project timeline',
        timestamp: '1 day ago',
        type: 'view'
      },
      {
        id: '4',
        clientAddress: 'Demo Project Address',
        activity: 'Completed two-step verification',
        timestamp: 'Just now',
        type: 'login'
      }
    ]);

    setDeliverables([
      {
        id: '1',
        title: 'Final Design Review',
        project: '123 Main Street Renovation',
        dueDate: 'Tomorrow',
        status: 'pending',
        priority: 'High'
      },
      {
        id: '2',
        title: 'Permit Documentation',
        project: '123 Main Street Renovation',
        dueDate: 'Friday',
        status: 'in-progress',
        priority: 'High'
      },
      {
        id: '3',
        title: 'Project Proposal',
        project: 'Oak Avenue Commercial',
        dueDate: 'Next Week',
        status: 'pending',
        priority: 'Medium'
      },
      {
        id: '4',
        title: 'Client Presentation',
        project: 'Demo Project',
        dueDate: 'Next Month',
        status: 'pending',
        priority: 'Low'
      }
    ]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return '#ff4757';
      case 'Medium': return '#ffa502';
      case 'Low': return '#2ed573';
      default: return '#747d8c';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return '#ffa502';
      case 'Planning': return '#3742fa';
      case 'Active': return '#2ed573';
      case 'Completed': return '#2ed573';
      default: return '#747d8c';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return '🔐';
      case 'upload': return '📤';
      case 'view': return '👁️';
      case 'message': return '💬';
      default: return '📋';
    }
  };

  return (
    <div className="team-dashboard">
      {/* Team Header */}
      <div className="team-header">
        <div className="team-header-content">
          <div className="team-info">
            <span className="team-icon">🎯</span>
            <div className="team-details">
              <span className="team-role">Team Dashboard</span>
              <span className="team-member">{teamMember} - {role}</span>
            </div>
          </div>
          <div className="team-actions">
            <button
              className={`team-nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              🏠 Dashboard
            </button>
            <button
              className={`team-nav-btn ${currentView === 'projects' ? 'active' : ''}`}
              onClick={() => setCurrentView('projects')}
            >
              📋 Projects
            </button>
            <button
              className={`team-nav-btn ${currentView === 'deliverables' ? 'active' : ''}`}
              onClick={() => setCurrentView('deliverables')}
            >
              📤 Deliverables
            </button>
            <button
              className={`team-nav-btn ${currentView === 'communications' ? 'active' : ''}`}
              onClick={() => setCurrentView('communications')}
            >
              📞 Communications
            </button>
            <button
              className={`team-nav-btn ${currentView === 'messages' ? 'active' : ''}`}
              onClick={() => setCurrentView('messages')}
            >
              💬 Messages
            </button>
            <button
              className={`team-nav-btn ${currentView === 'notifications' ? 'active' : ''}`}
              onClick={() => setCurrentView('notifications')}
            >
              🔔 Notifications
            </button>
            <button className="team-logout-btn" onClick={onLogout}>
              ← Logout
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="team-content">
        <ErrorBoundary
          fallbackTitle="Dashboard Error"
          fallbackMessage="Something went wrong loading the dashboard. Please try refreshing the page."
        >
          {currentView === 'dashboard' && (
            <div className="dashboard-view">
            {/* Welcome Section */}
            <div className="welcome-section">
              <h1>Welcome back, {teamMember}!</h1>
              <p className="role-badge">{role}</p>
              <p className="last-login">Last Login: {new Date().toLocaleString()}</p>
            </div>

            {/* Stats Overview */}
            <div className="stats-overview">
              <div className="stat-card">
                <h3>{projects.length}</h3>
                <p>Assigned Projects</p>
              </div>
              <div className="stat-card">
                <h3>{deliverables.filter(d => d.status === 'pending').length}</h3>
                <p>Pending Deliverables</p>
              </div>
              <div className="stat-card">
                <h3>{clientActivity.filter(a => a.timestamp.includes('hour') || a.timestamp.includes('now')).length}</h3>
                <p>Recent Client Activity</p>
              </div>
              <div className="stat-card">
                <h3>{projects.reduce((sum, p) => sum + p.clientUploads, 0)}</h3>
                <p>Client Uploads Today</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
              <h2>Quick Actions</h2>
              <div className="quick-actions-grid">
                <button className="action-card" onClick={() => setCurrentView('deliverables')}>
                  📤 Update Deliverable
                </button>
                <button className="action-card" onClick={() => setCurrentView('communications')}>
                  💬 Message Client
                </button>
                <button className="action-card" onClick={() => setCurrentView('projects')}>
                  📋 View All Projects
                </button>
                <button className="action-card">
                  📊 Update Project Status
                </button>
              </div>
            </div>

            {/* Recent Client Activity */}
            <div className="activity-section">
              <h2>Recent Client Activity</h2>
              <div className="activity-list">
                {clientActivity.slice(0, 5).map(activity => (
                  <div key={activity.id} className="activity-item">
                    <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                    <div className="activity-details">
                      <p className="activity-title">{activity.clientAddress}</p>
                      <p className="activity-description">{activity.activity}</p>
                      <p className="activity-time">{activity.timestamp}</p>
                    </div>
                    <button className="activity-action">👁️</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Deliverables */}
            <div className="deliverables-section">
              <h2>Pending Deliverables</h2>
              <div className="deliverables-list">
                {deliverables.filter(d => d.status === 'pending').slice(0, 3).map(deliverable => (
                  <div key={deliverable.id} className="deliverable-item">
                    <div className="deliverable-priority" style={{ backgroundColor: getPriorityColor(deliverable.priority) }}>
                      {deliverable.priority}
                    </div>
                    <div className="deliverable-details">
                      <p className="deliverable-title">{deliverable.title}</p>
                      <p className="deliverable-project">{deliverable.project}</p>
                      <p className="deliverable-due">Due: {deliverable.dueDate}</p>
                    </div>
                    <button className="deliverable-action">📝</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentView === 'projects' && (
          <div className="projects-view">
            <h2>My Assigned Projects</h2>
            <div className="projects-grid">
              {projects.map(project => (
                <div key={project.id} className="project-card">
                  <div className="project-header">
                    <h3>{project.name}</h3>
                    <span className="project-status" style={{ backgroundColor: getStatusColor(project.status) }}>
                      {project.status}
                    </span>
                  </div>
                  <div className="project-details">
                    <p className="project-client">👤 {project.clientAddress}</p>
                    <p className="project-activity">🕒 Last client activity: {project.lastClientActivity}</p>
                    <div className="project-stats">
                      <span className="stat">📤 {project.pendingDeliverables} pending</span>
                      <span className="stat">📥 {project.clientUploads} uploads</span>
                    </div>
                  </div>
                  <div className="project-actions">
                    <button className="project-btn primary">View Details</button>
                    <button className="project-btn secondary">Message Client</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'deliverables' && (
          <div className="deliverables-view">
            <h2>My Deliverables</h2>
            <div className="deliverables-table">
              {deliverables.map(deliverable => (
                <div key={deliverable.id} className="deliverable-row">
                  <div className="deliverable-info">
                    <h4>{deliverable.title}</h4>
                    <p>{deliverable.project}</p>
                  </div>
                  <div className="deliverable-meta">
                    <span className="priority-badge" style={{ backgroundColor: getPriorityColor(deliverable.priority) }}>
                      {deliverable.priority}
                    </span>
                    <span className="status-badge">{deliverable.status}</span>
                    <span className="due-date">Due: {deliverable.dueDate}</span>
                  </div>
                  <div className="deliverable-actions">
                    <button className="action-btn">Edit</button>
                    <button className="action-btn">Complete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'communications' && (
          <div className="communications-view">
            <h2>Client Communications</h2>
            <div className="communications-list">
              {projects.map(project => (
                <div key={project.id} className="communication-item">
                  <div className="communication-header">
                    <h4>{project.name}</h4>
                    <span className="client-address">{project.clientAddress}</span>
                  </div>
                  <div className="communication-actions">
                    <button className="comm-btn">💬 Send Message</button>
                    <button className="comm-btn">📞 Call Client</button>
                    <button className="comm-btn">📧 Email</button>
                  </div>
                  <div className="recent-activity">
                    <p>Recent activity: {project.lastClientActivity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'messages' && (
          <MessagingSystem
            currentUser={teamMember}
            userType="team"
            projectId="demo-project"
            onClose={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'notifications' && (
          <NotificationSystem
            currentUser={teamMember}
            userType="team"
            onClose={() => setCurrentView('dashboard')}
          />
        )}
        </ErrorBoundary>
      </div>
      
      {/* Sage Assistant for Team */}
      <ErrorBoundary
        fallbackTitle="Sage Chat Error"
        fallbackMessage="Sage chat encountered an error. The assistant may not work properly."
      >
        <SageChat 
          mode="team"
          teamMember={teamMember}
          role={role}
          currentView={currentView}
          projects={projects}
          deliverables={deliverables}
          clientActivity={clientActivity}
        />
      </ErrorBoundary>
    </div>
  );
};

export default TeamDashboard;
