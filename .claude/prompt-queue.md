# Claude Code Prompt Queue
# Reference: "Run the next pending prompt from .claude/prompt-queue.md"

## How to Use
1. Add prompts to the appropriate section below
2. Tell Claude: "Run the next pending prompt" or "Run all pending prompts in [section]"
3. Claude will execute and update status from `[ ]` to `[x]`

---

## Phase 2: Lead Capture & Intake (Current Focus)

### 2.1 Tier Router Implementation
- [x] `new-util`: tierRouter.ts - Implement tier recommendation algorithm with IntakeFormData input, returns TierRecommendation with tier (1-4), reason, confidence, needsManualReview
- [x] `test`: tierRouter.test.ts - Test all tier routing logic: budget ranges, timelines, project types, asset combinations, edge cases

### 2.2 Lead API Endpoints
- [x] `new-endpoint`: POST /api/leads - Create lead from intake form, run tier router, return recommendation
- [x] `new-endpoint`: GET /api/leads - List leads with pagination, filtering by status and tier (admin only)
- [x] `new-endpoint`: GET /api/leads/:id - Get single lead with tier recommendation details
- [x] `new-endpoint`: PATCH /api/leads/:id - Update lead status, override tier recommendation (admin only)
- [x] `new-endpoint`: POST /api/leads/:id/convert - Convert lead to client after payment

### 2.3 Intake Form Components
- [x] `new-form`: IntakeForm - Multi-step intake form with budget, timeline, project type, address, assets (hasSurvey, hasDrawings)
- [x] `new-component`: TierRecommendation - Display recommended tier with pricing and features after form submission
- [x] `new-component`: TierCard - Individual tier display with name, price, features, CTA button
- [x] `new-component`: TierComparison - Side-by-side comparison of all 4 tiers

---

## Phase 3: Payment & Client Creation

### 3.1 Stripe Integration
- [x] `stripe-integration`: Checkout session creation for tiers 1-3 with tier-specific pricing from Stripe products
- [x] `new-endpoint`: POST /api/checkout/create-session - Create Stripe checkout session with tier, lead_id, success/cancel URLs
- [x] `new-webhook`: POST /api/webhooks/stripe - Handle checkout.session.completed, payment_intent.succeeded, payment_intent.failed
- [x] `new-util`: stripeHelpers.ts - Verify webhook signatures, construct events, idempotent processing

### 3.2 User & Client Creation
- [x] `new-endpoint`: POST /api/auth/register - Create user account (email/password for SAGE, address for KAA)
- [x] `new-endpoint`: POST /api/auth/login - Authenticate user, return JWT token
- [x] `new-endpoint`: GET /api/auth/me - Get current user profile with client/tier info
- [x] `new-service`: clientService.ts - Create client from lead after payment, link user/client/lead/project

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
- [x] `prisma-migrate`: Initial migration with User, Client, Lead, Project, Tier, Milestone, Payment, Deliverable, AuditLog
  - Schema complete with all models, enums, and relations
  - Run `npx prisma migrate dev --name init` when connected to database

### Indexes
- [x] `prisma-migrate`: Add indexes for email, stripe IDs, foreign keys per data-model.md
  - All indexes defined in schema.prisma
  - Will be created with migration

---

## Testing

### API Tests
- [x] `test`: leads.test.ts - Test lead CRUD, tier router integration, conversion flow
- [x] `test`: auth.test.ts - Test registration, login, token refresh, protected routes
- [x] `test`: projects.test.ts - Test project CRUD, milestone creation, tier gating
- [x] `test`: payments.test.ts - Test Stripe webhook handling, payment status updates
- [x] `test`: deliverables.test.ts - Test upload, download, file metadata

### Component Tests
- [x] `test`: IntakeForm.test.tsx - Test form validation, submission, tier display
- [x] `test`: ProjectDashboard.test.tsx - Test loading states, project list, navigation
- [x] `test`: MilestoneTimeline.test.tsx - Test milestone rendering, status indicators

### E2E Tests
- [x] `e2e`: lead-to-client.spec.ts - Full flow: intake form → tier recommendation → checkout → portal access
- [x] `e2e`: client-portal.spec.ts - Login → view projects → view deliverables → download file

---

## Backlog - Next Priorities

