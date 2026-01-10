/**
 * useProject Hook
 * Fetch a single project with milestones and deliverables.
 * Combines project details with related data.
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { fetchProject, fetchMilestones, fetchDeliverables } from '../api/portalApi';
import { projectKeys } from './useProjects';
import { milestoneKeys } from './useMilestones';
import { deliverableKeys } from './useDeliverables';
import { ProjectDetail, Milestone, Deliverable } from '../types/portal.types';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectWithRelations extends ProjectDetail {
  milestonesData?: {
    milestones: Milestone[];
    summary: {
      total: number;
      completed: number;
      inProgress: number;
      pending: number;
      percentage: number;
    };
  };
  deliverablesData?: {
    deliverables: Deliverable[];
    summary: {
      total: number;
      byCategory: Record<string, number>;
      totalSize: number;
      totalSizeFormatted: string;
    };
  };
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch a project with all its related data (milestones, deliverables)
 * Uses parallel queries for better performance
 */
export function useProjectWithRelations(projectId: string | undefined) {
  const queries = useQueries({
    queries: [
      {
        queryKey: projectKeys.detail(projectId || ''),
        queryFn: () => fetchProject(projectId!),
        enabled: !!projectId,
        staleTime: 30 * 1000,
      },
      {
        queryKey: milestoneKeys.list(projectId || ''),
        queryFn: () => fetchMilestones(projectId!),
        enabled: !!projectId,
        staleTime: 30 * 1000,
      },
      {
        queryKey: deliverableKeys.list(projectId || '', {}),
        queryFn: () => fetchDeliverables(projectId!),
        enabled: !!projectId,
        staleTime: 30 * 1000,
      },
    ],
  });

  const [projectQuery, milestonesQuery, deliverablesQuery] = queries;

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.error)?.error;

  // Combine all data
  let data: ProjectWithRelations | undefined;

  if (projectQuery.data?.success && projectQuery.data.data) {
    data = {
      ...projectQuery.data.data,
      milestonesData: milestonesQuery.data?.success
        ? {
            milestones: milestonesQuery.data.data.milestones,
            summary: milestonesQuery.data.data.summary,
          }
        : undefined,
      deliverablesData: deliverablesQuery.data?.success
        ? {
            deliverables: deliverablesQuery.data.data.deliverables,
            summary: deliverablesQuery.data.data.summary,
          }
        : undefined,
    };
  }

  return {
    data,
    isLoading,
    isError,
    error,
    projectQuery,
    milestonesQuery,
    deliverablesQuery,
    refetch: () => {
      queries.forEach((q) => q.refetch());
    },
  };
}

/**
 * Fetch just the project basics (no relations)
 */
export function useProjectBasic(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId || ''),
    queryFn: () => fetchProject(projectId!),
    select: (response) => response.data,
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get project progress summary
 */
export function useProjectProgress(projectId: string | undefined) {
  const { data: project, isLoading } = useProjectBasic(projectId);

  if (isLoading || !project) {
    return {
      isLoading,
      progress: null,
    };
  }

  return {
    isLoading: false,
    progress: {
      percentage: project.progress.percentage,
      completed: project.progress.completed,
      total: project.progress.total,
      currentMilestone: project.progress.currentMilestone,
      status: project.status,
    },
  };
}

// Type is already exported at definition above
