/**
 * Query Optimization Utilities
 * Helpers for efficient Prisma queries and avoiding N+1 problems
 */

import { Prisma } from '@prisma/client';

// ============================================
// SELECT FIELDS - Avoid over-fetching
// ============================================

/**
 * Minimal user fields for lists and references
 */
export const userSelectMinimal = {
  id: true,
  email: true,
  name: true,
  role: true,
} satisfies Prisma.UserSelect;

/**
 * User fields for profile views
 */
export const userSelectProfile = {
  ...userSelectMinimal,
  userType: true,
  tier: true,
  createdAt: true,
  lastLogin: true,
} satisfies Prisma.UserSelect;

/**
 * Minimal project fields for lists
 */
export const projectSelectMinimal = {
  id: true,
  name: true,
  status: true,
  tier: true,
  projectAddress: true,
  createdAt: true,
} satisfies Prisma.ProjectSelect;

/**
 * Project fields with progress calculation data
 */
export const projectSelectWithProgress = {
  ...projectSelectMinimal,
  paymentStatus: true,
  milestones: {
    select: {
      id: true,
      status: true,
    },
  },
} satisfies Prisma.ProjectSelect;

/**
 * Minimal client fields for references
 */
export const clientSelectMinimal = {
  id: true,
  tier: true,
  status: true,
  userId: true,
} satisfies Prisma.ClientSelect;

/**
 * Minimal lead fields for lists
 */
export const leadSelectMinimal = {
  id: true,
  email: true,
  name: true,
  status: true,
  recommendedTier: true,
  tierOverride: true,
  createdAt: true,
} satisfies Prisma.LeadSelect;

/**
 * Minimal milestone fields
 */
export const milestoneSelectMinimal = {
  id: true,
  name: true,
  order: true,
  status: true,
  dueDate: true,
  completedAt: true,
} satisfies Prisma.MilestoneSelect;

/**
 * Minimal deliverable fields
 */
export const deliverableSelectMinimal = {
  id: true,
  name: true,
  category: true,
  fileType: true,
  fileSize: true,
  createdAt: true,
} satisfies Prisma.DeliverableSelect;

/**
 * Notification fields for lists
 */
