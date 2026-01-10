import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from './useProject';
import { projectsKeys } from './useProjects';

// Types
export interface Milestone {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  order: number;
  dueDate?: string | null;
  completedAt?: string | null;
  description?: string | null;
}

export interface MilestonesResponse {
  success: boolean;
  data: {
    milestones: Milestone[];
    progress: {
      completed: number;
      total: number;
      percentage: number;
    };
    currentMilestone?: Milestone | null;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UpdateMilestoneResponse {
  success: boolean;
  data: Milestone;
  error?: {
    code: string;
    message: string;
  };
}

export interface UseMilestonesOptions {
  projectId: string;
  enabled?: boolean;
}

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Fetch milestones for a project
async function fetchMilestones(projectId: string): Promise<MilestonesResponse> {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE}/projects/${projectId}/milestones`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Project not found');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch milestones: ${response.status}`);
  }

  return response.json();
}

// Update milestone status (admin only)
async function updateMilestoneStatus(
  milestoneId: string,
  status: Milestone['status']
): Promise<UpdateMilestoneResponse> {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE}/milestones/${milestoneId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to update milestone: ${response.status}`);
  }

  return response.json();
}

// Query key factory
export const milestonesKeys = {
  all: ['milestones'] as const,
  lists: () => [...milestonesKeys.all, 'list'] as const,
  list: (projectId: string) => [...milestonesKeys.lists(), projectId] as const,
};

/**
 * Hook to fetch milestones for a project
 *
 * @example
 * ```tsx
 * const {
 *   milestones,
 *   progress,
 *   currentMilestone,
 *   isLoading,
 *   updateMilestone
 * } = useMilestones({ projectId: 'abc123' });
 *
 * if (isLoading) return <TimelineSkeleton />;
 *
 * return (
 *   <MilestoneTimeline
 *     milestones={milestones}
 *     onMilestoneClick={(m) => updateMilestone({ id: m.id, status: 'COMPLETED' })}
 *   />
 * );
 * ```
 */
export function useMilestones(options: UseMilestonesOptions) {
  const { projectId, enabled = true } = options;
  const queryClient = useQueryClient();

  const query = useQuery<MilestonesResponse, Error>({
    queryKey: milestonesKeys.list(projectId),
    queryFn: () => fetchMilestones(projectId),
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation for updating milestone status
  const updateMutation = useMutation({
    mutationFn: ({ milestoneId, status }: { milestoneId: string; status: Milestone['status'] }) =>
      updateMilestoneStatus(milestoneId, status),
    onSuccess: () => {
      // Invalidate milestones, project detail, and projects list
      queryClient.invalidateQueries({ queryKey: milestonesKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
    },
  });

  const data = query.data?.data;

  return {
    // Data
    milestones: data?.milestones ?? [],
    progress: data?.progress ?? { completed: 0, total: 0, percentage: 0 },
    currentMilestone: data?.currentMilestone ?? null,

    // Computed
    completedCount: data?.progress.completed ?? 0,
    totalCount: data?.progress.total ?? 0,
    progressPercentage: data?.progress.percentage ?? 0,

    // Status
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,

    // Error
    error: query.error,

    // Actions
    refetch: query.refetch,
    updateMilestone: updateMutation.mutate,
    updateMilestoneAsync: updateMutation.mutateAsync,

    // Mutation status
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    // Raw query for advanced usage
    query,
  };
}

export default useMilestones;
