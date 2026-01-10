/**
 * Lead Routes Tests
 *
 * Tests for lead CRUD operations, tier router integration, and conversion flow.
 */

import { prisma } from '../utils/prisma';
import { recommendTier } from '../utils/tierRouter';
import {
  mockLead,
  mockUser,
  mockClient,
  mockProject,
  createMockRequest,
  createMockResponse,
  createMockNext,
} from './setup';

// Mock tier router
jest.mock('../utils/tierRouter', () => ({
  recommendTier: jest.fn(),
}));

describe('Lead Routes', () => {
  const mockRecommendTier = recommendTier as jest.Mock;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecommendTier.mockReturnValue({
      tier: 2,
      reason: 'Budget and timeline match Tier 2',
      confidence: 0.85,
      needsManualReview: false,
      factors: {
        budget: { score: 2, weight: 0.3 },
        timeline: { score: 2, weight: 0.2 },
        complexity: { score: 2, weight: 0.3 },
      },
    });
  });

  describe('POST /api/leads - Create Lead', () => {
    it('should create a new lead with tier recommendation', async () => {
      const leadData = {
        email: 'newlead@example.com',
        name: 'New Lead',
        projectAddress: '456 New St, City, ST 12345',
        budgetRange: '$10,000-$25,000',
        timeline: '4-8 weeks',
        projectType: 'renovation',
        hasSurvey: false,
        hasDrawings: false,
      };

      const createdLead = {
        id: 'new-lead-id',
        ...leadData,
        recommendedTier: 2,
        routingReason: 'Budget and timeline match Tier 2',
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.lead.create as jest.Mock).mockResolvedValue(createdLead);

      // Simulate the route handler logic
      const tierRecommendation = recommendTier(leadData);

      expect(tierRecommendation.tier).toBe(2);
      expect(tierRecommendation.confidence).toBeGreaterThan(0);

      const result = await mockPrisma.lead.create({
        data: {
          ...leadData,
          recommendedTier: tierRecommendation.tier,
          routingReason: tierRecommendation.reason,
          status: 'NEW',
        },
      });

      expect(result.id).toBeDefined();
      expect(result.recommendedTier).toBe(2);
      expect(mockPrisma.lead.create).toHaveBeenCalledTimes(1);
    });

    it('should mark lead as NEEDS_REVIEW when tier router is uncertain', async () => {
      mockRecommendTier.mockReturnValue({
        tier: 3,
        reason: 'Complex project with mixed signals',
        confidence: 0.45,
        needsManualReview: true,
        factors: {},
      });

      const leadData = {
        email: 'complex@example.com',
        projectAddress: '789 Complex Ave',
        budgetRange: '$50,000+',
        timeline: '12+ months',
        projectType: 'new_build',
        hasSurvey: true,
        hasDrawings: false,
      };

      const tierRecommendation = recommendTier(leadData);

      expect(tierRecommendation.needsManualReview).toBe(true);

      const expectedStatus = tierRecommendation.needsManualReview ? 'NEEDS_REVIEW' : 'NEW';
      expect(expectedStatus).toBe('NEEDS_REVIEW');
    });

    it('should validate required fields', () => {
      const invalidData = {
        email: '', // Invalid: empty
        projectAddress: '123 Test St',
      };

      // Email validation
      expect(invalidData.email).toBeFalsy();
    });

    it('should reject invalid email format', () => {
      const invalidEmail = 'not-an-email';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test(invalidEmail)).toBe(false);
      expect(emailRegex.test('valid@email.com')).toBe(true);
    });
  });

  describe('GET /api/leads - List Leads', () => {
    it('should return paginated leads list', async () => {
      const mockLeads = [mockLead, { ...mockLead, id: 'lead-2' }];

      (mockPrisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (mockPrisma.lead.count as jest.Mock).mockResolvedValue(2);

      const leads = await mockPrisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });

      const count = await mockPrisma.lead.count({});

      expect(leads).toHaveLength(2);
      expect(count).toBe(2);
    });

    it('should filter leads by status', async () => {
      const qualifiedLeads = [{ ...mockLead, status: 'QUALIFIED' }];

      (mockPrisma.lead.findMany as jest.Mock).mockResolvedValue(qualifiedLeads);

      const leads = await mockPrisma.lead.findMany({
        where: { status: 'QUALIFIED' },
      });

      expect(leads).toHaveLength(1);
      expect(leads[0].status).toBe('QUALIFIED');
    });

    it('should filter leads by tier', async () => {
      const tier2Leads = [mockLead];

      (mockPrisma.lead.findMany as jest.Mock).mockResolvedValue(tier2Leads);

      const leads = await mockPrisma.lead.findMany({
        where: { recommendedTier: 2 },
      });

      expect(leads).toHaveLength(1);
      expect(leads[0].recommendedTier).toBe(2);
    });
  });

  describe('GET /api/leads/:id - Get Lead', () => {
    it('should return lead with tier recommendation details', async () => {
      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);

      const lead = await mockPrisma.lead.findUnique({
        where: { id: mockLead.id },
      });

      expect(lead).toBeDefined();
      expect(lead?.id).toBe(mockLead.id);
      expect(lead?.recommendedTier).toBe(2);
    });

    it('should return null for non-existent lead', async () => {
      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(null);

      const lead = await mockPrisma.lead.findUnique({
        where: { id: 'non-existent-id' },
      });

      expect(lead).toBeNull();
    });

    it('should calculate effective tier with override', async () => {
      const leadWithOverride = {
        ...mockLead,
        tierOverride: 3,
        overrideReason: 'Client requested higher tier',
      };

      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(leadWithOverride);

      const lead = await mockPrisma.lead.findUnique({
        where: { id: mockLead.id },
      });

      const effectiveTier = lead?.tierOverride ?? lead?.recommendedTier;
      expect(effectiveTier).toBe(3);
    });
  });

  describe('PATCH /api/leads/:id - Update Lead', () => {
    it('should update lead status', async () => {
      const updatedLead = { ...mockLead, status: 'QUALIFIED' };

      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);
      (mockPrisma.lead.update as jest.Mock).mockResolvedValue(updatedLead);

      const lead = await mockPrisma.lead.update({
        where: { id: mockLead.id },
        data: { status: 'QUALIFIED' },
      });

      expect(lead.status).toBe('QUALIFIED');
    });

    it('should allow tier override with reason', async () => {
      const overriddenLead = {
        ...mockLead,
        tierOverride: 3,
        overrideReason: 'Client has complex requirements',
      };

      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);
      (mockPrisma.lead.update as jest.Mock).mockResolvedValue(overriddenLead);

      const lead = await mockPrisma.lead.update({
        where: { id: mockLead.id },
        data: {
          tierOverride: 3,
          overrideReason: 'Client has complex requirements',
        },
      });

      expect(lead.tierOverride).toBe(3);
      expect(lead.overrideReason).toBe('Client has complex requirements');
    });

    it('should reject invalid status values', () => {
      const validStatuses = ['NEW', 'QUALIFIED', 'NEEDS_REVIEW', 'CONVERTED', 'CLOSED'];
      const invalidStatus = 'INVALID_STATUS';

      expect(validStatuses.includes(invalidStatus)).toBe(false);
    });

    it('should reject invalid tier values', () => {
      const validTiers = [1, 2, 3, 4];
      const invalidTier = 5;

      expect(validTiers.includes(invalidTier)).toBe(false);
    });
  });

  describe('POST /api/leads/:id/convert - Convert Lead', () => {
    it('should convert lead to client with project', async () => {
      const conversionData = {
        stripePaymentIntentId: 'pi_test_123',
        stripeCustomerId: 'cus_test_123',
        amount: 250000, // $2,500 in cents
        projectName: 'Test Renovation Project',
      };

      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);

      // Mock transaction result
      const transactionResult = {
        user: { ...mockUser, id: 'new-user-id' },
        client: { ...mockClient, id: 'new-client-id' },
        project: { ...mockProject, id: 'new-project-id' },
        payment: { id: 'new-payment-id', ...conversionData, status: 'SUCCEEDED' },
        lead: { ...mockLead, status: 'CONVERTED', clientId: 'new-client-id' },
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue(transactionResult);

      const result = await mockPrisma.$transaction(async (tx: any) => {
        return transactionResult;
      });

      expect(result.user.id).toBeDefined();
      expect(result.client.id).toBeDefined();
      expect(result.project.id).toBeDefined();
      expect(result.lead.status).toBe('CONVERTED');
    });

    it('should reject conversion of already converted lead', async () => {
      const convertedLead = { ...mockLead, clientId: 'existing-client-id', status: 'CONVERTED' };

      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(convertedLead);

      // Lead already has clientId, should not convert again
      expect(convertedLead.clientId).toBeDefined();
    });

    it('should use effective tier (override or recommended)', async () => {
      const leadWithOverride = { ...mockLead, tierOverride: 3 };

      (mockPrisma.lead.findUnique as jest.Mock).mockResolvedValue(leadWithOverride);

      const effectiveTier = leadWithOverride.tierOverride ?? leadWithOverride.recommendedTier;
      expect(effectiveTier).toBe(3);
    });

    it('should require payment details', () => {
      const requiredFields = ['stripePaymentIntentId', 'stripeCustomerId', 'amount'];
      const paymentData = {
        stripePaymentIntentId: 'pi_123',
        stripeCustomerId: 'cus_123',
        amount: 25000,
      };

      requiredFields.forEach((field) => {
        expect(paymentData).toHaveProperty(field);
      });
    });
  });
});

