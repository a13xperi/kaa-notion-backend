/**
 * Cache Service Tests
 */

import {
  initCacheService,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheInvalidateTag,
  cacheClear,
  cacheStats,
  isCacheAvailable,
  withCache,
  CACHE_KEYS,
  CacheTags,
} from '../cacheService';

describe('CacheService', () => {
  beforeEach(async () => {
    // Initialize with memory cache for tests
    await initCacheService({ provider: 'memory', enabled: true });
    await cacheClear();
  });

  describe('initCacheService', () => {
    it('should initialize with memory provider', async () => {
      await initCacheService({ provider: 'memory', enabled: true });
      expect(isCacheAvailable()).toBe(true);
    });

    it('should respect enabled=false', async () => {
      await initCacheService({ provider: 'memory', enabled: false });
      expect(isCacheAvailable()).toBe(false);
    });
  });

  describe('cacheGet / cacheSet', () => {
    it('should set and get string values', async () => {
      await cacheSet('test:string', 'hello');
      const value = await cacheGet<string>('test:string');
      expect(value).toBe('hello');
    });

    it('should set and get object values', async () => {
      const obj = { id: '123', name: 'Test' };
      await cacheSet('test:object', obj);
      const value = await cacheGet<typeof obj>('test:object');
      expect(value).toEqual(obj);
    });

    it('should set and get number values', async () => {
      await cacheSet('test:number', 42);
      const value = await cacheGet<number>('test:number');
      expect(value).toBe(42);
    });

    it('should set and get boolean values', async () => {
      await cacheSet('test:bool', true);
      const value = await cacheGet<boolean>('test:bool');
      expect(value).toBe(true);
    });

    it('should set and get array values', async () => {
      const arr = [1, 2, 3, 'test'];
      await cacheSet('test:array', arr);
      const value = await cacheGet<typeof arr>('test:array');
      expect(value).toEqual(arr);
    });

    it('should return null for non-existent keys', async () => {
      const value = await cacheGet('nonexistent');
      expect(value).toBeNull();
    });

    it('should respect TTL expiration', async () => {
      await cacheSet('test:ttl', 'value', { ttl: 1 }); // 1 second TTL
      
      // Should exist immediately
      let value = await cacheGet('test:ttl');
      expect(value).toBe('value');
      
      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      
      value = await cacheGet('test:ttl');
      expect(value).toBeNull();
    });
  });

  describe('cacheDel', () => {
    it('should delete existing keys', async () => {
      await cacheSet('test:del', 'value');
      expect(await cacheGet('test:del')).toBe('value');
      
      await cacheDel('test:del');
      expect(await cacheGet('test:del')).toBeNull();
    });

    it('should not throw for non-existent keys', async () => {
      await expect(cacheDel('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('cacheInvalidateTag', () => {
    it('should invalidate all entries with a tag', async () => {
      await cacheSet('item1', 'value1', { tags: ['category:a'] });
      await cacheSet('item2', 'value2', { tags: ['category:a'] });
      await cacheSet('item3', 'value3', { tags: ['category:b'] });
      
      const count = await cacheInvalidateTag('category:a');
      
      expect(count).toBe(2);
      expect(await cacheGet('item1')).toBeNull();
      expect(await cacheGet('item2')).toBeNull();
      expect(await cacheGet('item3')).toBe('value3'); // Should remain
    });

    it('should return 0 for non-existent tags', async () => {
      const count = await cacheInvalidateTag('nonexistent');
      expect(count).toBe(0);
    });
  });

  describe('cacheClear', () => {
    it('should clear all entries', async () => {
      await cacheSet('key1', 'value1');
      await cacheSet('key2', 'value2');
      
      await cacheClear();
      
      expect(await cacheGet('key1')).toBeNull();
      expect(await cacheGet('key2')).toBeNull();
    });
  });

  describe('cacheStats', () => {
    it('should track cache hits', async () => {
      await cacheClear();
      await cacheSet('test', 'value');
      await cacheGet('test');
      await cacheGet('test');
      
      const stats = cacheStats();
      expect(stats?.hits).toBe(2);
    });

    it('should track cache misses', async () => {
      await cacheClear();
      await cacheGet('miss1');
      await cacheGet('miss2');
      
      const stats = cacheStats();
      expect(stats?.misses).toBe(2);
    });

    it('should calculate hit rate', async () => {
      await cacheClear();
      await cacheSet('test', 'value');
      await cacheGet('test'); // hit
      await cacheGet('miss'); // miss
      
      const stats = cacheStats();
      expect(stats?.hitRate).toBe(0.5);
    });

    it('should track sets and deletes', async () => {
      await cacheClear();
      await cacheSet('key1', 'value1');
      await cacheSet('key2', 'value2');
      await cacheDel('key1');
      
      const stats = cacheStats();
      expect(stats?.sets).toBe(2);
      expect(stats?.deletes).toBe(1);
    });
  });

  describe('withCache', () => {
    it('should cache function results', async () => {
      let callCount = 0;
      const expensiveFn = async (...args: unknown[]) => {
        const id = args[0] as string;
        callCount++;
        return { id, data: `Data for ${id}` };
      };

      const cachedFn = withCache(
        (id: unknown) => `fn:${id}`,
        expensiveFn
      );

      // First call - executes function
      const result1 = await cachedFn('test');
      expect(result1).toEqual({ id: 'test', data: 'Data for test' });
      expect(callCount).toBe(1);

      // Second call - from cache
      const result2 = await cachedFn('test');
      expect(result2).toEqual({ id: 'test', data: 'Data for test' });
      expect(callCount).toBe(1); // Still 1, function not called

      // Different argument - executes function
      const result3 = await cachedFn('other');
      expect(result3).toEqual({ id: 'other', data: 'Data for other' });
      expect(callCount).toBe(2);
    });

    it('should respect TTL in wrapped function', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return 'result';
      };

      const cachedFn = withCache(() => 'short-ttl', fn, { ttl: 1 });

      await cachedFn();
      expect(callCount).toBe(1);

      await cachedFn();
      expect(callCount).toBe(1); // cached

      await new Promise((resolve) => setTimeout(resolve, 1100));

      await cachedFn();
      expect(callCount).toBe(2); // expired, called again
    });
  });

  describe('CACHE_KEYS', () => {
    it('should generate correct user keys', () => {
      expect(CACHE_KEYS.user('123')).toBe('user:123');
      expect(CACHE_KEYS.userProfile('123')).toBe('user:123:profile');
    });

    it('should generate correct project keys', () => {
      expect(CACHE_KEYS.project('abc')).toBe('project:abc');
      expect(CACHE_KEYS.projectList('user1')).toBe('projects:user:user1');
      expect(CACHE_KEYS.projectMilestones('proj1')).toBe('project:proj1:milestones');
    });

    it('should generate correct lead keys', () => {
      expect(CACHE_KEYS.lead('lead1')).toBe('lead:lead1');
      expect(CACHE_KEYS.leadList(1, 10)).toBe('leads:list:1:10');
    });

    it('should generate static keys', () => {
      expect(CACHE_KEYS.pricing()).toBe('pricing:tiers');
      expect(CACHE_KEYS.adminStats('week')).toBe('admin:stats:week');
    });
  });

  describe('CacheTags', () => {
    it('should have correct tag values', () => {
      expect(CacheTags.USER).toBe('tag:user');
      expect(CacheTags.PROJECT).toBe('tag:project');
      expect(CacheTags.LEAD).toBe('tag:lead');
      expect(CacheTags.PRICING).toBe('tag:pricing');
      expect(CacheTags.ADMIN).toBe('tag:admin');
    });
  });

  describe('disabled cache', () => {
    beforeEach(async () => {
      await initCacheService({ enabled: false });
    });

    it('should return null for all gets', async () => {
      const value = await cacheGet('any-key');
      expect(value).toBeNull();
    });

    it('should not throw on set', async () => {
      await expect(cacheSet('key', 'value')).resolves.not.toThrow();
    });

    it('should not throw on delete', async () => {
      await expect(cacheDel('key')).resolves.not.toThrow();
    });

    it('should return null for stats', () => {
      expect(cacheStats()).toBeNull();
    });
  });
});
