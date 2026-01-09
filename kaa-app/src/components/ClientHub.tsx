import React, { useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger';
import SageLogo from './SageLogo';
import './ClientHub.css';

interface ClientHubProps {
  clientAddress: string;
  onViewProjects: () => void;
  onViewDocuments: () => void;
  onUpload: () => void;
  onViewMessages: () => void;
  onViewAnalytics: () => void;
  onViewDeliverables?: () => void;
}

interface ClientActivity {
  id: string;
  title: string;
  timestamp: string;
  type: 'document' | 'update' | 'message';
  author?: string;
}

interface ClientStats {
  totalDocuments: number;
  recentUploads: number;
  pendingItems: number;
  projectStatus?: string;
  projectProgress?: number;
}

interface RecentActivity {
  id: string;
  title: string;
  type: 'document' | 'update' | 'message';
  timestamp: string;
  author?: string;
}

const ClientHub: React.FC<ClientHubProps> = ({
  clientAddress,
  onViewProjects,
  onViewDocuments,
  onUpload,
  onViewMessages,
  onViewAnalytics,
  onViewDeliverables
}) => {
  const [stats, setStats] = useState({
    totalDocuments: 0,
    recentUploads: 0,
    pendingItems: 0,
    projectStatus: 'Active'
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [lastLogin, setLastLogin] = useState<string>('');

  const loadClientData = useCallback(async () => {
    // Get last login from localStorage
    const lastLoginTime = localStorage.getItem('kaa-last-login');
    if (lastLoginTime) {
      const date = new Date(lastLoginTime);
      setLastLogin(date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    
    // Save current login time
    localStorage.setItem('kaa-last-login', new Date().toISOString());

    try {
      // Fetch real data from API
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/client/data/${encodeURIComponent(clientAddress)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Update stats with real data
        setStats({
          totalDocuments: data.stats?.totalDocuments || 0,
          recentUploads: data.stats?.recentUploads || 0,
          pendingItems: data.stats?.pendingItems || 0,
          projectStatus: data.client?.status || 'Active'
        });

        // Update recent activity with real data
        const activities: ClientActivity[] = data.activities?.slice(0, 5).map((activity: {
          id?: string;
          activity?: string;
          type?: string;
          timestamp?: string;
        }) => ({
          id: activity.id || Math.random().toString(),
          title: activity.activity || 'Activity',
          type: activity.type === 'Document Upload' ? 'document' : 
                activity.type === 'Login' ? 'update' : 'message',
          timestamp: activity.timestamp || 'Recently',
          author: activity.type === 'Login' ? 'You' : 'KAA Team'
        })) || [];

        setRecentActivity(activities);
        return; // Exit early if we got real data
      }
    } catch (error) {
      logger.error('Error fetching client data:', error);
    }

    // Fallback to demo data if API fails or no data
    setStats({
      totalDocuments: 12,
      recentUploads: 3,
      pendingItems: 2,
      projectStatus: 'Active'
    });

    setRecentActivity([
      {
        id: '1',
        title: 'Contract Amendment V2.pdf',
        type: 'document',
        timestamp: '2 hours ago',
        author: 'Project Manager'
      },
      {
        id: '2',
        title: 'Project Timeline Updated',
        type: 'update',
        timestamp: '1 day ago',
        author: 'Team Lead'
      },
      {
        id: '3',
        title: 'Budget Report Q4.xlsx',
        type: 'document',
        timestamp: '3 days ago',
        author: 'Finance Team'
      },
      {
        id: '4',
        title: 'New message from your project manager',
        type: 'message',
        timestamp: '1 week ago',
        author: 'Project Manager'
      }
    ]);
  }, [clientAddress]);

  useEffect(() => {
    // Load client data
    loadClientData();
  }, [loadClientData]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document': return '📄';
      case 'update': return '🔔';
      case 'message': return '💬';
      default: return '📌';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'status-active';
      case 'completed': return 'status-completed';
      case 'pending': return 'status-pending';
      default: return 'status-default';
    }
  };

  return (
    <div className="client-hub">
      {/* Hero Section */}
      <div className="hub-hero">
        <div className="hero-content">
          <div className="hero-welcome">
            <SageLogo size="medium" className="hero-logo" />
            <div className="hero-text">
              <h1 className="hero-title">Welcome back!</h1>
              <p className="hero-address">{clientAddress}</p>
            </div>
          </div>
          <div className="hero-status">
            <span className={`status-badge ${getStatusColor(stats.projectStatus)}`}>
              <span className="status-dot"></span>
              {stats.projectStatus}
            </span>
            {lastLogin && (
              <span className="last-login">Last login: {lastLogin}</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="hub-stats">
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalDocuments}</span>
            <span className="stat-label">Total Documents</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📤</div>
          <div className="stat-content">
            <span className="stat-value">{stats.recentUploads}</span>
            <span className="stat-label">Recent Uploads</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <span className="stat-value">{stats.pendingItems}</span>
            <span className="stat-label">Pending Items</span>
          </div>
        </div>
        <div className="stat-card stat-progress">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-value">75%</span>
            <span className="stat-label">Project Progress</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="hub-content-grid">
        {/* Recent Activity */}
        <div className="hub-section activity-section">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
            <button className="section-action" onClick={onViewProjects}>
              View All →
            </button>
          </div>
          <div className="activity-list">
            {recentActivity.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No recent activity</p>
              </div>
            ) : (
              recentActivity.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                  <div className="activity-details">
                    <p className="activity-title">{activity.title}</p>
                    <p className="activity-meta">
                      {activity.author && <span>{activity.author} • </span>}
                      <span>{activity.timestamp}</span>
                    </p>
                  </div>
                  <button 
                    className="activity-action"
                    onClick={() => {
                      if (activity.type === 'message') {
                        onViewMessages();
                      } else {
                        onViewProjects();
                      }
                    }}
                  >
                    View
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="hub-section actions-section">
          <div className="section-header">
            <h2 className="section-title">Quick Actions</h2>
          </div>
          <div className="actions-grid">
            <button className="action-card action-primary" onClick={onUpload}>
              <div className="action-icon">📤</div>
              <div className="action-content">
                <span className="action-title">Upload Document</span>
                <span className="action-description">Share files with your team</span>
              </div>
            </button>
            <button className="action-card" onClick={onViewProjects}>
              <div className="action-icon">📁</div>
              <div className="action-content">
                <span className="action-title">View Projects</span>
                <span className="action-description">Browse project plans and deliverables</span>
              </div>
            </button>
            <button className="action-card" onClick={onViewDocuments}>
              <div className="action-icon">📄</div>
              <div className="action-content">
                <span className="action-title">Your Documents</span>
                <span className="action-description">View uploaded documents</span>
              </div>
            </button>
            <button 
              className="action-card"
              onClick={onViewMessages}
            >
              <div className="action-icon">💬</div>
              <div className="action-content">
                <span className="action-title">Contact Manager</span>
                <span className="action-description">Send a message</span>
              </div>
            </button>
            <button
              className="action-card"
              onClick={onViewAnalytics}
            >
              <div className="action-icon">📊</div>
              <div className="action-content">
                <span className="action-title">Project Timeline</span>
                <span className="action-description">View milestones</span>
              </div>
            </button>
            {onViewDeliverables && (
              <button
                className="action-card action-deliverables"
                onClick={onViewDeliverables}
              >
                <div className="action-icon">📦</div>
                <div className="action-content">
                  <span className="action-title">Deliverables</span>
                  <span className="action-description">Download project files</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Important Documents */}
        <div className="hub-section documents-section">
          <div className="section-header">
            <h2 className="section-title">Important Documents</h2>
            <button className="section-action" onClick={onViewProjects}>
              View All →
            </button>
          </div>
          <div className="documents-list">
            <div className="document-item pinned">
              <div className="document-icon">📌</div>
              <div className="document-details">
                <p className="document-title">Project Contract.pdf</p>
                <p className="document-meta">Updated 2 days ago</p>
              </div>
              <button 
                className="document-action"
                onClick={onViewProjects}
              >
                View
              </button>
            </div>
            <div className="document-item pinned">
              <div className="document-icon">📌</div>
              <div className="document-details">
                <p className="document-title">Service Agreement.pdf</p>
                <p className="document-meta">Updated 1 week ago</p>
              </div>
              <button 
                className="document-action"
                onClick={onViewProjects}
              >
                View
              </button>
            </div>
            <div className="document-item">
              <div className="document-icon">📄</div>
              <div className="document-details">
                <p className="document-title">Project Scope.docx</p>
                <p className="document-meta">Updated 2 weeks ago</p>
              </div>
              <button 
                className="document-action"
                onClick={onViewProjects}
              >
                View
              </button>
            </div>
          </div>
        </div>

        {/* Project Progress */}
        <div className="hub-section progress-section">
          <div className="section-header">
            <h2 className="section-title">Project Progress</h2>
          </div>
          <div className="progress-content">
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: '75%' }}>
                <span className="progress-label">75% Complete</span>
              </div>
            </div>
            <div className="milestones-list">
              <div className="milestone completed">
                <div className="milestone-marker">✓</div>
                <div className="milestone-content">
                  <span className="milestone-title">Project Kickoff</span>
                  <span className="milestone-date">Completed Jan 15</span>
                </div>
              </div>
              <div className="milestone completed">
                <div className="milestone-marker">✓</div>
                <div className="milestone-content">
                  <span className="milestone-title">Phase 1 Delivery</span>
                  <span className="milestone-date">Completed Feb 20</span>
                </div>
              </div>
              <div className="milestone active">
                <div className="milestone-marker">⏱️</div>
                <div className="milestone-content">
                  <span className="milestone-title">Phase 2 Review</span>
                  <span className="milestone-date">In Progress</span>
                </div>
              </div>
              <div className="milestone upcoming">
                <div className="milestone-marker">○</div>
                <div className="milestone-content">
                  <span className="milestone-title">Final Delivery</span>
                  <span className="milestone-date">Target: Apr 30</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="hub-section notifications-section">
          <div className="section-header">
            <h2 className="section-title">Notifications</h2>
            <button className="section-action">Mark all read</button>
          </div>
          <div className="notifications-list">
            <div className="notification-item unread">
              <div className="notification-dot"></div>
              <div className="notification-content">
                <p className="notification-title">New document uploaded</p>
                <p className="notification-time">2 hours ago</p>
              </div>
            </div>
            <div className="notification-item unread">
              <div className="notification-dot"></div>
              <div className="notification-content">
                <p className="notification-title">Your approval is required</p>
                <p className="notification-time">1 day ago</p>
              </div>
            </div>
            <div className="notification-item">
              <div className="notification-dot"></div>
              <div className="notification-content">
                <p className="notification-title">Project milestone completed</p>
                <p className="notification-time">3 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientHub;

