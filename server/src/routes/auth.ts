import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { prisma } from '../utils/prisma';
import { registerUserSchema, loginUserSchema, RegisterUserInput, LoginUserInput } from '../utils/validation';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../utils/auth';
import { logAuth } from '../services/auditService';

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData: RegisterUserInput = registerUserSchema.parse(req.body);
    const { email, password, name, address } = validatedData;

    // Check if user already exists (by email or address)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          address ? { address } : {},
        ].filter((condition) => Object.keys(condition).length > 0),
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: email && existingUser.email === email
            ? 'An account with this email already exists'
            : 'An account with this address already exists',
        },
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Determine user type based on auth method
    const userType = address && !email ? 'KAA_CLIENT' : 'SAGE_CLIENT';

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        address,
        passwordHash,
        userType,
        role: 'CLIENT',
      },
      select: {
        id: true,
        email: true,
        name: true,
        address: true,
        userType: true,
        role: true,
        tier: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = generateToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET
    );

    // Log audit event
    await logAuth('REGISTER', user.id, req, { email: user.email, userType });

    return res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData: LoginUserInput = loginUserSchema.parse(req.body);
    const { email, address, password } = validatedData;

    // Find user by email or address
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          address ? { address } : {},
        ].filter((condition) => Object.keys(condition).length > 0),
      },
      include: {
        client: {
          select: {
            id: true,
            tier: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email/address or password',
        },
      });
    }

    // Check if user has a password set
    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'PASSWORD_NOT_SET',
          message: 'Please set a password for your account',
        },
      });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email/address or password',
        },
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const token = generateToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET
    );

    // Return user data without password
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      address: user.address,
      userType: user.userType,
      role: user.role,
      tier: user.tier,
      client: user.client,
      lastLogin: new Date(),
    };

    // Log audit event
    await logAuth('LOGIN', user.id, req, { email: user.email });

    return res.status(200).json({
      success: true,
      data: {
        user: userData,
        token,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 * Requires Authorization header with Bearer token
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyToken(token, JWT_SECRET);

    if (!payload || typeof payload.userId !== 'string') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    }

    // Fetch user with related data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        address: true,
        userType: true,
        role: true,
        tier: true,
        createdAt: true,
        lastLogin: true,
        client: {
          select: {
            id: true,
            tier: true,
            status: true,
            stripeCustomerId: true,
            projects: {
              select: {
                id: true,
                name: true,
                tier: true,
                status: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 5, // Only return latest 5 projects
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/set-password
 * Set password for users created without one (e.g., from webhook)
 */
router.post('/set-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
        },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token, JWT_SECRET);

    if (!payload || typeof payload.userId !== 'string') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    }

    const { password } = req.body;

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters',
        },
      });
    }

    // Hash and update password
    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash },
    });

    // Log audit event
    await logAuth('PASSWORD_CHANGE', payload.userId, req);

    return res.status(200).json({
      success: true,
      message: 'Password set successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
