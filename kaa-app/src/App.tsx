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

// SAGE Pages
import { SageLanding } from './components/sage/SageLanding';
import { SageTiers } from './components/sage/SageTiers';

// Portal Pages
import { ProjectsPage, ProjectDetailPage } from './pages';
import { UserProfile } from './components/profile';
import { DashboardWelcome } from './components/dashboard';
import ClientWorkspace from './components/ClientWorkspace';

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
 * Portal Workspace Component
 * Wraps ClientWorkspace and provides auth context (clientAddress, onLogout)
 */
function PortalWorkspace() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  // Get client address from profile or use email as fallback
  const clientAddress = profile?.client?.projectAddress || 
                       user?.email?.split('@')[0] || 
                       'Demo Project Address';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Show loading state if auth is still initializing
  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <ClientWorkspace 
      clientAddress={clientAddress}
      onLogout={handleLogout}
    />
  );
}

/**
 * Login Page
 */
function LoginPage() {
  const navigate = useNavigate();
  
  const handleQuickDemo = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo@sage.design',
          password: 'Demo123!',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Store auth credentials
          localStorage.setItem('sage_auth_token', result.data.token);
          localStorage.setItem('sage_user', JSON.stringify(result.data.user));
          
          // COMPLETELY BYPASS ONBOARDING AND VERIFICATION:
          // 1. Mark onboarding as completed
          localStorage.setItem('kaa-onboarding-completed', 'true');
          // 2. Set session skip flags
          sessionStorage.setItem('skip_onboarding', 'true');
          sessionStorage.setItem('skip_verification', 'true');
          // 3. Clear any existing onboarding state
          localStorage.removeItem('kaa-onboarding-state');
          
          // Navigate directly to portal dashboard
          navigate('/portal');
        }
      } else {
        console.error('Demo login failed');
      }
    } catch (err) {
      console.error('Demo login error:', err);
    }
  };
  
  return (
    <div className="auth-page">
      <div className="auth-page__container">
        {/* Back Button */}
        <button 
          className="auth-page__back-button" 
          onClick={() => navigate('/')}
          aria-label="Go back to home page"
        >
          <span aria-hidden="true">←</span> Back to Home
        </button>
        
        <div className="auth-page__header">
          <h1>Welcome Back</h1>
          <p>Sign in to your SAGE account</p>
        </div>
        <LoginForm
          onSuccess={() => navigate('/portal')}
          onRegisterClick={() => navigate('/register')}
        />
        
        {/* Quick Demo Bypass Button */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
        }}>
          <button
            onClick={handleQuickDemo}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.3)';
            }}
          >
            🚀 Jump to Dashboard (Skip All Onboarding)
          </button>
          <p style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.5rem',
            fontStyle: 'italic',
          }}>
            Auto-login with demo credentials and bypass all onboarding steps
          </p>
        </div>
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
        {/* Back Button */}
        <button 
          className="auth-page__back-button" 
          onClick={() => navigate('/')}
          aria-label="Go back to home page"
        >
          <span aria-hidden="true">←</span> Back to Home
        </button>
        
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
    
    let leadId: string | null = null;
    
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
        leadId = result.data?.id || result.id || null;
        if (leadId) {
          sessionStorage.setItem('lead_id', leadId);
        }
      }
    } catch (err) {
      // API might not be available - create mock lead ID for demo
      console.warn('Could not save lead to API:', err);
      leadId = `mock-lead-${Date.now()}`;
      sessionStorage.setItem('lead_id', leadId);
    }
    
    // Always store local data
    sessionStorage.setItem('intake_data', JSON.stringify(data));
    sessionStorage.setItem('tier_recommendation', JSON.stringify(recommendation));
    
    setIsSubmitting(false);
    
    // Try to auto-login with the email provided and go directly to portal
    // For demo purposes, we'll skip checkout and go straight to portal
    try {
      const loginResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: 'Demo123!', // Default demo password
        }),
      });
      
      if (loginResponse.ok) {
        const loginResult = await loginResponse.json();
        if (loginResult.success && loginResult.data) {
          // Store auth credentials
          localStorage.setItem('sage_auth_token', loginResult.data.token);
          localStorage.setItem('sage_user', JSON.stringify(loginResult.data.user));
          
          // COMPLETELY BYPASS ONBOARDING AND VERIFICATION:
          // 1. Mark onboarding as completed
          localStorage.setItem('kaa-onboarding-completed', 'true');
          // 2. Set session skip flags
          sessionStorage.setItem('skip_onboarding', 'true');
          sessionStorage.setItem('skip_verification', 'true');
          // 3. Clear any existing onboarding state
          localStorage.removeItem('kaa-onboarding-state');
          
          // Navigate directly to portal dashboard
          navigate('/portal');
          return;
        }
      }
    } catch (err) {
      // Login failed, continue to pricing page
      console.warn('Auto-login failed, redirecting to pricing:', err);
    }
    
    // If auto-login fails, navigate to pricing page with recommended tier
    navigate(`/pricing?tier=${recommendation.tier}&leadId=${leadId || ''}`);
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
              
              {/* SAGE Routes */}
              <Route path="/sage" element={<SageLanding />} />
              <Route path="/sage/tiers" element={<SageTiers />} />
              <Route path="/sage/get-started" element={<IntakePage />} />
              
              {/* Pricing */}
              <Route path="/pricing" element={<PricingPage />} />
              
              {/* Auth */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Intake Flow (legacy routes) */}
              <Route path="/get-started" element={<IntakePage />} />
              <Route path="/intake" element={<IntakePage />} />
              
              {/* Checkout */}
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/checkout/cancel" element={<CheckoutCancel />} />
              
              {/* Demo (legacy) */}
              <Route path="/demo" element={<DemoPage />} />

              {/* ============ PROTECTED PORTAL ROUTES ============ */}
              
              {/* Portal Dashboard - Full ClientWorkspace with all features */}
              <Route
                path="/portal"
                element={
                  <ProtectedRoute>
                    <PortalWorkspace />
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
    </ErrorBoundary>
  );
}

export default App;
