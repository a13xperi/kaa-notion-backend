/**
 * Slack Service Tests
 */

import {
  initSlackService,
  isSlackEnabled,
  sendSlackMessage,
  notifyNewLead,
  notifyPaymentReceived,
  notifyProjectStatusChange,
  notifyMilestoneCompleted,
  notifyDocumentUploaded,
  notifyAlert,
} from '../slackService';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('SlackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  describe('isSlackEnabled', () => {
    it('returns false when webhook URL is not configured', () => {
      initSlackService({ webhookUrl: '', enabled: true });
      expect(isSlackEnabled()).toBe(false);
    });

    it('returns false when explicitly disabled', () => {
      initSlackService({ webhookUrl: 'https://hooks.slack.com/test', enabled: false });
      expect(isSlackEnabled()).toBe(false);
    });

    it('returns true when configured and enabled', () => {
      initSlackService({ webhookUrl: 'https://hooks.slack.com/test', enabled: true });
      expect(isSlackEnabled()).toBe(true);
    });
  });

  describe('sendSlackMessage', () => {
    beforeEach(() => {
      initSlackService({ webhookUrl: 'https://hooks.slack.com/test', enabled: true });
    });

    it('sends message to Slack webhook', async () => {
      const result = await sendSlackMessage({ text: 'Test message' });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('includes default channel', async () => {
      initSlackService({
        webhookUrl: 'https://hooks.slack.com/test',
        defaultChannel: '#test-channel',
        enabled: true,
      });

      await sendSlackMessage({ text: 'Test message' });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.channel).toBe('#test-channel');
    });

    it('returns false on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendSlackMessage({ text: 'Test message' });

      expect(result).toBe(false);
    });

    it('returns false on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: () => 'Error' });

      const result = await sendSlackMessage({ text: 'Test message' });

      expect(result).toBe(false);
    });

    it('skips when not enabled', async () => {
      initSlackService({ webhookUrl: '', enabled: false });

      const result = await sendSlackMessage({ text: 'Test message' });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('notifyNewLead', () => {
    beforeEach(() => {
      initSlackService({ webhookUrl: 'https://hooks.slack.com/test', enabled: true });
    });

    it('sends lead notification with all fields', async () => {
      const result = await notifyNewLead({
        email: 'test@example.com',
        name: 'John Doe',
        projectAddress: '123 Main St',
        recommendedTier: 2,
        routingReason: 'Budget matches tier 2',
      });

      expect(result).toBe(true);
      
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.text).toContain('John Doe');
      expect(body.blocks).toBeDefined();
    });

    it('handles missing name', async () => {
      const result = await notifyNewLead({
        email: 'test@example.com',
        projectAddress: '123 Main St',
        recommendedTier: 1,
      });

      expect(result).toBe(true);
    });
  });

  describe('notifyPaymentReceived', () => {
    beforeEach(() => {
      initSlackService({ webhookUrl: 'https://hooks.slack.com/test', enabled: true });
    });

    it('sends payment notification with formatted amount', async () => {
      const result = await notifyPaymentReceived({
        email: 'test@example.com',
        tier: 2,
        amount: 149900, // $1,499.00 in cents
        currency: 'USD',
      });

      expect(result).toBe(true);
      
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.text).toContain('$1,499.00');
    });
  });

  describe('notifyProjectStatusChange', () => {
    beforeEach(() => {
      initSlackService({ webhookUrl: 'https://hooks.slack.com/test', enabled: true });
    });

    it('sends status change notification', async () => {
      const result = await notifyProjectStatusChange({
        name: 'Test Project',
        clientEmail: 'client@example.com',
        oldStatus: 'IN_PROGRESS',
        newStatus: 'DELIVERED',
      });

      expect(result).toBe(true);
      
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.text).toContain('Test Project');
      expect(body.text).toContain('DELIVERED');
    });
  });

  describe('notifyMilestoneCompleted', () => {
    beforeEach(() => {
      initSlackService({ webhookUrl: 'https://hooks.slack.com/test', enabled: true });
    });

    it('sends milestone completion notification', async () => {
      const result = await notifyMilestoneCompleted({
        projectName: 'Test Project',
        milestoneName: 'Design Review',
        clientEmail: 'client@example.com',
      });

      expect(result).toBe(true);
      
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.text).toContain('Design Review');
    });
  });

  describe('notifyDocumentUploaded', () => {
    beforeEach(() => {
      initSlackService({ webhookUrl: 'https://hooks.slack.com/test', enabled: true });
    });

    it('formats file size in KB for small files', async () => {
      const result = await notifyDocumentUploaded({
        fileName: 'document.pdf',
        fileSize: 512 * 1024, // 512 KB
        projectName: 'Test Project',
        uploadedBy: 'user@example.com',
      });

      expect(result).toBe(true);
    });

    it('formats file size in MB for large files', async () => {
      const result = await notifyDocumentUploaded({
        fileName: 'large-file.pdf',
        fileSize: 5 * 1024 * 1024, // 5 MB
        projectName: 'Test Project',
        uploadedBy: 'user@example.com',
      });

      expect(result).toBe(true);
    });
  });

  describe('notifyAlert', () => {
    beforeEach(() => {
      initSlackService({ webhookUrl: 'https://hooks.slack.com/test', enabled: true });
    });

    it('sends info alert', async () => {
      const result = await notifyAlert({
        title: 'System Info',
        message: 'Scheduled maintenance tonight',
        severity: 'info',
      });

      expect(result).toBe(true);
      
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.text).toContain('ℹ️');
    });

    it('sends warning alert', async () => {
      const result = await notifyAlert({
        title: 'Warning',
        message: 'High API usage detected',
        severity: 'warning',
      });

      expect(result).toBe(true);
      
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.text).toContain('⚠️');
    });

    it('sends error alert with details', async () => {
      const result = await notifyAlert({
        title: 'Error',
        message: 'Database connection failed',
        severity: 'error',
        details: {
          Server: 'prod-db-1',
          Time: '2024-01-15 10:30:00',
        },
      });

      expect(result).toBe(true);
      
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.text).toContain('🚨');
    });
  });
});
