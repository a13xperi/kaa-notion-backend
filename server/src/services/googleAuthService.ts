/**
 * Google OAuth Service
 * Handles Google OAuth authentication flow.
 */

import { PrismaClient, UserType } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../config/logger';
import { generateToken, generateRefreshToken, getAuthConfig } from './authService';
import { unauthorized, internalError } from '../utils/AppError';

// ============================================================================
// TYPES
// ============================================================================

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

export interface GoogleAuthResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    userType: UserType;
    tier: number | null;
    isNewUser: boolean;
  };
  token: string;
  refreshToken: string;
  expiresIn: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

let googleConfig: GoogleAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
};

let oAuth2Client: OAuth2Client | null = null;

export function initGoogleAuth(config?: Partial<GoogleAuthConfig>): void {
  if (config) {
    googleConfig = { ...googleConfig, ...config };
  }

  if (googleConfig.clientId && googleConfig.clientSecret) {
    oAuth2Client = new OAuth2Client(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );
    logger.info('Google OAuth initialized');
  } else {
    logger.warn('Google OAuth not configured - missing client ID or secret');
  }
}

export function isGoogleAuthEnabled(): boolean {
  return !!(googleConfig.clientId && googleConfig.clientSecret);
}

// ============================================================================
// GOOGLE AUTH FLOW
// ============================================================================

/**
 * Generate the Google OAuth consent URL.
 */
export function getGoogleAuthUrl(state?: string): string {
  if (!oAuth2Client) {
    throw internalError('Google OAuth not configured');
  }

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  const options: {
    access_type: 'offline';
    scope: string[];
    prompt: 'consent';
    response_type: 'code';
    state?: string;
  } = {
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    response_type: 'code',
  };

  if (state) {
    options.state = state;
  }

  return oAuth2Client.generateAuthUrl(options);
}

/**
 * Exchange authorization code for tokens and get user info.
 */
export async function handleGoogleCallback(
  prisma: PrismaClient,
  code: string
): Promise<GoogleAuthResult> {
  if (!oAuth2Client) {
    throw internalError('Google OAuth not configured');
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Get user info from Google
    const userInfo = await getGoogleUserInfo(tokens.access_token!);

    if (!userInfo.email) {
      throw unauthorized('Google account does not have an email');
    }

    if (!userInfo.emailVerified) {
      throw unauthorized('Google account email is not verified');
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email.toLowerCase() },
    });

    let isNewUser = false;

    if (!user) {
      // Create new user from Google account
      user = await prisma.user.create({
        data: {
          email: userInfo.email.toLowerCase(),
          name: userInfo.name,
          userType: 'SAGE_CLIENT',
          // No password hash for OAuth users
        },
      });
      isNewUser = true;
      logger.info('New user created via Google OAuth', { userId: user.id, email: user.email });
    } else {
      // Update user name if not set
      if (!user.name && userInfo.name) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: userInfo.name },
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    // Generate JWT tokens
    const authConfig = getAuthConfig();
    const tokenPayload = {
      userId: user.id,
      email: user.email!,
      userType: user.userType,
      tier: user.tier || undefined,
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email!,
        name: user.name,
        userType: user.userType,
        tier: user.tier,
        isNewUser,
      },
      token,
      refreshToken,
      expiresIn: authConfig.jwtExpiresIn,
    };
  } catch (error) {
    logger.error('Google OAuth callback error', { error });
    if ((error as Error).message.includes('invalid_grant')) {
      throw unauthorized('Invalid or expired authorization code');
    }
    throw error;
  }
}

/**
 * Verify a Google ID token (for mobile/frontend direct auth).
 */
export async function verifyGoogleIdToken(
  prisma: PrismaClient,
  idToken: string
): Promise<GoogleAuthResult> {
  if (!oAuth2Client) {
    throw internalError('Google OAuth not configured');
  }

  try {
    const ticket = await oAuth2Client.verifyIdToken({
      idToken,
      audience: googleConfig.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw unauthorized('Invalid Google ID token');
    }

    if (!payload.email_verified) {
      throw unauthorized('Google account email is not verified');
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email.toLowerCase(),
          name: payload.name || null,
          userType: 'SAGE_CLIENT',
        },
      });
      isNewUser = true;
      logger.info('New user created via Google ID token', { userId: user.id });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    // Generate JWT tokens
    const authConfig = getAuthConfig();
    const tokenPayload = {
      userId: user.id,
      email: user.email!,
      userType: user.userType,
      tier: user.tier || undefined,
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email!,
        name: user.name,
        userType: user.userType,
        tier: user.tier,
        isNewUser,
      },
      token,
      refreshToken,
      expiresIn: authConfig.jwtExpiresIn,
    };
  } catch (error) {
    logger.error('Google ID token verification error', { error });
    throw unauthorized('Invalid Google ID token');
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  const data = await response.json() as {
    id: string;
    email: string;
    name: string;
    picture?: string;
    verified_email: boolean;
  };

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
    emailVerified: data.verified_email,
  };
}

export default {
  initGoogleAuth,
  isGoogleAuthEnabled,
  getGoogleAuthUrl,
  handleGoogleCallback,
  verifyGoogleIdToken,
};
