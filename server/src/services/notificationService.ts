/**
 * Notification Service
 *
 * Handles in-app notifications for users.
 */

import { NotificationType } from '@prisma/client';
import { logger } from '../config/logger';
import { prisma } from '../utils/prisma';

// ========================================
// Types
// ========================================

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface NotificationFilters {
  read?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

// ========================================
// Notification Creation
// ========================================

/**
 * Create a notification for a user
 */
export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
      },
    });

    logger.info('Notification created', {
      notificationId: notification.id,
      userId: data.userId,
      type: data.type,
    });

    return notification;
  } catch (error) {
    logger.error('Failed to create notification', { data }, error as Error);
    throw error;
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationForUsers(
  userIds: string[],
  data: Omit<CreateNotificationData, 'userId'>
) {
  const notifications = await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
    })),
  });

  logger.info('Bulk notifications created', {
    count: notifications.count,
    type: data.type,
  });

  return notifications;
}

// ========================================
// Notification Retrieval
// ========================================

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  filters: NotificationFilters = {}
) {
  const { read, type, limit = 50, offset = 0 } = filters;

  const where: any = { userId };
  if (read !== undefined) where.read = read;
  if (type) where.type = type;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  return {
    notifications,
    total,
    unreadCount,
    hasMore: offset + notifications.length < total,
  };
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

// ========================================
// Notification Management
// ========================================

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true, readAt: new Date() },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string) {
  return prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
}

/**
 * Delete old notifications (cleanup job)
 */
export async function deleteOldNotifications(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      read: true, // Only delete read notifications
    },
  });

  logger.info('Cleaned up old notifications', { deleted: result.count, daysOld });
  return result;
}

// ========================================
// Notification Triggers
// ========================================

/**
 * Notify user of project update
 */
export async function notifyProjectUpdate(
  userId: string,
  projectId: string,
  projectName: string,
  updateMessage: string
) {
  return createNotification({
    userId,
    type: 'PROJECT_UPDATE',
    title: 'Project Update',
    message: `${projectName}: ${updateMessage}`,
    link: `/projects/${projectId}`,
    resourceType: 'PROJECT',
    resourceId: projectId,
  });
}

/**
 * Notify user of milestone completion
 */
export async function notifyMilestoneCompleted(
  userId: string,
  projectId: string,
  projectName: string,
  milestoneName: string
) {
  return createNotification({
    userId,
    type: 'MILESTONE_COMPLETED',
    title: 'Milestone Completed',
    message: `${milestoneName} is now complete for "${projectName}"`,
    link: `/projects/${projectId}`,
    resourceType: 'MILESTONE',
    resourceId: projectId,
  });
}

/**
 * Notify user of new deliverable
 */
export async function notifyDeliverableReady(
  userId: string,
  projectId: string,
  projectName: string,
  deliverableName: string,
  deliverableId: string
) {
  return createNotification({
    userId,
    type: 'DELIVERABLE_READY',
    title: 'New Deliverable Available',
    message: `"${deliverableName}" is ready for download`,
    link: `/projects/${projectId}?tab=deliverables`,
    resourceType: 'DELIVERABLE',
    resourceId: deliverableId,
  });
}

/**
 * Notify user of new message
 */
export async function notifyNewMessage(
  userId: string,
  projectId: string,
  projectName: string,
  senderName: string
) {
  return createNotification({
    userId,
    type: 'MESSAGE_RECEIVED',
    title: 'New Message',
    message: `${senderName} sent a message on "${projectName}"`,
    link: `/projects/${projectId}?tab=messages`,
    resourceType: 'PROJECT',
    resourceId: projectId,
  });
}

/**
 * Notify user of payment received
 */
export async function notifyPaymentReceived(
  userId: string,
  projectId: string,
  projectName: string,
  amount: number
) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100);

  return createNotification({
    userId,
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Received',
    message: `Payment of ${formattedAmount} received for "${projectName}"`,
    link: `/projects/${projectId}`,
    resourceType: 'PROJECT',
    resourceId: projectId,
  });
}

/**
 * Notify of revision request
 */
export async function notifyRevisionRequested(
  userId: string,
  projectId: string,
  projectName: string,
  milestoneName: string,
  revisionId?: string
) {
  return createNotification({
    userId,
    type: 'REVISION_REQUESTED',
    title: 'Revision Requested',
    message: `A revision has been requested for "${milestoneName}" in "${projectName}"`,
    link: `/projects/${projectId}?tab=revisions`,
    resourceType: 'REVISION',
    resourceId: revisionId,
  });
}

/**
 * Notify of revision completion
 */
export async function notifyRevisionCompleted(
  userId: string,
  projectId: string,
  projectName: string,
  milestoneName: string
) {
  return createNotification({
    userId,
    type: 'REVISION_REQUESTED', // Re-use type for revision updates
    title: 'Revision Completed',
    message: `Your revision request for "${milestoneName}" in "${projectName}" has been completed`,
    link: `/projects/${projectId}?tab=revisions`,
    resourceType: 'PROJECT',
    resourceId: projectId,
  });
}

export default {
  create: createNotification,
  createForUsers: createNotificationForUsers,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  delete: deleteNotification,
  cleanup: deleteOldNotifications,
  // Triggers
  notifyProjectUpdate,
  notifyMilestoneCompleted,
  notifyDeliverableReady,
  notifyNewMessage,
  notifyPaymentReceived,
  notifyRevisionRequested,
  notifyRevisionCompleted,
};