### Priority 1: CI/CD & DevOps (Critical)
- [ ] `ci`: GitHub Actions workflow for E2E tests - Run Playwright on PRs with PostgreSQL service
- [ ] `ci`: GitHub Actions workflow for unit tests - Run Jest tests on server and kaa-app
- [ ] `ci`: GitHub Actions workflow for linting - ESLint, TypeScript checks on PRs
- [ ] `ci`: GitHub Actions workflow for build validation - Ensure both apps build successfully
- [ ] `devops`: Docker Compose for local development - PostgreSQL, Redis, app containers
- [ ] `devops`: Environment configuration - .env.example files for server and kaa-app

### Priority 2: Database & Infrastructure
- [ ] `prisma-migrate`: Run initial migration on connected database - `npx prisma migrate dev --name init`
- [ ] `config`: Database seeding script - Create test admin, sample data for development
- [ ] `config`: Redis setup for session storage and rate limiting queues
- [ ] `config`: Health check endpoints - /api/health with database connectivity check

### Priority 3: Production Readiness
- [ ] `security`: Rate limiting middleware - Protect auth endpoints from brute force
- [ ] `security`: CORS configuration - Whitelist production domains
- [ ] `security`: Helmet.js integration - Security headers
- [ ] `security`: Input sanitization - XSS prevention on user inputs
- [ ] `monitoring`: Logging infrastructure - Structured logging with request IDs
- [ ] `monitoring`: Error tracking integration - Sentry or similar for production errors
- [ ] `monitoring`: Performance monitoring - Response time tracking, slow query detection

### Priority 4: Email & Notifications
- [ ] `new-service`: emailService.ts - SendGrid/Resend integration for transactional emails
- [ ] `email-template`: Welcome email - Sent after successful payment/registration
- [ ] `email-template`: Project status update - Sent when milestone completed
- [ ] `email-template`: Deliverable ready - Sent when new deliverable uploaded
- [ ] `email-template`: Password reset - Password reset flow with secure tokens
- [ ] `new-endpoint`: POST /api/auth/forgot-password - Initiate password reset
- [ ] `new-endpoint`: POST /api/auth/reset-password - Complete password reset with token

### Priority 5: Enhanced Features
- [ ] `new-component`: NotificationCenter - In-app notifications for project updates
- [ ] `new-endpoint`: GET /api/notifications - User notifications with read/unread status
- [ ] `new-component`: MessageThread - Client-admin communication on projects
- [ ] `new-endpoint`: POST /api/projects/:id/messages - Send message on project
- [ ] `new-component`: RevisionRequest - Client revision request form with details
- [ ] `new-endpoint`: POST /api/milestones/:id/revisions - Submit revision request

### Priority 6: Analytics & Reporting
- [ ] `new-endpoint`: GET /api/admin/analytics - Conversion rates, revenue trends, tier distribution
- [ ] `new-component`: AnalyticsDashboard - Charts for leads, conversions, revenue over time
- [ ] `new-service`: metricsService.ts - Track key business metrics
- [ ] `report`: Monthly summary - Auto-generated project/revenue summary

### Priority 7: Mobile & PWA
- [ ] `pwa`: Service worker setup - Offline support for client portal
- [ ] `pwa`: Web app manifest - Add to home screen capability
- [ ] `pwa`: Push notifications - Browser notifications for project updates
- [ ] `responsive`: Mobile optimization audit - Ensure all components work on mobile

### Priority 8: Documentation & Onboarding
- [ ] `docs`: API documentation - OpenAPI/Swagger spec for all endpoints
- [ ] `docs`: Developer setup guide - README with local development instructions
- [ ] `docs`: Deployment guide - Production deployment checklist
- [ ] `docs`: User guide - Client portal documentation for end users

### Priority 9: Performance Optimization
- [ ] `perf`: Database query optimization - Add indexes, optimize N+1 queries
- [ ] `perf`: Image optimization - Resize/compress uploaded images
- [ ] `perf`: CDN integration - Serve static assets from CDN
- [ ] `perf`: API response caching - Cache frequently accessed data

### Priority 10: Future Enhancements
- [ ] `feature`: Multi-project support - Clients with multiple active projects
- [ ] `feature`: Subscription billing - Recurring payment option for retainer clients
- [ ] `feature`: Team collaboration - Multiple team members on admin side
- [ ] `feature`: Client referral system - Referral tracking and rewards
- [ ] `feature`: Portfolio gallery - Public showcase of completed projects

