/**
 * Rate Limiting Middleware
 *
 * Uses Redis for distributed rate limiting across instances.
 * Falls back to in-memory rate limiting when Redis is unavailable.
 * Protects API endpoints from abuse with configurable limits.
 */

import { Request, Response, NextFunction } from 'express';
import { checkRateLimit } from '../config/redis';
import { AppError } from '../utils/AppError';

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitOptions {
  windowMs?: number;      // Time window in milliseconds
  maxRequests?: number;   // Max requests per window
  message?: string;       // Custom error message
  keyGenerator?: (req: Request) => string;  // Custom key generator
  skip?: (req: Request) => boolean;  // Skip rate limiting for certain requests
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  count: number;
  resetTime: number;
  resetAt: number;
}

// ============================================================================
// IN-MEMORY STORES (with bounded size)
// ============================================================================

// Maximum entries per store to prevent memory leaks
const MAX_STORE_ENTRIES = parseInt(process.env.RATE_LIMIT_MAX_STORE_ENTRIES || '10000');

// Global memory store for fallback
const memoryStore = new Map<string, { count: number; resetAt: number }>();

// Named stores for different rate limiters
const stores = new Map<string, Map<string, RateLimitStore>>();

function getStore(name: string): Map<string, RateLimitStore> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

/**
 * Cleanup expired entries from a store
 */
function cleanupStore(store: Map<string, { count: number; resetAt: number } | RateLimitStore>): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * Evict oldest entries when store exceeds max size
 */
function evictOldestIfNeeded(store: Map<string, { count: number; resetAt: number } | RateLimitStore>): void {
  if (store.size <= MAX_STORE_ENTRIES) return;

  // First try to cleanup expired entries
  cleanupStore(store);

  // If still over limit, evict oldest entries (Map maintains insertion order)
  if (store.size > MAX_STORE_ENTRIES) {
    const entriesToRemove = store.size - MAX_STORE_ENTRIES;
    const iterator = store.keys();
    for (let i = 0; i < entriesToRemove; i++) {
      const key = iterator.next().value;
      if (key) store.delete(key);
    }
  }
}

// Periodic cleanup every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  cleanupStore(memoryStore);
  for (const store of stores.values()) {
    cleanupStore(store);
  }
}, CLEANUP_INTERVAL_MS);

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const defaultOptions: Required<RateLimitOptions> = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  keyGenerator: (req) => req.ip || 'unknown',
  skip: () => false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  message: 'Too many requests, please try again later.',
};

// ============================================================================
// DEFAULT KEY GENERATOR
// ============================================================================

function defaultKeyGenerator(req: Request): string {
  // Use IP address as the key
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.ip || req.socket.remoteAddress || 'unknown';
  return ip;
}

// ============================================================================
// IN-MEMORY RATE LIMITING
// ============================================================================

/**
 * In-memory rate limiting fallback
 */
function memoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  // Clean expired entry
  if (entry && entry.resetAt <= now) {
    memoryStore.delete(key);
  }

  const current = memoryStore.get(key);

  if (!current) {
    // Evict old entries if store is at capacity before adding new entry
    evictOldestIfNeeded(memoryStore);
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count++;
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetAt: current.resetAt,
  };
}

// ============================================================================
// RATE LIMITER MIDDLEWARE
// ============================================================================

/**
 * Create rate limiting middleware (with Redis support)
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const config = { ...defaultOptions, ...options };
  const windowSeconds = Math.ceil(config.windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    // Check if we should skip rate limiting
    if (config.skip && config.skip(req)) {
      return next();
    }

    const key = config.keyGenerator(req);

    try {
      const result = await checkRateLimit(key, config.maxRequests, windowSeconds);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt.getTime() / 1000));

      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: config.message,
            retryAfter: result.resetAt.toISOString(),
          },
        });
      }

      next();
    } catch (error) {
      // On error, use memory fallback
      const memResult = memoryRateLimit(key, config.maxRequests, config.windowMs);

      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', memResult.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(memResult.resetAt / 1000));

      if (!memResult.allowed) {
        res.setHeader('Retry-After', Math.ceil((memResult.resetAt - Date.now()) / 1000));
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: config.message,
            retryAfter: new Date(memResult.resetAt).toISOString(),
          },
        });
      }

      next();
    }
  };
}

/**
 * Create rate limiter with named store (in-memory only)
 */
