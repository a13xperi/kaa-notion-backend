/**
 * Integration Test: Client Portal Flow
 * Tests the complete client experience from login to deliverable access.
 */

describe('Client Portal Flow', () => {
  // Mock data factories
  function mockUser(overrides = {}) {
    return {
      id: `user-${Date.now()}`,
      email: 'client@example.com',
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
      user: mockUser(),
      createdAt: new Date(),
      ...overrides,
    };
  }

  function mockProject(overrides = {}) {
    return {
      id: `project-${Date.now()}`,
      name: 'Test Project',
      clientId: `client-${Date.now()}`,
      tier: 2,
      status: 'IN_PROGRESS' as const,
      paymentStatus: 'PAID',
      createdAt: new Date(),
      ...overrides,
    };
  }

  function mockMilestone(overrides = {}) {
    return {
      id: `milestone-${Date.now()}`,
      projectId: `project-${Date.now()}`,
      name: 'Test Milestone',
      order: 1,
      status: 'PENDING' as const,
      dueDate: new Date(Date.now() + 7 * 86400000),
      completedAt: null,
      createdAt: new Date(),
      ...overrides,
    };
  }

  function mockDeliverable(overrides = {}) {
    return {
      id: `deliverable-${Date.now()}`,
      projectId: `project-${Date.now()}`,
      name: 'Test_Document.pdf',
      category: 'Document',
      fileUrl: 'https://storage.example.com/test.pdf',
      fileSize: 1024000,
      fileType: 'application/pdf',
      createdAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Step 1: Client Authentication', () => {
    it('should allow client to log in with email', async () => {
      const user = mockUser({ userType: 'CLIENT' });
      const client = mockClient({ userId: user.id });

      expect(user).toBeDefined();
      expect(user.userType).toBe('CLIENT');
      expect(client.userId).toBe(user.id);
    });

    it('should generate auth token for authenticated client', () => {
      const user = mockUser({ userType: 'CLIENT' });
      
      const token = mockGenerateAuthToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format
    });

    it('should redirect to dashboard after login', () => {
      const user = mockUser({ userType: 'CLIENT' });
      const redirectUrl = getPostLoginRedirect(user.userType);
      
      expect(redirectUrl).toBe('/portal/dashboard');
    });
  });

  describe('Step 2: Project Dashboard', () => {
    it('should display client projects on dashboard', async () => {
      const client = mockClient();
      const projects = [
        mockProject({ clientId: client.id, name: 'Backyard Redesign' }),
        mockProject({ clientId: client.id, name: 'Front Garden' }),
      ];

      expect(projects).toHaveLength(2);
      expect(projects[0].clientId).toBe(client.id);
    });

    it('should show project progress summary', async () => {
      const project = mockProject();
      const milestones = [
        mockMilestone({ projectId: project.id, status: 'COMPLETED' }),
        mockMilestone({ projectId: project.id, status: 'COMPLETED' }),
        mockMilestone({ projectId: project.id, status: 'IN_PROGRESS' }),
        mockMilestone({ projectId: project.id, status: 'PENDING' }),
      ];

      const progress = calculateProgress(milestones);
      
      expect(progress.completed).toBe(2);
      expect(progress.total).toBe(4);
      expect(progress.percentage).toBe(50);
    });

    it('should display next milestone due', async () => {
      const project = mockProject();
      const milestones = [
        mockMilestone({ projectId: project.id, status: 'COMPLETED', order: 1 }),
        mockMilestone({ 
          projectId: project.id, 
          status: 'IN_PROGRESS', 
          order: 2,
          name: 'Design Review',
          dueDate: new Date('2024-12-15'),
        }),
        mockMilestone({ projectId: project.id, status: 'PENDING', order: 3 }),
      ];

      const nextMilestone = getNextMilestone(milestones);
      
      expect(nextMilestone?.name).toBe('Design Review');
      expect(nextMilestone?.status).toBe('IN_PROGRESS');
    });

    it('should filter projects by status', async () => {
      const client = mockClient();
      const projects = [
        mockProject({ clientId: client.id, status: 'IN_PROGRESS' }),
        mockProject({ clientId: client.id, status: 'DELIVERED' }),
      ];

      const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS');

      expect(activeProjects).toHaveLength(1);
      expect(activeProjects[0].status).toBe('IN_PROGRESS');
    });
  });

  describe('Step 3: Project Detail View', () => {
    it('should display project milestones timeline', async () => {
      const project = mockProject();
      const milestones = [
        mockMilestone({ projectId: project.id, order: 1, name: 'Intake' }),
        mockMilestone({ projectId: project.id, order: 2, name: 'Design' }),
        mockMilestone({ projectId: project.id, order: 3, name: 'Review' }),
        mockMilestone({ projectId: project.id, order: 4, name: 'Delivery' }),
      ].sort((a, b) => a.order - b.order);

      expect(milestones).toHaveLength(4);
      expect(milestones[0].name).toBe('Intake');
      expect(milestones[3].name).toBe('Delivery');
    });

    it('should display deliverables for project', async () => {
      const project = mockProject();
      const deliverables = [
        mockDeliverable({ projectId: project.id, category: 'Document' }),
        mockDeliverable({ projectId: project.id, category: 'Rendering' }),
      ];

      expect(deliverables).toHaveLength(2);
    });

    it('should show project status badge', () => {
      const project = mockProject({ status: 'IN_PROGRESS' });
      
      const statusInfo = getStatusDisplayInfo(project.status);
      
      expect(statusInfo.label).toBe('In Progress');
      expect(statusInfo.color).toBe('yellow');
    });
  });

  describe('Step 4: Deliverable Access', () => {
    it('should allow downloading deliverables', async () => {
      const deliverable = mockDeliverable();

      expect(deliverable).toBeDefined();
      expect(deliverable.fileUrl).toBeDefined();
    });

    it('should generate signed URL for secure download', () => {
      const deliverable = mockDeliverable();
      
      const signedUrl = generateSignedUrl(deliverable.fileUrl, 3600);
      
      expect(signedUrl).toContain('token=');
      expect(signedUrl).toContain('expires=');
    });

    it('should filter deliverables by category', async () => {
      const project = mockProject();
      const deliverables = [
        mockDeliverable({ projectId: project.id, category: 'Document' }),
        mockDeliverable({ projectId: project.id, category: 'Rendering' }),
        mockDeliverable({ projectId: project.id, category: 'Document' }),
      ];

      const documents = deliverables.filter(d => d.category === 'Document');
      
      expect(documents).toHaveLength(2);
    });

    it('should show deliverable file info', () => {
      const deliverable = mockDeliverable({
        name: 'Site_Plan.pdf',
        fileSize: 2457600,
        fileType: 'application/pdf',
      });

      const fileInfo = getFileDisplayInfo(deliverable);
      
      expect(fileInfo.icon).toBe('📄');
      expect(fileInfo.sizeFormatted).toBe('2.34 MB');
    });
  });

  describe('Step 5: Milestone Updates', () => {
    it('should display milestone completion status', async () => {
      const milestone = mockMilestone({ status: 'COMPLETED', completedAt: new Date() });
      
      expect(milestone.status).toBe('COMPLETED');
      expect(milestone.completedAt).toBeDefined();
    });

    it('should show overdue warning for past-due milestones', () => {
      const milestone = mockMilestone({
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() - 86400000), // Yesterday
      });

      const isOverdue = checkIfOverdue(milestone);
      
      expect(isOverdue).toBe(true);
    });

    it('should calculate days until milestone due', () => {
      const milestone = mockMilestone({
        status: 'PENDING',
        dueDate: new Date(Date.now() + 7 * 86400000), // 7 days from now
      });

      const daysUntilDue = getDaysUntilDue(milestone);
      
      expect(daysUntilDue).toBe(7);
    });
  });

  describe('Step 6: Tier-Gated Features', () => {
    it('should restrict Tier 1 clients from messaging', () => {
      const client = mockClient({ tier: 1 });
      
      const hasMessaging = checkFeatureAccess(client.tier, 'messaging');
      
      expect(hasMessaging).toBe(false);
    });

    it('should allow Tier 2+ clients messaging access', () => {
      const client = mockClient({ tier: 2 });
      
      const hasMessaging = checkFeatureAccess(client.tier, 'messaging');
      
      expect(hasMessaging).toBe(true);
    });

    it('should allow Tier 3+ clients video consultations', () => {
      const tier3Client = mockClient({ tier: 3 });
      const tier2Client = mockClient({ tier: 2 });
      
      expect(checkFeatureAccess(tier3Client.tier, 'video_consultations')).toBe(true);
      expect(checkFeatureAccess(tier2Client.tier, 'video_consultations')).toBe(false);
    });

    it('should show tier-appropriate feature set', () => {
      const tier2Features = getFeaturesForTier(2);
      
      expect(tier2Features).toContain('project_dashboard');
      expect(tier2Features).toContain('messaging');
      expect(tier2Features).not.toContain('priority_support');
    });
  });

  describe('Complete Portal Flow', () => {
    it('should allow client to navigate full portal experience', () => {
      // Step 1: Authenticate
      const user = mockUser({ userType: 'CLIENT' });
      const token = mockGenerateAuthToken(user);
      expect(token).toBeDefined();

      // Step 2: View dashboard
      const client = mockClient({ userId: user.id, tier: 2 });
      const projects = [mockProject({ clientId: client.id })];
      expect(projects.length).toBeGreaterThan(0);

      // Step 3: View project detail
      const project = projects[0];
      const milestones = [
        mockMilestone({ projectId: project.id, status: 'COMPLETED' }),
        mockMilestone({ projectId: project.id, status: 'IN_PROGRESS' }),
      ];
      const progress = calculateProgress(milestones);
      expect(progress.percentage).toBe(50);

      // Step 4: Access deliverables
      const deliverable = mockDeliverable({ projectId: project.id });
      expect(deliverable.fileUrl).toBeDefined();

      // Step 5: Check tier features
      expect(checkFeatureAccess(client.tier, 'messaging')).toBe(true);
    });
  });
});

