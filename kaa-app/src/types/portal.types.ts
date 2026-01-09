/**
 * Portal Types
 * TypeScript interfaces for the client portal components.
 * These types match the API response structures from the backend.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ProjectStatus =
  | 'ONBOARDING'
  | 'IN_PROGRESS'
  | 'AWAITING_FEEDBACK'
  | 'REVISIONS'
  | 'DELIVERED'
  | 'CLOSED';

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type DeliverableCategory =
  | 'Document'
  | 'Photo'
  | 'Rendering'
  | 'FloorPlan'
  | 'Invoice'
  | 'Contract'
  | 'Other';

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface ProjectProgress {
  completed: number;
  total: number;
  percentage: number;
  inProgress?: number;
  currentMilestone?: {
    id: string;
    name: string;
    dueDate: string | null;
  } | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  tier: number;
  status: ProjectStatus;
  paymentStatus: string;
  progress: ProjectProgress;
  nextMilestone: {
    id: string;
    name: string;
    dueDate: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectClient {
  id: string;
  tier: number;
  status: string;
  projectAddress: string;
  email?: string;
}

export interface ProjectLead {
  id: string;
  email: string;
  name: string | null;
  projectType: string | null;
  budgetRange: string | null;
}

export interface ProjectPayments {
  totalPaid: number;
  currency: string;
  history: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
}

export interface ProjectDetail {
  id: string;
  name: string;
  tier: number;
  status: ProjectStatus;
  paymentStatus: string;
  notionPageId: string | null;
  createdAt: string;
  updatedAt: string;
  client: ProjectClient;
  lead: ProjectLead | null;
  progress: ProjectProgress;
  milestones: Milestone[];
  payments: ProjectPayments;
  deliverables: DeliverableSummary[];
}

// ============================================================================
// MILESTONE TYPES
// ============================================================================

export interface Milestone {
  id: string;
  projectId?: string;
  tier?: number;
  name: string;
  order: number;
  status: MilestoneStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt?: string;
  isOverdue?: boolean;
  daysUntilDue?: number | null;
}

export interface MilestoneWithNavigation extends Milestone {
  project: {
    id: string;
    name: string;
    tier: number;
    status: ProjectStatus;
  };
  navigation: {
    previous: { id: string; name: string; status: MilestoneStatus } | null;
    next: { id: string; name: string; status: MilestoneStatus } | null;
  };
}

export interface MilestoneSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  percentage: number;
}

// ============================================================================
// DELIVERABLE TYPES
// ============================================================================

export interface DeliverableSummary {
  id: string;
  name: string;
  category: DeliverableCategory | string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export interface Deliverable {
  id: string;
  projectId: string;
  name: string;
  category: DeliverableCategory | string;
  description: string | null;
  fileType: string;
  fileSize: number;
  fileSizeFormatted: string;
  createdAt: string;
  uploadedBy: {
    id: string;
    email: string | null;
  };
}

export interface DeliverableWithProject extends Deliverable {
  project: {
    id: string;
    name: string;
    tier: number;
  };
}

export interface DeliverableDownload {
  id: string;
  name: string;
  downloadUrl: string;
  expiresAt: string;
  fileType: string;
  fileSize: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProjectListResponse extends PaginatedResponse<ProjectSummary> {}

export interface ProjectDeliverablesResponse {
  success: boolean;
  data: {
    projectId: string;
    projectName: string;
    summary: {
      total: number;
      byCategory: Record<string, number>;
      totalSize: number;
      totalSizeFormatted: string;
    };
    deliverables: Deliverable[];
  };
}

export interface ProjectMilestonesResponse {
  success: boolean;
  data: {
    projectId: string;
    projectName: string;
    tier: number;
    summary: MilestoneSummary;
    milestones: Milestone[];
  };
}

// ============================================================================
// TIER TYPES
// ============================================================================

export interface TierInfo {
  id: number;
  name: string;
  tagline: string;
  touchLevel: 'no-touch' | 'low-touch' | 'hybrid' | 'high-touch';
  description: string;
  deliverables: Array<{
    name: string;
    included: boolean;
  }>;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type StatusColor = 'gray' | 'blue' | 'yellow' | 'green' | 'red' | 'purple';

export const STATUS_COLORS: Record<ProjectStatus | MilestoneStatus, StatusColor> = {
  ONBOARDING: 'blue',
  IN_PROGRESS: 'yellow',
  AWAITING_FEEDBACK: 'purple',
  REVISIONS: 'yellow',
  DELIVERED: 'green',
  CLOSED: 'gray',
  PENDING: 'gray',
  COMPLETED: 'green',
};

export const TIER_NAMES: Record<number, string> = {
  1: 'The Concept',
  2: 'The Builder',
  3: 'The Concierge',
  4: 'KAA White Glove',
};

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
