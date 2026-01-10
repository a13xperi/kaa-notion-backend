/**
 * Health Service Tests
 */

import { livenessCheck } from '../healthService';

// Mock Prisma
const mockPrisma = {
  $queryRaw: jest.fn(),
};

// Mock logger
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Health Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('livenessCheck', () => {
    it('should return alive status', () => {
      const result = livenessCheck();
      
      expect(result.alive).toBe(true);
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when database is connected', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      
      // Import after mocking
      const { performHealthCheck } = await import('../healthService');
      const result = await performHealthCheck(mockPrisma as any);

      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.environment).toBeDefined();
      expect(result.components.database).toBeDefined();
      expect(result.components.memory).toBeDefined();
    });

    it('should return unhealthy status when database fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
      
      const { performHealthCheck } = await import('../healthService');
      const result = await performHealthCheck(mockPrisma as any);

      expect(result.components.database.status).toBe('unhealthy');
      expect(result.components.database.message).toContain('failed');
    });

    it('should include detailed component info when requested', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      
      const { performHealthCheck } = await import('../healthService');
      const result = await performHealthCheck(mockPrisma as any, { detailed: true });

      expect(result.components.stripe).toBeDefined();
      expect(result.components.notion).toBeDefined();
      expect(result.components.storage).toBeDefined();
      expect(result.components.email).toBeDefined();
    });
  });

  describe('readinessCheck', () => {
    it('should return ready when database is available', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      
      const { readinessCheck } = await import('../healthService');
      const result = await readinessCheck(mockPrisma as any);

      expect(result.ready).toBe(true);
    });

    it('should return not ready when database is unavailable', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
      
      const { readinessCheck } = await import('../healthService');
      const result = await readinessCheck(mockPrisma as any);

      expect(result.ready).toBe(false);
      expect(result.reason).toContain('Database');
    });
  });

  describe('memory check', () => {
    it('should include memory usage details', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      
      const { performHealthCheck } = await import('../healthService');
      const result = await performHealthCheck(mockPrisma as any);

      expect(result.components.memory.status).toBeDefined();
      expect(result.components.memory.details).toBeDefined();
      expect(result.components.memory.details?.heapUsed).toBeDefined();
    });
  });
});
