/**
 * Validators Tests
 * Tests for Zod validation schemas.
 */

import {
  createLeadSchema,
  updateLeadSchema,
  createProjectSchema,
  updateProjectSchema,
  updateMilestoneSchema,
  registerSchema,
  loginSchema,
  tierOverrideSchema,
  uploadSchema,
} from '../utils/validators';

describe('Validators', () => {
  describe('createLeadSchema', () => {
    it('should validate a valid lead', () => {
      const validLead = {
        email: 'test@example.com',
        name: 'John Doe',
        projectAddress: '123 Main St, City, ST 12345',
        budgetRange: '25k_50k',
        timeline: '3_6_months',
        projectType: 'full_landscape',
        hasSurvey: true,
        hasDrawings: false,
      };

      const result = createLeadSchema.safeParse(validLead);
      expect(result.success).toBe(true);
    });

    it('should require email', () => {
      const invalidLead = {
        projectAddress: '123 Main St',
      };

      const result = createLeadSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
    });

    it('should validate email format', () => {
      const invalidLead = {
        email: 'not-an-email',
        projectAddress: '123 Main St, City, ST 12345',
      };

      const result = createLeadSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
    });

    it('should require project address', () => {
      const invalidLead = {
        email: 'test@example.com',
      };

      const result = createLeadSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
    });

    it('should validate budget range enum', () => {
      const invalidLead = {
        email: 'test@example.com',
        projectAddress: '123 Main St, City, ST 12345',
        budgetRange: 'invalid_budget',
      };

      const result = createLeadSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
    });

    it('should allow optional fields', () => {
      const minimalLead = {
        email: 'test@example.com',
        projectAddress: '123 Main St, City, ST 12345',
      };

      const result = createLeadSchema.safeParse(minimalLead);
      expect(result.success).toBe(true);
    });
  });

  describe('updateLeadSchema', () => {
    it('should validate status update', () => {
      const update = { status: 'QUALIFIED' };
      const result = updateLeadSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate tier override', () => {
      const update = { recommendedTier: 3 };
      const result = updateLeadSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const update = { status: 'INVALID_STATUS' };
      const result = updateLeadSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should reject invalid tier', () => {
      const update = { recommendedTier: 5 };
      const result = updateLeadSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe('createProjectSchema', () => {
    it('should validate a valid project', () => {
      const validProject = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'New Garden Project',
        tier: 2,
      };

      const result = createProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it('should require valid UUID for clientId', () => {
      const invalidProject = {
        clientId: 'not-a-uuid',
        name: 'Project',
        tier: 2,
      };

      const result = createProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('should validate tier range', () => {
      const invalidProject = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Project',
        tier: 5,
      };

      const result = createProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });
  });

  describe('updateProjectSchema', () => {
    it('should validate status update', () => {
      const update = { status: 'IN_PROGRESS' };
      const result = updateProjectSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate payment status update', () => {
      const update = { paymentStatus: 'paid' };
      const result = updateProjectSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const update = { status: 'INVALID' };
      const result = updateProjectSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe('updateMilestoneSchema', () => {
    it('should validate status update', () => {
      const update = { status: 'COMPLETED' };
      const result = updateMilestoneSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate due date update', () => {
      const update = { dueDate: '2024-12-31T00:00:00.000Z' };
      const result = updateMilestoneSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should allow null due date', () => {
      const update = { dueDate: null };
      const result = updateMilestoneSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });

  describe('registerSchema', () => {
    it('should validate a valid registration', () => {
      const validReg = {
        email: 'new@example.com',
        password: 'Password123',
      };

      const result = registerSchema.safeParse(validReg);
      expect(result.success).toBe(true);
    });

    it('should require password complexity', () => {
      const weakPassword = {
        email: 'new@example.com',
        password: 'password', // No uppercase or number
      };

      const result = registerSchema.safeParse(weakPassword);
      expect(result.success).toBe(false);
    });

    it('should require minimum password length', () => {
      const shortPassword = {
        email: 'new@example.com',
        password: 'Pass1', // Too short
      };

      const result = registerSchema.safeParse(shortPassword);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate login credentials', () => {
      const login = {
        email: 'user@example.com',
        password: 'anypassword',
      };

      const result = loginSchema.safeParse(login);
      expect(result.success).toBe(true);
    });

    it('should require password', () => {
      const login = { email: 'user@example.com' };
      const result = loginSchema.safeParse(login);
      expect(result.success).toBe(false);
    });
  });

  describe('tierOverrideSchema', () => {
    it('should validate tier override', () => {
      const override = {
        tier: 3,
        reason: 'Client requested upgrade based on expanded project scope',
      };

      const result = tierOverrideSchema.safeParse(override);
      expect(result.success).toBe(true);
    });

    it('should require minimum reason length', () => {
      const override = {
        tier: 3,
        reason: 'Short', // Less than 10 chars
      };

      const result = tierOverrideSchema.safeParse(override);
      expect(result.success).toBe(false);
    });

    it('should validate tier range', () => {
      const override = {
        tier: 5,
        reason: 'This is a valid reason',
      };

      const result = tierOverrideSchema.safeParse(override);
      expect(result.success).toBe(false);
    });
  });

  describe('uploadSchema', () => {
    it('should validate upload metadata', () => {
      const upload = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        category: 'Document',
        description: 'Project proposal',
      };

      const result = uploadSchema.safeParse(upload);
      expect(result.success).toBe(true);
    });

    it('should default category to Document', () => {
      const upload = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = uploadSchema.safeParse(upload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe('Document');
      }
    });

    it('should validate category enum', () => {
      const upload = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        category: 'InvalidCategory',
      };

      const result = uploadSchema.safeParse(upload);
      expect(result.success).toBe(false);
    });
  });
});
