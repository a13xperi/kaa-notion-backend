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
export type { AuthenticatedRequest } from './projects';
