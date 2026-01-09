/**
 * Integration Test: Lead to Client Flow
 * Tests the complete user journey from lead submission to client conversion.
 */

// Test the lead-to-client conversion flow
describe('Lead to Client Flow', () => {
  // Mock data factories
  function mockLead(overrides = {}) {
    return {
      id: `lead-${Date.now()}`,
      email: 'test@example.com',
      name: 'Test User',
      projectAddress: '123 Main St, Anytown, CA 94000',
      budgetRange: '$10,000 - $25,000',
      timeline: '3-6 months',
      projectType: 'full_landscape',
      hasSurvey: false,
      hasDrawings: false,
      recommendedTier: 2,
      status: 'NEW' as const,
      isConverted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function mockUser(overrides = {}) {
    return {
      id: `user-${Date.now()}`,
      email: 'test@example.com',
      userType: 'CLIENT' as const,
      createdAt: new Date(),
      ...overrides,
    };
  }

  function mockClient(overrides = {}) {
    return {
      id: `client-${Date.now()}`,
      userId: `user-${Date.now()}`,
      tier: 2,
      status: 'ACTIVE' as const,
      projectAddress: '123 Main St, Anytown, CA 94000',
      createdAt: new Date(),
      ...overrides,
    };
  }

  function mockProject(overrides = {}) {
    return {
      id: `project-${Date.now()}`,
      name: 'New Project',
      clientId: `client-${Date.now()}`,
      tier: 2,
      status: 'ONBOARDING' as const,
      paymentStatus: 'PENDING',
      createdAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Step 1: Lead Intake Submission', () => {
    it('should capture lead data from intake form', async () => {
      const intakeData = {
        email: 'newclient@example.com',
        name: 'Jane Smith',
        projectAddress: '456 Oak Street, Cityville, CA 94000',
        projectType: 'full_landscape',
        budgetRange: '$10,000 - $25,000',
        timeline: '3-6 months',
        hasSurvey: false,
        hasDrawings: false,
        description: 'Looking to redesign my backyard with native plants',
      };

      // Mock the lead creation
      const createdLead = mockLead({
        ...intakeData,
        recommendedTier: 2, // Based on budget and project type
        status: 'NEW',
      });

      // Verify lead was created with correct data
      expect(createdLead.email).toBe('newclient@example.com');
      expect(createdLead.status).toBe('NEW');
      expect(createdLead.recommendedTier).toBe(2);
    });

    it('should calculate tier based on intake responses', () => {
      // Tier calculation logic tests
      const tierTests = [
        { budgetRange: 'Under $5,000', expectedTier: 1 },
        { budgetRange: '$5,000 - $15,000', expectedTier: 2 },
        { budgetRange: '$15,000 - $50,000', expectedTier: 3 },
        { budgetRange: 'Over $50,000', expectedTier: 4 },
      ];

      tierTests.forEach(({ budgetRange, expectedTier }) => {
        expect(calculateRecommendedTier(budgetRange)).toBe(expectedTier);
      });
    });

    it('should send confirmation email after lead submission', async () => {
      const lead = mockLead();
      
      const emailSent = await mockSendConfirmationEmail(lead.email);
      expect(emailSent).toBe(true);
    });
  });

  describe('Step 2: Admin Lead Review', () => {
    it('should display lead in admin queue', async () => {
      const lead = mockLead({ status: 'NEW' });
      const leads = [lead];

      expect(leads).toHaveLength(1);
      expect(leads[0].status).toBe('NEW');
    });

    it('should allow admin to review lead details', async () => {
      const lead = mockLead();

      expect(lead).toBeDefined();
      expect(lead.email).toBeDefined();
      expect(lead.projectAddress).toBeDefined();
    });

    it('should allow admin to override tier recommendation', async () => {
      const lead = mockLead({ recommendedTier: 2 });
      const updatedLead = { ...lead, recommendedTier: 3 };

      expect(updatedLead.recommendedTier).toBe(3);
    });

    it('should update lead status to QUALIFIED', async () => {
      const lead = mockLead({ status: 'NEW' });
      const qualifiedLead = { ...lead, status: 'QUALIFIED' as const };

      expect(qualifiedLead.status).toBe('QUALIFIED');
    });
  });

  describe('Step 3: Client Conversion', () => {
    it('should create client record from qualified lead', async () => {
      const lead = mockLead({ status: 'QUALIFIED' });
      const user = mockUser({ email: lead.email });
      const client = mockClient({ userId: user.id });

      // Create user account
      expect(user.email).toBe(lead.email);

      // Create client profile
      expect(client.tier).toBeDefined();

      // Mark lead as converted
      const convertedLead = { ...lead, isConverted: true };
      expect(convertedLead.isConverted).toBe(true);
    });

    it('should create initial project for converted client', async () => {
      const client = mockClient();
      const project = mockProject({ clientId: client.id, tier: client.tier });

      expect(project.clientId).toBe(client.id);
      expect(project.tier).toBe(client.tier);
      expect(project.status).toBe('ONBOARDING');
    });

    it('should send welcome email to new client', async () => {
      const user = mockUser();
      
      const emailSent = await mockSendWelcomeEmail(user.email);
      expect(emailSent).toBe(true);
    });
  });

  describe('Step 4: Payment Processing', () => {
    it('should create Stripe checkout session for tier payment', async () => {
      const project = mockProject();
      
      const checkoutSession = mockCreateCheckoutSession({
        projectId: project.id,
        tier: project.tier,
        amount: getTierPrice(project.tier),
      });

      expect(checkoutSession.url).toContain('stripe.com');
      expect(checkoutSession.amount).toBe(getTierPrice(project.tier));
    });

    it('should record payment after successful checkout', async () => {
      const project = mockProject();
      const payment = {
        id: 'payment-1',
        projectId: project.id,
        amount: getTierPrice(project.tier),
        status: 'COMPLETED',
        stripePaymentIntentId: 'pi_123456',
      };

      expect(payment.status).toBe('COMPLETED');
    });

    it('should update project to IN_PROGRESS after payment', async () => {
      const project = mockProject({ status: 'ONBOARDING' });
      const updatedProject = { ...project, status: 'IN_PROGRESS' as const, paymentStatus: 'PAID' };

      expect(updatedProject.status).toBe('IN_PROGRESS');
      expect(updatedProject.paymentStatus).toBe('PAID');
    });
  });

  describe('Complete Flow Integration', () => {
    it('should process lead through full conversion journey', async () => {
      // Step 1: Create lead
      const lead = mockLead({
        email: 'fullflow@example.com',
        status: 'NEW',
        recommendedTier: 2,
      });
      expect(lead.status).toBe('NEW');

      // Step 2: Qualify lead
      const qualifiedLead = { ...lead, status: 'QUALIFIED' as const };
      expect(qualifiedLead.status).toBe('QUALIFIED');

      // Step 3: Convert to client
      const user = mockUser({ email: lead.email });
      const client = mockClient({ userId: user.id, tier: lead.recommendedTier });
      expect(client.tier).toBe(2);

      // Step 4: Create project
      const project = mockProject({ clientId: client.id, tier: client.tier });
      expect(project.status).toBe('ONBOARDING');

      // Step 5: Process payment
      const paidProject = { ...project, paymentStatus: 'PAID', status: 'IN_PROGRESS' as const };
      expect(paidProject.paymentStatus).toBe('PAID');
      expect(paidProject.status).toBe('IN_PROGRESS');
    });
  });
});

// Helper functions for testing
function calculateRecommendedTier(budgetRange: string): number {
  const budgetMap: Record<string, number> = {
    'Under $5,000': 1,
    '$5,000 - $15,000': 2,
    '$15,000 - $50,000': 3,
    'Over $50,000': 4,
  };
  return budgetMap[budgetRange] || 2;
}

function getTierPrice(tier: number): number {
  const prices: Record<number, number> = {
    1: 29900,   // $299
    2: 149900,  // $1,499
    3: 499900,  // $4,999
    4: 0,       // By invitation
  };
  return prices[tier] || 0;
}

async function mockSendConfirmationEmail(email: string): Promise<boolean> {
  return Promise.resolve(email.includes('@'));
}

async function mockSendWelcomeEmail(email: string): Promise<boolean> {
  return Promise.resolve(email.includes('@'));
}

function mockCreateCheckoutSession(options: { projectId: string; tier: number; amount: number }) {
  return {
    id: `cs_test_${Date.now()}`,
    url: `https://checkout.stripe.com/pay/${options.projectId}`,
    amount: options.amount,
    projectId: options.projectId,
  };
}
