/**
 * Admin Types
 * TypeScript interfaces for admin dashboard components.
 */

import { ProjectStatus, MilestoneStatus } from './portal.types';

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
  leads: {
    total: number;
    byStatus: Record<string, number>;
    thisMonth: number;
    conversionRate: number;
  };
  projects: {
    total: number;
    active: number;
    byTier: Record<number, number>;
    byStatus: Record<string, number>;
  };
  clients: {
    total: number;
    active: number;
    byTier: Record<number, number>;
  };
  revenue: {
    total: number;
    thisMonth: number;
    byTier: Record<number, number>;
  };
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

// ============================================================================
// LEAD TYPES
// ============================================================================

export type LeadStatus = 'NEW' | 'QUALIFIED' | 'NEEDS_REVIEW' | 'CLOSED';

export interface Lead {
  id: string;
  email: string;
  name: string | null;
  projectAddress: string;
  budgetRange: string | null;
  timeline: string | null;
  projectType: string | null;
  hasSurvey: boolean;
  hasDrawings: boolean;
  recommendedTier: number;
  routingReason: string | null;
  status: LeadStatus;
  isConverted: boolean;
  client: { id: string; status: string } | null;
  projects: Array<{ id: string; name: string; status: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  status?: LeadStatus;
  tier?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// PROJECT TYPES (ADMIN)
// ============================================================================

export interface AdminProject {
  id: string;
  name: string;
  tier: number;
  status: ProjectStatus;
  paymentStatus: string;
  notionPageId: string | null;
  client: {
    id: string;
    email: string | null;
    projectAddress: string;
    status: string;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  totalPaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  tier?: number;
  paymentStatus?: string;
  search?: string;
}

// ============================================================================
// CLIENT TYPES (ADMIN)
// ============================================================================

export type ClientStatus = 'ONBOARDING' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';

export interface AdminClient {
  id: string;
  userId: string;
  email: string | null;
  tier: number;
  status: ClientStatus;
  projectAddress: string;
  lastLogin: string | null;
  stats: {
    projectCount: number;
    activeProjects: number;
    leadCount: number;
    totalPaid: number;
  };
  projects: Array<{
    id: string;
    name: string;
    status: string;
    tier: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFilters {
  status?: ClientStatus;
  tier?: number;
  search?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface AdminListResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminDashboardResponse {
  success: boolean;
  data: DashboardStats;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  QUALIFIED: 'Qualified',
  NEEDS_REVIEW: 'Needs Review',
  CLOSED: 'Closed',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: 'status-blue',
  QUALIFIED: 'status-green',
  NEEDS_REVIEW: 'status-yellow',
  CLOSED: 'status-gray',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ONBOARDING: 'Onboarding',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
};

export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  ONBOARDING: 'status-blue',
  ACTIVE: 'status-green',
  COMPLETED: 'status-purple',
  CLOSED: 'status-gray',
};

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

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

export function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateString);
}
