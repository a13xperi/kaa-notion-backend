import React, { useState } from 'react';
import logger from '../utils/logger';
import './ClientLogin.css';

interface ClientLoginProps {
  onLogin: (address: string, password: string) => void;
  onBack: () => void;
  onQuickAccess?: () => void;
}

const ClientLogin: React.FC<ClientLoginProps> = ({ onLogin, onBack, onQuickAccess }) => {
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickAccess = () => {
    // Bypass login and go straight to client portal
    logger.info('[ClientLogin] Quick access: Bypassing login and verification');
    if (onQuickAccess) {
      onQuickAccess();
    } else {
      // Fallback: go through normal login flow
      onLogin('Demo Project', 'demo123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim() && password.trim()) {
      setIsSubmitting(true);
      setError(null);
      
      // Demo mode: Auto-accept demo123 password without backend validation
      if (password.trim() === 'demo123') {
        logger.info('[ClientLogin] Demo mode: Auto-accepting credentials');
        onLogin(address.trim(), password.trim());
        return;
      }
      
      try {
        // Call backend to verify credentials
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        logger.info('[ClientLogin] Calling API:', `${apiUrl}/api/client/verify`);
        // Sanitize inputs before sending
        const sanitizedAddress = address.trim().slice(0, 200); // Limit length
        const sanitizedPassword = password.trim().slice(0, 100); // Limit password length
        
        const response = await fetch(`${apiUrl}/api/client/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address: sanitizedAddress, 
            password: sanitizedPassword 
          })
        });
        logger.info('[ClientLogin] Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          if (data.verified) {
            onLogin(address.trim(), password.trim());
          } else {
            setError('Invalid address or password. Please try again.');
            setIsSubmitting(false);
          }
        } else {
          setError('Unable to verify credentials. Please contact support.');
          setIsSubmitting(false);
        }
      } catch (err) {
        logger.error('Login error:', err);
        // If connection fails but password is demo123, still allow login
        if (password.trim() === 'demo123') {
          logger.info('[ClientLogin] Backend unavailable, but demo mode enabled - allowing login');
          onLogin(address.trim(), password.trim());
        } else {
          setError('Connection error. Please try again.');
          setIsSubmitting(false);
        }
      }
    }
  };

  return (
    <div className="client-login-page">
      <div className="client-login-container">
        {/* Back Button */}
        <button 
          className="client-back-button" 
          onClick={onBack}
          aria-label="Go back to home page"
        >
          <span aria-hidden="true">←</span> Back to Home
        </button>

        {/* Header */}
        <div className="client-login-header">
          <div className="client-login-icon">👥</div>
          <h1 className="client-login-title">Client Portal</h1>
          <p className="client-login-subtitle">
            Enter your project address and access code
          </p>
        </div>

        {/* Login Form */}
        <form className="client-login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="form-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="address" className="form-label">
              Project Address
            </label>
            <input
              type="text"
              id="address"
              className="form-input"
              placeholder="e.g., 123 Main Street, Austin TX"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoFocus
              disabled={isSubmitting}
              autoComplete="off"
            />
            <p className="form-hint">
              Enter the address associated with your project
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Access Code
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="Enter your access code"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="off"
            />
            <p className="form-hint">
              Use the access code provided in your welcome email
            </p>
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={!address.trim() || !password.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="submit-spinner"></span>
                Verifying...
              </>
            ) : (
              <>
                Access My Documents
                <span className="submit-arrow">→</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Access Button */}
        <div className="quick-access-section">
          <button
            type="button"
            className="quick-access-button"
            onClick={handleQuickAccess}
            title="Skip login and go straight to Client Portal"
            aria-label="Quick access: Skip login and go straight to dashboard"
          >
            <span aria-hidden="true">⚡</span> Quick Access - Skip to Dashboard
          </button>
        </div>

        {/* Help Text */}
        <div className="client-login-footer">
          <p className="help-text">
            Need help? <a href="mailto:support@kaa.com">Contact Support</a>
          </p>
          <p className="help-text demo-note">
            <strong>Demo Mode:</strong> Use any address with password "demo123"
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
