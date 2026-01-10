/**
 * Email Service Tests
 */

import {
  initEmailService,
  sendEmail,
  sendWelcomeEmail,
  sendPaymentConfirmation,
  sendMilestoneNotification,
  sendDeliverableNotification,
  EmailTemplates,
  type EmailConfig,
  type EmailOptions,
} from '../emailService';

// Mock fetch for Resend API
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock logger
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('initEmailService', () => {
    it('should initialize with console provider', () => {
      const config: EmailConfig = {
        provider: 'console',
        defaultFrom: 'test@example.com',
      };

      expect(() => initEmailService(config)).not.toThrow();
    });

    it('should initialize with resend provider', () => {
      const config: EmailConfig = {
        provider: 'resend',
        resendApiKey: 'test-api-key',
        defaultFrom: 'test@example.com',
      };

      expect(() => initEmailService(config)).not.toThrow();
    });

    it('should initialize with nodemailer provider', () => {
      const config: EmailConfig = {
        provider: 'nodemailer',
        smtpConfig: {
          host: 'smtp.test.com',
          port: 587,
          secure: false,
          auth: {
            user: 'user@test.com',
            pass: 'password',
          },
        },
        defaultFrom: 'test@example.com',
      };

      expect(() => initEmailService(config)).not.toThrow();
    });
  });

  describe('sendEmail - Console Provider', () => {
    beforeEach(() => {
      initEmailService({
        provider: 'console',
        defaultFrom: 'no-reply@sage.design',
        replyTo: 'support@sage.design',
      });
    });

    it('should send email via console and return success', async () => {
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Test content',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^console-/);
    });

    it('should handle array of recipients', async () => {
      const options: EmailOptions = {
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(true);
    });
  });

  describe('sendEmail - Resend Provider', () => {
    beforeEach(() => {
      initEmailService({
        provider: 'resend',
        resendApiKey: 'test-api-key',
        defaultFrom: 'no-reply@sage.design',
        replyTo: 'support@sage.design',
      });
    });

    it('should send email via Resend API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      });

      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Test content',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle Resend API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid API key' }),
      });

      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await sendEmail(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should send with tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      });

      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        tags: ['welcome', 'tier-1'],
      };

      await sendEmail(options);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.tags).toEqual([
        { name: 'welcome', value: 'true' },
        { name: 'tier-1', value: 'true' },
      ]);
    });
  });

  describe('EmailTemplates', () => {
    describe('welcome template', () => {
      it('should generate welcome email with all fields', () => {
        const template = EmailTemplates.welcome({
          name: 'John Doe',
          email: 'john@example.com',
          tier: 2,
          loginUrl: 'https://sage.design/login',
        });

        expect(template.subject).toBe('Welcome to SAGE! 🌿');
        expect(template.html).toContain('John Doe');
        expect(template.html).toContain('john@example.com');
        expect(template.html).toContain('Tier 2');
        expect(template.html).toContain('https://sage.design/login');
        expect(template.text).toContain('John Doe');
      });

      it('should handle missing name gracefully', () => {
        const template = EmailTemplates.welcome({
          name: '',
          email: 'john@example.com',
          tier: 1,
          loginUrl: 'https://sage.design/login',
        });

        expect(template.html).toContain('there');
        expect(template.text).toContain('there');
      });
    });

    describe('paymentConfirmation template', () => {
      it('should generate payment confirmation email', () => {
        const template = EmailTemplates.paymentConfirmation({
          name: 'Jane Smith',
          amount: '$1,499.00',
          tier: 2,
          projectName: 'Garden Redesign',
          portalUrl: 'https://sage.design/portal/123',
        });

        expect(template.subject).toContain('Payment Confirmed');
        expect(template.html).toContain('Jane Smith');
        expect(template.html).toContain('$1,499.00');
        expect(template.html).toContain('Garden Redesign');
        expect(template.html).toContain('Tier 2');
      });

      it('should include receipt URL when provided', () => {
        const template = EmailTemplates.paymentConfirmation({
          name: 'Jane Smith',
          amount: '$1,499.00',
          tier: 2,
          projectName: 'Garden Redesign',
          portalUrl: 'https://sage.design/portal/123',
          receiptUrl: 'https://stripe.com/receipt/123',
        });

        expect(template.html).toContain('https://stripe.com/receipt/123');
        expect(template.html).toContain('Download Receipt');
      });
    });

    describe('milestoneCompleted template', () => {
      it('should generate milestone completed email with next milestone', () => {
        const template = EmailTemplates.milestoneCompleted({
          name: 'John',
          projectName: 'Backyard Oasis',
          milestoneName: 'Design Concepts',
          nextMilestone: 'Site Plan Review',
          portalUrl: 'https://sage.design/portal/123',
        });

        expect(template.subject).toContain('Milestone Complete');
        expect(template.subject).toContain('Design Concepts');
        expect(template.html).toContain('Design Concepts');
        expect(template.html).toContain('Site Plan Review');
      });

      it('should indicate project completion when no next milestone', () => {
        const template = EmailTemplates.milestoneCompleted({
          name: 'John',
          projectName: 'Backyard Oasis',
          milestoneName: 'Final Walkthrough',
          portalUrl: 'https://sage.design/portal/123',
        });

        expect(template.html).toContain('project is now complete');
        expect(template.html).toContain('🎉');
      });
    });

    describe('deliverableReady template', () => {
      it('should generate deliverable ready email', () => {
        const template = EmailTemplates.deliverableReady({
          name: 'Sarah',
          projectName: 'Front Yard Makeover',
          deliverableName: 'Planting Plan PDF',
          downloadUrl: 'https://storage.sage.design/files/planting-plan.pdf',
          portalUrl: 'https://sage.design/portal/456',
        });

        expect(template.subject).toContain('New Deliverable');
        expect(template.subject).toContain('Planting Plan PDF');
        expect(template.html).toContain('Planting Plan PDF');
        expect(template.html).toContain('Download Now');
        expect(template.html).toContain('https://storage.sage.design/files/planting-plan.pdf');
      });
    });
  });

  describe('Convenience Functions', () => {
    beforeEach(() => {
      initEmailService({
        provider: 'console',
        defaultFrom: 'no-reply@sage.design',
      });
    });

    describe('sendWelcomeEmail', () => {
      it('should send welcome email with correct data', async () => {
        const result = await sendWelcomeEmail({
          to: 'new-user@example.com',
          name: 'New User',
          tier: 1,
        });

        expect(result.success).toBe(true);
      });

      it('should use default login URL when not provided', async () => {
        const result = await sendWelcomeEmail({
          to: 'user@example.com',
          name: 'User',
          tier: 2,
        });

        expect(result.success).toBe(true);
      });

      it('should use custom login URL when provided', async () => {
        const result = await sendWelcomeEmail({
          to: 'user@example.com',
          name: 'User',
          tier: 3,
          loginUrl: 'https://custom.url/login',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('sendPaymentConfirmation', () => {
      it('should send payment confirmation with formatted amount', async () => {
        const result = await sendPaymentConfirmation({
          to: 'customer@example.com',
          name: 'Customer',
          amount: 149900, // $1,499.00 in cents
          currency: 'usd',
          tier: 2,
          projectName: 'Landscape Design',
          projectId: 'proj_123',
        });

        expect(result.success).toBe(true);
      });

      it('should include receipt URL when provided', async () => {
        const result = await sendPaymentConfirmation({
          to: 'customer@example.com',
          name: 'Customer',
          amount: 29900,
          currency: 'usd',
          tier: 1,
          projectName: 'DIY Guide',
          projectId: 'proj_456',
          receiptUrl: 'https://stripe.com/receipt/xyz',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('sendMilestoneNotification', () => {
      it('should send milestone notification', async () => {
        const result = await sendMilestoneNotification({
          to: 'client@example.com',
          name: 'Client',
          projectName: 'Garden Design',
          projectId: 'proj_789',
          milestoneName: 'Concept Review',
          nextMilestone: 'Site Planning',
        });

        expect(result.success).toBe(true);
      });

      it('should handle final milestone (no next)', async () => {
        const result = await sendMilestoneNotification({
          to: 'client@example.com',
          name: 'Client',
          projectName: 'Garden Design',
          projectId: 'proj_789',
          milestoneName: 'Project Complete',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('sendDeliverableNotification', () => {
      it('should send deliverable notification', async () => {
        const result = await sendDeliverableNotification({
          to: 'client@example.com',
          name: 'Client',
          projectName: 'Landscape Project',
          projectId: 'proj_abc',
          deliverableName: 'Design Render',
          downloadUrl: 'https://storage.example.com/render.pdf',
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return error when Resend API key is missing', async () => {
      initEmailService({
        provider: 'resend',
        // No API key
        defaultFrom: 'test@example.com',
      });

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key not configured');
    });
  });
});
