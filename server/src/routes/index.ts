/**
 * Routes Index
 * Central export point for all API route modules.
 */

export { createProjectsRouter, requireAuth, requireAdmin } from './projects';
export { createMilestonesRouter } from './milestones';
export { createDeliverablesRouter } from './deliverables';
export { createAdminRouter } from './admin';
export { createNotionRouter } from './notion';
export { createUploadRouter } from './upload';
export { createLeadsRouter } from './leads';
export { createCheckoutRouter } from './checkout';
export { createWebhooksRouter, captureRawBody } from './webhooks';
export { createAuthRouter } from './auth';
export type { AuthenticatedRequest } from './projects';
