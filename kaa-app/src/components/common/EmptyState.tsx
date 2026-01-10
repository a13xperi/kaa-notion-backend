/**
 * EmptyState Component
 * Placeholder for empty lists and search results.
 */

import { ReactNode } from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const defaultIcon = '📭';

  return (
    <div className={`empty-state empty-state--${size} ${className}`}>
      <div className="empty-state__icon">
        {icon || defaultIcon}
      </div>
      <h3 className="empty-state__title">{title}</h3>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {action && (
        <div className="empty-state__action">{action}</div>
      )}
    </div>
  );
}

// Preset empty states
export function EmptySearch({ query, className = '' }: { query?: string; className?: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description={
        query
          ? `No matches for "${query}". Try a different search term.`
          : 'Try adjusting your search or filters.'
      }
      className={className}
    />
  );
}

export function EmptyList({
  itemName = 'items',
  action,
  className = '',
}: {
  itemName?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <EmptyState
      icon="📋"
      title={`No ${itemName} yet`}
      description={`When you have ${itemName}, they'll appear here.`}
      action={action}
      className={className}
    />
  );
}

export function EmptyProjects({ action, className = '' }: { action?: ReactNode; className?: string }) {
  return (
    <EmptyState
      icon="🏗️"
      title="No projects yet"
      description="Start your landscape journey by creating your first project."
      action={action}
      className={className}
    />
  );
}

export function EmptyDeliverables({ className = '' }: { className?: string }) {
  return (
    <EmptyState
      icon="📦"
      title="No deliverables yet"
      description="Your project deliverables will appear here once they're ready."
      className={className}
    />
  );
}

export function EmptyMessages({ className = '' }: { className?: string }) {
  return (
    <EmptyState
      icon="💬"
      title="No messages yet"
      description="Start a conversation with your design team."
      className={className}
    />
  );
}

export function EmptyNotifications({ className = '' }: { className?: string }) {
  return (
    <EmptyState
      icon="🔔"
      title="All caught up!"
      description="You have no new notifications."
      size="sm"
      className={className}
    />
  );
}

export default EmptyState;
