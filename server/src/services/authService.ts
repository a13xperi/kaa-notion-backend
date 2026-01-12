/**
 * Auth Service
 * Handles user authentication, registration, and JWT token management.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, User, UserType } from '@prisma/client';
import { logger } from '../config/logger';
import {
  invalidToken,
  tokenExpired,
  conflict,
  unauthorized,
  notFound,
  ErrorCodes,
} from '../utils/AppError';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  saltRounds: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  userType: UserType;
  tier?: number;
  type: 'access' | 'refresh';
}

export interface AuthResult {
  user: Pick<User, 'id' | 'email' | 'userType' | 'tier'>;
  token: string;
  refreshToken?: string;
  expiresIn: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  userType?: UserType;
  tier?: number;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

let authConfig: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'development-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m', // Short-lived access token
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d', // Long-lived refresh token
  saltRounds: 12,
};

export function initAuthService(config: Partial<AuthConfig>): void {
  authConfig = { ...authConfig, ...config };
}

export function getAuthConfig(): AuthConfig {
  return authConfig;
}

// ============================================================================
// PASSWORD HASHING
// ============================================================================

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, authConfig.saltRounds);
}

/**
 * Compare a plain password with a hash.
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Generate an access token for a user.
 */
export function generateToken(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    authConfig.jwtSecret, 
    { expiresIn: authConfig.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );
}

/**
 * Generate a refresh token for a user.
 */
export function generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    authConfig.jwtSecret,
    { expiresIn: authConfig.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'] }
  );
}

/**
 * Verify and decode a JWT token.
 */
export function verifyToken(token: string, expectedType: 'access' | 'refresh' = 'access'): TokenPayload {
  try {
    const payload = jwt.verify(token, authConfig.jwtSecret) as TokenPayload;

    // Backward compatibility: tokens without type are treated as access tokens
    const tokenType = payload.type || 'access';

    if (tokenType !== expectedType) {
      throw invalidToken(`Invalid token type: expected ${expectedType}`);
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw tokenExpired();
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw invalidToken();
    }
    throw error;
  }
}

/**
 * Extract token from Authorization header.
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const [type, token] = authHeader.split(' ');
  if (type.toLowerCase() !== 'bearer' || !token) return null;
  
  return token;
}

// ============================================================================
// USER REGISTRATION
// ============================================================================

/**
 * Register a new user.
 */
export async function registerUser(
  prisma: PrismaClient,
  input: RegisterInput
): Promise<AuthResult> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existingUser) {
    throw conflict('User with this email already exists', ErrorCodes.DUPLICATE_EMAIL);
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      userType: input.userType || 'SAGE_CLIENT',
      tier: input.tier,
    },
  });

  // Generate tokens - use email we just set (we know it's not null)
  const tokenPayload = {
    userId: user.id,
    email: user.email!, // We just created this user with an email
    userType: user.userType,
    tier: user.tier || undefined,
  };
  
  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return {
    user: {
      id: user.id,
      email: user.email!,
      userType: user.userType,
      tier: user.tier,
    },
    token,
    refreshToken,
    expiresIn: authConfig.jwtExpiresIn,
  };
}

// ============================================================================
// USER LOGIN
// ============================================================================

/**
 * Authenticate a user with email and password.
 */
export async function loginUser(
  prisma: PrismaClient,
  input: LoginInput
): Promise<AuthResult> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user) {
    throw unauthorized('Invalid email or password', ErrorCodes.INVALID_CREDENTIALS);
  }

  // Verify password
  const isValid = await comparePassword(input.password, user.passwordHash);
  if (!isValid) {
    throw unauthorized('Invalid email or password', ErrorCodes.INVALID_CREDENTIALS);
  }

  // Generate tokens - user found by email so it exists
  const tokenPayload = {
    userId: user.id,
    email: user.email!, // User was found by email, so it exists
    userType: user.userType,
    tier: user.tier || undefined,
  };
  
  const token = generateToken(tokenPayload);
  
  // Only generate refresh token if rememberMe is enabled
  const refreshToken = input.rememberMe ? generateRefreshToken(tokenPayload) : undefined;

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  return {
    user: {
      id: user.id,
      email: user.email!,
      userType: user.userType,
      tier: user.tier,
    },
    token,
    refreshToken,
    expiresIn: authConfig.jwtExpiresIn,
  };
}

