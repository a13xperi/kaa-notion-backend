/**
 * Auth Routes
 * POST /api/auth/register - Register new user
 * POST /api/auth/login - Authenticate user
 * POST /api/auth/refresh - Refresh access token
 * GET /api/auth/me - Get current user profile
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, UserType } from '@prisma/client';
import {
  registerUser,
  loginUser,
  getUserProfile,
  verifyToken,
  extractToken,
  refreshAccessToken,
} from '../services/authService';
import { AuditActions, ResourceTypes, getRequestAuditMetadata, logAudit } from '../services/auditService';
import { validationError, unauthorized, notFound } from '../utils/AppError';
import { logger } from '../logger';
import { loginProtection, onLoginSuccess, onLoginFailure, validateBody } from '../middleware';
import { recordAuthAttempt } from '../config/metrics';
import { z } from 'zod/v3';
import {
  isGoogleAuthEnabled,
  getGoogleAuthUrl,
  handleGoogleCallback,
  verifyGoogleIdToken,
} from '../services/googleAuthService';

// ============================================================================
// SCHEMAS
// ============================================================================

const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  tier: z.coerce.number().min(1).max(4).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

const googleIdTokenSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
});

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createAuthRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * @openapi
   * /api/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterRequest'
   *     responses:
   *       201:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       409:
   *         description: Email already exists
   *       422:
   *         $ref: '#/components/responses/ValidationError'
   */
  router.post(
    '/register',
    validateBody(registerSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email, password, tier } = req.body as RegisterInput;

        // Register the user
        const result = await registerUser(prisma, {
          email,
          password,
          userType: 'SAGE_CLIENT',
          tier,
        });

        logger.info('User registered', { userId: result.user.id, email });
        recordAuthAttempt('register', 'success');
        void logAudit({
          action: AuditActions.REGISTER,
          resourceType: ResourceTypes.USER,
          resourceId: result.user.id,
          userId: result.user.id,
          details: {
            email: result.user.email,
            userType: result.user.userType,
            tier: result.user.tier ?? null,
          },
          metadata: getRequestAuditMetadata(req),
        });

        res.status(201).json({
          success: true,
          data: {
            user: result.user,
            token: result.token,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        });
      } catch (error) {
        // Handle duplicate email error
        if ((error as Error).message.includes('already exists')) {
          recordAuthAttempt('register', 'failed');
          return res.status(409).json({
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'An account with this email already exists',
            },
          });
        }
        recordAuthAttempt('register', 'failed');
        next(error);
      }
    }
  );

  /**
   * @openapi
   * /api/auth/login:
   *   post:
   *     summary: Authenticate user
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       401:
   *         description: Invalid credentials
   *       422:
   *         $ref: '#/components/responses/ValidationError'
   */
  router.post(
    '/login',
    loginProtection(), // Prevent brute force attacks
    validateBody(loginSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email, password, rememberMe } = req.body as LoginInput;
        
        // Authenticate user
        const result = await loginUser(prisma, { email, password, rememberMe });

        // Clear failed login attempts on success
        onLoginSuccess(req);

        logger.info('User logged in', { userId: result.user.id, email });
        recordAuthAttempt('login', 'success');
        void logAudit({
          action: AuditActions.LOGIN,
          resourceType: ResourceTypes.USER,
          resourceId: result.user.id,
          userId: result.user.id,
          details: {
            email: result.user.email,
            userType: result.user.userType,
            rememberMe: !!rememberMe,
          },
          metadata: getRequestAuditMetadata(req),
        });

        res.json({
          success: true,
          data: {
            user: result.user,
            token: result.token,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        });
      } catch (error) {
        // Handle invalid credentials
        if ((error as Error).message.includes('Invalid email or password')) {
          // Record failed attempt
          const { locked, attemptsRemaining } = onLoginFailure(req);
          recordAuthAttempt('login', 'failed');
          
          if (locked) {
            return res.status(429).json({
              success: false,
              error: {
                code: 'ACCOUNT_LOCKED',
                message: 'Too many failed login attempts. Please try again later.',
              },
            });
          }

          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
              attemptsRemaining,
            },
          });
        }
        recordAuthAttempt('login', 'failed');
        next(error);
      }
    }
  );

  // ============================================================================
  /**
   * @openapi
   * /api/auth/refresh:
   *   post:
   *     summary: Refresh access token
   *     description: Exchange a refresh token for a new access token
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refreshToken
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Tokens refreshed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     token:
   *                       type: string
   *                     refreshToken:
   *                       type: string
   *                     expiresIn:
   *                       type: string
   *       401:
   *         description: Invalid or expired refresh token
   *       422:
   *         $ref: '#/components/responses/ValidationError'
   */
  router.post(
    '/refresh',
    validateBody(refreshTokenSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { refreshToken } = req.body as RefreshTokenInput;
        
        // Refresh the tokens
        const result = await refreshAccessToken(prisma, refreshToken);

        recordAuthAttempt('refresh', 'success');
        void logAudit({
          action: AuditActions.TOKEN_REFRESH,
          resourceType: ResourceTypes.USER,
          resourceId: result.userId,
          userId: result.userId,
          details: {
            tokenExpiresIn: result.expiresIn,
          },
          metadata: getRequestAuditMetadata(req),
        });
        res.json({
          success: true,
          data: {
            token: result.token,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        });
      } catch (error) {
        // Handle token errors
        const message = (error as Error).message;
        if (message.includes('expired') || message.includes('Invalid')) {
          recordAuthAttempt('refresh', 'failed');
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_REFRESH_TOKEN',
              message: 'Refresh token is invalid or expired. Please log in again.',
            },
          });
        }
        recordAuthAttempt('refresh', 'failed');
        next(error);
      }
    }
  );

  /**
   * @openapi
   * /api/auth/me:
   *   get:
   *     summary: Get current user profile
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *
   * Get current user's profile.
   * Requires authentication.
   */
  router.get(
    '/me',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Extract and verify token
        const token = extractToken(req.headers.authorization);
        if (!token) {
          throw unauthorized('Authentication required');
        }

        let payload;
        try {
          payload = verifyToken(token);
        } catch {
          throw unauthorized('Invalid or expired token');
        }

        // Get user profile
        const profile = await getUserProfile(prisma, payload.userId);

        res.json({
          success: true,
          data: profile,
        });
      } catch (error) {
        if ((error as Error).message === 'User not found') {
          throw notFound('User not found');
        }
        next(error);
      }
    }
  );

  /**
   * POST /logout
   * Logout the current user.
   * Note: Since we use JWT, logout is client-side.
   * This endpoint can be used for audit logging.
   */
  router.post(
    '/logout',
    async (req: Request, res: Response, _next: NextFunction) => {
      const token = extractToken(req.headers.authorization);
      
      if (token) {
        try {
          const payload = verifyToken(token);
          logger.info('User logged out', { userId: payload.userId });
          void logAudit({
            action: AuditActions.LOGOUT,
            resourceType: ResourceTypes.USER,
            resourceId: payload.userId,
            userId: payload.userId,
            metadata: getRequestAuditMetadata(req),
          });
        } catch {
          // Token invalid, but still log the attempt
          logger.info('Logout attempt with invalid token');
          void logAudit({
            action: AuditActions.LOGOUT,
            resourceType: ResourceTypes.USER,
            details: {
              reason: 'invalid_token',
            },
            metadata: getRequestAuditMetadata(req),
          });
        }
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    }
  );

  // ============================================================================
  // GOOGLE OAUTH ROUTES
  // ============================================================================

  /**
   * GET /google
   * Get Google OAuth authorization URL.
   */
  router.get(
    '/google',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!isGoogleAuthEnabled()) {
          return res.status(503).json({
            success: false,
            error: {
              code: 'OAUTH_NOT_CONFIGURED',
              message: 'Google OAuth is not configured',
            },
          });
        }

        const state = req.query.state as string | undefined;
        const authUrl = getGoogleAuthUrl(state);

        res.json({
          success: true,
          data: {
            authUrl,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /google/callback
   * Handle Google OAuth callback with authorization code.
   */
  router.get(
    '/google/callback',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { code, error: oauthError, state } = req.query;

        if (oauthError) {
          logger.warn('Google OAuth error', { error: oauthError });
          return res.status(400).json({
            success: false,
            error: {
              code: 'OAUTH_ERROR',
              message: oauthError as string,
            },
          });
        }

        if (!code || typeof code !== 'string') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_CODE',
              message: 'Authorization code is required',
            },
          });
        }

        const result = await handleGoogleCallback(prisma, code);

        logger.info('User authenticated via Google OAuth', {
          userId: result.user.id,
          isNewUser: result.user.isNewUser,
        });

        recordAuthAttempt('google_login', 'success');
        void logAudit({
          action: AuditActions.LOGIN,
          resourceType: ResourceTypes.USER,
          resourceId: result.user.id,
          userId: result.user.id,
          details: {
            email: result.user.email,
            method: 'google_oauth',
            isNewUser: result.user.isNewUser,
          },
          metadata: getRequestAuditMetadata(req),
        });

        // Redirect to frontend with tokens (or return JSON for API usage)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = new URL('/auth/callback', frontendUrl);
        redirectUrl.searchParams.set('token', result.token);
        redirectUrl.searchParams.set('refreshToken', result.refreshToken);
        if (state) {
          redirectUrl.searchParams.set('state', state as string);
        }

        res.redirect(redirectUrl.toString());
      } catch (error) {
        recordAuthAttempt('google_login', 'failed');
        next(error);
      }
    }
  );

  /**
   * POST /google/token
   * Authenticate using a Google ID token (for mobile/SPA direct auth).
   */
  router.post(
    '/google/token',
    validateBody(googleIdTokenSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!isGoogleAuthEnabled()) {
          return res.status(503).json({
            success: false,
            error: {
              code: 'OAUTH_NOT_CONFIGURED',
              message: 'Google OAuth is not configured',
            },
          });
        }

        const { idToken } = req.body;
        const result = await verifyGoogleIdToken(prisma, idToken);

        logger.info('User authenticated via Google ID token', {
          userId: result.user.id,
          isNewUser: result.user.isNewUser,
        });

        recordAuthAttempt('google_token', 'success');
        void logAudit({
          action: AuditActions.LOGIN,
          resourceType: ResourceTypes.USER,
          resourceId: result.user.id,
          userId: result.user.id,
          details: {
            email: result.user.email,
            method: 'google_id_token',
            isNewUser: result.user.isNewUser,
          },
          metadata: getRequestAuditMetadata(req),
        });

        res.json({
          success: true,
          data: {
            user: {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              userType: result.user.userType,
              tier: result.user.tier,
            },
            token: result.token,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
            isNewUser: result.user.isNewUser,
          },
        });
      } catch (error) {
        recordAuthAttempt('google_token', 'failed');
        next(error);
      }
    }
  );

  /**
   * GET /providers
   * Get available authentication providers.
   */
  router.get(
    '/providers',
    async (_req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          providers: [
            { id: 'email', name: 'Email & Password', enabled: true },
            { id: 'google', name: 'Google', enabled: isGoogleAuthEnabled() },
          ],
        },
      });
    }
  );

  /**
   * POST /password/reset-request
   * Request a password reset email.
   */
  router.post(
    '/password/reset-request',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
          throw validationError('Email is required');
        }

        const { initiatePasswordReset } = await import('../services/authService');
        const result = await initiatePasswordReset(prisma, email);

        // In development, include token for testing
        const response: { success: boolean; message: string; token?: string } = {
          success: true,
          message: result.message,
        };

        if (process.env.NODE_ENV === 'development' && result.token) {
          response.token = result.token;
        }

        res.json(response);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /password/validate-token
   * Validate a password reset token before showing reset form.
   */
  router.post(
    '/password/validate-token',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { token } = req.body;

        if (!token || typeof token !== 'string') {
          throw validationError('Token is required');
        }

        const { validatePasswordResetToken } = await import('../services/authService');
        const result = await validatePasswordResetToken(prisma, token);

        if (!result.valid) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: result.error || 'Invalid or expired token',
            },
          });
        }

        res.json({
          success: true,
          message: 'Token is valid',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /password/reset
   * Complete password reset with new password.
   */
  router.post(
    '/password/reset',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { token, password } = req.body;

        if (!token || typeof token !== 'string') {
          throw validationError('Token is required');
        }

        if (!password || typeof password !== 'string') {
          throw validationError('Password is required');
        }

        // Validate password strength
        if (password.length < 8) {
          throw validationError('Password must be at least 8 characters');
        }

        if (!/[A-Z]/.test(password)) {
          throw validationError('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
          throw validationError('Password must contain at least one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
          throw validationError('Password must contain at least one number');
        }

        const { completePasswordReset } = await import('../services/authService');
        const result = await completePasswordReset(prisma, token, password);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'RESET_FAILED',
              message: result.message,
            },
          });
        }

        res.json({
          success: true,
          message: result.message,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
