/**
 * Admin API Client
 * Handles admin-related API calls for database explorer and admin operations.
 */

import { getAuthHeaders } from './authApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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
// HELPER FUNCTIONS
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
