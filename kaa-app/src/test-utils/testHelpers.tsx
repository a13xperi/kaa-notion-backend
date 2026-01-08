/**
 * Test helper utilities for component testing
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { DarkModeProvider } from '../contexts/DarkModeContext';

/**
 * Custom render function that includes common providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <DarkModeProvider>{children}</DarkModeProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Mock fetch responses for API testing
 */
export function mockFetch(response: any, ok = true) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
      status: ok ? 200 : 500,
    } as Response)
  );
}

/**
 * Wait for async updates to complete
 */
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create a mock console.error that can be inspected
 */
export function mockConsoleError() {
  const originalError = console.error;
  const mockError = vi.fn();
  console.error = mockError;

  return {
    mockError,
    restore: () => {
      console.error = originalError;
    },
  };
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
