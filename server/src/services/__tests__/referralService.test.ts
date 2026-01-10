/**
 * Referral Service Tests
 */

import {
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
} from '../referralService';

describe('ReferralService', () => {
  beforeEach(() => {
    clearAllReferrals();
    initReferralService();
  });

  describe('createReferralCode', () => {
    it('should create a referral code for a user', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
      });

      expect(code.code).toBeTruthy();
      expect(code.code.length).toBe(8);
      expect(code.ownerId).toBe('user1');
      expect(code.isActive).toBe(true);
      expect(code.currentUses).toBe(0);
    });

    it('should return existing code if user already has one', async () => {
      const code1 = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
      });

      const code2 = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
      });

      expect(code1.code).toBe(code2.code);
    });

    it('should allow custom code', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        customCode: 'JOHNSAVE',
      });

      expect(code.code).toBe('JOHNSAVE');
    });

    it('should reject invalid custom code format', async () => {
      await expect(
        createReferralCode({
          ownerId: 'user1',
          ownerName: 'John Doe',
          ownerEmail: 'john@example.com',
          customCode: 'ab', // Too short
        })
      ).rejects.toThrow('Invalid code format');
    });

    it('should reject duplicate custom code', async () => {
      await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
        customCode: 'UNIQUE123',
      });

      await expect(
        createReferralCode({
          ownerId: 'user2',
          ownerName: 'Jane',
          ownerEmail: 'jane@example.com',
          customCode: 'UNIQUE123',
        })
      ).rejects.toThrow('already in use');
    });

    it('should apply custom discount and reward', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        discount: 15,
        rewardAmount: 100,
        rewardType: 'cash',
      });

      expect(code.discount).toBe(15);
      expect(code.rewardAmount).toBe(100);
      expect(code.rewardType).toBe('cash');
    });
  });

  describe('getReferralCode', () => {
    it('should return code by string', async () => {
      const created = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      const retrieved = await getReferralCode(created.code);

      expect(retrieved?.code).toBe(created.code);
    });

    it('should return null for non-existent code', async () => {
      const code = await getReferralCode('NONEXISTENT');
      expect(code).toBeNull();
    });

    it('should be case-insensitive', async () => {
      const created = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
        customCode: 'TESTCODE',
      });

      const retrieved = await getReferralCode('testcode');

      expect(retrieved?.code).toBe(created.code);
    });
  });

  describe('getUserReferralCode', () => {
    it('should return user referral code', async () => {
      await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      const code = await getUserReferralCode('user1');

      expect(code).toBeTruthy();
      expect(code?.ownerId).toBe('user1');
    });

    it('should return null if user has no code', async () => {
      const code = await getUserReferralCode('nonexistent');
      expect(code).toBeNull();
    });
  });

  describe('validateReferralCode', () => {
    it('should validate active code', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
        discount: 15,
      });

      const result = await validateReferralCode(code.code);

      expect(result.valid).toBe(true);
      expect(result.discount).toBe(15);
    });

    it('should reject invalid code', async () => {
      const result = await validateReferralCode('INVALID');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should reject deactivated code', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      await deactivateReferralCode(code.code);

      const result = await validateReferralCode(code.code);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('no longer active');
    });

    it('should reject code at max uses', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
        maxUses: 1,
      });

      await applyReferral({
        code: code.code,
        referredEmail: 'friend@example.com',
      });

      const result = await validateReferralCode(code.code);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum uses');
    });
  });

  describe('applyReferral', () => {
    it('should create a pending referral', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      const referral = await applyReferral({
        code: code.code,
        referredEmail: 'friend@example.com',
        referredName: 'Friend',
      });

      expect(referral.id).toBeTruthy();
      expect(referral.status).toBe('pending');
      expect(referral.referredEmail).toBe('friend@example.com');
      expect(referral.referrerId).toBe('user1');
    });

    it('should increment code usage', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      await applyReferral({
        code: code.code,
        referredEmail: 'friend@example.com',
      });

      const updated = await getReferralCode(code.code);
      expect(updated?.currentUses).toBe(1);
    });

    it('should return existing referral for same email/code', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      const ref1 = await applyReferral({
        code: code.code,
        referredEmail: 'friend@example.com',
      });

      const ref2 = await applyReferral({
        code: code.code,
        referredEmail: 'friend@example.com',
      });

      expect(ref1.id).toBe(ref2.id);
    });

    it('should reject if email already referred', async () => {
      const code1 = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      const code2 = await createReferralCode({
        ownerId: 'user2',
        ownerName: 'Jane',
        ownerEmail: 'jane@example.com',
      });

      await applyReferral({
        code: code1.code,
        referredEmail: 'friend@example.com',
      });

      await expect(
        applyReferral({
          code: code2.code,
          referredEmail: 'friend@example.com',
        })
      ).rejects.toThrow('already been referred');
    });
  });

  describe('convertReferral', () => {
    it('should convert pending referral', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      const referral = await applyReferral({
        code: code.code,
        referredEmail: 'friend@example.com',
      });

      const converted = await convertReferral({
        referralId: referral.id,
        userId: 'user2',
        projectId: 'proj1',
        tier: 2,
        revenue: 1499,
      });

      expect(converted.status).toBe('converted');
      expect(converted.referredUserId).toBe('user2');
      expect(converted.revenue).toBe(1499);
    });

    it('should create reward for qualifying purchase', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      const referral = await applyReferral({
        code: code.code,
        referredEmail: 'friend@example.com',
      });

      await convertReferral({
        referralId: referral.id,
        userId: 'user2',
        revenue: 500, // Above min threshold
      });

      const { rewards } = await getRewardsByUser('user1');
      expect(rewards).toHaveLength(1);
      expect(rewards[0].status).toBe('pending');
    });

    it('should not create reward for non-qualifying purchase', async () => {
      initReferralService({ minPurchaseForReward: 500 });

      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      const referral = await applyReferral({
        code: code.code,
        referredEmail: 'friend@example.com',
      });

      await convertReferral({
        referralId: referral.id,
        userId: 'user2',
        revenue: 100, // Below threshold
      });

      const { rewards } = await getRewardsByUser('user1');
      expect(rewards).toHaveLength(0);
    });
  });

  describe('Reward Management', () => {
    let rewardId: string;

    beforeEach(async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      const referral = await applyReferral({
        code: code.code,
        referredEmail: 'friend@example.com',
      });

      await convertReferral({
        referralId: referral.id,
        userId: 'user2',
        revenue: 500,
      });

      const { rewards } = await getRewardsByUser('user1');
      rewardId = rewards[0].id;
    });

    it('should approve pending reward', async () => {
      const reward = await approveReward(rewardId);

      expect(reward?.status).toBe('approved');
    });

    it('should mark approved reward as paid', async () => {
      await approveReward(rewardId);
      const reward = await markRewardPaid(rewardId, 'Paid via PayPal');

      expect(reward?.status).toBe('paid');
      expect(reward?.paidAt).toBeTruthy();
      expect(reward?.notes).toBe('Paid via PayPal');
    });

    it('should not pay unapproved reward', async () => {
      await expect(markRewardPaid(rewardId)).rejects.toThrow('must be approved');
    });

    it('should cancel pending reward', async () => {
      const reward = await cancelReward(rewardId, 'Suspicious activity');

      expect(reward?.status).toBe('cancelled');
      expect(reward?.notes).toBe('Suspicious activity');
    });

    it('should not cancel paid reward', async () => {
      await approveReward(rewardId);
      await markRewardPaid(rewardId);

      await expect(cancelReward(rewardId)).rejects.toThrow('Cannot cancel');
    });
  });

  describe('getReferralsByReferrer', () => {
    it('should return referrals for user', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      await applyReferral({ code: code.code, referredEmail: 'a@example.com' });
      await applyReferral({ code: code.code, referredEmail: 'b@example.com' });

      const { referrals, total } = await getReferralsByReferrer('user1');

      expect(total).toBe(2);
      expect(referrals).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      const ref1 = await applyReferral({ code: code.code, referredEmail: 'a@example.com' });
      await applyReferral({ code: code.code, referredEmail: 'b@example.com' });

      await convertReferral({
        referralId: ref1.id,
        userId: 'userA',
        revenue: 100,
      });

      const { referrals } = await getReferralsByReferrer('user1', { status: 'converted' });

      expect(referrals).toHaveLength(1);
    });
  });

  describe('getReferralStats', () => {
    it('should return program statistics', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
      });

      const referral = await applyReferral({
        code: code.code,
        referredEmail: 'friend@example.com',
      });

      await convertReferral({
        referralId: referral.id,
        userId: 'user2',
        revenue: 1000,
      });

      const stats = getReferralStats();

      expect(stats.totalCodes).toBe(1);
      expect(stats.activeCodes).toBe(1);
      expect(stats.totalReferrals).toBe(1);
      expect(stats.convertedReferrals).toBe(1);
      expect(stats.totalRevenueGenerated).toBe(1000);
      expect(stats.conversionRate).toBe(1);
    });
  });

  describe('getUserReferralStats', () => {
    it('should return user-specific stats', async () => {
      const code = await createReferralCode({
        ownerId: 'user1',
        ownerName: 'John',
        ownerEmail: 'john@example.com',
        rewardAmount: 50,
      });

      const ref = await applyReferral({
        code: code.code,
        referredEmail: 'friend@example.com',
      });

      await convertReferral({
        referralId: ref.id,
        userId: 'user2',
        revenue: 500,
      });

      const stats = await getUserReferralStats('user1');

      expect(stats.code).toBeTruthy();
      expect(stats.referralCount).toBe(1);
      expect(stats.convertedCount).toBe(1);
      expect(stats.pendingRewards).toBe(50);
      expect(stats.totalEarned).toBe(0);
    });
  });
});
