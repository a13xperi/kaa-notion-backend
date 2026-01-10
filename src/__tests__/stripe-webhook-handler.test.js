/**
 * Jest Test Suite for Stripe Webhook Handler
 * Tests the checkout.session.completed event handling
 */

const bcrypt = require('bcrypt');

// Mock the email service before requiring the handler
jest.mock('../email-service', () => ({
  sendPortalAccessEmail: jest.fn().mockResolvedValue(true)
}));

const { sendPortalAccessEmail } = require('../email-service');
const {
  handleCheckoutSessionCompleted,
  verifyWebhookSignature,
  createWebhookHandler,
  generateAccessCode,
  generateTempPassword
} = require('../stripe-webhook-handler');

// ==============================================================
// Mock Factory Functions
// ==============================================================

/**
 * Create a mock Stripe checkout.session.completed event
 */
function createMockStripeEvent(overrides = {}) {
  return {
    id: 'evt_test_123456789',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_session_id',
        object: 'checkout.session',
        customer: 'cus_test_customer_id',
        customer_email: 'test@example.com',
        customer_details: {
          email: 'test@example.com',
          name: 'Test Customer'
        },
        payment_intent: 'pi_test_payment_intent_123',
        amount_total: 149900, // $1,499.00 in cents
        currency: 'usd',
        payment_status: 'paid',
        status: 'complete',
        metadata: {
          tier: '2',
          project_address: '123 Garden Lane, Austin TX 78701',
          project_name: 'Garden Renovation Project'
        },
        ...overrides.session
      }
    },
    ...overrides.event
  };
}

/**
 * Create a mock Prisma client with transaction support
 */
function createMockPrismaClient() {
  const mockUser = {
    id: 'user_uuid_123',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    userType: 'SAGE_CLIENT',
    tier: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockClient = {
    id: 'client_uuid_456',
    userId: 'user_uuid_123',
    tier: 2,
    status: 'ONBOARDING',
    projectAddress: '123 Garden Lane, Austin TX 78701',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockProject = {
    id: 'project_uuid_789',
    clientId: 'client_uuid_456',
    tier: 2,
    status: 'ONBOARDING',
    name: 'Garden Renovation Project',
    paymentStatus: 'paid',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockPayment = {
    id: 'payment_uuid_101',
    projectId: 'project_uuid_789',
    stripePaymentIntentId: 'pi_test_payment_intent_123',
    stripeCustomerId: 'cus_test_customer_id',
    amount: 149900,
    currency: 'usd',
    status: 'SUCCEEDED',
    tier: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAuditLog = {
    id: 'audit_uuid_202',
    userId: 'user_uuid_123',
    action: 'payment',
    resourceType: 'payment',
    resourceId: 'payment_uuid_101',
    details: {},
    createdAt: new Date()
  };

  // Transaction mock - executes the callback with mocked tx
  const txMock = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockUser)
    },
    client: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockClient)
    },
    project: {
      create: jest.fn().mockResolvedValue(mockProject)
    },
    payment: {
      create: jest.fn().mockResolvedValue(mockPayment)
    },
    auditLog: {
      create: jest.fn().mockResolvedValue(mockAuditLog)
    }
  };

  return {
    $transaction: jest.fn(async (callback) => {
      return callback(txMock);
    }),
    _tx: txMock,
    _mocks: { mockUser, mockClient, mockProject, mockPayment, mockAuditLog }
  };
}

/**
 * Create a mock Stripe instance
 */
function createMockStripe() {
  return {
    webhooks: {
      constructEvent: jest.fn((payload, signature, secret) => {
        if (signature === 'invalid_signature') {
          throw new Error('Invalid signature');
        }
        return JSON.parse(payload);
      })
    }
  };
}

// ==============================================================
// Test Suite
// ==============================================================