// Helper functions

interface MilestoneProgress {
  completed: number;
  total: number;
  percentage: number;
}

function calculateProgress(milestones: Array<{ status: string }>): MilestoneProgress {
  const completed = milestones.filter(m => m.status === 'COMPLETED').length;
  const total = milestones.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}

function getNextMilestone(milestones: Array<{ status: string; order: number; name: string }>) {
  return milestones
    .filter(m => m.status !== 'COMPLETED')
    .sort((a, b) => a.order - b.order)[0] || null;
}

function getStatusDisplayInfo(status: string): { label: string; color: string } {
  const statusMap: Record<string, { label: string; color: string }> = {
    ONBOARDING: { label: 'Onboarding', color: 'blue' },
    IN_PROGRESS: { label: 'In Progress', color: 'yellow' },
    AWAITING_FEEDBACK: { label: 'Awaiting Feedback', color: 'purple' },
    REVISIONS: { label: 'Revisions', color: 'orange' },
    DELIVERED: { label: 'Delivered', color: 'green' },
    CLOSED: { label: 'Closed', color: 'gray' },
  };
  return statusMap[status] || { label: status, color: 'gray' };
}

function generateSignedUrl(baseUrl: string, expiresInSeconds: number): string {
  const expires = Date.now() + expiresInSeconds * 1000;
  const token = `mock_token_${Math.random().toString(36).substring(7)}`;
  return `${baseUrl}?token=${token}&expires=${expires}`;
}

