/**
 * Login Protection Middleware Tests
 */

import {
  recordFailedAttempt,
  clearFailedAttempts,
  isLockedOut,
  getLockoutRemaining,
} from '../middleware/loginProtection';

describe('Login Protection', () => {
  const testIdentifier = 'email:test@example.com';

  beforeEach(() => {
    // Clear any existing attempts
    clearFailedAttempts(testIdentifier);
  });

  describe('recordFailedAttempt', () => {
    it('should track failed attempts', () => {
      const result1 = recordFailedAttempt(testIdentifier);
      expect(result1.locked).toBe(false);
      expect(result1.attemptsRemaining).toBe(4);

      const result2 = recordFailedAttempt(testIdentifier);
      expect(result2.locked).toBe(false);
      expect(result2.attemptsRemaining).toBe(3);
    });

    it('should lock after max attempts', () => {
      // Record 5 failed attempts
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt(testIdentifier);
      }

      const finalResult = recordFailedAttempt(testIdentifier);
      expect(finalResult.locked).toBe(true);
      expect(finalResult.attemptsRemaining).toBe(0);
    });

    it('should reset count for new identifier', () => {
      const id1 = 'email:user1@example.com';
      const id2 = 'email:user2@example.com';

      recordFailedAttempt(id1);
      recordFailedAttempt(id1);

      const result = recordFailedAttempt(id2);
      expect(result.attemptsRemaining).toBe(4); // Fresh start for new user

      // Cleanup
      clearFailedAttempts(id1);
      clearFailedAttempts(id2);
    });
  });

  describe('isLockedOut', () => {
    it('should return false for new identifier', () => {
      expect(isLockedOut('email:new@example.com')).toBe(false);
    });

    it('should return true after lockout', () => {
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testIdentifier);
      }

      expect(isLockedOut(testIdentifier)).toBe(true);
    });
  });

  describe('getLockoutRemaining', () => {
    it('should return 0 for non-locked identifier', () => {
      expect(getLockoutRemaining('email:notlocked@example.com')).toBe(0);
    });

    it('should return positive value when locked', () => {
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testIdentifier);
      }

      const remaining = getLockoutRemaining(testIdentifier);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(30 * 60); // Max 30 minutes
    });
  });

  describe('clearFailedAttempts', () => {
    it('should clear lockout', () => {
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testIdentifier);
      }

      expect(isLockedOut(testIdentifier)).toBe(true);

      clearFailedAttempts(testIdentifier);

      expect(isLockedOut(testIdentifier)).toBe(false);
    });

    it('should allow new attempts after clearing', () => {
      recordFailedAttempt(testIdentifier);
      recordFailedAttempt(testIdentifier);

      clearFailedAttempts(testIdentifier);

      const result = recordFailedAttempt(testIdentifier);
      expect(result.attemptsRemaining).toBe(4); // Fresh start
    });
  });

  describe('different identifiers', () => {
    it('should track attempts separately per identifier', () => {
      const id1 = 'email:user1@test.com';
      const id2 = 'ip:192.168.1.1';

      // Lock id1
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(id1);
      }

      expect(isLockedOut(id1)).toBe(true);
      expect(isLockedOut(id2)).toBe(false);

      // id2 can still make attempts
      const result = recordFailedAttempt(id2);
      expect(result.locked).toBe(false);

      // Cleanup
      clearFailedAttempts(id1);
      clearFailedAttempts(id2);
    });
  });
});
