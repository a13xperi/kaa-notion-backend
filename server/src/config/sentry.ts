/**
 * Sentry Error Tracking Configuration
 * Integrates Sentry for production error monitoring.
 */

import * as Sentry from '@sentry/node';
import { Express, Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  enabled?: boolean;
}

let isInitialized = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize Sentry error tracking
 */
export function initSentry(config: SentryConfig): void {
  if (!config.dsn || config.enabled === false) {
    logger.info('Sentry disabled (no DSN provided or explicitly disabled)');
    return;
  }

  try {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release || process.env.npm_package_version,
      
      // Performance monitoring
      tracesSampleRate: config.tracesSampleRate ?? 0.1, // 10% of transactions
      
      // Error sampling
      sampleRate: config.sampleRate ?? 1.0, // 100% of errors
      
      // Integrations
      integrations: [
        // Automatically capture unhandled promise rejections
        Sentry.captureConsoleIntegration({ levels: ['error'] }),
      ],
      
      // Filter sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        
        // Remove sensitive data from request body
        if (event.request?.data) {
          const data = typeof event.request.data === 'string' 
            ? JSON.parse(event.request.data) 
            : event.request.data;
          
          if (data.password) data.password = '[FILTERED]';
          if (data.passwordHash) data.passwordHash = '[FILTERED]';
          if (data.token) data.token = '[FILTERED]';
          
          event.request.data = JSON.stringify(data);
        }
        
        return event;
      },
    });

    isInitialized = true;
    logger.info('Sentry error tracking initialized', {
      environment: config.environment,
      sampleRate: config.sampleRate ?? 1.0,
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry', { error });
  }
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Sentry request handler middleware
 * Must be the first middleware
 */
export function sentryRequestHandler(): ReturnType<typeof Sentry.expressIntegration> | ((req: Request, res: Response, next: NextFunction) => void) {
  if (!isInitialized) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  return Sentry.expressIntegration().setupOnce as unknown as ReturnType<typeof Sentry.expressIntegration>;
}

/**
 * Sentry error handler middleware
 * Must be before any other error handlers
 */
export function sentryErrorHandler(): (err: Error, req: Request, res: Response, next: NextFunction) => void {
  if (!isInitialized) {
    return (err: Error, _req: Request, _res: Response, next: NextFunction) => next(err);
  }
  return Sentry.expressErrorHandler() as (err: Error, req: Request, res: Response, next: NextFunction) => void;
}

// ============================================================================
// MANUAL ERROR CAPTURE
// ============================================================================

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, unknown>): string | undefined {
  if (!isInitialized) {
    logger.error('Error captured (Sentry disabled)', { error: error.message, ...context });
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, unknown>): string | undefined {
  if (!isInitialized) {
    logger[level === 'warning' ? 'warn' : level](message, context);
    return undefined;
  }

  return Sentry.captureMessage(message, {
    level: level === 'warning' ? 'warning' : level,
    extra: context,
  });
}

// ============================================================================
// USER CONTEXT
// ============================================================================

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; userType?: string }): void {
  if (!isInitialized) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    userType: user.userType,
  });
}

/**
 * Clear user context
 */
export function clearUser(): void {
  if (!isInitialized) return;
  Sentry.setUser(null);
}

// ============================================================================
// CONTEXT & TAGS
// ============================================================================

/**
 * Set additional context
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  if (!isInitialized) return;
  Sentry.setContext(name, context);
}

/**
 * Set a tag
 */
export function setTag(key: string, value: string): void {
  if (!isInitialized) return;
  Sentry.setTag(key, value);
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message?: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}): void {
  if (!isInitialized) return;
  Sentry.addBreadcrumb(breadcrumb);
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string): Sentry.Span | undefined {
  if (!isInitialized) return undefined;
  return Sentry.startInactiveSpan({ name, op });
}

// ============================================================================
// SETUP HELPER
// ============================================================================

/**
 * Setup Sentry for Express app
 */
export function setupSentry(app: Express): void {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    logger.info('Sentry DSN not configured, error tracking disabled');
    return;
  }

  initSentry({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version,
    sampleRate: 1.0,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });

  // The request handler must be the first middleware
  // Note: For Sentry v8+, we use the error handler approach
  logger.info('Sentry middleware configured');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initSentry,
  setupSentry,
  sentryRequestHandler,
  sentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  setContext,
  setTag,
  addBreadcrumb,
  startTransaction,
};
