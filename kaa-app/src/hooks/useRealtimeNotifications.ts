/**
 * Real-time Notifications Hook
 * WebSocket-based notifications for live updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType =
  | 'milestone_completed'
  | 'deliverable_uploaded'
  | 'deliverable_ready'
  | 'project_status_changed'
  | 'payment_received'
  | 'message_received'
  | 'appointment_reminder'
  | 'document_shared'
  | 'system_alert';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseRealtimeNotificationsOptions {
  userId: string;
  userType: 'client' | 'team' | 'admin';
  token: string;
  projectIds?: string[];
  onNotification?: (notification: Notification) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseRealtimeNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  status: ConnectionStatus;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  clearAll: () => void;
  subscribe: (projectIds: string[]) => void;
  unsubscribe: (projectIds: string[]) => void;
  reconnect: () => void;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3002';
const MAX_NOTIFICATIONS = 50;
const DEFAULT_RECONNECT_INTERVAL = 3000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions
): UseRealtimeNotificationsReturn {
  const {
    userId,
    userType,
    token,
    projectIds = [],
    onNotification,
    autoReconnect = true,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    const wsUrl = `${WS_URL}?userId=${userId}&userType=${userType}&token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setStatus('connected');
      reconnectAttemptsRef.current = 0;

      // Subscribe to projects
      if (projectIds.length > 0) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          payload: { projectIds },
        }));
      }

      // Start ping interval to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'notification') {
          const notification = message.payload as Notification;
          
          setNotifications((prev) => {
            // Avoid duplicates
            if (prev.some((n) => n.id === notification.id)) {
              return prev;
            }
            
            // Add new notification at the beginning
            const updated = [notification, ...prev];
            
            // Limit total notifications
            return updated.slice(0, MAX_NOTIFICATIONS);
          });

          // Call custom handler
          onNotification?.(notification);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = () => {
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Auto reconnect
      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval * reconnectAttemptsRef.current);
      }
    };

    wsRef.current = ws;
  }, [userId, userType, token, projectIds, onNotification, autoReconnect, reconnectInterval, maxReconnectAttempts]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  // Subscribe to projects
  const subscribe = useCallback((newProjectIds: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        payload: { projectIds: newProjectIds },
      }));
    }
  }, []);

  // Unsubscribe from projects
  const unsubscribe = useCallback((projectIdsToRemove: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        payload: { projectIds: projectIdsToRemove },
      }));
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  }, []);

  // Clear a notification
  const clearNotification = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.filter((n) => n.id !== notificationId)
    );
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    notifications,
    unreadCount,
    status,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    subscribe,
    unsubscribe,
    reconnect,
  };
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    milestone_completed: '🎉',
    deliverable_uploaded: '📦',
    deliverable_ready: '✅',
    project_status_changed: '🔄',
    payment_received: '💰',
    message_received: '💬',
    appointment_reminder: '📅',
    document_shared: '📄',
    system_alert: '⚠️',
  };
  return icons[type] || '🔔';
}

/**
 * Get notification color based on priority
 */
export function getNotificationColor(priority: Notification['priority']): string {
  const colors: Record<Notification['priority'], string> = {
    low: '#6B7280',
    normal: '#3B82F6',
    high: '#F59E0B',
    urgent: '#EF4444',
  };
  return colors[priority];
}

/**
 * Format notification timestamp
 */
export function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

export default useRealtimeNotifications;
