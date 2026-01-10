/**
 * Referral Service
 * Manages referral codes, tracking, and rewards.
 */

import crypto from 'crypto';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export type ReferralStatus = 'pending' | 'converted' | 'rewarded' | 'expired';
export type RewardType = 'discount' | 'credit' | 'free_upgrade' | 'cash';
export type RewardStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

export interface ReferralCode {
  code: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  discount: number; // Percentage discount for referred user
  rewardAmount: number; // Reward for referrer
  rewardType: RewardType;
  maxUses: number;
  currentUses: number;
  expiresAt?: string;
  createdAt: string;
  isActive: boolean;
}

export interface Referral {
  id: string;
  code: string;
  referrerId: string;
  referredUserId?: string;
  referredEmail: string;
  referredName?: string;
  status: ReferralStatus;
  convertedAt?: string;
  rewardedAt?: string;
  projectId?: string;
  tier?: number;
  revenue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralReward {
  id: string;
  referralId: string;
  referrerId: string;
  amount: number;
  type: RewardType;
  status: RewardStatus;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface ReferralConfig {
  defaultDiscount: number; // Default discount percentage
  defaultRewardAmount: number;
  defaultRewardType: RewardType;
  codeLength: number;
  expirationDays: number;
  maxUsesPerCode: number;
  minPurchaseForReward: number;
}

export interface CreateReferralCodeInput {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  discount?: number;
  rewardAmount?: number;
  rewardType?: RewardType;
  maxUses?: number;
  expirationDays?: number;
  customCode?: string;
}

export interface ApplyReferralInput {
  code: string;
  referredEmail: string;
  referredName?: string;
}

export interface ConvertReferralInput {
  referralId: string;
  userId: string;
  projectId?: string;
  tier?: number;
  revenue?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ReferralConfig = {
  defaultDiscount: 10, // 10% discount
  defaultRewardAmount: 50, // $50 reward
  defaultRewardType: 'credit',
  codeLength: 8,
  expirationDays: 90,
  maxUsesPerCode: 10,
  minPurchaseForReward: 299, // Minimum purchase for reward eligibility
};

let config: ReferralConfig = { ...DEFAULT_CONFIG };

// ============================================================================
// IN-MEMORY STORE (Replace with database in production)
// ============================================================================

const referralCodes = new Map<string, ReferralCode>();
const referrals = new Map<string, Referral>();
const rewards = new Map<string, ReferralReward>();
let referralIdCounter = 0;
let rewardIdCounter = 0;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize referral service
 */
export function initReferralService(overrides: Partial<ReferralConfig> = {}): void {
  config = { ...config, ...overrides };
  logger.info('Referral service initialized', config);
}

// ============================================================================
// CODE GENERATION
// ============================================================================

/**
 * Generate a unique referral code
 */
function generateCode(length: number = config.codeLength): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Validate custom code format
 */
function isValidCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{4,16}$/.test(code.toUpperCase());
}

// ============================================================================
// REFERRAL CODE MANAGEMENT
// ============================================================================

/**
 * Create a new referral code for a user
 */
export async function createReferralCode(
  input: CreateReferralCodeInput
): Promise<ReferralCode> {
  // Check if user already has an active code
  const existingCode = Array.from(referralCodes.values()).find(
    (rc) => rc.ownerId === input.ownerId && rc.isActive
  );

  if (existingCode) {
    logger.debug('User already has active referral code', {
      userId: input.ownerId,
      code: existingCode.code,
    });
    return existingCode;
  }

  // Generate or validate code
  let code: string;
  if (input.customCode) {
    if (!isValidCodeFormat(input.customCode)) {
      throw new Error('Invalid code format. Use 4-16 alphanumeric characters.');
    }
    code = input.customCode.toUpperCase();
    if (referralCodes.has(code)) {
      throw new Error('This code is already in use.');
    }
  } else {
    do {
      code = generateCode();
    } while (referralCodes.has(code));
  }

  const now = new Date();
  const expirationDays = input.expirationDays ?? config.expirationDays;

  const referralCode: ReferralCode = {
    code,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    ownerEmail: input.ownerEmail,
    discount: input.discount ?? config.defaultDiscount,
    rewardAmount: input.rewardAmount ?? config.defaultRewardAmount,
    rewardType: input.rewardType ?? config.defaultRewardType,
    maxUses: input.maxUses ?? config.maxUsesPerCode,
    currentUses: 0,
    expiresAt: expirationDays > 0
      ? new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
    createdAt: now.toISOString(),
    isActive: true,
  };

  referralCodes.set(code, referralCode);

  logger.info('Referral code created', {
    code,
    ownerId: input.ownerId,
    discount: referralCode.discount,
  });

  return referralCode;
}

/**
 * Get referral code by code string
 */
export async function getReferralCode(code: string): Promise<ReferralCode | null> {
  return referralCodes.get(code.toUpperCase()) || null;
}

/**
 * Get referral code for a user
 */
export async function getUserReferralCode(userId: string): Promise<ReferralCode | null> {
  return (
    Array.from(referralCodes.values()).find(
      (rc) => rc.ownerId === userId && rc.isActive
    ) || null
  );
}

/**
 * Validate a referral code
 */
export async function validateReferralCode(
  code: string
): Promise<{ valid: boolean; error?: string; discount?: number }> {
  const referralCode = await getReferralCode(code);

  if (!referralCode) {
    return { valid: false, error: 'Invalid referral code' };
  }

  if (!referralCode.isActive) {
    return { valid: false, error: 'This referral code is no longer active' };
  }

  if (referralCode.expiresAt && new Date(referralCode.expiresAt) < new Date()) {
    return { valid: false, error: 'This referral code has expired' };
  }

  if (referralCode.currentUses >= referralCode.maxUses) {
    return { valid: false, error: 'This referral code has reached its maximum uses' };
  }

  return { valid: true, discount: referralCode.discount };
}

/**
 * Deactivate a referral code
 */
export async function deactivateReferralCode(code: string): Promise<boolean> {
  const referralCode = referralCodes.get(code.toUpperCase());
  if (!referralCode) return false;

  referralCode.isActive = false;
  logger.info('Referral code deactivated', { code });
  return true;
}

// ============================================================================
// REFERRAL TRACKING
// ============================================================================

/**
 * Apply a referral code (track that someone used a code)
 */
export async function applyReferral(input: ApplyReferralInput): Promise<Referral> {
  const validation = await validateReferralCode(input.code);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const referralCode = await getReferralCode(input.code);
  if (!referralCode) {
    throw new Error('Invalid referral code');
  }

  // Check if email already used this code
  const existingReferral = Array.from(referrals.values()).find(
    (r) => r.code === input.code.toUpperCase() && r.referredEmail === input.referredEmail
  );

  if (existingReferral) {
    return existingReferral;
  }

  // Check if email already has any referral
  const anyReferral = Array.from(referrals.values()).find(
    (r) => r.referredEmail === input.referredEmail
  );

  if (anyReferral) {
    throw new Error('This email has already been referred');
  }

  const now = new Date().toISOString();
  const referralId = `ref_${++referralIdCounter}_${Date.now()}`;

  const referral: Referral = {
    id: referralId,
    code: input.code.toUpperCase(),
    referrerId: referralCode.ownerId,
    referredEmail: input.referredEmail,
    referredName: input.referredName,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  referrals.set(referralId, referral);

  // Increment code usage
  referralCode.currentUses++;

  logger.info('Referral applied', {
    referralId,
    code: input.code,
    referredEmail: input.referredEmail,
  });

  return referral;
}

/**
 * Convert a pending referral (when referred user makes a purchase)
 */
export async function convertReferral(input: ConvertReferralInput): Promise<Referral> {
  const referral = referrals.get(input.referralId);
  if (!referral) {
    throw new Error('Referral not found');
  }

  if (referral.status !== 'pending') {
    throw new Error('Referral has already been processed');
  }

  const now = new Date().toISOString();

  referral.referredUserId = input.userId;
  referral.status = 'converted';
  referral.convertedAt = now;
  referral.projectId = input.projectId;
  referral.tier = input.tier;
  referral.revenue = input.revenue;
  referral.updatedAt = now;

  logger.info('Referral converted', {
    referralId: input.referralId,
    userId: input.userId,
    revenue: input.revenue,
  });

  // Check if eligible for reward
  if (input.revenue && input.revenue >= config.minPurchaseForReward) {
    await createReward(referral);
  }

  return referral;
}

/**
 * Get referral by ID
 */
export async function getReferral(referralId: string): Promise<Referral | null> {
  return referrals.get(referralId) || null;
}

/**
 * Get referral by email
 */
export async function getReferralByEmail(email: string): Promise<Referral | null> {
  return Array.from(referrals.values()).find((r) => r.referredEmail === email) || null;
}

/**
 * Get referrals made by a user
 */
export async function getReferralsByReferrer(
  referrerId: string,
  options: { status?: ReferralStatus; limit?: number; offset?: number } = {}
): Promise<{ referrals: Referral[]; total: number }> {
  const { status, limit = 20, offset = 0 } = options;

  let userReferrals = Array.from(referrals.values()).filter(
    (r) => r.referrerId === referrerId
  );

  if (status) {
    userReferrals = userReferrals.filter((r) => r.status === status);
  }

  // Sort by createdAt (newest first)
  userReferrals.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = userReferrals.length;
  const paginatedReferrals = userReferrals.slice(offset, offset + limit);

  return { referrals: paginatedReferrals, total };
}

// ============================================================================
// REWARD MANAGEMENT
// ============================================================================

/**
 * Create a reward for a converted referral
 */
async function createReward(referral: Referral): Promise<ReferralReward> {
  const referralCode = await getReferralCode(referral.code);
  if (!referralCode) {
    throw new Error('Referral code not found');
  }

  const now = new Date().toISOString();
  const rewardId = `reward_${++rewardIdCounter}_${Date.now()}`;

  const reward: ReferralReward = {
    id: rewardId,
    referralId: referral.id,
    referrerId: referral.referrerId,
    amount: referralCode.rewardAmount,
    type: referralCode.rewardType,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  rewards.set(rewardId, reward);

  logger.info('Referral reward created', {
    rewardId,
    referralId: referral.id,
    amount: reward.amount,
    type: reward.type,
  });

  return reward;
}

/**
 * Get rewards for a user
 */
export async function getRewardsByUser(
  userId: string,
  options: { status?: RewardStatus; limit?: number; offset?: number } = {}
): Promise<{ rewards: ReferralReward[]; total: number }> {
  const { status, limit = 20, offset = 0 } = options;

  let userRewards = Array.from(rewards.values()).filter(
    (r) => r.referrerId === userId
  );

  if (status) {
    userRewards = userRewards.filter((r) => r.status === status);
  }

  // Sort by createdAt (newest first)
  userRewards.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = userRewards.length;
  const paginatedRewards = userRewards.slice(offset, offset + limit);

  return { rewards: paginatedRewards, total };
}

/**
 * Approve a reward
 */
export async function approveReward(rewardId: string): Promise<ReferralReward | null> {
  const reward = rewards.get(rewardId);
  if (!reward) return null;

  if (reward.status !== 'pending') {
    throw new Error('Reward is not in pending status');
  }

  reward.status = 'approved';
  reward.updatedAt = new Date().toISOString();

  logger.info('Reward approved', { rewardId });

  return reward;
}

/**
 * Mark reward as paid
 */
export async function markRewardPaid(
  rewardId: string,
  notes?: string
): Promise<ReferralReward | null> {
  const reward = rewards.get(rewardId);
  if (!reward) return null;

  if (reward.status !== 'approved') {
    throw new Error('Reward must be approved before marking as paid');
  }

  const now = new Date().toISOString();
  reward.status = 'paid';
  reward.paidAt = now;
  reward.updatedAt = now;
  if (notes) reward.notes = notes;

  // Update referral status
  const referral = referrals.get(reward.referralId);
  if (referral) {
    referral.status = 'rewarded';
    referral.rewardedAt = now;
    referral.updatedAt = now;
  }

  logger.info('Reward paid', { rewardId, amount: reward.amount });

  return reward;
}

/**
 * Cancel a reward
 */
export async function cancelReward(
  rewardId: string,
  reason?: string
): Promise<ReferralReward | null> {
  const reward = rewards.get(rewardId);
  if (!reward) return null;

  if (reward.status === 'paid') {
    throw new Error('Cannot cancel a paid reward');
  }

  reward.status = 'cancelled';
  reward.updatedAt = new Date().toISOString();
  if (reason) reward.notes = reason;

  logger.info('Reward cancelled', { rewardId, reason });

  return reward;
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface ReferralStats {
  totalCodes: number;
  activeCodes: number;
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  totalRewards: number;
  pendingRewards: number;
  paidRewards: number;
  totalRevenueGenerated: number;
  totalRewardsPaid: number;
  conversionRate: number;
}

/**
 * Get referral program statistics
 */
export function getReferralStats(): ReferralStats {
  const allCodes = Array.from(referralCodes.values());
  const allReferrals = Array.from(referrals.values());
  const allRewards = Array.from(rewards.values());

  const totalRevenue = allReferrals
    .filter((r) => r.revenue)
    .reduce((sum, r) => sum + (r.revenue || 0), 0);

  const totalPaid = allRewards
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.amount, 0);

  const convertedCount = allReferrals.filter(
    (r) => r.status === 'converted' || r.status === 'rewarded'
  ).length;

  return {
    totalCodes: allCodes.length,
    activeCodes: allCodes.filter((c) => c.isActive).length,
    totalReferrals: allReferrals.length,
    pendingReferrals: allReferrals.filter((r) => r.status === 'pending').length,
    convertedReferrals: convertedCount,
    totalRewards: allRewards.length,
    pendingRewards: allRewards.filter((r) => r.status === 'pending').length,
    paidRewards: allRewards.filter((r) => r.status === 'paid').length,
    totalRevenueGenerated: totalRevenue,
    totalRewardsPaid: totalPaid,
    conversionRate: allReferrals.length > 0 ? convertedCount / allReferrals.length : 0,
  };
}

/**
 * Get stats for a specific user
 */
export async function getUserReferralStats(userId: string): Promise<{
  code: ReferralCode | null;
  referralCount: number;
  convertedCount: number;
  pendingRewards: number;
  totalEarned: number;
}> {
  const code = await getUserReferralCode(userId);
  const { referrals: userReferrals } = await getReferralsByReferrer(userId);
  const { rewards: userRewards } = await getRewardsByUser(userId);

  const convertedCount = userReferrals.filter(
    (r) => r.status === 'converted' || r.status === 'rewarded'
  ).length;

  const pendingRewards = userRewards
    .filter((r) => r.status === 'pending' || r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalEarned = userRewards
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.amount, 0);

  return {
    code,
    referralCount: userReferrals.length,
    convertedCount,
    pendingRewards,
    totalEarned,
  };
}

// ============================================================================
// CLEANUP (for testing)
// ============================================================================

/**
 * Clear all referral data (for testing)
 */
export function clearAllReferrals(): void {
  referralCodes.clear();
  referrals.clear();
  rewards.clear();
  referralIdCounter = 0;
  rewardIdCounter = 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initReferralService,
  createReferralCode,
  getReferralCode,
  getUserReferralCode,
  validateReferralCode,
  deactivateReferralCode,
  applyReferral,
  convertReferral,
  getReferral,
  getReferralByEmail,
  getReferralsByReferrer,
  getRewardsByUser,
  approveReward,
  markRewardPaid,
  cancelReward,
  getReferralStats,
  getUserReferralStats,
  clearAllReferrals,
};
