/**
 * Health Check Service
 * Comprehensive health monitoring for the SAGE API.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  status: HealthStatus;
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  components: {
    database: ComponentHealth;
    memory: ComponentHealth;
    stripe?: ComponentHealth;
    notion?: ComponentHealth;
    storage?: ComponentHealth;
    email?: ComponentHealth;
  };
  meta?: {
    requestsPerMinute?: number;
    averageResponseTime?: number;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const VERSION = process.env.npm_package_version || '1.0.0';
const START_TIME = Date.now();

// Thresholds for health determination
const THRESHOLDS = {
  database: {
    latencyWarning: 100,  // ms
    latencyError: 500,    // ms
  },
  memory: {
    usageWarning: 0.8,    // 80%
    usageError: 0.95,     // 95%
  },
};

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

/**
 * Check database connectivity and latency
 */
async function checkDatabase(prisma: PrismaClient): Promise<ComponentHealth> {
  const start = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    if (latency > THRESHOLDS.database.latencyError) {
      return {
        status: 'degraded',
        latency,
        message: 'High database latency',
      };
    }

    if (latency > THRESHOLDS.database.latencyWarning) {
      return {
        status: 'degraded',
        latency,
        message: 'Elevated database latency',
      };
    }

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    logger.error('Database health check failed', { error });
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): ComponentHealth {
  const memUsage = process.memoryUsage();
  const heapUsed = memUsage.heapUsed;
  const heapTotal = memUsage.heapTotal;
  const usageRatio = heapUsed / heapTotal;

  const details = {
    heapUsed: `${Math.round(heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    usagePercent: `${Math.round(usageRatio * 100)}%`,
  };

  if (usageRatio > THRESHOLDS.memory.usageError) {
    return {
      status: 'unhealthy',
      message: 'Critical memory usage',
      details,
    };
  }

  if (usageRatio > THRESHOLDS.memory.usageWarning) {
    return {
      status: 'degraded',
      message: 'High memory usage',
      details,
    };
  }

  return {
    status: 'healthy',
    details,
  };
}

/**
 * Check Stripe configuration
 */
function checkStripe(): ComponentHealth {
  const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;

  if (!hasSecretKey) {
    return {
      status: 'unhealthy',
      message: 'Stripe not configured',
    };
  }

  if (!hasWebhookSecret) {
    return {
      status: 'degraded',
      message: 'Stripe webhook secret not configured',
    };
  }

  return {
    status: 'healthy',
    details: {
      secretKey: 'configured',
      webhookSecret: 'configured',
    },
  };
}

/**
 * Check Notion configuration
 */
function checkNotion(): ComponentHealth {
  const hasApiKey = !!process.env.NOTION_API_KEY;
  const hasDatabaseId = !!process.env.NOTION_PROJECTS_DATABASE_ID;

  if (!hasApiKey) {
    return {
      status: 'degraded',
      message: 'Notion not configured (optional)',
    };
  }

  if (!hasDatabaseId) {
    return {
      status: 'degraded',
      message: 'Notion database ID not configured',
    };
  }

  return {
    status: 'healthy',
    details: {
      apiKey: 'configured',
      databaseId: 'configured',
    },
  };
}

/**
 * Check Storage configuration
 */
function checkStorage(): ComponentHealth {
  const hasUrl = !!process.env.SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_KEY;

  if (!hasUrl || !hasKey) {
    return {
      status: 'degraded',
      message: 'Storage not configured (optional)',
    };
  }

  return {
    status: 'healthy',
    details: {
      supabaseUrl: 'configured',
      bucket: process.env.STORAGE_BUCKET || 'deliverables',
    },
  };
}

/**
 * Check Email configuration
 */
function checkEmail(): ComponentHealth {
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSmtp = !!process.env.SMTP_HOST;

  if (hasResend) {
    return {
      status: 'healthy',
      details: {
        provider: 'resend',
      },
    };
  }

  if (hasSmtp) {
    return {
      status: 'healthy',
      details: {
        provider: 'smtp',
        host: process.env.SMTP_HOST,
      },
    };
  }

  return {
    status: 'degraded',
    message: 'Email using console provider (development mode)',
    details: {
      provider: 'console',
    },
  };
}

// ============================================================================
// MAIN HEALTH CHECK
// ============================================================================

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(
  prisma: PrismaClient,
  options?: { detailed?: boolean }
): Promise<HealthCheckResult> {
  const detailed = options?.detailed ?? false;

  // Run checks in parallel
  const [database, memory] = await Promise.all([
    checkDatabase(prisma),
    Promise.resolve(checkMemory()),
  ]);

  // Configuration checks (fast, don't need parallel)
  const stripe = checkStripe();
  const notion = checkNotion();
  const storage = checkStorage();
  const email = checkEmail();

  // Determine overall status
  const componentStatuses = [database, memory, stripe];
  let overallStatus: HealthStatus = 'healthy';

  if (componentStatuses.some(c => c.status === 'unhealthy')) {
    overallStatus = 'unhealthy';
  } else if (componentStatuses.some(c => c.status === 'degraded')) {
    overallStatus = 'degraded';
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: VERSION,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    environment: process.env.NODE_ENV || 'development',
    components: {
      database,
      memory,
      ...(detailed && {
        stripe,
        notion,
        storage,
        email,
      }),
    },
  };

  // Log if unhealthy
  if (overallStatus === 'unhealthy') {
    logger.error('Health check failed', { result });
  } else if (overallStatus === 'degraded') {
    logger.warn('Health check degraded', { result });
  }

  return result;
}

/**
 * Simple liveness check (for Kubernetes probes)
 */
export function livenessCheck(): { alive: boolean; uptime: number } {
  return {
    alive: true,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  };
}

/**
 * Readiness check (for Kubernetes probes)
 */
export async function readinessCheck(prisma: PrismaClient): Promise<{ ready: boolean; reason?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ready: true };
  } catch {
    return { ready: false, reason: 'Database not available' };
  }
}
