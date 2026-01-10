import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface MessageSender {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'ADMIN' | 'TEAM';
}

export interface Message {
  id: string;
  projectId: string;
  senderId: string;
  sender: MessageSender;
  content: string;
  attachments: string[];
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
    hasMore: boolean;
    nextCursor?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface SendMessageData {
  content: string;
  attachments?: string[];
  isInternal?: boolean;
}

export interface UseMessagesOptions {
  projectId: string;
  limit?: number;
  before?: string;
  includeInternal?: boolean;
  enabled?: boolean;
}

// API base URL
const API_BASE = process.env.REACT_APP_API_URL || '/api';

// Helper for auth header
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// Fetch functions
async function fetchMessages(options: UseMessagesOptions): Promise<MessagesResponse> {
  const { projectId, limit = 50, before, includeInternal } = options;

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (before) params.set('before', before);
  if (includeInternal) params.set('includeInternal', 'true');

  const response = await fetch(`${API_BASE}/projects/${projectId}/messages?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch messages: ${response.status}`);
  }

  return response.json();
}

async function sendMessage(projectId: string, data: SendMessageData): Promise<Message> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to send message');
  }

  const result = await response.json();
  return result.data;
}

// Query keys
export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (projectId: string, options?: Partial<UseMessagesOptions>) => [...messageKeys.lists(), projectId, options] as const,
};

/**
 * Hook to fetch messages for a project
 */
export function useMessages(options: UseMessagesOptions) {
  const { projectId, limit = 50, before, includeInternal, enabled = true } = options;

  const query = useQuery<MessagesResponse, Error>({
    queryKey: messageKeys.list(projectId, { limit, before, includeInternal }),
    queryFn: () => fetchMessages({ projectId, limit, before, includeInternal }),
    enabled: enabled && !!projectId,
    staleTime: 1000 * 10, // 10 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 30, // Refresh every 30 seconds
  });

  return {
    messages: query.data?.data.messages ?? [],
    hasMore: query.data?.data.hasMore ?? false,
    nextCursor: query.data?.data.nextCursor,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook for sending messages
 */
export function useSendMessage(projectId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: SendMessageData) => sendMessage(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.list(projectId) });
    },
  });

  return {
    sendMessage: mutation.mutate,
    sendMessageAsync: mutation.mutateAsync,
    isSending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

export default useMessages;
