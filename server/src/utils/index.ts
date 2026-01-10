/**
 * Utils Index
 * Central export point for all utility functions and classes.
 */

// Error handling
export {
  AppError,
  ErrorCodes,
  // Factory functions
  unauthorized,
  invalidToken,
  tokenExpired,
  forbidden,
  insufficientTier,
  adminRequired,
  validationError,
  notFound,
  conflict,
  internalError,
  serviceUnavailable,
  rateLimited,
  type ErrorCode,
  type AppErrorOptions,
} from './AppError';

// Validators (Zod schemas)
export {
  // Common
  uuidSchema,
  emailSchema,
  paginationSchema,
  sortSchema,
  // Auth
  registerSchema,
  loginSchema,
  addressLoginSchema,
  // Lead
  createLeadSchema,
  updateLeadSchema,
  leadFiltersSchema,
  // Project
  createProjectSchema,
  updateProjectSchema,
  projectFiltersSchema,
  // Milestone
  updateMilestoneSchema,
  // Deliverable
  createDeliverableSchema,
  deliverableFiltersSchema,
  // Client
  updateClientSchema,
  clientFiltersSchema,
  // Payment
  createCheckoutSchema,
  // Upload
  uploadSchema,
  // Tier
  tierOverrideSchema,
  // Types
  type RegisterInput,
  type LoginInput,
  type AddressLoginInput,
  type CreateLeadInput,
  type UpdateLeadInput,
  type LeadFiltersInput,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ProjectFiltersInput,
  type UpdateMilestoneInput,
  type CreateDeliverableInput,
  type DeliverableFiltersInput,
  type UpdateClientInput,
  type ClientFiltersInput,
  type CreateCheckoutInput,
  type UploadInput,
  type TierOverrideInput,
} from './validators';

// Notion helpers
export { getPageTitle, mapNotionStatusToPostgres } from './notionHelpers';
