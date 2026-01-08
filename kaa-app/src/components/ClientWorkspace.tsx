import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';
import ErrorBoundary from './ErrorBoundary';
import ProjectsView from './ProjectsView';
import ClientDocuments from './ClientDocuments';
import DocumentUpload from './DocumentUpload';
import ClientHub from './ClientHub';
import MessagingSystem from './MessagingSystem';
import NotificationSystem from './NotificationSystem';
import AnalyticsDashboard from './AnalyticsDashboard';
import DesignIdeas from './DesignIdeas';
import SageChat from './SageChat';
import SageLogo from './SageLogo';
import DarkModeToggle from './DarkModeToggle';
import { DarkModeProvider } from '../contexts/DarkModeContext';
import './ClientWorkspace.css';

interface ClientWorkspaceProps {
  clientAddress: string;
  onLogout: () => void;
}

const ClientWorkspace: React.FC<ClientWorkspaceProps> = ({ clientAddress, onLogout }) => {
  const [currentView, setCurrentView] = useState<'hub' | 'projects' | 'documents' | 'upload' | 'messages' | 'notifications' | 'analytics' | 'design-ideas'>('hub');
  const [refreshKey, setRefreshKey] = useState(0);
  const [shouldAutoStartOnboarding, setShouldAutoStartOnboarding] = useState(false);

  // Check if onboarding should auto-start on mount
  useEffect(() => {
    const isOnboardingCompleted = localStorage.getItem('kaa-onboarding-completed') === 'true';
    
    if (!isOnboardingCompleted) {
      // Check onboarding state to see if it's already active or should start
      try {
        const savedState = localStorage.getItem('kaa-onboarding-state');
        if (savedState) {
          const state = JSON.parse(savedState);
          // If onboarding exists but isn't active, start it
          if (!state.isActive && state.currentStep === 0) {
            setShouldAutoStartOnboarding(true);
          }
        } else {
          // No onboarding state exists, start fresh
          setShouldAutoStartOnboarding(true);
        }
      } catch (error) {
        logger.error('Error checking onboarding state:', error);
        setShouldAutoStartOnboarding(true);
      }
    }
  }, []);

  const handleUploadComplete = () => {
    setCurrentView('hub');
    setRefreshKey(prev => prev + 1);
  };

  const handleViewProjects = () => {
    setCurrentView('projects');
  };

  const handleViewDocuments = () => {
    setCurrentView('documents');
  };

  const handleViewHub = () => {
    setCurrentView('hub');
  };

  const handleUploadClick = () => {
    setCurrentView('upload');
  };

  const handleMessagesClick = () => {
    setCurrentView('messages');
  };

  const handleNotificationsClick = () => {
    setCurrentView('notifications');
  };

  const handleBackToHub = () => {
    setCurrentView('hub');
  };

  const handleAnalyticsClick = () => {
    setCurrentView('analytics');
  };

  const handleDesignIdeasClick = () => {
    setCurrentView('design-ideas');
  };

  return (
    <DarkModeProvider>
      <div className="client-workspace">
        {/* Client Header Bar */}
        <div className="client-header-bar">
          <div className="client-header-content">
            <div className="client-header-left">
              <div className="header-dark-mode-toggle">
                <DarkModeToggle />
              </div>
              <SageLogo size="small" className="header-logo" />
              <div className="client-info">
                <span className="client-mode">Client Portal</span>
                <span className="client-address">{clientAddress}</span>
              </div>
            </div>
                  <div className="client-header-actions">
                    <button
                      className={`client-nav-btn ${currentView === 'hub' ? 'active' : ''}`}
                      onClick={handleViewHub}
                    >
                      🏠 Dashboard
                    </button>
                    <button
                      className={`client-nav-btn ${currentView === 'projects' ? 'active' : ''}`}
                      onClick={handleViewProjects}
                    >
                      📁 Projects
                    </button>
                    <button
                      className={`client-nav-btn ${currentView === 'documents' ? 'active' : ''}`}
                      onClick={handleViewDocuments}
                    >
                      📄 Documents
                    </button>
                    <button
                      className={`client-nav-btn ${currentView === 'messages' ? 'active' : ''}`}
                      onClick={handleMessagesClick}
                    >
                      💬 Messages
                    </button>
                    <button
                      className={`client-nav-btn ${currentView === 'notifications' ? 'active' : ''}`}
                      onClick={handleNotificationsClick}
                    >
                      🔔 Notifications
                    </button>
                    <button
                      className={`client-nav-btn ${currentView === 'analytics' ? 'active' : ''}`}
                      onClick={handleAnalyticsClick}
                    >
                      📊 Analytics
                    </button>
                    <button
                      className={`client-nav-btn ${currentView === 'design-ideas' ? 'active' : ''}`}
                      onClick={handleDesignIdeasClick}
                    >
                      🎨 Design Ideas
                    </button>
                    <button
                      className="client-upload-btn"
                      onClick={handleUploadClick}
                    >
                      📤 Upload
                    </button>
                    <button className="client-logout-btn" onClick={onLogout}>
                      ← Logout
                    </button>
                  </div>
        </div>
      </div>

      {/* Client Workspace Content */}
      <div className="client-workspace-content">
        <div className="client-workspace-inner">
          <ErrorBoundary
            fallbackTitle="Workspace Error"
            fallbackMessage="Something went wrong loading the workspace. Please try refreshing the page."
          >
            {currentView === 'hub' && (
              <ClientHub
                clientAddress={clientAddress}
                onViewProjects={handleViewProjects}
                onViewDocuments={handleViewDocuments}
                onUpload={handleUploadClick}
                onViewMessages={handleMessagesClick}
                onViewAnalytics={handleAnalyticsClick}
              />
            )}

            {currentView === 'projects' && (
              <ProjectsView 
                clientAddress={clientAddress}
                refreshKey={refreshKey}
              />
            )}

            {currentView === 'documents' && (
              <ClientDocuments 
                clientAddress={clientAddress}
              />
            )}

                  {currentView === 'upload' && (
                    <DocumentUpload
                      clientAddress={clientAddress}
                      onUploadComplete={handleUploadComplete}
                    />
                  )}

                  {currentView === 'messages' && (
                    <MessagingSystem
                      currentUser={clientAddress}
                      userType="client"
                      projectId="demo-project"
                    />
                  )}

                  {currentView === 'notifications' && (
                    <NotificationSystem
                      currentUser={clientAddress}
                      userType="client"
                    />
                  )}

                  {currentView === 'analytics' && (
                    <AnalyticsDashboard
                      currentUser={clientAddress}
                      userType="client"
                    />
                  )}

                  {currentView === 'design-ideas' && (
                    <DesignIdeas
                      clientAddress={clientAddress}
                    />
                  )}
          </ErrorBoundary>
        </div>
      </div>
              
      {/* Sage Onboarding Chat Widget */}
      <ErrorBoundary
        fallbackTitle="Chat Error"
        fallbackMessage="Sage chat encountered an error. The chat widget may not work properly."
      >
        <SageChat 
          clientAddress={clientAddress} 
          autoStartOnboarding={shouldAutoStartOnboarding}
          currentView={currentView}
        />
      </ErrorBoundary>
    </div>
    </DarkModeProvider>
  );
};

export default ClientWorkspace;

