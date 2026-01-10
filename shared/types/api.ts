/**
 * SAGE Platform - Shared API Types
 *
 * These types define the contract between frontend and backend.
 * Import from '@sage/types' or '../shared/types' depending on your setup.
 *
 * Generated from Prisma schema models - keep in sync with prisma/schema.prisma
 */

// ============================================
// ENUMS
// ============================================

export type UserType = 'KAA_CLIENT' | 'SAGE_CLIENT' | 'TEAM' | 'ADMIN';

export type LeadStatus = 'NEW' | 'QUALIFIED' | 'NEEDS_REVIEW' | 'CONVERTED' | 'CLOSED';

export type ProjectStatus =
  | 'INTAKE'
  | 'ONBOARDING'
  | 'IN_PROGRESS'
  | 'AWAITING_FEEDBACK'
  | 'REVISIONS'
  | 'DELIVERED'
  | 'CLOSED';

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export type ClientStatus = 'ONBOARDING' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export type NotificationType =
  | 'PROJECT_UPDATE'
  | 'MILESTONE_COMPLETED'
  | 'DELIVERABLE_READY'
  | 'MESSAGE_RECEIVED'
  | 'PAYMENT_RECEIVED'
  | 'REVISION_REQUESTED'
  | 'SYSTEM';

export type TeamRole = 'OWNER' | 'ADMIN' | 'DESIGNER' | 'VIEWER';

export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED' | 'TRIALING';

export type ReferralStatus = 'PENDING' | 'CLICKED' | 'SIGNED_UP' | 'CONVERTED' | 'REWARDED' | 'EXPIRED';

// ============================================
// CORE ENTITIES
// ============================================

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  address: string | null;
  role: string;
  userType: UserType;
  tier: number | null;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

export interface Client {
  id: string;
  userId: string;
  leadId: string | null;
  tier: number;
  status: ClientStatus;
  projectAddress: string | null;
  stripeCustomerId: string | null;
  maxProjects: number;
  referralCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  email: string;
  name: string | null;
  projectAddress: string;
  budgetRange: string | null;
  timeline: string | null;
  projectType: string | null;
  hasSurvey: boolean;
  hasDrawings: boolean;
  recommendedTier: number;
  routingReason: string | null;
  tierOverride: number | null;
  overrideReason: string | null;
  status: LeadStatus;
  clientId: string | null;
  notionPageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  clientId: string;
  leadId: string | null;
  tier: number;
  status: ProjectStatus;
  name: string;
  projectAddress: string | null;
  notionPageId: string | null;
  paymentStatus: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  tier: number;
  name: string;
  order: number;
  status: MilestoneStatus;
  dueDate: string | null;
  completedAt: string | null;
  notionBlockId: string | null;
  createdAt: string;
}

export interface Deliverable {
  id: string;
  projectId: string;
  name: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  category: string;
  description: string | null;
  notionPageId: string | null;
  uploadedById: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  projectId: string;
  stripePaymentIntentId: string;
  stripeCheckoutSessionId: string | null;
  stripeCustomerId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  tier: number | null;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  resourceType: string | null;
  resourceId: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  projectId: string;
  senderId: string;
  content: string;
  attachments: unknown[] | null;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  role: TeamRole;
  invitedById: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioProject {
  id: string;
  projectId: string | null;
  title: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  location: string | null;
  projectType: string;
  completedAt: string | null;
  featured: boolean;
  published: boolean;
  publishedAt: string | null;
  displayOrder: number;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  createdAt: string;
  updatedAt: string;
  images?: PortfolioImage[];
}

export interface PortfolioImage {
  id: string;
  portfolioId: string;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  caption: string | null;
  displayOrder: number;
  isCover: boolean;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface Subscription {
  id: string;
  clientId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  stripeProductId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referralCode: string;
  referredEmail: string | null;
  referredClientId: string | null;
  status: ReferralStatus;
  rewardAmount: number | null;
  rewardType: string | null;
  clickedAt: string | null;
  signedUpAt: string | null;
  convertedAt: string | null;
  rewardedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// API REQUEST TYPES
// ============================================

// Authentication
export interface LoginRequest {
  email?: string;
  address?: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  client?: Client;
}

// Leads
export interface CreateLeadRequest {
  email: string;
  name?: string;
  projectAddress: string;
  budgetRange?: string;
  timeline?: string;
  projectType?: string;
  hasSurvey?: boolean;
  hasDrawings?: boolean;
}

// Projects
export interface UpdateProjectStatusRequest {
  status: ProjectStatus;
}

export interface ProjectWithProgress extends Project {
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  milestones?: Milestone[];
  deliverables?: Deliverable[];
}

// Milestones
export interface UpdateMilestoneRequest {
  status?: MilestoneStatus;
  dueDate?: string;
}

// Deliverables
export interface CreateDeliverableRequest {
  projectId: string;
  name: string;
  category: string;
  description?: string;
}

// Checkout
export interface CreateCheckoutRequest {
  tier: number;
  leadId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResponse {
  sessionId: string;
  url: string;
}

// Push Notifications
export interface PushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ============================================
// QUERY PARAMETERS
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ProjectQueryParams extends PaginationParams {
  tier?: number;
  status?: ProjectStatus;
}

export interface LeadQueryParams extends PaginationParams {
  status?: LeadStatus;
  tier?: number;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface AnalyticsSummary {
  totalLeads: number;
  totalClients: number;
  activeProjects: number;
  completedProjects: number;
  revenue: {
    total: number;
    thisMonth: number;
  };
  leadsThisMonth: number;
  conversionRate: number;
}

export interface ProjectAnalytics {
  byStatus: Record<ProjectStatus, number>;
  byTier: Record<number, number>;
  completionTrend: Array<{
    date: string;
    completed: number;
  }>;
}
