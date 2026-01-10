import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { createAuthRouter } from '../routes/auth';
import { createAdminRouter } from '../routes/admin';
import { createCheckoutRouter } from '../routes/checkout';
import { createUploadRouter } from '../routes/upload';
import { createWebhooksRouter } from '../routes/webhooks';
import {
  AuditActions,
  ResourceTypes,
  logAudit,
  logAuditFromRequest,
} from '../services/auditService';
import * as authService from '../services/authService';
import * as stripeHelpers from '../utils/stripeHelpers';

jest.mock('../services/authService', () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  refreshAccessToken: jest.fn(),
  getUserProfile: jest.fn(),
  verifyToken: jest.fn(),
  extractToken: jest.fn(),
}));

jest.mock('../utils/stripeHelpers', () => ({
  createCheckoutSession: jest.fn(),
  getTierPricing: jest.fn(),
  isValidTier: jest.fn(),
  TIER_PRICING: {
    1: { tier: 1, name: 'Tier 1', description: 'Tier 1', amount: 1000, currency: 'usd' },
    2: { tier: 2, name: 'Tier 2', description: 'Tier 2', amount: 2000, currency: 'usd' },
    3: { tier: 3, name: 'Tier 3', description: 'Tier 3', amount: 3000, currency: 'usd' },
    4: { tier: 4, name: 'Tier 4', description: 'Tier 4', amount: 0, currency: 'usd' },
  },
  constructWebhookEvent: jest.fn(),
  isEventProcessed: jest.fn(),
  handleCheckoutCompleted: jest.fn(),
  handlePaymentSucceeded: jest.fn(),
  handlePaymentFailed: jest.fn(),
}));

type Handler = (req: any, res: any, next: any) => Promise<void> | void;

function getRouteHandler(router: Router, method: string, path: string): Handler {
  const layer = router.stack.find(
    (item: any) => item.route?.path === path && item.route.methods?.[method.toLowerCase()]
  );
  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }
  const handlers = layer.route.stack;
  return handlers[handlers.length - 1].handle as Handler;
}

function createMockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Audit logging for core actions', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs audit entry for auth registration', async () => {
    const router = createAuthRouter(mockPrisma);
    const handler = getRouteHandler(router, 'post', '/register');

    (authService.registerUser as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'newuser@example.com',
        userType: 'SAGE_CLIENT',
        tier: 2,
      },
      token: 'token',
      refreshToken: 'refresh',
      expiresIn: '1h',
    });

    const req: any = {
      body: { email: 'newuser@example.com', password: 'Password123', tier: 2 },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('jest-agent'),
      id: 'req-1',
    };
    const res = createMockRes();

    await handler(req, res, jest.fn());

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditActions.REGISTER,
        resourceType: ResourceTypes.USER,
        userId: 'user-1',
        resourceId: 'user-1',
      })
    );
  });

  it('logs audit entry for admin dashboard access', async () => {
    const router = createAdminRouter(mockPrisma);
    const handler = getRouteHandler(router, 'get', '/dashboard');

    mockPrisma.lead.count.mockResolvedValue(0);
    mockPrisma.lead.groupBy.mockResolvedValue([]);
    mockPrisma.project.count.mockResolvedValue(0);
    mockPrisma.project.groupBy.mockResolvedValue([]);
    mockPrisma.client.count.mockResolvedValue(0);
    mockPrisma.client.groupBy.mockResolvedValue([]);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } } as any);
    mockPrisma.payment.groupBy.mockResolvedValue([]);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    const req: any = {
      user: { id: 'admin-1', userId: 'admin-1' },
      query: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('jest-agent'),
      id: 'req-2',
    };
    const res = createMockRes();

    await handler(req, res, jest.fn());

    expect(logAuditFromRequest).toHaveBeenCalledWith(
      req,
      AuditActions.ADMIN_VIEW_DASHBOARD,
      ResourceTypes.ADMIN,
      undefined,
      expect.any(Object)
    );
  });

  it('logs audit entry for checkout session creation', async () => {
    const router = createCheckoutRouter(mockPrisma);
    const handler = getRouteHandler(router, 'post', '/create-session');

    (stripeHelpers.isValidTier as jest.Mock).mockReturnValue(true);
    (stripeHelpers.createCheckoutSession as jest.Mock).mockResolvedValue({
      id: 'sess_1',
      url: 'https://stripe.test/session',
      expires_at: 123456,
    });
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      email: 'lead@example.com',
      projectAddress: '123 Test St',
      client: null,
    } as any);

    const req: any = {
      body: {
        leadId: 'lead-1',
        tier: 1,
        email: 'lead@example.com',
        projectId: 'proj-1',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('jest-agent'),
      id: 'req-3',
    };
    const res = createMockRes();

    await handler(req, res, jest.fn());

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditActions.CHECKOUT_START,
        resourceType: ResourceTypes.LEAD,
        resourceId: 'lead-1',
      })
    );
  });

  it('logs audit entry for file upload', async () => {
    const router = createUploadRouter({ prisma: mockPrisma });
    const handler = getRouteHandler(router, 'post', '/');

    mockPrisma.project.findUnique.mockResolvedValue({ id: 'project-1' } as any);
    mockPrisma.deliverable.create.mockResolvedValue({
      id: 'deliverable-1',
      name: 'file.pdf',
      filePath: 'path/file.pdf',
      fileUrl: 'https://cdn.test/file.pdf',
      fileSize: 1234,
      fileType: 'application/pdf',
      category: 'Document',
      createdAt: new Date(),
    } as any);

    const req: any = {
      user: {
        id: 'admin-1',
        userId: 'admin-1',
        email: 'admin@example.com',
        userType: 'ADMIN',
      },
      file: {
        originalname: 'file.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
      },
      body: {
        projectId: 'project-1',
        category: 'Document',
      },
      storageService: {
        uploadFile: jest.fn().mockResolvedValue({
          success: true,
          filePath: 'path/file.pdf',
          fileUrl: 'https://cdn.test/file.pdf',
          fileSize: 1234,
        }),
      },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('jest-agent'),
      id: 'req-4',
    };
    const res = createMockRes();

    await handler(req, res, jest.fn());

    expect(logAuditFromRequest).toHaveBeenCalledWith(
      req,
      AuditActions.FILE_UPLOAD,
      ResourceTypes.DELIVERABLE,
      'deliverable-1',
      expect.any(Object)
    );
  });

  it('logs audit entry for Stripe webhook processing', async () => {
    const router = createWebhooksRouter(mockPrisma);
    const handler = getRouteHandler(router, 'post', '/stripe');

    (stripeHelpers.constructWebhookEvent as jest.Mock).mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { id: 'sess_1', payment_intent: 'pi_1' } },
    });
    (stripeHelpers.isEventProcessed as jest.Mock).mockResolvedValue(false);
    (stripeHelpers.handleCheckoutCompleted as jest.Mock).mockResolvedValue({
      success: true,
      processed: true,
      message: 'ok',
    });

    const req: any = {
      headers: { 'stripe-signature': 'sig' },
      body: Buffer.from('payload'),
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('jest-agent'),
      id: 'req-5',
    };
    const res = createMockRes();

    await handler(req, res, jest.fn());

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditActions.WEBHOOK_STRIPE_RECEIVED,
        resourceType: ResourceTypes.WEBHOOK,
        resourceId: 'evt_1',
      })
    );
  });
});
