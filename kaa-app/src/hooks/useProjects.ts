/**
 * useProjects Hook
 * Fetch user's projects with React Query.
 * Handles loading, error, and success states.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjects,
  fetchProject,
  updateProjectStatus,
  FetchProjectsParams,
} from '../api/portalApi';
import { ProjectSummary, ProjectDetail, ProjectStatus } from '../types/portal.types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params: FetchProjectsParams) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch all projects for the current user
 */
export function useProjects(params: FetchProjectsParams = {}) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => fetchProjects(params),
    select: (response) => ({
      projects: response.data,
      meta: response.meta,
      success: response.success,
    }),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}

/**
 * Fetch a single project by ID with all details
 */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId || ''),
    queryFn: () => fetchProject(projectId!),
    select: (response) => response.data,
    enabled: !!projectId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation to update project status
 */
export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: ProjectStatus }) =>
      updateProjectStatus(projectId, status),
    onSuccess: (data, variables) => {
      // Update the project in cache
      if (data.success && data.data) {
        queryClient.setQueryData(projectKeys.detail(variables.projectId), data);
      }
      // Invalidate project lists to refetch
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// ============================================================================
// PREFETCH HELPERS
// ============================================================================

/**
 * Prefetch a project's details
 */
export function usePrefetchProject() {
  const queryClient = useQueryClient();

  return (projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: projectKeys.detail(projectId),
      queryFn: () => fetchProject(projectId),
      staleTime: 30 * 1000,
    });
  };
}

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Get active projects (not delivered or closed)
 */
export function useActiveProjects(params: FetchProjectsParams = {}) {
  const query = useProjects(params);

  return {
    ...query,
    data: query.data
      ? {
          ...query.data,
          projects: query.data.projects.filter(
            (p) => p.status !== 'DELIVERED' && p.status !== 'CLOSED'
          ),
        }
      : undefined,
  };
}

/**
 * Get completed projects
 */
export function useCompletedProjects(params: FetchProjectsParams = {}) {
  const query = useProjects({ ...params, status: 'DELIVERED' });
  return query;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { ProjectSummary, ProjectDetail, FetchProjectsParams };
