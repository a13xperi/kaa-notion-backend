/**
 * Routes Index
 * Central export point for all API route modules.
 */

export { createProjectsRouter } from './projects';
export { createMilestonesRouter } from './milestones';
export { createDeliverablesRouter } from './deliverables';
export { createAdminRouter } from './admin';
export { createNotionRouter } from './notion';
export { createUploadRouter } from './upload';
export { createLeadsRouter } from './leads';
export { createCheckoutRouter } from './checkout';
export { createWebhooksRouter } from './webhooks';
export { createAuthRouter } from './auth';
export { createTeamRouter } from './team';

// Re-export type from middleware (canonical location)
export type { AuthenticatedRequest } from '../middleware/auth';
