import React, { useState, useEffect } from 'react';
import './NotificationSystem.css';

interface Notification {
  id: string;
  type: 'message' | 'upload' | 'status_update' | 'reminder' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  sender?: string;
  projectId?: string;
}

interface NotificationSystemProps {
  currentUser: string;
  userType: 'client' | 'team';
  onClose?: () => void; // Optional - not needed when used in workspace
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ 
  currentUser, 
  userType, 
  onClose 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [currentUser, userType]);

  const loadNotifications = () => {
    // Demo notifications - in production, this would come from the API
    const demoNotifications: Notification[] = [
      {
        id: '1',
        type: 'message',
        title: 'New Message',
        message: userType === 'client' 
          ? 'Project Manager sent you a message about the design review'
          : 'Demo Project Address sent you a message about the timeline',
        timestamp: '2024-10-06T02:15:00Z',
        read: false,
        priority: 'high',
        sender: userType === 'client' ? 'Project Manager' : 'Demo Project Address',
        projectId: 'demo-project'
      },
      {
        id: '2',
        type: 'upload',
        title: 'Document Uploaded',
        message: userType === 'client'
          ? 'You uploaded "Permit Application.pdf"'
          : 'Demo Project Address uploaded "Permit Application.pdf"',
        timestamp: '2024-10-06T01:45:00Z',
        read: false,
        priority: 'medium',
        actionUrl: '/documents',
        projectId: 'demo-project'
      },
      {
        id: '3',
        type: 'status_update',
        title: 'Project Status Updated',
        message: userType === 'client'
          ? 'Your project status has been updated to "In Progress"'
          : 'Project status updated for Demo Project Address',
        timestamp: '2024-10-06T01:30:00Z',
        read: true,
        priority: 'medium',
        actionUrl: '/dashboard',
        projectId: 'demo-project'
      },
      {
        id: '4',
        type: 'reminder',
        title: 'Upcoming Deadline',
        message: userType === 'client'
          ? 'Design review is due tomorrow'
          : 'Design review deadline approaching for Demo Project',
        timestamp: '2024-10-05T18:00:00Z',
        read: false,
        priority: 'high',
        actionUrl: '/deliverables',
        projectId: 'demo-project'
      },
      {
        id: '5',
        type: 'system',
        title: 'Welcome to KAA Portal',
        message: userType === 'client'
          ? 'Welcome! Your project portal is now active'
          : 'New client Demo Project Address has joined',
        timestamp: '2024-10-05T10:00:00Z',
        read: true,
        priority: 'low',
        projectId: 'demo-project'
      }
    ];
    setNotifications(demoNotifications);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return '💬';
      case 'upload': return '📤';
      case 'status_update': return '📊';
      case 'reminder': return '⏰';
      case 'system': return '🔔';
      default: return '📢';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#747d8c';
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

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread': return !notification.read;
      case 'high': return notification.priority === 'high';
      default: return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.read).length;

  return (
    <div className="notification-system">
      {/* Header with Actions */}
      <div className="notification-header">
        <div className="header-title-section">
          <h1>🔔 Notifications</h1>
          <p className="notifications-subtitle">Stay updated with your project activity</p>
        </div>
        <div className="header-actions">
          {unreadCount > 0 && (
            <button 
              className="mark-all-read-btn"
              onClick={markAllAsRead}
            >
              Mark all read
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
          <button
            className={`filter-tab ${filter === 'high' ? 'active' : ''}`}
            onClick={() => setFilter('high')}
          >
            High Priority ({highPriorityCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="notifications-list">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read ? 'unread' : ''} priority-${notification.priority}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h4 className="notification-title">{notification.title}</h4>
                    <div className="notification-meta">
                      <span 
                        className="priority-indicator"
                        style={{ backgroundColor: getPriorityColor(notification.priority) }}
                      >
                        {notification.priority}
                      </span>
                      <span className="notification-time">{formatTime(notification.timestamp)}</span>
                    </div>
                  </div>
                  <p className="notification-message">{notification.message}</p>
                  {notification.sender && (
                    <div className="notification-sender">
                      From: {notification.sender}
                    </div>
                  )}
                </div>
                <div className="notification-actions">
                  {notification.actionUrl && (
                    <button className="action-btn">View</button>
                  )}
                  <button 
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
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
                  : filter === 'high'
                  ? "No high priority notifications at the moment."
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
