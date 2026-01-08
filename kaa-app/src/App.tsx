import React, { useState, useEffect } from 'react';
import logger from './utils/logger';
import './App.css';
import NotionWorkspaceViewer from './components/NotionWorkspaceViewer';
import LandingPage from './components/LandingPage';
import ClientPortalLanding from './components/ClientPortalLanding';
import ClientLogin from './components/ClientLogin';
import UserVerification from './components/UserVerification';
import ClientWorkspace from './components/ClientWorkspace';
import TeamLogin from './components/TeamLogin';
import TeamDashboard from './components/TeamDashboard';
import FeatureDemo from './components/FeatureDemo';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPrompt from './components/InstallPrompt';
import pwaManager from './utils/pwa';

function App() {
  const [selectedPortal, setSelectedPortal] = useState<'landing' | 'client-portal' | 'client-login' | 'user-verification' | 'client' | 'team-login' | 'team' | 'demo'>('landing');
  const [clientAddress, setClientAddress] = useState<string>('');
  const [clientPassword, setClientPassword] = useState<string>('');
  const [clientLastName, setClientLastName] = useState<string>(''); // Used in handleUserVerification
  const [teamMember, setTeamMember] = useState<string>('');
  const [teamRole, setTeamRole] = useState<string>('');

  // Check if user has previously selected a portal (optional: remember choice)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reset = urlParams.get('reset');
    const portal = urlParams.get('portal');
    
    // Check for reset parameter or portal=landing to force landing page
    if (reset === 'true' || portal === 'landing') {
      // Clear all localStorage items
      localStorage.removeItem('kaa-selected-portal');
      localStorage.removeItem('kaa-client-address');
      localStorage.removeItem('kaa-client-password');
      localStorage.removeItem('kaa-client-lastname');
      localStorage.removeItem('kaa-team-member');
      localStorage.removeItem('kaa-team-role');
      // Set to landing page
      setSelectedPortal('landing');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    
    const savedPortal = localStorage.getItem('kaa-selected-portal');
    const savedAddress = localStorage.getItem('kaa-client-address');
    const savedPassword = localStorage.getItem('kaa-client-password');
    const savedLastName = localStorage.getItem('kaa-client-lastname');
    
    // Check for demo mode in URL
    if (window.location.pathname === '/demo' || window.location.search.includes('demo=true')) {
      setSelectedPortal('demo');
    } else if (savedPortal === 'team') {
      setSelectedPortal('team');
    } else if (savedPortal === 'client' && savedAddress && savedPassword && savedLastName) {
      setSelectedPortal('client');
      setClientAddress(savedAddress);
      setClientPassword(savedPassword);
      setClientLastName(savedLastName);
    }
  }, []);

  // Initialize PWA features
  useEffect(() => {
    const initializePWA = async () => {
      // Register service worker
      await pwaManager.registerServiceWorker();
      
      // Request notification permission
      await pwaManager.requestNotificationPermission();
      
      // Log device info
      logger.info('[PWA] Device info:', pwaManager.getDeviceInfo());
    };

    initializePWA();
  }, []);

  const handlePortalSelect = (portal: 'client' | 'team') => {
    if (portal === 'client') {
      setSelectedPortal('client-portal'); // Go to client portal landing first
    } else {
      setSelectedPortal('team-login'); // Go to team login first
    }
  };

  const handleClientLogin = (address: string, password: string) => {
    setClientAddress(address);
    setClientPassword(password);
    // Go to user verification step (NEW)
    setSelectedPortal('user-verification');
  };

  const handleUserVerification = (address: string, lastName: string) => {
    setClientLastName(lastName);
    setSelectedPortal('client');
    // Save all credentials for this session
    localStorage.setItem('kaa-selected-portal', 'client');
    localStorage.setItem('kaa-client-address', address);
    localStorage.setItem('kaa-client-password', clientPassword);
    localStorage.setItem('kaa-client-lastname', lastName);
  };

  const handleQuickAccess = () => {
    // Bypass both login and verification - go straight to client portal
    logger.info('[App] Quick access: Bypassing login and verification');
    setClientAddress('Demo Project');
    setClientPassword('demo123');
    setClientLastName('Demo');
    setSelectedPortal('client');
    // Save credentials for this session
    localStorage.setItem('kaa-selected-portal', 'client');
    localStorage.setItem('kaa-client-address', 'Demo Project');
    localStorage.setItem('kaa-client-password', 'demo123');
    localStorage.setItem('kaa-client-lastname', 'Demo');
  };

  const handleClientLogout = () => {
    setClientAddress('');
    setClientPassword('');
    setClientLastName('');
    setSelectedPortal('client-login');
    // Clear saved data
    localStorage.removeItem('kaa-selected-portal');
    localStorage.removeItem('kaa-client-address');
    localStorage.removeItem('kaa-client-password');
    localStorage.removeItem('kaa-client-lastname');
  };

  const handleBackFromVerification = () => {
    setClientAddress('');
    setClientPassword('');
    setSelectedPortal('client-login');
  };

  const handleBackToLanding = () => {
    setSelectedPortal('landing');
    setClientAddress('');
  };

  const handleShowDemo = () => {
    setSelectedPortal('demo');
  };

  const handleClientPortalLogin = () => {
    setSelectedPortal('client-login');
  };

  const handleBackToClientPortal = () => {
    setSelectedPortal('client-portal');
  };

  const handleTeamLogin = (member: string, role: string) => {
    setTeamMember(member);
    setTeamRole(role);
    setSelectedPortal('team');
    // Save team session
    localStorage.setItem('kaa-selected-portal', 'team');
    localStorage.setItem('kaa-team-member', member);
    localStorage.setItem('kaa-team-role', role);
  };

  const handleTeamLogout = () => {
    setTeamMember('');
    setTeamRole('');
    setSelectedPortal('team-login');
    // Clear team session
    localStorage.removeItem('kaa-selected-portal');
    localStorage.removeItem('kaa-team-member');
    localStorage.removeItem('kaa-team-role');
  };

  // Removed handleBackToTeamLogin - not currently used
  // Team login uses handleBackToLanding for navigation

  // Show demo page
  if (selectedPortal === 'demo') {
    return (
      <>
        <FeatureDemo onBack={handleBackToLanding} />
        <OfflineIndicator />
        <InstallPrompt />
      </>
    );
  }

  // Show landing page
  if (selectedPortal === 'landing') {
    return (
      <>
        <LandingPage onSelectPortal={handlePortalSelect} onShowDemo={handleShowDemo} />
        <OfflineIndicator />
        <InstallPrompt />
      </>
    );
  }

  // Client Portal Landing - Welcome page for clients
  if (selectedPortal === 'client-portal') {
    return (
      <>
        <ClientPortalLanding onLogin={handleClientPortalLogin} onBack={handleBackToLanding} />
        <OfflineIndicator />
        <InstallPrompt />
      </>
    );
  }

  // Client Login - Ask for address + password
  if (selectedPortal === 'client-login') {
    return (
      <>
        <ClientLogin onLogin={handleClientLogin} onBack={handleBackToClientPortal} onQuickAccess={handleQuickAccess} />
        <OfflineIndicator />
        <InstallPrompt />
      </>
    );
  }

  // User Verification - Ask for address confirmation + last name (NEW STEP)
  if (selectedPortal === 'user-verification') {
    return (
      <>
        <UserVerification
          address={clientAddress}
          onVerify={handleUserVerification}
          onBack={handleBackFromVerification}
        />
        <OfflineIndicator />
        <InstallPrompt />
      </>
    );
  }

  // Client Portal - Show their specific workspace
  if (selectedPortal === 'client') {
    return (
      <>
        <ClientWorkspace clientAddress={clientAddress} onLogout={handleClientLogout} />
        <OfflineIndicator />
        <InstallPrompt />
      </>
    );
  }

  // Team Login - Team member authentication
  if (selectedPortal === 'team-login') {
    return (
      <>
        <TeamLogin onLogin={handleTeamLogin} onBack={handleBackToLanding} />
        <OfflineIndicator />
        <InstallPrompt />
      </>
    );
  }

  // Team Dashboard - Team member workspace
  if (selectedPortal === 'team') {
    return (
      <>
        <TeamDashboard teamMember={teamMember} role={teamRole} onLogout={handleTeamLogout} />
        <OfflineIndicator />
        <InstallPrompt />
      </>
    );
  }

  // Legacy Team Dashboard - Full access (fallback)
  return (
    <>
      <div>
        <div style={{
          background: '#f5576c',
          color: 'white',
          padding: '12px 20px',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>🎯 Team Dashboard Mode</span>
          <button
            onClick={handleBackToLanding}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '6px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            ← Back to Home
          </button>
        </div>
        <NotionWorkspaceViewer />
      </div>
      <OfflineIndicator />
      <InstallPrompt />
    </>
  );
}

export default App;
