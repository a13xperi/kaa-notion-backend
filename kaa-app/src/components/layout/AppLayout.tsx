/**
 * App Layout Component
 * Main layout wrapper with header, navigation, and content area.
 */

import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__container">
          <a href="/" className="app-header__logo">
            <span className="app-header__logo-icon">🌿</span>
            <span className="app-header__logo-text">SAGE</span>
          </a>

          <nav className="app-header__nav">
            <a href="/pricing" className="app-header__link">
              Pricing
            </a>
            {isAuthenticated ? (
              <>
                <a href="/portal" className="app-header__link">
                  My Projects
                </a>
                {isAdmin && (
                  <a href="/admin" className="app-header__link">
                    Admin
                  </a>
                )}
              </>
            ) : (
              <a href="/get-started" className="app-header__link">
                Get Started
              </a>
            )}
          </nav>

          <div className="app-header__actions">
            {isAuthenticated ? (
              <div className="app-header__user">
                <div className="app-header__user-info">
                  <span className="app-header__user-email">{user?.email}</span>
                  {user?.tier && (
                    <span className="app-header__user-tier">Tier {user.tier}</span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="app-header__logout"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="app-header__auth-buttons">
                <a href="/login" className="app-header__link">
                  Sign In
                </a>
                <a href="/get-started" className="app-header__button">
                  Get Started
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {children}
      </main>

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
              <a href="/pricing">Pricing</a>
              <a href="/tier-1">The Concept</a>
              <a href="/tier-2">The Builder</a>
              <a href="/tier-3">The Concierge</a>
            </div>
            <div className="app-footer__column">
              <h4>Company</h4>
              <a href="/about">About</a>
              <a href="/contact">Contact</a>
              <a href="/careers">Careers</a>
            </div>
            <div className="app-footer__column">
              <h4>Legal</h4>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
            </div>
          </div>

          <div className="app-footer__bottom">
            <p>© {new Date().getFullYear()} SAGE by KAA Design Studio. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