// ============================================================================
// USER PROFILE
// ============================================================================

export interface UserProfile {
  id: string;
  email: string | null;
  userType: UserType;
  tier: number | null;
  client?: {
    id: string;
    status: string;
    projectAddress: string | null;
  } | null;
  projects?: {
    id: string;
    name: string;
    status: string;
    tier: number;
  }[];
  createdAt: Date;
}

/**
 * Get the current user's profile with client and project info.
 */
export async function getUserProfile(
  prisma: PrismaClient,
  userId: string
): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      client: {
        include: {
          projects: {
            select: {
              id: true,
              name: true,
              status: true,
              tier: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!user) {
    throw notFound('User');
  }

  return {
    id: user.id,
    email: user.email,
    userType: user.userType,
    tier: user.tier,
    client: user.client ? {
      id: user.client.id,
      status: user.client.status,
      projectAddress: user.client.projectAddress,
    } : null,
    projects: user.client?.projects || [],
    createdAt: user.createdAt,
  };
}

// ============================================================================
// TOKEN REFRESH
// ============================================================================

export interface RefreshResult {
  token: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(
  prisma: PrismaClient,
  refreshToken: string
): Promise<RefreshResult> {
  // Verify the refresh token
  const payload = verifyToken(refreshToken, 'refresh');
  
  // Verify user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    throw notFound('User');
  }

  // Generate new tokens
  const tokenPayload = {
    userId: user.id,
    email: user.email!,
    userType: user.userType,
    tier: user.tier || undefined,
  };

  const newAccessToken = generateToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  return {
    token: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: authConfig.jwtExpiresIn,
  };
}

// ============================================================================
// PASSWORD RESET
// ============================================================================

import { PasswordResetService } from './passwordResetService';
import { getEmailService } from './emailService';

/**
 * Initiate password reset - generates a reset token and sends email.
 */
export async function initiatePasswordReset(
  prisma: PrismaClient,
  email: string
): Promise<{ message: string; token?: string }> {
  const passwordResetService = new PasswordResetService(prisma);
  const result = await passwordResetService.createResetToken(email.toLowerCase());

  // Always return success message to prevent email enumeration
  const message = 'If an account exists, a reset link will be sent';

  if (result.success && result.token) {
    // Send password reset email
    try {
      const emailService = getEmailService();
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${result.token}`;

      await emailService.sendPasswordResetEmail(email, resetUrl, result.expiresAt!);
      logger.info('Password reset email sent', { email });
    } catch (error) {
      // Log error but don't fail the request
      logger.error('Failed to send password reset email', { email, error });
    }

    // In development, also return the token for testing
    if (process.env.NODE_ENV === 'development') {
      return { message, token: result.token };
    }
  }

  return { message };
}

/**
 * Validate a password reset token.
 */
export async function validatePasswordResetToken(
  prisma: PrismaClient,
  token: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const passwordResetService = new PasswordResetService(prisma);
  const result = await passwordResetService.validateToken(token);

  return {
    valid: result.success,
    userId: result.userId,
    error: result.error,
  };
}

/**
 * Complete password reset with a new password.
 */
export async function completePasswordReset(
  prisma: PrismaClient,
  resetToken: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const passwordResetService = new PasswordResetService(prisma);
  const result = await passwordResetService.resetPassword(resetToken, newPassword);

  if (result.success) {
    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }

  return {
    success: false,
    message: result.error || 'Failed to reset password',
  };
}
