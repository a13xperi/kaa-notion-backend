/**
 * Push Notification Service
 *
 * Handles web push notification subscriptions and delivery.
 * Uses the Web Push protocol for browser notifications.
 */

import webPush from 'web-push';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

// ========================================
// Configuration
// ========================================

// VAPID keys should be generated once and stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@sage.com';

// Configure web-push if keys are available
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ========================================
// Types
// ========================================

export interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

// ========================================
// Subscription Management
// ========================================

/**
 * Save a push subscription for a user
 */
export async function saveSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  try {
    // Store subscription in database
    // Using upsert to handle re-subscriptions
    await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        expirationTime: subscription.expirationTime,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        expirationTime: subscription.expirationTime,
      },
    });

    logger.info('Push subscription saved', { userId, endpoint: subscription.endpoint });
  } catch (error) {
    logger.error('Failed to save push subscription', { userId }, error as Error);
    throw error;
  }
}

/**
 * Remove a push subscription
 */
export async function removeSubscription(endpoint: string): Promise<void> {
  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    logger.info('Push subscription removed', { endpoint });
  } catch (error) {
    logger.error('Failed to remove push subscription', { endpoint }, error as Error);
    throw error;
  }
}

/**
 * Get all subscriptions for a user
 */
export async function getUserSubscriptions(userId: string) {
  return prisma.pushSubscription.findMany({
    where: { userId },
  });
}

// ========================================
// Notification Sending
// ========================================

/**
 * Send push notification to a specific subscription
 */
async function sendToSubscription(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn('Push notifications disabled: VAPID keys not configured');
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webPush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );
    return true;
  } catch (error: any) {
    // Handle expired/invalid subscriptions
    if (error.statusCode === 404 || error.statusCode === 410) {
      logger.info('Removing expired subscription', { endpoint: subscription.endpoint });
      await removeSubscription(subscription.endpoint);
    } else {
      logger.error('Failed to send push notification', { endpoint: subscription.endpoint }, error);
    }
    return false;
  }
}

/**
 * Send push notification to a user
 */
export async function sendToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await getUserSubscriptions(userId);

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const success = await sendToSubscription(subscription, payload);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  logger.info('Push notifications sent to user', { userId, sent, failed });
  return { sent, failed };
}

/**
 * Send push notification to multiple users
 */
export async function sendToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const { sent, failed } = await sendToUser(userId, payload);
    totalSent += sent;
    totalFailed += failed;
  }

  return { sent: totalSent, failed: totalFailed };
}

/**
 * Broadcast push notification to all subscribed users
 */
export async function broadcast(
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await prisma.pushSubscription.findMany();

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const success = await sendToSubscription(subscription, payload);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  logger.info('Broadcast push notification', { sent, failed });
  return { sent, failed };
}

// ========================================
// Notification Triggers
// ========================================

/**
 * Send project update notification
 */
export async function notifyProjectUpdate(
  userId: string,
  projectName: string,
  message: string
): Promise<void> {
  await sendToUser(userId, {
    title: 'Project Update',
    body: `${projectName}: ${message}`,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'project-update',
    data: {
      type: 'PROJECT_UPDATE',
      url: '/projects',
    },
    actions: [
      { action: 'view', title: 'View Project' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
}

/**
 * Send milestone completion notification
 */
export async function notifyMilestoneComplete(
  userId: string,
  projectName: string,
  milestoneName: string
): Promise<void> {
  await sendToUser(userId, {
    title: 'Milestone Completed',
    body: `${milestoneName} is now complete in "${projectName}"`,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'milestone-complete',
    data: {
      type: 'MILESTONE_COMPLETED',
      url: '/projects',
    },
    actions: [
      { action: 'view', title: 'View Project' },
    ],
  });
}

/**
 * Send new deliverable notification
 */
export async function notifyNewDeliverable(
  userId: string,
  projectName: string,
  deliverableName: string
): Promise<void> {
  await sendToUser(userId, {
    title: 'New Deliverable Available',
    body: `"${deliverableName}" is ready for download`,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'new-deliverable',
    data: {
      type: 'DELIVERABLE_READY',
      url: '/projects',
    },
    actions: [
      { action: 'download', title: 'Download' },
      { action: 'view', title: 'View' },
    ],
  });
}

/**
 * Send new message notification
 */
export async function notifyNewMessage(
  userId: string,
  senderName: string,
  projectName: string
): Promise<void> {
  await sendToUser(userId, {
    title: 'New Message',
    body: `${senderName} sent you a message on "${projectName}"`,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'new-message',
    data: {
      type: 'MESSAGE_RECEIVED',
      url: '/projects',
    },
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'view', title: 'View' },
    ],
  });
}

/**
 * Get VAPID public key for client subscription
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export default {
  saveSubscription,
  removeSubscription,
  getUserSubscriptions,
  sendToUser,
  sendToUsers,
  broadcast,
  notifyProjectUpdate,
  notifyMilestoneComplete,
  notifyNewDeliverable,
  notifyNewMessage,
  getVapidPublicKey,
};
