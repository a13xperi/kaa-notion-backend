/**
 * SAGE MVP Platform - Main Application
 * 
 * Uses React Router for navigation between all platform pages.
 * Supports both the new SAGE MVP flow and legacy KAA components.
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, RequireAuth, RequireAdmin, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/common';
import { DarkModeProvider } from './contexts/DarkModeContext';
import pwaManager from './utils/pwa';
import logger from './utils/logger';
import './App.css';
import './routes/pages.css';

// Layout
import { AppLayout } from './components/layout';

// Public Pages
import LandingPage from './components/LandingPage';
import { LoginForm, RegisterForm } from './components/auth';
import { PricingPage } from './components/pricing';
import { CheckoutSuccess, CheckoutCancel } from './components/checkout';
import { IntakeForm } from './components/intake/IntakeForm';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

// Portal Pages
import { ProjectsPage, ProjectDetailPage } from './pages';
import { UserProfile } from './components/profile';
import { DashboardWelcome } from './components/dashboard';
import ClientHub from './components/ClientHub';
import MessagingSystem from './components/MessagingSystem';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import DesignIdeas from './components/DesignIdeas';
import { NotificationCenter } from './components/NotificationCenter';
import NotificationSettings from './components/NotificationSettings';
import Deliverables from './components/Deliverables';
import ClientDocuments from './components/ClientDocuments';
import DocumentUpload from './components/DocumentUpload';
import NotificationSystem from './components/NotificationSystem';
import NotionWorkspaceViewer from './components/NotionWorkspaceViewer';
import MilestoneTimeline from './components/MilestoneTimeline';
import CommunityFeed from './components/CommunityFeed';
import Resources from './components/Resources';
import { Milestone, MilestoneSummary } from './types/portal.types';

// Admin Pages
import {
  AdminDashboardPage,
  UsersPage,
  LeadQueuePage,
  ProjectsTablePage,
  ClientsTablePage,
} from './pages';

// Common
import { NotFoundPage } from './components/common';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPrompt from './components/InstallPrompt';

// Legacy Components (for backward compatibility)
import FeatureDemo from './components/FeatureDemo';
import ErrorBoundary from './components/ErrorBoundary';

// ============================================================================
// REACT QUERY CLIENT
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    },
  },
});

// ============================================================================
// ROUTE GUARDS
// ============================================================================

/**
 * Protected Route - requires authentication
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth fallback={<Navigate to="/login" replace />}>
      {children}
    </RequireAuth>
  );
}

/**
 * Admin Route - requires admin role
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin fallback={<Navigate to="/portal" replace />}>
      {children}
    </RequireAdmin>
  );
}

/**
 * Login Page
 */
function LoginPage() {
  const navigate = useNavigate();
  
  return (
    <div className="auth-page">
      <div className="auth-page__container">
        {/* Back Button */}
        <button 
          className="auth-page__back-button" 
          onClick={() => navigate('/')}
          aria-label="Go back to home page"
        >
          <span aria-hidden="true">←</span> Back
        </button>
        <div className="auth-page__header">
          <h1>Sage in your garden wizard</h1>
          <p>Sign in to your SAGE account</p>
        </div>
        <LoginForm
          onSuccess={() => navigate('/portal')}
          onRegisterClick={() => navigate('/register')}
        />
      </div>
    </div>
  );
}

/**
 * Register Page
 */
function RegisterPage() {
  const navigate = useNavigate();
  
  return (
    <div className="auth-page">
      <div className="auth-page__container">
        <div className="auth-page__header">
          <h1>Get Started</h1>
          <p>Create your SAGE account</p>
        </div>
        <RegisterForm
          onSuccess={() => navigate('/portal')}
          onLoginClick={() => navigate('/login')}
        />
      </div>
    </div>
  );
}

/**
 * Intake/Get Started Page
 */
