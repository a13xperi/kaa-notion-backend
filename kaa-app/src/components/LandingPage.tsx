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
  const handleClientPortal = () => {
    if (onSelectPortal) {
      onSelectPortal('client');
    } else {
      navigateTo('/login');
    }
  };

  const handleTeamPortal = () => {
    if (onSelectPortal) {
      onSelectPortal('team');
    } else {
      navigateTo('/admin');
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
        </div>

        {/* Portal Cards */}
        <div className="portal-cards">
          {/* Client Portal Card */}
          <button 
            className="portal-card client-portal"
            onClick={handleClientPortal}
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
            onClick={handleTeamPortal}
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

