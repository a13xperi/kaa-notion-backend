/**
 * SAGE MVP Platform - Main Application
 * 
 * Uses React Router for navigation between all platform pages.
 * Supports both the new SAGE MVP flow and legacy KAA components.
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, RequireAuth, RequireAdmin } from './contexts/AuthContext';
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

// Portal Pages
import { ProjectsPage, ProjectDetailPage } from './pages';
import { UserProfile } from './components/profile';
import { DashboardWelcome } from './components/dashboard';

// Admin Pages
import { 
  AdminDashboardPage, 
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
        <div className="auth-page__header">
          <h1>Welcome Back</h1>
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
  
  const handleIntakeSubmit = async (data: any, recommendation: any) => {
    // Store the intake data and recommendation for checkout
    sessionStorage.setItem('intake_data', JSON.stringify(data));
    sessionStorage.setItem('tier_recommendation', JSON.stringify(recommendation));
    
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
        <IntakeForm 
          onSubmit={handleIntakeSubmit}
          onCancel={() => navigate('/')}
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
              
              {/* Demo (legacy) */}
              <Route path="/demo" element={<DemoPage />} />

              {/* ============ PROTECTED PORTAL ROUTES ============ */}
              
              {/* Portal Dashboard */}
              <Route
                path="/portal"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <DashboardWelcome />
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
  );
}

export default App;