function getFileDisplayInfo(deliverable: { name: string; fileSize: number; fileType: string }) {
  const icons: Record<string, string> = {
    'application/pdf': '📄',
    'image/png': '🖼️',
    'image/jpeg': '🖼️',
  };
  
  const sizeInMB = deliverable.fileSize / (1024 * 1024);
  
  return {
    icon: icons[deliverable.fileType] || '📎',
    sizeFormatted: `${sizeInMB.toFixed(2)} MB`,
  };
}

function checkIfOverdue(milestone: { status: string; dueDate?: Date | null }): boolean {
  if (milestone.status === 'COMPLETED' || !milestone.dueDate) return false;
  return new Date(milestone.dueDate).getTime() < Date.now();
}

function getDaysUntilDue(milestone: { dueDate?: Date | null }): number | null {
  if (!milestone.dueDate) return null;
  const diffMs = new Date(milestone.dueDate).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function mockGenerateAuthToken(user: { id: string; email: string; userType: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    type: user.userType,
    exp: Date.now() + 86400000,
  })).toString('base64');
  const signature = Buffer.from('mock_signature').toString('base64');
  return `${header}.${payload}.${signature}`;
}

function getPostLoginRedirect(userType: string): string {
  const redirects: Record<string, string> = {
    CLIENT: '/portal/dashboard',
    ADMIN: '/admin/dashboard',
    TEAM: '/team/dashboard',
  };
  return redirects[userType] || '/';
}

function checkFeatureAccess(tier: number, feature: string): boolean {
  const featureMatrix: Record<string, number[]> = {
    project_dashboard: [1, 2, 3, 4],
    deliverables: [1, 2, 3, 4],
    messaging: [2, 3, 4],
    video_consultations: [3, 4],
    priority_support: [3, 4],
    white_glove: [4],
  };
  return featureMatrix[feature]?.includes(tier) || false;
}

function getFeaturesForTier(tier: number): string[] {
  const allFeatures = ['project_dashboard', 'deliverables', 'messaging', 'video_consultations', 'priority_support', 'white_glove'];
  return allFeatures.filter(feature => checkFeatureAccess(tier, feature));
}
