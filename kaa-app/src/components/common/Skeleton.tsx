/**
 * Skeleton Loading Components
 * Placeholder components for loading states.
 */

import './Skeleton.css';

// ============================================================================
// BASE SKELETON
// ============================================================================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      }}
    />
  );
}

// ============================================================================
// SKELETON TEXT
// ============================================================================

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`skeleton-text ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '60%' : '100%'}
          height="0.875rem"
          className="skeleton-text__line"
        />
      ))}
    </div>
  );
}

// ============================================================================
// SKELETON AVATAR
// ============================================================================

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  const sizes = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  return (
    <Skeleton
      width={sizes[size]}
      height={sizes[size]}
      borderRadius="50%"
      className={`skeleton-avatar ${className}`}
    />
  );
}

// ============================================================================
// SKELETON CARD
// ============================================================================

interface SkeletonCardProps {
  hasImage?: boolean;
  imageHeight?: number;
  className?: string;
}

export function SkeletonCard({
  hasImage = true,
  imageHeight = 200,
  className = '',
}: SkeletonCardProps) {
  return (
    <div className={`skeleton-card ${className}`}>
      {hasImage && (
        <Skeleton
          height={imageHeight}
          borderRadius="8px 8px 0 0"
          className="skeleton-card__image"
        />
      )}
      <div className="skeleton-card__content">
        <Skeleton width="70%" height="1.25rem" className="skeleton-card__title" />
        <SkeletonText lines={2} />
        <div className="skeleton-card__footer">
          <Skeleton width={100} height="2rem" borderRadius="6px" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON TABLE
// ============================================================================

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: SkeletonTableProps) {
  return (
    <div className={`skeleton-table ${className}`}>
      {/* Header */}
      <div className="skeleton-table__header">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={`header-${index}`}
            height="1rem"
            width={index === 0 ? '30%' : '80%'}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="skeleton-table__row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              height="0.875rem"
              width={colIndex === 0 ? '40%' : '70%'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SKELETON LIST
// ============================================================================

interface SkeletonListProps {
  items?: number;
  hasAvatar?: boolean;
  className?: string;
}

export function SkeletonList({
  items = 3,
  hasAvatar = true,
  className = '',
}: SkeletonListProps) {
  return (
    <div className={`skeleton-list ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="skeleton-list__item">
          {hasAvatar && <SkeletonAvatar size="md" />}
          <div className="skeleton-list__content">
            <Skeleton width="60%" height="1rem" />
            <Skeleton width="40%" height="0.75rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SKELETON STATS
// ============================================================================

interface SkeletonStatsProps {
  count?: number;
  className?: string;
}

export function SkeletonStats({ count = 4, className = '' }: SkeletonStatsProps) {
  return (
    <div className={`skeleton-stats ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-stats__item">
          <Skeleton width="60%" height="2rem" />
          <Skeleton width="80%" height="0.75rem" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
