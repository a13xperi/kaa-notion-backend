/**
 * useMilestones Hook
 * Fetch milestones by project ID with React Query.
 * Handles loading, error, and success states.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMilestones,
  fetchMilestone,
  updateMilestoneStatus,
} from '../api/portalApi';
import { Milestone, MilestoneStatus, MilestoneSummary } from '../types/portal.types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const milestoneKeys = {
  all: ['milestones'] as const,
  lists: () => [...milestoneKeys.all, 'list'] as const,
  list: (projectId: string) => [...milestoneKeys.lists(), projectId] as const,
  details: () => [...milestoneKeys.all, 'detail'] as const,
  detail: (id: string) => [...milestoneKeys.details(), id] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch all milestones for a project
 */
export function useMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: milestoneKeys.list(projectId || ''),
    queryFn: () => fetchMilestones(projectId!),
    select: (response) => ({
      milestones: response.data.milestones,
      summary: response.data.summary,
      projectName: response.data.projectName,
      tier: response.data.tier,
      success: response.success,
    }),
    enabled: !!projectId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single milestone by ID
 */
export function useMilestone(milestoneId: string | undefined) {
  return useQuery({
    queryKey: milestoneKeys.detail(milestoneId || ''),
    queryFn: () => fetchMilestone(milestoneId!),
    select: (response) => response.data,
    enabled: !!milestoneId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation to update milestone status
 */
export function useUpdateMilestoneStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      milestoneId,
      data,
    }: {
      milestoneId: string;
      data: { status?: MilestoneStatus; dueDate?: string | null; completedAt?: string | null };
    }) => updateMilestoneStatus(milestoneId, data),
    onSuccess: (data, variables) => {
      // Update the milestone in cache
      if (data.success && data.data) {
        queryClient.setQueryData(milestoneKeys.detail(variables.milestoneId), data);
        
        // Get the milestone to find its projectId
        const milestone = data.data;
        if (milestone.projectId) {
          // Invalidate the project's milestone list
          queryClient.invalidateQueries({ queryKey: milestoneKeys.list(milestone.projectId) });
          // Invalidate the project detail (progress changed)
          queryClient.invalidateQueries({ queryKey: ['projects', 'detail', milestone.projectId] });
        }
      }
    },
  });
}

// ============================================================================
// DERIVED HOOKS
// ============================================================================

/**
 * Get the current (in-progress) milestone for a project
 */
export function useCurrentMilestone(projectId: string | undefined) {
  const { data, isLoading } = useMilestones(projectId);

  const currentMilestone = data?.milestones.find((m) => m.status === 'IN_PROGRESS');
  const nextMilestone = data?.milestones.find((m) => m.status === 'PENDING');

  return {
    isLoading,
    currentMilestone: currentMilestone || nextMilestone,
    allMilestones: data?.milestones || [],
    summary: data?.summary,
  };
}

/**
 * Get overdue milestones for a project
 */
export function useOverdueMilestones(projectId: string | undefined) {
  const { data, isLoading } = useMilestones(projectId);

  const now = new Date();
  const overdue = data?.milestones.filter((m) => {
    if (m.status === 'COMPLETED') return false;
    if (!m.dueDate) return false;
    return new Date(m.dueDate) < now;
  }) || [];

  return {
    isLoading,
    overdueMilestones: overdue,
    count: overdue.length,
  };
}

/**
 * Get milestone progress for a project
 */
export function useMilestoneProgress(projectId: string | undefined) {
  const { data, isLoading } = useMilestones(projectId);

  if (!data) {
    return {
      isLoading,
      progress: null,
    };
  }

  return {
    isLoading: false,
    progress: {
      completed: data.summary.completed,
      inProgress: data.summary.inProgress,
      pending: data.summary.pending,
      total: data.summary.total,
      percentage: data.summary.percentage,
    },
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { Milestone, MilestoneStatus, MilestoneSummary };
