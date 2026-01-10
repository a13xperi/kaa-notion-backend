/**
 * Query Optimization Utilities Tests
 */

import {
  parsePagination,
  buildPaginationMeta,
  paginate,
  buildSelect,
  buildInclude,
  buildOrderBy,
  buildSearchWhere,
  chunkArray,
  batchProcess,
  buildDateRangeWhere,
  getDateRange,
  trackQuery,
  getQueryMetrics,
  clearQueryMetrics,
  measureQuery,
  PAGINATION_DEFAULTS,
} from '../queryOptimization';

describe('Query Optimization Utilities', () => {
  describe('parsePagination', () => {
    it('should use defaults when no params provided', () => {
      const result = parsePagination({});
      expect(result).toEqual({
        page: PAGINATION_DEFAULTS.DEFAULT_PAGE,
        take: PAGINATION_DEFAULTS.DEFAULT_LIMIT,
        skip: 0,
      });
    });

    it('should parse valid page and limit', () => {
      const result = parsePagination({ page: 3, limit: 10 });
      expect(result).toEqual({
        page: 3,
        take: 10,
        skip: 20,
      });
    });

    it('should enforce minimum page of 1', () => {
      const result = parsePagination({ page: -5 });
      expect(result.page).toBe(1);
    });

    it('should enforce maximum limit', () => {
      const result = parsePagination({ limit: 500 });
      expect(result.take).toBe(PAGINATION_DEFAULTS.MAX_LIMIT);
    });

    it('should enforce minimum limit of 1', () => {
      const result = parsePagination({ limit: -10 });
      expect(result.take).toBe(1);
    });
  });

  describe('buildPaginationMeta', () => {
    it('should calculate pagination meta correctly', () => {
      const meta = buildPaginationMeta(100, 2, 10);
      expect(meta).toEqual({
        page: 2,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasMore: true,
        nextCursor: undefined,
      });
    });

    it('should indicate no more pages when on last page', () => {
      const meta = buildPaginationMeta(25, 3, 10);
      expect(meta.hasMore).toBe(false);
    });

    it('should handle zero total', () => {
      const meta = buildPaginationMeta(0, 1, 10);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasMore).toBe(false);
    });

    it('should include nextCursor when provided', () => {
      const meta = buildPaginationMeta(100, 1, 10, 'cursor123');
      expect(meta.nextCursor).toBe('cursor123');
    });
  });

  describe('paginate', () => {
    it('should create paginated result', () => {
      const data = [1, 2, 3];
      const result = paginate(data, 30, 1, 10);
      
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.meta.total).toBe(30);
      expect(result.meta.hasMore).toBe(true);
    });
  });

  describe('buildSelect', () => {
    it('should return undefined for empty fields', () => {
      expect(buildSelect([])).toBeUndefined();
      expect(buildSelect(undefined)).toBeUndefined();
    });

    it('should build select object for simple fields', () => {
      const select = buildSelect(['id', 'name', 'email']);
      expect(select).toEqual({
        id: true,
        name: true,
        email: true,
      });
    });

    it('should handle nested fields', () => {
      const select = buildSelect(['id', 'user.name']);
      expect(select).toEqual({
        id: true,
        user: true,
      });
    });
  });

  describe('buildInclude', () => {
    it('should return undefined for empty relations', () => {
      expect(buildInclude([])).toBeUndefined();
      expect(buildInclude(undefined)).toBeUndefined();
    });

    it('should build include object for simple relations', () => {
      const include = buildInclude(['user', 'projects']);
      expect(include).toEqual({
        user: true,
        projects: true,
      });
    });

    it('should handle nested relations', () => {
      const include = buildInclude(['projects.milestones']);
      expect(include).toEqual({
        projects: { include: { milestones: true } },
      });
    });
  });

  describe('buildOrderBy', () => {
    const allowedFields = ['name', 'createdAt', 'status'];

    it('should return undefined when sortBy not in allowed fields', () => {
      const result = buildOrderBy({ sortBy: 'invalid' }, allowedFields);
      expect(result).toBeUndefined();
    });

    it('should build orderBy for valid field', () => {
      const result = buildOrderBy({ sortBy: 'name', sortOrder: 'desc' }, allowedFields);
      expect(result).toEqual({ name: 'desc' });
    });

    it('should default to asc order', () => {
      const result = buildOrderBy({ sortBy: 'name' }, allowedFields);
      expect(result).toEqual({ name: 'asc' });
    });

    it('should use default sort when no sortBy provided', () => {
      const result = buildOrderBy({}, allowedFields, { field: 'createdAt', order: 'desc' });
      expect(result).toEqual({ createdAt: 'desc' });
    });
  });

  describe('buildSearchWhere', () => {
    it('should return undefined for empty search', () => {
      expect(buildSearchWhere('', ['name'])).toBeUndefined();
      expect(buildSearchWhere(undefined, ['name'])).toBeUndefined();
      expect(buildSearchWhere('   ', ['name'])).toBeUndefined();
    });

    it('should return undefined for empty fields', () => {
      expect(buildSearchWhere('test', [])).toBeUndefined();
    });

    it('should build OR clause for search across fields', () => {
      const where = buildSearchWhere('test', ['name', 'email']);
      expect(where).toEqual({
        OR: [
          { name: { contains: 'test', mode: 'insensitive' } },
          { email: { contains: 'test', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('chunkArray', () => {
    it('should chunk array into specified sizes', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunkArray(arr, 3);
      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should handle empty array', () => {
      expect(chunkArray([], 3)).toEqual([]);
    });

    it('should handle array smaller than chunk size', () => {
      const chunks = chunkArray([1, 2], 5);
      expect(chunks).toEqual([[1, 2]]);
    });
  });

  describe('batchProcess', () => {
    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5];
      const results = await batchProcess(items, async (n) => n * 2, 2);
      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should handle empty array', async () => {
      const results = await batchProcess([], async (n: number) => n * 2);
      expect(results).toEqual([]);
    });
  });

  describe('buildDateRangeWhere', () => {
    it('should return undefined when no dates provided', () => {
      expect(buildDateRangeWhere('createdAt')).toBeUndefined();
    });

    it('should build gte filter for start date only', () => {
      const startDate = new Date('2024-01-01');
      const result = buildDateRangeWhere('createdAt', startDate);
      expect(result).toEqual({ createdAt: { gte: startDate } });
    });

    it('should build lte filter for end date only', () => {
      const endDate = new Date('2024-12-31');
      const result = buildDateRangeWhere('createdAt', undefined, endDate);
      expect(result).toEqual({ createdAt: { lte: endDate } });
    });

    it('should build AND filter for both dates', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const result = buildDateRangeWhere('createdAt', startDate, endDate);
      expect(result).toEqual({
        AND: [
          { createdAt: { gte: startDate } },
          { createdAt: { lte: endDate } },
        ],
      });
    });
  });

  describe('getDateRange', () => {
    it('should return correct range for day', () => {
      const { startDate, endDate } = getDateRange('day');
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(endDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
    });

    it('should return correct range for week', () => {
      const { startDate, endDate } = getDateRange('week');
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThanOrEqual(8); // Allow for time zone edge cases
    });

    it('should return correct range for month', () => {
      const { startDate, endDate } = getDateRange('month');
      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it('should return correct range for quarter', () => {
      const { startDate, endDate } = getDateRange('quarter');
      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it('should return correct range for year', () => {
      const { startDate, endDate } = getDateRange('year');
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(360);
    });
  });

  describe('Query Metrics', () => {
    beforeEach(() => {
      clearQueryMetrics();
    });

    describe('trackQuery', () => {
      it('should track query count', () => {
        trackQuery('testQuery', 100);
        trackQuery('testQuery', 200);
        
        const metrics = getQueryMetrics();
        expect(metrics.get('testQuery')?.count).toBe(2);
      });

      it('should calculate average duration', () => {
        trackQuery('avgQuery', 100);
        trackQuery('avgQuery', 200);
        trackQuery('avgQuery', 300);
        
        const metrics = getQueryMetrics();
        expect(metrics.get('avgQuery')?.avgDuration).toBe(200);
      });

      it('should track slow queries', () => {
        trackQuery('slowQuery', 500);
        trackQuery('slowQuery', 1500); // Over threshold
        
        const metrics = getQueryMetrics();
        expect(metrics.get('slowQuery')?.slowQueries).toBe(1);
      });
    });

    describe('clearQueryMetrics', () => {
      it('should clear all metrics', () => {
        trackQuery('query1', 100);
        trackQuery('query2', 200);
        
        clearQueryMetrics();
        
        const metrics = getQueryMetrics();
        expect(metrics.size).toBe(0);
      });
    });

    describe('measureQuery', () => {
      it('should measure and return query result', async () => {
        const result = await measureQuery('measured', async () => {
          return 'result';
        });
        
        expect(result).toBe('result');
        
        const metrics = getQueryMetrics();
        expect(metrics.get('measured')?.count).toBe(1);
      });

      it('should track duration on error', async () => {
        try {
          await measureQuery('errorQuery', async () => {
            throw new Error('test error');
          });
        } catch {
          // Expected
        }
        
        const metrics = getQueryMetrics();
        expect(metrics.get('errorQuery')?.count).toBe(1);
      });
    });
  });
});
