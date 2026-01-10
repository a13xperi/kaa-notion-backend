import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface Notification {
  id: string;
  type: 'PROJECT_UPDATE' | 'MILESTONE_COMPLETED' | 'DELIVERABLE_READY' | 'MESSAGE_RECEIVED' | 'PAYMENT_RECEIVED' | 'REVISION_REQUESTED' | 'SYSTEM';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    total: number;
    unreadCount: number;
    hasMore: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

export interface UseNotificationsOptions {
  read?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Helper for auth header
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// Fetch functions
async function fetchNotifications(options: UseNotificationsOptions = {}): Promise<NotificationsResponse> {
  const { read, type, limit = 50, offset = 0 } = options;

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (read !== undefined) params.set('read', String(read));
  if (type) params.set('type', type);

  const response = await fetch(`${API_BASE}/notifications?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch notifications: ${response.status}`);
  }

  return response.json();
}

async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  const response = await fetch(`${API_BASE}/notifications/count`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch count: ${response.status}`);
  }

  return response.json();
}

async function markAsRead(notificationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to mark as read');
  }
}

async function markAllAsRead(): Promise<{ updated: number }> {
  const response = await fetch(`${API_BASE}/notifications/read-all`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to mark all as read');
  }

  const data = await response.json();
  return data.data;
}

async function deleteNotification(notificationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to delete notification');
  }
}

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (options: UseNotificationsOptions) => [...notificationKeys.lists(), options] as const,
  count: () => [...notificationKeys.all, 'count'] as const,
};

/**
 * Hook to fetch notifications with filtering
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { read, type, limit = 50, offset = 0, enabled = true } = options;

  const query = useQuery<NotificationsResponse, Error>({
    queryKey: notificationKeys.list({ read, type, limit, offset }),
    queryFn: () => fetchNotifications({ read, type, limit, offset }),
    enabled,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60, // Refresh every minute
  });

  return {
    notifications: query.data?.data.notifications ?? [],
    total: query.data?.data.total ?? 0,
    unreadCount: query.data?.data.unreadCount ?? 0,
    hasMore: query.data?.data.hasMore ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch unread notification count
 */
export function useUnreadCount() {
  const query = useQuery<UnreadCountResponse, Error>({
    queryKey: notificationKeys.count(),
    queryFn: fetchUnreadCount,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30, // Refresh every 30 seconds
  });

  return {
    unreadCount: query.data?.data.unreadCount ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Hook for notification mutations
 */
export function useNotificationMutations() {
  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  return {
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllAsReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default useNotifications;
