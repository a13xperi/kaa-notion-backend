import React from 'react';
import SageLogo from './SageLogo';
import './LandingPage.css';

interface LandingPageProps {
  onSelectPortal?: (portal: 'client' | 'team') => void;
  onShowDemo?: () => void;
}

// Navigation helper - uses window.location for simplicity
const navigateTo = (path: string) => {
  window.location.href = path;
};

const LandingPage: React.FC<LandingPageProps> = ({ onSelectPortal, onShowDemo }) => {
  const handleClientPortal = async () => {
    if (onSelectPortal) {
      onSelectPortal('client');
    } else {
      // Bypass login and go directly to client portal with dummy credentials
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'demo@sage.design',
            password: 'Demo123!',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
          localStorage.setItem('sage_auth_token', result.data.token);
          localStorage.setItem('sage_user', JSON.stringify(result.data.user));
          // COMPLETELY BYPASS ONBOARDING AND VERIFICATION:
          // 1. Mark onboarding as completed
          localStorage.setItem('kaa-onboarding-completed', 'true');
          // 2. Set session skip flags
          sessionStorage.setItem('skip_onboarding', 'true');
          sessionStorage.setItem('skip_verification', 'true');
          // 3. Clear any existing onboarding state
          localStorage.removeItem('kaa-onboarding-state');
          // Navigate directly to portal dashboard
          navigateTo('/portal');
          }
        } else {
          console.error('Client portal bypass failed');
          navigateTo('/login');
        }
      } catch (err) {
        console.error('Client portal bypass error:', err);
        navigateTo('/login');
      }
    }
  };

  const handleTeamPortal = async () => {
    if (onSelectPortal) {
      onSelectPortal('team');
    } else {
      // Bypass login and go directly to admin portal with admin credentials
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@sage.design',
            password: 'Admin123!',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
          localStorage.setItem('sage_auth_token', result.data.token);
          localStorage.setItem('sage_user', JSON.stringify(result.data.user));
          // COMPLETELY BYPASS ONBOARDING (admin/team don't need onboarding):
          // 1. Mark onboarding as completed
          localStorage.setItem('kaa-onboarding-completed', 'true');
          // 2. Set session skip flag
          sessionStorage.setItem('skip_onboarding', 'true');
          // 3. Clear any existing onboarding state
          localStorage.removeItem('kaa-onboarding-state');
          // Navigate directly to admin dashboard
          navigateTo('/admin');
          }
        } else {
          console.error('Team portal bypass failed');
          navigateTo('/admin');
        }
      } catch (err) {
        console.error('Team portal bypass error:', err);
        navigateTo('/admin');
      }
    }
  };

  const handleDemo = () => {
    if (onShowDemo) {
      onShowDemo();
    } else {
      navigateTo('/demo');
    }
  };

  const handleGetStarted = () => {
    navigateTo('/get-started');
  };

  const handlePricing = () => {
    navigateTo('/pricing');
  };

  const handleQuickDemo = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo@sage.design',
          password: 'Demo123!',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Store auth credentials
          localStorage.setItem('sage_auth_token', result.data.token);
          localStorage.setItem('sage_user', JSON.stringify(result.data.user));
          
          // COMPLETELY BYPASS ONBOARDING:
          // 1. Mark onboarding as completed
          localStorage.setItem('kaa-onboarding-completed', 'true');
          // 2. Set session skip flag
          sessionStorage.setItem('skip_onboarding', 'true');
          // 3. Clear any existing onboarding state that might trigger onboarding
          localStorage.removeItem('kaa-onboarding-state');
          
          // Navigate directly to portal dashboard
          navigateTo('/portal');
        }
      } else {
        console.error('Demo login failed');
        // Fallback: try navigating to login page
        navigateTo('/login');
      }
    } catch (err) {
      console.error('Demo login error:', err);
      // Fallback: navigate to login page
      navigateTo('/login');
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        {/* Header */}
        <div className="landing-header">
          <SageLogo size="xlarge" showText={true} className="landing-logo" />
          <h1 className="landing-title">SAGE Landscape Design</h1>
          <p className="landing-subtitle">Professional Landscape Architecture Services</p>
        </div>

        {/* CTA Section */}
        <div className="landing-cta">
          <button className="cta-button cta-primary" onClick={handleGetStarted}>
            Get Started →
          </button>
          <button className="cta-button cta-secondary" onClick={handlePricing}>
            View Pricing
          </button>
          <button
            className="cta-button cta-demo"
            onClick={handleQuickDemo}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.3)';
            }}
          >
            🚀 Jump to Dashboard (Skip All Onboarding)
          </button>
          <p style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.5rem',
            textAlign: 'center',
            fontStyle: 'italic',
          }}>
            Auto-login with demo credentials and bypass all onboarding steps
          </p>
        </div>

        {/* Portal Cards */}
        <div className="portal-cards">
          {/* Client Portal Card */}
          <button 
            className="portal-card client-portal"
            onClick={handleClientPortal}
            title="Bypass login: Auto-login as demo@sage.design and access client portal with dummy data (skips onboarding)"
          >
            <div className="portal-icon">👥</div>
            <div className="portal-bypass-badge" style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              fontSize: '0.7rem',
              color: '#059669',
              background: '#d1fae5',
              padding: '4px 8px',
              borderRadius: '12px',
              fontWeight: '600',
              border: '1px solid #10b981',
            }}>
              🚀 BYPASS
            </div>
            <h2 className="portal-title">Client Portal</h2>
            <p className="portal-description">
              Access project updates, deliverables, and documentation
            </p>
            <p className="portal-bypass-note" style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.5rem',
              fontStyle: 'italic',
            }}>
              Click to auto-login with dummy data (skips onboarding)
            </p>
            <div className="portal-arrow">→</div>
          </button>

          {/* Team Dashboard Card */}
          <button 
            className="portal-card team-portal"
            onClick={handleTeamPortal}
            title="Bypass login: Auto-login as admin@sage.design and access admin dashboard with dummy data (skips onboarding)"
          >
            <div className="portal-icon">🎯</div>
            <div className="portal-bypass-badge" style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              fontSize: '0.7rem',
              color: '#dc2626',
              background: '#fee2e2',
              padding: '4px 8px',
              borderRadius: '12px',
              fontWeight: '600',
              border: '1px solid #ef4444',
            }}>
              🚀 BYPASS
            </div>
            <h2 className="portal-title">Team Dashboard</h2>
            <p className="portal-description">
              Full workspace access, task tracking, and team collaboration
            </p>
            <p className="portal-bypass-note" style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.5rem',
              fontStyle: 'italic',
            }}>
              Click to auto-login as admin with dummy data (skips onboarding)
            </p>
            <div className="portal-arrow">→</div>
          </button>

          {/* Feature Demo Card */}
          <button 
            className="portal-card demo-portal"
            onClick={handleDemo}
          >
            <div className="portal-icon">🚀</div>
            <h2 className="portal-title">Feature Demo</h2>
            <p className="portal-description">
              Explore all app features, mobile responsiveness, and capabilities
            </p>
            <div className="portal-arrow">→</div>
          </button>
        </div>

        {/* Footer */}
        <div className="landing-footer">
          <p className="footer-text">Select your portal to continue</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
export { LandingPage };

