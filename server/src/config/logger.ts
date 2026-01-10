/**
 * Structured Logging Infrastructure
 *
 * Provides consistent, structured logging with request IDs,
 * log levels, and JSON output for production.
 */

import { Request, Response, NextFunction } from 'express';

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

// Get log level from environment
const currentLogLevel: LogLevel = (() => {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
  switch (level) {
    case 'debug': return LogLevel.DEBUG;
    case 'info': return LogLevel.INFO;
    case 'warn': return LogLevel.WARN;
    case 'error': return LogLevel.ERROR;
    case 'fatal': return LogLevel.FATAL;
    default: return LogLevel.INFO;
  }
})();

const isProduction = process.env.NODE_ENV === 'production';

interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Format log entry
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LOG_LEVEL_NAMES[level],
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    };
  }

  if (isProduction) {
    // JSON output for production (easier to parse by log aggregators)
    return JSON.stringify(entry);
  }

  // Pretty output for development
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  const errorStr = error ? `\n  Error: ${error.message}${error.stack ? `\n${error.stack}` : ''}` : '';
  const timestamp = new Date().toLocaleTimeString();

  return `[${timestamp}] ${LOG_LEVEL_NAMES[level]} ${message}${contextStr}${errorStr}`;
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): void {
  if (level < currentLogLevel) return;

  const output = formatLogEntry(level, message, context, error);

  switch (level) {
    case LogLevel.DEBUG:
    case LogLevel.INFO:
      console.log(output);
      break;
    case LogLevel.WARN:
      console.warn(output);
      break;
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(output);
      break;
  }
}

/**
 * Logger instance
 */
export const logger = {
  debug: (message: string, context?: LogContext) =>
    log(LogLevel.DEBUG, message, context),

  info: (message: string, context?: LogContext) =>
    log(LogLevel.INFO, message, context),

  warn: (message: string, context?: LogContext, error?: Error) =>
    log(LogLevel.WARN, message, context, error),

  error: (message: string, context?: LogContext, error?: Error) =>
    log(LogLevel.ERROR, message, context, error),

  fatal: (message: string, context?: LogContext, error?: Error) =>
    log(LogLevel.FATAL, message, context, error),

  // Log with request context
  withRequest: (req: Request) => ({
    debug: (message: string, context?: LogContext) =>
      log(LogLevel.DEBUG, message, { ...getRequestContext(req), ...context }),

    info: (message: string, context?: LogContext) =>
      log(LogLevel.INFO, message, { ...getRequestContext(req), ...context }),

    warn: (message: string, context?: LogContext, error?: Error) =>
      log(LogLevel.WARN, message, { ...getRequestContext(req), ...context }, error),

    error: (message: string, context?: LogContext, error?: Error) =>
      log(LogLevel.ERROR, message, { ...getRequestContext(req), ...context }, error),
  }),
};

/**
 * Extract request context for logging
 */
function getRequestContext(req: Request): LogContext {
  return {
    requestId: req.headers['x-request-id'] as string,
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id,
    ip: req.ip,
  };
}

/**
 * Request logging middleware
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Log request start
  logger.info('Request started', {
    requestId: req.headers['x-request-id'] as string,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  } as LogContext);

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - startTime;

    // Log request completion
    logger.info('Request completed', {
      requestId: req.headers['x-request-id'] as string,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
    } as LogContext);

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.headers['x-request-id'] as string,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
      } as LogContext);
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Error logging middleware
 */
export function errorLogger(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Unhandled error', {
    requestId: req.headers['x-request-id'] as string,
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id,
  } as LogContext, error);

  next(error);
}

/**
 * Log database queries (for debugging)
 */
export function logQuery(query: string, params?: unknown[], duration?: number): void {
  if (currentLogLevel > LogLevel.DEBUG) return;

  logger.debug('Database query', {
    query: query.substring(0, 200), // Truncate long queries
    params: params?.length,
    duration: duration ? `${duration}ms` : undefined,
  } as LogContext);
}

/**
 * Log external API calls
 */
export function logExternalCall(
  service: string,
  method: string,
  path: string,
  statusCode?: number,
  duration?: number
): void {
  logger.info('External API call', {
    service,
    method,
    path,
    statusCode,
    duration: duration ? `${duration}ms` : undefined,
  } as LogContext);
}

export default logger;
