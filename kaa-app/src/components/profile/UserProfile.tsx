/**
 * User Profile Component
 * Displays user account information and settings.
 */

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './UserProfile.css';

interface UserProfileProps {
  onClose?: () => void;
}

export function UserProfile({ onClose }: UserProfileProps) {
  const { user, profile, logout, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const getTierName = (tier: number | null | undefined): string => {
    if (!tier) return 'No tier';
    const names: Record<number, string> = {
      1: 'The Concept',
      2: 'The Builder',
      3: 'The Concierge',
      4: 'White Glove',
    };
    return names[tier] || `Tier ${tier}`;
  };

  const getUserTypeLabel = (type: string | undefined): string => {
    if (!type) return 'User';
    const labels: Record<string, string> = {
      SAGE_CLIENT: 'SAGE Client',
      KAA_CLIENT: 'KAA Premium Client',
      TEAM: 'Team Member',
      ADMIN: 'Administrator',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="user-profile">
      <div className="user-profile__header">
        <div className="user-profile__avatar">
          {user?.email?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="user-profile__info">
          <h2 className="user-profile__email">{user?.email || 'No email'}</h2>
          <span className="user-profile__type">{getUserTypeLabel(user?.userType)}</span>
        </div>
        {onClose && (
          <button className="user-profile__close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="user-profile__sections">
        {/* Account Details */}
        <section className="user-profile__section">
          <h3 className="user-profile__section-title">Account Details</h3>
          <div className="user-profile__details">
            <div className="user-profile__detail">
              <span className="user-profile__label">Email</span>
              <span className="user-profile__value">{user?.email || 'Not set'}</span>
            </div>
            <div className="user-profile__detail">
              <span className="user-profile__label">Account Type</span>
              <span className="user-profile__value">{getUserTypeLabel(user?.userType)}</span>
            </div>
            <div className="user-profile__detail">
              <span className="user-profile__label">Member Since</span>
              <span className="user-profile__value">
                {formatDate(profile?.createdAt)}
              </span>
            </div>
          </div>
        </section>

        {/* Service Tier */}
        {user?.tier && (
          <section className="user-profile__section">
            <h3 className="user-profile__section-title">Service Tier</h3>
            <div className="user-profile__tier-card">
              <div className="user-profile__tier-badge">Tier {user.tier}</div>
              <div className="user-profile__tier-info">
                <span className="user-profile__tier-name">{getTierName(user.tier)}</span>
                <span className="user-profile__tier-status">Active</span>
              </div>
              <a href="/pricing" className="user-profile__tier-upgrade">
                View All Tiers
              </a>
            </div>
          </section>
        )}

        {/* Client Information */}
        {profile?.client && (
          <section className="user-profile__section">
            <h3 className="user-profile__section-title">Client Information</h3>
            <div className="user-profile__details">
              <div className="user-profile__detail">
                <span className="user-profile__label">Status</span>
                <span className={`user-profile__status user-profile__status--${profile.client.status.toLowerCase()}`}>
                  {profile.client.status}
                </span>
              </div>
              {profile.client.projectAddress && (
                <div className="user-profile__detail">
                  <span className="user-profile__label">Project Address</span>
                  <span className="user-profile__value">{profile.client.projectAddress}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Projects Summary */}
        {profile?.projects && profile.projects.length > 0 && (
          <section className="user-profile__section">
            <h3 className="user-profile__section-title">
              Projects ({profile.projects.length})
            </h3>
            <div className="user-profile__projects">
              {profile.projects.slice(0, 3).map((project) => (
                <a
                  key={project.id}
                  href={`/portal/projects/${project.id}`}
                  className="user-profile__project"
                >
                  <span className="user-profile__project-name">{project.name}</span>
                  <span className={`user-profile__project-status user-profile__project-status--${project.status.toLowerCase()}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </a>
              ))}
              {profile.projects.length > 3 && (
                <a href="/portal" className="user-profile__projects-more">
                  View all {profile.projects.length} projects →
                </a>
              )}
            </div>
          </section>
        )}

        {/* Actions */}
        <section className="user-profile__section user-profile__section--actions">
          <button
            className="user-profile__action user-profile__action--secondary"
            onClick={() => refreshProfile()}
          >
            Refresh Profile
          </button>
          <button
            className="user-profile__action user-profile__action--danger"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </section>
      </div>
    </div>
  );
}

export default UserProfile;
