import { useQuery, UseQueryOptions } from '@tanstack/react-query';

// Types
export interface ProjectSummary {
  id: string;
  name: string;
  tier: number;
  tierName: string;
  status: string;
  progress: number;
  currentMilestone?: string | null;
  completedMilestones: number;
  totalMilestones: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsResponse {
  success: boolean;
  data: {
    projects: ProjectSummary[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UseProjectsOptions {
  page?: number;
  limit?: number;
  status?: string;
  enabled?: boolean;
}

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Fetch function
async function fetchProjects(options: UseProjectsOptions = {}): Promise<ProjectsResponse> {
  const { page = 1, limit = 10, status } = options;

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (status) {
    params.set('status', status);
  }

  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE}/projects?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch projects: ${response.status}`);
  }

  return response.json();
}

// Query key factory
export const projectsKeys = {
  all: ['projects'] as const,
  lists: () => [...projectsKeys.all, 'list'] as const,
  list: (options: UseProjectsOptions) => [...projectsKeys.lists(), options] as const,
};

/**
 * Hook to fetch user's projects with pagination and filtering
 *
 * @example
 * ```tsx
 * const { projects, isLoading, error, refetch } = useProjects({ page: 1, limit: 10 });
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <Error message={error.message} />;
 *
 * return <ProjectList projects={projects} />;
 * ```
 */
export function useProjects(options: UseProjectsOptions = {}) {
  const { page = 1, limit = 10, status, enabled = true } = options;

  const query = useQuery<ProjectsResponse, Error>({
    queryKey: projectsKeys.list({ page, limit, status }),
    queryFn: () => fetchProjects({ page, limit, status }),
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
  });

  return {
    // Data
    projects: query.data?.data.projects ?? [],
    pagination: query.data?.data.pagination,

    // Status
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,

    // Error
    error: query.error,

    // Actions
    refetch: query.refetch,

    // Raw query for advanced usage
    query,
  };
}

export default useProjects;
