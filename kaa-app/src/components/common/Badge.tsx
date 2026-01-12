/**
 * Badge Component
 * Status badges and tags with multiple variants.
 */

import { ReactNode } from 'react';
import './Badge.css';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  rounded?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  rounded = false,
  icon,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`badge badge--${variant} badge--${size} ${
        rounded ? 'badge--rounded' : ''
      } ${className}`}
    >
      {dot && <span className="badge__dot" />}
      {icon && <span className="badge__icon">{icon}</span>}
      {children}
    </span>
  );
}

// Status badge preset
interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
  className?: string;
}

const statusVariantMap: Record<string, BadgeVariant> = {
  // Lead status
  new: 'info',
  contacted: 'primary',
  qualified: 'success',
  converted: 'success',
  lost: 'danger',
  
  // Project status
  pending: 'default',
  in_progress: 'primary',
  active: 'primary',
  review: 'warning',
  completed: 'success',
  cancelled: 'danger',
  closed: 'default',
  
  // Milestone status
  not_started: 'default',
  
  // Payment status
  paid: 'success',
  unpaid: 'warning',
  refunded: 'danger',
  failed: 'danger',
  
  // Generic
  draft: 'default',
  published: 'success',
  archived: 'default',
};

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  const variant = statusVariantMap[normalizedStatus] || 'default';
  const displayText = status.replace(/_/g, ' ');

  return (
    <Badge variant={variant} size={size} dot className={className}>
      {displayText}
    </Badge>
  );
}

// Tier badge preset
interface TierBadgeProps {
  tier: number | string;
  size?: BadgeSize;
  className?: string;
}

const tierConfig: Record<string, { variant: BadgeVariant; label: string }> = {
  '1': { variant: 'default', label: 'Tier 1 - DIY' },
  '2': { variant: 'info', label: 'Tier 2 - Design' },
  '3': { variant: 'primary', label: 'Tier 3 - Full Service' },
  '4': { variant: 'warning', label: 'Tier 4 - KAA Premium' },
};

export function TierBadge({ tier, size = 'sm', className = '' }: TierBadgeProps) {
  const tierStr = String(tier);
  const config = tierConfig[tierStr] || { variant: 'default', label: `Tier ${tier}` };

  return (
    <Badge variant={config.variant} size={size} rounded className={className}>
      {config.label}
    </Badge>
  );
}

export default Badge;
