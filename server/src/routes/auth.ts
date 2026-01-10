/**
 * Auth Routes
 * POST /api/auth/register - Register new user
 * POST /api/auth/login - Authenticate user
 * POST /api/auth/refresh - Refresh access token
 * GET /api/auth/me - Get current user profile
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, UserType } from '@prisma/client';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  getUserProfile,
  verifyToken,
  extractToken,
  refreshAccessToken,
} from '../services/authService';
import { validationError, unauthorized, notFound } from '../utils/AppError';
import { logger } from '../logger';
import { loginProtection, onLoginSuccess, onLoginFailure } from '../middleware';

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
// INTERFACES
// ============================================================================

// Note: Using Request directly and casting to access token payload
// to avoid conflicts with Express's built-in user typing

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
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate input
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
          throw validationError(
            validation.error.issues.map((e: { message: string }) => e.message).join(', '),
            { errors: validation.error.issues }
          );
        }

        const { email, password, tier } = validation.data;

        // Register the user
        const result = await registerUser(prisma, {
          email,
          password,
          userType: 'SAGE_CLIENT',
          tier,
        });

        logger.info('User registered', { userId: result.user.id, email });

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
          return res.status(409).json({
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'An account with this email already exists',
            },
          });
        }
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
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate input
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
          throw validationError(
            validation.error.issues.map((e: { message: string }) => e.message).join(', '),
            { errors: validation.error.issues }
          );
        }

        const { email, password } = validation.data;

        const { rememberMe } = validation.data;
        
        // Authenticate user
        const result = await loginUser(prisma, { email, password, rememberMe });

        // Clear failed login attempts on success
        onLoginSuccess(req);

        logger.info('User logged in', { userId: result.user.id, email });

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
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate input
        const validation = refreshTokenSchema.safeParse(req.body);
        if (!validation.success) {
          throw validationError(
            'Refresh token is required',
            { errors: validation.error.issues }
          );
        }

        const { refreshToken } = validation.data;
        
        // Refresh the tokens
        const result = await refreshAccessToken(prisma, refreshToken);

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
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_REFRESH_TOKEN',
              message: 'Refresh token is invalid or expired. Please log in again.',
            },
          });
        }
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
        } catch {
          // Token invalid, but still log the attempt
          logger.info('Logout attempt with invalid token');
        }
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
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
