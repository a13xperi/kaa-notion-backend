/**
 * API Configuration
 * Centralized API settings and base client.
 */

// API Base URL - defaults to localhost in development
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// API Endpoints
export const ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },
  
  // Leads
  LEADS: {
    BASE: '/leads',
    BY_ID: (id: string) => `/leads/${id}`,
    CONVERT: (id: string) => `/leads/${id}/convert`,
    STATS: '/leads/stats/overview',
  },
  
  // Projects
  PROJECTS: {
    BASE: '/projects',
    BY_ID: (id: string) => `/projects/${id}`,
    MILESTONES: (id: string) => `/projects/${id}/milestones`,
    DELIVERABLES: (id: string) => `/projects/${id}/deliverables`,
  },
  
  // Milestones
  MILESTONES: {
    BY_ID: (id: string) => `/milestones/${id}`,
  },
  
  // Deliverables
  DELIVERABLES: {
    BY_ID: (id: string) => `/deliverables/${id}`,
    DOWNLOAD: (id: string) => `/deliverables/${id}/download`,
  },
  
  // Checkout
  CHECKOUT: {
    CREATE_SESSION: '/checkout/create-session',
    SESSION: (id: string) => `/checkout/session/${id}`,
    PRICING: '/checkout/pricing',
  },
  
  // Admin
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    LEADS: '/admin/leads',
    PROJECTS: '/admin/projects',
    CLIENTS: '/admin/clients',
  },
  
  // Upload
  UPLOAD: {
    SINGLE: '/upload',
    MULTIPLE: '/upload/multiple',
    CONFIG: '/upload/config',
    DELETE: (id: string) => `/upload/${id}`,
  },
  
  // Notion Sync
  NOTION: {
    STATUS: '/notion/status',
    SYNC: '/notion/sync',
    RETRY: '/notion/retry',
    SYNC_PROJECT: (id: string) => `/notion/sync/project/${id}`,
    FAILED: '/notion/failed',
  },
} as const;

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get auth token from storage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Set auth token in storage
 */
export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

/**
 * Remove auth token from storage
 */
export function removeAuthToken(): void {
  localStorage.removeItem('auth_token');
}

/**
 * Build request headers
 */
export function buildHeaders(includeAuth = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

/**
 * Base API client with error handling
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  includeAuth = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...buildHeaders(includeAuth),
        ...options.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Parse response
    const data = await response.json().catch(() => ({}));
    
    // Handle errors
    if (!response.ok) {
      throw new ApiError(
        data.error?.message || data.message || 'Request failed',
        response.status,
        data.error?.code,
        data.error?.details
      );
    }
    
    // Return data (handle both { data: ... } and direct responses)
    return data.data !== undefined ? data.data : data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT');
      }
      throw new ApiError(error.message, 0, 'NETWORK_ERROR');
    }
    
    throw new ApiError('Unknown error', 0, 'UNKNOWN');
  }
}

/**
 * Convenience methods
 */
export const api = {
  get: <T>(endpoint: string, includeAuth = true) =>
    apiRequest<T>(endpoint, { method: 'GET' }, includeAuth),
    
  post: <T>(endpoint: string, body?: unknown, includeAuth = true) =>
    apiRequest<T>(
      endpoint,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      includeAuth
    ),
    
  patch: <T>(endpoint: string, body?: unknown, includeAuth = true) =>
    apiRequest<T>(
      endpoint,
      {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      },
      includeAuth
    ),
    
  put: <T>(endpoint: string, body?: unknown, includeAuth = true) =>
    apiRequest<T>(
      endpoint,
      {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      },
      includeAuth
    ),
    
  delete: <T>(endpoint: string, includeAuth = true) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }, includeAuth),
};

export default api;
