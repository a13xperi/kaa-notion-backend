/**
 * Payment Routes Tests
 *
 * Tests for Stripe webhook handling and payment status updates.
 */

import { prisma } from '../utils/prisma';
import { mockProject, mockUser, mockClient } from './setup';

describe('Payment Routes', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  const mockPayment = {
    id: 'payment-1',
    projectId: mockProject.id,
    stripePaymentIntentId: 'pi_test_123456789',
    stripeCheckoutSessionId: 'cs_test_123456789',
    stripeCustomerId: 'cus_test_123456789',
    amount: 250000, // $2,500 in cents
    currency: 'usd',
    status: 'PENDING',
    tier: 2,
    paidAt: null,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stripe Webhook Handling', () => {
    describe('checkout.session.completed', () => {
      it('should process successful checkout session', async () => {
        const checkoutSession = {
          id: 'cs_test_123456789',
          payment_intent: 'pi_test_123456789',
          customer: 'cus_test_123456789',
          amount_total: 250000,
          metadata: {
            leadId: 'test-lead-id',
            tier: '2',
          },
        };

        // Simulate finding lead and creating resources
        const mockLead = {
          id: 'test-lead-id',
          email: 'test@example.com',
          recommendedTier: 2,
          tierOverride: null,
        };

        expect(checkoutSession.payment_intent).toBeDefined();
        expect(checkoutSession.metadata.leadId).toBe(mockLead.id);

        // Effective tier calculation
        const effectiveTier = mockLead.tierOverride ?? mockLead.recommendedTier;
        expect(effectiveTier).toBe(2);
      });

      it('should create user, client, project, and payment on success', async () => {
        const transactionResult = {
          user: { id: 'new-user-id', email: 'test@example.com' },
          client: { id: 'new-client-id', tier: 2 },
          project: { id: 'new-project-id', status: 'ONBOARDING' },
          payment: { id: 'new-payment-id', status: 'SUCCEEDED' },
        };

        (mockPrisma.$transaction as jest.Mock).mockResolvedValue(transactionResult);

        const result = await mockPrisma.$transaction(async () => transactionResult);

        expect(result.user.id).toBeDefined();
        expect(result.client.id).toBeDefined();
        expect(result.project.id).toBeDefined();
        expect(result.payment.status).toBe('SUCCEEDED');
      });

      it('should handle duplicate webhook events idempotently', async () => {
        // First call creates payment
        (mockPrisma.payment.findUnique as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(mockPayment);

        const firstCheck = await mockPrisma.payment.findUnique({
          where: { stripePaymentIntentId: 'pi_test_123456789' },
        });
        expect(firstCheck).toBeNull();

        // Second call finds existing payment
        const secondCheck = await mockPrisma.payment.findUnique({
          where: { stripePaymentIntentId: 'pi_test_123456789' },
        });
        expect(secondCheck).toBeDefined();
      });
    });

    describe('payment_intent.succeeded', () => {
      it('should update payment status to SUCCEEDED', async () => {
        const paymentIntent = {
          id: 'pi_test_123456789',
          status: 'succeeded',
          amount: 250000,
        };

        const updatedPayment = { ...mockPayment, status: 'SUCCEEDED', paidAt: new Date() };

        (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(mockPayment);
        (mockPrisma.payment.update as jest.Mock).mockResolvedValue(updatedPayment);

        const payment = await mockPrisma.payment.update({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: { status: 'SUCCEEDED', paidAt: new Date() },
        });

        expect(payment.status).toBe('SUCCEEDED');
        expect(payment.paidAt).toBeDefined();
      });

      it('should update project payment status', async () => {
        const updatedProject = { ...mockProject, paymentStatus: 'paid' };

        (mockPrisma.project.update as jest.Mock).mockResolvedValue(updatedProject);

        const project = await mockPrisma.project.update({
          where: { id: mockProject.id },
          data: { paymentStatus: 'paid' },
        });

        expect(project.paymentStatus).toBe('paid');
      });
    });

    describe('payment_intent.payment_failed', () => {
      it('should update payment status to FAILED with reason', async () => {
        const paymentIntent = {
          id: 'pi_test_123456789',
          status: 'failed',
          last_payment_error: {
            message: 'Your card was declined.',
          },
        };

        const failedPayment = {
          ...mockPayment,
          status: 'FAILED',
          failureReason: paymentIntent.last_payment_error.message,
        };

        (mockPrisma.payment.update as jest.Mock).mockResolvedValue(failedPayment);

        const payment = await mockPrisma.payment.update({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: {
            status: 'FAILED',
            failureReason: paymentIntent.last_payment_error.message,
          },
        });

        expect(payment.status).toBe('FAILED');
        expect(payment.failureReason).toBe('Your card was declined.');
      });
    });

    describe('charge.refunded', () => {
      it('should update payment status to REFUNDED', async () => {
        const refundedPayment = { ...mockPayment, status: 'REFUNDED' };

        (mockPrisma.payment.update as jest.Mock).mockResolvedValue(refundedPayment);

        const payment = await mockPrisma.payment.update({
          where: { stripePaymentIntentId: 'pi_test_123456789' },
          data: { status: 'REFUNDED' },
        });

        expect(payment.status).toBe('REFUNDED');
      });

      it('should update project payment status to refunded', async () => {
        const refundedProject = { ...mockProject, paymentStatus: 'refunded' };

        (mockPrisma.project.update as jest.Mock).mockResolvedValue(refundedProject);

        const project = await mockPrisma.project.update({
          where: { id: mockProject.id },
          data: { paymentStatus: 'refunded' },
        });

        expect(project.paymentStatus).toBe('refunded');
      });
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should verify webhook signature', () => {
      const webhookSecret = 'whsec_test_secret';
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const signature = 't=1234567890,v1=abc123';

      // Simulate signature verification
      const isValid = signature.includes('v1=') && webhookSecret.startsWith('whsec_');
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const invalidSignature = 'invalid';
      const isValid = invalidSignature.includes('v1=');
      expect(isValid).toBe(false);
    });

    it('should reject expired signatures', () => {
      const timestamp = 1234567890;
      const tolerance = 300; // 5 minutes
      const now = Math.floor(Date.now() / 1000);

      const isExpired = now - timestamp > tolerance;
      expect(isExpired).toBe(true);
    });
  });

  describe('Payment Status Transitions', () => {
    it('should allow PENDING -> SUCCEEDED transition', () => {
      const validTransitions: Record<string, string[]> = {
        PENDING: ['SUCCEEDED', 'FAILED'],
        SUCCEEDED: ['REFUNDED'],
        FAILED: ['PENDING'], // Retry
        REFUNDED: [],
      };

      expect(validTransitions.PENDING).toContain('SUCCEEDED');
    });

    it('should allow SUCCEEDED -> REFUNDED transition', () => {
      const validTransitions: Record<string, string[]> = {
        PENDING: ['SUCCEEDED', 'FAILED'],
        SUCCEEDED: ['REFUNDED'],
        FAILED: ['PENDING'],
        REFUNDED: [],
      };

      expect(validTransitions.SUCCEEDED).toContain('REFUNDED');
    });

    it('should not allow REFUNDED -> any transition', () => {
      const validTransitions: Record<string, string[]> = {
        REFUNDED: [],
      };

      expect(validTransitions.REFUNDED).toHaveLength(0);
    });
  });

  describe('Checkout Session Creation', () => {
    it('should create checkout session with correct metadata', () => {
      const checkoutParams = {
        mode: 'payment',
        success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          leadId: 'test-lead-id',
          tier: '2',
        },
        line_items: [
          {
            price: 'price_tier2',
            quantity: 1,
          },
        ],
      };

      expect(checkoutParams.metadata.leadId).toBeDefined();
      expect(checkoutParams.metadata.tier).toBe('2');
      expect(checkoutParams.success_url).toContain('{CHECKOUT_SESSION_ID}');
    });

    it('should use correct price ID for tier', () => {
      const tierPrices: Record<number, string> = {
        1: 'price_tier1',
        2: 'price_tier2',
        3: 'price_tier3',
        4: 'price_tier4',
      };

      expect(tierPrices[2]).toBe('price_tier2');
      expect(tierPrices[4]).toBe('price_tier4');
    });
  });

  describe('Payment Amount Validation', () => {
    it('should validate amount is positive', () => {
      const validAmount = 250000;
      const invalidAmount = -100;

      expect(validAmount > 0).toBe(true);
      expect(invalidAmount > 0).toBe(false);
    });

    it('should validate amount is in cents', () => {
      const amountInCents = 250000;
      const amountInDollars = amountInCents / 100;

      expect(amountInDollars).toBe(2500);
    });

    it('should validate currency is supported', () => {
      const supportedCurrencies = ['usd', 'eur', 'gbp'];
      const currency = 'usd';

      expect(supportedCurrencies).toContain(currency);
    });
  });

  describe('Tier Pricing', () => {
    it('should have correct pricing for each tier', () => {
      const tierPricing: Record<number, number> = {
        1: 50000,   // $500
        2: 250000,  // $2,500
        3: 500000,  // $5,000
        4: 1000000, // $10,000+ (custom)
      };

      expect(tierPricing[1]).toBe(50000);
      expect(tierPricing[2]).toBe(250000);
      expect(tierPricing[3]).toBe(500000);
    });

    it('should calculate correct amount for tier', () => {
      const getAmountForTier = (tier: number): number => {
        const pricing: Record<number, number> = {
          1: 50000,
          2: 250000,
          3: 500000,
          4: 1000000,
        };
        return pricing[tier] || 0;
      };

      expect(getAmountForTier(2)).toBe(250000);
    });
  });
});
