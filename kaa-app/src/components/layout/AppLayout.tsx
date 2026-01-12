/**
 * App Layout Component
 * Main layout wrapper with header, sidebar navigation, and content area.
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AppLayout.css';
import SageChat from '../SageChat';

interface AppLayoutProps {
  children: ReactNode;
}

// Portal navigation items
const PORTAL_NAV_ITEMS = [
  { icon: '🏠', label: 'Dashboard', href: '/portal' },
  { icon: '📋', label: 'Projects', href: '/portal/projects' },
  { icon: '📝', label: 'Workspace', href: '/portal/workspace' },
  { icon: '💬', label: 'Messages', href: '/portal/messages' },
  { icon: '📄', label: 'Documents', href: '/portal/documents' },
  { icon: '📤', label: 'Upload', href: '/portal/upload' },
  { icon: '📁', label: 'Deliverables', href: '/portal/deliverables' },
  { icon: '📊', label: 'Analytics', href: '/portal/analytics' },
  { icon: '🎨', label: 'Design Ideas', href: '/portal/design' },
  { icon: '👥', label: 'Community', href: '/portal/community' },
  { icon: '📚', label: 'Resources', href: '/portal/resources' },
  { icon: '🔔', label: 'Notifications', href: '/portal/notifications' },
  { icon: '⚙️', label: 'Settings', href: '/portal/settings' },
];

// Admin navigation items
const ADMIN_NAV_ITEMS = [
  { icon: '📈', label: 'Dashboard', href: '/admin' },
  { icon: '👤', label: 'Users', href: '/admin/users' },
  { icon: '📥', label: 'Lead Queue', href: '/admin/leads' },
  { icon: '📋', label: 'Projects', href: '/admin/projects' },
  { icon: '👥', label: 'Clients', href: '/admin/clients' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const isAdminSection = currentPath.startsWith('/admin');
  const navItems = isAdminSection ? ADMIN_NAV_ITEMS : PORTAL_NAV_ITEMS;

  // Map the current route to SageChat's expected view identifiers
  const mapPathToView = (path: string): string => {
    if (path.startsWith('/portal')) {
      if (path === '/portal' || path === '/portal/') return 'hub';
      if (path.startsWith('/portal/workspace')) return 'projects';
      if (path.startsWith('/portal/documents')) return 'documents';
      if (path.startsWith('/portal/messages')) return 'messages';
      if (path.startsWith('/portal/upload')) return 'upload';
      if (path.startsWith('/portal/analytics')) return 'analytics';
      if (path.startsWith('/portal/design')) return 'design-ideas';
      if (path.startsWith('/portal/deliverables')) return 'deliverables';
      if (path.startsWith('/portal/notifications')) return 'notifications';
      if (path.startsWith('/portal/community')) return 'communications';
      return 'dashboard';
    }
    if (path.startsWith('/admin')) {
      if (path === '/admin' || path === '/admin/') return 'dashboard';
      if (path.startsWith('/admin/projects')) return 'projects';
      if (path.startsWith('/admin/clients')) return 'communications';
      return 'dashboard';
    }
    return 'dashboard';
  };

  const currentView = mapPathToView(currentPath);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const isActiveLink = (href: string) => {
    if (href === '/portal' || href === '/admin') {
      return currentPath === href;
    }
    return currentPath.startsWith(href);
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__container">
          <Link to="/" className="app-header__logo">
            <span className="app-header__logo-icon">🌿</span>
            <span className="app-header__logo-text">SAGE</span>
          </Link>

          <nav className="app-header__nav">
            <Link to="/pricing" className="app-header__link">
              Pricing
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/portal" className="app-header__link">
                  Portal
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="app-header__link">
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <Link to="/get-started" className="app-header__link">
                Get Started
              </Link>
            )}
          </nav>

          <div className="app-header__actions">
            {isAuthenticated ? (
              <div className="app-header__user">
                <Link to="/portal/profile" className="app-header__user-info">
                  <span className="app-header__user-email">{user?.email}</span>
                  {user?.tier && (
                    <span className="app-header__user-tier">Tier {user.tier}</span>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="app-header__logout"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="app-header__auth-buttons">
                <Link to="/login" className="app-header__link">
                  Sign In
                </Link>
                <Link to="/get-started" className="app-header__button">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar Navigation */}
        {isAuthenticated && (
          <aside className="app-sidebar">
            <nav className="app-sidebar__nav">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`app-sidebar__link ${isActiveLink(item.href) ? 'app-sidebar__link--active' : ''}`}
                >
                  <span className="app-sidebar__icon">{item.icon}</span>
                  <span className="app-sidebar__label">{item.label}</span>
                </Link>
              ))}
            </nav>
            
            {/* Profile link at bottom */}
            <div className="app-sidebar__footer">
              <Link
                to="/portal/profile"
                className={`app-sidebar__link ${isActiveLink('/portal/profile') ? 'app-sidebar__link--active' : ''}`}
              >
                <span className="app-sidebar__icon">👤</span>
                <span className="app-sidebar__label">Profile</span>
              </Link>
            </div>
          </aside>
        )}
        
        <main className="app-main">
          {children}
        </main>
      </div>

      <footer className="app-footer">
        <div className="app-footer__container">
          <div className="app-footer__brand">
            <span className="app-footer__logo">🌿 SAGE</span>
            <p className="app-footer__tagline">
              Beautiful landscapes, simplified.
            </p>
          </div>

          <div className="app-footer__links">
            <div className="app-footer__column">
              <h4>Services</h4>
              <Link to="/pricing">Pricing</Link>
              <Link to="/tier-1">The Concept</Link>
              <Link to="/tier-2">The Builder</Link>
              <Link to="/tier-3">The Concierge</Link>
            </div>
            <div className="app-footer__column">
              <h4>Company</h4>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/careers">Careers</Link>
            </div>
            <div className="app-footer__column">
              <h4>Legal</h4>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </div>

          <div className="app-footer__bottom">
            <p>© {new Date().getFullYear()} SAGE by KAA Design Studio. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating Sage assistant (bottom-right) */}
      {isAuthenticated && (
        <SageChat
          clientAddress={user?.email || 'there'}
          autoStartOnboarding={!isAdminSection && currentPath.startsWith('/portal')}
          currentView={currentView as any}
          mode={isAdminSection ? 'team' : 'client'}
          teamMember={isAdmin ? (user?.email || '') : ''}
          role={isAdmin ? 'admin' : ''}
        />
      )}
    </div>
  );
}

export default AppLayout;
