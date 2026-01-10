/**
 * Audit Service
 *
 * Logs user actions to audit_log table for:
 * - Security compliance and monitoring
 * - Activity tracking and debugging
 * - Change history for resources
 */

import { Request } from 'express';
import { prisma } from '../utils/prisma';

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Audit action types
 */
export const AuditActions = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  TOKEN_REFRESH: 'TOKEN_REFRESH',

  // Lead operations
  LEAD_CREATE: 'LEAD_CREATE',
  LEAD_UPDATE: 'LEAD_UPDATE',
  LEAD_STATUS_CHANGE: 'LEAD_STATUS_CHANGE',
  LEAD_TIER_OVERRIDE: 'LEAD_TIER_OVERRIDE',
  LEAD_CONVERT: 'LEAD_CONVERT',
  LEAD_DELETE: 'LEAD_DELETE',

  // Client operations
  CLIENT_CREATE: 'CLIENT_CREATE',
  CLIENT_UPDATE: 'CLIENT_UPDATE',
  CLIENT_DELETE: 'CLIENT_DELETE',

  // Project operations
  PROJECT_CREATE: 'PROJECT_CREATE',
  PROJECT_UPDATE: 'PROJECT_UPDATE',
  PROJECT_STATUS_CHANGE: 'PROJECT_STATUS_CHANGE',
  PROJECT_DELETE: 'PROJECT_DELETE',

  // Milestone operations
  MILESTONE_CREATE: 'MILESTONE_CREATE',
  MILESTONE_UPDATE: 'MILESTONE_UPDATE',
  MILESTONE_STATUS_CHANGE: 'MILESTONE_STATUS_CHANGE',
  MILESTONE_DELETE: 'MILESTONE_DELETE',

  // Deliverable operations
  DELIVERABLE_CREATE: 'DELIVERABLE_CREATE',
  DELIVERABLE_UPDATE: 'DELIVERABLE_UPDATE',
  DELIVERABLE_DELETE: 'DELIVERABLE_DELETE',
  DELIVERABLE_DOWNLOAD: 'DELIVERABLE_DOWNLOAD',

  // Payment operations
  PAYMENT_CREATE: 'PAYMENT_CREATE',
  PAYMENT_UPDATE: 'PAYMENT_UPDATE',
  PAYMENT_REFUND: 'PAYMENT_REFUND',
  CHECKOUT_START: 'CHECKOUT_START',
  CHECKOUT_COMPLETE: 'CHECKOUT_COMPLETE',

  // File operations
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DELETE: 'FILE_DELETE',
  FILE_DOWNLOAD: 'FILE_DOWNLOAD',

  // Admin operations
  ADMIN_USER_CREATE: 'ADMIN_USER_CREATE',
  ADMIN_USER_UPDATE: 'ADMIN_USER_UPDATE',
  ADMIN_USER_DELETE: 'ADMIN_USER_DELETE',
  ADMIN_SETTINGS_CHANGE: 'ADMIN_SETTINGS_CHANGE',

  // Sync operations
  SYNC_NOTION_START: 'SYNC_NOTION_START',
  SYNC_NOTION_COMPLETE: 'SYNC_NOTION_COMPLETE',
  SYNC_NOTION_FAIL: 'SYNC_NOTION_FAIL',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

/**
 * Resource types for audit logging
 */
export const ResourceTypes = {
  USER: 'USER',
  CLIENT: 'CLIENT',
  LEAD: 'LEAD',
  PROJECT: 'PROJECT',
  MILESTONE: 'MILESTONE',
  DELIVERABLE: 'DELIVERABLE',
  PAYMENT: 'PAYMENT',
  FILE: 'FILE',
  SETTINGS: 'SETTINGS',
} as const;

export type ResourceType = (typeof ResourceTypes)[keyof typeof ResourceTypes];

/**
 * Audit log entry data
 */
export interface AuditLogData {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  userId?: string;
  details?: Record<string, unknown>;
  metadata?: {
    ip?: string;
    userAgent?: string;
    requestId?: string;
    duration?: number;
  };
}

/**
 * Audit log query options
 */
