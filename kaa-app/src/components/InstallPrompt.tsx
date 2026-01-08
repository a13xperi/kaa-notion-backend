import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';
import pwaManager from '../utils/pwa';
import './InstallPrompt.css';

interface InstallPromptProps {
  className?: string;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({ className = '' }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (pwaManager.isStandalone()) {
      return;
    }

    // Check if user has dismissed the prompt
    const dismissed = localStorage.getItem('kaa-install-dismissed');
    if (dismissed) {
      return;
    }

    // Show prompt after a delay
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 5000); // Show after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const success = await pwaManager.installApp();
      if (success) {
        setShowPrompt(false);
      }
    } catch (error) {
      logger.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem('kaa-install-dismissed', 'true');
  };

  if (!showPrompt || isDismissed) return null;

  return (
    <div className={`install-prompt ${className}`}>
      <div className="install-content">
        <div className="install-icon">📱</div>
        <div className="install-text">
          <h3>Install KAA App</h3>
          <p>Get quick access to your projects with our mobile app</p>
        </div>
        <div className="install-actions">
          <button
            className="install-btn"
            onClick={handleInstall}
            disabled={isInstalling}
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </button>
          <button
            className="dismiss-btn"
            onClick={handleDismiss}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
