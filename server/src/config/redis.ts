/**
 * Redis Configuration
 *
 * Provides Redis client for caching, sessions, and rate limiting queues.
 * Falls back gracefully when Redis is unavailable.
 */

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
export async function initRedis(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log('⚠️  REDIS_URL not configured - Redis features disabled');
    return null;
  }

  try {
    redisClient = createClient({ url: redisUrl });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err.message);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      isConnected = true;
    });

    redisClient.on('disconnect', () => {
      console.log('⚠️  Redis disconnected');
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    return null;
  }
}

/**
 * Get Redis client (may be null if not configured)
 */
export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return isConnected && redisClient !== null;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}

// ========================================
// Cache Utilities
// ========================================

const DEFAULT_TTL = 300; // 5 minutes

/**
 * Get cached value
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redisClient || !isConnected) return null;

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/**
 * Set cached value
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL
): Promise<boolean> {
  if (!redisClient || !isConnected) return false;

  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete cached value
 */
export async function deleteCached(key: string): Promise<boolean> {
  if (!redisClient || !isConnected) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear cache by pattern
 */
export async function clearCachePattern(pattern: string): Promise<number> {
  if (!redisClient || !isConnected) return 0;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return keys.length;
  } catch {
    return 0;
  }
}

// ========================================
// Rate Limiting
// ========================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit for a key
 *
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowSeconds - Time window in seconds
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  // If Redis unavailable, allow all requests
  if (!redisClient || !isConnected) {
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;
  const rateLimitKey = `ratelimit:${key}`;

  try {
    // Remove old entries outside the window
    await redisClient.zRemRangeByScore(rateLimitKey, 0, windowStart);

    // Count current requests in window
    const currentCount = await redisClient.zCard(rateLimitKey);

    if (currentCount >= maxRequests) {
      // Get oldest entry to calculate reset time
      const oldestEntries = await redisClient.zRange(rateLimitKey, 0, 0);
      const oldestTimestamp = oldestEntries.length > 0 ? parseInt(oldestEntries[0]) : now;
      const resetAt = new Date(oldestTimestamp + windowMs);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add current request
    await redisClient.zAdd(rateLimitKey, { score: now, value: now.toString() });
    await redisClient.expire(rateLimitKey, windowSeconds);

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetAt: new Date(now + windowMs),
    };
  } catch (error) {
    // On error, allow the request
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(now + windowMs),
    };
  }
}

// ========================================
// Session Storage
// ========================================

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days

/**
 * Store session data
 */
export async function setSession(
  sessionId: string,
  data: Record<string, unknown>
): Promise<boolean> {
  return setCached(`${SESSION_PREFIX}${sessionId}`, data, SESSION_TTL);
}

/**
 * Get session data
 */
export async function getSession(
  sessionId: string
): Promise<Record<string, unknown> | null> {
  return getCached(`${SESSION_PREFIX}${sessionId}`);
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  return deleteCached(`${SESSION_PREFIX}${sessionId}`);
}

/**
 * Extend session TTL
 */
export async function extendSession(sessionId: string): Promise<boolean> {
  if (!redisClient || !isConnected) return false;

  try {
    await redisClient.expire(`${SESSION_PREFIX}${sessionId}`, SESSION_TTL);
    return true;
  } catch {
    return false;
  }
}
