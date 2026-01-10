import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export interface Deliverable {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  category?: string | null;
  description?: string | null;
  uploadedAt: string;
  milestoneId?: string | null;
  milestoneName?: string | null;
  thumbnailUrl?: string | null;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  paidAt?: string | null;
}

export interface ProjectDetail {
  id: string;
  name: string;
  tier: number;
  tierName: string;
  status: string;
  progress: number;
  projectAddress?: string | null;
  createdAt: string;
  updatedAt: string;

  // Related data
  milestones: Milestone[];
  deliverables: Deliverable[];
  payments: Payment[];

  // Computed
  currentMilestone?: Milestone | null;
  completedMilestones: number;
  totalMilestones: number;
}

export interface ProjectResponse {
  success: boolean;
  data: ProjectDetail;
  error?: {
    code: string;
    message: string;
  };
}

export interface UseProjectOptions {
  projectId: string;
  enabled?: boolean;
  includeMilestones?: boolean;
  includeDeliverables?: boolean;
  includePayments?: boolean;
}

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Fetch function
async function fetchProject(projectId: string): Promise<ProjectResponse> {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
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
    if (response.status === 403) {
      throw new Error('You do not have permission to view this project');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch project: ${response.status}`);
  }

  return response.json();
}

// Update project status (admin only)
async function updateProjectStatus(
  projectId: string,
  status: string
): Promise<ProjectResponse> {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to update project: ${response.status}`);
  }

  return response.json();
}

// Query key factory
export const projectKeys = {
  all: ['project'] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

/**
 * Hook to fetch a single project with milestones, deliverables, and payments
 *
 * @example
 * ```tsx
 * const { project, isLoading, error } = useProject({ projectId: 'abc123' });
 *
 * if (isLoading) return <ProjectSkeleton />;
 * if (error) return <Error message={error.message} />;
 * if (!project) return <NotFound />;
 *
 * return <ProjectDetail project={project} />;
 * ```
 */
export function useProject(options: UseProjectOptions) {
  const { projectId, enabled = true } = options;
  const queryClient = useQueryClient();

  const query = useQuery<ProjectResponse, Error>({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => fetchProject(projectId),
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation for updating project status
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => updateProjectStatus(projectId, status),
    onSuccess: () => {
      // Invalidate project and projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
    },
  });

  const project = query.data?.data ?? null;

  return {
    // Data
    project,
    milestones: project?.milestones ?? [],
    deliverables: project?.deliverables ?? [],
    payments: project?.payments ?? [],
    currentMilestone: project?.currentMilestone ?? null,

    // Status
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,

    // Error
    error: query.error,

    // Actions
    refetch: query.refetch,
    updateStatus: updateStatusMutation.mutate,
    updateStatusAsync: updateStatusMutation.mutateAsync,

    // Mutation status
    isUpdating: updateStatusMutation.isPending,
    updateError: updateStatusMutation.error,

    // Raw query for advanced usage
    query,
  };
}

export default useProject;
