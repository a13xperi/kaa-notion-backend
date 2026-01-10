/**
 * useLeads Hook
 * Data fetching hook for leads using React Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ENDPOINTS, ApiError, API_BASE_URL, buildHeaders } from '../config/api';
import { IntakeFormData, TierRecommendation } from '../utils/tierRouter';

// Query keys
export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
  stats: () => [...leadKeys.all, 'stats'] as const,
};

// Types
export interface Lead {
  id: string;
  email: string;
  name: string | null;
  projectType: string | null;
  budgetRange: string | null;
  timeline: string | null;
  projectAddress: string | null;
  hasSurvey: boolean;
  hasDrawings: boolean;
  status: LeadStatus;
  recommendedTier: number;
  tierOverride: number | null;
  tierOverrideReason: string | null; // Backend maps overrideReason to this for compatibility
  overrideReason?: string | null; // Actual backend field name
  routingReason?: string | null;
  needsManualReview?: boolean; // Derived field, may not always be present
  isConverted: boolean;
  client: { id: string; status: string } | null;
  projects: Array<{ id: string; name: string; status: string }>;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus = 'NEW' | 'QUALIFIED' | 'NEEDS_REVIEW' | 'CONVERTED' | 'CLOSED';

export interface LeadFilters {
  status?: LeadStatus;
  tier?: number;
  page?: number;
  limit?: number;
  search?: string;
}

export interface LeadsResponse {
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
  byStatus: Record<LeadStatus, number>;
  byTier: Record<number, number>;
  conversionRate: number;
  thisMonth: number;
  lastMonth: number;
}

export interface CreateLeadData {
  email: string;
  name?: string;
  projectType?: string;
  budgetRange?: string;
  timeline?: string;
  projectAddress?: string;
  hasSurvey?: boolean;
  hasDrawings?: boolean;
  description?: string;
}

export interface CreateLeadResponse {
  lead: Lead;
  recommendation: TierRecommendation;
}

/**
 * Fetch leads list (admin only)
 * Backend returns: { success: true, data: Lead[], meta: { page, limit, total, totalPages } }
 */
export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: async (): Promise<LeadsResponse> => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.tier) params.append('tier', String(filters.tier));
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search);
      
      const query = params.toString();
      const endpoint = query 
        ? `${ENDPOINTS.LEADS.BASE}?${query}`
        : ENDPOINTS.LEADS.BASE;
      
      // Backend returns { success: true, data: [...], meta: {...} }
      // api.get extracts data.data, so we need to get the full response
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: buildHeaders(true),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new ApiError(
          error.error?.message || 'Failed to get leads',
          response.status,
          error.error?.code
        );
      }
      
      const result = await response.json();
      
      // Transform backend response { data: [...], meta: {...} } to { leads: [...], pagination: {...} }
      return {
        leads: result.data || [],
        pagination: {
          page: result.meta?.page || filters.page || 1,
          limit: result.meta?.limit || filters.limit || 20,
          total: result.meta?.total || 0,
          totalPages: result.meta?.totalPages || Math.ceil((result.meta?.total || 0) / (result.meta?.limit || 20)),
        },
      };
    },
    staleTime: 30000,
  });
}

/**
 * Fetch single lead details
 */
export function useLead(leadId: string | undefined) {
  return useQuery({
    queryKey: leadKeys.detail(leadId || ''),
    queryFn: async (): Promise<Lead> => {
      if (!leadId) throw new Error('Lead ID is required');
      return api.get<Lead>(ENDPOINTS.LEADS.BY_ID(leadId));
    },
    enabled: !!leadId,
    staleTime: 30000,
  });
}

/**
 * Fetch lead statistics (admin only)
 */
export function useLeadStats() {
  return useQuery({
    queryKey: leadKeys.stats(),
    queryFn: async (): Promise<LeadStats> => {
      return api.get<LeadStats>(ENDPOINTS.LEADS.STATS);
    },
    staleTime: 60000, // Stats are fresh for 1 minute
  });
}

/**
 * Create new lead from intake form
 */
export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateLeadData): Promise<CreateLeadResponse> => {
      return api.post<CreateLeadResponse>(ENDPOINTS.LEADS.BASE, data, false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
    },
  });
}

/**
 * Update lead status
 */
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      leadId, 
      status 
    }: { 
      leadId: string; 
      status: LeadStatus;
    }) => {
      return api.patch(ENDPOINTS.LEADS.BY_ID(leadId), { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
    },
  });
}

/**
 * Override lead tier (admin only)
 */
export function useOverrideLeadTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      leadId, 
      tier,
      reason,
    }: { 
      leadId: string; 
      tier: number;
      reason: string;
    }) => {
      return api.patch(ENDPOINTS.LEADS.BY_ID(leadId), { 
        tierOverride: tier,
        overrideReason: reason,
        // status will be automatically set to QUALIFIED by backend
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Convert lead to client after payment
 */
export function useConvertLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      leadId, 
      paymentIntentId,
    }: { 
      leadId: string; 
      paymentIntentId: string;
    }) => {
      return api.post(ENDPOINTS.LEADS.CONVERT(leadId), { paymentIntentId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
    },
  });
}

export default useLeads;
