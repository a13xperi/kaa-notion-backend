import React, { useState, useMemo } from 'react';
import { useNotifications, useNotificationMutations, Notification } from '../hooks/useNotifications';
import './NotificationSystem.css';

// Demo notifications when API is unavailable
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'demo-1',
    type: 'MESSAGE_RECEIVED',
    title: 'New message from Project Manager',
    message: 'Hi there! Just wanted to check in on your project progress. Let me know if you have any questions.',
    link: '/portal/messages',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: 'demo-2',
    type: 'DELIVERABLE_READY',
    title: 'Design Draft Ready for Review',
    message: 'Your Phase 2 design draft is ready for review. Please check the deliverables section.',
    link: '/portal/deliverables',
    read: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: 'demo-3',
    type: 'PROJECT_UPDATE',
    title: 'Project Milestone Achieved',
    message: 'Congratulations! Phase 1 of your project has been completed successfully.',
    link: '/portal/projects',
    read: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  },
  {
    id: 'demo-4',
    type: 'MILESTONE_COMPLETED',
    title: 'Milestone: Site Analysis Complete',
    message: 'The site analysis phase has been marked as complete. Moving to design phase.',
    link: '/portal/analytics',
    read: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  },
  {
    id: 'demo-5',
    type: 'SYSTEM',
    title: 'Welcome to SAGE Portal!',
    message: 'Thanks for joining! Explore your dashboard to get started with your landscape design project.',
    read: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  },
];

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
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);

  // Fetch notifications from API
  const {
    notifications: apiNotifications,
    unreadCount: apiUnreadCount,
    isLoading,
    isError,
    refetch
  } = useNotifications({
    read: filter === 'unread' ? false : undefined,
    limit: 50,
  });

  const {
    markAsRead: apiMarkAsRead,
    markAllAsRead: apiMarkAllAsRead,
    deleteNotification: apiDeleteNotification,
    isMarkingAllRead
  } = useNotificationMutations();

  // Use API data if available, otherwise use demo data
  const usingDemoData = isError || (apiNotifications.length === 0 && !isLoading);
  const notifications = usingDemoData ? localNotifications : apiNotifications;
  const unreadCount = usingDemoData 
    ? localNotifications.filter(n => !n.read).length 
    : apiUnreadCount;

  const handleMarkAsRead = (notificationId: string) => {
    if (usingDemoData) {
      setLocalNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } else {
      apiMarkAsRead(notificationId);
    }
  };

  const handleMarkAllAsRead = () => {
    if (usingDemoData) {
      setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } else {
      apiMarkAllAsRead();
    }
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    if (usingDemoData) {
      setLocalNotifications(prev => prev.filter(n => n.id !== notificationId));
    } else {
      apiDeleteNotification(notificationId);
    }
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
