/**
 * Prisma Client Singleton
 * Ensures only one instance of PrismaClient is used across the application.
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // Allow global `prisma` in development to avoid multiple instances
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientOptions = {
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn'] as const
    : ['error'] as const,
};

export const prisma = global.prisma ?? new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
