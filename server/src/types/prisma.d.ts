/**
 * Manual Prisma type definitions
 * Generated from prisma/schema.prisma
 *
 * This file provides type definitions when prisma generate is unavailable.
 * These types should match the Prisma schema exactly.
 */

import '@prisma/client';

// ============================================================================
// ENUMS (matching prisma/schema.prisma)
// ============================================================================

export type UserType = 'KAA_CLIENT' | 'SAGE_CLIENT' | 'TEAM' | 'ADMIN';
export type LeadStatus = 'NEW' | 'QUALIFIED' | 'NEEDS_REVIEW' | 'CONVERTED' | 'CLOSED';
export type ProjectStatus = 'INTAKE' | 'ONBOARDING' | 'IN_PROGRESS' | 'AWAITING_FEEDBACK' | 'REVISIONS' | 'DELIVERED' | 'CLOSED';
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export type ClientStatus = 'ONBOARDING' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';
export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
export type NotificationType = 'PROJECT_UPDATE' | 'MILESTONE_COMPLETED' | 'DELIVERABLE_READY' | 'MESSAGE_RECEIVED' | 'PAYMENT_RECEIVED' | 'REVISION_REQUESTED' | 'SYSTEM';
export type TeamRole = 'OWNER' | 'ADMIN' | 'DESIGNER' | 'VIEWER';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED' | 'TRIALING';
export type ReferralStatus = 'PENDING' | 'CLICKED' | 'SIGNED_UP' | 'CONVERTED' | 'REWARDED' | 'EXPIRED';

// ============================================================================
// MODEL TYPES (matching prisma/schema.prisma)
// ============================================================================

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  address: string | null;
  passwordHash: string | null;
  role: string;
  userType: UserType;
  tier: number | null;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  // Relations
  client?: Client | null;
  auditLogs?: AuditLog[];
  deliverables?: Deliverable[];
  notifications?: Notification[];
  messages?: Message[];
  revisionRequests?: RevisionRequest[];
  revisionsResolved?: RevisionRequest[];
  pushSubscriptions?: PushSubscription[];
  teamMember?: TeamMember | null;
  projectAssignments?: ProjectAssignment[];
  invitedTeamMembers?: TeamMember[];
  passwordResetTokens?: PasswordResetToken[];
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  user?: User;
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
  createdAt: Date;
  updatedAt: Date;
  // Relations
  user?: User;
  lead?: Lead | null;
  projects?: Project[];
  leads?: Lead[];
  subscription?: Subscription | null;
  referralsMade?: Referral[];
  referredBy?: Referral | null;
  referralCredits?: ReferralCredit[];
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
  lastSyncedAt: Date | null;
  syncStatus: SyncStatus | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  client?: Client | null;
  convertedFrom?: Client | null;
  projects?: Project[];
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
  archivedAt: Date | null;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  syncError: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  client?: Client;
  lead?: Lead | null;
  milestones?: Milestone[];
  payments?: Payment[];
  deliverables?: Deliverable[];
  messages?: Message[];
  portfolioProject?: PortfolioProject | null;
  projectAssignments?: ProjectAssignment[];
}

export interface Tier {
  id: number;
  name: string;
  description: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  features: any | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  projectId: string;
  tier: number;
  name: string;
  order: number;
  status: MilestoneStatus;
  dueDate: Date | null;
  completedAt: Date | null;
  notionBlockId: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  createdAt: Date;
  // Relations
  project?: Project;
  revisionRequests?: RevisionRequest[];
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
  paidAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  project?: Project;
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
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  uploadedById: string;
  createdAt: Date;
  // Relations
  project?: Project;
  uploadedBy?: User;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  // Relations
  user?: User | null;
}

