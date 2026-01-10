import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from './useProject';

// Types
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

export interface DeliverablesResponse {
  success: boolean;
  data: {
    deliverables: Deliverable[];
    groupedByCategory?: Record<string, Deliverable[]>;
    groupedByMilestone?: Record<string, Deliverable[]>;
    totalCount: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface DownloadUrlResponse {
  success: boolean;
  data: {
    url: string;
    expiresAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UseDeliverablesOptions {
  projectId: string;
  enabled?: boolean;
  groupBy?: 'category' | 'milestone' | 'none';
}

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Fetch deliverables for a project
async function fetchDeliverables(projectId: string): Promise<DeliverablesResponse> {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE}/projects/${projectId}/deliverables`, {
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
    throw new Error(errorData.error?.message || `Failed to fetch deliverables: ${response.status}`);
  }

  return response.json();
}

// Get download URL for a deliverable
async function getDownloadUrl(deliverableId: string): Promise<DownloadUrlResponse> {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE}/deliverables/${deliverableId}/download`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Deliverable not found');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to get download URL: ${response.status}`);
  }

  return response.json();
}

// Query key factory
export const deliverablesKeys = {
  all: ['deliverables'] as const,
  lists: () => [...deliverablesKeys.all, 'list'] as const,
  list: (projectId: string) => [...deliverablesKeys.lists(), projectId] as const,
  download: (deliverableId: string) => [...deliverablesKeys.all, 'download', deliverableId] as const,
};

/**
 * Hook to fetch deliverables for a project with download functionality
 *
 * @example
 * ```tsx
 * const {
 *   deliverables,
 *   isLoading,
 *   downloadDeliverable,
 *   isDownloading
 * } = useDeliverables({ projectId: 'abc123' });
 *
 * if (isLoading) return <GridSkeleton />;
 *
 * return (
 *   <DeliverableList
 *     deliverables={deliverables}
 *     onDownload={(id) => downloadDeliverable(id)}
 *   />
 * );
 * ```
 */
export function useDeliverables(options: UseDeliverablesOptions) {
  const { projectId, enabled = true, groupBy = 'none' } = options;
  const queryClient = useQueryClient();

  const query = useQuery<DeliverablesResponse, Error>({
    queryKey: deliverablesKeys.list(projectId),
    queryFn: () => fetchDeliverables(projectId),
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Mutation for getting download URL and triggering download
  const downloadMutation = useMutation({
    mutationFn: async (deliverableId: string) => {
      const result = await getDownloadUrl(deliverableId);
      // Trigger download
      if (result.success && result.data.url) {
        const link = document.createElement('a');
        link.href = result.data.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return result;
    },
  });

  const data = query.data?.data;

  // Group deliverables based on groupBy option
  const groupedDeliverables = (() => {
    if (!data?.deliverables) return {};

    if (groupBy === 'none') {
      return { all: data.deliverables };
    }

    if (groupBy === 'category' && data.groupedByCategory) {
      return data.groupedByCategory;
    }

    if (groupBy === 'milestone' && data.groupedByMilestone) {
      return data.groupedByMilestone;
    }

    // Manual grouping if not provided by API
    const grouped: Record<string, Deliverable[]> = {};
    data.deliverables.forEach((d) => {
      const key = groupBy === 'category'
        ? (d.category || 'Uncategorized')
        : (d.milestoneName || 'Other');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(d);
    });
    return grouped;
  })();

  return {
    // Data
    deliverables: data?.deliverables ?? [],
    groupedDeliverables,
    totalCount: data?.totalCount ?? 0,

    // Status
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,

    // Error
    error: query.error,

    // Actions
    refetch: query.refetch,
    downloadDeliverable: downloadMutation.mutate,
    downloadDeliverableAsync: downloadMutation.mutateAsync,

    // Download status
    isDownloading: downloadMutation.isPending,
    downloadingId: downloadMutation.variables,
    downloadError: downloadMutation.error,

    // Raw query for advanced usage
    query,
  };
}

export default useDeliverables;
