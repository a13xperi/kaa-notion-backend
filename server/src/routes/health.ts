/**
 * Health Check Routes
 *
 * Provides health check endpoints for monitoring and load balancers.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { isRedisConnected, getRedisClient } from '../config/redis';
import { sanitizeInput } from '../middleware';

const router = Router();
const prisma = new PrismaClient();
router.use(sanitizeInput);

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
}

const startTime = Date.now();

/**
 * GET /api/health
 *
 * Basic health check - returns 200 if server is running
 * Used by load balancers for simple health checks
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/health/ready
 *
 * Readiness check - verifies all dependencies are ready
 * Returns 503 if any critical dependency is down
 */
router.get('/ready', async (req: Request, res: Response) => {
  const health = await getFullHealth();

  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(health);
});

/**
 * GET /api/health/live
 *
 * Liveness check - verifies server is alive and responsive
 * Used by Kubernetes for liveness probes
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

/**
 * GET /api/health/detailed
 *
 * Detailed health check with all component statuses
 * Includes latency measurements for each dependency
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const health = await getFullHealth();
  res.status(health.status === 'unhealthy' ? 503 : 200).json(health);
});

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return {
      status: 'up',
      latency,
      message: 'Connected to PostgreSQL',
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now();

  if (!isRedisConnected()) {
    return {
      status: 'down',
      message: 'Redis not configured or disconnected',
    };
  }

  try {
    const client = getRedisClient();
    if (!client) {
      return {
        status: 'down',
        message: 'Redis client not available',
      };
    }

    await client.ping();
    const latency = Date.now() - start;

    return {
      status: 'up',
      latency,
      message: 'Connected to Redis',
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Redis ping failed',
    };
  }
}

/**
 * Get full health status
 */
async function getFullHealth(): Promise<HealthStatus> {
  const [database, redis] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (database.status === 'down') {
    // Database is critical
    overallStatus = 'unhealthy';
  } else if (redis.status === 'down') {
    // Redis is optional but preferred
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database,
      redis,
    },
  };
}

export default router;
