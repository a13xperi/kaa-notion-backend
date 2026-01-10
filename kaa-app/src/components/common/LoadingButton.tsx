/**
 * LoadingButton Component
 * A button with built-in loading state for form submissions.
 */

import React from 'react';
import './LoadingButton.css';

// ============================================================================
// TYPES
// ============================================================================

export interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

// ============================================================================
// SPINNER COMPONENT
// ============================================================================

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="loading-button__spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="loading-button__spinner-track"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <path
        className="loading-button__spinner-head"
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LoadingButton({
  loading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  const spinnerSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  return (
    <button
      className={`
        loading-button
        loading-button--${variant}
        loading-button--${size}
        ${fullWidth ? 'loading-button--full-width' : ''}
        ${loading ? 'loading-button--loading' : ''}
        ${className}
      `.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={spinnerSize} />
          {loadingText && (
            <span className="loading-button__text">{loadingText}</span>
          )}
        </>
      ) : (
        <>
          {leftIcon && (
            <span className="loading-button__icon loading-button__icon--left">
              {leftIcon}
            </span>
          )}
          <span className="loading-button__text">{children}</span>
          {rightIcon && (
            <span className="loading-button__icon loading-button__icon--right">
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
}

export default LoadingButton;
