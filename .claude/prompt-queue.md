# Claude Code Prompt Queue
# Reference: "Run the next pending prompt from .claude/prompt-queue.md"

## How to Use
1. Add prompts to the appropriate section below
2. Tell Claude: "Run the next pending prompt" or "Run all pending prompts in [section]"
3. Claude will execute and update status from `[ ]` to `[x]`

---

## Phase 2: Lead Capture & Intake (Current Focus)

### 2.1 Tier Router Implementation
- [ ] `new-util`: tierRouter.ts - Implement tier recommendation algorithm with IntakeFormData input, returns TierRecommendation with tier (1-4), reason, confidence, needsManualReview
- [ ] `test`: tierRouter.test.ts - Test all tier routing logic: budget ranges, timelines, project types, asset combinations, edge cases

### 2.2 Lead API Endpoints
- [ ] `new-endpoint`: POST /api/leads - Create lead from intake form, run tier router, return recommendation
- [ ] `new-endpoint`: GET /api/leads - List leads with pagination, filtering by status and tier (admin only)
- [ ] `new-endpoint`: GET /api/leads/:id - Get single lead with tier recommendation details
- [ ] `new-endpoint`: PATCH /api/leads/:id - Update lead status, override tier recommendation (admin only)
- [ ] `new-endpoint`: POST /api/leads/:id/convert - Convert lead to client after payment

### 2.3 Intake Form Components
- [ ] `new-form`: IntakeForm - Multi-step intake form with budget, timeline, project type, address, assets (hasSurvey, hasDrawings)
- [ ] `new-component`: TierRecommendation - Display recommended tier with pricing and features after form submission
- [ ] `new-component`: TierCard - Individual tier display with name, price, features, CTA button
- [ ] `new-component`: TierComparison - Side-by-side comparison of all 4 tiers

---

## Phase 3: Payment & Client Creation

### 3.1 Stripe Integration
- [ ] `stripe-integration`: Checkout session creation for tiers 1-3 with tier-specific pricing from Stripe products
- [ ] `new-endpoint`: POST /api/checkout/create-session - Create Stripe checkout session with tier, lead_id, success/cancel URLs
- [ ] `new-webhook`: POST /api/webhooks/stripe - Handle checkout.session.completed, payment_intent.succeeded, payment_intent.failed
- [ ] `new-util`: stripeHelpers.ts - Verify webhook signatures, construct events, idempotent processing

### 3.2 User & Client Creation
- [ ] `new-endpoint`: POST /api/auth/register - Create user account (email/password for SAGE, address for KAA)
- [ ] `new-endpoint`: POST /api/auth/login - Authenticate user, return JWT token
- [ ] `new-endpoint`: GET /api/auth/me - Get current user profile with client/tier info
- [ ] `new-service`: clientService.ts - Create client from lead after payment, link user/client/lead/project

### 3.3 Project Auto-Creation
- [x] `new-service`: projectService.ts - Create project with tier-specific milestones after payment
- [x] `new-util`: milestoneTemplates.ts - Define milestone templates for each tier (Tier 1: Intake→Concept→Delivery, Tier 2: Intake→Draft→Review→Revisions→Final, etc.)

---

## Phase 4: Client Portal

### 4.1 Project Endpoints
- [x] `new-endpoint`: GET /api/projects - List user's projects with status and progress
- [x] `new-endpoint`: GET /api/projects/:id - Get project with milestones, deliverables, payment status
- [x] `new-endpoint`: PATCH /api/projects/:id - Update project status (admin only)

### 4.2 Milestone Endpoints
- [x] `new-endpoint`: GET /api/projects/:id/milestones - Get milestones for project
- [x] `new-endpoint`: PATCH /api/milestones/:id - Update milestone status, completed_at (admin only)

### 4.3 Deliverable Endpoints
- [x] `new-endpoint`: GET /api/projects/:id/deliverables - Get deliverables for project
- [x] `new-endpoint`: POST /api/projects/:id/deliverables - Upload deliverable (admin only)
- [x] `new-endpoint`: GET /api/deliverables/:id/download - Get signed download URL for file

