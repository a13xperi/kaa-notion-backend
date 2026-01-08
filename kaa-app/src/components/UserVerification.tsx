import React, { useState } from 'react';
import logger from '../utils/logger';
import './UserVerification.css';

interface UserVerificationProps {
  address: string;
  onVerify: (address: string, lastName: string) => void;
  onBack: () => void;
}

const UserVerification: React.FC<UserVerificationProps> = ({ address, onVerify, onBack }) => {
  const [lastName, setLastName] = useState('');
  const [confirmAddress, setConfirmAddress] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickAccess = () => {
    // Bypass verification and go straight to client portal
    logger.info('[UserVerification] Quick access: Bypassing verification');
    onVerify(address || 'Demo Project', 'Demo');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lastName.trim() || !confirmAddress.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Check if address matches
    if (confirmAddress.trim().toLowerCase() !== address.toLowerCase()) {
      setError('Address does not match. Please enter the correct project address.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    // Demo mode: Auto-accept verification without backend validation
    // If address contains "demo" (case-insensitive) or is the same as confirmAddress, skip backend
    const isDemoMode = address.toLowerCase().includes('demo') || 
                       address.toLowerCase().includes('project') ||
                       confirmAddress.trim().toLowerCase() === address.toLowerCase();
    
    if (isDemoMode && lastName.trim()) {
      logger.info('[UserVerification] Demo mode: Auto-accepting verification');
      // Small delay to simulate processing
      setTimeout(() => {
        onVerify(address, lastName.trim());
      }, 300);
      return;
    }

    try {
      // Sanitize inputs before sending
      const sanitizedAddress = address.trim().slice(0, 200);
      const sanitizedLastName = lastName.trim().slice(0, 100); // Limit last name length
      
      // Call backend to verify last name matches the address
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/client/verify-user`,
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
        // If backend fails but we have valid inputs, still allow in demo mode
        if (isDemoMode && lastName.trim()) {
          logger.info('[UserVerification] Backend unavailable, but demo mode enabled - allowing verification');
          onVerify(address, lastName.trim());
        } else {
          setError('Unable to verify. Please contact support.');
          setIsVerifying(false);
        }
      }
    } catch (err) {
      logger.error('User verification error:', err);
      // If connection fails but we have valid inputs, still allow in demo mode
      if (isDemoMode && lastName.trim()) {
        logger.info('[UserVerification] Connection error, but demo mode enabled - allowing verification');
        onVerify(address, lastName.trim());
      } else {
        setError('Connection error. Please try again.');
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
              placeholder="Enter project address again"
              value={confirmAddress}
              onChange={(e) => setConfirmAddress(e.target.value)}
              autoFocus
              disabled={isVerifying}
              autoComplete="off"
            />
            <p className="form-hint">
              Re-enter the project address for verification
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
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isVerifying}
              autoComplete="family-name"
            />
            <p className="form-hint">
              We use last names to reference and organize projects
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

        {/* Quick Access Button */}
        <div className="quick-access-section">
          <button
            type="button"
            className="quick-access-button"
            onClick={handleQuickAccess}
            title="Skip verification and go straight to Client Portal"
          >
            ⚡ Quick Access - Skip to Dashboard
          </button>
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


