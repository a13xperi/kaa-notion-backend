import React, { useState, useEffect } from 'react';
import './TeamManagement.css';

interface TeamMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'DESIGNER' | 'VIEWER';
  isActive: boolean;
  acceptedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

interface TeamStats {
  totalMembers: number;
  byRole: Record<string, number>;
  pendingInvites: number;
  activeProjects: number;
}

interface ProjectAssignment {
  projectId: string;
  projectName: string;
  role: string;
  assignedAt: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  OWNER: { label: 'Owner', color: '#7c3aed', bg: '#ede9fe' },
  ADMIN: { label: 'Admin', color: '#2563eb', bg: '#dbeafe' },
  DESIGNER: { label: 'Designer', color: '#10b981', bg: '#dcfce7' },
  VIEWER: { label: 'Viewer', color: '#6b7280', bg: '#f3f4f6' },
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: [
    'Manage team members',
    'Manage billing',
    'Manage all projects',
    'Manage clients',
    'Manage portfolio',
    'View analytics',
    'Manage settings',
    'Delete resources',
  ],
  ADMIN: [
    'Manage projects',
    'Manage clients',
    'Manage portfolio',
    'View analytics',
    'Assign team members',
  ],
  DESIGNER: [
    'View assigned projects',
    'Edit projects',
    'Upload deliverables',
    'Manage milestones',
    'Send messages',
  ],
  VIEWER: [
    'View assigned projects',
    'View deliverables',
    'View messages',
  ],
};

