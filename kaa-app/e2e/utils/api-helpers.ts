/**
 * API helper utilities for E2E tests
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: response.ok ? data.data : undefined,
      error: !response.ok ? data.message || 'Request failed' : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function createTestLead(leadData: {
  email: string;
  address: string;
  budgetRange?: string;
  timeline?: string;
  projectType?: string;
}) {
  return apiRequest('/api/leads', {
    method: 'POST',
    body: JSON.stringify({
      email: leadData.email,
      address: leadData.address,
      budgetRange: leadData.budgetRange || '5000-15000',
      timeline: leadData.timeline || '1-2_months',
      projectType: leadData.projectType || 'renovation',
      hasSurvey: false,
      hasDrawings: false,
    }),
  });
}

export async function registerUser(userData: {
  email: string;
  password: string;
  userType?: string;
}) {
  return apiRequest<{ token: string; user: { id: string; email: string } }>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        userType: userData.userType || 'SAGE_CLIENT',
      }),
    }
  );
}

export async function loginUser(credentials: { email: string; password: string }) {
  return apiRequest<{ token: string; user: { id: string; email: string } }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(credentials),
    }
  );
}

export async function getProjects(token: string) {
  return apiRequest('/api/projects', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function simulatePayment(data: { leadId: string; email: string }) {
  return apiRequest('/api/test/simulate-payment', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}
