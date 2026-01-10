/**
 * Webhook Service
 * Sends event notifications to registered webhook endpoints.
 */

import crypto from 'crypto';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export type WebhookEventType =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.converted'
  | 'client.created'
  | 'project.created'
  | 'project.updated'
  | 'project.status_changed'
  | 'milestone.completed'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'deliverable.uploaded';

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  active: boolean;
  createdAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

export interface WebhookPayload<T = unknown> {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  data: T;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  duration: number;
}

export interface WebhookConfig {
  signingSecret: string;
  retryAttempts: number;
  retryDelayMs: number;
  timeoutMs: number;
}

// ============================================================================
// IN-MEMORY STORE (Replace with database in production)
// ============================================================================

const webhookEndpoints: Map<string, WebhookEndpoint> = new Map();

// ============================================================================
// CONFIGURATION
// ============================================================================

let config: WebhookConfig = {
  signingSecret: process.env.WEBHOOK_SIGNING_SECRET || 'webhook-secret-key',
  retryAttempts: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
};

/**
 * Initialize the webhook service
 */
export function initWebhookService(overrides: Partial<WebhookConfig> = {}): void {
  config = { ...config, ...overrides };
  logger.info('Webhook service initialized', {
    retryAttempts: config.retryAttempts,
    timeoutMs: config.timeoutMs,
  });
}

// ============================================================================
// SIGNATURE GENERATION
// ============================================================================

/**
 * Generate HMAC signature for webhook payload
 */
