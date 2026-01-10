/**
 * Webhook Service Tests
 */

import {
  initWebhookService,
  generateSignature,
  verifySignature,
  registerWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhook,
  listWebhooks,
  triggerWebhook,
  triggerLeadCreated,
} from '../webhookService';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('WebhookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    
    // Clear endpoints
    listWebhooks().forEach((webhook) => deleteWebhook(webhook.id));
    
    initWebhookService({
      retryAttempts: 1,
      retryDelayMs: 10,
      timeoutMs: 5000,
    });
  });

  describe('generateSignature', () => {
    it('generates consistent signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';

      const sig1 = generateSignature(payload, secret);
      const sig2 = generateSignature(payload, secret);

      expect(sig1).toBe(sig2);
    });

    it('generates different signatures for different payloads', () => {
      const secret = 'test-secret';

      const sig1 = generateSignature('payload1', secret);
      const sig2 = generateSignature('payload2', secret);

      expect(sig1).not.toBe(sig2);
    });

    it('generates different signatures for different secrets', () => {
      const payload = 'test-payload';

      const sig1 = generateSignature(payload, 'secret1');
      const sig2 = generateSignature(payload, 'secret2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifySignature', () => {
    it('returns true for valid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const signature = generateSignature(payload, secret);

      expect(verifySignature(payload, signature, secret)).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';

      expect(verifySignature(payload, 'invalid-signature', secret)).toBe(false);
    });
  });

  describe('registerWebhook', () => {
    it('creates a new webhook endpoint', () => {
      const webhook = registerWebhook(
        'https://example.com/webhook',
        ['lead.created', 'payment.succeeded']
      );

      expect(webhook.id).toBeDefined();
      expect(webhook.url).toBe('https://example.com/webhook');
      expect(webhook.events).toEqual(['lead.created', 'payment.succeeded']);
      expect(webhook.active).toBe(true);
      expect(webhook.secret).toBeDefined();
    });

    it('uses provided secret', () => {
      const webhook = registerWebhook(
        'https://example.com/webhook',
        ['lead.created'],
        'custom-secret'
      );

      expect(webhook.secret).toBe('custom-secret');
    });
  });

  describe('updateWebhook', () => {
    it('updates webhook properties', () => {
      const webhook = registerWebhook('https://example.com/webhook', ['lead.created']);

      const updated = updateWebhook(webhook.id, {
        url: 'https://new-url.com/webhook',
        active: false,
      });

      expect(updated?.url).toBe('https://new-url.com/webhook');
      expect(updated?.active).toBe(false);
    });

    it('returns null for non-existent webhook', () => {
      const result = updateWebhook('non-existent-id', { active: false });
      expect(result).toBeNull();
    });
  });

  describe('deleteWebhook', () => {
    it('deletes an existing webhook', () => {
      const webhook = registerWebhook('https://example.com/webhook', ['lead.created']);

      const result = deleteWebhook(webhook.id);

      expect(result).toBe(true);
      expect(getWebhook(webhook.id)).toBeUndefined();
    });

    it('returns false for non-existent webhook', () => {
      const result = deleteWebhook('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('listWebhooks', () => {
    it('returns all registered webhooks', () => {
      registerWebhook('https://example1.com/webhook', ['lead.created']);
      registerWebhook('https://example2.com/webhook', ['payment.succeeded']);

      const webhooks = listWebhooks();

      expect(webhooks.length).toBe(2);
    });
  });

  describe('triggerWebhook', () => {
    it('delivers to all subscribed endpoints', async () => {
      registerWebhook('https://example1.com/webhook', ['lead.created']);
      registerWebhook('https://example2.com/webhook', ['lead.created']);

      const results = await triggerWebhook('lead.created', { id: '123' });

      expect(results.size).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('only delivers to endpoints subscribed to the event', async () => {
      registerWebhook('https://example1.com/webhook', ['lead.created']);
      registerWebhook('https://example2.com/webhook', ['payment.succeeded']);

      const results = await triggerWebhook('lead.created', { id: '123' });

      expect(results.size).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not deliver to inactive endpoints', async () => {
      const webhook = registerWebhook('https://example.com/webhook', ['lead.created']);
      updateWebhook(webhook.id, { active: false });

      const results = await triggerWebhook('lead.created', { id: '123' });

      expect(results.size).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('includes signature in headers', async () => {
      registerWebhook('https://example.com/webhook', ['lead.created'], 'test-secret');

      await triggerWebhook('lead.created', { id: '123' });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['X-Webhook-Signature']).toBeDefined();
    });

    it('returns success for successful delivery', async () => {
      const webhook = registerWebhook('https://example.com/webhook', ['lead.created']);

      const results = await triggerWebhook('lead.created', { id: '123' });

      expect(results.get(webhook.id)?.success).toBe(true);
    });

    it('returns failure for failed delivery', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

      const webhook = registerWebhook('https://example.com/webhook', ['lead.created']);

      const results = await triggerWebhook('lead.created', { id: '123' });

      expect(results.get(webhook.id)?.success).toBe(false);
    });
  });

  describe('triggerLeadCreated', () => {
    it('triggers lead.created event', async () => {
      registerWebhook('https://example.com/webhook', ['lead.created']);

      await triggerLeadCreated({
        id: '123',
        email: 'test@example.com',
        name: 'John Doe',
        projectAddress: '123 Main St',
        recommendedTier: 2,
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.type).toBe('lead.created');
      expect(body.data.email).toBe('test@example.com');
    });
  });
});
