import React from 'react';
import { render } from '@testing-library/react';
import App from './App';
import { renderWithProviders } from './test-utils/testHelpers';

// Mock the notionApi
jest.mock('./api/notionApi', () => ({
  notionApi: {
    getAllPages: jest.fn().mockResolvedValue([]),
    getPageContent: jest.fn(),
    getAllDatabases: jest.fn().mockResolvedValue([]),
  },
}));

test('renders without crashing', () => {
  // Just verify the App component can render without throwing errors
  const { container } = renderWithProviders(<App />);
  expect(container).toBeInTheDocument();
});