export function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = generateSignature(payload, secret);
  
  // Signatures must be same length for timing-safe comparison
  if (signature.length !== expected.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// ============================================================================
// ENDPOINT MANAGEMENT
// ============================================================================

/**
 * Register a new webhook endpoint
 */
export function registerWebhook(
  url: string,
  events: WebhookEventType[],
  secret?: string
): WebhookEndpoint {
  const id = crypto.randomUUID();
  const endpoint: WebhookEndpoint = {
    id,
    url,
    secret: secret || crypto.randomBytes(32).toString('hex'),
    events,
    active: true,
    createdAt: new Date(),
    failureCount: 0,
  };

  webhookEndpoints.set(id, endpoint);
  logger.info('Webhook endpoint registered', { id, url, events });

  return endpoint;
}

/**
 * Update a webhook endpoint
 */
export function updateWebhook(
  id: string,
  updates: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'active'>>
): WebhookEndpoint | null {
  const endpoint = webhookEndpoints.get(id);
  if (!endpoint) return null;

  const updated = { ...endpoint, ...updates };
  webhookEndpoints.set(id, updated);

  logger.info('Webhook endpoint updated', { id, updates });
  return updated;
}

/**
 * Delete a webhook endpoint
 */
export function deleteWebhook(id: string): boolean {
  const deleted = webhookEndpoints.delete(id);
  if (deleted) {
    logger.info('Webhook endpoint deleted', { id });
  }
  return deleted;
}

/**
 * Get a webhook endpoint by ID
 */
export function getWebhook(id: string): WebhookEndpoint | undefined {
  return webhookEndpoints.get(id);
}

/**
 * List all webhook endpoints
 */
export function listWebhooks(): WebhookEndpoint[] {
  return Array.from(webhookEndpoints.values());
}

/**
 * Get endpoints subscribed to a specific event
 */
export function getEndpointsForEvent(event: WebhookEventType): WebhookEndpoint[] {
  return Array.from(webhookEndpoints.values()).filter(
    (endpoint) => endpoint.active && endpoint.events.includes(event)
  );
}

// ============================================================================
// WEBHOOK DELIVERY
// ============================================================================

/**
 * Deliver webhook to a single endpoint
 */
async function deliverToEndpoint(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, endpoint.secret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Id': payload.id,
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': payload.timestamp,
        'User-Agent': 'SAGE-Webhook/1.0',
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const duration = Date.now() - startTime;

    if (response.ok) {
      // Reset failure count on success
      endpoint.failureCount = 0;
      endpoint.lastTriggeredAt = new Date();
      webhookEndpoints.set(endpoint.id, endpoint);

      return {
        success: true,
        statusCode: response.status,
        duration,
      };
    }

    return {
      success: false,
      statusCode: response.status,
      error: `HTTP ${response.status}: ${response.statusText}`,
      duration,
    };
  } catch (error) {
    clearTimeout(timeout);
    const duration = Date.now() - startTime;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Increment failure count
    endpoint.failureCount++;
    webhookEndpoints.set(endpoint.id, endpoint);

    // Disable endpoint after too many failures
    if (endpoint.failureCount >= 10) {
      endpoint.active = false;
      webhookEndpoints.set(endpoint.id, endpoint);
      logger.warn('Webhook endpoint disabled due to failures', {
        id: endpoint.id,
        url: endpoint.url,
        failureCount: endpoint.failureCount,
      });
    }

    return {
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Deliver webhook with retries
 */
async function deliverWithRetry(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
  let lastResult: WebhookDeliveryResult = {
    success: false,
    error: 'No delivery attempted',
    duration: 0,
  };

  for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
    if (attempt > 0) {
      // Exponential backoff
      const delay = config.retryDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    lastResult = await deliverToEndpoint(endpoint, payload);

    if (lastResult.success) {
      return lastResult;
    }

    logger.warn('Webhook delivery failed, retrying', {
      endpointId: endpoint.id,
      attempt: attempt + 1,
      error: lastResult.error,
    });
  }

  logger.error('Webhook delivery failed after retries', {
    endpointId: endpoint.id,
    url: endpoint.url,
    error: lastResult.error,
  });

  return lastResult;
}

// ============================================================================
// EVENT TRIGGERING
// ============================================================================

/**
 * Trigger a webhook event
 */
export async function triggerWebhook<T>(
  event: WebhookEventType,
  data: T
): Promise<Map<string, WebhookDeliveryResult>> {
  const endpoints = getEndpointsForEvent(event);
  const results = new Map<string, WebhookDeliveryResult>();

  if (endpoints.length === 0) {
    logger.debug('No webhook endpoints for event', { event });
    return results;
  }

  const payload: WebhookPayload<T> = {
    id: crypto.randomUUID(),
    type: event,
    timestamp: new Date().toISOString(),
    data,
  };

  logger.info('Triggering webhook event', {
    event,
    payloadId: payload.id,
    endpointCount: endpoints.length,
  });

  // Deliver to all endpoints in parallel
  const deliveryPromises = endpoints.map(async (endpoint) => {
    const result = await deliverWithRetry(endpoint, payload);
    results.set(endpoint.id, result);
    return result;
  });

  await Promise.all(deliveryPromises);

  return results;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Trigger lead created event
 */
export function triggerLeadCreated(lead: {
  id: string;
  email: string;
  name?: string;
  projectAddress: string;
  recommendedTier: number;
}): Promise<Map<string, WebhookDeliveryResult>> {
  return triggerWebhook('lead.created', lead);
}

/**
 * Trigger payment succeeded event
 */
export function triggerPaymentSucceeded(payment: {
  id: string;
  projectId: string;
  amount: number;
  currency: string;
  tier: number;
  customerEmail: string;
}): Promise<Map<string, WebhookDeliveryResult>> {
  return triggerWebhook('payment.succeeded', payment);
}

/**
 * Trigger project status changed event
 */
export function triggerProjectStatusChanged(project: {
  id: string;
  name: string;
  clientId: string;
  previousStatus: string;
  newStatus: string;
}): Promise<Map<string, WebhookDeliveryResult>> {
  return triggerWebhook('project.status_changed', project);
}

/**
 * Trigger milestone completed event
 */
export function triggerMilestoneCompleted(milestone: {
  id: string;
  projectId: string;
  name: string;
  completedAt: string;
}): Promise<Map<string, WebhookDeliveryResult>> {
  return triggerWebhook('milestone.completed', milestone);
}

/**
 * Trigger deliverable uploaded event
 */
export function triggerDeliverableUploaded(deliverable: {
  id: string;
  projectId: string;
  name: string;
  fileUrl: string;
  category: string;
}): Promise<Map<string, WebhookDeliveryResult>> {
  return triggerWebhook('deliverable.uploaded', deliverable);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
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
  triggerPaymentSucceeded,
  triggerProjectStatusChanged,
  triggerMilestoneCompleted,
  triggerDeliverableUploaded,
};
