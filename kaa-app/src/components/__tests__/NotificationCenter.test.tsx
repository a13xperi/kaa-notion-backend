/**
 * NotificationCenter Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationCenter } from '../NotificationCenter';
import {
  getNotificationIcon,
  getNotificationColor,
  formatNotificationTime,
  Notification,
} from '../../hooks/useRealtimeNotifications';

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // WebSocket.OPEN
  onopen: null as ((event: Event) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  onclose: null as ((event: CloseEvent) => void) | null,
};

(global as unknown as { WebSocket: unknown }).WebSocket = jest.fn(() => mockWebSocket);

describe('NotificationCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocket.send.mockClear();
    mockWebSocket.close.mockClear();
  });

  const defaultProps = {
    userId: 'user123',
    userType: 'client' as const,
    token: 'test-token',
  };

  describe('Rendering', () => {
    it('should render bell icon', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      const bellButton = screen.getByRole('button', { name: /notifications/i });
      expect(bellButton).toBeInTheDocument();
    });

    it('should not show badge initially', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });
  });

  describe('Dropdown', () => {
    it('should open dropdown on bell click', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should show empty state when no notifications', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);
      
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });

    it('should close dropdown on escape key', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      const bellButton = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellButton);
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument();
    });
  });
});

describe('Notification Helpers', () => {
  describe('getNotificationIcon', () => {
    it('should return correct icons for each type', () => {
      expect(getNotificationIcon('milestone_completed')).toBe('🎉');
      expect(getNotificationIcon('deliverable_uploaded')).toBe('📦');
      expect(getNotificationIcon('payment_received')).toBe('💰');
      expect(getNotificationIcon('message_received')).toBe('💬');
      expect(getNotificationIcon('system_alert')).toBe('⚠️');
    });
  });

  describe('getNotificationColor', () => {
    it('should return correct colors for each priority', () => {
      expect(getNotificationColor('low')).toBe('#6B7280');
      expect(getNotificationColor('normal')).toBe('#3B82F6');
      expect(getNotificationColor('high')).toBe('#F59E0B');
      expect(getNotificationColor('urgent')).toBe('#EF4444');
    });
  });

  describe('formatNotificationTime', () => {
    it('should format recent time as "Just now"', () => {
      const now = new Date().toISOString();
      expect(formatNotificationTime(now)).toBe('Just now');
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      expect(formatNotificationTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should format hours ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
      expect(formatNotificationTime(threeHoursAgo)).toBe('3h ago');
    });

    it('should format days ago', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      expect(formatNotificationTime(twoDaysAgo)).toBe('2d ago');
    });

    it('should format older dates with locale string', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      const result = formatNotificationTime(twoWeeksAgo);
      // Should be a date string like "1/1/2026"
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });
});

describe('Notification Types', () => {
  const createNotification = (overrides: Partial<Notification> = {}): Notification => ({
    id: 'test-id',
    type: 'system_alert',
    title: 'Test Title',
    message: 'Test message',
    timestamp: new Date().toISOString(),
    read: false,
    priority: 'normal',
    ...overrides,
  });

  it('should have required fields', () => {
    const notification = createNotification();
    
    expect(notification.id).toBeTruthy();
    expect(notification.type).toBeTruthy();
    expect(notification.title).toBeTruthy();
    expect(notification.message).toBeTruthy();
    expect(notification.timestamp).toBeTruthy();
    expect(typeof notification.read).toBe('boolean');
    expect(notification.priority).toBeTruthy();
  });

  it('should support optional data field', () => {
    const notification = createNotification({
      data: { projectId: '123', extra: 'info' },
    });
    
    expect(notification.data).toEqual({ projectId: '123', extra: 'info' });
  });
});
