import { z } from 'zod';

/**
 * Budget range options for intake form
 */
export const budgetRangeSchema = z.enum([
  'under_500',
  '500_2000',
  '2000_5000',
  '5000_15000',
  '15000_50000',
  'over_50000',
  'percentage',
  'not_sure',
]);

/**
 * Timeline options for intake form
 */
export const timelineSchema = z.enum([
  'asap',
  '2_4_weeks',
  '1_2_months',
  '2_4_months',
  '4_plus_months',
  'flexible',
]);

/**
 * Project type options for intake form
 */
export const projectTypeSchema = z.enum([
  'simple_consultation',
  'small_renovation',
  'standard_renovation',
  'addition',
  'new_build',
  'commercial',
  'multiple_properties',
  'complex',
]);

/**
 * Lead creation request body schema
 */
export const createLeadSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').optional(),
  projectAddress: z.string().min(5, 'Project address is required'),
  budgetRange: budgetRangeSchema,
  timeline: timelineSchema,
  projectType: projectTypeSchema,
  hasSurvey: z.boolean().default(false),
  hasDrawings: z.boolean().default(false),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

/**
 * Lead status enum
 */
export const leadStatusSchema = z.enum(['NEW', 'QUALIFIED', 'NEEDS_REVIEW', 'CONVERTED', 'CLOSED']);

/**
 * Lead status update schema (admin only)
 * All fields optional for partial updates
 */
export const updateLeadSchema = z.object({
  status: z.enum(['NEW', 'QUALIFIED', 'NEEDS_REVIEW', 'CLOSED']).optional(),
  tierOverride: z.number().int().min(1).max(4).nullable().optional(),
  overrideReason: z.string().nullable().optional(),
}).refine(
  (data) => {
    // If tierOverride is set, overrideReason should be provided
    if (data.tierOverride !== undefined && data.tierOverride !== null && !data.overrideReason) {
      return false;
    }
    return true;
  },
  { message: 'Override reason is required when setting tier override' }
);

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

/**
 * Convert lead to client schema
 * Used after successful payment
 */
export const convertLeadSchema = z.object({
  stripePaymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  stripeCustomerId: z.string().min(1, 'Customer ID is required'),
  amount: z.number().int().positive('Amount must be positive'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  projectName: z.string().min(1, 'Project name is required').optional(),
});

export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;

/**
 * Pagination query params schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Lead list filters schema
 */
export const leadFiltersSchema = paginationSchema.extend({
  status: leadStatusSchema.optional(),
  tier: z.coerce.number().int().min(1).max(4).optional(),
  email: z.string().optional(),
});

export type LeadFiltersInput = z.infer<typeof leadFiltersSchema>;

/**
 * Checkout session creation schema
 */
export const createCheckoutSessionSchema = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
  tier: z.number().int().min(1).max(3, 'Only tiers 1-3 are available for online checkout'),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
