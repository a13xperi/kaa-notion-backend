/**
 * Query Optimization Utilities
 * Helpers for optimized Prisma queries with pagination, field selection, and caching.
 */

import { cacheGet, cacheSet, cacheDel, CacheOptions } from '../services/cacheService';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface QueryOptions extends PaginationParams, SortParams {
  fields?: string[];
  include?: string[];
  search?: string;
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Default pagination limits
 */
export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * Parse and validate pagination parameters
 */
export function parsePagination(params: PaginationParams): { skip: number; take: number; page: number } {
  const page = Math.max(1, params.page || PAGINATION_DEFAULTS.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION_DEFAULTS.MAX_LIMIT,
    Math.max(1, params.limit || PAGINATION_DEFAULTS.DEFAULT_LIMIT)
  );
  
  return {
    page,
    take: limit,
    skip: (page - 1) * limit,
  };
}

/**
 * Build pagination metadata
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
  nextCursor?: string
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
    nextCursor,
  };
}

/**
 * Create paginated response
 */
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    data,
    meta: buildPaginationMeta(total, page, limit),
  };
}

// ============================================================================
// FIELD SELECTION
// ============================================================================

/**
 * Build Prisma select object from field list
 * Prevents over-fetching by selecting only requested fields
 */
export function buildSelect(fields?: string[]): Record<string, boolean> | undefined {
  if (!fields || fields.length === 0) return undefined;
  
  const select: Record<string, boolean> = {};
  for (const field of fields) {
    // Handle nested fields (e.g., 'user.name')
    if (field.includes('.')) {
      const [parent, ...rest] = field.split('.');
      if (!select[parent]) {
        select[parent] = true; // Will need to handle nested select separately
      }
    } else {
      select[field] = true;
    }
  }
  
  return select;
}

/**
 * Build Prisma include object from relations list
 * Prevents N+1 queries by including relations upfront
 */
export function buildInclude(relations?: string[]): Record<string, boolean | object> | undefined {
  if (!relations || relations.length === 0) return undefined;
  
  const include: Record<string, boolean | object> = {};
  for (const relation of relations) {
    // Handle nested relations (e.g., 'projects.milestones')
    if (relation.includes('.')) {
      const [parent, ...rest] = relation.split('.');
      const nested = buildInclude(rest);
      include[parent] = nested ? { include: nested } : true;
    } else {
      include[relation] = true;
    }
  }
  
  return include;
}

// ============================================================================
// SORTING
// ============================================================================

/**
 * Build Prisma orderBy from sort parameters
 */
export function buildOrderBy(
  params: SortParams,
  allowedFields: string[],
  defaultSort?: { field: string; order: 'asc' | 'desc' }
): Record<string, 'asc' | 'desc'> | undefined {
  const { sortBy, sortOrder = 'asc' } = params;
  
  if (sortBy && allowedFields.includes(sortBy)) {
    return { [sortBy]: sortOrder };
  }
  
  if (defaultSort) {
    return { [defaultSort.field]: defaultSort.order };
  }
  
  return undefined;
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Build Prisma where clause for text search across multiple fields
 */
export function buildSearchWhere(
  search: string | undefined,
  searchFields: string[]
): object | undefined {
  if (!search || searchFields.length === 0) return undefined;
  
  const searchTerm = search.trim();
  if (!searchTerm) return undefined;
  
  return {
    OR: searchFields.map((field) => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    })),
  };
}

// ============================================================================
// CACHED QUERIES
// ============================================================================

/**
 * Execute a query with caching
 */
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(cacheKey);
  if (cached !== null) {
    logger.debug('Query cache hit', { key: cacheKey });
    return cached;
  }
  
  // Execute query
  const result = await queryFn();
  
  // Cache result
  await cacheSet(cacheKey, result as object, options);
  logger.debug('Query cached', { key: cacheKey });
  
  return result;
}

/**
 * Invalidate cached query results
 */
