/**
 * Rate Limiting Middleware
 *
 * Uses Redis for distributed rate limiting across instances.
 * Falls back to in-memory rate limiting when Redis is unavailable.
 */

import { Request, Response, NextFunction } from 'express';
import { checkRateLimit } from '../config/redis';

// In-memory fallback for when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  windowMs?: number;      // Time window in milliseconds
  maxRequests?: number;   // Max requests per window
  keyGenerator?: (req: Request) => string;  // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

const defaultOptions: Required<RateLimitOptions> = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  keyGenerator: (req) => req.ip || 'unknown',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  message: 'Too many requests, please try again later.',
};

/**
 * Create rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const config = { ...defaultOptions, ...options };
  const windowSeconds = Math.ceil(config.windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
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

// ========================================
// Preset Rate Limiters
// ========================================

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
 * Rate limiter for file uploads
 * 20 uploads per hour
 */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many file uploads, please try again later.',
  keyGenerator: (req) => `upload:${req.ip}`,
});

// Clean up memory store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}, 60000); // Every minute