### 4.4 Portal Components
- [x] `new-component`: ProjectDashboard - Main portal view with project list, status, quick actions
- [x] `new-component`: ProjectDetail - Full project view with milestones timeline, deliverables, status
- [x] `new-component`: MilestoneTimeline - Visual timeline of project milestones with status indicators
- [x] `new-component`: DeliverableList - Grid/list of project deliverables with download buttons
- [x] `new-component`: DeliverableCard - Individual deliverable with thumbnail, name, download action

### 4.5 Portal Hooks
- [x] `new-hook`: useProjects - Fetch user's projects with React Query, handle loading/error
- [x] `new-hook`: useProject - Fetch single project with milestones and deliverables
- [x] `new-hook`: useMilestones - Fetch milestones by project ID
- [x] `new-hook`: useDeliverables - Fetch deliverables by project ID

---

## Phase 5: Admin Dashboard

### 5.1 Admin Endpoints
- [x] `new-endpoint`: GET /api/admin/dashboard - Dashboard stats (leads by status, projects by tier, revenue)
- [x] `new-endpoint`: GET /api/admin/leads - All leads with filtering, sorting, pagination
- [x] `new-endpoint`: GET /api/admin/projects - All projects with filtering, sorting, pagination
- [x] `new-endpoint`: GET /api/admin/clients - All clients with tier, status, project count

### 5.2 Admin Components
- [x] `new-component`: AdminDashboard - Overview with stats cards, recent leads, recent projects
- [x] `new-component`: LeadQueue - Lead management table with status, tier, actions (approve, change tier, close)
- [x] `new-component`: ProjectsTable - Admin project list with client, tier, status, actions
- [x] `new-component`: ClientsTable - Client list with tier, projects, status

### 5.3 Admin Actions
- [x] `new-component`: TierOverrideModal - Modal to change lead's recommended tier with reason
- [x] `new-component`: LeadReviewPanel - Detailed lead view with intake data, tier recommendation, actions

---

## Phase 6: Notion Sync

### 6.1 Sync Infrastructure
- [x] `new-service`: notionSyncQueue.ts - Queue-based sync with rate limiting, retry logic, status tracking
- [x] `prisma-migration`: Add lastSyncedAt, syncStatus columns to projects, milestones, deliverables

### 6.2 Entity Sync
- [x] `notion-sync`: Project - Create Notion page when project created, sync status updates
- [x] `notion-sync`: Milestone - Add milestone blocks to project page, update on status change
- [x] `notion-sync`: Deliverable - Create showcase page for deliverables, link from project page
- [x] `notion-sync`: Lead - Optional CRM sync for team visibility

---

## Phase 7: File Storage

### 7.1 Supabase Storage
- [x] `new-service`: storageService.ts - Upload files to Supabase Storage, get signed URLs, delete files
- [x] `new-endpoint`: POST /api/upload - Handle file upload with validation (size, type), store metadata
- [x] `new-component`: FileUpload - Drag-drop upload with progress, file type validation, preview

---

## Phase 8: Security & Polish

### 8.1 Authentication Middleware
- [x] `new-middleware`: auth.ts - JWT verification, attach user to request, handle expired tokens
- [x] `new-middleware`: requireTier.ts - Check user has required tier for endpoint access
- [x] `new-middleware`: requireAdmin.ts - Check user is admin or team member

### 8.2 Validation
- [x] `new-util`: validators.ts - Zod schemas for all API request bodies (lead, project, deliverable)
- [x] `new-middleware`: validate.ts - Middleware to validate request body against Zod schema

### 8.3 Error Handling
- [x] `new-middleware`: errorHandler.ts - Global error handler with proper response formatting, logging
- [x] `new-util`: AppError.ts - Custom error class with code, message, statusCode, details

### 8.4 Audit Logging
- [x] `new-service`: auditService.ts - Log actions to audit_log table with user, action, resource, details
- [x] `audit`: Add audit logging to all state-changing endpoints

---

## Database Migrations

### Core Models (Run First)
- [x] `prisma-migrate`: Initial migration with User, Client, Lead, Project, Tier, Milestone, Payment, Deliverable, AuditLog (schema complete)

