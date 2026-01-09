/**
 * Validators
 * Zod schemas for API request validation.
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  tier: z.number().int().min(1).max(4).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const addressLoginSchema = z.object({
  address: z.string().min(5, 'Address is required'),
  accessCode: z.string().min(4, 'Access code is required'),
});

// ============================================================================
// LEAD SCHEMAS
// ============================================================================

export const createLeadSchema = z.object({
  email: emailSchema,
  name: z.string().max(100).optional(),
  projectAddress: z.string().min(5, 'Project address is required'),
  budgetRange: z.enum([
    'under_10k',
    '10k_25k',
    '25k_50k',
    '50k_100k',
    'over_100k',
  ]).optional(),
  timeline: z.enum([
    'immediately',
    '1_3_months',
    '3_6_months',
    '6_12_months',
    'over_1_year',
  ]).optional(),
  projectType: z.enum([
    'full_landscape',
    'front_yard',
    'back_yard',
    'outdoor_living',
    'pool_area',
    'garden',
    'other',
  ]).optional(),
  hasSurvey: z.boolean().default(false),
  hasDrawings: z.boolean().default(false),
});

export const updateLeadSchema = z.object({
  status: z.enum(['NEW', 'QUALIFIED', 'NEEDS_REVIEW', 'CLOSED']).optional(),
  recommendedTier: z.number().int().min(1).max(4).optional(),
  routingReason: z.string().max(500).optional(),
});

export const leadFiltersSchema = paginationSchema.merge(sortSchema).extend({
  status: z.enum(['NEW', 'QUALIFIED', 'NEEDS_REVIEW', 'CLOSED']).optional(),
  tier: z.coerce.number().int().min(1).max(4).optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  clientId: uuidSchema,
  leadId: uuidSchema.optional(),
  name: z.string().min(1).max(200),
  tier: z.number().int().min(1).max(4),
});

export const updateProjectSchema = z.object({
  status: z.enum([
    'ONBOARDING',
    'IN_PROGRESS',
    'AWAITING_FEEDBACK',
    'REVISIONS',
    'DELIVERED',
    'CLOSED',
  ]).optional(),
  name: z.string().min(1).max(200).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'refunded']).optional(),
});

export const projectFiltersSchema = paginationSchema.merge(sortSchema).extend({
  status: z.enum([
    'ONBOARDING',
    'IN_PROGRESS',
    'AWAITING_FEEDBACK',
    'REVISIONS',
    'DELIVERED',
    'CLOSED',
  ]).optional(),
  tier: z.coerce.number().int().min(1).max(4).optional(),
  paymentStatus: z.string().optional(),
  search: z.string().optional(),
});

// ============================================================================
// MILESTONE SCHEMAS
// ============================================================================

export const updateMilestoneSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});

// ============================================================================
// DELIVERABLE SCHEMAS
// ============================================================================

export const createDeliverableSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1).max(200),
  category: z.enum([
    'Document',
    'Photo',
    'Rendering',
    'FloorPlan',
    'Invoice',
    'Contract',
    'Other',
  ]),
  description: z.string().max(1000).optional(),
  filePath: z.string(),
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive(),
  fileType: z.string(),
});

export const deliverableFiltersSchema = paginationSchema.extend({
  category: z.string().optional(),
});

// ============================================================================
// CLIENT SCHEMAS
// ============================================================================

export const updateClientSchema = z.object({
  status: z.enum(['ONBOARDING', 'ACTIVE', 'COMPLETED', 'CLOSED']).optional(),
  tier: z.number().int().min(1).max(4).optional(),
});

export const clientFiltersSchema = paginationSchema.merge(sortSchema).extend({
  status: z.enum(['ONBOARDING', 'ACTIVE', 'COMPLETED', 'CLOSED']).optional(),
  tier: z.coerce.number().int().min(1).max(4).optional(),
  search: z.string().optional(),
});

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const createCheckoutSchema = z.object({
  leadId: uuidSchema,
  tier: z.number().int().min(1).max(3), // Tier 4 is by invitation only
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// ============================================================================
// UPLOAD SCHEMAS
// ============================================================================

export const uploadSchema = z.object({
  projectId: uuidSchema,
  category: z.enum([
    'Document',
    'Photo',
    'Rendering',
    'FloorPlan',
    'Invoice',
    'Contract',
    'Other',
  ]).optional().default('Document'),
  description: z.string().max(1000).optional(),
});

// ============================================================================
// TIER OVERRIDE SCHEMA
// ============================================================================

export const tierOverrideSchema = z.object({
  tier: z.number().int().min(1).max(4),
  reason: z.string().min(10, 'Please provide a reason for the tier override').max(500),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressLoginInput = z.infer<typeof addressLoginSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadFiltersInput = z.infer<typeof leadFiltersSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectFiltersInput = z.infer<typeof projectFiltersSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;
export type DeliverableFiltersInput = z.infer<typeof deliverableFiltersSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientFiltersInput = z.infer<typeof clientFiltersSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type UploadInput = z.infer<typeof uploadSchema>;
export type TierOverrideInput = z.infer<typeof tierOverrideSchema>;
