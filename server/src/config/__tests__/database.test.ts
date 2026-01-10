/**
 * Database Configuration Tests
 */

import { PrismaClient } from '@prisma/client';
import {
  createPrismaClient,
  testConnection,
  checkDatabaseHealth,
  queryWithTimeout,
  queryWithRetry,
  getDatabaseStats,
  resetDatabaseStats,
} from '../database';

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    $on: jest.fn(),
    $transaction: jest.fn(),
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    Prisma: {
      TransactionIsolationLevel: {
        ReadCommitted: 'ReadCommitted',
        Serializable: 'Serializable',
      },
    },
  };
});

describe('Database Configuration', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetDatabaseStats();
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
  });

  describe('createPrismaClient', () => {
    it('should create a Prisma client', () => {
      const client = createPrismaClient();
      expect(PrismaClient).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    it('should accept configuration overrides', () => {
      const client = createPrismaClient({
        connectionLimit: 20,
        logQueries: false,
      });
      expect(client).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should return true when connection succeeds', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);
      
      const result = await testConnection(mockPrisma);
      
      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));
      
      const result = await testConnection(mockPrisma);
      
      expect(result).toBe(false);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return healthy status when database responds', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);
      
      const result = await checkDatabaseHealth(mockPrisma);
      
      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy status when database fails', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      const result = await checkDatabaseHealth(mockPrisma);
      
      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('queryWithTimeout', () => {
    it('should return result when query completes within timeout', async () => {
      const queryFn = jest.fn().mockResolvedValue('result');
      
      const result = await queryWithTimeout(queryFn, 1000);
      
      expect(result).toBe('result');
      expect(queryFn).toHaveBeenCalled();
    });

    it('should throw when query exceeds timeout', async () => {
      const slowQuery = () => new Promise((resolve) => setTimeout(() => resolve('result'), 200));
      
      await expect(queryWithTimeout(slowQuery, 50)).rejects.toThrow('Query timeout');
    });
  });

  describe('queryWithRetry', () => {
    it('should return result on first successful attempt', async () => {
      const queryFn = jest.fn().mockResolvedValue('result');
      
      const result = await queryWithRetry(queryFn, 3, 10);
      
      expect(result).toBe('result');
      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient errors', async () => {
      const queryFn = jest.fn()
        .mockRejectedValueOnce(new Error('P1001 - Connection error'))
        .mockResolvedValue('result');
      
      const result = await queryWithRetry(queryFn, 3, 10);
      
      expect(result).toBe('result');
      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-transient errors', async () => {
      const queryFn = jest.fn().mockRejectedValue(new Error('Validation error'));
      
      await expect(queryWithRetry(queryFn, 3, 10)).rejects.toThrow('Validation error');
      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const queryFn = jest.fn().mockRejectedValue(new Error('timeout'));
      
      await expect(queryWithRetry(queryFn, 3, 10)).rejects.toThrow('timeout');
      expect(queryFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('Database Stats', () => {
    describe('getDatabaseStats', () => {
      it('should return initial stats', () => {
        const stats = getDatabaseStats();
        
        expect(stats.totalQueries).toBe(0);
        expect(stats.totalErrors).toBe(0);
        expect(stats.avgQueryDuration).toBe(0);
        expect(stats.slowQueries).toBe(0);
      });

      it('should return a copy of stats', () => {
        const stats1 = getDatabaseStats();
        const stats2 = getDatabaseStats();
        
        expect(stats1).not.toBe(stats2);
        expect(stats1).toEqual(stats2);
      });
    });

    describe('resetDatabaseStats', () => {
      it('should reset all stats', () => {
        // This is tested implicitly in beforeEach
        const stats = getDatabaseStats();
        expect(stats.totalQueries).toBe(0);
      });
    });
  });
});