function IntakePage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const handleIntakeSubmit = async (data: any, recommendation: any) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Try to create lead via API
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          projectAddress: data.projectAddress,
          projectType: data.projectType,
          budgetRange: data.budgetRange,
          timeline: data.timeline,
          hasSurvey: data.hasSurvey,
          hasDrawings: data.hasDrawings,
          description: data.description,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        // Store lead ID for checkout
        sessionStorage.setItem('lead_id', result.data?.id || result.id || '');
      }
    } catch (err) {
      // API might not be available - continue anyway
      console.warn('Could not save lead to API:', err);
    }
    
    // Always store local data and navigate
    sessionStorage.setItem('intake_data', JSON.stringify(data));
    sessionStorage.setItem('tier_recommendation', JSON.stringify(recommendation));
    
    setIsSubmitting(false);
    
    // Navigate to pricing page with recommended tier highlighted
    navigate(`/pricing?tier=${recommendation.tier}`);
  };
  
  return (
    <div className="intake-page">
      <div className="intake-page__container">
        <div className="intake-page__header">
          <h1>Let's Design Your Dream Landscape</h1>
          <p>Tell us about your project and we'll recommend the perfect service tier</p>
        </div>
        {error && (
          <div style={{ 
            background: '#fee2e2', 
            color: '#b91c1c', 
            padding: '1rem', 
            borderRadius: '8px',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}
        <IntakeForm 
          onSubmit={handleIntakeSubmit}
          onCancel={() => navigate('/')}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}


/**
 * Demo Page (legacy)
 */
function DemoPage() {
  const navigate = useNavigate();
  
  return <FeatureDemo onBack={() => navigate('/')} />;
}

/**
 * Messages Page - wrapper for MessagingSystem
 */
function MessagesPage() {
  const { user } = useAuth();
  return (
    <MessagingSystem
      currentUser={user?.email || 'Guest'}
      userType="client"
    />
  );
}

/**
 * Analytics Page - wrapper for AnalyticsDashboard
 */
function AnalyticsPage() {
  const { user } = useAuth();
  return (
    <AnalyticsDashboard
      userType="client"
      currentUser={user?.email || 'Guest'}
    />
  );
}

/**
 * Design Ideas Page - wrapper for DesignIdeas
 */
function DesignIdeasPage() {
  const { user } = useAuth();
  return (
    <DesignIdeas
      clientAddress={user?.email || 'demo-client'}
    />
  );
}

/**
 * Deliverables Page - wrapper for Deliverables
 */
function DeliverablesPage() {
  const { user } = useAuth();
  return (
    <Deliverables
      clientAddress={user?.email || 'demo-client'}
    />
  );
}

/** Documents Page */
function DocumentsPage() {
  const { user } = useAuth();
  return <ClientDocuments clientAddress={user?.email || 'demo-client'} />;
}

/** Upload Page */
function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <DocumentUpload
      clientAddress={user?.email || 'demo-client'}
      onUploadComplete={() => navigate('/portal/deliverables')}
    />
  );
}

/** Notifications Page */
function NotificationsPage() {
  const { user } = useAuth();
  return (
    <NotificationSystem currentUser={user?.email || 'Guest'} userType="client" />
  );
}

/** Community Page - Social feed with tips, updates, and showcases */
function CommunityPage() {
  const { user } = useAuth();
  return (
    <CommunityFeed clientAddress={user?.email || ''} />
  );
}

/** Workspace Page - Project status and task management via Notion */
function WorkspacePage() {
  const { user } = useAuth();
  return (
    <NotionWorkspaceViewer clientMode clientAddress={user?.email || ''} />
  );
}

/** Resources Page - Learning library with courses, guides, and install gallery */
function ResourcesPage() {
  const { user } = useAuth();
  return (
    <Resources clientAddress={user?.email || ''} />
  );
}

/** Schedule Page */
function SchedulePage() {
  // Demo milestones until API wires in
  const milestones: Milestone[] = [
    { id: 'm1', name: 'Project Kickoff', order: 1, status: 'COMPLETED', dueDate: null, completedAt: new Date(Date.now() - 60*24*3600*1000).toISOString() },
    { id: 'm2', name: 'Phase 1 Delivery', order: 2, status: 'COMPLETED', dueDate: null, completedAt: new Date(Date.now() - 30*24*3600*1000).toISOString() },
    { id: 'm3', name: 'Phase 2 Review', order: 3, status: 'IN_PROGRESS', dueDate: new Date(Date.now() + 12*24*3600*1000).toISOString(), completedAt: null },
    { id: 'm4', name: 'Final Delivery', order: 4, status: 'PENDING', dueDate: new Date(Date.now() + 45*24*3600*1000).toISOString(), completedAt: null },
  ];
  const summary: MilestoneSummary = {
    total: milestones.length,
    completed: milestones.filter(m=>m.status==='COMPLETED').length,
    inProgress: milestones.filter(m=>m.status==='IN_PROGRESS').length,
    pending: milestones.filter(m=>m.status==='PENDING').length,
    percentage: Math.round(milestones.filter(m=>m.status==='COMPLETED').length / milestones.length * 100),
  };
  return <MilestoneTimeline milestones={milestones} summary={summary} orientation="horizontal" />;
}

/**
 * Notification Settings Page - wrapper for NotificationSettings
 */
function NotificationSettingsPage() {
  return <NotificationSettings />;
}

/**
 * Portal Dashboard - wrapper for ClientHub with navigation
 */
function PortalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  return (
    <ClientHub
      clientAddress={user?.email || 'Guest'}
      onViewProjects={() => navigate('/portal/projects')}
      onViewDocuments={() => navigate('/portal/documents')}
      onUpload={() => navigate('/portal/upload')}
      onViewMessages={() => navigate('/portal/messages')}
      onViewAnalytics={() => navigate('/portal/analytics')}
      onViewDeliverables={() => navigate('/portal/deliverables')}
    />
  );
}

