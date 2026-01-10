/**
 * useProjects Hook
 * Data fetching hook for projects using React Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ENDPOINTS, ApiError } from '../config/api';
import { ProjectSummary, ProjectDetail } from '../types/portal.types';

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: ProjectFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// Types
export interface ProjectFilters {
  status?: string;
  tier?: number;
  page?: number;
  limit?: number;
}

export interface ProjectsResponse {
  projects: ProjectSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetch user's projects list
 */
export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: async (): Promise<ProjectsResponse> => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.tier) params.append('tier', String(filters.tier));
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      
      const query = params.toString();
      const endpoint = query 
        ? `${ENDPOINTS.PROJECTS.BASE}?${query}`
        : ENDPOINTS.PROJECTS.BASE;
        
      return api.get<ProjectsResponse>(endpoint);
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Fetch single project with full details
 */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId || ''),
    queryFn: async (): Promise<ProjectDetail> => {
      if (!projectId) throw new Error('Project ID is required');
      return api.get<ProjectDetail>(ENDPOINTS.PROJECTS.BY_ID(projectId));
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
}

/**
 * Fetch project milestones
 */
export function useProjectMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId || ''), 'milestones'],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      return api.get(ENDPOINTS.PROJECTS.MILESTONES(projectId));
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
}

/**
 * Fetch project deliverables
 */
export function useProjectDeliverables(projectId: string | undefined) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId || ''), 'deliverables'],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      return api.get(ENDPOINTS.PROJECTS.DELIVERABLES(projectId));
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
}

/**
 * Update project status (admin only)
 */
export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      status 
    }: { 
      projectId: string; 
      status: string;
    }) => {
      return api.patch(ENDPOINTS.PROJECTS.BY_ID(projectId), { status });
    },
    onSuccess: (_, variables) => {
      // Invalidate project queries
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Hook for getting project progress helpers
 */
export function useProjectProgress(project: ProjectSummary | ProjectDetail | null) {
  if (!project) {
    return {
      percentage: 0,
      completed: 0,
      total: 0,
      isComplete: false,
      currentMilestone: null,
    };
  }
  
  const progress = 'progress' in project ? project.progress : null;
  
  return {
    percentage: progress?.percentage || 0,
    completed: progress?.completed || 0,
    total: progress?.total || 0,
    isComplete: progress?.percentage === 100,
    currentMilestone: progress?.currentMilestone || null,
  };
}

export default useProjects;
