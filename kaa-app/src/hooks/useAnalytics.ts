import { useQuery } from '@tanstack/react-query';

// ========================================
// Types
// ========================================

export interface DashboardSummary {
  leads: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  conversions: {
    rate: number;
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  projects: {
    active: number;
    completed: number;
    thisMonth: number;
  };
}

export interface TierDistribution {
  tier: number;
  tierName: string;
  count: number;
  percentage: number;
  revenue: number;
}

export interface ConversionMetrics {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageTimeToConvert: number;
  byTier: {
    tier: number;
    leads: number;
    converted: number;
    rate: number;
  }[];
}

export interface RevenueMetrics {
  totalRevenue: number;
  averageOrderValue: number;
  revenueByTier: {
    tier: number;
    revenue: number;
    count: number;
  }[];
  revenueByMonth: {
    month: string;
    revenue: number;
    count: number;
  }[];
}

export interface LeadMetrics {
  totalLeads: number;
  byStatus: {
    status: string;
    count: number;
  }[];
  bySource: {
    source: string;
    count: number;
  }[];
  leadsByMonth: {
    month: string;
    count: number;
  }[];
}

export interface ProjectMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  byStatus: {
    status: string;
    count: number;
  }[];
  averageCompletionTime: number;
  projectsByMonth: {
    month: string;
    created: number;
    completed: number;
  }[];
}

export interface MonthlyReport {
  period: string;
  generatedAt: string;
  summary: DashboardSummary;
  conversions: ConversionMetrics;
  revenue: RevenueMetrics;
  tierDistribution: TierDistribution[];
  leads: LeadMetrics;
  projects: ProjectMetrics;
}

export type Period = 'week' | 'month' | 'quarter' | 'year' | 'all';

// ========================================
// API Functions
// ========================================

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function fetchAnalyticsSummary(): Promise<{
  summary: DashboardSummary;
  tierDistribution: TierDistribution[];
}> {
  const response = await fetch(`${API_BASE}/admin/analytics`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to fetch analytics');
  }

  const result = await response.json();
  return result.data;
}

async function fetchConversions(period: Period): Promise<ConversionMetrics> {
  const response = await fetch(`${API_BASE}/admin/analytics/conversions?period=${period}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to fetch conversion metrics');
  }

  const result = await response.json();
  return result.data;
}

async function fetchRevenue(period: Period): Promise<RevenueMetrics> {
  const response = await fetch(`${API_BASE}/admin/analytics/revenue?period=${period}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to fetch revenue metrics');
  }

  const result = await response.json();
  return result.data;
}

async function fetchLeads(period: Period): Promise<LeadMetrics> {
  const response = await fetch(`${API_BASE}/admin/analytics/leads?period=${period}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to fetch lead metrics');
  }

  const result = await response.json();
  return result.data;
}

async function fetchProjects(period: Period): Promise<ProjectMetrics> {
  const response = await fetch(`${API_BASE}/admin/analytics/projects?period=${period}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to fetch project metrics');
  }

  const result = await response.json();
  return result.data;
}

async function fetchMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  const response = await fetch(`${API_BASE}/admin/analytics/report/${year}/${month}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to fetch monthly report');
  }

  const result = await response.json();
  return result.data;
}

// ========================================
// Query Keys
// ========================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
  conversions: (period: Period) => [...analyticsKeys.all, 'conversions', period] as const,
  revenue: (period: Period) => [...analyticsKeys.all, 'revenue', period] as const,
  leads: (period: Period) => [...analyticsKeys.all, 'leads', period] as const,
  projects: (period: Period) => [...analyticsKeys.all, 'projects', period] as const,
  report: (year: number, month: number) => [...analyticsKeys.all, 'report', year, month] as const,
};

// ========================================
// Hooks
// ========================================

/**
 * Hook to fetch analytics dashboard summary
 */
export function useAnalyticsSummary() {
  const query = useQuery({
    queryKey: analyticsKeys.summary(),
    queryFn: fetchAnalyticsSummary,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    summary: query.data?.summary,
    tierDistribution: query.data?.tierDistribution ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch conversion metrics
 */
export function useConversionMetrics(period: Period = 'month') {
  const query = useQuery({
    queryKey: analyticsKeys.conversions(period),
    queryFn: () => fetchConversions(period),
    staleTime: 1000 * 60 * 5,
  });

  return {
    metrics: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch revenue metrics
 */
export function useRevenueMetrics(period: Period = 'year') {
  const query = useQuery({
    queryKey: analyticsKeys.revenue(period),
    queryFn: () => fetchRevenue(period),
    staleTime: 1000 * 60 * 5,
  });

  return {
    metrics: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch lead metrics
 */
export function useLeadMetrics(period: Period = 'year') {
  const query = useQuery({
    queryKey: analyticsKeys.leads(period),
    queryFn: () => fetchLeads(period),
    staleTime: 1000 * 60 * 5,
  });

  return {
    metrics: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch project metrics
 */
export function useProjectMetrics(period: Period = 'year') {
  const query = useQuery({
    queryKey: analyticsKeys.projects(period),
    queryFn: () => fetchProjects(period),
    staleTime: 1000 * 60 * 5,
  });

  return {
    metrics: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch monthly report
 */
export function useMonthlyReport(year: number, month: number, enabled = true) {
  const query = useQuery({
    queryKey: analyticsKeys.report(year, month),
    queryFn: () => fetchMonthlyReport(year, month),
    enabled,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  return {
    report: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useAnalyticsSummary;
