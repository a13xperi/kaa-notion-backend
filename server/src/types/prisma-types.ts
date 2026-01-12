/**
 * Prisma Type Definitions
 * These types are manually defined to match the Prisma schema.
 * Import from this file when @prisma/client types are unavailable.
 */

// ============================================================================
// ENUMS (matching prisma/schema.prisma)
// ============================================================================

export const UserType = {
  KAA_CLIENT: 'KAA_CLIENT',
  SAGE_CLIENT: 'SAGE_CLIENT',
  TEAM: 'TEAM',
  ADMIN: 'ADMIN',
} as const;
export type UserType = (typeof UserType)[keyof typeof UserType];

export const LeadStatus = {
  NEW: 'NEW',
  QUALIFIED: 'QUALIFIED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  CONVERTED: 'CONVERTED',
  CLOSED: 'CLOSED',
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const ProjectStatus = {
  INTAKE: 'INTAKE',
  ONBOARDING: 'ONBOARDING',
  IN_PROGRESS: 'IN_PROGRESS',
  AWAITING_FEEDBACK: 'AWAITING_FEEDBACK',
  REVISIONS: 'REVISIONS',
  DELIVERED: 'DELIVERED',
  CLOSED: 'CLOSED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const MilestoneStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;
export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ClientStatus = {
  ONBOARDING: 'ONBOARDING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
} as const;
export type ClientStatus = (typeof ClientStatus)[keyof typeof ClientStatus];

export const SyncStatus = {
  PENDING: 'PENDING',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  FAILED: 'FAILED',
} as const;
export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

export const NotificationType = {
  PROJECT_UPDATE: 'PROJECT_UPDATE',
  MILESTONE_COMPLETED: 'MILESTONE_COMPLETED',
  DELIVERABLE_READY: 'DELIVERABLE_READY',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  SYSTEM: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const TeamRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  DESIGNER: 'DESIGNER',
  VIEWER: 'VIEWER',
} as const;
export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole];

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  PAUSED: 'PAUSED',
  TRIALING: 'TRIALING',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const ReferralStatus = {
  PENDING: 'PENDING',
  CLICKED: 'CLICKED',
  SIGNED_UP: 'SIGNED_UP',
  CONVERTED: 'CONVERTED',
  REWARDED: 'REWARDED',
  EXPIRED: 'EXPIRED',
} as const;
export type ReferralStatus = (typeof ReferralStatus)[keyof typeof ReferralStatus];

// ============================================================================
// MODEL TYPES
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
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
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
}

export interface Tier {
  id: number;
  name: string;
  description: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  features: unknown | null;
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
  payload: unknown | null;
  scheduledFor: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessedStripeEvent {
  id: string;
  eventType: string;
  processedAt: Date;
  payload: unknown | null;
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
}

export interface Message {
  id: string;
  projectId: string;
  senderId: string;
  content: string;
  attachments: unknown | null;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
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
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  assignedAt: Date;
  unassignedAt: Date | null;
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
}

// ============================================================================
// PRISMA NAMESPACE TYPES
// ============================================================================

export namespace Prisma {
  // Transaction client type (for use within $transaction)
  export type TransactionClient = {
    [K in keyof import('@prisma/client').PrismaClient]: import('@prisma/client').PrismaClient[K];
  };

  // Client options
  export interface PrismaClientOptions {
    datasources?: {
      db?: {
        url?: string;
      };
    };
    log?: Array<'query' | 'info' | 'warn' | 'error' | LogDefinition>;
    errorFormat?: 'pretty' | 'colorless' | 'minimal';
  }

  export interface LogDefinition {
    level: 'query' | 'info' | 'warn' | 'error';
    emit: 'event' | 'stdout';
  }

  export interface QueryEvent {
    timestamp: Date;
    query: string;
    params: string;
    duration: number;
    target: string;
  }

  // Transaction isolation levels
  export type TransactionIsolationLevel =
    | 'ReadUncommitted'
    | 'ReadCommitted'
    | 'RepeatableRead'
    | 'Serializable';

  export const TransactionIsolationLevel = {
    ReadUncommitted: 'ReadUncommitted' as TransactionIsolationLevel,
    ReadCommitted: 'ReadCommitted' as TransactionIsolationLevel,
    RepeatableRead: 'RepeatableRead' as TransactionIsolationLevel,
    Serializable: 'Serializable' as TransactionIsolationLevel,
  };

  // Error classes
  export class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: Record<string, unknown>;
    clientVersion: string;
    constructor(message: string, options: { code: string; clientVersion: string; meta?: Record<string, unknown> }) {
      super(message);
      this.code = options.code;
      this.clientVersion = options.clientVersion;
      this.meta = options.meta;
    }
  }

  export class PrismaClientValidationError extends Error {
    clientVersion: string;
    constructor(message: string, options: { clientVersion: string }) {
      super(message);
      this.clientVersion = options.clientVersion;
    }
  }

  export class PrismaClientInitializationError extends Error {
    errorCode?: string;
    clientVersion: string;
    constructor(message: string, options: { clientVersion: string; errorCode?: string }) {
      super(message);
      this.clientVersion = options.clientVersion;
      this.errorCode = options.errorCode;
    }
  }