export interface AuditLogQueryOptions {
  action?: AuditAction | AuditAction[];
  resourceType?: ResourceType;
  resourceId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

// ============================================
// CORE LOGGING FUNCTIONS
// ============================================

/**
 * Log an audit event
 */
export async function logAudit(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId || null,
        userId: data.userId || null,
        details: data.details ? JSON.stringify(data.details) : null,
        ip: data.metadata?.ip || null,
        userAgent: data.metadata?.userAgent || null,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    // Log to console but don't throw - audit logging should never break the main flow
    console.error('[AuditService] Failed to log audit event:', {
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Log an audit event from an Express request
 */
export async function logAuditFromRequest(
  req: Request,
  action: AuditAction,
  resourceType: ResourceType,
  resourceId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  const user = (req as Request & { user?: { userId: string } }).user;

  await logAudit({
    action,
    resourceType,
    resourceId,
    userId: user?.userId,
    details,
    metadata: {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: (req as Request & { id?: string }).id,
    },
  });
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Query audit logs with filtering and pagination
 */
export async function queryAuditLogs(options: AuditLogQueryOptions = {}) {
  const {
    action,
    resourceType,
    resourceId,
    userId,
    startDate,
    endDate,
    page = 1,
    pageSize = 50,
  } = options;

  const where: Record<string, unknown> = {};

  if (action) {
    where.action = Array.isArray(action) ? { in: action } : action;
  }

  if (resourceType) {
    where.resourceType = resourceType;
  }

  if (resourceId) {
    where.resourceId = resourceId;
  }

  if (userId) {
    where.userId = userId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      (where.createdAt as Record<string, Date>).gte = startDate;
    }
    if (endDate) {
      (where.createdAt as Record<string, Date>).lte = endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details as string) : null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLog(
  resourceType: ResourceType,
  resourceId: string,
  limit = 50
) {
  const logs = await prisma.auditLog.findMany({
    where: {
      resourceType,
      resourceId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return logs.map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details as string) : null,
  }));
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLog(userId: string, limit = 50) {
  const logs = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details as string) : null,
  }));
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Log authentication event
 */
export async function logAuth(
  action: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'PASSWORD_CHANGE' | 'PASSWORD_RESET',
  userId: string,
  req: Request,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditFromRequest(req, AuditActions[action], ResourceTypes.USER, userId, details);
}

/**
 * Log lead event
 */
export async function logLeadAction(
  req: Request,
  action: keyof typeof AuditActions,
  leadId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditFromRequest(
    req,
    AuditActions[action] as AuditAction,
    ResourceTypes.LEAD,
    leadId,
    details
  );
}

/**
 * Log project event
 */
export async function logProjectAction(
  req: Request,
  action: keyof typeof AuditActions,
  projectId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditFromRequest(
    req,
    AuditActions[action] as AuditAction,
    ResourceTypes.PROJECT,
    projectId,
    details
  );
}

/**
 * Log milestone event
 */
export async function logMilestoneAction(
  req: Request,
  action: keyof typeof AuditActions,
  milestoneId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditFromRequest(
    req,
    AuditActions[action] as AuditAction,
    ResourceTypes.MILESTONE,
    milestoneId,
    details
  );
}

/**
 * Log deliverable event
 */
export async function logDeliverableAction(
  req: Request,
  action: keyof typeof AuditActions,
  deliverableId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditFromRequest(
    req,
    AuditActions[action] as AuditAction,
    ResourceTypes.DELIVERABLE,
    deliverableId,
    details
  );
}

/**
 * Log payment event
 */
export async function logPaymentAction(
  req: Request | null,
  action: keyof typeof AuditActions,
  paymentId: string,
  userId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  if (req) {
    await logAuditFromRequest(
      req,
      AuditActions[action] as AuditAction,
      ResourceTypes.PAYMENT,
      paymentId,
      details
    );
  } else {
    // For webhook-triggered events without a request context
    await logAudit({
      action: AuditActions[action] as AuditAction,
      resourceType: ResourceTypes.PAYMENT,
      resourceId: paymentId,
      userId,
      details,
    });
  }
}

/**
 * Log file operation
 */
export async function logFileAction(
  req: Request,
  action: 'FILE_UPLOAD' | 'FILE_DELETE' | 'FILE_DOWNLOAD',
  fileId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditFromRequest(req, AuditActions[action], ResourceTypes.FILE, fileId, details);
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Create audit logging middleware for specific actions
 */
export function auditMiddleware(
  action: AuditAction,
  resourceType: ResourceType,
  getResourceId?: (req: Request) => string | undefined,
  getDetails?: (req: Request) => Record<string, unknown> | undefined
) {
  return async (req: Request, _res: Response, next: () => void): Promise<void> => {
    const resourceId = getResourceId?.(req);
    const details = getDetails?.(req);

    // Log asynchronously - don't block the request
    logAuditFromRequest(req, action, resourceType, resourceId, details).catch((error) => {
      console.error('[AuditMiddleware] Failed to log:', error);
    });

    next();
  };
}

// ============================================
// CLEANUP
// ============================================

/**
 * Delete old audit logs (for data retention compliance)
 */
export async function cleanupOldLogs(retentionDays = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`[AuditService] Deleted ${result.count} audit logs older than ${retentionDays} days`);
  return result.count;
}

// ============================================
// EXPORTS
// ============================================

export default {
  logAudit,
  logAuditFromRequest,
  logAuth,
  logLeadAction,
  logProjectAction,
  logMilestoneAction,
  logDeliverableAction,
  logPaymentAction,
  logFileAction,
  queryAuditLogs,
  getResourceAuditLog,
  getUserAuditLog,
  auditMiddleware,
  cleanupOldLogs,
  AuditActions,
  ResourceTypes,
};
