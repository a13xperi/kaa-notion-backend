/**
 * Cache Service
 * Redis-based caching for API responses and frequently accessed data
 */

import { createClient, RedisClientType } from 'redis';

// ============================================
// TYPES
// ============================================

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
}

interface CachedItem<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
  tags?: string[];
}

type RedisClient = RedisClientType;

// ============================================
// CONFIGURATION
// ============================================

const CACHE_PREFIX = 'sage:';
const DEFAULT_TTL = 300; // 5 minutes
const TAG_PREFIX = 'tag:';

// TTL presets in seconds
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const;

// Cache keys for common entities
export const CACHE_KEYS = {
  // User data
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:${id}:profile`,

  // Project data
  project: (id: string) => `project:${id}`,
  projectList: (userId: string) => `projects:user:${userId}`,
  projectDetail: (id: string) => `project:${id}:detail`,

  // Dashboard data
  adminDashboard: () => 'admin:dashboard',
  adminStats: (period: string) => `admin:stats:${period}`,
  analyticsData: (type: string, period: string) => `analytics:${type}:${period}`,

  // Tier data
  tiers: () => 'tiers:all',
  tier: (id: number) => `tier:${id}`,

  // Notification counts
  unreadCount: (userId: string) => `notifications:unread:${userId}`,
} as const;

// ============================================
// CLIENT MANAGEMENT
// ============================================

let client: RedisClient | null = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
export async function initializeCache(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('[Cache] REDIS_URL not set, caching disabled');
    return;
  }

  try {
    client = createClient({ url: redisUrl });

    client.on('error', (err) => {
      console.error('[Cache] Redis error:', err);
      isConnected = false;
    });

    client.on('connect', () => {
      console.log('[Cache] Connected to Redis');
      isConnected = true;
    });

    client.on('disconnect', () => {
      console.log('[Cache] Disconnected from Redis');
      isConnected = false;
    });

    await client.connect();
  } catch (error) {
    console.error('[Cache] Failed to connect to Redis:', error);
    client = null;
  }
}

/**
 * Close Redis connection
 */
export async function closeCache(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    isConnected = false;
  }
}

/**
 * Check if cache is available
 */
export function isCacheAvailable(): boolean {
  return isConnected && client !== null;
}

// ============================================
// CORE CACHE OPERATIONS
// ============================================

/**
 * Get item from cache
 */
export async function get<T>(key: string): Promise<T | null> {
  if (!isCacheAvailable()) return null;

  try {
    const fullKey = `${CACHE_PREFIX}${key}`;
    const data = await client!.get(fullKey);

    if (!data) return null;

    const item: CachedItem<T> = JSON.parse(data);

    // Check if expired (shouldn't happen with Redis TTL, but just in case)
    if (Date.now() > item.expiresAt) {
      await del(key);
      return null;
    }

    return item.data;
  } catch (error) {
    console.error('[Cache] Get error:', error);
    return null;
  }
}

/**
 * Set item in cache
 */
export async function set<T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): Promise<boolean> {
  if (!isCacheAvailable()) return false;

  try {
    const ttl = options.ttl || DEFAULT_TTL;
    const fullKey = `${CACHE_PREFIX}${key}`;

    const item: CachedItem<T> = {
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000,
      tags: options.tags,
    };

    await client!.setEx(fullKey, ttl, JSON.stringify(item));

    // Store key references for tags
    if (options.tags?.length) {
      await Promise.all(
        options.tags.map((tag) =>
          client!.sAdd(`${CACHE_PREFIX}${TAG_PREFIX}${tag}`, fullKey)
        )
      );
    }

    return true;
  } catch (error) {
    console.error('[Cache] Set error:', error);
    return false;
  }
}

/**
 * Delete item from cache
 */
export async function del(key: string): Promise<boolean> {
  if (!isCacheAvailable()) return false;

  try {
    const fullKey = `${CACHE_PREFIX}${key}`;
    await client!.del(fullKey);
    return true;
  } catch (error) {
    console.error('[Cache] Delete error:', error);
    return false;
  }
}

/**
 * Delete multiple items from cache
 */
export async function delMany(keys: string[]): Promise<boolean> {
  if (!isCacheAvailable() || keys.length === 0) return false;

  try {
    const fullKeys = keys.map((k) => `${CACHE_PREFIX}${k}`);
    await client!.del(fullKeys);
    return true;
  } catch (error) {
    console.error('[Cache] Delete many error:', error);
    return false;
  }
}

/**
 * Delete all items with a specific tag
 */
export async function invalidateTag(tag: string): Promise<boolean> {
  if (!isCacheAvailable()) return false;

  try {
    const tagKey = `${CACHE_PREFIX}${TAG_PREFIX}${tag}`;
    const keys = await client!.sMembers(tagKey);

    if (keys.length > 0) {
      await client!.del(keys);
      await client!.del(tagKey);
    }

    return true;
  } catch (error) {
    console.error('[Cache] Invalidate tag error:', error);
    return false;
  }
}

/**
 * Invalidate multiple tags
 */
export async function invalidateTags(tags: string[]): Promise<boolean> {
  if (!isCacheAvailable() || tags.length === 0) return false;

  try {
    await Promise.all(tags.map(invalidateTag));
    return true;
  } catch (error) {
    console.error('[Cache] Invalidate tags error:', error);
    return false;
  }
}

/**
 * Clear all cache
 */
export async function clear(): Promise<boolean> {
  if (!isCacheAvailable()) return false;

  try {
    const keys = await client!.keys(`${CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await client!.del(keys);
    }
    return true;
  } catch (error) {
    console.error('[Cache] Clear error:', error);
    return false;
  }
}

