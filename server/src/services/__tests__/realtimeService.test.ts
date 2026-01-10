/**
 * Real-time Service Tests
 */

import { WebSocket, WebSocketServer } from 'ws';
import {
  initRealtimeService,
  shutdownRealtimeService,
  notifyUser,
  notifyProject,
  notifyTeam,
  broadcast,
  buildMilestoneNotification,
  buildDeliverableNotification,
  buildProjectStatusNotification,
  buildPaymentNotification,
  buildMessageNotification,
  buildSystemAlertNotification,
  getRealtimeStats,
  isUserConnected,
  Notification,
} from '../realtimeService';

// Mock ws module
jest.mock('ws', () => {
  const mockSocket = {
    readyState: 1, // WebSocket.OPEN
    send: jest.fn(),
    close: jest.fn(),
    terminate: jest.fn(),
    ping: jest.fn(),
    on: jest.fn(),
  };

  const mockServer = {
    on: jest.fn(),
  };

  return {
    WebSocket: {
      OPEN: 1,
      CLOSED: 3,
    },
    WebSocketServer: jest.fn(() => mockServer),
  };
});

describe('RealtimeService', () => {
  let mockWss: jest.Mocked<WebSocketServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWss = new WebSocketServer({ port: 0 }) as jest.Mocked<WebSocketServer>;
  });

  afterEach(() => {
    shutdownRealtimeService();
  });

  describe('initRealtimeService', () => {
    it('should initialize with WebSocket server', () => {
      initRealtimeService(mockWss);
      expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should accept configuration overrides', () => {
      initRealtimeService(mockWss, {
        pingInterval: 60000,
        connectionTimeout: 300000,
      });
      expect(mockWss.on).toHaveBeenCalled();
    });
  });

  describe('Notification Builders', () => {
    describe('buildMilestoneNotification', () => {
      it('should create milestone notification', () => {
        const notification = buildMilestoneNotification('Design Review', 'Smith Garden');
        
        expect(notification.type).toBe('milestone_completed');
        expect(notification.title).toContain('Milestone');
        expect(notification.message).toContain('Design Review');
        expect(notification.message).toContain('Smith Garden');
        expect(notification.priority).toBe('normal');
        expect(notification.read).toBe(false);
        expect(notification.id).toBeTruthy();
        expect(notification.timestamp).toBeTruthy();
      });

      it('should include custom data', () => {
        const data = { milestoneId: '123' };
        const notification = buildMilestoneNotification('Phase 1', 'Project', data);
        expect(notification.data).toEqual(data);
      });
    });

    describe('buildDeliverableNotification', () => {
      it('should create deliverable notification', () => {
        const notification = buildDeliverableNotification('Site Plan PDF', 'Johnson Project');
        
        expect(notification.type).toBe('deliverable_uploaded');
        expect(notification.title).toContain('Deliverable');
        expect(notification.message).toContain('Site Plan PDF');
        expect(notification.priority).toBe('high');
      });
    });

    describe('buildProjectStatusNotification', () => {
      it('should create status change notification', () => {
        const notification = buildProjectStatusNotification(
          'Garden Project',
          'in_progress',
          'completed'
        );
        
        expect(notification.type).toBe('project_status_changed');
        expect(notification.message).toContain('in_progress');
        expect(notification.message).toContain('completed');
      });
    });

    describe('buildPaymentNotification', () => {
      it('should create payment notification with formatted amount', () => {
        const notification = buildPaymentNotification(1500, 'Premium Garden');
        
        expect(notification.type).toBe('payment_received');
        expect(notification.message).toContain('1,500');
        expect(notification.priority).toBe('high');
      });
    });

    describe('buildMessageNotification', () => {
      it('should create message notification', () => {
        const notification = buildMessageNotification('John Doe', 'Hello, how are you?');
        
        expect(notification.type).toBe('message_received');
        expect(notification.title).toContain('John Doe');
        expect(notification.message).toBe('Hello, how are you?');
      });

      it('should truncate long messages', () => {
        const longMessage = 'A'.repeat(150);
        const notification = buildMessageNotification('User', longMessage);
        
        expect(notification.message.length).toBeLessThanOrEqual(103); // 100 + '...'
        expect(notification.message).toContain('...');
      });
    });

    describe('buildSystemAlertNotification', () => {
      it('should create system alert with default priority', () => {
        const notification = buildSystemAlertNotification('Maintenance', 'System will be down');
        
        expect(notification.type).toBe('system_alert');
        expect(notification.priority).toBe('normal');
      });

      it('should accept custom priority', () => {
        const notification = buildSystemAlertNotification(
          'Critical Issue',
          'Please save your work',
          'urgent'
        );
        
        expect(notification.priority).toBe('urgent');
      });
    });
  });

  describe('getRealtimeStats', () => {
    it('should return stats with zero connections initially', () => {
      initRealtimeService(mockWss);
      const stats = getRealtimeStats();
      
      expect(stats.totalConnections).toBe(0);
      expect(stats.uniqueUsers).toBe(0);
      expect(stats.connectionsByType).toEqual({
        client: 0,
        team: 0,
        admin: 0,
      });
      expect(stats.projectSubscriptions).toBe(0);
    });
  });

  describe('isUserConnected', () => {
    it('should return false for non-connected user', () => {
      initRealtimeService(mockWss);
      expect(isUserConnected('user123')).toBe(false);
    });
  });

  describe('Notification functions without connections', () => {
    beforeEach(() => {
      initRealtimeService(mockWss);
    });

    it('notifyUser should return false when user not connected', () => {
      const notification = buildMilestoneNotification('Test', 'Project');
      const result = notifyUser('nonexistent', notification);
      expect(result).toBe(false);
    });

    it('notifyProject should return 0 when no subscribers', () => {
      const notification = buildDeliverableNotification('Test', 'Project');
      const count = notifyProject('proj123', notification);
      expect(count).toBe(0);
    });

    it('notifyTeam should return 0 when no team connected', () => {
      const notification = buildSystemAlertNotification('Alert', 'Message');
      const count = notifyTeam(notification);
      expect(count).toBe(0);
    });

    it('broadcast should return 0 when no users connected', () => {
      const notification = buildSystemAlertNotification('Broadcast', 'To all');
      const count = broadcast(notification);
      expect(count).toBe(0);
    });
  });

  describe('Notification structure', () => {
    it('should have unique IDs', () => {
      const n1 = buildMilestoneNotification('Test1', 'Project');
      const n2 = buildMilestoneNotification('Test2', 'Project');
      expect(n1.id).not.toBe(n2.id);
    });

    it('should have valid ISO timestamp', () => {
      const notification = buildMilestoneNotification('Test', 'Project');
      const date = new Date(notification.timestamp);
      expect(date.toISOString()).toBe(notification.timestamp);
    });
  });
});
