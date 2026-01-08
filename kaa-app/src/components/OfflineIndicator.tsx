import React, { useState, useEffect } from 'react';
import pwaManager from '../utils/pwa';
import './OfflineIndicator.css';

interface OfflineIndicatorProps {
  className?: string;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      // Hide indicator after 3 seconds
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'} ${className}`}>
      <div className="indicator-content">
        <span className="indicator-icon">
          {isOnline ? '🟢' : '🔴'}
        </span>
        <span className="indicator-text">
          {isOnline ? 'Back Online' : 'Offline Mode'}
        </span>
        <span className="indicator-message">
          {isOnline 
            ? 'You are now connected to the internet' 
            : 'Some features may not be available'
          }
        </span>
      </div>
    </div>
  );
};

export default OfflineIndicator;
