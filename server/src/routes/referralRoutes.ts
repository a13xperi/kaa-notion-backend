/**
 * Referral Routes
 * API endpoints for client referral program
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import * as referralService from '../services/referralService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// REFERRAL CODE ROUTES
// ============================================

/**
 * GET /api/referrals/code
 * Get or generate referral code for current user
 */
router.get('/code', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get client with user relation
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const referralCode = await referralService.createReferralCode({
      ownerId: client.id,
      ownerName: client.user?.name || 'Client',
      ownerEmail: client.user?.email || 'client@example.com',
    });
    res.json({ code: referralCode.code });
  } catch (error: any) {
    console.error('Error getting referral code:', error);
    res.status(400).json({ error: error.message || 'Failed to get referral code' });
  }
});

/**
 * GET /api/referrals/validate/:code
 * Validate a referral code (public route)
 */
router.get('/validate/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const client = await referralService.getClientByReferralCode(code);

    if (!client) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    res.json({
      valid: true,
      referrerName: client.user.name || 'A KAA client',
    });
  } catch (error) {
    console.error('Error validating referral code:', error);
    res.status(500).json({ error: 'Failed to validate referral code' });
  }
});

// ============================================
// REFERRAL MANAGEMENT
// ============================================

/**
 * POST /api/referrals
 * Create a new referral
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get client
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const referral = await referralService.createReferral({
      referrerClientId: client.id,
      referredEmail: email,
      referredName: name,
    });

    res.status(201).json(referral);
  } catch (error: any) {
    console.error('Error creating referral:', error);
    res.status(400).json({ error: error.message || 'Failed to create referral' });
  }
});

/**
 * GET /api/referrals
 * Get all referrals for current user
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get client
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const { status, page, limit } = req.query;

    const referrals = await referralService.getClientReferrals(client.id, {
      status: status as any,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(referrals);
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

/**
 * GET /api/referrals/:id
 * Get a specific referral
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const referral = await referralService.getReferralById(id);

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    res.json(referral);
  } catch (error) {
    console.error('Error fetching referral:', error);
    res.status(500).json({ error: 'Failed to fetch referral' });
  }
});

// ============================================
// REFERRAL CREDITS
// ============================================

/**
 * GET /api/referrals/credits/balance
 * Get available credit balance
 */
router.get('/credits/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get client
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const balance = await referralService.getAvailableCredits(client.id);
    res.json({ balance });
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    res.status(500).json({ error: 'Failed to fetch credit balance' });
  }
});

/**
 * GET /api/referrals/credits/history
 * Get credit history
 */
router.get('/credits/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get client
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const { page, limit } = req.query;

    const history = await referralService.getCreditHistory(client.id, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching credit history:', error);
    res.status(500).json({ error: 'Failed to fetch credit history' });
  }
});

// ============================================
// REFERRAL STATISTICS
// ============================================

/**
 * GET /api/referrals/stats
 * Get referral statistics for current user
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get client
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const stats = await referralService.getReferralStats(client.id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral statistics' });
  }
});

/**
 * GET /api/referrals/leaderboard
 * Get referral leaderboard (public)
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const leaderboard = await referralService.getReferralLeaderboard(
      limit ? parseInt(limit as string, 10) : 10
    );
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * POST /api/referrals/expire
 * Expire old pending referrals (admin only, can be called by cron)
 */
router.post('/expire', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const expiredCount = await referralService.expireReferrals();
    res.json({ expiredCount });
  } catch (error) {
    console.error('Error expiring referrals:', error);
    res.status(500).json({ error: 'Failed to expire referrals' });
  }
});

/**
 * GET /api/referrals/config
 * Get referral program configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    res.json({
      referrerReward: referralService.REFERRAL_CONFIG.REFERRER_CREDIT_AMOUNT,
      referredReward: referralService.REFERRAL_CONFIG.REFERRED_CREDIT_AMOUNT,
      minProjectValue: referralService.REFERRAL_CONFIG.MIN_PROJECT_VALUE,
      expiryDays: referralService.REFERRAL_CONFIG.REFERRAL_EXPIRY_DAYS,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

export default router;
