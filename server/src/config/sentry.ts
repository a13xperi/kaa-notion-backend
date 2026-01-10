/**
 * Sentry Error Tracking & Performance Monitoring
 *
 * Integrates Sentry for:
 * - Error tracking and alerting
 * - Performance monitoring (transactions, spans)
 * - Profiling for production debugging
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Express, Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Check if Sentry is configured
const SENTRY_DSN = process.env.SENTRY_DSN;
const isEnabled = !!SENTRY_DSN && process.env.NODE_ENV !== 'test';

/**
 * Initialize Sentry
 * Call this before any other middleware
 */
export function initSentry(app: Express): void {
  if (!isEnabled) {
    logger.info('Sentry disabled - SENTRY_DSN not configured');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      // Express integration
      Sentry.expressIntegration(),

      // Profiling integration
      nodeProfilingIntegration(),

      // Prisma integration for database spans
      Sentry.prismaIntegration(),

      // HTTP integration for outgoing requests
      Sentry.httpIntegration(),
    ],

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive body data
      if (event.request?.data) {
        const data = typeof event.request.data === 'string'
          ? JSON.parse(event.request.data)
          : event.request.data;

        if (data.password) data.password = '[REDACTED]';
        if (data.passwordHash) data.passwordHash = '[REDACTED]';
        if (data.token) data.token = '[REDACTED]';
        if (data.creditCard) data.creditCard = '[REDACTED]';

        event.request.data = JSON.stringify(data);
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
    ],
  });

  // Add Sentry request handler (must be first middleware)
  app.use(Sentry.expressRequestHandler());

  // Add Sentry tracing handler
  app.use(Sentry.expressTracingHandler());

  logger.info('Sentry initialized', {
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

/**
 * Sentry error handler middleware
 * Must be added after all routes but before custom error handlers
 */
export function sentryErrorHandler(): ReturnType<typeof Sentry.expressErrorHandler> {
  if (!isEnabled) {
    return (err: Error, req: Request, res: Response, next: NextFunction) => next(err);
  }
  return Sentry.expressErrorHandler();
}

/**
 * Capture an exception manually
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
): string | undefined {
  if (!isEnabled) {
    logger.error('Error captured (Sentry disabled)', context, error);
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message/event
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, unknown>
): string | undefined {
  if (!isEnabled) {
    logger.info(`Message captured (Sentry disabled): ${message}`, context);
    return undefined;
  }

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: {
  id: string;
  email?: string;
  role?: string;
}): void {
  if (!isEnabled) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

/**
 * Clear user context
 */
export function clearUser(): void {
  if (!isEnabled) return;
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
): void {
  if (!isEnabled) return;

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a new transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string
): ReturnType<typeof Sentry.startSpan> | null {
  if (!isEnabled) return null;

  return Sentry.startSpan({
    name,
    op,
  }, () => {});
}

/**
 * Wrap an async function with Sentry error capturing
 */
export function withSentry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Record<string, unknown>
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        captureException(error, context);
      }
      throw error;
    }
  }) as T;
}

/**
 * Express middleware to set user from request
 */
export function sentryUserMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as any).user;
  if (user) {
    setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
  next();
}

/**
 * Flush Sentry events (call before process exit)
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  if (!isEnabled) return true;
  return Sentry.flush(timeout);
}

export default {
  init: initSentry,
  errorHandler: sentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  withSentry,
  sentryUserMiddleware,
  flush: flushSentry,
};
