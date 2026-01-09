/**
 * Routes Index
 * Central export point for all API route modules.
 */

export { createProjectsRouter, requireAuth, requireAdmin } from './projects';
export type { AuthenticatedRequest } from './projects';
