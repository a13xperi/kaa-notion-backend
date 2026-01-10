/**
 * Jest Test Setup
 *
 * This file runs before each test file.
 * Sets up mocks, test utilities, and global configuration.
 */

import { PrismaClient } from '@prisma/client';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Create a mock Prisma client for testing
export const mockPrisma = {
  lead: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  client: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  project: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  milestone: {
    create: jest.fn(),
    createMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  deliverable: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    deleteMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn((callback) => {
    if (typeof callback === 'function') {
      return callback(mockPrisma);
    }
    return Promise.all(callback);
  }),
} as unknown as PrismaClient;

// Mock Prisma client
jest.mock('../utils/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
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

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================
// Static Mock Data
// ============================================

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: '$2b$10$test-hash',
  role: 'CLIENT',
  userType: 'SAGE_CLIENT',
  tier: 2,
  address: null,
  lastLogin: null,
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
  notionPageId: null,
  paymentStatus: 'paid',
  syncStatus: 'PENDING',
  lastSyncedAt: null,
  syncError: null,
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

// ============================================
// Factory Functions for Dynamic Mock Data
// ============================================

export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  userType: 'SAGE_CLIENT',
  tier: 2,
  passwordHash: 'hashed',
  role: 'CLIENT',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLogin: null,
  address: null,
  ...overrides,
});

export const createMockClient = (overrides = {}) => ({
  id: 'client-123',
  userId: 'user-123',
  tier: 2,
  status: 'ACTIVE',
  projectAddress: '123 Test St, Test City, TS 12345',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockLead = (overrides = {}) => ({
  id: 'lead-123',
  email: 'lead@example.com',
  name: 'Test Lead',
  projectAddress: '456 Lead St, Test City, TS 12345',
  budgetRange: '25k_50k',
  timeline: '3_6_months',
  projectType: 'full_landscape',
  hasSurvey: false,
  hasDrawings: false,
  recommendedTier: 2,
  routingReason: 'Budget and timeline suitable for Tier 2',
  status: 'NEW',
  clientId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: 'project-123',
  clientId: 'client-123',
  leadId: 'lead-123',
  tier: 2,
  status: 'IN_PROGRESS',
  name: 'Test Project',
  notionPageId: null,
  paymentStatus: 'paid',
  syncStatus: 'PENDING',
  lastSyncedAt: null,
  syncError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockMilestone = (overrides = {}) => ({
  id: 'milestone-123',
  projectId: 'project-123',
  tier: 2,
  name: 'Design Draft',
  order: 1,
  status: 'PENDING',
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  completedAt: null,
  syncStatus: 'PENDING',
  lastSyncedAt: null,
  createdAt: new Date(),
  ...overrides,
});

export const createMockDeliverable = (overrides = {}) => ({
  id: 'deliverable-123',
  projectId: 'project-123',
  name: 'test-file.pdf',
  filePath: 'projects/project-123/Document/test-file.pdf',
  fileUrl: 'https://storage.example.com/test-file.pdf',
  fileSize: 1024000,
  fileType: 'application/pdf',
  category: 'Document',
  description: 'Test deliverable',
  notionPageId: null,
  uploadedById: 'user-123',
  syncStatus: 'PENDING',
  lastSyncedAt: null,
  createdAt: new Date(),
  ...overrides,
});

// ============================================
// Request/Response Helpers
// ============================================

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

// Export test helpers for auth headers
export const mockAuthHeaders = (userId = 'user-123', userType = 'ADMIN') => ({
  'x-user-id': userId,
  'x-user-type': userType,
  'x-user-email': 'test@example.com',
});
