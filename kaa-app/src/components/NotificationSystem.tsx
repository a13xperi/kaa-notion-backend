import React, { useState } from 'react';
import { useNotifications, useNotificationMutations } from '../hooks/useNotifications';
import './NotificationSystem.css';

interface NotificationSystemProps {
  currentUser: string;
  userType: 'client' | 'team';
  onClose?: () => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  currentUser,
  userType,
  onClose
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch notifications from API
  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    refetch
  } = useNotifications({
    read: filter === 'unread' ? false : undefined,
    limit: 50,
  });

  const {
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingAllRead
  } = useNotificationMutations();

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MESSAGE_RECEIVED': return '💬';
      case 'DELIVERABLE_READY': return '📦';
      case 'PROJECT_UPDATE': return '📊';
      case 'MILESTONE_COMPLETED': return '🎯';
      case 'PAYMENT_RECEIVED': return '💰';
      case 'REVISION_REQUESTED': return '🔄';
      case 'SYSTEM': return '🔔';
      default: return '📢';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  if (isLoading) {
    return (
      <div className="notification-system">
        <div className="notification-header">
          <div className="header-title-section">
            <h1>Notifications</h1>
            <p className="notifications-subtitle">Loading...</p>
          </div>
        </div>
        <div className="notification-content">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="notification-system">
        <div className="notification-header">
          <div className="header-title-section">
            <h1>Notifications</h1>
          </div>
        </div>
        <div className="notification-content">
          <div className="error-state">
            <p>Failed to load notifications</p>
            <button onClick={() => refetch()} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-system">
      {/* Header with Actions */}
      <div className="notification-header">
        <div className="header-title-section">
          <h1>Notifications</h1>
          <p className="notifications-subtitle">Stay updated with your project activity</p>
        </div>
        <div className="header-actions">
          {unreadCount > 0 && (
            <button
              className="mark-all-read-btn"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllRead}
            >
              {isMarkingAllRead ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>
      </div>

      <div className="notification-content">
        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="notifications-list">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h4 className="notification-title">{notification.title}</h4>
                    <div className="notification-meta">
                      <span className="notification-time">{formatTime(notification.createdAt)}</span>
                    </div>
                  </div>
                  <p className="notification-message">{notification.message}</p>
                </div>
                <div className="notification-actions">
                  {notification.link && (
                    <a href={notification.link} className="action-btn">View</a>
                  )}
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(e, notification.id)}
                  >
                    ✕
                  </button>
                </div>
                {!notification.read && <div className="unread-indicator"></div>}
              </div>
            ))
          ) : (
            <div className="no-notifications">
              <div className="no-notifications-icon">🔔</div>
              <h3>No notifications</h3>
              <p>
                {filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : "No notifications yet. They'll appear here when you receive them."
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSystem;