const TeamManagement: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberProjects, setMemberProjects] = useState<ProjectAssignment[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', name: '', role: 'DESIGNER' });
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [membersRes, statsRes] = await Promise.all([
        fetch('/api/team/members', { headers }),
        fetch('/api/team/stats', { headers }),
      ]);

      if (membersRes.ok) {
        setMembers(await membersRes.json());
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberProjects = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/team/members/${userId}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMemberProjects(await res.json());
      }
    } catch (error) {
      console.error('Error fetching member projects:', error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(inviteData),
      });

      if (res.ok) {
        setShowInviteModal(false);
        setInviteData({ email: '', name: '', role: 'DESIGNER' });
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send invite');
      }
    } catch (error) {
      setError('Failed to send invite. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember || !selectedRole) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/team/members/${selectedMember.userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (res.ok) {
        setShowRoleModal(false);
        setSelectedRole('');
        fetchData();
      }
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/team/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
      setSelectedMember(null);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/team/members/${userId}/reactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (error) {
      console.error('Error reactivating member:', error);
    }
  };

  const handleSelectMember = (member: TeamMember) => {
    setSelectedMember(member);
    fetchMemberProjects(member.userId);
  };

  const getInitials = (name: string | null, email: string): string => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  if (loading) {
    return (
      <div className="team-management">
        <div className="loading-skeleton">
          <div className="skeleton-header" />
          <div className="skeleton-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="team-management">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Team Management</h1>
          <p>Manage team members and permissions</p>
        </div>
        <button className="invite-btn" onClick={() => setShowInviteModal(true)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 5V15M5 10H15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Invite Member
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalMembers}</span>
              <span className="stat-label">Team Members</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.pendingInvites}</span>
              <span className="stat-label">Pending Invites</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon projects">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.activeProjects}</span>
              <span className="stat-label">Active Projects</span>
            </div>
          </div>

          <div className="stat-card roles">
            <div className="role-breakdown">
              {Object.entries(stats.byRole).map(([role, count]) => (
                <div key={role} className="role-item">
                  <span
                    className="role-badge"
                    style={{
                      color: ROLE_LABELS[role]?.color,
                      background: ROLE_LABELS[role]?.bg,
                    }}
                  >
                    {ROLE_LABELS[role]?.label}
                  </span>
                  <span className="role-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="team-content">
        {/* Members List */}
        <div className="members-panel">
          <h2>Team Members</h2>
          <div className="members-list">
            {members.map((member) => (
              <button
                key={member.id}
                className={`member-item ${selectedMember?.id === member.id ? 'selected' : ''} ${
                  !member.isActive ? 'inactive' : ''
                }`}
                onClick={() => handleSelectMember(member)}
              >
                <div
                  className="member-avatar"
                  style={{
                    background: member.isActive
                      ? `linear-gradient(135deg, ${ROLE_LABELS[member.role]?.color} 0%, ${ROLE_LABELS[member.role]?.color}99 100%)`
                      : '#94a3b8',
                  }}
                >
                  {getInitials(member.user.name, member.user.email)}
                </div>
                <div className="member-info">
                  <span className="member-name">
                    {member.user.name || member.user.email}
                  </span>
                  <span className="member-email">{member.user.email}</span>
                </div>
                <span
                  className="role-tag"
                  style={{
                    color: ROLE_LABELS[member.role]?.color,
                    background: ROLE_LABELS[member.role]?.bg,
                  }}
                >
                  {ROLE_LABELS[member.role]?.label}
                </span>
                {!member.acceptedAt && (
                  <span className="pending-tag">Pending</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Member Detail */}
        <div className="detail-panel">
          {selectedMember ? (
            <>
              <div className="detail-header">
                <div
                  className="detail-avatar"
                  style={{
                    background: `linear-gradient(135deg, ${ROLE_LABELS[selectedMember.role]?.color} 0%, ${ROLE_LABELS[selectedMember.role]?.color}99 100%)`,
                  }}
                >
                  {getInitials(selectedMember.user.name, selectedMember.user.email)}
                </div>
                <div className="detail-info">
                  <h3>{selectedMember.user.name || 'Unnamed'}</h3>
                  <span className="email">{selectedMember.user.email}</span>
                  <span
                    className="role-badge"
                    style={{
                      color: ROLE_LABELS[selectedMember.role]?.color,
                      background: ROLE_LABELS[selectedMember.role]?.bg,
                    }}
                  >
                    {ROLE_LABELS[selectedMember.role]?.label}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Status</h4>
                <div className="status-info">
                  {selectedMember.acceptedAt ? (
                    <span className="status active">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M13.5 4L6 11.5L2.5 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Active since {new Date(selectedMember.acceptedAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="status pending">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
                        <path d="M8 5V8L10 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Invitation pending
                    </span>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h4>Permissions</h4>
                <ul className="permissions-list">
                  {ROLE_PERMISSIONS[selectedMember.role]?.map((perm, i) => (
                    <li key={i}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M13.5 4L6 11.5L2.5 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>

              {memberProjects.length > 0 && (
                <div className="detail-section">
                  <h4>Assigned Projects</h4>
                  <div className="projects-list">
                    {memberProjects.map((project) => (
                      <div key={project.projectId} className="project-item">
                        <span className="project-name">{project.projectName}</span>
                        <span className="project-role">{project.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-actions">
                {selectedMember.role !== 'OWNER' && (
                  <>
                    <button
                      className="action-btn secondary"
                      onClick={() => {
                        setSelectedRole(selectedMember.role);
                        setShowRoleModal(true);
                      }}
                    >
                      Change Role
                    </button>
                    {selectedMember.isActive ? (
                      <button
                        className="action-btn danger"
                        onClick={() => handleRemoveMember(selectedMember.userId)}
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        className="action-btn primary"
                        onClick={() => handleReactivate(selectedMember.userId)}
                      >
                        Reactivate
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="18" r="8" stroke="currentColor" strokeWidth="3" />
                <path
                  d="M10 42C10 34.268 16.268 28 24 28C31.732 28 38 34.268 38 42"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <p>Select a team member to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite Team Member</h2>
              <button className="close-btn" onClick={() => setShowInviteModal(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  placeholder="team@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="name">Name (Optional)</label>
                <input
                  type="text"
                  id="name"
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <div className="role-options">
                  {['ADMIN', 'DESIGNER', 'VIEWER'].map((role) => (
                    <label
                      key={role}
                      className={`role-option ${inviteData.role === role ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={inviteData.role === role}
                        onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                      />
                      <span
                        className="role-label"
                        style={{
                          borderColor: inviteData.role === role ? ROLE_LABELS[role]?.color : 'transparent',
                        }}
                      >
                        <span
                          className="role-badge"
                          style={{
                            color: ROLE_LABELS[role]?.color,
                            background: ROLE_LABELS[role]?.bg,
                          }}
                        >
                          {ROLE_LABELS[role]?.label}
                        </span>
                        <span className="role-desc">
                          {role === 'ADMIN' && 'Full project & client management'}
                          {role === 'DESIGNER' && 'Edit projects & upload deliverables'}
                          {role === 'VIEWER' && 'View-only access to projects'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={actionLoading}>
                  {actionLoading ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Role</h2>
              <button className="close-btn" onClick={() => setShowRoleModal(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p>Select a new role for {selectedMember.user.name || selectedMember.user.email}:</p>
              <div className="role-select">
                {['ADMIN', 'DESIGNER', 'VIEWER'].map((role) => (
                  <button
                    key={role}
                    className={`role-select-btn ${selectedRole === role ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <span
                      className="role-badge"
                      style={{
                        color: ROLE_LABELS[role]?.color,
                        background: ROLE_LABELS[role]?.bg,
                      }}
                    >
                      {ROLE_LABELS[role]?.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowRoleModal(false)}>
                Cancel
              </button>
              <button
                className="submit-btn"
                onClick={handleUpdateRole}
                disabled={actionLoading || selectedRole === selectedMember.role}
              >
                {actionLoading ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
