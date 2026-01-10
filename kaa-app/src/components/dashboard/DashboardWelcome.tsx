/**
 * Dashboard Welcome Component
 * Welcome section for the client portal dashboard.
 */

import { useAuth } from '../../contexts/AuthContext';
import './DashboardWelcome.css';

interface QuickAction {
  icon: string;
  label: string;
  href: string;
  description: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: '📋',
    label: 'View Projects',
    href: '/portal/projects',
    description: 'Track your project progress',
  },
  {
    icon: '📁',
    label: 'Deliverables',
    href: '/portal/deliverables',
    description: 'Download your design files',
  },
  {
    icon: '💬',
    label: 'Messages',
    href: '/portal/messages',
    description: 'Chat with your designer',
  },
  {
    icon: '📅',
    label: 'Schedule',
    href: '/portal/schedule',
    description: 'View upcoming milestones',
  },
];

interface DashboardWelcomeProps {
  projectCount?: number;
  pendingDeliverables?: number;
  nextMilestone?: {
    name: string;
    date: string;
  };
}

export function DashboardWelcome({
  projectCount = 0,
  pendingDeliverables = 0,
  nextMilestone,
}: DashboardWelcomeProps) {
  const { user, profile } = useAuth();

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getFirstName = (): string => {
    if (!user?.email) return 'there';
    return user.email.split('@')[0].split('.')[0];
  };

  const getTierBadge = () => {
    if (!user?.tier) return null;
    const tierNames: Record<number, string> = {
      1: 'Concept',
      2: 'Builder',
      3: 'Concierge',
      4: 'White Glove',
    };
    return tierNames[user.tier] || `Tier ${user.tier}`;
  };

  return (
    <div className="dashboard-welcome">
      <div className="dashboard-welcome__header">
        <div className="dashboard-welcome__greeting">
          <h1>
            {getGreeting()}, <span className="dashboard-welcome__name">{getFirstName()}</span>!
          </h1>
          {getTierBadge() && (
            <span className="dashboard-welcome__tier">{getTierBadge()} Member</span>
          )}
        </div>
        <p className="dashboard-welcome__subtitle">
          Here's what's happening with your landscape projects.
        </p>
      </div>

      <div className="dashboard-welcome__stats">
        <div className="dashboard-welcome__stat">
          <span className="dashboard-welcome__stat-value">{projectCount}</span>
          <span className="dashboard-welcome__stat-label">
            Active {projectCount === 1 ? 'Project' : 'Projects'}
          </span>
        </div>
        <div className="dashboard-welcome__stat">
          <span className="dashboard-welcome__stat-value">{pendingDeliverables}</span>
          <span className="dashboard-welcome__stat-label">
            New {pendingDeliverables === 1 ? 'Deliverable' : 'Deliverables'}
          </span>
        </div>
        {nextMilestone && (
          <div className="dashboard-welcome__stat dashboard-welcome__stat--highlight">
            <span className="dashboard-welcome__stat-label">Next Milestone</span>
            <span className="dashboard-welcome__stat-milestone">{nextMilestone.name}</span>
            <span className="dashboard-welcome__stat-date">{nextMilestone.date}</span>
          </div>
        )}
      </div>

      <div className="dashboard-welcome__actions">
        <h2 className="dashboard-welcome__actions-title">Quick Actions</h2>
        <div className="dashboard-welcome__actions-grid">
          {QUICK_ACTIONS.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="dashboard-welcome__action"
            >
              <span className="dashboard-welcome__action-icon">{action.icon}</span>
              <span className="dashboard-welcome__action-label">{action.label}</span>
              <span className="dashboard-welcome__action-desc">{action.description}</span>
            </a>
          ))}
        </div>
      </div>

      {profile?.projects && profile.projects.length > 0 && (
        <div className="dashboard-welcome__recent">
          <h2 className="dashboard-welcome__recent-title">Recent Projects</h2>
          <div className="dashboard-welcome__recent-list">
            {profile.projects.slice(0, 3).map((project) => (
              <a
                key={project.id}
                href={`/portal/projects/${project.id}`}
                className="dashboard-welcome__project"
              >
                <div className="dashboard-welcome__project-info">
                  <span className="dashboard-welcome__project-name">{project.name}</span>
                  <span className="dashboard-welcome__project-tier">Tier {project.tier}</span>
                </div>
                <span className={`dashboard-welcome__project-status dashboard-welcome__project-status--${project.status.toLowerCase().replace('_', '-')}`}>
                  {project.status.replace('_', ' ')}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-welcome__help">
        <div className="dashboard-welcome__help-content">
          <span className="dashboard-welcome__help-icon">💡</span>
          <div>
            <h3>Need Help?</h3>
            <p>Our team is here to support you throughout your project journey.</p>
          </div>
          <a href="/support" className="dashboard-welcome__help-link">
            Get Support →
          </a>
        </div>
      </div>
    </div>
  );
}

export default DashboardWelcome;
