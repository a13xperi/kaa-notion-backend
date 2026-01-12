import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface RevisionRequester {
  id: string;
  name: string;
  email: string;
}

export interface RevisionMilestone {
  id: string;
  name: string;
  project?: {
    id: string;
    name: string;
  };
}

export interface RevisionRequest {
  id: string;
  milestoneId: string;
  requestedById: string;
  requestedBy: RevisionRequester;
  milestone?: RevisionMilestone;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  response?: string;
  attachments: string[];
  createdAt: string;
  resolvedAt?: string;
}

export interface RevisionsResponse {
  success: boolean;
  data: RevisionRequest[];
  error?: {
    code: string;
    message: string;
  };
}

export interface CreateRevisionData {
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  attachments?: string[];
}

export interface UpdateRevisionData {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  response?: string;
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
async function fetchMilestoneRevisions(milestoneId: string): Promise<RevisionsResponse> {
  const response = await fetch(`${API_BASE}/milestones/${milestoneId}/revisions`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch revisions: ${response.status}`);
  }

  return response.json();
}

async function fetchProjectRevisions(projectId: string): Promise<RevisionsResponse> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/revisions`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch revisions: ${response.status}`);
  }

  return response.json();
}

async function createRevision(milestoneId: string, data: CreateRevisionData): Promise<RevisionRequest> {
  const response = await fetch(`${API_BASE}/milestones/${milestoneId}/revisions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to create revision request');
  }

  const result = await response.json();
  return result.data;
}

async function updateRevision(revisionId: string, data: UpdateRevisionData): Promise<RevisionRequest> {
  const response = await fetch(`${API_BASE}/revisions/${revisionId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to update revision');
  }

  const result = await response.json();
  return result.data;
}

// Query keys
export const revisionKeys = {
  all: ['revisions'] as const,
  milestone: (milestoneId: string) => [...revisionKeys.all, 'milestone', milestoneId] as const,
  project: (projectId: string) => [...revisionKeys.all, 'project', projectId] as const,
};

/**
 * Hook to fetch revisions for a milestone
 */
export function useMilestoneRevisions(milestoneId: string, enabled = true) {
  const query = useQuery<RevisionsResponse, Error>({
    queryKey: revisionKeys.milestone(milestoneId),
    queryFn: () => fetchMilestoneRevisions(milestoneId),
    enabled: enabled && !!milestoneId,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    revisions: query.data?.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch all revisions for a project
 */
export function useProjectRevisions(projectId: string, enabled = true) {
  const query = useQuery<RevisionsResponse, Error>({
    queryKey: revisionKeys.project(projectId),
    queryFn: () => fetchProjectRevisions(projectId),
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    revisions: query.data?.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook for revision mutations
 */
export function useRevisionMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: ({ milestoneId, data }: { milestoneId: string; data: CreateRevisionData }) =>
      createRevision(milestoneId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: revisionKeys.milestone(variables.milestoneId) });
      queryClient.invalidateQueries({ queryKey: revisionKeys.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ revisionId, data }: { revisionId: string; data: UpdateRevisionData }) =>
      updateRevision(revisionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: revisionKeys.all });
    },
  });

  return {
    createRevision: createMutation.mutate,
    createRevisionAsync: createMutation.mutateAsync,
    updateRevision: updateMutation.mutate,
    updateRevisionAsync: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
  };
}

export default useMilestoneRevisions;