describe('Stripe Webhook Handler', () => {
  let mockPrisma;
  let mockStripe;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrismaClient();
    mockStripe = createMockStripe();
  });

  // ----------------------------------------------------------
  // Utility Function Tests
  // ----------------------------------------------------------

  describe('generateAccessCode', () => {
    it('should generate an 8-character uppercase code', () => {
      const code = generateAccessCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateAccessCode());
      }
      // With 8 alphanumeric characters, collisions should be extremely rare
      expect(codes.size).toBeGreaterThanOrEqual(95);
    });
  });

  describe('generateTempPassword', () => {
    it('should generate a 12-character password', () => {
      const password = generateTempPassword();
      expect(password).toHaveLength(12);
    });

    it('should contain valid characters', () => {
      const password = generateTempPassword();
      // Should only contain allowed characters
      expect(password).toMatch(/^[A-Za-z0-9!@#$%]+$/);
    });
  });

  // ----------------------------------------------------------
  // handleCheckoutSessionCompleted Tests
  // ----------------------------------------------------------

  describe('handleCheckoutSessionCompleted', () => {
    it('should create user, client, project, and payment for new customer', async () => {
      const event = createMockStripeEvent();

      const result = await handleCheckoutSessionCompleted(event, mockPrisma);

      // Verify transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify user was looked up
      expect(mockPrisma._tx.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });

      // Verify user was created (since findUnique returned null)
      expect(mockPrisma._tx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          userType: 'SAGE_CLIENT',
          tier: 2
        })
      });

      // Verify password was hashed
      const userCreateCall = mockPrisma._tx.user.create.mock.calls[0][0];
      expect(userCreateCall.data.passwordHash).toBeDefined();

      // Verify client was created
      expect(mockPrisma._tx.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_uuid_123',
          tier: 2,
          status: 'ONBOARDING',
          projectAddress: '123 Garden Lane, Austin TX 78701'
        })
      });

      // Verify project was created
      expect(mockPrisma._tx.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'client_uuid_456',
          tier: 2,
          status: 'ONBOARDING',
          name: 'Garden Renovation Project',
          paymentStatus: 'paid'
        })
      });

      // Verify payment was created
      expect(mockPrisma._tx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'project_uuid_789',
          stripePaymentIntentId: 'pi_test_payment_intent_123',
          stripeCustomerId: 'cus_test_customer_id',
          amount: 149900,
          currency: 'usd',
          status: 'SUCCEEDED',
          tier: 2
        })
      });

      // Verify audit log was created
      expect(mockPrisma._tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_uuid_123',
          action: 'payment',
          resourceType: 'payment',
          resourceId: 'payment_uuid_101'
        })
      });

      // Verify result contains all created objects
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('client');
      expect(result).toHaveProperty('project');
      expect(result).toHaveProperty('payment');
      expect(result).toHaveProperty('accessCode');
    });

    it('should send portal access email after successful creation', async () => {
      const event = createMockStripeEvent();

      const result = await handleCheckoutSessionCompleted(event, mockPrisma);

      // Verify sendPortalAccessEmail was called with correct data
      expect(sendPortalAccessEmail).toHaveBeenCalledTimes(1);
      expect(sendPortalAccessEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          accessCode: expect.any(String),
          projectAddress: '123 Garden Lane, Austin TX 78701',
          tier: 2,
          projectName: 'Garden Renovation Project'
        })
      );
    });

    it('should use customer_email if customer_details.email is not available', async () => {
      const event = createMockStripeEvent({
        session: {
          customer_details: null,
          customer_email: 'fallback@example.com'
        }
      });

      await handleCheckoutSessionCompleted(event, mockPrisma);

      expect(mockPrisma._tx.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'fallback@example.com' }
      });
    });

    it('should use existing user if one exists', async () => {
      const existingUser = {
        id: 'existing_user_id',
        email: 'test@example.com',
        userType: 'SAGE_CLIENT'
      };

      mockPrisma._tx.user.findUnique.mockResolvedValue(existingUser);

      const event = createMockStripeEvent();
      await handleCheckoutSessionCompleted(event, mockPrisma);

      // User.create should NOT be called
      expect(mockPrisma._tx.user.create).not.toHaveBeenCalled();

      // Client lookup should use existing user's ID
      expect(mockPrisma._tx.client.findUnique).toHaveBeenCalledWith({
        where: { userId: 'existing_user_id' }
      });
    });

    it('should use existing client if one exists', async () => {
      const existingClient = {
        id: 'existing_client_id',
        userId: 'user_uuid_123',
        tier: 2
      };

      mockPrisma._tx.client.findUnique.mockResolvedValue(existingClient);

      const event = createMockStripeEvent();
      await handleCheckoutSessionCompleted(event, mockPrisma);

      // Client.create should NOT be called
      expect(mockPrisma._tx.client.create).not.toHaveBeenCalled();

      // Project should be linked to existing client
      expect(mockPrisma._tx.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'existing_client_id'
        })
      });
    });

    it('should handle different tier levels', async () => {
      const tiers = [1, 2, 3, 4];

      for (const tier of tiers) {
        jest.clearAllMocks();
        mockPrisma = createMockPrismaClient();

        const event = createMockStripeEvent({
          session: {
            metadata: { tier: String(tier), project_address: 'Test Address' }
          }
        });

        await handleCheckoutSessionCompleted(event, mockPrisma);

        expect(mockPrisma._tx.user.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ tier })
        });
        expect(mockPrisma._tx.project.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ tier })
        });
      }
    });

    it('should default to tier 1 if not specified', async () => {
      const event = createMockStripeEvent({
        session: {
          metadata: { project_address: 'Test Address' }
        }
      });

      await handleCheckoutSessionCompleted(event, mockPrisma);

      expect(mockPrisma._tx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tier: 1 })
      });
    });

    it('should throw error if customer email is missing', async () => {
      const event = createMockStripeEvent({
        session: {
          customer_details: null,
          customer_email: null
        }
      });

      await expect(handleCheckoutSessionCompleted(event, mockPrisma))
        .rejects.toThrow('Customer email is required');
    });

    it('should throw error if payment intent ID is missing', async () => {
      const event = createMockStripeEvent({
        session: {
          payment_intent: null
        }
      });

      await expect(handleCheckoutSessionCompleted(event, mockPrisma))
        .rejects.toThrow('Payment intent ID is required');
    });

    it('should handle alternate metadata key formats', async () => {
      const event = createMockStripeEvent({
        session: {
          metadata: {
            tier: '3',
            projectAddress: '456 Elm Street', // camelCase instead of snake_case
            projectName: 'Elm Street Landscape'
          }
        }
      });

      await handleCheckoutSessionCompleted(event, mockPrisma);

      expect(mockPrisma._tx.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectAddress: '456 Elm Street'
        })
      });
    });

    it('should handle database transaction errors', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

      const event = createMockStripeEvent();

      await expect(handleCheckoutSessionCompleted(event, mockPrisma))
        .rejects.toThrow('Database error');

      // Email should NOT be sent if transaction fails
      expect(sendPortalAccessEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending errors gracefully', async () => {
      sendPortalAccessEmail.mockRejectedValueOnce(new Error('Email service unavailable'));

      const event = createMockStripeEvent();

      // Should throw when email fails
      await expect(handleCheckoutSessionCompleted(event, mockPrisma))
        .rejects.toThrow('Email service unavailable');

      // Transaction should still have completed
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------
  // verifyWebhookSignature Tests
  // ----------------------------------------------------------

  describe('verifyWebhookSignature', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, STRIPE_WEBHOOK_SECRET: 'whsec_test_secret' };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should verify valid webhook signature', () => {
      const payload = JSON.stringify(createMockStripeEvent());
      const signature = 'valid_signature';

      const result = verifyWebhookSignature(payload, signature, mockStripe);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_secret'
      );
      expect(result).toEqual(createMockStripeEvent());
    });

    it('should throw error for invalid signature', () => {
      const payload = JSON.stringify(createMockStripeEvent());
      const signature = 'invalid_signature';

      expect(() => verifyWebhookSignature(payload, signature, mockStripe))
        .toThrow('Invalid signature');
    });

    it('should throw error if webhook secret is not configured', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const payload = JSON.stringify(createMockStripeEvent());

      expect(() => verifyWebhookSignature(payload, 'sig', mockStripe))
        .toThrow('STRIPE_WEBHOOK_SECRET is not configured');
    });
  });

  // ----------------------------------------------------------
  // createWebhookHandler (Express Route) Tests
  // ----------------------------------------------------------

  describe('createWebhookHandler', () => {
    let handler;
    let mockReq;
    let mockRes;

    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
      handler = createWebhookHandler(mockStripe, mockPrisma);

      mockReq = {
        headers: {
          'stripe-signature': 'valid_signature'
        },
        body: JSON.stringify(createMockStripeEvent())
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });

    it('should handle valid checkout.session.completed event', async () => {
      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ received: true });
    });

    it('should return 400 if stripe-signature header is missing', async () => {
      mockReq.headers = {};

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing stripe-signature header'
      });
    });

    it('should return 400 for invalid webhook signature', async () => {
      mockReq.headers['stripe-signature'] = 'invalid_signature';

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Webhook Error')
        })
      );
    });

    it('should handle unrecognized event types gracefully', async () => {
      const unknownEvent = createMockStripeEvent({
        event: { type: 'some.unknown.event' }
      });
      mockReq.body = JSON.stringify(unknownEvent);

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ received: true });
    });

    it('should return 500 if handler throws error', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('DB Connection failed'));

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Webhook handler failed'
      });
    });
  });

  // ----------------------------------------------------------
  // Integration-like Tests
  // ----------------------------------------------------------

  describe('End-to-End Flow', () => {
    it('should complete full checkout flow for new customer', async () => {
      const event = createMockStripeEvent({
        session: {
          customer_details: { email: 'newcustomer@example.com' },
          customer_email: 'newcustomer@example.com',
          metadata: {
            tier: '3',
            project_address: '789 Oak Avenue, Denver CO 80202',
            project_name: 'Oak Avenue Garden'
          },
          amount_total: 299900
        }
      });

      const result = await handleCheckoutSessionCompleted(event, mockPrisma);

      // Verify complete chain of operations
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma._tx.user.findUnique).toHaveBeenCalled();
      expect(mockPrisma._tx.user.create).toHaveBeenCalled();
      expect(mockPrisma._tx.client.findUnique).toHaveBeenCalled();
      expect(mockPrisma._tx.client.create).toHaveBeenCalled();
      expect(mockPrisma._tx.project.create).toHaveBeenCalled();
      expect(mockPrisma._tx.payment.create).toHaveBeenCalled();
      expect(mockPrisma._tx.auditLog.create).toHaveBeenCalled();
      expect(sendPortalAccessEmail).toHaveBeenCalled();

      // Verify result shape
      expect(result).toMatchObject({
        user: expect.any(Object),
        client: expect.any(Object),
        project: expect.any(Object),
        payment: expect.any(Object),
        accessCode: expect.any(String)
      });
    });

    it('should handle returning customer purchasing additional project', async () => {
      // Setup: existing user and client
      const existingUser = {
        id: 'returning_user_id',
        email: 'returning@example.com',
        userType: 'SAGE_CLIENT',
        tier: 2
      };

      const existingClient = {
        id: 'returning_client_id',
        userId: 'returning_user_id',
        tier: 2,
        status: 'ACTIVE'
      };

      mockPrisma._tx.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma._tx.client.findUnique.mockResolvedValue(existingClient);

      const event = createMockStripeEvent({
        session: {
          customer_details: { email: 'returning@example.com' },
          metadata: {
            tier: '3',
            project_address: '999 New Project Lane',
            project_name: 'Second Project'
          }
        }
      });

      await handleCheckoutSessionCompleted(event, mockPrisma);

      // Should NOT create new user or client
      expect(mockPrisma._tx.user.create).not.toHaveBeenCalled();
      expect(mockPrisma._tx.client.create).not.toHaveBeenCalled();

      // Should create new project and payment
      expect(mockPrisma._tx.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'returning_client_id',
          name: 'Second Project'
        })
      });

      expect(mockPrisma._tx.payment.create).toHaveBeenCalled();
      expect(sendPortalAccessEmail).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // Edge Cases and Error Handling
  // ----------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle empty metadata gracefully', async () => {
      const event = createMockStripeEvent({
        session: {
          metadata: {}
        }
      });

      await handleCheckoutSessionCompleted(event, mockPrisma);

      // Should use defaults
      expect(mockPrisma._tx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tier: 1 // Default tier
        })
      });

      expect(mockPrisma._tx.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectAddress: 'Unknown Address' // Default address
        })
      });
    });

    it('should handle undefined metadata', async () => {
      const event = createMockStripeEvent();
      event.data.object.metadata = undefined;

      await handleCheckoutSessionCompleted(event, mockPrisma);

      expect(mockPrisma._tx.user.create).toHaveBeenCalled();
    });

    it('should handle currency variations', async () => {
      const event = createMockStripeEvent({
        session: {
          currency: 'eur',
          amount_total: 129900
        }
      });

      await handleCheckoutSessionCompleted(event, mockPrisma);

      expect(mockPrisma._tx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currency: 'eur',
          amount: 129900
        })
      });
    });

    it('should handle missing customer ID', async () => {
      const event = createMockStripeEvent({
        session: {
          customer: null
        }
      });

      await handleCheckoutSessionCompleted(event, mockPrisma);

      expect(mockPrisma._tx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stripeCustomerId: 'unknown'
        })
      });
    });
  });

  // ----------------------------------------------------------
  // Password Hashing Tests
  // ----------------------------------------------------------

  describe('Password Hashing', () => {
    it('should hash password using bcrypt with cost factor 10', async () => {
      const event = createMockStripeEvent();

      await handleCheckoutSessionCompleted(event, mockPrisma);

      const userCreateCall = mockPrisma._tx.user.create.mock.calls[0][0];
      const passwordHash = userCreateCall.data.passwordHash;

      // Verify it's a valid bcrypt hash
      expect(passwordHash).toMatch(/^\$2[ab]\$10\$/);

      // Verify hash is not the same as plaintext
      expect(passwordHash).not.toBe(generateTempPassword());
    });
  });
});

// ==============================================================
// Additional Test Utilities for Mocking
// ==============================================================

describe('Mock Utilities', () => {
  it('createMockStripeEvent should generate valid event structure', () => {
    const event = createMockStripeEvent();

    expect(event).toHaveProperty('id');
    expect(event).toHaveProperty('type', 'checkout.session.completed');
    expect(event).toHaveProperty('data.object');
    expect(event.data.object).toHaveProperty('customer_details');
    expect(event.data.object).toHaveProperty('payment_intent');
    expect(event.data.object).toHaveProperty('metadata');
  });

  it('createMockStripeEvent should allow overrides', () => {
    const event = createMockStripeEvent({
      session: { amount_total: 999999 },
      event: { type: 'custom.event' }
    });

    expect(event.data.object.amount_total).toBe(999999);
    expect(event.type).toBe('custom.event');
  });
});
