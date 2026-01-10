/**
 * Referral Service
 * Handles client referral tracking, rewards, and credit management
 */

import { PrismaClient, Referral, ReferralStatus, ReferralCredit } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export interface CreateReferralInput {
  referrerClientId: string;
  referredEmail: string;
  referredName?: string;
}

export interface ReferralWithDetails extends Referral {
  referrer: {
    id: string;
    user: {
      email: string;
      name: string | null;
    };
  };
  referredClient?: {
    id: string;
    user: {
      email: string;
      name: string | null;
    };
  } | null;
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Referral reward configuration
 */
export const REFERRAL_CONFIG = {
  // Credit amount awarded to referrer when referral converts
  REFERRER_CREDIT_AMOUNT: 100, // $100 credit

  // Credit amount awarded to referred client (signup bonus)
  REFERRED_CREDIT_AMOUNT: 50, // $50 credit

  // Minimum project value for referral to be valid
  MIN_PROJECT_VALUE: 500,

  // Days until referral link expires
  REFERRAL_EXPIRY_DAYS: 90,

  // Maximum active referrals per client
  MAX_ACTIVE_REFERRALS: 10,
};

// ============================================
// REFERRAL CODE GENERATION
// ============================================

/**
 * Generate a unique referral code for a client
 */
export async function generateReferralCode(clientId: string): Promise<string> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  if (client.referralCode) {
    return client.referralCode;
  }

  // Generate unique code
  let code: string;
  let isUnique = false;
  let attempts = 0;

  do {
    code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const existing = await prisma.client.findUnique({
      where: { referralCode: code },
    });
    isUnique = !existing;
    attempts++;
  } while (!isUnique && attempts < 10);

  if (!isUnique) {
    throw new Error('Failed to generate unique referral code');
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { referralCode: code },
  });

  return code;
}

/**
 * Get client by referral code
 */
export async function getClientByReferralCode(code: string) {
  return prisma.client.findUnique({
    where: { referralCode: code.toUpperCase() },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });
}

// ============================================
// REFERRAL MANAGEMENT
// ============================================

/**
 * Create a new referral
 */
export async function createReferral(
  input: CreateReferralInput
): Promise<Referral> {
  // Check if referrer exists
  const referrer = await prisma.client.findUnique({
    where: { id: input.referrerClientId },
  });

  if (!referrer) {
    throw new Error('Referrer client not found');
  }

  // Check if email is already a client
  const existingUser = await prisma.user.findUnique({
    where: { email: input.referredEmail },
    include: { client: true },
  });

  if (existingUser?.client) {
    throw new Error('This email is already registered as a client');
  }

  // Check for existing pending referral
  const existingReferral = await prisma.referral.findFirst({
    where: {
      referrerClientId: input.referrerClientId,
      referredEmail: input.referredEmail,
      status: { in: ['PENDING', 'SIGNED_UP'] },
    },
  });

  if (existingReferral) {
    throw new Error('A referral for this email already exists');
  }

  // Check active referral limit
  const activeReferrals = await prisma.referral.count({
    where: {
      referrerClientId: input.referrerClientId,
      status: { in: ['PENDING', 'SIGNED_UP'] },
    },
  });

  if (activeReferrals >= REFERRAL_CONFIG.MAX_ACTIVE_REFERRALS) {
    throw new Error(`Maximum of ${REFERRAL_CONFIG.MAX_ACTIVE_REFERRALS} active referrals allowed`);
  }

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFERRAL_CONFIG.REFERRAL_EXPIRY_DAYS);

  return prisma.referral.create({
    data: {
      referrerClientId: input.referrerClientId,
      referredEmail: input.referredEmail,
      referredName: input.referredName,
      status: 'PENDING',
      expiresAt,
    },
  });
}

/**
 * Get referral by ID
 */
