/**
 * Prisma Client Wrapper for SAGE/KAA Backend
 *
 * Safe initialization and reuse in serverless context.
 * Prevents multiple Prisma Client instances during hot-reloads/serverless cold starts.
 */

const { PrismaClient } = require('@prisma/client');

// Global reference to prevent multiple instances in serverless/hot-reload scenarios
const globalForPrisma = globalThis;

/**
 * Singleton Prisma Client instance
 * @type {PrismaClient}
 */
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
  errorFormat: 'pretty',
});

// Store reference globally in non-production environments to prevent hot-reload issues
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Check database connectivity
 * @returns {Promise<{connected: boolean, latencyMs?: number, error?: string}>}
 */
async function checkDbConnection() {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      connected: true,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      latencyMs: Date.now() - startTime
    };
  }
}

/**
 * Gracefully disconnect Prisma client
 * Call this on server shutdown
 */
async function disconnect() {
  await prisma.$disconnect();
}

/**
 * Execute a transaction
 * @template T
 * @param {(tx: PrismaClient) => Promise<T>} fn - Transaction function
 * @returns {Promise<T>}
 */
async function transaction(fn) {
  return prisma.$transaction(fn);
}

module.exports = {
  prisma,
  checkDbConnection,
  disconnect,
  transaction
};
