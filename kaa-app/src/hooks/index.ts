/**
 * Hooks Index
 * Central export point for all custom hooks.
 */

// Projects hooks
export {
  useProjects,
  useProject,
  useUpdateProjectStatus,
  usePrefetchProject,
  useActiveProjects,
  useCompletedProjects,
  projectKeys,
} from './useProjects';

// Project with relations hook
export {
  useProjectWithRelations,
  useProjectBasic,
  useProjectProgress,
} from './useProject';

// Milestones hooks
export {
  useMilestones,
  useMilestone,
  useUpdateMilestoneStatus,
  useCurrentMilestone,
  useOverdueMilestones,
  useMilestoneProgress,
  milestoneKeys,
} from './useMilestones';

// Deliverables hooks
export {
  useDeliverables,
  useDeliverable,
  useDeliverableDownloadUrl,
  useUploadDeliverable,
  useDeleteDeliverable,
  useDownloadDeliverable,
  useDeliverablesByCategory,
  useDeliverableStats,
  useRecentDeliverables,
  deliverableKeys,
} from './useDeliverables';

// Type exports
export type { ProjectWithRelations } from './useProject';
export type { FetchProjectsParams } from './useProjects';
export type { FetchDeliverablesParams } from './useDeliverables';
