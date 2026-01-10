/**
 * Cache Service
 * Provides caching with Redis (production) or in-memory (development) backends.
 */

import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CacheConfig {
  provider: 'redis' | 'memory';
  redisUrl?: string;
  defaultTTL: number; // seconds
  keyPrefix: string;
  enabled: boolean;
}

export interface CacheOptions {
  ttl?: number; // seconds
  tags?: string[]; // for cache invalidation
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

type CacheValue = string | number | boolean | object | null;

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
  tags: string[];
}

class MemoryCache {
  private cache: Map<string, MemoryCacheEntry> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0, hitRate: 0 };

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.value;
  }

  async set(key: string, value: string, ttl: number, tags: string[] = []): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
      tags,
    });
    this.stats.sets++;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    this.stats.deletes++;
  }

  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// ============================================================================
// REDIS CACHE
// ============================================================================

class RedisCache {
  private client: import('ioredis').default | null = null;
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0, hitRate: 0 };
  private connected = false;

  async connect(redisUrl: string): Promise<void> {
    try {
      const Redis = (await import('ioredis')).default;
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 3000);
        },
      });

      this.client.on('connect', () => {
        this.connected = true;
        logger.info('Redis connected');
      });

      this.client.on('error', (err) => {
        logger.error('Redis error', { error: err.message });
      });

      this.client.on('close', () => {
        this.connected = false;
        logger.warn('Redis connection closed');
      });

      // Test connection
      await this.client.ping();
      this.connected = true;
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;

    const value = await this.client.get(key);
    
    if (value === null) {
      this.stats.misses++;
    } else {
      this.stats.hits++;
    }
    this.updateHitRate();
    
    return value;
  }

  async set(key: string, value: string, ttl: number, tags: string[] = []): Promise<void> {
    if (!this.client) return;

    await this.client.setex(key, ttl, value);
    this.stats.sets++;

    // Store tags for invalidation
    if (tags.length > 0) {
      const tagKey = `${key}:tags`;
      await this.client.setex(tagKey, ttl, JSON.stringify(tags));
      
      // Add key to each tag's set
      for (const tag of tags) {
        await this.client.sadd(`tag:${tag}`, key);
        await this.client.expire(`tag:${tag}`, ttl);
      }
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
    this.stats.deletes++;
  }

  async invalidateByTag(tag: string): Promise<number> {
    if (!this.client) return 0;

    const keys = await this.client.smembers(`tag:${tag}`);
    if (keys.length === 0) return 0;

    await this.client.del(...keys);
    await this.client.del(`tag:${tag}`);
    
    return keys.length;
  }

  async clear(): Promise<void> {
    if (!this.client) return;
    await this.client.flushdb();
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client) return [];
    return this.client.keys(pattern);
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// ============================================================================
// CACHE SERVICE
// ============================================================================

let config: CacheConfig = {
  provider: 'memory',
  defaultTTL: 300, // 5 minutes
  keyPrefix: 'sage:',
  enabled: true,
};

let memoryCache: MemoryCache | null = null;
let redisCache: RedisCache | null = null;

/**
 * Initialize the cache service
 */
export async function initCacheService(overrides: Partial<CacheConfig> = {}): Promise<void> {
  config = { ...config, ...overrides };

  if (!config.enabled) {
    logger.info('Cache service disabled');
    return;
  }

  if (config.provider === 'redis' && config.redisUrl) {
    try {
      redisCache = new RedisCache();
      await redisCache.connect(config.redisUrl);
      logger.info('Cache service initialized with Redis');
    } catch (error) {
      logger.warn('Redis connection failed, falling back to memory cache');
      memoryCache = new MemoryCache();
    }
  } else {
    memoryCache = new MemoryCache();
    logger.info('Cache service initialized with memory cache');
  }
}

/**
 * Get the active cache backend
 */
function getCache(): MemoryCache | RedisCache | null {
  if (!config.enabled) return null;
  return redisCache?.isConnected() ? redisCache : memoryCache;
}

/**
 * Build cache key with prefix
 */
function buildKey(key: string): string {
  return `${config.keyPrefix}${key}`;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get a value from cache
 */
export async function cacheGet<T = CacheValue>(key: string): Promise<T | null> {
  const cache = getCache();
  if (!cache) return null;

  const fullKey = buildKey(key);
  const value = await cache.get(fullKey);

  if (value === null) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

/**
 * Set a value in cache
 */
export async function cacheSet(
  key: string,
  value: CacheValue,
  options: CacheOptions = {}
): Promise<void> {
  const cache = getCache();
  if (!cache) return;

  const fullKey = buildKey(key);
  const ttl = options.ttl ?? config.defaultTTL;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  await cache.set(fullKey, serialized, ttl, options.tags);
}

/**
 * Delete a value from cache
 */
export async function cacheDel(key: string): Promise<void> {
  const cache = getCache();
  if (!cache) return;

  await cache.del(buildKey(key));
}

/**
 * Invalidate all cache entries with a specific tag
 */
export async function cacheInvalidateTag(tag: string): Promise<number> {
  const cache = getCache();
  if (!cache) return 0;

  return cache.invalidateByTag(tag);
}

/**
 * Clear all cache entries
 */
export async function cacheClear(): Promise<void> {
  const cache = getCache();
  if (!cache) return;

  await cache.clear();
}

/**
 * Get cache statistics
 */
export function cacheStats(): CacheStats | null {
  const cache = getCache();
  if (!cache) return null;

  return cache.getStats();
}

/**
 * Check if cache is available
 */
export function isCacheAvailable(): boolean {
  return getCache() !== null;
}

// ============================================================================
// CACHE DECORATOR / WRAPPER
// ============================================================================

/**
 * Wrap a function with caching
 */
export function withCache<T>(
  keyFn: (...args: unknown[]) => string,
  fn: (...args: unknown[]) => Promise<T>,
  options: CacheOptions = {}
): (...args: unknown[]) => Promise<T> {
  return async (...args: unknown[]): Promise<T> => {
    const key = keyFn(...args);
    
    // Try to get from cache
    const cached = await cacheGet<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    await cacheSet(key, result as CacheValue, options);
    
    return result;
  };
}

// ============================================================================
// COMMON CACHE KEYS
// ============================================================================

export const CacheKeys = {
  // User cache
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:${id}:profile`,
  
  // Project cache
  project: (id: string) => `project:${id}`,
  projectList: (clientId: string) => `projects:client:${clientId}`,
  projectMilestones: (projectId: string) => `project:${projectId}:milestones`,
  
  // Lead cache
  lead: (id: string) => `lead:${id}`,
  leadList: (page: number, limit: number) => `leads:list:${page}:${limit}`,
  
  // Pricing cache
  pricing: () => 'pricing:tiers',
  
  // Stats cache
  adminStats: () => 'admin:stats',
  
  // Session cache
  session: (token: string) => `session:${token}`,
};

// ============================================================================
// CACHE TAGS
// ============================================================================

export const CacheTags = {
  USER: 'tag:user',
  PROJECT: 'tag:project',
  LEAD: 'tag:lead',
  PRICING: 'tag:pricing',
  ADMIN: 'tag:admin',
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initCacheService,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheInvalidateTag,
  cacheClear,
  cacheStats,
  isCacheAvailable,
  withCache,
  CacheKeys,
  CacheTags,
};