export async function getReferralById(id: string): Promise<ReferralWithDetails | null> {
  return prisma.referral.findUnique({
    where: { id },
    include: {
      referrer: {
        select: {
          id: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
      referredClient: {
        select: {
          id: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  }) as Promise<ReferralWithDetails | null>;
}

/**
 * Get referrals made by a client
 */
export async function getClientReferrals(
  clientId: string,
  options: {
    status?: ReferralStatus;
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  referrals: ReferralWithDetails[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(Math.max(1, options.limit || 10), 50);
  const skip = (page - 1) * limit;

  const where = {
    referrerClientId: clientId,
    ...(options.status && { status: options.status }),
  };

  const [referrals, total] = await Promise.all([
    prisma.referral.findMany({
      where,
      include: {
        referrer: {
          select: {
            id: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
        referredClient: {
          select: {
            id: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.referral.count({ where }),
  ]);

  return {
    referrals: referrals as ReferralWithDetails[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================
// REFERRAL STATUS UPDATES
// ============================================

/**
 * Mark referral as signed up (when referred client creates account)
 */
export async function markReferralSignedUp(
  referredEmail: string,
  referredClientId: string
): Promise<Referral | null> {
  const referral = await prisma.referral.findFirst({
    where: {
      referredEmail,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });

  if (!referral) {
    return null;
  }

  // Award signup bonus to referred client
  await createReferralCredit({
    clientId: referredClientId,
    referralId: referral.id,
    amount: REFERRAL_CONFIG.REFERRED_CREDIT_AMOUNT,
    type: 'signup_bonus',
    description: 'Referral signup bonus',
  });

  return prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: 'SIGNED_UP',
      referredClientId,
      signedUpAt: new Date(),
    },
  });
}

/**
 * Mark referral as converted (when referred client pays for first project)
 */
export async function markReferralConverted(
  referredClientId: string,
  projectValue: number
): Promise<Referral | null> {
  // Check minimum project value
  if (projectValue < REFERRAL_CONFIG.MIN_PROJECT_VALUE) {
    return null;
  }

  const referral = await prisma.referral.findFirst({
    where: {
      referredClientId,
      status: 'SIGNED_UP',
    },
  });

  if (!referral) {
    return null;
  }

  // Award credit to referrer
  await createReferralCredit({
    clientId: referral.referrerClientId,
    referralId: referral.id,
    amount: REFERRAL_CONFIG.REFERRER_CREDIT_AMOUNT,
    type: 'referral_reward',
    description: `Referral reward for converting ${referral.referredEmail}`,
  });

  return prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: 'CONVERTED',
      convertedAt: new Date(),
      rewardAmount: REFERRAL_CONFIG.REFERRER_CREDIT_AMOUNT,
    },
  });
}

/**
 * Mark referral as expired
 */
export async function expireReferrals(): Promise<number> {
  const result = await prisma.referral.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  return result.count;
}

// ============================================
// REFERRAL CREDITS
// ============================================

interface CreateCreditInput {
  clientId: string;
  referralId: string;
  amount: number;
  type: string;
  description?: string;
}

/**
 * Create a referral credit
 */
async function createReferralCredit(input: CreateCreditInput): Promise<ReferralCredit> {
  // Calculate expiry (1 year from now)
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  return prisma.referralCredit.create({
    data: {
      clientId: input.clientId,
      referralId: input.referralId,
      amount: input.amount,
      type: input.type,
      description: input.description,
      expiresAt,
    },
  });
}

/**
 * Get available credits for a client
 */
export async function getAvailableCredits(clientId: string): Promise<number> {
  const credits = await prisma.referralCredit.findMany({
    where: {
      clientId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  return credits.reduce((sum, credit) => sum + credit.amount, 0);
}

/**
 * Get credit history for a client
 */
export async function getCreditHistory(
  clientId: string,
  options: {
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  credits: ReferralCredit[];
  total: number;
  page: number;
  totalPages: number;
  availableBalance: number;
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(Math.max(1, options.limit || 10), 50);
  const skip = (page - 1) * limit;

  const [credits, total, availableBalance] = await Promise.all([
    prisma.referralCredit.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.referralCredit.count({ where: { clientId } }),
    getAvailableCredits(clientId),
  ]);

  return {
    credits,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    availableBalance,
  };
}

/**
 * Use credits for a payment
 */
export async function useCredits(
  clientId: string,
  amount: number
): Promise<{
  creditsUsed: number;
  remainingAmount: number;
}> {
  const availableCredits = await prisma.referralCredit.findMany({
    where: {
      clientId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: 'asc' }, // Use credits expiring soonest first
  });

  let remainingAmount = amount;
  let creditsUsed = 0;

  for (const credit of availableCredits) {
    if (remainingAmount <= 0) break;

    const useAmount = Math.min(credit.amount, remainingAmount);

    await prisma.referralCredit.update({
      where: { id: credit.id },
      data: {
        usedAt: new Date(),
        usedAmount: useAmount,
      },
    });

    creditsUsed += useAmount;
    remainingAmount -= useAmount;
  }

  return {
    creditsUsed,
    remainingAmount: Math.max(0, remainingAmount),
  };
}

// ============================================
// REFERRAL STATISTICS
// ============================================

/**
 * Get referral statistics for a client
 */
export async function getReferralStats(clientId: string): Promise<{
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  totalEarned: number;
  availableCredits: number;
  referralCode: string | null;
}> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  const [
    totalReferrals,
    pendingReferrals,
    convertedReferrals,
    credits,
    availableCredits,
  ] = await Promise.all([
    prisma.referral.count({ where: { referrerClientId: clientId } }),
    prisma.referral.count({
      where: { referrerClientId: clientId, status: { in: ['PENDING', 'SIGNED_UP'] } },
    }),
    prisma.referral.count({
      where: { referrerClientId: clientId, status: 'CONVERTED' },
    }),
    prisma.referralCredit.findMany({
      where: { clientId, type: 'referral_reward' },
    }),
    getAvailableCredits(clientId),
  ]);

  const totalEarned = credits.reduce((sum, c) => sum + c.amount, 0);

  return {
    totalReferrals,
    pendingReferrals,
    convertedReferrals,
    totalEarned,
    availableCredits,
    referralCode: client.referralCode,
  };
}

/**
 * Get leaderboard of top referrers
 */
export async function getReferralLeaderboard(
  limit: number = 10
): Promise<Array<{
  clientId: string;
  clientName: string;
  convertedCount: number;
  totalEarned: number;
}>> {
  const topReferrers = await prisma.referral.groupBy({
    by: ['referrerClientId'],
    where: { status: 'CONVERTED' },
    _count: { id: true },
    _sum: { rewardAmount: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  });

  const clientIds = topReferrers.map((r) => r.referrerClientId);
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    include: {
      user: { select: { name: true } },
    },
  });

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return topReferrers.map((r) => ({
    clientId: r.referrerClientId,
    clientName: clientMap.get(r.referrerClientId)?.user.name || 'Unknown',
    convertedCount: r._count.id,
    totalEarned: r._sum.rewardAmount || 0,
  }));
}

export default {
  REFERRAL_CONFIG,
  generateReferralCode,
  getClientByReferralCode,
  createReferral,
  getReferralById,
  getClientReferrals,
  markReferralSignedUp,
  markReferralConverted,
  expireReferrals,
  getAvailableCredits,
  getCreditHistory,
  useCredits,
  getReferralStats,
  getReferralLeaderboard,
};
