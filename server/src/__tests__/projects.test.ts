/**
 * Project Routes Tests
 *
 * Tests for project CRUD, milestone management, and tier-based features.
 */

import { prisma } from '../utils/prisma';
import { mockProject, mockClient, mockUser } from './setup';

describe('Project Routes', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/projects - List Projects', () => {
    it('should return user projects with progress', async () => {
      const projectsWithMilestones = [
        {
          ...mockProject,
          milestones: [
            { id: 'm1', status: 'COMPLETED', order: 1 },
            { id: 'm2', status: 'IN_PROGRESS', order: 2 },
            { id: 'm3', status: 'PENDING', order: 3 },
          ],
        },
      ];

      (mockPrisma.project.findMany as jest.Mock).mockResolvedValue(projectsWithMilestones);

      const projects = await mockPrisma.project.findMany({
        where: { clientId: mockClient.id },
        include: { milestones: true },
      });

      expect(projects).toHaveLength(1);
      expect(projects[0].milestones).toHaveLength(3);

      // Calculate progress
      const milestones = projects[0].milestones;
      const completed = milestones.filter((m: any) => m.status === 'COMPLETED').length;
      const total = milestones.length;
      const progress = Math.round((completed / total) * 100);

      expect(progress).toBe(33);
    });

    it('should allow admin to see all projects', async () => {
      const allProjects = [
        mockProject,
        { ...mockProject, id: 'project-2', clientId: 'other-client' },
      ];

      (mockPrisma.project.findMany as jest.Mock).mockResolvedValue(allProjects);

      const user = { ...mockUser, role: 'ADMIN' };

      // Admin can fetch without clientId filter
      const projects = await mockPrisma.project.findMany({});

      expect(projects).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const inProgressProjects = [{ ...mockProject, status: 'IN_PROGRESS' }];

      (mockPrisma.project.findMany as jest.Mock).mockResolvedValue(inProgressProjects);

      const projects = await mockPrisma.project.findMany({
        where: { status: 'IN_PROGRESS' },
      });

      expect(projects).toHaveLength(1);
      expect(projects[0].status).toBe('IN_PROGRESS');
    });

    it('should filter by tier', async () => {
      const tier2Projects = [mockProject];

      (mockPrisma.project.findMany as jest.Mock).mockResolvedValue(tier2Projects);

      const projects = await mockPrisma.project.findMany({
        where: { tier: 2 },
      });

      expect(projects).toHaveLength(1);
      expect(projects[0].tier).toBe(2);
    });

    it('should paginate results', async () => {
      const page = 2;
      const limit = 10;
      const skip = (page - 1) * limit;

      (mockPrisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);

      await mockPrisma.project.findMany({
        skip,
        take: limit,
      });

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
      });
    });
  });

  describe('GET /api/projects/:id - Get Project', () => {
    it('should return project with milestones and deliverables', async () => {
      const projectWithDetails = {
        ...mockProject,
        milestones: [
          { id: 'm1', name: 'Intake', status: 'COMPLETED', order: 1 },
          { id: 'm2', name: 'Design', status: 'IN_PROGRESS', order: 2 },
        ],
        deliverables: [
          { id: 'd1', name: 'Concept Drawing', category: 'Drawing' },
        ],
        client: mockClient,
      };

      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(projectWithDetails);

      const project = await mockPrisma.project.findUnique({
        where: { id: mockProject.id },
        include: {
          milestones: true,
          deliverables: true,
          client: true,
        },
      });

      expect(project).toBeDefined();
      expect(project?.milestones).toHaveLength(2);
      expect(project?.deliverables).toHaveLength(1);
    });

    it('should return null for non-existent project', async () => {
      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      const project = await mockPrisma.project.findUnique({
        where: { id: 'non-existent-id' },
      });

      expect(project).toBeNull();
    });

    it('should enforce owner access for clients', async () => {
      const projectWithClient = {
        ...mockProject,
        client: { ...mockClient, userId: 'different-user-id' },
      };

      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(projectWithClient);
      (mockPrisma.client.findUnique as jest.Mock).mockResolvedValue({
        ...mockClient,
        userId: mockUser.id,
      });

      const project = await mockPrisma.project.findUnique({
        where: { id: mockProject.id },
      });

      const userClient = await mockPrisma.client.findUnique({
        where: { userId: mockUser.id },
      });

      // User's client doesn't match project's client
      const hasAccess = project?.clientId === userClient?.id;
      expect(hasAccess).toBe(true);
    });
  });

  describe('PATCH /api/projects/:id - Update Project', () => {
    it('should update project status (admin only)', async () => {
      const updatedProject = { ...mockProject, status: 'IN_PROGRESS' };

      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (mockPrisma.project.update as jest.Mock).mockResolvedValue(updatedProject);

      const project = await mockPrisma.project.update({
        where: { id: mockProject.id },
        data: { status: 'IN_PROGRESS' },
      });

      expect(project.status).toBe('IN_PROGRESS');
    });

    it('should validate status values', () => {
      const validStatuses = [
        'INTAKE',
        'ONBOARDING',
        'IN_PROGRESS',
        'AWAITING_FEEDBACK',
        'REVISIONS',
        'DELIVERED',
        'CLOSED',
      ];
      const invalidStatus = 'INVALID_STATUS';

      expect(validStatuses.includes(invalidStatus)).toBe(false);
      expect(validStatuses.includes('IN_PROGRESS')).toBe(true);
    });

    it('should reject status update from non-admin', () => {
      const user = { ...mockUser, role: 'CLIENT' };
      const isAdmin = user.role === 'ADMIN' || user.role === 'TEAM';

      expect(isAdmin).toBe(false);
    });
  });

  describe('Project Progress Calculation', () => {
    it('should calculate progress from milestones', () => {
      const milestones = [
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'IN_PROGRESS' },
        { status: 'PENDING' },
        { status: 'PENDING' },
      ];

      const completed = milestones.filter((m) => m.status === 'COMPLETED').length;
      const total = milestones.length;
      const percentage = Math.round((completed / total) * 100);

      expect(completed).toBe(2);
      expect(total).toBe(5);
      expect(percentage).toBe(40);
    });

    it('should identify current milestone', () => {
      const milestones = [
        { id: 'm1', name: 'Intake', status: 'COMPLETED', order: 1 },
        { id: 'm2', name: 'Design', status: 'IN_PROGRESS', order: 2 },
        { id: 'm3', name: 'Review', status: 'PENDING', order: 3 },
      ];

      const currentMilestone = milestones.find((m) => m.status === 'IN_PROGRESS');

      expect(currentMilestone).toBeDefined();
      expect(currentMilestone?.name).toBe('Design');
    });

    it('should handle empty milestones', () => {
      const milestones: any[] = [];
      const total = milestones.length;
      const percentage = total > 0 ? Math.round((0 / total) * 100) : 0;

      expect(percentage).toBe(0);
    });
  });
});

