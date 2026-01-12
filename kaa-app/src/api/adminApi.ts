/**
 * Admin API Client
 * HTTP client for admin API endpoints (dashboard, leads, projects, clients, users).
 */

import { apiClient } from './client';
import {
  DashboardStats,
  Lead,
  LeadFilters,
  AdminProject,
  ProjectFilters,
  AdminClient,
  ClientFilters,
  AdminListResponse,
} from '../types/admin.types';

// ============================================================================
// TYPES
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  userType: 'SAGE_CLIENT' | 'KAA_CLIENT' | 'TEAM' | 'ADMIN';
  tier: number | null;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    status: string;
    projectCount: number;
  } | null;
}

export interface UserFilters {
  userType?: string;
  search?: string;
  hasClient?: boolean;
}

// ============================================================================
// DASHBOARD API
// ============================================================================

/**
 * Fetch dashboard stats
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiClient.get<DashboardStats>('/admin/dashboard');
}

// ============================================================================
// LEADS API
// ============================================================================

/**
 * Fetch all leads with filtering and pagination
 */
export async function fetchLeads(
  filters: LeadFilters = {},
  pagination: PaginationParams = {}
): Promise<AdminListResponse<Lead>> {
  const params: Record<string, string | number | boolean | undefined> = {
    ...pagination,
    ...filters,
  };

  const response = await apiClient.get<Lead[]>('/admin/leads', { params });

  // The API returns the full response structure, but apiClient.get extracts .data
  // We need to make a raw fetch to get meta
  const url = new URL('/admin/leads', process.env.REACT_APP_API_URL || 'http://localhost:3001/api');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const rawResponse = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!rawResponse.ok) {
    throw new Error('Failed to fetch leads');
  }

  return rawResponse.json();
}

// ============================================================================
// PROJECTS API (ADMIN)
// ============================================================================

/**
 * Fetch all projects with filtering and pagination (admin view)
 */
export async function fetchAdminProjects(
  filters: ProjectFilters = {},
  pagination: PaginationParams = {}
): Promise<AdminListResponse<AdminProject>> {
  const params: Record<string, string | number | boolean | undefined> = {
    ...pagination,
    ...filters,
  };

  const url = new URL('/admin/projects', process.env.REACT_APP_API_URL || 'http://localhost:3001/api');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const rawResponse = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!rawResponse.ok) {
    throw new Error('Failed to fetch projects');
  }

  return rawResponse.json();
}

// ============================================================================
// CLIENTS API (ADMIN)
// ============================================================================

/**
 * Fetch all clients with filtering and pagination (admin view)
 */
export async function fetchAdminClients(
  filters: ClientFilters = {},
  pagination: PaginationParams = {}
): Promise<AdminListResponse<AdminClient>> {
  const params: Record<string, string | number | boolean | undefined> = {
    ...pagination,
    ...filters,
  };

  const url = new URL('/admin/clients', process.env.REACT_APP_API_URL || 'http://localhost:3001/api');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const rawResponse = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!rawResponse.ok) {
    throw new Error('Failed to fetch clients');
  }

  return rawResponse.json();
}

// ============================================================================
// USERS API (ADMIN)
// ============================================================================

/**
 * Fetch all users with filtering and pagination (admin view)
 */
export async function fetchAdminUsers(
  filters: UserFilters = {},
  pagination: PaginationParams = {}
): Promise<AdminListResponse<AdminUser>> {
  const params: Record<string, string | number | boolean | undefined> = {
    ...pagination,
    ...filters,
  };

  const url = new URL('/admin/users', process.env.REACT_APP_API_URL || 'http://localhost:3001/api');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const rawResponse = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!rawResponse.ok) {
    throw new Error('Failed to fetch users');
  }

  return rawResponse.json();
}

// ============================================================================
// SYNC HEALTH API
// ============================================================================

export interface SyncHealthData {
  timestamp: string;
  projects: {
    postgres: {
      total: number;
      withNotionLink: number;
      withoutNotionLink: number;
    };
    notion: {
      total: number;
      linked: number;
      unlinked: number;
    };
    discrepancies: Array<{
      projectId: string;
      notionPageId: string;
      issues: Array<{
        field: string;
        postgres?: string;
        notion?: string;
        error?: string;
        message?: string;
        timeDiffSeconds?: number;
      }>;
    }>;
  };
  syncStatus: 'healthy' | 'mostly_synced' | 'needs_attention' | 'error' | 'unknown';
}

/**
 * Fetch sync health status between Postgres and Notion
 */
export async function fetchSyncHealth(): Promise<SyncHealthData> {
  return apiClient.get<SyncHealthData>('/admin/sync/health');
}

// ============================================================================
// EXPORTS
// ============================================================================

export const adminApi = {
  dashboard: {
    getStats: fetchDashboardStats,
  },
  leads: {
    list: fetchLeads,
  },
  projects: {
    list: fetchAdminProjects,
  },
  clients: {
    list: fetchAdminClients,
  },
  users: {
    list: fetchAdminUsers,
  },
  sync: {
    health: fetchSyncHealth,
  },
};

export default adminApi;