export function createRateLimiter(name: string, options: RateLimitOptions) {
  const {
    windowMs = defaultOptions.windowMs,
    maxRequests = defaultOptions.maxRequests,
    message = defaultOptions.message,
    keyGenerator = defaultKeyGenerator,
    skip,
  } = options;

  const store = getStore(name);

  return (req: Request, res: Response, next: NextFunction) => {
    // Check if we should skip rate limiting
    if (skip && skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = store.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + windowMs,
        resetAt: now + windowMs,
      };
      store.set(key, entry);
    } else {
      // Increment count
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    // Check if over limit
    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', resetSeconds);
      return next(new AppError({
        code: 'RATE_LIMITED',
        message,
        details: { retryAfter: resetSeconds },
      }));
    }

    next();
  };
}

// ============================================================================
// PRE-CONFIGURED RATE LIMITERS (Redis-backed)
// ============================================================================

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts, please try again in 15 minutes.',
  keyGenerator: (req) => `auth:${req.ip}`,
});

/**
 * Moderate rate limiter for API endpoints
 * 100 requests per 15 minutes
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
  keyGenerator: (req) => `api:${req.ip}`,
});

/**
 * Relaxed rate limiter for public endpoints
 * 300 requests per 15 minutes
 */
export const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 300,
  keyGenerator: (req) => `public:${req.ip}`,
});

/**
 * Very strict rate limiter for password reset
 * 3 requests per hour
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  message: 'Too many password reset attempts, please try again in an hour.',
  keyGenerator: (req) => `pwreset:${req.ip}`,
});

/**
 * Rate limiter for team invite validation/acceptance
 * 10 requests per 15 minutes (prevents brute force token guessing)
 */
export const teamInviteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many invite attempts, please try again later.',
  keyGenerator: (req) => `teaminvite:${req.ip}`,
});

/**
 * Rate limiter for file uploads
 * 20 uploads per hour
 */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many file uploads, please try again later.',
  keyGenerator: (req) => `upload:${req.ip}`,
});

// ============================================================================
// PRE-CONFIGURED RATE LIMITERS (In-memory with named stores)
// ============================================================================

/**
 * General API rate limiter
 * 100 requests per minute per IP
 */
export const apiRateLimiter = createRateLimiter('api', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many API requests. Please slow down.',
});

/**
 * Auth rate limiter (stricter)
 * 10 attempts per 15 minutes per IP
 */
export const authRateLimiter = createRateLimiter('auth', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

/**
 * Lead creation rate limiter
 * 5 leads per hour per IP
 */
export const leadCreationRateLimiter = createRateLimiter('lead-creation', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Too many lead submissions. Please try again later.',
});

/**
 * Checkout rate limiter
 * 10 checkout attempts per hour per IP
 */
export const checkoutRateLimiter = createRateLimiter('checkout', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Too many checkout attempts. Please try again later.',
});

/**
 * File upload rate limiter (in-memory variant)
 * 20 uploads per hour per IP
 */
export const uploadRateLimiter = createRateLimiter('upload', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
  message: 'Too many file uploads. Please try again later.',
});

/**
 * Admin rate limiter (more lenient)
 * 500 requests per minute
 */
export const adminRateLimiter = createRateLimiter('admin', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 500,
  message: 'Too many admin requests.',
  skip: (req) => {
    // Skip for health checks
    return req.path === '/health';
  },
});

// ============================================================================
// CLEANUP
// ============================================================================

// Clean up memory store periodically
const memoryCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}, 60000); // Every minute

// Cleanup named stores periodically
const storeCleanupInterval = setInterval(() => {
  const now = Date.now();
  stores.forEach((store) => {
    store.forEach((value, key) => {
      if (value.resetTime < now) {
        store.delete(key);
      }
    });
  });
}, 60000); // Clean up every minute

// Allow cleanup intervals to not prevent process exit
memoryCleanupInterval.unref();
storeCleanupInterval.unref();

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  rateLimit,
  createRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  leadCreationRateLimiter,
  checkoutRateLimiter,
  uploadRateLimiter,
  adminRateLimiter,
  // Redis-backed exports
  authRateLimit,
  apiRateLimit,
  publicRateLimit,
  passwordResetRateLimit,
  teamInviteRateLimit,
  uploadRateLimit,
};
