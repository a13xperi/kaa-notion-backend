/**
 * Typed API Client
 * A type-safe HTTP client for the SAGE API.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  onError?: (error: ApiError) => void;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================

export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.REACT_APP_API_URL || '/api',
      getToken: config.getToken || (() => {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
      }),
      onUnauthorized: config.onUnauthorized,
      onError: config.onError,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private getHeaders(options?: RequestOptions): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...options?.headers,
    });

    const token = this.config.getToken?.();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, this.config.baseUrl.startsWith('http') 
      ? this.config.baseUrl 
      : window.location.origin + this.config.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    if (!response.ok) {
      if (response.status === 401) {
        this.config.onUnauthorized?.();
      }

      let error: ApiError;
      
      if (isJson) {
        const data = await response.json();
        error = new ApiError(
          response.status,
          data.error?.code || 'UNKNOWN_ERROR',
          data.error?.message || response.statusText,
          data.error?.details
        );
      } else {
        error = new ApiError(
          response.status,
          'UNKNOWN_ERROR',
          response.statusText
        );
      }

      this.config.onError?.(error);
      throw error;
    }

    if (!isJson) {
      return {} as T;
    }

    const data = await response.json();
    return data.data !== undefined ? data.data : data;
  }

  // --------------------------------------------------------------------------
  // PUBLIC METHODS
  // --------------------------------------------------------------------------

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(options),
      signal: options?.signal,
    });
    return this.handleResponse<T>(response);
  }

  async post<T, B = unknown>(path: string, body?: B, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(options),
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });
    return this.handleResponse<T>(response);
  }

  async put<T, B = unknown>(path: string, body?: B, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(options),
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T, B = unknown>(path: string, body?: B, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(options),
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(options),
      signal: options?.signal,
    });
    return this.handleResponse<T>(response);
  }
}

// ============================================================================
// DEFAULT CLIENT INSTANCE
// ============================================================================

export const apiClient = new ApiClient();

// ============================================================================
// TYPED API METHODS
// ============================================================================

// Auth
export const authApi = {
  login: (email: string, password: string, rememberMe = false) =>
    apiClient.post<{
      user: { id: string; email: string; userType: string; tier: number | null };
      token: string;
      refreshToken?: string;
      expiresIn: string;
    }>('/auth/login', { email, password, rememberMe }),

  register: (email: string, password: string) =>
    apiClient.post<{
      user: { id: string; email: string; userType: string; tier: number | null };
      token: string;
      refreshToken?: string;
      expiresIn: string;
    }>('/auth/register', { email, password }),

  refresh: (refreshToken: string) =>
    apiClient.post<{
      token: string;
      refreshToken: string;
      expiresIn: string;
    }>('/auth/refresh', { refreshToken }),

  me: () =>
    apiClient.get<{
      id: string;
      email: string;
      userType: string;
      tier: number | null;
      client?: { id: string; status: string } | null;
      projects?: Array<{ id: string; name: string; status: string; tier: number }>;
    }>('/auth/me'),
};

// Leads
export const leadsApi = {
  create: (data: {
    email: string;
    name?: string;
    projectAddress: string;
    budgetRange?: string;
    timeline?: string;
    projectType?: string;
    hasSurvey?: boolean;
    hasDrawings?: boolean;
  }) =>
    apiClient.post<{
      lead: { id: string; email: string; recommendedTier: number };
      recommendation: { tier: number; reason: string; confidence: string };
      isExisting: boolean;
    }>('/leads', data),

  list: (params?: { page?: number; limit?: number; status?: string; tier?: number }) =>
    apiClient.get<Array<{
      id: string;
      email: string;
      name?: string;
      projectAddress: string;
      recommendedTier: number;
      status: string;
      createdAt: string;
    }>>('/leads', { params }),

  get: (id: string) =>
    apiClient.get<{
      id: string;
      email: string;
      name?: string;
      projectAddress: string;
      recommendedTier: number;
      status: string;
      createdAt: string;
    }>(`/leads/${id}`),
};

// Projects
export const projectsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<Array<{
      id: string;
      name: string;
      status: string;
      tier: number;
      createdAt: string;
    }>>('/projects', { params }),

  get: (id: string) =>
    apiClient.get<{
      id: string;
      name: string;
      status: string;
      tier: number;
      milestones: Array<{ id: string; name: string; status: string; order: number }>;
      deliverables: Array<{ id: string; name: string; fileUrl: string }>;
    }>(`/projects/${id}`),

  update: (id: string, data: { status?: string }) =>
    apiClient.patch<{ id: string; status: string }>(`/projects/${id}`, data),
};

// Checkout
export const checkoutApi = {
  createSession: (data: {
    tier: number;
    leadId?: string;
    email?: string;
    successUrl?: string;
    cancelUrl?: string;
  }) =>
    apiClient.post<{ url: string; sessionId: string }>('/checkout/create-session', data),

  getPricing: () =>
    apiClient.get<Array<{
      tier: number;
      name: string;
      price: number;
      currency: string;
      description: string;
      features: string[];
      popular?: boolean;
    }>>('/checkout/pricing'),
};

export default apiClient;
