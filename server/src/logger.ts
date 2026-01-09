/**
 * Production-safe logger utility for backend server (TypeScript)
 *
 * - debug: Only logs in development mode (for request tracing, verbose info)
 * - info: Always logs (startup messages, important events)
 * - warn: Always logs (warnings that don't stop execution)
 * - error: Always logs (errors that need attention)
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = {
  /**
   * Debug level - only logs in development
   * Use for: request tracing, verbose debugging, temporary logs
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info level - always logs
   * Use for: startup messages, important state changes, successful operations
   */
  info: (...args: unknown[]): void => {
    console.log('[INFO]', ...args);
  },

  /**
   * Warn level - always logs
   * Use for: missing optional config, deprecation notices, recoverable issues
   */
  warn: (...args: unknown[]): void => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error level - always logs
   * Use for: errors, exceptions, failed operations
   */
  error: (...args: unknown[]): void => {
    console.error('[ERROR]', ...args);
  }
};

export default logger;
