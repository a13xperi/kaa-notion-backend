/**
 * Routes Index
 * Central export point for all API route modules.
 */

export { createProjectsRouter, requireAuth, requireAdmin } from './projects';
export { createMilestonesRouter } from './milestones';
export type { AuthenticatedRequest } from './projects';
