import React from 'react';
import SageLogo from './SageLogo';
import './ClientPortalLanding.css';

interface ClientPortalLandingProps {
  onLogin: () => void;
  onBack: () => void;
}

const ClientPortalLanding: React.FC<ClientPortalLandingProps> = ({ onLogin, onBack }) => {
  return (
    <div className="client-portal-landing">
      <div className="client-portal-container">
        {/* Back Button */}
        <button className="portal-back-button" onClick={onBack}>
          ← Back to Home
        </button>

        {/* Header */}
        <div className="portal-landing-header">
          <div className="portal-brand">
            <SageLogo size="large" showText={true} />
            <h1 className="brand-title">Client Portal</h1>
          </div>
          <p className="brand-tagline">Secure Access to Your Project Documents</p>
        </div>

        {/* Main Content Card */}
        <div className="portal-welcome-card">
          <div className="welcome-content">
            <h2 className="welcome-title">Welcome</h2>
            <p className="welcome-message">
              Access your project documents, track progress, and stay connected with your team. 
              Our secure portal ensures your information is protected and always accessible.
            </p>

            <div className="portal-features">
              <div className="feature-item">
                <span className="feature-icon">📄</span>
                <div className="feature-text">
                  <strong>View Documents</strong>
                  <span>Access all your project files</span>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📤</span>
                <div className="feature-text">
                  <strong>Upload Files</strong>
                  <span>Share documents with your team</span>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <div className="feature-text">
                  <strong>Secure Access</strong>
                  <span>Protected with two-step verification</span>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <div className="feature-text">
                  <strong>Track Progress</strong>
                  <span>Monitor your project status</span>
                </div>
              </div>
            </div>

            <button className="portal-login-button" onClick={onLogin}>
              <span>Sign In to Your Account</span>
              <span className="login-arrow">→</span>
            </button>

            <div className="portal-help">
              <p className="help-text">
                <strong>First time here?</strong> Contact your project manager for access credentials.
              </p>
              <p className="help-text">
                Need assistance? <a href="mailto:support@kaa.com">Contact Support</a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="portal-footer">
          <div className="security-badges">
            <span className="badge">🔐 Bank-Level Encryption</span>
            <span className="badge">✅ Two-Step Verification</span>
            <span className="badge">🌐 24/7 Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPortalLanding;


