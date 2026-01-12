/**
 * Portal API Client
 * HTTP client for portal API endpoints (projects, milestones, deliverables).
 */

import {
  ProjectListResponse,
  ProjectDetail,
  ProjectMilestonesResponse,
  ProjectDeliverablesResponse,
  Milestone,
  Deliverable,
  DeliverableDownload,
  ApiResponse,
} from '../types/portal.types';
import { getAuthHeaders } from './authApi';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Reuse auth headers from shared auth client (JWT from storage).

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: { message: response.statusText },
    }));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }
  return response.json();
}

// ============================================================================
// PROJECTS API
// ============================================================================

export interface FetchProjectsParams {
  page?: number;
  limit?: number;
  status?: string;
  tier?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Fetch all projects for the current user
 */
export async function fetchProjects(params: FetchProjectsParams = {}): Promise<ProjectListResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.status) searchParams.set('status', params.status);
  if (params.tier) searchParams.set('tier', String(params.tier));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const url = `${API_BASE_URL}/projects?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<ProjectListResponse>(response);
}

/**
 * Fetch a single project by ID with all details
 */
export async function fetchProject(projectId: string): Promise<ApiResponse<ProjectDetail>> {
  const url = `${API_BASE_URL}/projects/${projectId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<ApiResponse<ProjectDetail>>(response);
}

/**
 * Update project status (admin only)
 */
export async function updateProjectStatus(
  projectId: string,
  status: string
): Promise<ApiResponse<ProjectDetail>> {
  const url = `${API_BASE_URL}/projects/${projectId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  return handleResponse<ApiResponse<ProjectDetail>>(response);
}

// ============================================================================
// MILESTONES API
// ============================================================================

/**
 * Fetch all milestones for a project
 */
export async function fetchMilestones(projectId: string): Promise<ProjectMilestonesResponse> {
  const url = `${API_BASE_URL}/projects/${projectId}/milestones`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<ProjectMilestonesResponse>(response);
}

/**
 * Fetch a single milestone by ID
 */
export async function fetchMilestone(milestoneId: string): Promise<ApiResponse<Milestone>> {
  const url = `${API_BASE_URL}/milestones/${milestoneId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<ApiResponse<Milestone>>(response);
}

/**
 * Update milestone status (admin only)
 */
export async function updateMilestoneStatus(
  milestoneId: string,
  data: { status?: string; dueDate?: string | null; completedAt?: string | null }
): Promise<ApiResponse<Milestone>> {
  const url = `${API_BASE_URL}/milestones/${milestoneId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse<ApiResponse<Milestone>>(response);
}

// ============================================================================
// DELIVERABLES API
// ============================================================================

export interface FetchDeliverablesParams {
  category?: string;
}

/**
 * Fetch all deliverables for a project
 */
export async function fetchDeliverables(
  projectId: string,
  params: FetchDeliverablesParams = {}
): Promise<ProjectDeliverablesResponse> {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set('category', params.category);

  const url = `${API_BASE_URL}/projects/${projectId}/deliverables?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<ProjectDeliverablesResponse>(response);
}

/**
 * Fetch a single deliverable by ID
 */
export async function fetchDeliverable(deliverableId: string): Promise<ApiResponse<Deliverable>> {
  const url = `${API_BASE_URL}/deliverables/${deliverableId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<ApiResponse<Deliverable>>(response);
}

/**
 * Get signed download URL for a deliverable
 */
export async function getDeliverableDownloadUrl(
  deliverableId: string
): Promise<ApiResponse<DeliverableDownload>> {
  const url = `${API_BASE_URL}/deliverables/${deliverableId}/download`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse<ApiResponse<DeliverableDownload>>(response);
}

/**
 * Upload a new deliverable (admin only)
 */
export async function uploadDeliverable(
  projectId: string,
  data: {
    name: string;
    category: string;
    description?: string;
    filePath: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
  }
): Promise<ApiResponse<Deliverable>> {
  const url = `${API_BASE_URL}/projects/${projectId}/deliverables`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse<ApiResponse<Deliverable>>(response);
}

/**
 * Delete a deliverable (admin only)
 */
export async function deleteDeliverable(deliverableId: string): Promise<ApiResponse<void>> {
  const url = `${API_BASE_URL}/deliverables/${deliverableId}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return handleResponse<ApiResponse<void>>(response);
}

// ============================================================================
// DOWNLOAD HELPER
// ============================================================================

/**
 * Download a deliverable file
 */
export async function downloadDeliverable(deliverableId: string): Promise<void> {
  const response = await getDeliverableDownloadUrl(deliverableId);
  
  if (response.success && response.data) {
    // Open download URL in new tab
    window.open(response.data.downloadUrl, '_blank');
  } else {
    throw new Error('Failed to get download URL');
  }
}