  // Generic relation config for select/include
  type RelationConfig = boolean | {
    select?: Record<string, boolean | RelationConfig>;
    include?: Record<string, boolean | RelationConfig>;
    orderBy?: Record<string, 'asc' | 'desc'>;
    take?: number;
    skip?: number;
    where?: Record<string, unknown>;
  };

  // Select types - allow both boolean and nested selects
  export type UserSelect = Record<string, boolean | RelationConfig>;
  export type ClientSelect = Record<string, boolean | RelationConfig>;
  export type ProjectSelect = Record<string, boolean | RelationConfig>;
  export type LeadSelect = Record<string, boolean | RelationConfig>;
  export type MilestoneSelect = Record<string, boolean | RelationConfig>;
  export type DeliverableSelect = Record<string, boolean | RelationConfig>;
  export type NotificationSelect = Record<string, boolean | RelationConfig>;
  export type MessageSelect = Record<string, boolean | RelationConfig>;
  export type TeamMemberSelect = Record<string, boolean | RelationConfig>;

  // Include types - allow nested includes with select/orderBy/take
  export type UserInclude = Record<string, RelationConfig>;
  export type ClientInclude = Record<string, RelationConfig>;
  export type ProjectInclude = Record<string, RelationConfig>;
  export type LeadInclude = Record<string, RelationConfig>;

  // Where input types
  export interface UserWhereInput {
    AND?: UserWhereInput | UserWhereInput[];
    OR?: UserWhereInput[];
    NOT?: UserWhereInput | UserWhereInput[];
    id?: string | StringFilter;
    email?: string | StringFilter | null;
    name?: string | StringFilter | null;
    role?: string | StringFilter;
    userType?: UserType | EnumFilter<UserType>;
    [key: string]: unknown;
  }

  export interface ClientWhereInput {
    AND?: ClientWhereInput | ClientWhereInput[];
    OR?: ClientWhereInput[];
    NOT?: ClientWhereInput | ClientWhereInput[];
    id?: string | StringFilter;
    userId?: string | StringFilter;
    tier?: number | IntFilter;
    status?: ClientStatus | EnumFilter<ClientStatus>;
    [key: string]: unknown;
  }

  export interface LeadWhereInput {
    AND?: LeadWhereInput | LeadWhereInput[];
    OR?: LeadWhereInput[];
    NOT?: LeadWhereInput | LeadWhereInput[];
    id?: string | StringFilter;
    email?: string | StringFilter;
    status?: LeadStatus | EnumFilter<LeadStatus>;
    recommendedTier?: number | IntFilter;
    [key: string]: unknown;
  }

  export interface ProjectWhereInput {
    AND?: ProjectWhereInput | ProjectWhereInput[];
    OR?: ProjectWhereInput[];
    NOT?: ProjectWhereInput | ProjectWhereInput[];
    id?: string | StringFilter;
    clientId?: string | StringFilter;
    status?: ProjectStatus | EnumFilter<ProjectStatus>;
    tier?: number | IntFilter;
    [key: string]: unknown;
  }

  // Filter types
  export interface StringFilter {
    equals?: string;
    in?: string[];
    notIn?: string[];
    lt?: string;
    lte?: string;
    gt?: string;
    gte?: string;
    contains?: string;
    startsWith?: string;
    endsWith?: string;
    mode?: 'default' | 'insensitive';
    not?: string | StringFilter;
  }

  export interface IntFilter {
    equals?: number;
    in?: number[];
    notIn?: number[];
    lt?: number;
    lte?: number;
    gt?: number;
    gte?: number;
    not?: number | IntFilter;
  }

  export interface EnumFilter<T> {
    equals?: T;
    in?: T[];
    notIn?: T[];
    not?: T | EnumFilter<T>;
  }

  // Update input types
  export interface UserUpdateInput {
    email?: string | null;
    name?: string | null;
    address?: string | null;
    passwordHash?: string | null;
    role?: string;
    userType?: UserType;
    tier?: number | null;
    lastLogin?: Date | null;
    updatedAt?: Date;
    [key: string]: unknown;
  }

  export interface ClientUpdateInput {
    tier?: number;
    status?: ClientStatus;
    projectAddress?: string | null;
    stripeCustomerId?: string | null;
    maxProjects?: number;
    referralCode?: string | null;
    updatedAt?: Date;
    [key: string]: unknown;
  }

  export interface LeadUpdateInput {
    email?: string;
    name?: string | null;
    projectAddress?: string;
    budgetRange?: string | null;
    timeline?: string | null;
    projectType?: string | null;
    hasSurvey?: boolean;
    hasDrawings?: boolean;
    recommendedTier?: number;
    routingReason?: string | null;
    tierOverride?: number | null;
    overrideReason?: string | null;
    status?: LeadStatus;
    clientId?: string | null;
    notionPageId?: string | null;
    lastSyncedAt?: Date | null;
    syncStatus?: SyncStatus | null;
    updatedAt?: Date;
    [key: string]: unknown;
  }

  export interface ProjectUpdateInput {
    tier?: number;
    status?: ProjectStatus;
    name?: string;
    projectAddress?: string | null;
    notionPageId?: string | null;
    paymentStatus?: string;
    archivedAt?: Date | null;
    syncStatus?: SyncStatus;
    lastSyncedAt?: Date | null;
    syncError?: string | null;
    updatedAt?: Date;
    [key: string]: unknown;
  }
}
