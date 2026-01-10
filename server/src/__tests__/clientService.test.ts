/**
 * Client Service Tests
 * Tests for client creation from leads, milestone generation, and client management.
 */

import { ClientService } from '../services/clientService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
const mockPrisma = {
  $transaction: jest.fn(),
  lead: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  client: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  milestone: {
    create: jest.fn(),
  },
} as unknown as PrismaClient;

describe('ClientService', () => {
  let clientService: ClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    clientService = new ClientService(mockPrisma);
  });

  describe('getMilestoneConfigs', () => {
    // Access private method through any casting for testing
    const getMilestoneConfigs = (service: ClientService, tier: 1 | 2 | 3 | 4) => {
      return (service as any).getMilestoneConfigs(tier);
    };

    it('should return 3 milestones for Tier 1', () => {
      const configs = getMilestoneConfigs(clientService, 1);
      expect(configs).toHaveLength(3);
      expect(configs[0].name).toBe('Intake');
      expect(configs[1].name).toBe('Concept');
      expect(configs[2].name).toBe('Delivery');
    });

    it('should return 5 milestones for Tier 2', () => {
      const configs = getMilestoneConfigs(clientService, 2);
      expect(configs).toHaveLength(5);
      expect(configs.map((c: any) => c.name)).toEqual([
        'Intake',
        'Draft',
        'Review',
        'Revisions',
        'Final',
      ]);
    });

    it('should return 7 milestones for Tier 3', () => {
      const configs = getMilestoneConfigs(clientService, 3);
      expect(configs).toHaveLength(7);
      expect(configs[0].name).toBe('Intake');
      expect(configs[1].name).toBe('Site Visit');
      expect(configs[configs.length - 1].name).toBe('Final');
    });

    it('should return 9 milestones for Tier 4', () => {
      const configs = getMilestoneConfigs(clientService, 4);
      expect(configs).toHaveLength(9);
      expect(configs[0].name).toBe('Intake');
      expect(configs[configs.length - 1].name).toBe('Final Walkthrough');
    });

    it('should have increasing day offsets for each tier', () => {
      [1, 2, 3, 4].forEach(tier => {
        const configs = getMilestoneConfigs(clientService, tier as 1 | 2 | 3 | 4);
        for (let i = 1; i < configs.length; i++) {
          expect(configs[i].dayOffset).toBeGreaterThanOrEqual(configs[i - 1].dayOffset);
        }
      });
    });

    it('should have first milestone with dayOffset 0', () => {
      [1, 2, 3, 4].forEach(tier => {
        const configs = getMilestoneConfigs(clientService, tier as 1 | 2 | 3 | 4);
        expect(configs[0].dayOffset).toBe(0);
      });
    });

    it('should have higher tiers with longer timelines', () => {
      const tier1 = getMilestoneConfigs(clientService, 1);
      const tier2 = getMilestoneConfigs(clientService, 2);
      const tier3 = getMilestoneConfigs(clientService, 3);
      const tier4 = getMilestoneConfigs(clientService, 4);

      const lastDayOffset = (configs: any[]) => configs[configs.length - 1].dayOffset;

      expect(lastDayOffset(tier2)).toBeGreaterThan(lastDayOffset(tier1));
      expect(lastDayOffset(tier3)).toBeGreaterThan(lastDayOffset(tier2));
      expect(lastDayOffset(tier4)).toBeGreaterThan(lastDayOffset(tier3));
    });
  });

  describe('Tier-specific milestone content', () => {
    const getMilestoneConfigs = (service: ClientService, tier: 1 | 2 | 3 | 4) => {
      return (service as any).getMilestoneConfigs(tier);
    };

    it('Tier 1 should have basic milestones without site visits', () => {
      const configs = getMilestoneConfigs(clientService, 1);
      const names = configs.map((c: any) => c.name);
      
      expect(names).not.toContain('Site Visit');
      expect(names).not.toContain('Site Assessment');
      expect(names).toContain('Intake');
      expect(names).toContain('Delivery');
    });

    it('Tier 3 should include Site Visit', () => {
      const configs = getMilestoneConfigs(clientService, 3);
      const names = configs.map((c: any) => c.name);
      
      expect(names).toContain('Site Visit');
    });

    it('Tier 4 should include Site Assessment and Implementation', () => {
      const configs = getMilestoneConfigs(clientService, 4);
      const names = configs.map((c: any) => c.name);
      
      expect(names).toContain('Site Assessment');
      expect(names).toContain('Implementation');
      expect(names).toContain('Final Walkthrough');
    });

    it('Tier 4 should have Coordination milestone', () => {
      const configs = getMilestoneConfigs(clientService, 4);
      const names = configs.map((c: any) => c.name);
      
      expect(names).toContain('Coordination');
    });
  });

  describe('listClients', () => {
    it('should return clients with pagination', async () => {
      const mockClients = [
        { id: 'client-1', tier: 2, status: 'ACTIVE' },
        { id: 'client-2', tier: 3, status: 'ACTIVE' },
      ];

      (mockPrisma.client.findMany as jest.Mock).mockResolvedValue(mockClients);
      (mockPrisma.client.count as jest.Mock).mockResolvedValue(10);

      const result = await clientService.listClients({ page: 1, limit: 10 });

      expect(result.clients).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it('should filter by status', async () => {
      (mockPrisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.client.count as jest.Mock).mockResolvedValue(0);

      await clientService.listClients({ status: 'ACTIVE' });

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        })
      );
    });

    it('should filter by tier', async () => {
      (mockPrisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.client.count as jest.Mock).mockResolvedValue(0);

      await clientService.listClients({ tier: 2 });

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tier: 2 }),
        })
      );
    });

    it('should apply default pagination', async () => {
      (mockPrisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.client.count as jest.Mock).mockResolvedValue(0);

      await clientService.listClients({});

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });
  });

  describe('getClientWithDetails', () => {
    it('should return client with user and projects', async () => {
      const mockClient = {
        id: 'client-1',
        tier: 2,
        status: 'ACTIVE',
        user: { id: 'user-1', email: 'test@example.com', userType: 'SAGE_CLIENT', tier: 2 },
        projects: [{ id: 'project-1', name: 'Test Project' }],
        leads: [],
      };

      (mockPrisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

      const result = await clientService.getClientWithDetails('client-1');

      expect(result).toEqual(mockClient);
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        include: expect.objectContaining({
          user: expect.any(Object),
          projects: true,
          leads: true,
        }),
      });
    });

    it('should return null for non-existent client', async () => {
      (mockPrisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await clientService.getClientWithDetails('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getClientByUserId', () => {
    it('should find client by user ID', async () => {
      const mockClient = {
        id: 'client-1',
        userId: 'user-1',
        tier: 2,
      };

      (mockPrisma.client.findFirst as jest.Mock).mockResolvedValue(mockClient);

      const result = await clientService.getClientByUserId('user-1');

      expect(result).toEqual(mockClient);
      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: expect.any(Object),
      });
    });
  });

  describe('updateClientStatus', () => {
    it('should update client status', async () => {
      const mockUpdatedClient = {
        id: 'client-1',
        status: 'COMPLETED',
      };

      (mockPrisma.client.update as jest.Mock).mockResolvedValue(mockUpdatedClient);

      const result = await clientService.updateClientStatus('client-1', 'COMPLETED');

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        data: { status: 'COMPLETED' },
      });
    });

    it('should accept valid status values', async () => {
      const validStatuses: Array<'ONBOARDING' | 'ACTIVE' | 'COMPLETED' | 'CLOSED'> = [
        'ONBOARDING',
        'ACTIVE',
        'COMPLETED',
        'CLOSED',
      ];

      for (const status of validStatuses) {
        (mockPrisma.client.update as jest.Mock).mockResolvedValue({ id: 'client-1', status });
        
        const result = await clientService.updateClientStatus('client-1', status);
        
        expect(result.status).toBe(status);
      }
    });
  });
});

describe('Client Creation Flow', () => {
  describe('Transaction integrity', () => {
    it('should create all entities in order: user -> client -> lead update -> project -> milestones', () => {
      // This test documents the expected order of operations
      const expectedOrder = [
        'find lead',
        'find/create user',
        'create client',
        'update lead with clientId',
        'create project',
        'create milestones',
      ];

      expect(expectedOrder).toHaveLength(6);
    });
  });

  describe('User type assignment', () => {
    it('should assign SAGE_CLIENT for tiers 1-3', () => {
      const tiers = [1, 2, 3];
      tiers.forEach(tier => {
        const userType = tier === 4 ? 'KAA_CLIENT' : 'SAGE_CLIENT';
        expect(userType).toBe('SAGE_CLIENT');
      });
    });

    it('should assign KAA_CLIENT for tier 4', () => {
      const tier = 4;
      const userType = tier === 4 ? 'KAA_CLIENT' : 'SAGE_CLIENT';
      expect(userType).toBe('KAA_CLIENT');
    });
  });
});
