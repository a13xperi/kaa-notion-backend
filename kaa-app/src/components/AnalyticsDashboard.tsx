import React, { useState, useEffect } from 'react';
import './AnalyticsDashboard.css';

interface ClientProjectMetrics {
  projectProgress: number; // Percentage complete
  milestonesCompleted: number;
  milestonesTotal: number;
  deliverablesReceived: number;
  daysUntilNextMilestone: number;
  responseTime: number; // Average hours for team to respond
  projectHealth: 'on-track' | 'at-risk' | 'delayed';
}

interface TeamPerformance {
  teamMember: string;
  role: string;
  projectsAssigned: number;
  projectsCompleted: number;
  averageCompletionTime: number;
  clientRating: number;
  lastActive: string;
}

interface ClientActivity {
  clientAddress: string;
  projectType: string;
  status: string;
  lastActivity: string;
  documentsUploaded: number;
  messagesSent: number;
  satisfactionRating: number;
}

interface AnalyticsDashboardProps {
  userType: 'client' | 'team';
  currentUser: string;
  onClose?: () => void; // Optional - not needed when used in workspace
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  userType, 
  currentUser, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'activity' | 'projects' | 'team' | 'clients'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [projectMetrics, setProjectMetrics] = useState<ClientProjectMetrics | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [clientActivity, setClientActivity] = useState<ClientActivity[]>([]);
  const [milestones, setMilestones] = useState<Array<{
    name: string;
    status: 'completed' | 'in-progress' | 'upcoming';
    dueDate?: string;
    completedDate?: string;
  }>>([]);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, userType]);

  const loadAnalyticsData = () => {
    // Client-focused demo data - in production, this would come from the API
    if (userType === 'client') {
      const demoClientMetrics: ClientProjectMetrics = {
        projectProgress: 75, // Percentage complete
        milestonesCompleted: 2,
        milestonesTotal: 4,
        deliverablesReceived: 8,
        daysUntilNextMilestone: 12,
        responseTime: 4.5, // Average hours for team to respond
        projectHealth: 'on-track'
      };

      const demoMilestones = [
        { name: 'Project Kickoff', status: 'completed' as const, completedDate: 'Jan 15, 2024' },
        { name: 'Phase 1 Delivery', status: 'completed' as const, completedDate: 'Feb 20, 2024' },
        { name: 'Phase 2 Review', status: 'in-progress' as const, dueDate: 'Mar 15, 2024' },
        { name: 'Final Delivery', status: 'upcoming' as const, dueDate: 'Apr 30, 2024' }
      ];

      setProjectMetrics(demoClientMetrics);
      setMilestones(demoMilestones);
      return;
    }

    // Team/admin metrics (keep existing for team view)
    const demoProjectMetrics: any = {
      totalProjects: 24,
      activeProjects: 12,
      completedProjects: 10,
      overdueProjects: 2,
      averageCompletionTime: 45,
      clientSatisfactionScore: 4.7
    };

    const demoTeamPerformance: TeamPerformance[] = [
      {
        teamMember: 'Alex',
        role: 'Project Manager',
        projectsAssigned: 8,
        projectsCompleted: 6,
        averageCompletionTime: 42,
        clientRating: 4.8,
        lastActive: '2 hours ago'
      },
      {
        teamMember: 'Sarah',
        role: 'Designer',
        projectsAssigned: 6,
        projectsCompleted: 5,
        averageCompletionTime: 38,
        clientRating: 4.9,
        lastActive: '1 hour ago'
      },
      {
        teamMember: 'Mike',
        role: 'Developer',
        projectsAssigned: 5,
        projectsCompleted: 4,
        averageCompletionTime: 52,
        clientRating: 4.6,
        lastActive: '30 minutes ago'
      }
    ];

    const demoClientActivity: ClientActivity[] = [
      {
        clientAddress: '123 Main Street',
        projectType: 'Residential Design',
        status: 'In Progress',
        lastActivity: '2 hours ago',
        documentsUploaded: 12,
        messagesSent: 8,
        satisfactionRating: 4.8
      },
      {
        clientAddress: '456 Oak Avenue',
        projectType: 'Commercial Renovation',
        status: 'Review',
        lastActivity: '1 day ago',
        documentsUploaded: 8,
        messagesSent: 15,
        satisfactionRating: 4.9
      },
      {
        clientAddress: '789 Pine Road',
        projectType: 'New Construction',
        status: 'Planning',
        lastActivity: '3 days ago',
        documentsUploaded: 5,
        messagesSent: 3,
        satisfactionRating: 4.5
      }
    ];

    if (userType === 'team') {
      setProjectMetrics(demoProjectMetrics);
    }
    setTeamPerformance(demoTeamPerformance);
    setClientActivity(demoClientActivity);
  };

  const getCompletionRate = () => {
    if (userType === 'client' && projectMetrics) {
      return (projectMetrics as ClientProjectMetrics).projectProgress;
    }
    if (!projectMetrics) return 0;
    return Math.round(((projectMetrics as any).completedProjects / (projectMetrics as any).totalProjects) * 100);
  };

  const getOverdueRate = () => {
    if (userType === 'client') return 0; // Not relevant for clients
    if (!projectMetrics) return 0;
    return Math.round(((projectMetrics as any).overdueProjects / (projectMetrics as any).totalProjects) * 100);
  };

  const getProjectHealthColor = (health: string) => {
    switch (health) {
      case 'on-track': return '#4CAF50';
      case 'at-risk': return '#FF9800';
      case 'delayed': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getProjectHealthLabel = (health: string) => {
    switch (health) {
      case 'on-track': return 'On Track';
      case 'at-risk': return 'At Risk';
      case 'delayed': return 'Delayed';
      default: return 'Unknown';
    }
  };

  // Format time range for display (currently unused but kept for future use)
  // const formatTimeRange = (range: string) => {
  //   switch (range) {
  //     case '7d': return 'Last 7 days';
  //     case '30d': return 'Last 30 days';
  //     case '90d': return 'Last 90 days';
  //     case '1y': return 'Last year';
  //     default: return 'Last 30 days';
  //   }
  // };

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div className="header-left">
          <h2>📊 Analytics Dashboard</h2>
          <span className="user-info">
            {userType === 'client' ? 'Demo Project (Client)' : `${currentUser} (${userType})`}
          </span>
        </div>
        <div className="header-actions">
          <select 
            className="time-range-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      <div className="analytics-content">
        {/* Navigation Tabs */}
        <div className="analytics-tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📈 Overview
          </button>
          <button
            className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            {userType === 'client' ? '📅 Timeline' : '🏗️ Projects'}
          </button>
          {userType === 'client' && (
            <button
              className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              📊 Activity
            </button>
          )}
          {userType === 'team' && (
            <button
              className={`tab ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              👥 Team
            </button>
          )}
          {userType === 'team' && (
            <button
              className={`tab ${activeTab === 'clients' ? 'active' : ''}`}
              onClick={() => setActiveTab('clients')}
            >
              👤 Clients
            </button>
          )}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="metrics-grid">
              {userType === 'client' ? (
                <>
                  <div className="metric-card">
                    <div className="metric-icon">📊</div>
                    <div className="metric-content">
                      <h3>{(projectMetrics as ClientProjectMetrics)?.projectProgress || 0}%</h3>
                      <p>Project Progress</p>
                      <span className="metric-change positive">On Track</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">✅</div>
                    <div className="metric-content">
                      <h3>{(projectMetrics as ClientProjectMetrics)?.milestonesCompleted || 0}/{((projectMetrics as ClientProjectMetrics)?.milestonesTotal || 0)}</h3>
                      <p>Milestones</p>
                      <span className="metric-change positive">Completed</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">📄</div>
                    <div className="metric-content">
                      <h3>{(projectMetrics as ClientProjectMetrics)?.deliverablesReceived || 0}</h3>
                      <p>Deliverables Received</p>
                      <span className="metric-change positive">Ready to Review</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">⏰</div>
                    <div className="metric-content">
                      <h3>{(projectMetrics as ClientProjectMetrics)?.daysUntilNextMilestone || 0}</h3>
                      <p>Days Until Next Milestone</p>
                      <span className="metric-change positive">Upcoming</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">💬</div>
                    <div className="metric-content">
                      <h3>{(projectMetrics as ClientProjectMetrics)?.responseTime || 0}h</h3>
                      <p>Avg. Response Time</p>
                      <span className="metric-change positive">Fast</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon" style={{ color: getProjectHealthColor((projectMetrics as ClientProjectMetrics)?.projectHealth || 'on-track') }}>
                      {(projectMetrics as ClientProjectMetrics)?.projectHealth === 'on-track' ? '✅' : 
                       (projectMetrics as ClientProjectMetrics)?.projectHealth === 'at-risk' ? '⚠️' : '🔴'}
                    </div>
                    <div className="metric-content">
                      <h3>{getProjectHealthLabel((projectMetrics as ClientProjectMetrics)?.projectHealth || 'on-track')}</h3>
                      <p>Project Health</p>
                      <span className="metric-change positive">Status</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="metric-card">
                    <div className="metric-icon">📊</div>
                    <div className="metric-content">
                      <h3>{(projectMetrics as any)?.totalProjects || 0}</h3>
                      <p>Total Projects</p>
                      <span className="metric-change positive">+12%</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">🔄</div>
                    <div className="metric-content">
                      <h3>{(projectMetrics as any)?.activeProjects || 0}</h3>
                      <p>Active Projects</p>
                      <span className="metric-change positive">+8%</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">✅</div>
                    <div className="metric-content">
                      <h3>{getCompletionRate()}%</h3>
                      <p>Completion Rate</p>
                      <span className="metric-change positive">+5%</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">⭐</div>
                    <div className="metric-content">
                      <h3>{(projectMetrics as any)?.clientSatisfactionScore || 0}</h3>
                      <p>Client Satisfaction</p>
                      <span className="metric-change positive">+0.2</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">⏱️</div>
                    <div className="metric-content">
                      <h3>{(projectMetrics as any)?.averageCompletionTime || 0}d</h3>
                      <p>Avg. Completion Time</p>
                      <span className="metric-change negative">-3d</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon">⚠️</div>
                    <div className="metric-content">
                      <h3>{getOverdueRate()}%</h3>
                      <p>Overdue Rate</p>
                      <span className="metric-change negative">+2%</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="charts-section">
              {userType === 'client' ? (
                <>
                  <div className="chart-card">
                    <h3>Project Progress</h3>
                    <div className="progress-chart">
                      <div className="progress-circle" style={{ 
                        background: `conic-gradient(#4CAF50 0% ${(projectMetrics as ClientProjectMetrics)?.projectProgress || 0}%, #E0E0E0 ${(projectMetrics as ClientProjectMetrics)?.projectProgress || 0}% 100%)`
                      }}>
                        <div className="progress-inner">
                          <span className="progress-value">{(projectMetrics as ClientProjectMetrics)?.projectProgress || 0}%</span>
                          <span className="progress-label">Complete</span>
                        </div>
                      </div>
                      <div className="milestone-summary">
                        <p><strong>{(projectMetrics as ClientProjectMetrics)?.milestonesCompleted || 0}</strong> of <strong>{(projectMetrics as ClientProjectMetrics)?.milestonesTotal || 0}</strong> milestones completed</p>
                        <p><strong>{(projectMetrics as ClientProjectMetrics)?.deliverablesReceived || 0}</strong> deliverables received</p>
                      </div>
                    </div>
                  </div>

                  <div className="chart-card">
                    <h3>Milestone Timeline</h3>
                    <div className="milestone-timeline">
                      {milestones.map((milestone, index) => (
                        <div key={index} className={`milestone-item ${milestone.status}`}>
                          <div className="milestone-marker">
                            {milestone.status === 'completed' ? '✓' : milestone.status === 'in-progress' ? '⏱️' : '○'}
                          </div>
                          <div className="milestone-info">
                            <h4>{milestone.name}</h4>
                            {milestone.status === 'completed' && milestone.completedDate && (
                              <p className="milestone-date">Completed: {milestone.completedDate}</p>
                            )}
                            {milestone.status === 'in-progress' && milestone.dueDate && (
                              <p className="milestone-date">Due: {milestone.dueDate}</p>
                            )}
                            {milestone.status === 'upcoming' && milestone.dueDate && (
                              <p className="milestone-date">Target: {milestone.dueDate}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="chart-card">
                    <h3>Project Status Distribution</h3>
                    <div className="chart-placeholder">
                      <div className="chart-bar" style={{ height: '60%', backgroundColor: '#4CAF50' }}>
                        <span>Completed ({(projectMetrics as any)?.completedProjects || 0})</span>
                      </div>
                      <div className="chart-bar" style={{ height: '40%', backgroundColor: '#2196F3' }}>
                        <span>Active ({(projectMetrics as any)?.activeProjects || 0})</span>
                      </div>
                      <div className="chart-bar" style={{ height: '20%', backgroundColor: '#FF9800' }}>
                        <span>Overdue ({(projectMetrics as any)?.overdueProjects || 0})</span>
                      </div>
                    </div>
                  </div>

                  <div className="chart-card">
                    <h3>Client Satisfaction Trend</h3>
                    <div className="satisfaction-chart">
                      <div className="satisfaction-line">
                        <div className="satisfaction-point" style={{ left: '10%', bottom: '60%' }}></div>
                        <div className="satisfaction-point" style={{ left: '30%', bottom: '70%' }}></div>
                        <div className="satisfaction-point" style={{ left: '50%', bottom: '80%' }}></div>
                        <div className="satisfaction-point" style={{ left: '70%', bottom: '85%' }}></div>
                        <div className="satisfaction-point" style={{ left: '90%', bottom: '90%' }}></div>
                      </div>
                      <div className="chart-labels">
                        <span>Week 1</span>
                        <span>Week 2</span>
                        <span>Week 3</span>
                        <span>Week 4</span>
                        <span>Current</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Timeline Tab (Client) / Projects Tab (Team) */}
        {activeTab === 'timeline' && (
          <div className="projects-content">
            {userType === 'client' ? (
              <div className="client-timeline">
                <div className="timeline-header">
                  <h3>Your Project Timeline</h3>
                  <p className="timeline-subtitle">Track your project milestones and progress</p>
                </div>
                <div className="milestones-timeline-view">
                  {milestones.map((milestone, index) => (
                    <div key={index} className={`timeline-milestone ${milestone.status}`}>
                      <div className="timeline-line"></div>
                      <div className="timeline-marker">
                        {milestone.status === 'completed' ? (
                          <div className="marker-completed">✓</div>
                        ) : milestone.status === 'in-progress' ? (
                          <div className="marker-active">⏱️</div>
                        ) : (
                          <div className="marker-upcoming">○</div>
                        )}
                      </div>
                      <div className="timeline-content">
                        <h4>{milestone.name}</h4>
                        {milestone.status === 'completed' && milestone.completedDate && (
                          <p className="timeline-status completed">✓ Completed on {milestone.completedDate}</p>
                        )}
                        {milestone.status === 'in-progress' && milestone.dueDate && (
                          <p className="timeline-status active">⏱️ In Progress • Due: {milestone.dueDate}</p>
                        )}
                        {milestone.status === 'upcoming' && milestone.dueDate && (
                          <p className="timeline-status upcoming">○ Upcoming • Target: {milestone.dueDate}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="timeline-summary">
                  <div className="summary-card">
                    <h4>Next Milestone</h4>
                    <p className="summary-value">
                      {milestones.find(m => m.status === 'in-progress' || m.status === 'upcoming')?.name || 'All Complete'}
                    </p>
                    <p className="summary-detail">
                      {(projectMetrics as ClientProjectMetrics)?.daysUntilNextMilestone || 0} days remaining
                    </p>
                  </div>
                  <div className="summary-card">
                    <h4>Project Health</h4>
                    <p className="summary-value" style={{ color: getProjectHealthColor((projectMetrics as ClientProjectMetrics)?.projectHealth || 'on-track') }}>
                      {getProjectHealthLabel((projectMetrics as ClientProjectMetrics)?.projectHealth || 'on-track')}
                    </p>
                    <p className="summary-detail">Your project is progressing well</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="projects-content">
                <div className="projects-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Projects:</span>
                    <span className="stat-value">{(projectMetrics as any)?.totalProjects || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Active Projects:</span>
                    <span className="stat-value">{(projectMetrics as any)?.activeProjects || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Completed:</span>
                    <span className="stat-value">{(projectMetrics as any)?.completedProjects || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Overdue:</span>
                    <span className="stat-value">{(projectMetrics as any)?.overdueProjects || 0}</span>
                  </div>
                </div>

                <div className="project-timeline">
                  <h3>Project Timeline</h3>
                  <div className="timeline-item">
                    <div className="timeline-date">Jan 2024</div>
                    <div className="timeline-content">
                      <h4>Project Kickoff</h4>
                      <p>Started 5 new projects</p>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-date">Feb 2024</div>
                    <div className="timeline-content">
                      <h4>Design Phase</h4>
                      <p>Completed 3 design projects</p>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-date">Mar 2024</div>
                    <div className="timeline-content">
                      <h4>Development Phase</h4>
                      <p>Started 4 development projects</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab (Client Only) */}
        {activeTab === 'activity' && userType === 'client' && (
          <div className="activity-content">
            <div className="activity-header">
              <h3>Your Project Activity</h3>
              <p className="activity-subtitle">Recent updates and interactions</p>
            </div>
            <div className="activity-metrics">
              <div className="activity-metric-card">
                <div className="activity-icon">📄</div>
                <div className="activity-info">
                  <h4>{(projectMetrics as ClientProjectMetrics)?.deliverablesReceived || 0}</h4>
                  <p>Deliverables Received</p>
                  <span className="activity-trend">Ready for review</span>
                </div>
              </div>
              <div className="activity-metric-card">
                <div className="activity-icon">💬</div>
                <div className="activity-info">
                  <h4>{(projectMetrics as ClientProjectMetrics)?.responseTime || 0}h</h4>
                  <p>Avg. Response Time</p>
                  <span className="activity-trend positive">Fast response</span>
                </div>
              </div>
              <div className="activity-metric-card">
                <div className="activity-icon">✅</div>
                <div className="activity-info">
                  <h4>{(projectMetrics as ClientProjectMetrics)?.milestonesCompleted || 0}</h4>
                  <p>Milestones Completed</p>
                  <span className="activity-trend positive">On schedule</span>
                </div>
              </div>
            </div>
            <div className="recent-activity-list">
              <h4>Recent Activity</h4>
              <div className="activity-item">
                <div className="activity-icon-small">📄</div>
                <div className="activity-details">
                  <p><strong>New Deliverable</strong> - Phase 2 Review Documents</p>
                  <p className="activity-time">2 hours ago</p>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon-small">💬</div>
                <div className="activity-details">
                  <p><strong>Team Message</strong> - Project manager sent an update</p>
                  <p className="activity-time">1 day ago</p>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon-small">✅</div>
                <div className="activity-details">
                  <p><strong>Milestone Completed</strong> - Phase 1 Delivery</p>
                  <p className="activity-time">2 weeks ago</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && userType === 'team' && (
          <div className="team-content">
            <div className="team-performance-grid">
              {teamPerformance.map((member, index) => (
                <div key={index} className="team-member-card">
                  <div className="member-header">
                    <div className="member-avatar">
                      {member.teamMember.charAt(0)}
                    </div>
                    <div className="member-info">
                      <h4>{member.teamMember}</h4>
                      <p>{member.role}</p>
                    </div>
                    <div className="member-rating">
                      ⭐ {member.clientRating}
                    </div>
                  </div>
                  <div className="member-stats">
                    <div className="stat">
                      <span className="stat-label">Projects:</span>
                      <span className="stat-value">{member.projectsAssigned}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Completed:</span>
                      <span className="stat-value">{member.projectsCompleted}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Avg. Time:</span>
                      <span className="stat-value">{member.averageCompletionTime}d</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Last Active:</span>
                      <span className="stat-value">{member.lastActive}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && userType === 'team' && (
          <div className="clients-content">
            <div className="clients-grid">
              {clientActivity.map((client, index) => (
                <div key={index} className="client-card">
                  <div className="client-header">
                    <h4>{client.clientAddress}</h4>
                    <span className={`status-badge status-${client.status.toLowerCase().replace(' ', '-')}`}>
                      {client.status}
                    </span>
                  </div>
                  <div className="client-details">
                    <p><strong>Project Type:</strong> {client.projectType}</p>
                    <p><strong>Last Activity:</strong> {client.lastActivity}</p>
                    <p><strong>Documents:</strong> {client.documentsUploaded}</p>
                    <p><strong>Messages:</strong> {client.messagesSent}</p>
                    <p><strong>Rating:</strong> ⭐ {client.satisfactionRating}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
