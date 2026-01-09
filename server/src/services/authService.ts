/**
 * Auth Service
 * Handles user authentication, registration, and JWT token management.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, User, UserType } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  saltRounds: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  userType: UserType;
  tier?: number;
}

export interface AuthResult {
  user: Pick<User, 'id' | 'email' | 'userType' | 'tier'>;
  token: string;
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
}

// ============================================================================
// CONFIGURATION
// ============================================================================

let authConfig: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'development-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
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
 * Generate a JWT token for a user.
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, authConfig.jwtSecret, {
    expiresIn: authConfig.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verify and decode a JWT token.
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, authConfig.jwtSecret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
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
    throw new Error('User with this email already exists');
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

  // Generate token - use email we just set (we know it's not null)
  const token = generateToken({
    userId: user.id,
    email: user.email!, // We just created this user with an email
    userType: user.userType,
    tier: user.tier || undefined,
  });

  return {
    user: {
      id: user.id,
      email: user.email!,
      userType: user.userType,
      tier: user.tier,
    },
    token,
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
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isValid = await comparePassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Generate token - user found by email so it exists
  const token = generateToken({
    userId: user.id,
    email: user.email!, // User was found by email, so it exists
    userType: user.userType,
    tier: user.tier || undefined,
  });

  return {
    user: {
      id: user.id,
      email: user.email!,
      userType: user.userType,
      tier: user.tier,
    },
    token,
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
    throw new Error('User not found');
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
// PASSWORD RESET (Placeholder for future implementation)
// ============================================================================

/**
 * Initiate password reset - generates a reset token.
 * Note: In production, this should send an email with a reset link.
 */
export async function initiatePasswordReset(
  prisma: PrismaClient,
  email: string
): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always return success message to prevent email enumeration
  if (!user) {
    return { message: 'If an account exists, a reset link will be sent' };
  }

  // TODO: Generate reset token, store it, and send email
  // For now, just return the message
  return { message: 'If an account exists, a reset link will be sent' };
}

/**
 * Complete password reset with a new password.
 */
export async function completePasswordReset(
  prisma: PrismaClient,
  _resetToken: string,
  _newPassword: string
): Promise<{ message: string }> {
  // TODO: Verify reset token, update password
  return { message: 'Password reset functionality not yet implemented' };
}
