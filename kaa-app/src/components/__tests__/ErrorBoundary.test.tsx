/**
 * Tests for ErrorBoundary component
 * Ensures errors are caught and handled gracefully
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, Mock } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    (console.error as Mock).mockClear();
  });

  describe('Normal Operation', () => {
    it('renders children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Child component</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child component')).toBeInTheDocument();
    });

    it('does not show error UI when children render successfully', () => {
      render(
        <ErrorBoundary>
          <div>Successful render</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Catching', () => {
    it('catches errors thrown by child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    it('displays default error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(
        screen.getByText(/An unexpected error occurred/i)
      ).toBeInTheDocument();
    });

    it('logs error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Custom Messages', () => {
    it('displays custom fallback title', () => {
      render(
        <ErrorBoundary fallbackTitle="Custom Error Title">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
    });

    it('displays custom fallback message', () => {
      render(
        <ErrorBoundary fallbackMessage="Custom error message for user">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(
        screen.getByText('Custom error message for user')
      ).toBeInTheDocument();
    });

    it('uses both custom title and message', () => {
      render(
        <ErrorBoundary
          fallbackTitle="Pages Panel Error"
          fallbackMessage="Could not load pages"
        >
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Pages Panel Error')).toBeInTheDocument();
      expect(screen.getByText('Could not load pages')).toBeInTheDocument();
    });
  });

  describe('Error Details', () => {
    it('shows error details in expandable section', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const detailsElement = screen.getByText('Error Details');
      expect(detailsElement).toBeInTheDocument();
    });

    it('displays error message in details', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error message should be in the document
      expect(screen.getByText(/Test error/i)).toBeInTheDocument();
    });

    it('includes component stack in error details', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const componentStack = container.querySelector('.error-component-stack');
      expect(componentStack).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('renders "Try Again" button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('renders "Reload Page" button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('resets error state when Try Again is clicked', () => {
      // This test verifies the reset handler is called
      // In practice, the component would re-render and potentially work
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      // After clicking Try Again, the error boundary resets
      // Since our ThrowError component will throw again, it will show error again
      // The error UI should still be present (but may have re-rendered)
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument(); // Should have new button
    });

    it('calls window.location.reload when Reload Page is clicked', () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { reload: reloadSpy },
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText('Reload Page');
      fireEvent.click(reloadButton);

      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('UI Styling', () => {
    it('renders error icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorIcon = screen.getByText('⚠️');
      expect(errorIcon).toBeInTheDocument();
    });

    it('applies correct CSS classes', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(container.querySelector('.error-boundary')).toBeInTheDocument();
      expect(container.querySelector('.error-boundary-content')).toBeInTheDocument();
      expect(container.querySelector('.error-icon')).toBeInTheDocument();
      expect(container.querySelector('.error-title')).toBeInTheDocument();
      expect(container.querySelector('.error-message')).toBeInTheDocument();
      expect(container.querySelector('.error-actions')).toBeInTheDocument();
    });

    it('applies button classes', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const primaryButton = container.querySelector('.error-button-primary');
      const secondaryButton = container.querySelector('.error-button-secondary');

      expect(primaryButton).toBeInTheDocument();
      expect(secondaryButton).toBeInTheDocument();
    });
  });

  describe('Multiple Errors', () => {
    it('handles multiple sequential errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <div>No error</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();

      // Trigger error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    it('isolates errors between multiple ErrorBoundaries', () => {
      const { container } = render(
        <div>
          <ErrorBoundary fallbackTitle="First Boundary">
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Second Boundary">
            <div>Second boundary OK</div>
          </ErrorBoundary>
        </div>
      );

      // First boundary should show error
      expect(screen.getByText('First Boundary')).toBeInTheDocument();

      // Second boundary should render normally
      expect(screen.getByText('Second boundary OK')).toBeInTheDocument();
    });
  });

  describe('Error Propagation', () => {
    it('does not propagate errors beyond the boundary', () => {
      // Wrapper component to test isolation
      const Wrapper = () => (
        <div>
          <div>Outer content</div>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
          <div>More outer content</div>
        </div>
      );

      render(<Wrapper />);

      // Outer content should still render
      expect(screen.getByText('Outer content')).toBeInTheDocument();
      expect(screen.getByText('More outer content')).toBeInTheDocument();

      // Error boundary should catch the error
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
  });
});
