/**
 * Shared Types Re-export
 * 
 * This file re-exports types from the shared package.
 * Import from here for types that should be consistent with the backend.
 * 
 * Usage:
 *   import { LeadStatus, UserType } from '../types/shared';
 * 
 * Note: Some frontend-specific types remain in portal.types.ts and admin.types.ts
 * for backward compatibility. These will be gradually migrated.
 */

// Re-export all shared types
// When the shared package is properly linked, uncomment this:
// export * from '@sage/shared-types';

// For now, define the essential shared types inline
// These match the shared/types/index.ts definitions

// ============================================================================
// ENUMS (matching backend exactly)
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

export interface TierRecommendation {
  tier: Tier;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  needsManualReview: boolean;
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
// HEALTH TYPES
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  components: Record<string, ComponentHealth>;
}

export interface ComponentHealth {
  status: HealthStatus;
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}
