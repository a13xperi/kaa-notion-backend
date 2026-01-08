import React from 'react';
import SageLogo from './SageLogo';
import './LandingPage.css';

interface LandingPageProps {
  onSelectPortal: (portal: 'client' | 'team') => void;
  onShowDemo: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectPortal, onShowDemo }) => {
  return (
    <div className="landing-page">
      <div className="landing-container">
        {/* Header */}
        <div className="landing-header">
          <SageLogo size="xlarge" showText={true} className="landing-logo" />
          <h1 className="landing-title">KAA Command Center</h1>
          <p className="landing-subtitle">Workspace Management & Collaboration Hub</p>
        </div>

        {/* Portal Cards */}
        <div className="portal-cards">
          {/* Client Portal Card */}
          <button 
            className="portal-card client-portal"
            onClick={() => onSelectPortal('client')}
          >
            <div className="portal-icon">👥</div>
            <h2 className="portal-title">Client Portal</h2>
            <p className="portal-description">
              Access project updates, deliverables, and documentation
            </p>
            <div className="portal-arrow">→</div>
          </button>

          {/* Team Dashboard Card */}
          <button 
            className="portal-card team-portal"
            onClick={() => onSelectPortal('team')}
          >
            <div className="portal-icon">🎯</div>
            <h2 className="portal-title">Team Dashboard</h2>
            <p className="portal-description">
              Full workspace access, task tracking, and team collaboration
            </p>
            <div className="portal-arrow">→</div>
          </button>

          {/* Feature Demo Card */}
          <button 
            className="portal-card demo-portal"
            onClick={onShowDemo}
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

