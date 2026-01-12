/**
 * Password Reset Service
 * Handles secure password reset token generation and validation.
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateResetTokenResult {
  success: boolean;
  token?: string; // Unhashed token to send to user
  expiresAt?: Date;
  error?: string;
}

export interface ValidateTokenResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const TOKEN_LENGTH = 32; // 256 bits
const TOKEN_EXPIRY_HOURS = 1; // Token valid for 1 hour
const BCRYPT_ROUNDS = 12;

// ============================================================================
// PASSWORD RESET SERVICE
// ============================================================================

export class PasswordResetService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a password reset token for a user
   * Returns the unhashed token to be sent via email
   */
  async createResetToken(email: string): Promise<CreateResetTokenResult> {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true },
      });

      if (!user) {
        // Don't reveal whether email exists
        logger.info('Password reset requested for non-existent email', { email });
        return { success: true }; // Return success to not leak user existence
      }

      // Generate secure random token
      const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex');

      // Hash token before storing (SHA-256)
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

      // Invalidate any existing unused tokens for this user
      await this.prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(), // Mark as used
        },
      });

      // Create new token
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      logger.info('Password reset token created', { userId: user.id });

      return {
        success: true,
        token, // Return unhashed token to send to user
        expiresAt,
      };
    } catch (error) {
      logger.error('Error creating password reset token', { error });
      return {
        success: false,
        error: 'Failed to create reset token',
      };
    }
  }

  /**
   * Validate a password reset token
   * Returns the userId if valid
   */
  async validateToken(token: string): Promise<ValidateTokenResult> {
    try {
      // Hash the provided token
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find the token record
      const resetToken = await this.prisma.passwordResetToken.findFirst({
        where: {
          tokenHash,
          usedAt: null, // Not used yet
          expiresAt: {
            gt: new Date(), // Not expired
          },
        },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
        },
      });

      if (!resetToken) {
        return {
          success: false,
          error: 'Invalid or expired token',
        };
      }

      return {
        success: true,
        userId: resetToken.userId,
      };
    } catch (error) {
      logger.error('Error validating password reset token', { error });
      return {
        success: false,
        error: 'Failed to validate token',
      };
    }
  }

  /**
   * Reset a user's password using a valid token
   */
  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResult> {
    try {
      // Validate token first
      const validation = await this.validateToken(token);

      if (!validation.success || !validation.userId) {
        return {
          success: false,
          error: validation.error || 'Invalid token',
        };
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Hash the token to find the record
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Use transaction to update password and mark token as used
      await this.prisma.$transaction(async (tx) => {
        // Update user's password
        await tx.user.update({
          where: { id: validation.userId },
          data: { passwordHash },
        });

        // Mark token as used
        await tx.passwordResetToken.updateMany({
          where: { tokenHash },
          data: { usedAt: new Date() },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId: validation.userId,
            action: 'password_reset',
            resourceType: 'user',
            resourceId: validation.userId,
            details: { method: 'token' },
          },
        });
      });

      logger.info('Password reset successful', { userId: validation.userId });

      return { success: true };
    } catch (error) {
      logger.error('Error resetting password', { error });
      return {
        success: false,
        error: 'Failed to reset password',
      };
    }
  }

  /**
   * Clean up expired tokens (for maintenance)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } }, // Expired
            { usedAt: { not: null } }, // Already used
          ],
        },
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired password reset tokens`);
      }

      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired tokens', { error });
      return 0;
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let passwordResetServiceInstance: PasswordResetService | null = null;

export function initPasswordResetService(prisma: PrismaClient): PasswordResetService {
  passwordResetServiceInstance = new PasswordResetService(prisma);
  return passwordResetServiceInstance;
}

export function getPasswordResetService(): PasswordResetService {
  if (!passwordResetServiceInstance) {
    throw new Error('PasswordResetService not initialized. Call initPasswordResetService first.');
  }
  return passwordResetServiceInstance;
}

export default PasswordResetService;
