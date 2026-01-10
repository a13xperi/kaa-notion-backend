/**
 * SAGE Platform - Routes Index
 *
 * Centralized route path constants and exports.
 * Use these constants for consistent route references.
 */

// ============================================
// ROUTE PATH CONSTANTS
// ============================================

export const API_PREFIX = '/api';

export const ROUTES = {
  // Health
  TEST: '/test',
  HEALTH: `${API_PREFIX}/health`,
  HEALTH_READY: `${API_PREFIX}/health/ready`,
  HEALTH_LIVE: `${API_PREFIX}/health/live`,

  // Authentication
  AUTH: `${API_PREFIX}/auth`,
  AUTH_LOGIN: `${API_PREFIX}/auth/login`,
  AUTH_REGISTER: `${API_PREFIX}/auth/register`,
  AUTH_VERIFY: `${API_PREFIX}/auth/verify`,

  // Projects
  PROJECTS: `${API_PREFIX}/projects`,
  PROJECT: (id: string) => `${API_PREFIX}/projects/${id}`,
  PROJECT_MILESTONES: (id: string) => `${API_PREFIX}/projects/${id}/milestones`,
  PROJECT_DELIVERABLES: (id: string) => `${API_PREFIX}/projects/${id}/deliverables`,

  // Milestones
  MILESTONES: `${API_PREFIX}/milestones`,
  MILESTONE: (id: string) => `${API_PREFIX}/milestones/${id}`,

  // Deliverables
  DELIVERABLES: `${API_PREFIX}/deliverables`,
  DELIVERABLE: (id: string) => `${API_PREFIX}/deliverables/${id}`,

  // Team
  TEAM: `${API_PREFIX}/team`,
  TEAM_MEMBER: (id: string) => `${API_PREFIX}/team/${id}`,
  TEAM_INVITE: `${API_PREFIX}/team/invite`,

  // Admin
  ADMIN_ANALYTICS: `${API_PREFIX}/admin/analytics`,

  // Leads
  LEADS: `${API_PREFIX}/leads`,
  LEAD: (id: string) => `${API_PREFIX}/leads/${id}`,

  // Portfolio
  PORTFOLIO: `${API_PREFIX}/portfolio`,
  PORTFOLIO_ITEM: (slug: string) => `${API_PREFIX}/portfolio/${slug}`,

  // Payments
  CHECKOUT: `${API_PREFIX}/checkout`,
  CHECKOUT_CREATE: `${API_PREFIX}/checkout/create-session`,
  SUBSCRIPTIONS: `${API_PREFIX}/subscriptions`,

  // Notifications
  PUSH: `${API_PREFIX}/push`,
  PUSH_SUBSCRIBE: `${API_PREFIX}/push/subscribe`,

  // Referrals
  REFERRALS: `${API_PREFIX}/referrals`,

  // Webhooks
  WEBHOOKS: `${API_PREFIX}/webhooks`,
  WEBHOOK_STRIPE: `${API_PREFIX}/webhooks/stripe`,

  // Legacy (Figma)
  FIGMA_FILE: (fileKey: string) => `/file/${fileKey}`,
  FIGMA_NODES: (fileKey: string) => `/file/${fileKey}/nodes`,
  FIGMA_WEBHOOK: '/webhook',
} as const;

// ============================================
// ROUTE EXPORTS
// ============================================

export { default as healthRouter } from './health';
export { default as authRouter } from './auth';
export { default as projectsRouter } from './projects';
export { default as milestonesRouter } from './milestones';
export { default as deliverablesRouter } from './deliverables';
export { default as analyticsRouter } from './analytics';
export { default as teamRouter } from './teamRoutes';
export { default as leadsRouter } from './leads';
export { default as portfolioRouter } from './portfolioRoutes';
export { default as checkoutRouter } from './checkout';
export { default as webhooksRouter } from './webhooks';
export { default as subscriptionRouter } from './subscriptionRoutes';
export { default as pushRouter } from './push';
export { default as referralRouter } from './referralRoutes';
export { default as multiProjectRouter } from './multiProjectRoutes';