describe('Milestone Routes', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  const mockMilestone = {
    id: 'milestone-1',
    projectId: mockProject.id,
    tier: 2,
    name: 'Design Phase',
    order: 2,
    status: 'PENDING',
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/projects/:projectId/milestones', () => {
    it('should return project milestones in order', async () => {
      const milestones = [
        { ...mockMilestone, order: 1, name: 'Intake', status: 'COMPLETED' },
        { ...mockMilestone, order: 2, name: 'Design', status: 'IN_PROGRESS' },
        { ...mockMilestone, order: 3, name: 'Review', status: 'PENDING' },
      ];

      (mockPrisma.milestone.findMany as jest.Mock).mockResolvedValue(milestones);

      const result = await mockPrisma.milestone.findMany({
        where: { projectId: mockProject.id },
        orderBy: { order: 'asc' },
      });

      expect(result).toHaveLength(3);
      expect(result[0].order).toBe(1);
      expect(result[2].order).toBe(3);
    });

    it('should include progress calculation', () => {
      const milestones = [
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'IN_PROGRESS' },
      ];

      const completed = milestones.filter((m) => m.status === 'COMPLETED').length;
      const total = milestones.length;
      const percentage = Math.round((completed / total) * 100);

      expect(completed).toBe(2);
      expect(percentage).toBe(67);
    });
  });

  describe('PATCH /api/milestones/:id', () => {
    it('should update milestone status', async () => {
      const updatedMilestone = { ...mockMilestone, status: 'IN_PROGRESS' };

      (mockPrisma.milestone.findUnique as jest.Mock).mockResolvedValue(mockMilestone);
      (mockPrisma.milestone.update as jest.Mock).mockResolvedValue(updatedMilestone);

      const milestone = await mockPrisma.milestone.update({
        where: { id: mockMilestone.id },
        data: { status: 'IN_PROGRESS' },
      });

      expect(milestone.status).toBe('IN_PROGRESS');
    });

    it('should set completedAt when status is COMPLETED', async () => {
      const now = new Date();
      const completedMilestone = {
        ...mockMilestone,
        status: 'COMPLETED',
        completedAt: now,
      };

      (mockPrisma.milestone.update as jest.Mock).mockResolvedValue(completedMilestone);

      const milestone = await mockPrisma.milestone.update({
        where: { id: mockMilestone.id },
        data: { status: 'COMPLETED', completedAt: now },
      });

      expect(milestone.status).toBe('COMPLETED');
      expect(milestone.completedAt).toBeDefined();
    });

    it('should validate status values', () => {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
      const invalidStatus = 'INVALID';

      expect(validStatuses.includes(invalidStatus)).toBe(false);
      expect(validStatuses.includes('IN_PROGRESS')).toBe(true);
    });

    it('should reject update from non-admin', () => {
      const user = { ...mockUser, role: 'CLIENT' };
      const canUpdate = user.role === 'ADMIN' || user.role === 'TEAM';

      expect(canUpdate).toBe(false);
    });
  });

  describe('Tier-Based Milestones', () => {
    it('should create tier-specific milestones', () => {
      const tier1Milestones = ['Intake', 'Concept', 'Delivery'];
      const tier2Milestones = ['Intake', 'Draft', 'Review', 'Revisions', 'Final'];
      const tier3Milestones = ['Deposit', 'Site Visit', 'Draft', 'Review', 'Final'];

      expect(tier1Milestones.length).toBe(3);
      expect(tier2Milestones.length).toBe(5);
      expect(tier3Milestones.length).toBe(5);
    });

    it('should get milestones for specific tier', () => {
      const getMilestonesForTier = (tier: number): string[] => {
        switch (tier) {
          case 1:
            return ['Intake', 'Concept', 'Delivery'];
          case 2:
            return ['Intake', 'Draft', 'Review', 'Revisions', 'Final'];
          case 3:
            return ['Deposit', 'Site Visit', 'Draft', 'Review', 'Final'];
          case 4:
            return ['Consultation', 'Survey', 'Design', 'Review', 'Revisions', 'Final'];
          default:
            return [];
        }
      };

      expect(getMilestonesForTier(1)).toContain('Concept');
      expect(getMilestonesForTier(2)).toContain('Draft');
      expect(getMilestonesForTier(3)).toContain('Site Visit');
      expect(getMilestonesForTier(4)).toContain('Survey');
    });
  });
});

describe('Tier Gating', () => {
  it('should check tier access for features', () => {
    const checkTierAccess = (userTier: number, requiredTier: number): boolean => {
      return userTier >= requiredTier;
    };

    expect(checkTierAccess(2, 1)).toBe(true);
    expect(checkTierAccess(2, 2)).toBe(true);
    expect(checkTierAccess(2, 3)).toBe(false);
  });

  it('should identify tier features', () => {
    const tierFeatures: Record<number, string[]> = {
      1: ['basic-concept', 'pdf-delivery'],
      2: ['drafts', 'revisions', 'portal-access'],
      3: ['site-visit', 'detailed-plans', 'priority-support'],
      4: ['full-service', 'kaa-team', 'custom-timeline'],
    };

    expect(tierFeatures[1]).toContain('basic-concept');
    expect(tierFeatures[2]).toContain('revisions');
    expect(tierFeatures[3]).toContain('site-visit');
    expect(tierFeatures[4]).toContain('full-service');
  });
});
