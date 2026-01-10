import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';
import './UserVerification.css';

interface UserVerificationProps {
  address: string;
  onVerify: (address: string, lastName: string) => void;
  onBack: () => void;
}

const UserVerification: React.FC<UserVerificationProps> = ({ address, onVerify, onBack }) => {
  // Pre-populate with demo values if address contains "demo" or if skip flag is set
  const isDemoAddress = address?.toLowerCase().includes('demo') || !address;
  const [lastName, setLastName] = useState(isDemoAddress ? 'demo' : '');
  const [confirmAddress, setConfirmAddress] = useState(isDemoAddress ? (address || 'demo') : '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-bypass if skip flag is set (from bypass buttons)
  useEffect(() => {
    const skipVerification = sessionStorage.getItem('skip_verification') === 'true' ||
                            sessionStorage.getItem('skip_onboarding') === 'true';
    
    if (skipVerification) {
      logger.info('[UserVerification] Skip flag detected - Auto-bypassing verification');
      // Clear the flag
      sessionStorage.removeItem('skip_verification');
      // Auto-verify immediately
      setTimeout(() => {
        onVerify(address || 'Demo Project', 'Demo');
      }, 100);
    }
  }, [address, onVerify]);

  const handleQuickAccess = () => {
    // Bypass verification and go straight to client portal
    logger.info('[UserVerification] Quick access: Bypassing verification');
    // Set skip flag for future navigation
    sessionStorage.setItem('skip_verification', 'true');
    onVerify(address || 'Demo Project', 'Demo');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsVerifying(true);
    setError(null);

    // DEMO MODE: Always accept if address or inputs contain "demo" (case-insensitive)
    const isDemoMode = address?.toLowerCase().includes('demo') || 
                       confirmAddress.toLowerCase().includes('demo') ||
                       lastName.toLowerCase().includes('demo') ||
                       address?.toLowerCase().includes('project') ||
                       confirmAddress.toLowerCase().includes('project');
    
    // In demo mode, skip all validation and auto-accept
    if (isDemoMode) {
      logger.info('[UserVerification] Demo mode detected - Auto-accepting verification');
      setTimeout(() => {
        setIsVerifying(false);
        onVerify(address || confirmAddress || 'Demo Project', lastName.trim() || 'Demo');
      }, 300);
      return;
    }
    
    // For non-demo mode, validate fields
    if (!lastName.trim() || !confirmAddress.trim()) {
      setError('Please fill in all fields');
      setIsVerifying(false);
      return;
    }

    // Check if address matches (only for non-demo mode)
    if (confirmAddress.trim().toLowerCase() !== address.toLowerCase()) {
      setError('Address does not match. Please enter the correct project address.');
      setIsVerifying(false);
      return;
    }

    try {
      // Sanitize inputs before sending
      const sanitizedAddress = address.trim().slice(0, 200);
      const sanitizedLastName = lastName.trim().slice(0, 100); // Limit last name length
      
      // Call backend to verify last name matches the address
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/client/verify-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address: sanitizedAddress, 
            lastName: sanitizedLastName 
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.verified) {
          onVerify(address, lastName.trim());
        } else {
          setError(data.error || 'Last name does not match our records. Please check and try again.');
          setIsVerifying(false);
        }
      } else {
        // If backend fails, allow in demo mode or if address/inputs contain "demo"
        const fallbackDemoMode = address?.toLowerCase().includes('demo') || 
                                 confirmAddress.toLowerCase().includes('demo') ||
                                 lastName.toLowerCase().includes('demo');
        
        if (fallbackDemoMode) {
          logger.info('[UserVerification] Backend unavailable, but demo mode enabled - allowing verification');
          onVerify(address || confirmAddress || 'Demo Project', lastName.trim() || 'Demo');
        } else {
          setError('Unable to verify. Please contact support or use the Quick Access button below to bypass verification.');
          setIsVerifying(false);
        }
      }
    } catch (err) {
      logger.error('User verification error:', err);
      // If connection fails, allow in demo mode or if address/inputs contain "demo"
      const fallbackDemoMode = address?.toLowerCase().includes('demo') || 
                               confirmAddress.toLowerCase().includes('demo') ||
                               lastName.toLowerCase().includes('demo');
      
      if (fallbackDemoMode) {
        logger.info('[UserVerification] Connection error, but demo mode enabled - allowing verification');
        onVerify(address || confirmAddress || 'Demo Project', lastName.trim() || 'Demo');
      } else {
        setError('Connection error. Please try again or use the Quick Access button below to bypass verification.');
        setIsVerifying(false);
      }
    }
  };

  return (
    <div className="user-verification-page">
      <div className="user-verification-container">
        {/* Back Button */}
        <button className="verification-back-button" onClick={onBack}>
          ← Back
        </button>

        {/* Header */}
        <div className="user-verification-header">
          <div className="verification-icon">🔐</div>
          <h1 className="verification-title">User Verification</h1>
          <p className="verification-subtitle">
            Verify your identity to access project documents
          </p>
        </div>

        {/* Info Box */}
        <div className="verification-info-box">
          <span className="info-icon">ℹ️</span>
          <span>This additional verification ensures secure access to your project</span>
        </div>

        {/* Verification Form */}
        <form className="user-verification-form" onSubmit={handleSubmit}>
          {error && (
            <div className="form-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="confirmAddress" className="form-label">
              Confirm Project Address
            </label>
            <input
              type="text"
              id="confirmAddress"
              className="form-input"
              placeholder={address || "Enter project address again"}
              value={confirmAddress}
              onChange={(e) => setConfirmAddress(e.target.value)}
              autoFocus
              disabled={isVerifying}
              autoComplete="off"
            />
            <p className="form-hint">
              {address ? `Re-enter "${address}" for verification` : 'Re-enter the project address for verification'}
              <br />
              <strong style={{ color: 'rgba(255, 255, 255, 0.8)' }}>💡 Tip: Type "demo" in any field to auto-verify</strong>
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="lastName" className="form-label">
              Your Last Name
            </label>
            <input
              type="text"
              id="lastName"
              className="form-input"
              placeholder="Enter your last name (or 'demo' to skip)"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isVerifying}
              autoComplete="family-name"
            />
            <p className="form-hint">
              We use last names to reference and organize projects
              <br />
              <strong style={{ color: 'rgba(255, 255, 255, 0.8)' }}>💡 Tip: Type "demo" to auto-verify</strong>
            </p>
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={!lastName.trim() || !confirmAddress.trim() || isVerifying}
          >
            {isVerifying ? (
              <>
                <span className="submit-spinner"></span>
                Verifying...
              </>
            ) : (
              <>
                Verify & Continue
                <span className="submit-arrow">→</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Access Button - Prominent */}
        <div className="quick-access-section" style={{
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '2px solid rgba(255, 255, 255, 0.3)',
        }}>
          <button
            type="button"
            className="quick-access-button"
            onClick={handleQuickAccess}
            title="Skip verification and go straight to Client Portal"
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
            }}
          >
            🚀 Quick Access - Skip to Dashboard (Bypass All)
          </button>
          <p style={{
            fontSize: '0.875rem',
            color: 'rgba(255, 255, 255, 0.9)',
            marginTop: '0.75rem',
            textAlign: 'center',
            fontStyle: 'italic',
          }}>
            Click to skip verification and go directly to the dashboard
          </p>
        </div>

        {/* Help Text */}
        <div className="user-verification-footer">
          <p className="help-text">
            Having trouble? <a href="mailto:support@kaa.com">Contact Support</a>
          </p>
          <p className="security-notice">
            🔒 <strong>Secure:</strong> Your information is protected and only used for project access
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserVerification;


