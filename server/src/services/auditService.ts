/**
 * Audit Service
 * Centralized audit logging for all state-changing operations.
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import { Request } from 'express';

// ============================================================================
// TYPES
// ============================================================================

export type AuditAction =
  // Authentication
  | 'login'
  | 'logout'
  | 'register'
  | 'password_reset'
  | 'password_change'
  // Lead actions
  | 'lead_created'
  | 'lead_updated'
  | 'lead_status_changed'
  | 'lead_tier_override'
  | 'lead_converted'
  // Project actions
  | 'project_created'
  | 'project_updated'
  | 'project_status_changed'
  | 'project_deleted'
  // Milestone actions
  | 'milestone_created'
  | 'milestone_updated'
  | 'milestone_completed'
  // Deliverable actions
  | 'file_uploaded'
  | 'files_uploaded'
  | 'file_downloaded'
  | 'file_deleted'
  // Payment actions
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'payment_refunded'
  // Sync actions
  | 'notion_sync_triggered'
  | 'notion_retry_triggered'
  | 'notion_project_sync'
  // Admin actions
  | 'admin_view_dashboard'
  | 'admin_view_leads'
  | 'admin_view_projects'
  | 'admin_view_clients'
  | 'admin_export_data';

export type ResourceType =
  | 'user'
  | 'client'
  | 'lead'
  | 'project'
  | 'milestone'
  | 'deliverable'
  | 'payment'
  | 'notion_sync';

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditLogRecord {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: Date;
}

export interface AuditQueryOptions {
  userId?: string;
  action?: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// ============================================================================
// AUDIT SERVICE CLASS
// ============================================================================

export class AuditService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // LOGGING
  // ============================================================================

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<AuditLogRecord> {
    const record = await this.prisma.auditLog.create({
      data: {
        userId: entry.userId || undefined,
        action: entry.action,
        resourceType: entry.resourceType || undefined,
        resourceId: entry.resourceId || undefined,
        details: (entry.details as Prisma.InputJsonValue) || undefined,
        ipAddress: entry.ipAddress || undefined,
      },
    });

    return record as AuditLogRecord;
  }

  /**
   * Log from Express request context
   */
  async logFromRequest(
    req: Request,
    action: AuditAction,
    resourceType?: ResourceType,
    resourceId?: string,
    details?: Record<string, unknown>
  ): Promise<AuditLogRecord> {
    const user = (req as any).user;
    return this.log({
      userId: user?.id,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: this.getIpAddress(req) || undefined,
    });
  }

  /**
   * Log a batch of events
   */
  async logBatch(entries: AuditLogEntry[]): Promise<number> {
    const result = await this.prisma.auditLog.createMany({
      data: entries.map((entry) => ({
        userId: entry.userId || undefined,
        action: entry.action,
        resourceType: entry.resourceType || undefined,
        resourceId: entry.resourceId || undefined,
        details: (entry.details as Prisma.InputJsonValue) || undefined,
        ipAddress: entry.ipAddress || undefined,
      })),
    });

    return result.count;
  }

  // ============================================================================
  // QUERYING
  // ============================================================================

  /**
   * Query audit logs with filters
   */
  async query(options: AuditQueryOptions = {}): Promise<{
    logs: AuditLogRecord[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options;

    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              userType: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs as unknown as AuditLogRecord[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceHistory(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<AuditLogRecord[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        resourceType,
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            userType: true,
          },
        },
      },
    });

    return logs as unknown as AuditLogRecord[];
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    userId: string,
    limit: number = 50
  ): Promise<AuditLogRecord[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs as unknown as AuditLogRecord[];
  }

  /**
   * Get recent activity summary
   */
  async getRecentSummary(hours: number = 24): Promise<{
    total: number;
    byAction: Record<string, number>;
    byUser: Array<{ userId: string; count: number }>;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [total, byAction, byUser] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: since } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: since },
          userId: { not: null },
        },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    const actionCounts: Record<string, number> = {};
    for (const item of byAction) {
      actionCounts[item.action] = item._count;
    }

    return {
      total,
      byAction: actionCounts,
      byUser: byUser.map((item) => ({
        userId: item.userId!,
        count: item._count,
      })),
    };
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Delete old audit logs
   */
  async cleanup(olderThanDays: number = 90): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });

    return result.count;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Extract IP address from request
   */
  private getIpAddress(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || null;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let auditServiceInstance: AuditService | null = null;

/**
 * Initialize the audit service
 */
export function initAuditService(prisma: PrismaClient): AuditService {
  auditServiceInstance = new AuditService(prisma);
  return auditServiceInstance;
}

/**
 * Get the audit service instance
 */
export function getAuditService(): AuditService {
  if (!auditServiceInstance) {
    throw new Error('AuditService not initialized. Call initAuditService first.');
  }
  return auditServiceInstance;
}

export default AuditService;