export const notificationSelectList = {
  id: true,
  type: true,
  title: true,
  message: true,
  link: true,
  read: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

/**
 * Message fields for lists
 */
export const messageSelectList = {
  id: true,
  content: true,
  isInternal: true,
  createdAt: true,
  sender: {
    select: userSelectMinimal,
  },
} satisfies Prisma.MessageSelect;

// ============================================
// INCLUDE PRESETS - Eager loading patterns
// ============================================

/**
 * Project with all related data for detail view
 */
export const projectIncludeDetail = {
  client: {
    select: {
      id: true,
      tier: true,
      user: {
        select: userSelectMinimal,
      },
    },
  },
  milestones: {
    select: milestoneSelectMinimal,
    orderBy: { order: 'asc' as const },
  },
  deliverables: {
    select: deliverableSelectMinimal,
    orderBy: { createdAt: 'desc' as const },
  },
  payments: {
    select: {
      id: true,
      amount: true,
      status: true,
      paidAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.ProjectInclude;

/**
 * Client with projects for dashboard
 */
export const clientIncludeDashboard = {
  user: {
    select: userSelectProfile,
  },
  projects: {
    select: projectSelectWithProgress,
    orderBy: { createdAt: 'desc' as const },
    take: 10,
  },
} satisfies Prisma.ClientInclude;

/**
 * Lead with conversion data
 */
export const leadIncludeConversion = {
  client: {
    select: clientSelectMinimal,
  },
  projects: {
    select: projectSelectMinimal,
    take: 1,
  },
} satisfies Prisma.LeadInclude;

// ============================================
// PAGINATION HELPERS
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/**
 * Calculate skip and take from page/limit params
 */
export function getPagination(params: PaginationParams): PaginationResult {
  const page = Math.max(1, params.page || 1);
  const maxLimit = params.maxLimit || 100;
  const limit = Math.min(Math.max(1, params.limit || 20), maxLimit);
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

/**
 * Build pagination response metadata
 */
export function buildPaginationMeta(
  total: number,
  pagination: PaginationResult
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
} {
  const totalPages = Math.ceil(total / pagination.limit);
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages,
    hasMore: pagination.page < totalPages,
  };
}

// ============================================
// BATCH LOADING HELPERS
// ============================================

/**
 * Batch load related entities to avoid N+1 queries
 * Use this when you need to load relations for multiple items
 */
export async function batchLoad<T, K extends string | number>(
  ids: K[],
  loader: (ids: K[]) => Promise<Map<K, T>>
): Promise<Map<K, T>> {
  if (ids.length === 0) {
    return new Map();
  }

  // Deduplicate IDs
  const uniqueIds = [...new Set(ids)];
  return loader(uniqueIds);
}

/**
 * Create a batch loader function for a specific entity
 */
export function createBatchLoader<T, K extends string | number>(
  fetchFn: (ids: K[]) => Promise<T[]>,
  getKey: (item: T) => K
): (ids: K[]) => Promise<Map<K, T>> {
  return async (ids: K[]) => {
    const items = await fetchFn(ids);
    const map = new Map<K, T>();
    for (const item of items) {
      map.set(getKey(item), item);
    }
    return map;
  };
}

// ============================================
// QUERY PERFORMANCE HELPERS
// ============================================

/**
 * Log slow queries in development
 */
export function wrapWithTiming<T>(
  name: string,
  fn: () => Promise<T>,
  thresholdMs = 100
): Promise<T> {
  if (process.env.NODE_ENV !== 'development') {
    return fn();
  }

  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    if (duration > thresholdMs) {
      console.warn(`[SLOW QUERY] ${name}: ${duration.toFixed(2)}ms`);
    }
  });
}

/**
 * Execute queries in parallel when they're independent
 */
export async function parallelQueries<T extends readonly unknown[]>(
  queries: { [K in keyof T]: () => Promise<T[K]> }
): Promise<T> {
  return Promise.all(queries.map((q) => q())) as Promise<T>;
}

// ============================================
// CURSOR-BASED PAGINATION
// ============================================

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  previousCursor: string | null;
  hasMore: boolean;
}

/**
 * Build cursor pagination query options
 */
export function buildCursorQuery(
  params: CursorPaginationParams,
  orderField: string = 'createdAt'
): {
  take: number;
  skip: number;
  cursor?: { id: string };
  orderBy: Record<string, 'asc' | 'desc'>;
} {
  const limit = Math.min(Math.max(1, params.limit || 20), 100);
  const direction = params.direction || 'forward';

  return {
    take: direction === 'forward' ? limit + 1 : -(limit + 1),
    skip: params.cursor ? 1 : 0,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    orderBy: { [orderField]: direction === 'forward' ? 'desc' : 'asc' },
  };
}

/**
 * Process cursor pagination results
 */
export function processCursorResult<T extends { id: string }>(
  items: T[],
  limit: number,
  direction: 'forward' | 'backward' = 'forward'
): CursorPaginationResult<T> {
  const hasMore = items.length > limit;
  const actualItems = hasMore ? items.slice(0, limit) : items;

  if (direction === 'backward') {
    actualItems.reverse();
  }

  return {
    items: actualItems,
    nextCursor: actualItems.length > 0 ? actualItems[actualItems.length - 1].id : null,
    previousCursor: actualItems.length > 0 ? actualItems[0].id : null,
    hasMore,
  };
}

// ============================================
// AGGREGATION HELPERS
// ============================================

/**
 * Count records efficiently with optional grouping
 */
export interface CountByResult {
  _count: number;
  [key: string]: string | number;
}

/**
 * Calculate progress from milestone statuses
 */
export function calculateProgress(
  milestones: Array<{ status: string }>
): number {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.status === 'COMPLETED').length;
  return Math.round((completed / milestones.length) * 100);
}

/**
 * Add progress to project list
 */
export function addProgressToProjects<
  T extends { milestones?: Array<{ status: string }> }
>(projects: T[]): Array<T & { progress: number }> {
  return projects.map((project) => ({
    ...project,
    progress: calculateProgress(project.milestones || []),
  }));
}
