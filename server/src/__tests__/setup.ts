/**
 * Jest Test Setup
 *
 * This file runs before each test file.
 * Sets up mocks and test utilities.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock Prisma client
jest.mock('../utils/prisma', () => ({
  prisma: {
    lead: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    client: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    project: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    milestone: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    deliverable: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      user: { create: jest.fn() },
      client: { create: jest.fn() },
      project: { create: jest.fn() },
      payment: { create: jest.fn() },
      lead: { update: jest.fn() },
    })),
  },
  default: {},
}));

// Mock audit service to prevent actual logging during tests
jest.mock('../services/auditService', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  logAuditFromRequest: jest.fn().mockResolvedValue(undefined),
  logAuth: jest.fn().mockResolvedValue(undefined),
  logLeadAction: jest.fn().mockResolvedValue(undefined),
  logProjectAction: jest.fn().mockResolvedValue(undefined),
  logMilestoneAction: jest.fn().mockResolvedValue(undefined),
  logDeliverableAction: jest.fn().mockResolvedValue(undefined),
  logPaymentAction: jest.fn().mockResolvedValue(undefined),
  logFileAction: jest.fn().mockResolvedValue(undefined),
  AuditActions: {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    REGISTER: 'REGISTER',
    LEAD_CREATE: 'LEAD_CREATE',
    LEAD_UPDATE: 'LEAD_UPDATE',
    LEAD_CONVERT: 'LEAD_CONVERT',
  },
  ResourceTypes: {
    USER: 'USER',
    LEAD: 'LEAD',
    PROJECT: 'PROJECT',
  },
}));

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: '$2b$10$test-hash',
  role: 'CLIENT',
  userType: 'SAGE_CLIENT',
  tier: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockLead = {
  id: 'test-lead-id',
  email: 'lead@example.com',
  name: 'Test Lead',
  projectAddress: '123 Test St, City, ST 12345',
  budgetRange: '$10,000-$25,000',
  timeline: '4-8 weeks',
  projectType: 'renovation',
  hasSurvey: false,
  hasDrawings: false,
  recommendedTier: 2,
  routingReason: 'Budget and timeline match Tier 2',
  status: 'NEW',
  tierOverride: null,
  overrideReason: null,
  clientId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockProject = {
  id: 'test-project-id',
  clientId: 'test-client-id',
  leadId: 'test-lead-id',
  tier: 2,
  status: 'ONBOARDING',
  name: 'Test Project',
  paymentStatus: 'paid',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockClient = {
  id: 'test-client-id',
  userId: 'test-user-id',
  tier: 2,
  status: 'ACTIVE',
  projectAddress: '123 Test St',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Helper to create a mock Express request
export function createMockRequest(overrides = {}): any {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    get: jest.fn(),
    ip: '127.0.0.1',
    ...overrides,
  };
}

// Helper to create a mock Express response
export function createMockResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

// Helper to create a mock next function
export function createMockNext(): jest.Mock {
  return jest.fn();
}
