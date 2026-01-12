/**
 * Environment Configuration & Validation
 * Validates required environment variables at startup.
 */

import { z } from 'zod/v3';
import { logger } from '../logger';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

/**
 * Required environment variables schema
 */
const requiredEnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),

  // Database (required)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT Authentication (required)
  // NOTE: Production requires a strong secret (see validation below) to prevent token forgery.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

/**
 * Optional environment variables schema
 */
const optionalEnvSchema = z.object({
  // Stripe (optional but recommended)
  // NOTE: If Stripe is enabled in production, webhook signing must be configured.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SUCCESS_URL: z.string().url().optional(),
  STRIPE_CANCEL_URL: z.string().url().optional(),

  // Notion (optional)
  NOTION_API_KEY: z.string().optional(),
  NOTION_PROJECTS_DATABASE_ID: z.string().optional(),
  NOTION_SIGNING_SECRET: z.string().optional(),

  // Supabase Storage (optional)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().default('deliverables'),
  MAX_FILE_SIZE_MB: z.string().default('50').transform(Number),

  // Email (optional - falls back to console)
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_SECURE: z.string().transform(v => v === 'true').optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('SAGE <hello@sage.design>'),
  EMAIL_REPLY_TO: z.string().default('support@sage.design'),

  // Frontend & CORS
  // NOTE: Production requires explicit allowed origins to prevent permissive CORS.
  FRONTEND_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).optional(),
  SERVICE_NAME: z.string().default('sage-api'),

  // API Docs
  ENABLE_API_DOCS: z.string().transform(v => v === 'true').optional(),

  // Figma (legacy)
  FIGMA_ACCESS_TOKEN: z.string().optional(),
});

// Combined schema
const envSchema = requiredEnvSchema.merge(optionalEnvSchema);

// ============================================================================
// TYPES
// ============================================================================

export type Environment = z.infer<typeof envSchema>;

export interface ValidationResult {
  valid: boolean;
  config?: Environment;
  errors?: string[];
  warnings?: string[];
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate environment variables
 */
export function validateEnvironment(): ValidationResult {
  const warnings: string[] = [];
  const productionErrors: string[] = [];
  
  // Parse and validate
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(issue => {
      const path = issue.path.join('.');
      return `${path}: ${issue.message}`;
    });
    
    return {
      valid: false,
      errors,
    };
  }

  const config = result.data;

  // Production-specific FATAL errors (block startup)
  if (config.NODE_ENV === 'production') {
    // JWT_SECRET must be strong in production
    const disallowedSecrets = new Set([
      'development-secret-key',
      'development-secret-change-in-production',
    ]);
    if (disallowedSecrets.has(config.JWT_SECRET) || config.JWT_SECRET.length < 64) {
      productionErrors.push('JWT_SECRET must be at least 64 characters and not a default value in production');
    }

    // CORS must be configured in production
    if (!config.CORS_ORIGINS && !config.FRONTEND_URL) {
      productionErrors.push('Either CORS_ORIGINS or FRONTEND_URL must be set in production');
    }

    // Stripe webhook secret required if Stripe is enabled
    if (config.STRIPE_SECRET_KEY && !config.STRIPE_WEBHOOK_SECRET) {
      productionErrors.push('STRIPE_WEBHOOK_SECRET required when STRIPE_SECRET_KEY is set');
    }
  }

  // Return early if production errors exist
  if (productionErrors.length > 0) {
    return {
      valid: false,
      errors: productionErrors,
    };
  }

  // Production-specific warnings (non-fatal)
  if (config.NODE_ENV === 'production') {
    if (!config.STRIPE_SECRET_KEY) {
      warnings.push('STRIPE_SECRET_KEY not set - payments will not work');
    }
    if (!config.RESEND_API_KEY && !config.SMTP_HOST) {
      warnings.push('No email provider configured - emails will be logged to console');
    }
    if (!config.FRONTEND_URL) {
      warnings.push('FRONTEND_URL not set - email links may not work correctly');
    }
  }

  // Development warnings
  if (config.NODE_ENV === 'development') {
    if (!config.DATABASE_URL.includes('localhost') && !config.DATABASE_URL.includes('127.0.0.1')) {
      warnings.push('DATABASE_URL points to non-local database in development mode');
    }
  }

  return {
    valid: true,
    config,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate and log environment on startup
 */
export function initEnvironment(): Environment {
  logger.info('Validating environment configuration...');
  
  const result = validateEnvironment();

  if (!result.valid) {
    logger.error('Environment validation failed', {
      errors: result.errors,
      hint: 'Please check your .env file and ensure all required variables are set.',
    });
    process.exit(1);
  }

  // Log warnings
  if (result.warnings && result.warnings.length > 0) {
    logger.warn('Environment warnings detected', { warnings: result.warnings });
  }

  logger.info('Environment validation passed', {
    environment: result.config!.NODE_ENV,
    port: result.config!.PORT,
  });

  return result.config!;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a type-safe environment variable
 */
export function getEnv<K extends keyof Environment>(key: K): Environment[K] {
  const result = validateEnvironment();
  if (!result.valid || !result.config) {
    throw new Error(`Environment not valid: ${result.errors?.join(', ')}`);
  }
  return result.config[key];
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Get feature flags from environment
 */
export function getFeatureFlags(): {
  apiDocsEnabled: boolean;
  notionEnabled: boolean;
  storageEnabled: boolean;
  emailEnabled: boolean;
  stripeEnabled: boolean;
} {
  return {
    apiDocsEnabled: process.env.ENABLE_API_DOCS === 'true' || isDevelopment(),
    notionEnabled: !!process.env.NOTION_API_KEY,
    storageEnabled: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY,
    emailEnabled: !!process.env.RESEND_API_KEY || !!process.env.SMTP_HOST,
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
  };
}
