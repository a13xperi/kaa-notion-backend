// Portal hooks for client data fetching

export { useProjects, projectsKeys } from './useProjects';
export type { ProjectSummary, ProjectsResponse, UseProjectsOptions } from './useProjects';

export { useProject, projectKeys } from './useProject';
export type {
  ProjectDetail,
  ProjectResponse,
  UseProjectOptions,
  Milestone,
  Deliverable,
  Payment,
} from './useProject';

export { useMilestones, milestonesKeys } from './useMilestones';
export type { MilestonesResponse, UseMilestonesOptions } from './useMilestones';

export { useDeliverables, deliverablesKeys } from './useDeliverables';
export type { DeliverablesResponse, DownloadUrlResponse, UseDeliverablesOptions } from './useDeliverables';

export { useNotifications, useUnreadCount, useNotificationMutations, notificationKeys } from './useNotifications';
export type { Notification, NotificationsResponse, UseNotificationsOptions } from './useNotifications';

export { useMessages, useSendMessage, messageKeys } from './useMessages';
export type { Message, MessageSender, MessagesResponse, SendMessageData, UseMessagesOptions } from './useMessages';

export { useMilestoneRevisions, useProjectRevisions, useRevisionMutations, revisionKeys } from './useRevisions';
export type { RevisionRequest, CreateRevisionData, UpdateRevisionData, RevisionsResponse } from './useRevisions';

export {
  useAnalyticsSummary,
  useConversionMetrics,
  useRevenueMetrics,
  useLeadMetrics,
  useProjectMetrics,
  useMonthlyReport,
  analyticsKeys,
} from './useAnalytics';
export type {
  DashboardSummary,
  TierDistribution,
  ConversionMetrics,
  RevenueMetrics,
  LeadMetrics,
  ProjectMetrics,
  MonthlyReport,
  Period,
} from './useAnalytics';

export { usePushNotifications } from './usePushNotifications';
