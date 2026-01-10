/**
 * SAGE MVP Platform - Shared Types
 * Types shared between frontend and backend for API consistency.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum UserType {
  SAGE_CLIENT = 'SAGE_CLIENT',
  KAA_CLIENT = 'KAA_CLIENT',
  TEAM = 'TEAM',
  ADMIN = 'ADMIN',
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  CLOSED = 'CLOSED',
  LOST = 'LOST',
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ONBOARDING = 'ONBOARDING',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
}

export enum MilestoneStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum DeliverableCategory {
  DESIGN = 'DESIGN',
  PLAN = 'PLAN',
  RENDER = 'RENDER',
  DOCUMENT = 'DOCUMENT',
  PHOTO = 'PHOTO',
  OTHER = 'OTHER',
}

export type Tier = 1 | 2 | 3 | 4;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  tier?: Tier;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  userType: UserType;
  tier?: Tier;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  client?: ClientSummary;
}

// ============================================================================
// LEAD TYPES
// ============================================================================

export interface CreateLeadRequest {
  email: string;
  name?: string;
  phone?: string;
  projectAddress: string;
  budgetRange?: string;
  timeline?: string;
  projectType?: string;
  hasSurvey?: boolean;
  hasDrawings?: boolean;
  budget?: number;
  timelineWeeks?: number;
  notes?: string;
}

export interface Lead {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  projectAddress: string;
  budgetRange?: string;
  timeline?: string;
  projectType?: string;
  hasSurvey: boolean;
  hasDrawings: boolean;
  status: LeadStatus;
  recommendedTier: Tier;
  overrideTier?: Tier;
  overrideReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadWithRecommendation extends Lead {
  tierRecommendation: TierRecommendation;
}

export interface TierRecommendation {
  tier: Tier;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  needsManualReview: boolean;
}

export interface UpdateLeadRequest {
  status?: LeadStatus;
  recommendedTier?: Tier;
  tierOverrideReason?: string;
  name?: string;
}

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  byTier: Record<Tier, number>;
  thisMonth: number;
  conversionRate: number;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface Project {
  id: string;
  name: string;
  tier: Tier;
  status: ProjectStatus;
  paymentStatus: string;
  clientId: string;
  leadId?: string;
  notionPageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary extends Project {
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  nextMilestone?: {
    id: string;
    name: string;
    dueDate?: string;
  };
}

export interface ProjectDetail extends Project {
  client: ClientSummary;
  lead?: Lead;
  milestones: Milestone[];
  deliverables: Deliverable[];
  payments: ProjectPayments;
}

export interface ProjectPayments {
  total: number;
  paid: number;
  pending: number;
  currency: string;
  history: PaymentRecord[];
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

// ============================================================================
// MILESTONE TYPES
// ============================================================================

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  order: number;
  status: MilestoneStatus;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMilestoneRequest {
  status?: MilestoneStatus;
  completedAt?: string;
  dueDate?: string;
}

// ============================================================================
// DELIVERABLE TYPES
// ============================================================================

export interface Deliverable {
  id: string;
  projectId: string;
  milestoneId?: string;
  name: string;
  description?: string;
  category: DeliverableCategory;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliverableRequest {
  name: string;
  description?: string;
  category: DeliverableCategory;
  milestoneId?: string;
}

// ============================================================================
// CLIENT TYPES
// ============================================================================

export interface ClientSummary {
  id: string;
  userId: string;
  tier: Tier;
  status: string;
  projectAddress?: string;
  createdAt: string;
}

export interface Client extends ClientSummary {
  user: User;
  projects: ProjectSummary[];
}

// ============================================================================
// CHECKOUT TYPES
// ============================================================================

export interface CreateCheckoutRequest {
  leadId: string;
  tier: Tier;
  email: string;
  projectId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface TierPricing {
  tier: Tier;
  name: string;
  price: number;
  currency: string;
  description: string;
  features?: string[];
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

export interface DashboardStats {
  leads: {
    total: number;
    new: number;
    qualified: number;
    converted: number;
    conversionRate: number;
    byStatus: Record<string, number>;
    thisMonth: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    byTier: Record<string, number>;
    byStatus: Record<string, number>;
  };
  clients: {
    total: number;
    active: number;
    byTier: Record<string, number>;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    byTier: Record<string, number>;
    currency: string;
  };
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'lead' | 'project' | 'payment' | 'milestone';
  action: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// UPLOAD TYPES
// ============================================================================

export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  maxFiles: number;
}

export interface UploadResult {
  id: string;
  url: string;
  filename: string;
  fileType: string;
  fileSize: number;
}

// ============================================================================
// HEALTH TYPES
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  components: {
    database: ComponentHealth;
    memory: ComponentHealth;
    stripe?: ComponentHealth;
    notion?: ComponentHealth;
    storage?: ComponentHealth;
    email?: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: HealthStatus;
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}
