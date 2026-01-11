/**
 * Push Notification Routes
 * Handles Web Push subscription management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { pushService } from '../services/pushService';
import { sanitizeInput, validateBody } from '../middleware';

const router = Router();
router.use(sanitizeInput);

const subscribeSchema = z.object({
  endpoint: z.string().url('Valid endpoint is required'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url('Valid endpoint is required'),
});

const emptyBodySchema = z.object({}).optional();

/**
 * GET /api/push/vapid-key
 * Get the VAPID public key for push subscription
 */
router.get('/vapid-key', (_req: Request, res: Response) => {
  try {
    const publicKey = pushService.getVapidPublicKey();
    res.json({
      success: true,
      data: { publicKey },
    });
  } catch (error) {
    console.error('Failed to get VAPID key:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Push notifications not configured' },
    });
  }
});

/**
 * POST /api/push/subscribe
 * Subscribe to push notifications
 */
router.post(
  '/subscribe',
  requireAuth,
  validateBody(subscribeSchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys } = (req as any).validatedBody as z.infer<typeof subscribeSchema>;
    const userId = req.user!.id;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid subscription data' },
      });
    }

    const subscription = await pushService.subscribe(userId, {
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    res.json({
      success: true,
      data: { subscriptionId: subscription.id },
    });
  } catch (error) {
    console.error('Failed to subscribe:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to subscribe to push notifications' },
    });
  }
  }
);

/**
 * DELETE /api/push/unsubscribe
 * Unsubscribe from push notifications
 */
router.delete(
  '/unsubscribe',
  requireAuth,
  validateBody(unsubscribeSchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = (req as any).validatedBody as z.infer<typeof unsubscribeSchema>;
    const userId = req.user!.id;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: { message: 'Endpoint is required' },
      });
    }

    await pushService.unsubscribe(userId, endpoint);

    res.json({
      success: true,
      data: { message: 'Unsubscribed successfully' },
    });
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to unsubscribe from push notifications' },
    });
  }
  }
);

/**
 * GET /api/push/status
 * Check if user has active push subscriptions
 */
router.get('/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const subscriptions = await pushService.getUserSubscriptions(userId);

    res.json({
      success: true,
      data: {
        subscribed: subscriptions.length > 0,
        subscriptionCount: subscriptions.length,
      },
    });
  } catch (error) {
    console.error('Failed to get push status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get push status' },
    });
  }
});

/**
 * POST /api/push/test
 * Send a test push notification (for debugging)
 */
router.post(
  '/test',
  requireAuth,
  validateBody(emptyBodySchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await pushService.sendToUser(userId, {
      title: 'Test Notification',
      body: 'Push notifications are working correctly!',
      icon: '/icons/icon-192x192.png',
      tag: 'test',
    });

    res.json({
      success: true,
      data: {
        sent: result.sent,
        failed: result.failed,
      },
    });
  } catch (error) {
    console.error('Failed to send test notification:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to send test notification' },
    });
  }
  }
);

export default router;
