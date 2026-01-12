/**
 * Referral Routes
 * API endpoints for client referral program
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import * as referralService from '../services/referralService';
import { prisma } from '../utils/prisma';

const router = Router();

// ============================================
// REFERRAL CODE ROUTES
// ============================================

/**
 * GET /api/referrals/code
 * Get or generate referral code for current user
 */
router.get('/code', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    // Try to get existing code first
    let codeRecord = await referralService.getUserReferralCode(user.id);

    // If no code exists, create one
    if (!codeRecord) {
      codeRecord = await referralService.createReferralCode({
        ownerId: user.id,
        ownerName: user.name || '',
        ownerEmail: user.email,
      });
    }

    res.json({ code: codeRecord?.code || null });
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
    const codeRecord = await referralService.getReferralCode(code);

    if (!codeRecord || !codeRecord.isActive) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Get the user who owns this code
    const user = await prisma.user.findUnique({
      where: { id: codeRecord.ownerId },
      select: { name: true },
    });

    res.json({
      valid: true,
      referrerName: user?.name || 'A KAA client',
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
 * Create a new referral (apply a referral code)
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { referralCode, email, name } = req.body;

    if (!referralCode || !email) {
      return res.status(400).json({ error: 'Referral code and email are required' });
    }

    const referral = await referralService.applyReferral({
      code: referralCode,
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
 * Get all referrals for current user (as referrer)
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { status, page, limit } = req.query;

    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;
    const referrals = await referralService.getReferralsByReferrer(user.id, {
      status: status as any,
      offset: (pageNum - 1) * limitNum,
      limit: limitNum,
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
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const referral = await referralService.getReferral(id);

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
// REFERRAL REWARDS
// ============================================

/**
 * GET /api/referrals/rewards
 * Get rewards for current user
 */
router.get('/rewards', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { status } = req.query;

    const rewards = await referralService.getRewardsByUser(
      user.id,
      status as any
    );

    res.json(rewards);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

// ============================================
// REFERRAL STATISTICS
// ============================================

/**
 * GET /api/referrals/stats
 * Get referral statistics for current user
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const stats = await referralService.getUserReferralStats(user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral statistics' });
  }
});

/**
 * GET /api/referrals/stats/global
 * Get global referral statistics (admin only)
 */
router.get('/stats/global', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    if (user.userType !== 'ADMIN' && user.userType !== 'TEAM') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = referralService.getReferralStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({ error: 'Failed to fetch global statistics' });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * POST /api/referrals/:id/approve
 * Approve a referral reward (admin only)
 */
router.post('/:id/approve', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    if (user.userType !== 'ADMIN' && user.userType !== 'TEAM') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const reward = await referralService.approveReward(id);

    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json(reward);
  } catch (error) {
    console.error('Error approving reward:', error);
    res.status(500).json({ error: 'Failed to approve reward' });
  }
});

/**
 * POST /api/referrals/:id/mark-paid
 * Mark a reward as paid (admin only)
 */
router.post('/:id/mark-paid', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    if (user.userType !== 'ADMIN' && user.userType !== 'TEAM') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { paymentMethod, paymentReference } = req.body;

    const notes = paymentMethod && paymentReference 
      ? `Payment method: ${paymentMethod}, Reference: ${paymentReference}`
      : undefined;
    const reward = await referralService.markRewardPaid(id, notes);

    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json(reward);
  } catch (error) {
    console.error('Error marking reward paid:', error);
    res.status(500).json({ error: 'Failed to mark reward as paid' });
  }
});

/**
 * POST /api/referrals/:id/cancel
 * Cancel a reward (admin only)
 */
router.post('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    if (user.userType !== 'ADMIN' && user.userType !== 'TEAM') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const reward = await referralService.cancelReward(id, reason);

    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json(reward);
  } catch (error) {
    console.error('Error cancelling reward:', error);
    res.status(500).json({ error: 'Failed to cancel reward' });
  }
});

export default router;
