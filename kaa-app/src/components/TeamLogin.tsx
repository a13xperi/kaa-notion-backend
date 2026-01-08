import React, { useState } from 'react';
import './TeamLogin.css';

interface TeamLoginProps {
  onLogin: (teamMember: string, role: string) => void;
  onBack: () => void;
}

const TeamLogin: React.FC<TeamLoginProps> = ({ onLogin, onBack }) => {
  const [teamMember, setTeamMember] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // For now, using demo team members
      // In production, this would call the backend API
      const demoTeamMembers: { [key: string]: { role: string; password: string } } = {
        'alex': { role: 'Project Manager', password: 'team123' },
        'sarah': { role: 'Designer', password: 'team123' },
        'mike': { role: 'Developer', password: 'team123' },
        'demo': { role: 'Project Manager', password: 'demo123' }
      };

      const member = demoTeamMembers[teamMember.toLowerCase()];
      
      if (member && member.password === teamPassword) {
        onLogin(teamMember, member.role);
      } else {
        setError('Invalid team member credentials. Try "demo" with password "demo123"');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="team-login">
      <div className="login-container">
        {/* Header */}
        <div className="login-header">
          <button className="back-button" onClick={onBack}>
            ← Back to Home
          </button>
          <div className="header-content">
            <span className="login-icon">🎯</span>
            <h1>Team Dashboard</h1>
            <p>Access your assigned projects and client communications</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="login-form-container">
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="teamMember">Team Member Name</label>
              <input
                type="text"
                id="teamMember"
                value={teamMember}
                onChange={(e) => setTeamMember(e.target.value)}
                placeholder="Enter your name"
                required
                autoFocus
              />
              <p className="field-help">Enter your first name or team identifier</p>
            </div>

            <div className="form-group">
              <label htmlFor="teamPassword">Team Password</label>
              <input
                type="password"
                id="teamPassword"
                value={teamPassword}
                onChange={(e) => setTeamPassword(e.target.value)}
                placeholder="Enter team password"
                required
              />
              <p className="field-help">Use the team password provided by your manager</p>
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="login-button"
              disabled={loading || !teamMember || !teamPassword}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Accessing Dashboard...
                </>
              ) : (
                <>
                  Access My Projects →
                </>
              )}
            </button>
          </form>

          {/* Demo Info */}
          <div className="demo-info">
            <div className="demo-header">
              <span className="demo-icon">🧪</span>
              <strong>Demo Mode:</strong>
            </div>
            <p>Use "demo" with password "demo123" to test the team dashboard</p>
            <div className="demo-credentials">
              <div className="credential-item">
                <strong>Name:</strong> demo
              </div>
              <div className="credential-item">
                <strong>Password:</strong> demo123
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="help-section">
            <p>
              <strong>Need help?</strong> Contact your team lead for access credentials.
            </p>
            <p>
              <strong>First time?</strong> Your manager will provide your team password.
            </p>
          </div>
        </div>

        {/* Security Features */}
        <div className="security-features">
          <div className="security-item">
            <span className="security-icon">🔐</span>
            <span>Secure Team Access</span>
          </div>
          <div className="security-item">
            <span className="security-icon">👥</span>
            <span>Project-Based Permissions</span>
          </div>
          <div className="security-item">
            <span className="security-icon">📊</span>
            <span>Activity Tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamLogin;