---

## Completed
<!-- Move completed items here with date -->

### 2025-01-09
- [x] Initial project setup
- [x] Claude Code configuration files (.claude/config.json, prompts.md, context/)
- [x] Updated .cursorrules with comprehensive guidelines
- [x] `new-util`: tierRouter.ts - Tier recommendation algorithm with IntakeFormData input, TierRecommendation output
- [x] `test`: tierRouter.test.ts - 59 tests covering budget, timeline, project type, assets, confidence, manual review, edge cases
- [x] `new-endpoint`: POST /api/leads - Create lead with validation, tier routing, and database persistence
- [x] `new-endpoint`: GET /api/leads - List leads with pagination, status/tier/email filtering
- [x] `new-endpoint`: GET /api/leads/:id - Single lead with full tier recommendation details
- [x] `new-endpoint`: PATCH /api/leads/:id - Update status, tier override with reason validation
- [x] `new-endpoint`: POST /api/leads/:id/convert - Convert lead to client with user, project, payment creation
- [x] `new-form`: IntakeForm - 5-step form (contact, budget, timeline, project type, review) with validation
- [x] `new-component`: TierRecommendation - Recommended tier display with pricing, features, confidence, factors breakdown
- [x] `new-component`: TierCard - Reusable tier card with name, price, features, CTA, and visual states
- [x] `new-component`: TierComparison - Side-by-side tier comparison with mobile tabs, grid view, and feature table
- [x] `stripe-integration`: Stripe client config with tier pricing (Seedling $500, Sprout $1500, Canopy $3500)
- [x] `new-util`: stripeHelpers.ts - Checkout session creation, webhook verification, data extraction utilities
- [x] `new-endpoint`: POST /api/checkout/create-session - Checkout endpoint with lead validation and session status
- [x] `new-webhook`: POST /api/webhooks/stripe - Full payment flow: checkout completed, user/client/project creation
- [x] `new-util`: auth.ts - Password hashing (PBKDF2), JWT token generation/verification
- [x] `new-endpoint`: POST /api/auth/register - User registration with email/password or address auth
- [x] `new-endpoint`: POST /api/auth/login - User login with JWT token response
- [x] `new-endpoint`: GET /api/auth/me - Current user profile with client and project data
- [x] `new-service`: clientService.ts - Atomic client creation from lead with idempotency
- [x] `new-util`: milestoneTemplates.ts - Tier-specific milestone templates with due date calculation
- [x] `new-service`: projectService.ts - Project creation with milestones, status management, progress tracking
- [x] `new-endpoint`: GET /api/projects - User's projects with progress, admin pagination
- [x] `new-endpoint`: GET /api/projects/:id - Full project with milestones, deliverables, payments
- [x] `new-endpoint`: PATCH /api/projects/:id - Admin status update
- [x] `new-endpoint`: GET /api/projects/:id/milestones - Milestones with progress calculation
- [x] `new-endpoint`: PATCH /api/milestones/:id - Admin milestone status update with auto-advance
- [x] `new-endpoint`: GET /api/projects/:id/deliverables - Deliverables list grouped by category
- [x] `new-endpoint`: POST /api/projects/:id/deliverables - Admin deliverable upload with metadata
- [x] `new-endpoint`: GET /api/deliverables/:id/download - Signed download URL generation
- [x] `new-component`: ProjectDashboard - Portal home with greeting, stats, project cards, progress
- [x] `new-component`: ProjectDetail - Full project view with progress ring, milestone timeline, deliverables grid, payment info
- [x] `new-component`: MilestoneTimeline - Reusable timeline with vertical/horizontal orientation, progress summary, status icons
- [x] `new-component`: DeliverableList - Grid/list toggle with grouping, file icons, download/preview actions, loading skeletons
- [x] `new-component`: DeliverableCard - Three variants (default, compact, featured) with thumbnail preview, file icons, download state
- [x] `new-hook`: useProjects - Projects list with pagination, query key factory, React Query integration
- [x] `new-hook`: useProject - Single project fetch with status mutation, cache invalidation
- [x] `new-hook`: useMilestones - Milestones with progress tracking, status update mutation
- [x] `new-hook`: useDeliverables - Deliverables with grouping, download URL mutation, auto-trigger download
- [x] `new-endpoint`: GET /api/admin/dashboard - Summary stats, leads by status, projects by tier, revenue, recent items
- [x] `new-endpoint`: GET /api/admin/leads - Paginated leads with search, status/tier filtering, sorting
- [x] `new-endpoint`: GET /api/admin/projects - Paginated projects with progress, client info, filtering
- [x] `new-endpoint`: GET /api/admin/clients - Paginated clients with tier, project count, search
- [x] `new-component`: AdminDashboard - Stats cards, lead status chart, tier donut, recent tables, conversion banner
- [x] `new-component`: LeadQueue - Search/filter toolbar, status dropdown, tier badges, action menu, pagination
- [x] `new-component`: ProjectsTable - Search/filter, status dropdown, progress bar, deliverable count, pagination
- [x] `new-component`: ClientsTable - Avatar, tier badge, project count, Stripe status, view projects action
- [x] `new-component`: TierOverrideModal - Tier selection cards, reason with suggestions, validation, submit state
- [x] `new-component`: LeadReviewPanel - Header with status, contact info, tier card with confidence meter, intake data, status actions, convert button
- [x] `new-service`: notionSyncQueue.ts - Queue with rate limiter, retry logic, entity sync handlers, job persistence
- [x] `prisma-migration`: SyncStatus enum, sync columns on Lead/Project/Milestone/Deliverable, SyncJob model
- [x] `notion-sync`: Project - notionProjectSync.ts with create/update/archive, page content with milestones, queue triggers
- [x] `notion-sync`: Milestone - notionMilestoneSync.ts with to-do blocks, status emoji, section detection, batch sync
- [x] `notion-sync`: Deliverable - notionDeliverableSync.ts with showcase pages, image preview, project links, metadata
- [x] `notion-sync`: Lead - notionLeadSync.ts with CRM database, contact/project/tier details, status tracking
- [x] `new-service`: storageService.ts - Supabase upload, signed URLs, delete, file validation, category limits
- [x] `new-endpoint`: POST /api/upload - Single/multiple upload, multer, validation, deliverable creation, Notion sync
- [x] `new-component`: FileUpload - Drag-drop zone, file list with preview, progress, validation, upload actions
- [x] `new-middleware`: auth.ts - authenticate, optionalAuthenticate, requireRole, requireAdmin, requireTier, requireOwnerOrAdmin
- [x] `new-util`: validators.ts - Zod schemas for Lead, Auth, Project, Milestone, Deliverable, Payment, Client, Admin, Upload
- [x] `new-middleware`: validate.ts - validateBody, validateQuery, validateParams factory functions with error formatting
- [x] `new-util`: AppError.ts - Custom error class with ErrorCodes, factory functions, type guards, error conversion
- [x] `new-middleware`: errorHandler.ts - Global handler with Zod/Prisma/Multer normalization, logging, asyncHandler
- [x] `new-service`: auditService.ts - AuditActions enum, log functions, query/cleanup, middleware factory
- [x] `audit`: Add audit logging to leads, auth, projects, milestones, upload routes
- [x] `prisma-schema`: Complete schema with AuditLog updates (ip, userAgent), Lead tier override fields
- [x] `test-setup`: Jest config, test setup with mocks, test utilities
- [x] `test`: leads.test.ts - Lead CRUD, tier router, conversion tests
- [x] `test`: auth.test.ts - Registration, login, token, RBAC tests
- [x] `test`: projects.test.ts - Project CRUD, milestones, tier gating tests
- [x] `test`: payments.test.ts - Stripe webhook, checkout, payment status tests
- [x] `test`: deliverables.test.ts - File upload, download, validation tests
- [x] `test`: IntakeForm.test.tsx - Multi-step form, validation, submission tests
- [x] `test`: ProjectDashboard.test.tsx - Loading states, project cards, stats tests
- [x] `test`: MilestoneTimeline.test.tsx - Timeline rendering, status, progress tests

### 2025-01-10
- [x] `e2e`: lead-to-client.spec.ts - Intake form, tier recommendation, checkout flow, accessibility, responsive tests
- [x] `e2e`: client-portal.spec.ts - Authentication, dashboard, project detail, deliverables, responsive tests

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
