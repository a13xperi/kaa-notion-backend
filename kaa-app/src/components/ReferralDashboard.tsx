import React, { useState, useEffect } from 'react';
import './ReferralDashboard.css';

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  totalEarned: number;
  availableCredits: number;
  referralCode: string | null;
}

interface Referral {
  id: string;
  referredEmail: string;
  referredName: string | null;
  status: string;
  createdAt: string;
  signedUpAt: string | null;
  convertedAt: string | null;
  rewardAmount: number | null;
}

interface ReferralConfig {
  referrerReward: number;
  referredReward: number;
  minProjectValue: number;
  expiryDays: number;
}

const ReferralDashboard: React.FC = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, referralsRes, configRes] = await Promise.all([
        fetch('/api/referrals/stats', { headers }),
        fetch('/api/referrals', { headers }),
        fetch('/api/referrals/config'),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (referralsRes.ok) {
        const data = await referralsRes.json();
        setReferrals(data.referrals || []);
      }

      if (configRes.ok) {
        setConfig(await configRes.json());
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/referrals/code', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStats((prev) => (prev ? { ...prev, referralCode: data.code } : null));
      }
    } catch (error) {
      console.error('Error generating code:', error);
    }
  };

  const copyReferralLink = () => {
    if (stats?.referralCode) {
      const link = `${window.location.origin}/signup?ref=${stats.referralCode}`;
      navigator.clipboard.writeText(link);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      });

      if (res.ok) {
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteName('');
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send invite');
      }
    } catch (error) {
      setError('Failed to send invite. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
      SIGNED_UP: { bg: '#dbeafe', color: '#1d4ed8', label: 'Signed Up' },
      CONVERTED: { bg: '#dcfce7', color: '#166534', label: 'Converted' },
      EXPIRED: { bg: '#f3f4f6', color: '#6b7280', label: 'Expired' },
    };
    const style = styles[status] || styles.PENDING;
    return (
      <span
        className="status-badge"
        style={{ background: style.bg, color: style.color }}
      >
        {style.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="referral-dashboard">
        <div className="loading-skeleton">
          <div className="skeleton-block large" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      </div>
    );
  }

  return (
    <div className="referral-dashboard">
      <div className="referral-header">
        <div className="header-content">
          <h1>Referral Program</h1>
          <p>Invite friends and earn credits towards your projects</p>
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
          Invite Friend
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card highlight">
          <div className="stat-icon credits">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">${stats?.availableCredits || 0}</span>
            <span className="stat-label">Available Credits</span>
          </div>
        </div>

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
              <path
                d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalReferrals || 0}</span>
            <span className="stat-label">Total Referrals</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 6V12L16 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.pendingReferrals || 0}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon converted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18457 2.99721 7.13633 4.39828 5.49707C5.79935 3.85782 7.69279 2.71538 9.79619 2.24015C11.8996 1.76491 14.1003 1.98234 16.07 2.86"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 4L12 14.01L9 11.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.convertedReferrals || 0}</span>
            <span className="stat-label">Converted</span>
          </div>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="referral-link-section">
        <h3>Your Referral Link</h3>
        {stats?.referralCode ? (
          <div className="link-container">
            <input
              type="text"
              value={`${window.location.origin}/signup?ref=${stats.referralCode}`}
              readOnly
              className="link-input"
            />
            <button
              className={`copy-btn ${copySuccess ? 'success' : ''}`}
              onClick={copyReferralLink}
            >
              {copySuccess ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13.5 4L6 11.5L2.5 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect
                      x="5"
                      y="5"
                      width="9"
                      height="9"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M11 5V3C11 2.44772 10.5523 2 10 2H3C2.44772 2 2 2.44772 2 3V10C2 10.5523 2.44772 11 3 11H5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        ) : (
          <button className="generate-btn" onClick={generateReferralCode}>
            Generate Referral Link
          </button>
        )}
        {config && (
          <p className="reward-info">
            Earn ${config.referrerReward} when your referral starts a project.
            They get ${config.referredReward} off their first project!
          </p>
        )}
      </div>

      {/* Referrals List */}
      <div className="referrals-section">
        <h3>Your Referrals</h3>
        {referrals.length > 0 ? (
          <div className="referrals-table">
            <div className="table-header">
              <span>Contact</span>
              <span>Status</span>
              <span>Date</span>
              <span>Reward</span>
            </div>
            {referrals.map((referral) => (
              <div key={referral.id} className="table-row">
                <div className="contact-cell">
                  <div className="avatar">
                    {(referral.referredName || referral.referredEmail)[0].toUpperCase()}
                  </div>
                  <div className="contact-info">
                    <span className="name">
                      {referral.referredName || 'Unknown'}
                    </span>
                    <span className="email">{referral.referredEmail}</span>
                  </div>
                </div>
                <div className="status-cell">{getStatusBadge(referral.status)}</div>
                <div className="date-cell">
                  {new Date(referral.createdAt).toLocaleDateString()}
                </div>
                <div className="reward-cell">
                  {referral.rewardAmount ? (
                    <span className="reward-earned">
                      +${referral.rewardAmount}
                    </span>
                  ) : (
                    <span className="reward-pending">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M36 42V38C36 35.8783 35.1571 33.8434 33.6569 32.3431C32.1566 30.8429 30.1217 30 28 30H12C9.87827 30 7.84344 30.8429 6.34315 32.3431C4.84285 33.8434 4 35.8783 4 38V42"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20 22C24.4183 22 28 18.4183 28 14C28 9.58172 24.4183 6 20 6C15.5817 6 12 9.58172 12 14C12 18.4183 15.5817 22 20 22Z"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M44 42V38C43.9988 36.2275 43.4023 34.5063 42.3037 33.1031C41.205 31.6998 39.6658 30.6943 37.9377 30.2418"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M32 6.24182C33.7329 6.69229 35.2773 7.69803 36.3795 9.10375C37.4816 10.5095 38.0793 12.2359 38.0793 14.0138C38.0793 15.7918 37.4816 17.5182 36.3795 18.9239C35.2773 20.3296 33.7329 21.3354 32 21.7858"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p>No referrals yet</p>
            <span>Start inviting friends to earn credits!</span>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite a Friend</h2>
              <button
                className="close-btn"
                onClick={() => setShowInviteModal(false)}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="name">Name (Optional)</label>
                <input
                  type="text"
                  id="name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={inviting}>
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralDashboard;
