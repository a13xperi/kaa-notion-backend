/**
 * Prometheus Metrics Configuration
 * Exposes application metrics for monitoring.
 */

import { Request, Response, NextFunction, Router } from 'express';
import client, { 
  Registry, 
  Counter, 
  Histogram, 
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';
import { logger } from '../logger';
import { internalError } from '../utils/AppError';

// ============================================================================
// REGISTRY
// ============================================================================

// Create a custom registry
const register = new Registry();

// Add default Node.js metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// ============================================================================
// CUSTOM METRICS
// ============================================================================

// HTTP Request metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Active requests gauge
const httpActiveRequests = new Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
  registers: [register],
});

// Database metrics
const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model', 'status'],
  registers: [register],
});

// Business metrics
const leadsCreatedTotal = new Counter({
  name: 'leads_created_total',
  help: 'Total number of leads created',
  labelNames: ['tier', 'source'],
  registers: [register],
});

const paymentsTotal = new Counter({
  name: 'payments_total',
  help: 'Total number of payment attempts',
  labelNames: ['tier', 'status'],
  registers: [register],
});

const deliverablesUploadedTotal = new Counter({
  name: 'deliverables_uploaded_total',
  help: 'Total number of deliverables uploaded',
  labelNames: ['category'],
  registers: [register],
});

const paymentAmountTotal = new Counter({
  name: 'payment_amount_total',
  help: 'Total payment amount in cents',
  labelNames: ['tier', 'currency'],
  registers: [register],
});

const projectsCreatedTotal = new Counter({
  name: 'projects_created_total',
  help: 'Total number of projects created',
  labelNames: ['tier'],
  registers: [register],
});

// Authentication metrics
const authAttemptsTotal = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'status'], // type: login, register, refresh
  registers: [register],
});

const activeSessionsGauge = new Gauge({
  name: 'active_sessions_total',
  help: 'Number of active user sessions',
  registers: [register],
});

// Error metrics
const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code'],
  registers: [register],
});

const serviceDisabledTotal = new Counter({
  name: 'service_disabled_total',
  help: 'Total attempts to access disabled services',
  labelNames: ['service'],
  registers: [register],
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Normalize path for metrics (remove IDs)
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUIDs
    .replace(/\/\d+/g, '/:id') // Numeric IDs
    .replace(/\/[^/]+@[^/]+/g, '/:email'); // Emails
}

/**
 * Metrics collection middleware
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip metrics endpoint itself
  if (req.path === '/metrics' || req.path === '/api/metrics') {
    return next();
  }

  const start = process.hrtime.bigint();
  httpActiveRequests.inc();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9; // Convert to seconds
    const path = normalizePath(req.route?.path || req.path);
    const labels = {
      method: req.method,
      path,
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
    httpActiveRequests.dec();
  });

  next();
}

// ============================================================================
// METRICS ROUTER
// ============================================================================

/**
 * Create metrics router
 */
export function createMetricsRouter(): Router {
  const router = Router();

  /**
   * GET /metrics
   * Prometheus metrics endpoint
   */
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      logger.error('Error generating metrics', { error });
      next(internalError('Failed to generate metrics', error as Error));
    }
  });

  /**
   * GET /metrics/json
   * Metrics in JSON format (for debugging)
   */
  router.get('/json', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await register.getMetricsAsJSON();
      res.json(metrics);
    } catch (error) {
      logger.error('Error generating JSON metrics', { error });
      next(internalError('Failed to generate metrics', error as Error));
    }
  });

  return router;
}

// ============================================================================
// METRIC HELPERS
// ============================================================================

/**
 * Record a database query metric
 */
export function recordDbQuery(
  operation: string,
  model: string,
  durationMs: number,
  success: boolean
): void {
  const durationSec = durationMs / 1000;
  dbQueryDuration.observe({ operation, model }, durationSec);
  dbQueryTotal.inc({ operation, model, status: success ? 'success' : 'error' });
}

/**
 * Record a lead creation
 */
export function recordLeadCreated(tier: number, source = 'web'): void {
  leadsCreatedTotal.inc({ tier: String(tier), source });
}

/**
 * Record a payment
 */
export function recordPayment(
  tier: number,
  status: 'success' | 'failed',
  amount?: number,
  currency = 'usd'
): void {
  paymentsTotal.inc({ tier: String(tier), status });
  if (status === 'success' && amount) {
    paymentAmountTotal.inc({ tier: String(tier), currency }, amount);
  }
}

/**
 * Record a deliverable upload
 */
export function recordDeliverableUploaded(category: string): void {
  deliverablesUploadedTotal.inc({ category });
}

/**
 * Record project creation
 */
export function recordProjectCreated(tier: number): void {
  projectsCreatedTotal.inc({ tier: String(tier) });
}

/**
 * Record authentication attempt
 */
export function recordAuthAttempt(
  type: 'login' | 'register' | 'refresh',
  status: 'success' | 'failed'
): void {
  authAttemptsTotal.inc({ type, status });
}

/**
 * Update active sessions count
 */
export function setActiveSessions(count: number): void {
  activeSessionsGauge.set(count);
}

/**
 * Record an error
 */
export function recordError(type: string, code: string): void {
  errorsTotal.inc({ type, code });
}

/**
 * Record a disabled service access attempt
 */
export function recordServiceDisabled(service: string): void {
  serviceDisabledTotal.inc({ service });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  httpActiveRequests,
  dbQueryDuration,
  dbQueryTotal,
  leadsCreatedTotal,
  deliverablesUploadedTotal,
  paymentsTotal,
  projectsCreatedTotal,
  authAttemptsTotal,
  errorsTotal,
  serviceDisabledTotal,
};

export default {
  metricsMiddleware,
  createMetricsRouter,
  recordDbQuery,
  recordLeadCreated,
  recordDeliverableUploaded,
  recordPayment,
  recordProjectCreated,
  recordAuthAttempt,
  setActiveSessions,
  recordError,
  recordServiceDisabled,
};
