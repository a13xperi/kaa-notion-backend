/**
 * Production Logger
 * Structured JSON logging for production, pretty printing for development.
 *
 * Features:
 * - JSON format in production for log aggregation (ELK, CloudWatch, etc.)
 * - Pretty format in development for readability
 * - Log levels: debug, info, warn, error
 * - Correlation ID support for request tracing
 * - Metadata support for structured context
 */

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  service: string;
  environment: string;
  [key: string]: unknown;
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  isDevelopment: process.env.NODE_ENV !== 'production',
  logLevel: (process.env.LOG_LEVEL || 'info') as LogLevel,
  serviceName: process.env.SERVICE_NAME || 'sage-api',
  environment: process.env.NODE_ENV || 'development',
  jsonFormat: process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production',
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ============================================================================
// FORMATTING
// ============================================================================

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.logLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatJsonLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function formatPrettyLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = formatTimestamp();
  const levelUpper = level.toUpperCase().padEnd(5);
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
  };
  const reset = '\x1b[0m';
  const color = colors[level];

  let output = `${color}[${levelUpper}]${reset} ${timestamp} ${message}`;

  if (meta && Object.keys(meta).length > 0) {
    // Filter out undefined values
    const cleanMeta = Object.fromEntries(
      Object.entries(meta).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(cleanMeta).length > 0) {
      output += ` ${JSON.stringify(cleanMeta)}`;
    }
  }

  return output;
}

// ============================================================================
// CORE LOGGING FUNCTION
// ============================================================================

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  if (config.jsonFormat) {
    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      message,
      service: config.serviceName,
      environment: config.environment,
      ...meta,
    };
    const output = formatJsonLog(entry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  } else {
    const output = formatPrettyLog(level, message, meta);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }
}

// ============================================================================
// LOGGER INTERFACE
// ============================================================================

/**
 * Normalize arguments to handle both old and new API
 * Old: logger.info('message', error)
 * New: logger.info('message', { key: 'value' })
 */
function normalizeArgs(args: unknown[]): { message: string; meta?: Record<string, unknown> } {
  if (args.length === 0) {
    return { message: '' };
  }

  // First arg is message
  const message = String(args[0]);

  if (args.length === 1) {
    return { message };
  }

  // Handle multiple additional arguments
  const meta: Record<string, unknown> = {};
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === null || arg === undefined) continue;
    
    if (arg instanceof Error) {
      meta.error = arg.message;
      meta.errorName = arg.name;
      if (config.isDevelopment) {
        meta.stack = arg.stack;
      }
    } else if (typeof arg === 'object') {
      Object.assign(meta, arg);
    } else {
      meta[`arg${i}`] = arg;
    }
  }

  return { message, meta: Object.keys(meta).length > 0 ? meta : undefined };
}

/**
 * Main logger instance
 * Supports both old API: logger.info('msg', error) 
 * And new API: logger.info('msg', { key: 'value' })
 */
export const logger = {
  /**
   * Debug level - for detailed debugging information
   * Only logged when LOG_LEVEL=debug
   */
  debug(...args: unknown[]): void {
    const { message, meta } = normalizeArgs(args);
    log('debug', message, meta);
  },

  /**
   * Info level - for general operational information
   * Logged by default
   */
  info(...args: unknown[]): void {
    const { message, meta } = normalizeArgs(args);
    log('info', message, meta);
  },

  /**
   * Warn level - for warning conditions
   * Always logged unless LOG_LEVEL=error
   */
  warn(...args: unknown[]): void {
    const { message, meta } = normalizeArgs(args);
    log('warn', message, meta);
  },

  /**
   * Error level - for error conditions
   * Always logged
   */
  error(...args: unknown[]): void {
    const { message, meta } = normalizeArgs(args);
    log('error', message, meta);
  },

  /**
   * Create a child logger with preset context
   */
  child(context: LogContext): ChildLogger {
    return new ChildLogger(context);
  },
};

// ============================================================================
// CHILD LOGGER (with preset context)
// ============================================================================

class ChildLogger {
  constructor(private context: LogContext) {}

  debug(message: string, meta?: Record<string, unknown>): void {
    log('debug', message, { ...this.context, ...meta });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    log('info', message, { ...this.context, ...meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    log('warn', message, { ...this.context, ...meta });
  }

  error(message: string, meta?: Record<string, unknown>): void {
    log('error', message, { ...this.context, ...meta });
  }
}

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      requestLogger?: ChildLogger;
    }
  }
}

/**
 * Middleware to add correlation ID and request logging
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Get or generate correlation ID
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  req.correlationId = correlationId;

  // Set correlation ID in response header
  res.setHeader('x-correlation-id', correlationId);

  // Create child logger for this request
  req.requestLogger = logger.child({
    correlationId,
    method: req.method,
    path: req.path,
  });

  // Log request start
  const startTime = Date.now();
  req.requestLogger.info('Request started', {
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.socket.remoteAddress,
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    log(level, 'Request completed', {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}

// ============================================================================
// ERROR LOGGING HELPER
// ============================================================================

/**
 * Format error for logging
 */
export function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const result: Record<string, unknown> = {
      errorName: error.name,
      errorMessage: error.message,
    };
    if (config.isDevelopment && error.stack) {
      result.stack = error.stack;
    }
    // Include any additional properties from the error
    const errorObj = error as Error & Record<string, unknown>;
    for (const key of Object.keys(errorObj)) {
      if (!['name', 'message', 'stack'].includes(key)) {
        result[key] = errorObj[key];
      }
    }
    return result;
  }
  return { error: String(error) };
}

/**
 * Log an error with full context
 */
export function logError(message: string, error: unknown, meta?: Record<string, unknown>): void {
  logger.error(message, {
    ...formatError(error),
    ...meta,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default logger;
