/**
 * Admin Pages
 * Page components that wrap admin components with data fetching.
 * These will be connected to the API later.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { Skeleton, SkeletonStats } from '../components/common';
import { LeadQueue } from '../components/admin/LeadQueue';
import { LeadReviewPanel } from '../components/admin/LeadReviewPanel';
import { TierOverrideModal } from '../components/admin/TierOverrideModal';
import { useLeads, useUpdateLeadStatus, useOverrideLeadTier, useConvertLead } from '../hooks/useLeads';
import type { LeadFilters, LeadStatus } from '../hooks/useLeads';
import { Lead } from '../types/admin.types';

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_STATS = {
  leads: {
    total: 45,
    byStatus: { NEW: 12, QUALIFIED: 18, NEEDS_REVIEW: 5, CLOSED: 10 },
    thisMonth: 8,
    conversionRate: 33.3,
  },
  projects: {
    total: 28,
    active: 15,
    byTier: { 1: 8, 2: 12, 3: 6, 4: 2 },
    byStatus: { IN_PROGRESS: 15, COMPLETED: 10, ONBOARDING: 3 },
  },
  clients: {
    total: 22,
    active: 18,
    byTier: { 1: 8, 2: 9, 3: 4, 4: 1 },
  },
  revenue: {
    total: 125000,
    thisMonth: 18500,
    byTier: { 1: 15000, 2: 45000, 3: 55000, 4: 10000 },
  },
  recentActivity: [
    {
      id: 'act-1',
      type: 'lead_created',
      description: 'New lead from John Smith',
      timestamp: '2026-01-09T10:30:00Z',
    },
    {
      id: 'act-2',
      type: 'project_updated',
      description: 'Backyard Oasis milestone completed',
      timestamp: '2026-01-09T09:15:00Z',
    },
    {
      id: 'act-3',
      type: 'payment_received',
      description: 'Payment received from Jane Doe',
      timestamp: '2026-01-08T16:45:00Z',
    },
  ],
};


// ============================================================================
// ADMIN DASHBOARD PAGE
// ============================================================================

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState(MOCK_STATS);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Skeleton height={40} width={250} />
        </div>
        <SkeletonStats count={4} />
      </div>
    );
  }

  const handleNavigate = (section: 'leads' | 'projects' | 'clients') => {
    navigate(`/admin/${section}`);
  };

  return (
    <AdminDashboard
      stats={stats}
      onNavigate={handleNavigate}
    />
  );
}

// ============================================================================
// LEAD QUEUE PAGE
// Lead management queue with filters, tier override, and conversion actions
// ============================================================================

export function LeadQueuePage() {
  const [filters, setFilters] = React.useState<LeadFilters>({
    status: 'NEEDS_REVIEW', // Default to manual review queue
    page: 1,
    limit: 20,
  });
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [showReviewPanel, setShowReviewPanel] = React.useState(false);
  const [showTierModal, setShowTierModal] = React.useState(false);
  const [leadForTierOverride, setLeadForTierOverride] = React.useState<Lead | null>(null);

  const { data: leadsData, isLoading, error } = useLeads(filters);
  const updateStatusMutation = useUpdateLeadStatus();
  const overrideTierMutation = useOverrideLeadTier();
  const convertLeadMutation = useConvertLead();

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowReviewPanel(true);
  };

  const handleOverrideTier = (lead: Lead) => {
    setLeadForTierOverride(lead);
    setShowTierModal(true);
    // Close review panel if open
    if (showReviewPanel) {
      setShowReviewPanel(false);
    }
  };

  const handleTierOverrideConfirm = async (leadId: string, newTier: number, reason: string) => {
    try {
      await overrideTierMutation.mutateAsync({
        leadId,
        tier: newTier,
        reason,
      });
      setShowTierModal(false);
      setLeadForTierOverride(null);
    } catch (err) {
      console.error('Failed to override tier:', err);
    }
  };

  const handleConvertLead = async (lead: Lead) => {
    if (!lead.id) return;
    
    try {
      await convertLeadMutation.mutateAsync({
        leadId: lead.id,
        paymentIntentId: '', // Manual conversion - no payment ID
      });
    } catch (err) {
      console.error('Failed to convert lead:', err);
    }
  };

  const handleFilterChange = (newFilters: LeadFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleCloseReviewPanel = () => {
    setShowReviewPanel(false);
    setSelectedLead(null);
  };

  // The backend returns { success: true, data: [...leads], meta: {...} }
  // But useLeads expects { leads: [...], pagination: {...} }
  // We need to handle both response formats or fix useLeads
  // For now, let's use leadsApi directly to get the correct response format
  
  // If leadsData is undefined or doesn't match expected format, use empty array
  const leadsArray = Array.isArray(leadsData) 
    ? leadsData 
    : leadsData?.leads 
    ? leadsData.leads 
    : [];

  // Convert hook leads to admin leads format
  // Map status from backend (Prisma enum) to admin LeadStatus type
  const mapLeadStatus = (status: string): LeadStatus => {
    const statusMap: Record<string, LeadStatus> = {
      'NEW': 'NEW',
      'QUALIFIED': 'QUALIFIED',
      'NEEDS_REVIEW': 'NEEDS_REVIEW',
      'CONVERTED': 'CLOSED', // Converted leads show as CLOSED in admin queue
      'CLOSED': 'CLOSED',
    };
    return statusMap[status] || 'NEW';
  };

  const leads: Lead[] = leadsArray.map((lead: any) => {
    const mappedStatus = mapLeadStatus(lead.status || 'NEW');
    return {
      id: lead.id,
      email: lead.email,
      name: lead.name || null,
      projectAddress: lead.projectAddress || '',
      budgetRange: lead.budgetRange || null,
      timeline: lead.timeline || null,
      projectType: lead.projectType || null,
      hasSurvey: lead.hasSurvey || false,
      hasDrawings: lead.hasDrawings || false,
      recommendedTier: lead.recommendedTier || 1,
      routingReason: lead.routingReason || null,
      status: mappedStatus,
      isConverted: lead.isConverted || lead.clientId !== null || lead.status === 'CONVERTED',
      client: lead.client || null,
      projects: lead.projects || [],
      createdAt: lead.createdAt || new Date().toISOString(),
      updatedAt: lead.updatedAt || new Date().toISOString(),
    };
  });

  // Extract pagination from response meta or pagination field
  const meta = (leadsData as any)?.meta || (leadsData as any)?.pagination;
  const pagination = meta ? {
    page: meta.page || 1,
    totalPages: meta.totalPages || Math.ceil((meta.total || 0) / (meta.limit || 20)),
    total: meta.total || 0,
    onPageChange: handlePageChange,
  } : undefined;

  return (
    <div style={{ padding: '2rem' }}>
      <LeadQueue
        leads={leads}
        isLoading={isLoading}
        filters={filters}
        onFilterChange={handleFilterChange}
        onViewLead={handleViewLead}
        onOverrideTier={handleOverrideTier}
        onConvertLead={handleConvertLead}
        pagination={pagination}
      />

      {showReviewPanel && selectedLead && (
        <LeadReviewPanel
          lead={selectedLead}
          isOpen={showReviewPanel}
          onClose={handleCloseReviewPanel}
          onOverrideTier={() => {
            handleOverrideTier(selectedLead);
          }}
          onConvert={() => handleConvertLead(selectedLead)}
          onUpdateStatus={(status: string) => {
            if (selectedLead.id) {
              updateStatusMutation.mutate({
                leadId: selectedLead.id,
                status: status as LeadStatus,
              });
            }
          }}
        />
      )}

      {showTierModal && leadForTierOverride && (
        <TierOverrideModal
          lead={leadForTierOverride}
          isOpen={showTierModal}
          onClose={() => {
            setShowTierModal(false);
            setLeadForTierOverride(null);
          }}
          onConfirm={handleTierOverrideConfirm}
          isSubmitting={overrideTierMutation.isPending}
        />
      )}

      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '8px',
          marginTop: '1rem',
        }}>
          Error loading leads: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PROJECTS TABLE PAGE
// Simplified placeholder - will be connected to API
// ============================================================================

export function ProjectsTablePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Project Management</h1>
      <div style={{ 
        background: '#f3f4f6', 
        borderRadius: '12px', 
        padding: '3rem', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Coming Soon</h2>
        <p style={{ color: '#6b7280' }}>Project management will be available when connected to the API.</p>
      </div>
    </div>
  );
}

// ============================================================================
// CLIENTS TABLE PAGE
// Simplified placeholder - will be connected to API
// ============================================================================

export function ClientsTablePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Client Management</h1>
      <div style={{ 
        background: '#f3f4f6', 
        borderRadius: '12px', 
        padding: '3rem', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Coming Soon</h2>
        <p style={{ color: '#6b7280' }}>Client management will be available when connected to the API.</p>
      </div>
    </div>
  );
}

export default { AdminDashboardPage, LeadQueuePage, ProjectsTablePage, ClientsTablePage };
