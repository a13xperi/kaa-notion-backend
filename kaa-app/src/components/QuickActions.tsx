import React, { useState, useEffect } from 'react';
import './QuickActions.css';

interface QuickActionsProps {
  onCreatePage?: () => void;
  onSearch?: () => void;
  onRefresh?: () => void;
  onToggleView?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onCreatePage,
  onSearch,
  onRefresh,
  onToggleView
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL + K for quick actions
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      // CMD/CTRL + N for new page
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        onCreatePage?.();
      }

      // CMD/CTRL + R for refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        onRefresh?.();
      }

      // CMD/CTRL + F for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        onSearch?.();
      }

      // ESC to close
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCreatePage, onSearch, onRefresh]);

  const actions = [
    {
      id: 'search',
      icon: '🔍',
      label: 'Search Pages',
      shortcut: '⌘F',
      onClick: onSearch,
      disabled: !onSearch
    },
    {
      id: 'refresh',
      icon: '🔄',
      label: 'Refresh Data',
      shortcut: '⌘R',
      onClick: onRefresh,
      disabled: !onRefresh
    },
    {
      id: 'create',
      icon: '➕',
      label: 'New Page',
      shortcut: '⌘N',
      onClick: onCreatePage,
      disabled: !onCreatePage
    },
    {
      id: 'view',
      icon: '👁️',
      label: 'Toggle View',
      shortcut: '⌘V',
      onClick: onToggleView,
      disabled: !onToggleView
    }
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`quick-actions-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => !isOpen && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Quick Actions"
      >
        <span className="fab-icon">{isOpen ? '✕' : '⚡'}</span>
      </button>

      {/* Tooltip */}
      {showTooltip && !isOpen && (
        <div className="quick-actions-tooltip">
          Quick Actions (⌘K)
        </div>
      )}

      {/* Actions Menu */}
      {isOpen && (
        <>
          <div className="quick-actions-overlay" onClick={() => setIsOpen(false)} />
          <div className="quick-actions-menu">
            <div className="quick-actions-header">
              <span>⚡ Quick Actions</span>
              <span className="quick-actions-hint">Press ESC to close</span>
            </div>
            <div className="quick-actions-list">
              {actions.map(action => (
                <button
                  key={action.id}
                  className={`quick-action-item ${action.disabled ? 'disabled' : ''}`}
                  onClick={() => {
                    if (!action.disabled) {
                      action.onClick?.();
                      setIsOpen(false);
                    }
                  }}
                  disabled={action.disabled}
                >
                  <span className="action-icon">{action.icon}</span>
                  <span className="action-label">{action.label}</span>
                  <span className="action-shortcut">{action.shortcut}</span>
                </button>
              ))}
            </div>
            <div className="quick-actions-footer">
              <span>💡 Tip: Press ⌘K anytime</span>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default QuickActions;