### Indexes
- [x] `prisma-migrate`: Add indexes for email, stripe IDs, foreign keys per data-model.md (indexes defined in schema)

---

## Testing

### API Tests
- [x] `test`: auth.test.ts - Test JWT generation, verification, token refresh
- [x] `test`: validators.test.ts - Test Zod validation schemas for all endpoints
- [x] `test`: appError.test.ts - Test error class and factory functions
- [x] `test`: milestoneTemplates.test.ts - Test tier configurations and milestone generation
- [x] `test`: tierFeatures.test.ts - Test tier-based feature access

### Component Tests
- [ ] `test`: IntakeForm.test.tsx - Test form validation, submission, tier display
- [ ] `test`: ProjectDashboard.test.tsx - Test loading states, project list, navigation
- [ ] `test`: MilestoneTimeline.test.tsx - Test milestone rendering, status indicators

### E2E Tests
- [ ] `e2e`: lead-to-client.spec.ts - Full flow: intake form → tier recommendation → checkout → portal access
- [ ] `e2e`: client-portal.spec.ts - Login → view projects → view deliverables → download file

---

## Completed
<!-- Move completed items here with date -->

### 2026-01-09
- [x] `new-service`: projectService.ts - Create project with tier-specific milestones after payment
- [x] `new-util`: milestoneTemplates.ts - Define milestone templates for each tier
- [x] `new-adapter`: prismaAdapter.ts - Prisma database adapter for projectService
- [x] `new-endpoint`: GET /api/projects - List user's projects with status and progress
- [x] `new-endpoint`: GET /api/projects/:id - Get project with full details (milestones, deliverables, payments)
- [x] `new-endpoint`: PATCH /api/projects/:id - Update project status (admin only)
- [x] `new-endpoint`: GET /api/projects/:id/milestones - Get milestones for project with summary
- [x] `new-endpoint`: GET /api/milestones/:id - Get single milestone with navigation
- [x] `new-endpoint`: PATCH /api/milestones/:id - Update milestone status (auto-advances next milestone)
- [x] `new-endpoint`: GET /api/projects/:id/deliverables - Get deliverables with summary by category
- [x] `new-endpoint`: POST /api/projects/:id/deliverables - Upload deliverable metadata (admin only)
- [x] `new-endpoint`: GET /api/deliverables/:id - Get single deliverable details
- [x] `new-endpoint`: GET /api/deliverables/:id/download - Get signed download URL (60 min expiry)
- [x] `new-endpoint`: DELETE /api/deliverables/:id - Delete deliverable (admin only)
- [x] `new-component`: ProjectDashboard - Main portal view with project list, stats, filtering
- [x] `new-component`: ProjectDetail - Full project view with tabs (overview, milestones, deliverables, payments)
- [x] `new-component`: MilestoneTimeline - Visual timeline with progress bar, status indicators
- [x] `new-component`: DeliverableList - Grid/list view with search, category filters
- [x] `new-component`: DeliverableCard - File card with icon, category badge, download
- [x] `new-types`: portal.types.ts - TypeScript types for all portal components
- [x] `new-api`: portalApi.ts - API client for projects, milestones, deliverables
- [x] `new-hook`: useProjects - Project list with pagination, filtering, caching
- [x] `new-hook`: useProject/useProjectWithRelations - Single project with parallel data fetching
- [x] `new-hook`: useMilestones - Milestone list with progress helpers
- [x] `new-hook`: useDeliverables - Deliverable list with download helpers
- [x] `new-endpoint`: GET /api/admin/dashboard - Dashboard stats with revenue, leads, projects, clients
- [x] `new-endpoint`: GET /api/admin/leads - Leads list with search, status, tier, date filters
- [x] `new-endpoint`: GET /api/admin/projects - Projects list with progress, payment totals
- [x] `new-endpoint`: GET /api/admin/clients - Clients list with project/payment stats
- [x] `new-types`: admin.types.ts - TypeScript types for admin dashboard, leads, projects, clients
- [x] `new-component`: AdminDashboard - Overview with stats cards (leads, projects, clients, revenue)
- [x] `new-component`: LeadQueue - Lead management table with search, status/tier filters, pagination
- [x] `new-component`: ProjectsTable - Admin project list with progress bars, payment status
- [x] `new-component`: ClientsTable - Client list with tier, revenue, project count
- [x] `new-component`: TierOverrideModal - Modal to change lead tier with reason input
- [x] `new-component`: LeadReviewPanel - Slide-in panel with detailed lead view and actions
- [x] `new-service`: notionSyncQueue.ts - Queue-based sync with rate limiting, retry logic, status tracking
- [x] `new-service`: notionSync.ts - High-level Notion sync service for projects, milestones, deliverables
- [x] `prisma-migration`: Add SyncStatus enum, syncStatus, lastSyncedAt, syncError columns
- [x] `new-endpoint`: GET /api/notion/status - Get sync status and queue statistics
- [x] `new-endpoint`: POST /api/notion/sync - Trigger sync for all pending entities
- [x] `new-endpoint`: POST /api/notion/retry - Retry all failed syncs
- [x] `new-endpoint`: POST /api/notion/sync/project/:id - Manually sync specific project
- [x] `new-endpoint`: GET /api/notion/failed - Get list of failed syncs
- [x] `new-service`: storageService.ts - Supabase Storage upload, signed URLs, delete, metadata
- [x] `new-endpoint`: POST /api/upload - Single file upload with validation, creates deliverable record
- [x] `new-endpoint`: POST /api/upload/multiple - Multiple file upload (up to 10 files)
- [x] `new-endpoint`: GET /api/upload/config - Get allowed file types and size limits
- [x] `new-endpoint`: DELETE /api/upload/:id - Delete file from storage and database
- [x] `new-component`: FileUpload - Drag-drop upload with preview, progress, validation
- [x] `new-util`: AppError.ts - Custom error class with codes, status mapping, factory functions
- [x] `new-middleware`: auth.ts - JWT verification, token refresh, user attachment
- [x] `new-middleware`: requireTier.ts - Tier-based access control with feature checks
- [x] `new-middleware`: requireAdmin.ts - Admin/team role enforcement
- [x] `new-util`: validators.ts - Zod schemas for all API endpoints (lead, project, client, etc.)
- [x] `new-middleware`: validate.ts - Request validation middleware for body, query, params
- [x] `new-middleware`: errorHandler.ts - Global error handler with Prisma/Stripe error mapping
- [x] `new-service`: auditService.ts - Centralized audit logging with query/cleanup utilities
- [x] `test-setup`: Jest configuration, test helpers, mock data factories
- [x] `test`: auth.test.ts - 8 tests for JWT token generation/verification/refresh
- [x] `test`: validators.test.ts - 30 tests for Zod validation schemas
- [x] `test`: appError.test.ts - 24 tests for error class and factory functions
- [x] `test`: milestoneTemplates.test.ts - 20 tests for tier milestone configurations
- [x] `test`: tierFeatures.test.ts - 13 tests for tier-based feature access

