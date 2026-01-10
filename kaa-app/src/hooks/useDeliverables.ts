/**
 * useDeliverables Hook
 * Fetch deliverables by project ID with React Query.
 * Handles loading, error, and success states.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDeliverables,
  fetchDeliverable,
  getDeliverableDownloadUrl,
  uploadDeliverable,
  deleteDeliverable,
  downloadDeliverable,
  FetchDeliverablesParams,
} from '../api/portalApi';
import { Deliverable, DeliverableCategory, DeliverableDownload } from '../types/portal.types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const deliverableKeys = {
  all: ['deliverables'] as const,
  lists: () => [...deliverableKeys.all, 'list'] as const,
  list: (projectId: string, params: FetchDeliverablesParams) =>
    [...deliverableKeys.lists(), projectId, params] as const,
  details: () => [...deliverableKeys.all, 'detail'] as const,
  detail: (id: string) => [...deliverableKeys.details(), id] as const,
  download: (id: string) => [...deliverableKeys.all, 'download', id] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch all deliverables for a project
 */
export function useDeliverables(
  projectId: string | undefined,
  params: FetchDeliverablesParams = {}
) {
  return useQuery({
    queryKey: deliverableKeys.list(projectId || '', params),
    queryFn: () => fetchDeliverables(projectId!, params),
    select: (response) => ({
      deliverables: response.data.deliverables,
      summary: response.data.summary,
      projectName: response.data.projectName,
      success: response.success,
    }),
    enabled: !!projectId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single deliverable by ID
 */
export function useDeliverable(deliverableId: string | undefined) {
  return useQuery({
    queryKey: deliverableKeys.detail(deliverableId || ''),
    queryFn: () => fetchDeliverable(deliverableId!),
    select: (response) => response.data,
    enabled: !!deliverableId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Get download URL for a deliverable
 */
export function useDeliverableDownloadUrl(deliverableId: string | undefined) {
  return useQuery({
    queryKey: deliverableKeys.download(deliverableId || ''),
    queryFn: () => getDeliverableDownloadUrl(deliverableId!),
    select: (response) => response.data,
    enabled: !!deliverableId,
    staleTime: 55 * 60 * 1000, // 55 minutes (URL expires in 60)
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Mutation to upload a new deliverable
 */
export function useUploadDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: {
        name: string;
        category: string;
        description?: string;
        filePath: string;
        fileUrl: string;
        fileSize: number;
        fileType: string;
      };
    }) => uploadDeliverable(projectId, data),
    onSuccess: (data, variables) => {
      // Invalidate the deliverables list for this project
      queryClient.invalidateQueries({
        queryKey: deliverableKeys.lists(),
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey.includes(variables.projectId),
      });
    },
  });
}

/**
 * Mutation to delete a deliverable
 */
export function useDeleteDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deliverableId: string) => deleteDeliverable(deliverableId),
    onSuccess: () => {
      // Invalidate all deliverable lists
      queryClient.invalidateQueries({ queryKey: deliverableKeys.lists() });
    },
  });
}

/**
 * Hook to trigger download of a deliverable
 */
export function useDownloadDeliverable() {
  return useMutation({
    mutationFn: (deliverableId: string) => downloadDeliverable(deliverableId),
  });
}

// ============================================================================
// DERIVED HOOKS
// ============================================================================

/**
 * Fetch deliverables filtered by category
 */
export function useDeliverablesByCategory(
  projectId: string | undefined,
  category: DeliverableCategory
) {
  return useDeliverables(projectId, { category });
}

/**
 * Get deliverable statistics for a project
 */
export function useDeliverableStats(projectId: string | undefined) {
  const { data, isLoading } = useDeliverables(projectId);

  if (!data) {
    return {
      isLoading,
      stats: null,
    };
  }

  return {
    isLoading: false,
    stats: {
      total: data.summary.total,
      totalSize: data.summary.totalSize,
      totalSizeFormatted: data.summary.totalSizeFormatted,
      byCategory: data.summary.byCategory,
      categories: Object.keys(data.summary.byCategory),
    },
  };
}

/**
 * Get recent deliverables for a project
 */
export function useRecentDeliverables(projectId: string | undefined, limit: number = 5) {
  const { data, isLoading, error } = useDeliverables(projectId);

  const recentDeliverables = data?.deliverables
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return {
    isLoading,
    error,
    deliverables: recentDeliverables || [],
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { Deliverable, DeliverableCategory, DeliverableDownload, FetchDeliverablesParams };
