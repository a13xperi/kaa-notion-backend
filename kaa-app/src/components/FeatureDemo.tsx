import React, { useState } from 'react';
import './FeatureDemo.css';

interface FeatureDemoProps {
  onBack?: () => void;
}

const FeatureDemo: React.FC<FeatureDemoProps> = ({ onBack }) => {
  const [activeDemo, setActiveDemo] = useState<string>('overview');
  const [mobileView, setMobileView] = useState(false);

  const [emailTo, setEmailTo] = useState('aitkenassociates@gmail.com');
  const [emailType, setEmailType] = useState('welcome');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');

  const demos = [
    { id: 'overview', name: '🎯 Overview', description: 'Complete feature showcase' },
    { id: 'mobile', name: '📱 Mobile Responsive', description: 'Touch-optimized interface' },
    { id: 'kanban', name: '📋 Kanban Board', description: 'Horizontal scrollable columns' },
    { id: 'client-portal', name: '👥 Client Portal', description: 'Multi-step authentication' },
    { id: 'client-hub', name: '🏠 Client Hub', description: 'Personalized dashboard' },
    { id: 'quick-actions', name: '⚡ Quick Actions', description: 'Floating action button' },
    { id: 'skeleton', name: '💀 Skeleton Loading', description: 'Loading state animations' },
    { id: 'dark-mode', name: '🌙 Dark Mode', description: 'Theme switching' },
    { id: 'email-testing', name: '📧 Email Testing', description: 'Test email templates' }
  ];

  const renderOverview = () => (
    <div className="demo-section">
      <h2>🎯 KAA App - Complete Feature Showcase</h2>
      <div className="feature-grid">
        <div className="feature-card">
          <h3>📱 Mobile Responsive Design</h3>
          <ul>
            <li>Collapsible hamburger menus</li>
            <li>Touch-optimized interactions</li>
            <li>Horizontal scrollable Kanban</li>
            <li>Responsive dashboard layout</li>
          </ul>
        </div>
        <div className="feature-card">
          <h3>👥 Client Portal System</h3>
          <ul>
            <li>Landing page with portal selection</li>
            <li>Two-step authentication</li>
            <li>Address + password verification</li>
            <li>Last name confirmation</li>
          </ul>
        </div>
        <div className="feature-card">
          <h3>🏠 Client Hub Dashboard</h3>
          <ul>
            <li>Personalized welcome</li>
            <li>Project status & stats</li>
            <li>Recent activity feed</li>
            <li>Quick action buttons</li>
          </ul>
        </div>
        <div className="feature-card">
          <h3>📋 Enhanced Kanban Board</h3>
          <ul>
            <li>Horizontal scrollable columns</li>
            <li>Snap-to-position scrolling</li>
            <li>Full-width readable cards</li>
            <li>Touch-friendly interactions</li>
          </ul>
        </div>
        <div className="feature-card">
          <h3>⚡ Quick Actions & UX</h3>
          <ul>
            <li>Floating action button</li>
            <li>Keyboard shortcuts</li>
            <li>Skeleton loading states</li>
            <li>Favorites/bookmarks system</li>
          </ul>
        </div>
        <div className="feature-card">
          <h3>🌙 Dark Mode & Polish</h3>
          <ul>
            <li>Theme switching</li>
            <li>Production-safe logging</li>
            <li>Error boundaries</li>
            <li>Performance optimizations</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderMobileDemo = () => (
    <div className="demo-section">
      <h2>📱 Mobile Responsive Features</h2>
      <div className="mobile-demo-container">
        <div className="mobile-frame">
          <div className="mobile-header">
            <button className="hamburger">☰</button>
            <span>KAA App</span>
            <button className="hamburger">⚙️</button>
          </div>
          <div className="mobile-content">
            <div className="mobile-stats">
              <div className="stat-card">📊 12 Projects</div>
              <div className="stat-card">📄 45 Docs</div>
              <div className="stat-card">✅ 8 Complete</div>
            </div>
            <div className="mobile-kanban">
              <div className="kanban-column">
                <h4>To Do</h4>
                <div className="kanban-card">Design Review</div>
                <div className="kanban-card">Client Meeting</div>
              </div>
              <div className="kanban-column">
                <h4>In Progress</h4>
                <div className="kanban-card">Website Update</div>
              </div>
              <div className="kanban-column">
                <h4>Done</h4>
                <div className="kanban-card">Project Setup</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="feature-list">
        <h3>Mobile Optimizations:</h3>
        <ul>
          <li>✅ Collapsible top navigation bar</li>
          <li>✅ Collapsible pages panel with search</li>
          <li>✅ Horizontal scrollable Kanban columns</li>
          <li>✅ Touch-optimized tap targets</li>
          <li>✅ Responsive dashboard layout</li>
          <li>✅ Snap-to-position scrolling</li>
        </ul>
      </div>
    </div>
  );

  const renderKanbanDemo = () => (
    <div className="demo-section">
      <h2>📋 Kanban Board - Trello-Style</h2>
      <div className="kanban-demo">
        <div className="kanban-board">
          <div className="kanban-column">
            <h3>📝 To Do</h3>
            <div className="kanban-card">
              <div className="card-priority high">High</div>
              <div className="card-title">Design System Review</div>
              <div className="card-meta">Due: Tomorrow</div>
            </div>
            <div className="kanban-card">
              <div className="card-priority medium">Medium</div>
              <div className="card-title">Client Presentation Prep</div>
              <div className="card-meta">Due: Friday</div>
            </div>
          </div>
          <div className="kanban-column">
            <h3>🔄 In Progress</h3>
            <div className="kanban-card">
              <div className="card-priority high">High</div>
              <div className="card-title">Website Redesign</div>
              <div className="card-meta">In Progress</div>
            </div>
            <div className="kanban-card">
              <div className="card-priority low">Low</div>
              <div className="card-title">Documentation Update</div>
              <div className="card-meta">In Progress</div>
            </div>
          </div>
          <div className="kanban-column">
            <h3>✅ Done</h3>
            <div className="kanban-card">
              <div className="card-priority medium">Medium</div>
              <div className="card-title">Project Setup</div>
              <div className="card-meta">Completed</div>
            </div>
            <div className="kanban-card">
              <div className="card-priority high">High</div>
              <div className="card-title">Initial Planning</div>
              <div className="card-meta">Completed</div>
            </div>
          </div>
        </div>
      </div>
      <div className="feature-list">
        <h3>Kanban Features:</h3>
        <ul>
          <li>✅ Horizontal scrollable columns</li>
          <li>✅ Snap-to-position scrolling</li>
          <li>✅ Full-width readable cards</li>
          <li>✅ Priority indicators</li>
          <li>✅ Touch-friendly interactions</li>
          <li>✅ Mobile-optimized layout</li>
        </ul>
      </div>
    </div>
  );

  const renderClientPortalDemo = () => (
    <div className="demo-section">
      <h2>👥 Client Portal Flow</h2>
      <div className="portal-flow">
        <div className="flow-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h3>Landing Page</h3>
            <p>Choose between Client Portal or Team Dashboard</p>
            <div className="demo-buttons">
              <button className="demo-btn primary">Client Portal</button>
              <button className="demo-btn secondary">Team Dashboard</button>
            </div>
          </div>
        </div>
        <div className="flow-arrow">↓</div>
        <div className="flow-step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h3>Client Portal Landing</h3>
            <p>Welcome page with features and security benefits</p>
            <div className="demo-buttons">
              <button className="demo-btn primary">Sign In to Your Account</button>
            </div>
          </div>
        </div>
        <div className="flow-arrow">↓</div>
        <div className="flow-step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h3>Client Login</h3>
            <p>Enter project address and access code</p>
            <div className="demo-form">
              <input type="text" placeholder="Project Address" />
              <input type="password" placeholder="Access Code" />
              <button className="demo-btn primary">Sign In</button>
            </div>
          </div>
        </div>
        <div className="flow-arrow">↓</div>
        <div className="flow-step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h3>User Verification</h3>
            <p>Confirm address and enter last name</p>
            <div className="demo-form">
              <input type="text" placeholder="Confirm Address" />
              <input type="text" placeholder="Last Name" />
              <button className="demo-btn primary">Verify</button>
            </div>
          </div>
        </div>
        <div className="flow-arrow">↓</div>
        <div className="flow-step">
          <div className="step-number">5</div>
          <div className="step-content">
            <h3>Client Hub</h3>
            <p>Personalized dashboard with project overview</p>
            <div className="demo-buttons">
              <button className="demo-btn primary">🏠 Dashboard</button>
              <button className="demo-btn secondary">📄 Documents</button>
              <button className="demo-btn secondary">📤 Upload</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientHubDemo = () => (
    <div className="demo-section">
      <h2>🏠 Client Hub Dashboard</h2>
      <div className="client-hub-demo">
        <div className="hub-hero">
          <h1>Welcome back, <span className="highlight">Demo Project</span></h1>
          <div className="status-badge">Status: In Progress</div>
          <div className="last-login">Last Login: Today 10:30 AM</div>
        </div>
        <div className="hub-stats">
          <div className="stat-card">
            <h3>12</h3>
            <p>Total Documents</p>
          </div>
          <div className="stat-card">
            <h3>3</h3>
            <p>Recent Uploads</p>
          </div>
          <div className="stat-card">
            <h3>2</h3>
            <p>Pending Items</p>
          </div>
        </div>
        <div className="hub-sections">
          <div className="hub-section">
            <h3>Quick Actions</h3>
            <div className="action-grid">
              <button className="action-card">📤 Upload Document</button>
              <button className="action-card">📄 View All Documents</button>
              <button className="action-card">💬 Contact Project Manager</button>
              <button className="action-card">📊 View Project Timeline</button>
            </div>
          </div>
          <div className="hub-section">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              <div className="activity-item">
                <span className="activity-icon">📁</span>
                <div className="activity-details">
                  <p className="activity-title">Q2 Financial Report</p>
                  <p className="activity-meta">Added by KAA Team on 2024-07-25</p>
                </div>
                <button className="activity-action">⬇️</button>
              </div>
              <div className="activity-item">
                <span className="activity-icon">📁</span>
                <div className="activity-details">
                  <p className="activity-title">Project Scope V2</p>
                  <p className="activity-meta">Added by KAA Team on 2024-07-24</p>
                </div>
                <button className="activity-action">⬇️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuickActionsDemo = () => (
    <div className="demo-section">
      <h2>⚡ Quick Actions & UX Features</h2>
      <div className="quick-actions-demo">
        <div className="fab-demo">
          <div className="floating-action-button">
            <span>⚡</span>
          </div>
          <p>Floating Action Button with keyboard shortcuts</p>
        </div>
        <div className="shortcuts-demo">
          <h3>Keyboard Shortcuts:</h3>
          <div className="shortcut-list">
            <div className="shortcut-item">
              <kbd>⌘</kbd> + <kbd>K</kbd> - Quick Search
            </div>
            <div className="shortcut-item">
              <kbd>⌘</kbd> + <kbd>R</kbd> - Refresh Data
            </div>
            <div className="shortcut-item">
              <kbd>⌘</kbd> + <kbd>N</kbd> - New Page
            </div>
            <div className="shortcut-item">
              <kbd>⌘</kbd> + <kbd>D</kbd> - Toggle Dark Mode
            </div>
          </div>
        </div>
        <div className="favorites-demo">
          <h3>Favorites System:</h3>
          <div className="favorite-items">
            <div className="favorite-item">
              <span className="favorite-icon">⭐</span>
              <span>Project Overview</span>
            </div>
            <div className="favorite-item">
              <span className="favorite-icon">⭐</span>
              <span>Client Documents</span>
            </div>
            <div className="favorite-item">
              <span className="favorite-icon">⭐</span>
              <span>Team Dashboard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSkeletonDemo = () => (
    <div className="demo-section">
      <h2>💀 Skeleton Loading States</h2>
      <div className="skeleton-demo">
        <div className="skeleton-section">
          <h3>Page Loading</h3>
          <div className="skeleton-page">
            <div className="skeleton-line long"></div>
            <div className="skeleton-line medium"></div>
            <div className="skeleton-line short"></div>
          </div>
        </div>
        <div className="skeleton-section">
          <h3>Card Loading</h3>
          <div className="skeleton-cards">
            <div className="skeleton-card">
              <div className="skeleton-circle"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
            <div className="skeleton-card">
              <div className="skeleton-circle"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="skeleton-section">
          <h3>Stats Loading</h3>
          <div className="skeleton-stats">
            <div className="skeleton-stat">
              <div className="skeleton-number"></div>
              <div className="skeleton-label"></div>
            </div>
            <div className="skeleton-stat">
              <div className="skeleton-number"></div>
              <div className="skeleton-label"></div>
            </div>
            <div className="skeleton-stat">
              <div className="skeleton-number"></div>
              <div className="skeleton-label"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const sendTestEmail = async () => {
    setEmailStatus('sending');
    setEmailMessage('');
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/admin/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type: emailType, to: emailTo }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setEmailStatus('success');
        setEmailMessage(`✅ ${data.message}`);
      } else {
        setEmailStatus('error');
        setEmailMessage(`❌ ${data.error?.message || 'Failed to send email'}`);
      }
    } catch (err) {
      setEmailStatus('error');
      setEmailMessage(`❌ Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const renderEmailTestingDemo = () => (
    <div className="demo-section">
      <h2>📧 Email Testing</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Test different email templates by sending them to a specified email address.
        <br />
        <strong>Note:</strong> In test mode, emails can only be sent to the Resend account email (aitkenassociates@gmail.com).
      </p>
      
      <div className="email-testing-form" style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '1.5rem',
        maxWidth: '500px',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Email Address
          </label>
          <input
            type="email"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="Enter email address"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem',
            }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Email Type
          </label>
          <select
            value={emailType}
            onChange={(e) => setEmailType(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem',
              background: 'white',
            }}
          >
            <option value="welcome">🎉 Welcome Email</option>
            <option value="password-reset">🔐 Password Reset</option>
            <option value="payment">💳 Payment Confirmation</option>
            <option value="milestone">🎯 Milestone Notification</option>
            <option value="deliverable">📦 Deliverable Notification</option>
          </select>
        </div>
        
        <button
          onClick={sendTestEmail}
          disabled={emailStatus === 'sending' || !emailTo}
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
            background: emailStatus === 'sending' ? '#ccc' : '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: emailStatus === 'sending' ? 'not-allowed' : 'pointer',
          }}
        >
          {emailStatus === 'sending' ? '📤 Sending...' : '📧 Send Test Email'}
        </button>
        
        {emailMessage && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '8px',
            background: emailStatus === 'success' ? '#d1fae5' : '#fee2e2',
            color: emailStatus === 'success' ? '#065f46' : '#991b1b',
          }}>
            {emailMessage}
          </div>
        )}
      </div>
      
      <div className="feature-list" style={{ marginTop: '2rem' }}>
        <h3>Available Email Types:</h3>
        <ul>
          <li><strong>Welcome Email:</strong> Sent to new users when they register</li>
          <li><strong>Password Reset:</strong> Contains a link to reset password</li>
          <li><strong>Payment Confirmation:</strong> Sent after successful payment</li>
          <li><strong>Milestone Notification:</strong> Updates on project milestones</li>
          <li><strong>Deliverable Notification:</strong> When new files are available</li>
        </ul>
      </div>
    </div>
  );

  const renderDarkModeDemo = () => (
    <div className="demo-section">
      <h2>🌙 Dark Mode & Polish</h2>
      <div className="dark-mode-demo">
        <div className="theme-toggle-demo">
          <button className="theme-toggle">
            <span className="theme-icon">🌙</span>
            <span>Toggle Dark Mode</span>
          </button>
        </div>
        <div className="polish-features">
          <h3>Production Polish:</h3>
          <ul>
            <li>✅ Environment-specific logging (dev only)</li>
            <li>✅ Error boundaries for graceful failures</li>
            <li>✅ Performance optimizations (React.memo, useCallback)</li>
            <li>✅ Production-safe console statements</li>
            <li>✅ Responsive design for all screen sizes</li>
            <li>✅ Accessibility features</li>
          </ul>
        </div>
        <div className="error-boundary-demo">
          <h3>Error Boundary Example:</h3>
          <div className="error-demo">
            <p>If a component crashes, users see a friendly error message instead of a blank screen.</p>
            <button className="demo-btn secondary">Simulate Error</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDemo = () => {
    switch (activeDemo) {
      case 'overview': return renderOverview();
      case 'mobile': return renderMobileDemo();
      case 'kanban': return renderKanbanDemo();
      case 'client-portal': return renderClientPortalDemo();
      case 'client-hub': return renderClientHubDemo();
      case 'quick-actions': return renderQuickActionsDemo();
      case 'skeleton': return renderSkeletonDemo();
      case 'dark-mode': return renderDarkModeDemo();
      case 'email-testing': return renderEmailTestingDemo();
      default: return renderOverview();
    }
  };

  return (
    <div className="feature-demo">
      <div className="demo-header">
        <div className="demo-header-left">
          {onBack && (
            <button className="demo-back-button" onClick={onBack}>
              ← Back to Home
            </button>
          )}
          <h1>🎯 KAA App - Feature Showcase</h1>
        </div>
        <div className="demo-controls">
          <button 
            className={`view-toggle ${mobileView ? 'active' : ''}`}
            onClick={() => setMobileView(!mobileView)}
          >
            {mobileView ? '📱 Mobile View' : '💻 Desktop View'}
          </button>
        </div>
      </div>
      
      <div className="demo-navigation">
        {demos.map(demo => (
          <button
            key={demo.id}
            className={`demo-nav-btn ${activeDemo === demo.id ? 'active' : ''}`}
            onClick={() => setActiveDemo(demo.id)}
          >
            <span className="demo-nav-icon">{demo.name.split(' ')[0]}</span>
            <span className="demo-nav-text">{demo.name.split(' ').slice(1).join(' ')}</span>
            <span className="demo-nav-desc">{demo.description}</span>
          </button>
        ))}
      </div>

      <div className={`demo-content ${mobileView ? 'mobile-view' : ''}`}>
        {renderDemo()}
      </div>

      <div className="demo-footer">
        <div className="demo-info">
          <h3>🚀 Live Demo URLs:</h3>
          <div className="demo-urls">
            <a href="https://kaa-kbfsmo3ph-alex-peris-projects.vercel.app" target="_blank" rel="noopener noreferrer">
              🌐 Frontend App
            </a>
            <a href="https://backend-d9y58et8y-alex-peris-projects.vercel.app/api/health" target="_blank" rel="noopener noreferrer">
              🔧 Backend API
            </a>
          </div>
        </div>
        <div className="demo-credentials">
          <h3>🧪 Demo Credentials:</h3>
          <div className="credentials">
            <p><strong>Address:</strong> Demo Project</p>
            <p><strong>Code:</strong> demo123</p>
            <p><strong>Last Name:</strong> Demo</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureDemo;
