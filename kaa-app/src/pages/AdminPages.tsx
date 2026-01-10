/**
 * Admin Pages
 * Page components that wrap admin components with data fetching.
 * These will be connected to the API later.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { Skeleton, SkeletonStats } from '../components/common';

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
// Simplified placeholder - will be connected to API
// ============================================================================

export function LeadQueuePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Lead Management</h1>
      <div style={{ 
        background: '#f3f4f6', 
        borderRadius: '12px', 
        padding: '3rem', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Coming Soon</h2>
        <p style={{ color: '#6b7280' }}>Lead management will be available when connected to the API.</p>
      </div>
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
