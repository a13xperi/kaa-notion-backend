/**
 * NotificationSettings Component
 * Manages push notification preferences
 */

import React from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import './NotificationSettings.css';

interface NotificationSettingsProps {
  onClose?: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
  const { status, subscribe, unsubscribe, sendTestNotification } = usePushNotifications();

  const handleToggle = async () => {
    if (status.subscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestNotification = async () => {
    const success = await sendTestNotification();
    if (!success) {
      alert('Failed to send test notification. Please check your settings.');
    }
  };

  if (!status.supported) {
    return (
      <div className="notification-settings">
        <div className="settings-header">
          <h3>Push Notifications</h3>
          {onClose && (
            <button className="close-btn" onClick={onClose}>
              &times;
            </button>
          )}
        </div>
        <div className="unsupported-message">
          <p>Push notifications are not supported in this browser.</p>
          <p className="hint">Try using Chrome, Firefox, or Edge on desktop/Android.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <div className="settings-header">
        <h3>Push Notifications</h3>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        )}
      </div>

      <div className="settings-content">
        {/* Permission Status */}
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Browser Permission</span>
            <span className={`permission-badge ${status.permission}`}>
              {status.permission === 'granted' && 'Allowed'}
              {status.permission === 'denied' && 'Blocked'}
              {status.permission === 'default' && 'Not Set'}
            </span>
          </div>
          {status.permission === 'denied' && (
            <p className="permission-hint">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          )}
        </div>

        {/* Enable/Disable Toggle */}
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Enable Notifications</span>
            <span className="setting-description">
              Receive alerts for project updates, messages, and milestones
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={status.subscribed}
              onChange={handleToggle}
              disabled={status.loading || status.permission === 'denied'}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {/* Error Message */}
        {status.error && (
          <div className="error-message">
            {status.error}
          </div>
        )}

        {/* Test Notification */}
        {status.subscribed && (
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Test Notifications</span>
              <span className="setting-description">
                Send a test notification to verify everything works
              </span>
            </div>
            <button
              className="test-btn"
              onClick={handleTestNotification}
              disabled={status.loading}
            >
              Send Test
            </button>
          </div>
        )}

        {/* Info Section */}
        <div className="info-section">
          <h4>You'll receive notifications for:</h4>
          <ul>
            <li>Project status updates</li>
            <li>New messages from the team</li>
            <li>Milestone completions</li>
            <li>Deliverable uploads</li>
            <li>Payment confirmations</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
