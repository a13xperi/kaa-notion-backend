/**
 * Cache Middleware
 * Express middleware for automatic route-level caching.
 */

import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet, CacheOptions, CacheTags } from '../services/cacheService';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface RouteCacheOptions extends CacheOptions {
  /** Generate cache key from request (default: uses method + path + query) */
  keyGenerator?: (req: Request) => string;
  /** Condition to check before caching (default: status 200-299) */
  shouldCache?: (req: Request, res: Response) => boolean;
  /** Skip cache based on request (e.g., for authenticated requests) */
  skipCache?: (req: Request) => boolean;
  /** Include query string in cache key */
  includeQuery?: boolean;
  /** Include user ID in cache key (for per-user caching) */
  includeUser?: boolean;
}

interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  cachedAt: number;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const defaultOptions: RouteCacheOptions = {
  ttl: 60, // 1 minute default
  includeQuery: true,
  includeUser: false,
};

// ============================================================================
// KEY GENERATOR
// ============================================================================

/**
 * Generate cache key from request
 */
function defaultKeyGenerator(req: Request, options: RouteCacheOptions): string {
  const parts = [req.method, req.path];

  if (options.includeQuery && Object.keys(req.query).length > 0) {
    const queryString = Object.entries(req.query)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    parts.push(queryString);
  }

  if (options.includeUser && (req as Request & { userId?: string }).userId) {
    parts.push(`user:${(req as Request & { userId?: string }).userId}`);
  }

  return `route:${parts.join(':')}`;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Route caching middleware
 * Caches successful GET responses
 */
export function routeCache(options: RouteCacheOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests by default
    if (req.method !== 'GET') {
      return next();
    }

    // Check if we should skip caching
    if (opts.skipCache && opts.skipCache(req)) {
      return next();
    }

    // Generate cache key
    const key = opts.keyGenerator ? opts.keyGenerator(req) : defaultKeyGenerator(req, opts);

    try {
      // Try to get cached response
      const cached = await cacheGet<CachedResponse>(key);

      if (cached) {
        logger.debug('Cache hit', { key, path: req.path });
        
        // Set cached headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', key);
        res.set('Age', String(Math.floor((Date.now() - cached.cachedAt) / 1000)));
        
        Object.entries(cached.headers).forEach(([name, value]) => {
          if (!['transfer-encoding', 'connection'].includes(name.toLowerCase())) {
            res.set(name, value);
          }
        });

        res.status(cached.status).json(cached.body);
        return;
      }

      logger.debug('Cache miss', { key, path: req.path });
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', key);

    } catch (error) {
      logger.warn('Cache get error', { error, key });
    }

    // Capture the response
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown): Response {
      // Cache successful responses
      const shouldCache = opts.shouldCache
        ? opts.shouldCache(req, res)
        : res.statusCode >= 200 && res.statusCode < 300;

      if (shouldCache) {
        const cachedResponse: CachedResponse = {
          status: res.statusCode,
          headers: {
            'content-type': res.get('content-type') || 'application/json',
          },
          body,
          cachedAt: Date.now(),
        };

        cacheSet(key, cachedResponse, opts).catch((err) => {
          logger.warn('Cache set error', { error: err, key });
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Middleware to invalidate cache on mutations
 * Use after POST/PUT/DELETE handlers
 */
export function invalidateCache(tags: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (_req: Request, res: Response, next: NextFunction): void => {
    // Only invalidate on successful mutations
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // This is called after the response, so we use res.on('finish')
      res.on('finish', () => {
        // Import dynamically to avoid circular dependencies
        import('../services/cacheService').then(({ cacheInvalidateTag }) => {
          tags.forEach((tag) => {
            cacheInvalidateTag(tag).catch((err) => {
              logger.warn('Cache invalidation error', { error: err, tag });
            });
          });
        });
      });
    }
    next();
  };
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Cache for public, static content (long TTL)
 */
export const publicCache = (ttl = 3600): ReturnType<typeof routeCache> =>
  routeCache({
    ttl,
    tags: [],
    includeUser: false,
  });

/**
 * Cache for authenticated user-specific content
 */
export const userCache = (ttl = 300): ReturnType<typeof routeCache> =>
  routeCache({
    ttl,
    includeUser: true,
    tags: [CacheTags.USER],
  });

/**
 * Cache for admin statistics (short TTL)
 */
export const statsCache = (ttl = 60): ReturnType<typeof routeCache> =>
  routeCache({
    ttl,
    tags: [CacheTags.ADMIN],
    skipCache: (req) => req.query.refresh === 'true',
  });

/**
 * Cache for project listings
 */
export const projectListCache = (ttl = 120): ReturnType<typeof routeCache> =>
  routeCache({
    ttl,
    includeUser: true,
    tags: [CacheTags.PROJECT],
  });

/**
 * No-cache middleware (explicitly prevent caching)
 */
export function noCache(_req: Request, res: Response, next: NextFunction): void {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}