/**
 * Main App Component
 */
function App() {
  // Initialize PWA features
  useEffect(() => {
    const initializePWA = async () => {
      await pwaManager.registerServiceWorker();
      await pwaManager.requestNotificationPermission();
      logger.info('[PWA] Device info:', pwaManager.getDeviceInfo());
    };

    initializePWA();
  }, []);

  return (
    <ErrorBoundary
      fallbackTitle="Application Error"
      fallbackMessage="Something went wrong with the SAGE platform. Please try refreshing the page."
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DarkModeProvider>
            <AuthProvider>
              <ToastProvider position="top-right" maxToasts={5}>
              <Routes>
              {/* ============ PUBLIC ROUTES ============ */}
              
              {/* Landing */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Pricing */}
              <Route path="/pricing" element={<PricingPage />} />
              
              {/* Auth */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Intake Flow */}
              <Route path="/get-started" element={<IntakePage />} />
              <Route path="/intake" element={<IntakePage />} />
              
              {/* Checkout */}
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/checkout/cancel" element={<CheckoutCancel />} />
              
              {/* OAuth Callback */}
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              
              {/* Demo (legacy) */}
              <Route path="/demo" element={<DemoPage />} />

              {/* ============ PROTECTED PORTAL ROUTES ============ */}
              
              {/* Portal Dashboard */}
              <Route
                path="/portal"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PortalDashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Projects List */}
              <Route
                path="/portal/projects"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ProjectsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Project Detail */}
              <Route
                path="/portal/projects/:projectId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ProjectDetailPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* User Profile */}
              <Route
                path="/portal/profile"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <UserProfile />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Workspace - Project Status & Tasks */}
              <Route
                path="/portal/workspace"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <WorkspacePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Messages */}
              <Route
                path="/portal/messages"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <MessagesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Deliverables */}
              <Route
                path="/portal/deliverables"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <DeliverablesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Documents */}
              <Route
                path="/portal/documents"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <DocumentsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Upload */}
              <Route
                path="/portal/upload"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <UploadPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Notifications */}
              <Route
                path="/portal/notifications"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NotificationsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Community */}
              <Route
                path="/portal/community"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CommunityPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Resources / Learning Library */}
              <Route
                path="/portal/resources"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ResourcesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Schedule */}
              <Route
                path="/portal/schedule"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SchedulePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Analytics */}
              <Route
                path="/portal/analytics"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AnalyticsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Design Ideas */}
              <Route
                path="/portal/design"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <DesignIdeasPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Notification Settings */}
              <Route
                path="/portal/settings"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NotificationSettingsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* ============ ADMIN ROUTES ============ */}
              
              {/* Admin Dashboard */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AppLayout>
                      <AdminDashboardPage />
                    </AppLayout>
                  </AdminRoute>
                }
              />

              {/* Users Management */}
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AppLayout>
                      <UsersPage />
                    </AppLayout>
                  </AdminRoute>
                }
              />

              {/* Lead Management */}
              <Route
                path="/admin/leads"
                element={
                  <AdminRoute>
                    <AppLayout>
                      <LeadQueuePage />
                    </AppLayout>
                  </AdminRoute>
                }
              />
              
              {/* Projects Management */}
              <Route
                path="/admin/projects"
                element={
                  <AdminRoute>
                    <AppLayout>
                      <ProjectsTablePage />
                    </AppLayout>
                  </AdminRoute>
                }
              />
              
              {/* Clients Management */}
              <Route
                path="/admin/clients"
                element={
                  <AdminRoute>
                    <AppLayout>
                      <ClientsTablePage />
                    </AppLayout>
                  </AdminRoute>
                }
              />

              {/* ============ FALLBACK ============ */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            
            {/* Global Components */}
            <OfflineIndicator />
            <InstallPrompt />
              </ToastProvider>
            </AuthProvider>
          </DarkModeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