export interface DesignIdea {
  id: string;
  clientAddress: string;
  imageUrl: string;
  storagePath: string | null;
  title: string | null;
  description: string | null;
  source: string;
  pinterestUrl: string | null;
  tags: string[];
  addedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncJob {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  status: string;
  priority: number;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  notionPageId: string | null;
  payload: any | null;
  scheduledFor: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessedStripeEvent {
  id: string;
  eventType: string;
  processedAt: Date;
  payload: any | null;
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
  readAt: Date | null;
  createdAt: Date;
  // Relations
  user?: User;
}

export interface Message {
  id: string;
  projectId: string;
  senderId: string;
  content: string;
  attachments: any | null;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  project?: Project;
  sender?: User;
}

export interface RevisionRequest {
  id: string;
  milestoneId: string;
  requesterId: string;
  description: string;
  status: string;
  priority: string;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  milestone?: Milestone;
  requester?: User;
  resolver?: User | null;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime: bigint | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  user?: User;
}

export interface TeamMember {
  id: string;
  userId: string;
  role: TeamRole;
  invitedById: string | null;
  invitedAt: Date;
  acceptedAt: Date | null;
  isActive: boolean;
  inviteToken: string | null;
  inviteTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  user?: User;
  invitedBy?: User | null;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  assignedAt: Date;
  unassignedAt: Date | null;
  // Relations
  project?: Project;
  user?: User;
}

export interface Subscription {
  id: string;
  clientId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  stripeProductId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  client?: Client;
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
  clickedAt: Date | null;
  signedUpAt: Date | null;
  convertedAt: Date | null;
  rewardedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  referrer?: Client;
  referredClient?: Client | null;
}

export interface ReferralCredit {
  id: string;
  clientId: string;
  referralId: string | null;
  amount: number;
  description: string | null;
  usedAmount: number;
  usedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  // Relations
  client?: Client;
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
  completedAt: Date | null;
  featured: boolean;
  published: boolean;
  publishedAt: Date | null;
  displayOrder: number;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
  // Relations
  project?: Project | null;
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
  createdAt: Date;
  // Relations
  portfolio?: PortfolioProject;
}

// ============================================================================
// PRISMA NAMESPACE TYPES
// ============================================================================

declare module '@prisma/client' {
  // Re-export enums
  export { UserType, LeadStatus, ProjectStatus, MilestoneStatus, PaymentStatus, ClientStatus, SyncStatus, NotificationType, TeamRole, SubscriptionStatus, ReferralStatus } from '../types/prisma.d';

  // Re-export model types
  export type { User, PasswordResetToken, Client, Lead, Project, Tier, Milestone, Payment, Deliverable, AuditLog, DesignIdea, SyncJob, ProcessedStripeEvent, Notification, Message, RevisionRequest, PushSubscription, TeamMember, ProjectAssignment, Subscription, Referral, ReferralCredit, PortfolioProject, PortfolioImage } from '../types/prisma.d';

  namespace Prisma {
    // Client options
    export interface PrismaClientOptions {
      datasources?: {
        db?: {
          url?: string;
        };
      };
      log?: Array<'query' | 'info' | 'warn' | 'error'>;
      errorFormat?: 'pretty' | 'colorless' | 'minimal';
    }

    // Transaction isolation levels
    export type TransactionIsolationLevel =
      | 'ReadUncommitted'
      | 'ReadCommitted'
      | 'RepeatableRead'
      | 'Serializable';

    // Error classes
    export class PrismaClientKnownRequestError extends Error {
      code: string;
      meta?: Record<string, unknown>;
      clientVersion: string;
    }

    export class PrismaClientValidationError extends Error {
      clientVersion: string;
    }

    export class PrismaClientInitializationError extends Error {
      errorCode?: string;
      clientVersion: string;
    }

    // Select types
    export type UserSelect = Partial<Record<keyof User, boolean>>;
    export type ClientSelect = Partial<Record<keyof Client, boolean>>;
    export type ProjectSelect = Partial<Record<keyof Project, boolean>>;
    export type LeadSelect = Partial<Record<keyof Lead, boolean>>;
    export type MilestoneSelect = Partial<Record<keyof Milestone, boolean>>;
    export type DeliverableSelect = Partial<Record<keyof Deliverable, boolean>>;
    export type NotificationSelect = Partial<Record<keyof Notification, boolean>>;
    export type MessageSelect = Partial<Record<keyof Message, boolean>>;
    export type TeamMemberSelect = Partial<Record<keyof TeamMember, boolean>>;

    // Include types
    export type UserInclude = {
      client?: boolean | ClientSelect;
      auditLogs?: boolean;
      deliverables?: boolean;
      notifications?: boolean;
      messages?: boolean;
      revisionRequests?: boolean;
      revisionsResolved?: boolean;
      pushSubscriptions?: boolean;
      teamMember?: boolean;
      projectAssignments?: boolean;
      invitedTeamMembers?: boolean;
      passwordResetTokens?: boolean;
    };

    export type ClientInclude = {
      user?: boolean | UserSelect;
      lead?: boolean;
      projects?: boolean;
      leads?: boolean;
      subscription?: boolean;
      referralsMade?: boolean;
      referredBy?: boolean;
      referralCredits?: boolean;
    };

    export type ProjectInclude = {
      client?: boolean | ClientSelect;
      lead?: boolean;
      milestones?: boolean;
      payments?: boolean;
      deliverables?: boolean;
      messages?: boolean;
      portfolioProject?: boolean;
      projectAssignments?: boolean;
    };

    export type LeadInclude = {
      client?: boolean;
      convertedFrom?: boolean;
      projects?: boolean;
    };

    // Where input types
    export type UserWhereInput = Partial<User> & {
      AND?: UserWhereInput | UserWhereInput[];
      OR?: UserWhereInput[];
      NOT?: UserWhereInput | UserWhereInput[];
    };

    export type ClientWhereInput = Partial<Client> & {
      AND?: ClientWhereInput | ClientWhereInput[];
      OR?: ClientWhereInput[];
      NOT?: ClientWhereInput | ClientWhereInput[];
    };

    export type LeadWhereInput = Partial<Lead> & {
      AND?: LeadWhereInput | LeadWhereInput[];
      OR?: LeadWhereInput[];
      NOT?: LeadWhereInput | LeadWhereInput[];
    };

    export type ProjectWhereInput = Partial<Project> & {
      AND?: ProjectWhereInput | ProjectWhereInput[];
      OR?: ProjectWhereInput[];
      NOT?: ProjectWhereInput | ProjectWhereInput[];
    };

    // Update input types
    export type UserUpdateInput = Partial<Omit<User, 'id' | 'createdAt'>>;
    export type ClientUpdateInput = Partial<Omit<Client, 'id' | 'createdAt'>>;
    export type LeadUpdateInput = Partial<Omit<Lead, 'id' | 'createdAt'>>;
    export type ProjectUpdateInput = Partial<Omit<Project, 'id' | 'createdAt'>>;

    // Create input types
    export type UserCreateInput = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'client' | 'auditLogs' | 'deliverables' | 'notifications' | 'messages' | 'revisionRequests' | 'revisionsResolved' | 'pushSubscriptions' | 'teamMember' | 'projectAssignments' | 'invitedTeamMembers' | 'passwordResetTokens'>;
    export type ClientCreateInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'lead' | 'projects' | 'leads' | 'subscription' | 'referralsMade' | 'referredBy' | 'referralCredits'>;
    export type LeadCreateInput = Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'client' | 'convertedFrom' | 'projects'>;
    export type ProjectCreateInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'client' | 'lead' | 'milestones' | 'payments' | 'deliverables' | 'messages' | 'portfolioProject' | 'projectAssignments'>;
  }
}
