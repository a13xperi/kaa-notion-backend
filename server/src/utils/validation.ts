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
 * Lead status update schema (admin only)
 */
export const updateLeadStatusSchema = z.object({
  status: z.enum(['NEW', 'QUALIFIED', 'NEEDS_REVIEW', 'CLOSED']),
  tierOverride: z.number().int().min(1).max(4).optional(),
  overrideReason: z.string().optional(),
});

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

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
  status: z.enum(['NEW', 'QUALIFIED', 'NEEDS_REVIEW', 'CLOSED']).optional(),
  tier: z.coerce.number().int().min(1).max(4).optional(),
  email: z.string().optional(),
});

export type LeadFiltersInput = z.infer<typeof leadFiltersSchema>;
