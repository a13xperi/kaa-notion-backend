/**
 * Notification Center Component
 * Displays real-time notifications with bell icon and dropdown.
 */

import React, { useState, useRef, useEffect, JSX } from 'react';
import {
  useRealtimeNotifications,
  Notification,
  ConnectionStatus,
  getNotificationIcon,
  getNotificationColor,
  formatNotificationTime,
} from '../hooks/useRealtimeNotifications';
import './NotificationCenter.css';

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationCenterProps {
  userId: string;
  userType: 'client' | 'team' | 'admin';
  token: string;
  projectIds?: string[];
  onNotificationClick?: (notification: Notification) => void;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  onMarkAsRead: () => void;
  onDismiss: () => void;
}

function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
  onDismiss,
}: NotificationItemProps): React.JSX.Element {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead();
    }
    onClick?.();
  };

  return (
    <div
      className={`notification-item ${notification.read ? 'read' : 'unread'} priority-${notification.priority}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="notification-icon">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-title">{notification.title}</span>
          <span className="notification-time">{formatNotificationTime(notification.timestamp)}</span>
        </div>
        <p className="notification-message">{notification.message}</p>
        {!notification.read && (
          <div
            className="notification-unread-indicator"
            style={{ backgroundColor: getNotificationColor(notification.priority) }}
          />
        )}
      </div>
      <button
        className="notification-dismiss"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  onReconnect: () => void;
}

function ConnectionIndicator({ status, onReconnect }: ConnectionIndicatorProps): React.JSX.Element | null {
  if (status === 'connected') return null;

  const statusConfig = {
    connecting: { label: 'Connecting...', className: 'connecting' },
    disconnected: { label: 'Disconnected', className: 'disconnected' },
    error: { label: 'Connection error', className: 'error' },
  };

  const config = statusConfig[status];

  return (
    <div className={`connection-indicator ${config.className}`}>
      <span>{config.label}</span>
      {(status === 'disconnected' || status === 'error') && (
        <button onClick={onReconnect} className="reconnect-button">
          Retry
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NotificationCenter({
  userId,
  userType,
  token,
  projectIds = [],
  onNotificationClick,
}: NotificationCenterProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    status,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    reconnect,
  } = useRealtimeNotifications({
    userId,
    userType,
    token,
    projectIds,
    onNotification: (notification) => {
      // Play notification sound for high priority
      if (notification.priority === 'high' || notification.priority === 'urgent') {
        playNotificationSound();
      }
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    onNotificationClick?.(notification);
    setIsOpen(false);
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        <ConnectionDot status={status} />
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="menu">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="mark-all-read">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="clear-all">
                  Clear all
                </button>
              )}
            </div>
          </div>

          <ConnectionIndicator status={status} onReconnect={reconnect} />

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="notification-empty-icon">🔔</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onMarkAsRead={() => markAsRead(notification.id)}
                  onDismiss={() => clearNotification(notification.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function BellIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ConnectionDot({ status }: { status: ConnectionStatus }): React.JSX.Element {
  const colors = {
    connected: '#22C55E',
    connecting: '#F59E0B',
    disconnected: '#6B7280',
    error: '#EF4444',
  };

  return (
    <span
      className="connection-dot"
      style={{ backgroundColor: colors[status] }}
      title={status}
    />
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function playNotificationSound(): void {
  try {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch {
    // Audio might not be available
  }
}

export default NotificationCenter;
