/**
 * Portal Pages
 * Page components that wrap portal components with data fetching.
 * Uses React Query hooks with fallback to mock data.
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProjectDashboard from '../components/ProjectDashboard';
import ProjectDetail from '../components/ProjectDetail';
import { ProjectSummary, ProjectDetail as ProjectDetailType } from '../types/portal.types';
import { NotFoundPage, EmptyProjects, Skeleton, SkeletonCard } from '../components/common';
import { useProjects, useProject } from '../hooks';

// ============================================================================
// MOCK DATA (fallback when API unavailable)
// ============================================================================

const MOCK_PROJECTS: ProjectSummary[] = [
  {
    id: 'proj-1',
    name: 'Backyard Oasis Design',
    tier: 2,
    status: 'IN_PROGRESS',
    paymentStatus: 'PAID',
    progress: {
      completed: 2,
      total: 5,
      percentage: 40,
      inProgress: 1,
      currentMilestone: {
        id: 'm-3',
        name: 'Design Draft',
        dueDate: '2026-01-20',
      },
    },
    nextMilestone: {
      id: 'm-3',
      name: 'Design Draft',
      dueDate: '2026-01-20',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-09T00:00:00Z',
  },
];

function getMockProjectDetail(id: string): ProjectDetailType | null {
  const summary = MOCK_PROJECTS.find(p => p.id === id);
  if (!summary) return null;
  
  return {
    id: summary.id,
    name: summary.name,
    tier: summary.tier,
    status: summary.status,
    paymentStatus: summary.paymentStatus,
    notionPageId: null,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    client: {
      id: 'client-1',
      tier: summary.tier,
      status: 'ACTIVE',
      projectAddress: '123 Garden Lane, Landscape City',
      email: 'client@example.com',
    },
    lead: null,
    progress: summary.progress,
    milestones: [
      {
        id: 'm-1',
        name: 'Project Kickoff',
        order: 1,
        status: 'COMPLETED',
        dueDate: '2026-01-05',
        completedAt: '2026-01-05T10:00:00Z',
      },
      {
        id: 'm-2',
        name: 'Site Analysis',
        order: 2,
        status: 'COMPLETED',
        dueDate: '2026-01-10',
        completedAt: '2026-01-09T15:30:00Z',
      },
      {
        id: 'm-3',
        name: 'Design Draft',
        order: 3,
        status: 'IN_PROGRESS',
        dueDate: '2026-01-20',
        completedAt: null,
      },
      {
        id: 'm-4',
        name: 'Client Review',
        order: 4,
        status: 'PENDING',
        dueDate: '2026-01-25',
        completedAt: null,
      },
      {
        id: 'm-5',
        name: 'Final Delivery',
        order: 5,
        status: 'PENDING',
        dueDate: '2026-01-31',
        completedAt: null,
      },
    ],
    payments: {
      totalPaid: 1499,
      currency: 'USD',
      history: [
        {
          id: 'pay-1',
          amount: 1499,
          currency: 'USD',
          status: 'SUCCEEDED',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    },
    deliverables: [],
  };
}

// ============================================================================
// PROJECT DASHBOARD PAGE
// ============================================================================

export function ProjectsPage() {
  const navigate = useNavigate();
  
  // Try to fetch from API
  const { data, isLoading, error } = useProjects();
  
  // Use API data or fall back to mock data if API fails
  const projects = data?.projects || (error ? MOCK_PROJECTS : []);
  const showMockData = !!error;

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Skeleton height={40} width={200} />
        </div>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (projects.length === 0 && !showMockData) {
    return (
      <EmptyProjects 
        action={
          <button 
            onClick={() => navigate('/get-started')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Start a Project
          </button>
        }
      />
    );
  }

  return (
    <>
      {showMockData && (
        <div style={{ 
          background: '#fef3c7', 
          color: '#92400e',
          padding: '0.75rem 1rem', 
          marginBottom: '1rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
        }}>
          ⚠️ API unavailable - showing demo data
        </div>
      )}
      <ProjectDashboard
        projects={projects}
        onProjectClick={(id) => navigate(`/portal/projects/${id}`)}
        onCreateProject={() => navigate('/get-started')}
      />
    </>
  );
}

// ============================================================================
// PROJECT DETAIL PAGE
// ============================================================================

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  // Try to fetch from API
  const { data: project, isLoading, error } = useProject(projectId);
  
  // Fall back to mock data if API fails
  const displayProject = project || (error && projectId ? getMockProjectDetail(projectId) : null);
  const showMockData = !!error && !!displayProject;

  if (!projectId) {
    return <NotFoundPage title="Project Not Found" />;
  }

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Skeleton height={32} width={300} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <Skeleton height={200} />
        </div>
        <Skeleton height={100} />
      </div>
    );
  }

  if (!displayProject) {
    return (
      <NotFoundPage 
        title="Project Not Found"
        message="The project you're looking for doesn't exist or you don't have access to it."
      />
    );
  }

  return (
    <>
      {showMockData && (
        <div style={{ 
          background: '#fef3c7', 
          color: '#92400e',
          padding: '0.75rem 1rem', 
          marginBottom: '1rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
        }}>
          ⚠️ API unavailable - showing demo data
        </div>
      )}
      <ProjectDetail
        project={displayProject}
        onBack={() => navigate('/portal/projects')}
      />
    </>
  );
}

export default { ProjectsPage, ProjectDetailPage };
