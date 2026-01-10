/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse with configurable limits.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;      // Custom error message
  keyGenerator?: (req: Request) => string;  // Custom key generator
  skip?: (req: Request) => boolean;  // Skip rate limiting for certain requests
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// ============================================================================
// IN-MEMORY STORE
// Simple store for development - use Redis in production
// ============================================================================

const stores = new Map<string, Map<string, RateLimitStore>>();

function getStore(name: string): Map<string, RateLimitStore> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

// Cleanup expired entries periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  stores.forEach((store) => {
    store.forEach((value, key) => {
      if (value.resetTime < now) {
        store.delete(key);
      }
    });
  });
}, 60000); // Clean up every minute

// Allow cleanup interval to not prevent process exit
cleanupInterval.unref();

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
// RATE LIMITER FACTORY
// ============================================================================

export function createRateLimiter(name: string, options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
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
// PRE-CONFIGURED RATE LIMITERS
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
 * File upload rate limiter
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
// EXPORTS
// ============================================================================

export default {
  createRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  leadCreationRateLimiter,
  checkoutRateLimiter,
  uploadRateLimiter,
  adminRateLimiter,
};