### 2025-01-09
- [x] Initial project setup
- [x] Claude Code configuration files (.claude/config.json, prompts.md, context/)
- [x] Updated .cursorrules with comprehensive guidelines

---

## Quick Reference

| Prompt Type | Use For |
|-------------|---------|
| `new-endpoint` | API routes (GET, POST, PATCH, DELETE) |
| `new-component` | React components |
| `new-hook` | Custom React hooks with React Query |
| `new-form` | Form components with validation |
| `new-service` | Backend service modules |
| `new-util` | Utility functions |
| `new-middleware` | Express middleware |
| `prisma-migrate` | Database schema changes |
| `notion-sync` | Notion integration for entity |
| `stripe-integration` | Payment features |
| `new-webhook` | Webhook handlers |
| `audit` | Code review / add audit logging |
| `test` | Unit/integration tests |
| `e2e` | End-to-end tests |

---

## Invocation Examples

```bash
# Run next item in current phase
"Run the next pending prompt from Phase 2"

# Run specific section
"Run all Tier Router prompts"

# Run specific type across all phases
"Run all pending new-endpoint prompts"

# Add new item
"Add to prompt queue Phase 4: new-component StatusBadge"

# Check status
"Show me the prompt queue status"

# Skip to specific phase
"Run all Phase 3 prompts"
```
