/**
 * Leads API Client
 * Handles lead-related API calls: create, list, update, convert.
 */

import { getAuthHeaders } from './authApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ============================================================================
// TYPES
// ============================================================================

export type BudgetRange =
  | 'under_5000'
  | '5000_15000'
  | '15000_50000'
  | '50000_100000'
  | 'over_100000';

export type Timeline =
  | 'under_3_months'
  | '3_6_months'
  | '6_12_months'
  | 'over_12_months'
  | 'flexible';

export type ProjectType =
  | 'consultation_only'
  | 'planting_plan'
  | 'full_landscape'
  | 'hardscape_focus'
  | 'outdoor_living'
  | 'complete_transformation'
  | 'major_renovation';

export type LeadStatus = 'NEW' | 'QUALIFIED' | 'NEEDS_REVIEW' | 'CLOSED';

export interface CreateLeadInput {
  email: string;
  projectAddress: string;
  budgetRange: BudgetRange;
  timeline: Timeline;
  projectType: ProjectType;
  hasSurvey: boolean;
  hasDrawings: boolean;
  notes?: string;
}

export interface Lead {
  id: string;
  email: string;
  projectAddress: string;
  budgetRange: BudgetRange;
  timeline: Timeline;
  projectType: ProjectType;
  hasSurvey: boolean;
  hasDrawings: boolean;
  status: LeadStatus;
  recommendedTier: number | null;
  tierOverride: number | null;
  tierOverrideReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TierRecommendation {
  tier: 1 | 2 | 3 | 4;
  confidence: 'low' | 'medium' | 'high';
  needsManualReview: boolean;
  reasons: string[];
  alternatives: number[];
  redFlags?: string[];
}

export interface CreateLeadResponse {
  lead: Lead;
  tierRecommendation: TierRecommendation;
}

export interface LeadsListResponse {
  leads: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadStats {
  total: number;
  new: number;
  qualified: number;
  needsReview: number;
  closed: number;
  byTier: Record<number, number>;
}

export interface UpdateLeadInput {
  status?: LeadStatus;
  tierOverride?: number;
  tierOverrideReason?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Create a new lead from intake form.
 */
export async function createLead(input: CreateLeadInput): Promise<CreateLeadResponse> {
  const response = await fetch(`${API_BASE_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to create lead');
  }

  return data.data;
}

/**
 * Get all leads (admin only).
 */
export async function getLeads(params?: {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  tier?: number;
  search?: string;
}): Promise<LeadsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.tier) searchParams.set('tier', String(params.tier));
  if (params?.search) searchParams.set('search', params.search);

  const url = `${API_BASE_URL}/leads?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to get leads');
  }

  return data.data;
}

/**
 * Get a single lead by ID.
 */
export async function getLead(leadId: string): Promise<Lead> {
  const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to get lead');
  }

  return data.data;
}

/**
 * Update a lead (admin only).
 */
export async function updateLead(leadId: string, input: UpdateLeadInput): Promise<Lead> {
  const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to update lead');
  }

  return data.data;
}

/**
 * Convert a lead to a client (admin only).
 */
export async function convertLead(leadId: string): Promise<{
  client: { id: string };
  project: { id: string };
  user: { id: string };
}> {
  const response = await fetch(`${API_BASE_URL}/leads/${leadId}/convert`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to convert lead');
  }

  return data.data;
}

/**
 * Get lead statistics (admin only).
 */
export async function getLeadStats(): Promise<LeadStats> {
  const response = await fetch(`${API_BASE_URL}/leads/stats/overview`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to get lead stats');
  }

  return data.data;
}

/**
 * Get budget range display label.
 */
export function getBudgetRangeLabel(range: BudgetRange): string {
  const labels: Record<BudgetRange, string> = {
    under_5000: 'Under $5,000',
    '5000_15000': '$5,000 - $15,000',
    '15000_50000': '$15,000 - $50,000',
    '50000_100000': '$50,000 - $100,000',
    over_100000: 'Over $100,000',
  };
  return labels[range] || range;
}

/**
 * Get timeline display label.
 */
export function getTimelineLabel(timeline: Timeline): string {
  const labels: Record<Timeline, string> = {
    under_3_months: 'Under 3 months',
    '3_6_months': '3-6 months',
    '6_12_months': '6-12 months',
    over_12_months: 'Over 12 months',
    flexible: 'Flexible',
  };
  return labels[timeline] || timeline;
}

/**
 * Get project type display label.
 */
export function getProjectTypeLabel(type: ProjectType): string {
  const labels: Record<ProjectType, string> = {
    consultation_only: 'Consultation Only',
    planting_plan: 'Planting Plan',
    full_landscape: 'Full Landscape Design',
    hardscape_focus: 'Hardscape Focus',
    outdoor_living: 'Outdoor Living Space',
    complete_transformation: 'Complete Transformation',
    major_renovation: 'Major Renovation',
  };
  return labels[type] || type;
}

/**
 * Get lead status display label.
 */
export function getLeadStatusLabel(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    NEW: 'New',
    QUALIFIED: 'Qualified',
    NEEDS_REVIEW: 'Needs Review',
    CLOSED: 'Closed',
  };
  return labels[status] || status;
}

/**
 * Get lead status color.
 */
export function getLeadStatusColor(status: LeadStatus): string {
  const colors: Record<LeadStatus, string> = {
    NEW: '#3b82f6',      // blue
    QUALIFIED: '#22c55e', // green
    NEEDS_REVIEW: '#f59e0b', // amber
    CLOSED: '#6b7280',   // gray
  };
  return colors[status] || '#6b7280';
}
