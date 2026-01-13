import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import route creators
import {
  createProjectsRouter,
  createMilestonesRouter,
  createDeliverablesRouter,
  createAdminRouter,
  createNotionRouter,
  createUploadRouter,
  createLeadsRouter,
  createCheckoutRouter,
  createWebhooksRouter,
  createAuthRouter,
  createTeamRouter,
} from '../server/src/routes';
import { createSuperAdminRouter } from '../server/src/routes/superAdmin';
import passwordResetRouter from '../server/src/routes/passwordReset';

// Import services initialization
import {
  initStorageService,
  initAuditService,
  initAuthService,
  initEmailService,
  initNotionSyncService,
} from '../server/src/services';
import { initGoogleAuth } from '../server/src/services/googleAuthService';
import { initStripe } from '../server/src/utils/stripeHelpers';

// Import middleware
import {
  errorHandler,
  notFoundHandler,
  apiRateLimiter,
  authRateLimit,
  leadRateLimit,
  checkoutRateLimit,
  uploadRateLimit,
  adminRateLimit,
  requireAuth,
  requireNotionService,
  requireStorageService,
} from '../server/src/middleware';
import { logger, requestLogger } from '../server/src/logger';
import { initEnvironment, getFeatureFlags } from '../server/src/config/environment';
import { performHealthCheck } from '../server/src/services/healthService';

// Singleton pattern for Prisma in serverless
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Initialize services (idempotent - safe to call multiple times)
let servicesInitialized = false;

function initializeServices() {
  if (servicesInitialized) return;

  try {
    // Validate environment configuration
    const envConfig = initEnvironment();
    const features = getFeatureFlags();

    // Initialize Stripe
    if (process.env.STRIPE_SECRET_KEY) {
      initStripe({
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        successUrl: process.env.STRIPE_SUCCESS_URL || 'https://yourapp.vercel.app/success',
        cancelUrl: process.env.STRIPE_CANCEL_URL || 'https://yourapp.vercel.app/cancel',
      });
    }

    // Initialize Notion sync service if configured
    if (features.notionEnabled && process.env.NOTION_PROJECTS_DATABASE_ID) {
      initNotionSyncService(prisma, {
        notionApiKey: process.env.NOTION_API_KEY!,
        projectsDatabaseId: process.env.NOTION_PROJECTS_DATABASE_ID,
        rateLimitMs: 350,
        maxRetries: 3,
        retryDelayMs: 1000,
        batchSize: 10,
      });
    }

    // Initialize storage service
    if (features.storageEnabled && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      initStorageService({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
        bucketName: process.env.STORAGE_BUCKET || 'deliverables',
        maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
      });
    }

    // Initialize audit service
    initAuditService(prisma);

    // Initialize auth service
    initAuthService({
      jwtSecret: envConfig.JWT_SECRET,
      jwtExpiresIn: envConfig.JWT_EXPIRES_IN,
      saltRounds: 12,
    });

    // Initialize Google OAuth if configured
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      initGoogleAuth({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL}/auth/google/callback`,
      });
    }

    // Initialize email service
    const emailProvider = process.env.RESEND_API_KEY ? 'resend' :
                         process.env.SMTP_HOST ? 'nodemailer' : 'console';
    initEmailService({
      provider: emailProvider,
      resendApiKey: process.env.RESEND_API_KEY,
      smtpConfig: process.env.SMTP_HOST ? {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      } : undefined,
      defaultFrom: process.env.EMAIL_FROM || 'SAGE <hello@sage.design>',
      replyTo: process.env.EMAIL_REPLY_TO || 'support@sage.design',
    });

    servicesInitialized = true;
  } catch (error) {
    logger.error('Failed to initialize services', { error });
    // Don't throw - allow app to continue with degraded functionality
  }
}

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://*.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-user-id', 'x-user-type', 'x-client-id'],
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Stripe webhooks need the raw body for signature verification
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// JSON parsing
app.use(express.json({
  limit: '10mb',
  verify: (req: Request, _res: Response, buf: Buffer) => {
    (req as Request & { rawBody?: Buffer }).rawBody = buf;
  },
}));

// Request logging (skip for health checks in production)
app.use((req, res, next) => {
  if (req.path === '/api/health' || req.path.includes('health')) {
    return next();
  }
  requestLogger(req, res, next);
});

// Initialize services before handling requests
app.use((req, res, next) => {
  initializeServices();
  next();
});

// API Routes
// Auth routes (public)
app.use('/api/auth', authRateLimit, createAuthRouter(prisma));
app.use('/api/auth', authRateLimit, passwordResetRouter);
app.use('/api/webhooks', createWebhooksRouter(prisma));
app.use('/api/leads', leadRateLimit, createLeadsRouter(prisma));
app.use('/api/checkout', checkoutRateLimit, createCheckoutRouter(prisma));

// Protected routes
const apiAuth = requireAuth(prisma);
app.use('/api/projects', apiRateLimiter, apiAuth, createProjectsRouter(prisma));
app.use('/api/milestones', apiRateLimiter, apiAuth, createMilestonesRouter(prisma));
app.use('/api/deliverables', apiRateLimiter, apiAuth, createDeliverablesRouter(prisma));
app.use('/api/admin', apiAuth, adminRateLimit, createAdminRouter(prisma));
app.use('/api/super-admin', apiAuth, adminRateLimit, createSuperAdminRouter(prisma));
app.use('/api/notion', apiAuth, adminRateLimit, requireNotionService, createNotionRouter({ prisma }));
app.use('/api/upload', apiAuth, uploadRateLimit, requireStorageService, createUploadRouter({ prisma }));
app.use('/api/team', apiAuth, apiRateLimiter, createTeamRouter(prisma));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const detailed = req.query.detailed === 'true';
    const result = await performHealthCheck(prisma, { detailed });

    const statusCode = result.status === 'healthy' ? 200
                     : result.status === 'degraded' ? 200
                     : 503;

    res.status(statusCode).json({
      success: result.status !== 'unhealthy',
      serverless: true,
      ...result,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      serverless: true,
      error: 'Health check failed',
    });
  }
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-correlation-id, x-user-id');
    res.status(200).end();
    return;
  }

  // Use express to handle the request
  return new Promise((resolve, reject) => {
    app(req as unknown as Request, res as unknown as Response, (err: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}
