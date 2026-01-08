import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import { renderWithProviders } from './test-utils/testHelpers';

// Mock the notionApi
vi.mock('./api/notionApi', () => ({
  notionApi: {
    getAllPages: vi.fn().mockResolvedValue([]),
    getPageContent: vi.fn(),
    getAllDatabases: vi.fn().mockResolvedValue([]),
  },
}));

describe('App', () => {
  it('renders without crashing', () => {
    // Just verify the App component can render without throwing errors
    const { container } = renderWithProviders(<App />);
    expect(container).toBeInTheDocument();
  });
});