export async function invalidateCachedQuery(cacheKey: string): Promise<void> {
  await cacheDel(cacheKey);
  logger.debug('Query cache invalidated', { key: cacheKey });
}

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Build a complete Prisma findMany query with all optimizations
 */
export function buildFindManyArgs(options: QueryOptions, allowedSortFields: string[] = []) {
  const { skip, take, page } = parsePagination(options);
  
  return {
    skip,
    take,
    select: buildSelect(options.fields),
    include: buildInclude(options.include),
    orderBy: buildOrderBy(options, allowedSortFields),
    _meta: { page, limit: take }, // For pagination meta
  };
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Chunk array for batch processing
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Process items in batches to avoid overwhelming the database
 */
export async function batchProcess<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  batchSize = 10
): Promise<R[]> {
  const results: R[] = [];
  const chunks = chunkArray(items, batchSize);
  
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(processFn));
    results.push(...chunkResults);
  }
  
  return results;
}

/**
 * Process items in batches with concurrency control
 */
export async function batchProcessConcurrent<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  options: { batchSize?: number; concurrency?: number } = {}
): Promise<R[]> {
  const { batchSize = 10, concurrency = 3 } = options;
  const results: R[] = [];
  const chunks = chunkArray(items, batchSize);
  
  // Process chunks with concurrency limit
  for (let i = 0; i < chunks.length; i += concurrency) {
    const concurrentChunks = chunks.slice(i, i + concurrency);
    const chunkPromises = concurrentChunks.map((chunk) =>
      Promise.all(chunk.map(processFn))
    );
    const concurrentResults = await Promise.all(chunkPromises);
    results.push(...concurrentResults.flat());
  }
  
  return results;
}

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

/**
 * Build date range filter for queries
 */
export function buildDateRangeWhere(
  field: string,
  startDate?: Date,
  endDate?: Date
): object | undefined {
  if (!startDate && !endDate) return undefined;
  
  const where: Record<string, object> = {};
  const conditions: object[] = [];
  
  if (startDate) {
    conditions.push({ [field]: { gte: startDate } });
  }
  if (endDate) {
    conditions.push({ [field]: { lte: endDate } });
  }
  
  if (conditions.length === 1) {
    return conditions[0];
  }
  
  return { AND: conditions };
}

/**
 * Calculate date range for common periods
 */
export function getDateRange(period: 'day' | 'week' | 'month' | 'quarter' | 'year'): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const endDate = new Date(now);
  let startDate: Date;
  
  switch (period) {
    case 'day':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
  }
  
  return { startDate, endDate };
}

// ============================================================================
// QUERY PERFORMANCE TRACKING
// ============================================================================

interface QueryMetrics {
  count: number;
  totalDuration: number;
  avgDuration: number;
  slowQueries: number;
}

const queryMetrics = new Map<string, QueryMetrics>();
const SLOW_QUERY_THRESHOLD_MS = 1000;

/**
 * Track query performance
 */
export function trackQuery(queryName: string, durationMs: number): void {
  const existing = queryMetrics.get(queryName) || {
    count: 0,
    totalDuration: 0,
    avgDuration: 0,
    slowQueries: 0,
  };
  
  existing.count++;
  existing.totalDuration += durationMs;
  existing.avgDuration = existing.totalDuration / existing.count;
  if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
    existing.slowQueries++;
    logger.warn('Slow query detected', { queryName, durationMs });
  }
  
  queryMetrics.set(queryName, existing);
}

/**
 * Get query metrics
 */
export function getQueryMetrics(): Map<string, QueryMetrics> {
  return new Map(queryMetrics);
}

/**
 * Clear query metrics
 */
export function clearQueryMetrics(): void {
  queryMetrics.clear();
}

/**
 * Measure query execution time
 */
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await queryFn();
    trackQuery(queryName, Date.now() - start);
    return result;
  } catch (error) {
    trackQuery(queryName, Date.now() - start);
    throw error;
  }
}
