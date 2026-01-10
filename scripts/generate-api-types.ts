#!/usr/bin/env ts-node
/**
 * API Type Generator
 * Generates TypeScript types from the OpenAPI specification.
 * 
 * Usage:
 *   npx ts-node scripts/generate-api-types.ts
 *   npm run generate:api-types
 */

import * as fs from 'fs';
import * as path from 'path';

// API Types based on OpenAPI spec
const API_TYPES = `/**
 * Generated API Types
 * Auto-generated from OpenAPI specification.
 * DO NOT EDIT DIRECTLY - Run npm run generate:api-types to regenerate.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum UserType {
  KAA_CLIENT = 'KAA_CLIENT',
  SAGE_CLIENT = 'SAGE_CLIENT',
  TEAM = 'TEAM',
  ADMIN = 'ADMIN',
}

export enum LeadStatus {
  NEW = 'NEW',
  QUALIFIED = 'QUALIFIED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  CLOSED = 'CLOSED',
}

export enum ProjectStatus {
  ONBOARDING = 'ONBOARDING',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_FEEDBACK = 'AWAITING_FEEDBACK',
  REVISIONS = 'REVISIONS',
  DELIVERED = 'DELIVERED',
  CLOSED = 'CLOSED',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  userType?: UserType;
  tier?: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: string;
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  userType: UserType;
  tier: number | null;
  createdAt?: string;
}

export interface UserProfile extends User {
  client?: {
    id: string;
    status: string;
    projectAddress: string | null;
  } | null;
  projects?: ProjectSummary[];
}

// ============================================================================
// LEAD TYPES
// ============================================================================

export interface Lead {
  id: string;
  email: string;
  name?: string;
  projectAddress: string;
  budgetRange?: string;
  timeline?: string;
  projectType?: string;
  hasSurvey: boolean;
  hasDrawings: boolean;
  recommendedTier: number;
  routingReason?: string;
  status: LeadStatus;
  clientId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadRequest {
  email: string;
  name?: string;
  projectAddress: string;
  budgetRange?: string;
  timeline?: string;
  projectType?: string;
  hasSurvey?: boolean;
  hasDrawings?: boolean;
  budget?: number;
  timelineWeeks?: number;
}

export interface TierRecommendation {
  tier: 1 | 2 | 3 | 4;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  needsManualReview: boolean;
}

export interface CreateLeadResponse {
  lead: Lead;
  recommendation: TierRecommendation;
  isExisting: boolean;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  tier: number;
}

export interface Project extends ProjectSummary {
  clientId: string;
  leadId?: string;
  notionPageId?: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  milestones?: Milestone[];
  deliverables?: Deliverable[];
}

// ============================================================================
// MILESTONE TYPES
// ============================================================================

export interface Milestone {
  id: string;
  projectId: string;
  tier: number;
  name: string;
  order: number;
  status: MilestoneStatus;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

// ============================================================================
// DELIVERABLE TYPES
// ============================================================================

export interface Deliverable {
  id: string;
  projectId: string;
  name: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  category: string;
  description?: string;
  uploadedById: string;
  createdAt: string;
}

// ============================================================================
// CHECKOUT TYPES
// ============================================================================

export interface CreateCheckoutRequest {
  tier: number;
  leadId?: string;
  email?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutResponse {
  url: string;
  sessionId: string;
}

export interface PricingTier {
  tier: number;
  name: string;
  price: number;
  currency: string;
  description: string;
  features: string[];
  popular?: boolean;
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

export interface AdminStats {
  totalLeads: number;
  newLeadsToday: number;
  activeProjects: number;
  revenue: number;
  conversionRate: number;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

export type ApiEndpoints = {
  // Auth
  'POST /api/auth/register': {
    request: RegisterRequest;
    response: LoginResponse;
  };
  'POST /api/auth/login': {
    request: LoginRequest;
    response: LoginResponse;
  };
  'POST /api/auth/refresh': {
    request: RefreshTokenRequest;
    response: RefreshTokenResponse;
  };
  'GET /api/auth/me': {
    request: never;
    response: UserProfile;
  };
  
  // Leads
  'POST /api/leads': {
    request: CreateLeadRequest;
    response: CreateLeadResponse;
  };
  'GET /api/leads': {
    request: { page?: number; limit?: number; status?: LeadStatus; tier?: number };
    response: Lead[];
  };
  'GET /api/leads/:id': {
    request: never;
    response: Lead;
  };
  
  // Projects
  'GET /api/projects': {
    request: { page?: number; limit?: number; status?: ProjectStatus };
    response: Project[];
  };
  'GET /api/projects/:id': {
    request: never;
    response: Project;
  };
  'PATCH /api/projects/:id': {
    request: { status?: ProjectStatus };
    response: Project;
  };
  
  // Checkout
  'POST /api/checkout/create-session': {
    request: CreateCheckoutRequest;
    response: CreateCheckoutResponse;
  };
  'GET /api/checkout/pricing': {
    request: never;
    response: PricingTier[];
  };
};
`;

// Write to shared types
const outputPath = path.join(__dirname, '..', 'shared', 'types', 'api.ts');

// Ensure directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, API_TYPES, 'utf-8');
console.log(\`✅ API types generated at: \${outputPath}\`);

// Also create a frontend-compatible version
const frontendOutputPath = path.join(__dirname, '..', 'kaa-app', 'src', 'types', 'api.generated.ts');
fs.writeFileSync(frontendOutputPath, API_TYPES, 'utf-8');
console.log(\`✅ Frontend API types generated at: \${frontendOutputPath}\`);
