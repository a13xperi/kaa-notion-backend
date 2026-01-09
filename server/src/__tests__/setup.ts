/**
 * Jest Test Setup
 * Global configuration for all tests.
 */

import { PrismaClient } from '@prisma/client';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_EXPIRES_IN = '1h';

// Create a mock Prisma client for testing
export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  client: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  lead: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  milestone: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  deliverable: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  payment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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
  $transaction: jest.fn((fn) => fn(mockPrisma)),
} as unknown as PrismaClient;

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  userType: 'SAGE_CLIENT',
  tier: 2,
  passwordHash: 'hashed',
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

// Export test helpers
export const mockAuthHeaders = (userId = 'user-123', userType = 'ADMIN') => ({
  'x-user-id': userId,
  'x-user-type': userType,
  'x-user-email': 'test@example.com',
});