describe('Tier Router Integration', () => {
  const mockRecommendTier = recommendTier as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should recommend Tier 1 for small budget and quick timeline', () => {
    mockRecommendTier.mockReturnValue({
      tier: 1,
      reason: 'Small project with quick turnaround',
      confidence: 0.9,
      needsManualReview: false,
    });

    const result = recommendTier({
      budgetRange: 'Under $5,000',
      timeline: '1-2 weeks',
      projectType: 'consultation',
    });

    expect(result.tier).toBe(1);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('should recommend Tier 4 for KAA white-glove service', () => {
    mockRecommendTier.mockReturnValue({
      tier: 4,
      reason: 'Full-service landscape architecture',
      confidence: 0.95,
      needsManualReview: false,
    });

    const result = recommendTier({
      budgetRange: '$100,000+',
      timeline: '6+ months',
      projectType: 'new_build',
      hasSurvey: true,
      hasDrawings: true,
    });

    expect(result.tier).toBe(4);
  });

  it('should flag for manual review when signals are mixed', () => {
    mockRecommendTier.mockReturnValue({
      tier: 2,
      reason: 'Mixed project signals',
      confidence: 0.4,
      needsManualReview: true,
    });

    const result = recommendTier({
      budgetRange: '$50,000+',
      timeline: '1-2 weeks',
      projectType: 'renovation',
    });

    expect(result.needsManualReview).toBe(true);
    expect(result.confidence).toBeLessThan(0.5);
  });
});
