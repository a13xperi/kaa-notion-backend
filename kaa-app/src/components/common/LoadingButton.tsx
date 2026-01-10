/**
 * Loading Button Component
 * Button with loading state and spinner.
 */

import { ReactNode, ButtonHTMLAttributes } from 'react';
import './LoadingButton.css';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export function LoadingButton({
  isLoading = false,
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
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`loading-button loading-button--${variant} loading-button--${size} ${
        fullWidth ? 'loading-button--full' : ''
      } ${isLoading ? 'loading-button--loading' : ''} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="loading-button__spinner" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="loading-button__icon">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="loading-button__icon">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

export default LoadingButton;
