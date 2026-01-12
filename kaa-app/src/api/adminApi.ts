/**
 * Admin API Client
 * HTTP client for admin API endpoints (dashboard, leads, projects, clients, users, database explorer).
 */

import { apiClient } from './client';
import { getAuthHeaders } from './authApi';
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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ============================================================================
// TYPES - Pagination
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
// TYPES - Database Explorer
// ============================================================================

export interface DatabaseTable {
  name: string;
  displayName: string;
  recordCount: number;
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableSchema {
  name: string;
  displayName: string;
  columns: ColumnSchema[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  tableName?: string;
}

export interface TableRecordsResponse<T = Record<string, unknown>> {
  data: T[];
  meta: PaginationMeta;
}

export interface RecordQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
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
// API FUNCTIONS - Database Explorer
// ============================================================================

/**
 * Get list of all database tables with record counts.
 */
export async function getDatabaseTables(): Promise<DatabaseTable[]> {
  const response = await fetch(`${API_BASE_URL}/admin/database/tables`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to fetch database tables');
  }

  return data.data;
}

/**
 * Get schema for a specific table.
 */
export async function getTableSchema(tableName: string): Promise<TableSchema> {
  const response = await fetch(`${API_BASE_URL}/admin/database/tables/${tableName}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to fetch table schema');
  }

  return data.data;
}

/**
 * Get paginated records for a table.
 */
export async function getTableRecords<T = Record<string, unknown>>(
  tableName: string,
  params?: RecordQueryParams
): Promise<TableRecordsResponse<T>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params?.search) searchParams.set('search', params.search);

  const url = `${API_BASE_URL}/admin/database/tables/${tableName}/records?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || 'Failed to fetch table records');
  }

  return {
    data: result.data,
    meta: result.meta,
  };
}

/**
 * Get a single record by ID.
 */
export async function getTableRecord<T = Record<string, unknown>>(
  tableName: string,
  recordId: string
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}/admin/database/tables/${tableName}/records/${recordId}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to fetch record');
  }

  return data.data;
}

// ============================================================================
// HELPER FUNCTIONS - Database Explorer
// ============================================================================

/**
 * Format a value for display in the data grid.
 */
export function formatCellValue(value: unknown, columnType?: string): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (columnType === 'datetime' || value instanceof Date) {
    const date = new Date(value as string);
    return date.toLocaleString();
  }

  if (columnType === 'json' || typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  if (columnType === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 50) + '...';
  }

  return String(value);
}

/**
 * Get display color for column type.
 */
export function getColumnTypeColor(type: string): string {
  const colors: Record<string, string> = {
    uuid: '#8b5cf6',     // purple
    string: '#3b82f6',   // blue
    int: '#22c55e',      // green
    boolean: '#f59e0b',  // amber
    datetime: '#06b6d4', // cyan
    enum: '#ec4899',     // pink
    json: '#6b7280',     // gray
  };
  return colors[type] || '#6b7280';
}

/**
 * Get icon for table based on name.
 */
export function getTableIcon(tableName: string): string {
  const icons: Record<string, string> = {
    users: '👤',
    clients: '👥',
    projects: '📋',
    leads: '📥',
    payments: '💳',
    milestones: '🎯',
    deliverables: '📦',
    audit_log: '📝',
  };
  return icons[tableName] || '📄';
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
  database: {
    getTables: getDatabaseTables,
    getTableSchema: getTableSchema,
    getTableRecords: getTableRecords,
    getTableRecord: getTableRecord,
  },
};

export default adminApi;