// ============================================
// CACHE-ASIDE PATTERN
// ============================================

/**
 * Get or set pattern - tries cache first, falls back to fetcher
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache
  const cached = await get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache (don't await, fire and forget)
  set(key, data, options).catch((err) =>
    console.error('[Cache] Background set error:', err)
  );

  return data;
}

/**
 * Memoize a function with caching
 */
export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyGenerator: (...args: TArgs) => string,
  options: CacheOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = keyGenerator(...args);
    return getOrSet(key, () => fn(...args), options);
  };
}

// ============================================
// CACHE WARMING
// ============================================

interface WarmupTask {
  key: string;
  fetcher: () => Promise<unknown>;
  options?: CacheOptions;
}

/**
 * Warm up cache with frequently accessed data
 */
export async function warmCache(tasks: WarmupTask[]): Promise<void> {
  if (!isCacheAvailable()) return;

  console.log(`[Cache] Warming ${tasks.length} items...`);

  await Promise.all(
    tasks.map(async (task) => {
      try {
        const data = await task.fetcher();
        await set(task.key, data, task.options);
      } catch (error) {
        console.error(`[Cache] Warmup failed for ${task.key}:`, error);
      }
    })
  );

  console.log('[Cache] Warmup complete');
}

// ============================================
// CACHE STATS
// ============================================

interface CacheStats {
  connected: boolean;
  keys: number;
  memory: string;
  hits: number;
  misses: number;
}

/**
 * Get cache statistics
 */
export async function getStats(): Promise<CacheStats | null> {
  if (!isCacheAvailable()) return null;

  try {
    const info = await client!.info('stats');
    const memory = await client!.info('memory');
    const keyCount = await client!.dbSize();

    // Parse info strings
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);
    const memoryMatch = memory.match(/used_memory_human:([^\r\n]+)/);

    return {
      connected: true,
      keys: keyCount,
      memory: memoryMatch?.[1] || 'unknown',
      hits: parseInt(hitsMatch?.[1] || '0', 10),
      misses: parseInt(missesMatch?.[1] || '0', 10),
    };
  } catch (error) {
    console.error('[Cache] Stats error:', error);
    return null;
  }
}

// ============================================
// ENTITY-SPECIFIC CACHE HELPERS
// ============================================

/**
 * Invalidate all project-related cache for a user
 */
export async function invalidateUserProjects(userId: string): Promise<void> {
  await del(CACHE_KEYS.projectList(userId));
}

/**
 * Invalidate project detail cache
 */
export async function invalidateProject(projectId: string): Promise<void> {
  await delMany([
    CACHE_KEYS.project(projectId),
    CACHE_KEYS.projectDetail(projectId),
  ]);
}

/**
 * Invalidate admin dashboard cache
 */
export async function invalidateAdminDashboard(): Promise<void> {
  await delMany([
    CACHE_KEYS.adminDashboard(),
    CACHE_KEYS.adminStats('week'),
    CACHE_KEYS.adminStats('month'),
    CACHE_KEYS.adminStats('quarter'),
    CACHE_KEYS.adminStats('year'),
    CACHE_KEYS.adminStats('all'),
  ]);
}

/**
 * Invalidate user notification count
 */
export async function invalidateNotificationCount(userId: string): Promise<void> {
  await del(CACHE_KEYS.unreadCount(userId));
}

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

import { Request, Response, NextFunction } from 'express';

interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
}

/**
 * Express middleware for response caching
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = DEFAULT_TTL,
    keyGenerator = (req) => `route:${req.method}:${req.originalUrl}`,
    condition = () => true,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if caching disabled or condition not met
    if (!isCacheAvailable() || !condition(req)) {
      return next();
    }

    const key = keyGenerator(req);

    // Try to get cached response
    const cached = await get<{ body: unknown; contentType: string }>(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', cached.contentType);
      return res.json(cached.body);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to cache the response
    res.json = (body: unknown) => {
      // Cache the response
      set(
        key,
        {
          body,
          contentType: res.getHeader('Content-Type') || 'application/json',
        },
        { ttl }
      ).catch((err) => console.error('[Cache] Middleware set error:', err));

      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

// Export types
export type { CacheOptions, CachedItem, CacheStats, CacheMiddlewareOptions };
