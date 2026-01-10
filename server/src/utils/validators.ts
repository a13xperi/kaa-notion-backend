import { z } from 'zod';

/**
 * Zod Validation Schemas
 *
 * Request body schemas for all API endpoints.
 * Used with validate middleware for type-safe request handling.
 */

// ============================================
// COMMON SCHEMAS
// ============================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email address').max(255);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// LEAD SCHEMAS
// ============================================

export const budgetRangeSchema = z.enum([
  'under_5k',
  '5k_15k',
  '15k_50k',
  '50k_plus',
  'not_sure',
]);

export const timelineSchema = z.enum([
  'asap',
  '1_3_months',
  '3_6_months',
  '6_12_months',
  'planning',
]);

export const projectTypeSchema = z.enum([
  'new_landscape',
  'renovation',
  'maintenance_plan',
  'hardscape',
  'planting',
  'irrigation',
  'lighting',
  'other',
]);

export const leadStatusSchema = z.enum([
  'NEW',
  'QUALIFIED',
  'NEEDS_REVIEW',
  'CONVERTED',
  'CLOSED',
]);

export const createLeadSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Name is required').max(255).optional(),
  projectAddress: z.string().min(5, 'Address is required').max(500),
  budgetRange: budgetRangeSchema.optional(),
  timeline: timelineSchema.optional(),
  projectType: projectTypeSchema.optional(),
  hasSurvey: z.boolean().default(false),
  hasDrawings: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  propertySize: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

export const updateLeadSchema = z.object({
  status: leadStatusSchema.optional(),
  recommendedTier: z.number().int().min(1).max(4).optional(),
  tierOverrideReason: z.string().min(10).max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const leadQuerySchema = paginationSchema.extend({
  status: leadStatusSchema.optional(),
  tier: z.coerce.number().int().min(1).max(4).optional(),
  email: z.string().optional(),
  search: z.string().optional(),
});

// ============================================
// AUTH SCHEMAS
// ============================================

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  name: z.string().min(1).max(255).optional(),
  address: z.string().max(500).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const addressLoginSchema = z.object({
  address: z.string().min(5, 'Address is required').max(500),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
});

// ============================================
// PROJECT SCHEMAS
// ============================================

export const projectStatusSchema = z.enum([
  'INTAKE',
  'ONBOARDING',
  'IN_PROGRESS',
  'AWAITING_FEEDBACK',
  'REVISIONS',
  'DELIVERED',
  'CLOSED',
]);

export const createProjectSchema = z.object({
  clientId: uuidSchema,
  leadId: uuidSchema.optional(),
  tier: z.number().int().min(1).max(4),
  name: z.string().min(1).max(255),
  projectAddress: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  status: projectStatusSchema.optional(),
  name: z.string().min(1).max(255).optional(),
  projectAddress: z.string().max(500).optional(),
});

export const projectQuerySchema = paginationSchema.extend({
  status: projectStatusSchema.optional(),
  tier: z.coerce.number().int().min(1).max(4).optional(),
  clientId: uuidSchema.optional(),
  search: z.string().optional(),
});

// ============================================
// MILESTONE SCHEMAS
// ============================================

export const milestoneStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
]);

export const createMilestoneSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1).max(255),
  order: z.number().int().min(0),
  dueDate: z.coerce.date().optional(),
});

export const updateMilestoneSchema = z.object({
  status: milestoneStatusSchema.optional(),
  name: z.string().min(1).max(255).optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

// ============================================
// DELIVERABLE SCHEMAS
// ============================================

export const deliverableCategorySchema = z.enum([
  'Document',
  'Photo',
  'Drawing',
  'Plan',
  'Invoice',
  'Contract',
  'Report',
  'Presentation',
  'Video',
  'Audio',
  'Archive',
  'Other',
]);

export const createDeliverableSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1).max(255),
  filePath: z.string().min(1).max(1000),
  fileUrl: z.string().url().max(2000),
  fileSize: z.number().int().min(0),
  fileType: z.string().min(1).max(100),
  category: deliverableCategorySchema,
  description: z.string().max(1000).optional(),
});

export const updateDeliverableSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: deliverableCategorySchema.optional(),
  description: z.string().max(1000).optional().nullable(),
});

// ============================================
// PAYMENT SCHEMAS
// ============================================

export const paymentStatusSchema = z.enum([
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
]);

export const createCheckoutSessionSchema = z.object({
  leadId: uuidSchema,
  tier: z.number().int().min(1).max(3), // Only tiers 1-3 have checkout
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

// ============================================
// CLIENT SCHEMAS
// ============================================

export const clientStatusSchema = z.enum([
  'ONBOARDING',
  'ACTIVE',
  'COMPLETED',
  'CLOSED',
]);

export const updateClientSchema = z.object({
  status: clientStatusSchema.optional(),
  tier: z.number().int().min(1).max(4).optional(),
  projectAddress: z.string().max(500).optional(),
});

export const clientQuerySchema = paginationSchema.extend({
  status: clientStatusSchema.optional(),
  tier: z.coerce.number().int().min(1).max(4).optional(),
  search: z.string().optional(),
});

// ============================================
// ADMIN SCHEMAS
// ============================================

export const tierOverrideSchema = z.object({
  leadId: uuidSchema,
  newTier: z.number().int().min(1).max(4),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

export const convertLeadSchema = z.object({
  leadId: uuidSchema,
  tier: z.number().int().min(1).max(4),
  stripePaymentIntentId: z.string().optional(),
  amount: z.number().int().min(0).optional(),
});

export const adminDashboardQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ============================================
// UPLOAD SCHEMAS
// ============================================

export const uploadQuerySchema = z.object({
  projectId: uuidSchema.optional(),
  category: deliverableCategorySchema.optional(),
  folder: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
});

// ============================================
// WEBHOOK SCHEMAS
// ============================================

export const stripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadQueryInput = z.infer<typeof leadQuerySchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>;

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;

export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientQueryInput = z.infer<typeof clientQuerySchema>;

export type TierOverrideInput = z.infer<typeof tierOverrideSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Safely parse data with a schema, returning result object
 */
export function safeParse<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Format Zod errors into a readable object
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

/**
 * Get first error message from Zod error
 */
export function getFirstError(error: z.ZodError): string {
  return error.issues[0]?.message || 'Validation failed';
}

export default {
  // Lead
  createLeadSchema,
  updateLeadSchema,
  leadQuerySchema,
  // Auth
  registerSchema,
  loginSchema,
  addressLoginSchema,
  resetPasswordSchema,
  changePasswordSchema,
  // Project
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  // Milestone
  createMilestoneSchema,
  updateMilestoneSchema,
  // Deliverable
  createDeliverableSchema,
  updateDeliverableSchema,
  // Payment
  createCheckoutSessionSchema,
  // Client
  updateClientSchema,
  clientQuerySchema,
  // Admin
  tierOverrideSchema,
  convertLeadSchema,
  adminDashboardQuerySchema,
  // Upload
  uploadQuerySchema,
  // Helpers
  safeParse,
  formatZodErrors,
  getFirstError,
};
