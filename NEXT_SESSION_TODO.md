# Next Claude Code Session - TODO List

This document outlines the work to be done in the next Claude Code session after the PR integration is merged.

**Last Updated:** 2026-01-11
**Branch:** `claude/review-merge-issues-34jvV`
**Code Quality Score:** 7/10
**Production Readiness:** 6/10

---

## Priority 0: CRITICAL Security Issues (Must Fix Before Production)

### 0.1 Development Auth Bypass (CRITICAL)
- [ ] **Fix `middleware/auth.ts:164-180`** - Development headers (`x-user-id`, `x-user-type`, etc.) allow unauthenticated access
  - Gate behind explicit `NODE_ENV === 'development'` check
  - Add warning logs when bypass is used
  - Consider removing entirely or requiring explicit flag

### 0.2 Missing Service Configuration Validation
- [ ] **Fix `utils/stripe.ts:4-10`** - Stripe initialized with empty string when key missing
  - Throw explicit error at startup if `STRIPE_SECRET_KEY` not set
- [ ] **Fix `services/subscriptionService.ts:9-14`** - Same Stripe issue
  - Add validation before instantiation
- [ ] **Fix `config/security.ts:18-19`** - Unsafe CSP with `'unsafe-inline'`
  - Replace with nonces or hashes for script/style sources

### 0.3 Incomplete Security Features
- [ ] **Fix `services/realtimeService.ts:168`** - WebSocket token verification not implemented for production
  - Implement proper JWT verification for WebSocket connections
  - Add connection timeout and cleanup
- [ ] **Fix `middleware/sanitize.ts:104-113`** - Weak XSS detection using simple regex
  - Consider using `xss-filters` or `DOMPurify` library
  - Add comprehensive test cases for bypass attempts

---

## Priority 1: Immediate Post-Merge Tasks

### 1.1 Database Migration
- [ ] Run `npx prisma generate` to generate Prisma client
- [ ] Run `npx prisma migrate dev --name "add_password_reset_and_invite_tokens"`
- [ ] Verify `password_reset_tokens` table created
- [ ] Verify `invite_token` and `invite_token_expires_at` columns added to `team_members`
- [ ] Test database connectivity and queries work

### 1.2 Build Verification
- [ ] Run `npm run build` in server directory
- [ ] Fix any remaining TypeScript errors
- [ ] Run `npm run build` in kaa-app directory
- [ ] Verify no compilation errors

### 1.3 Test Suite
- [ ] Run `npm test` in server directory
- [ ] Fix any failing tests
- [ ] Run `npm run test:e2e` if E2E tests exist
- [ ] Verify test coverage is acceptable

---

## Priority 2: Incomplete Features (Blocking Production)

### 2.1 Team Service Email Integration
- [ ] **Fix `services/teamService.ts:177`** - TODO: Team invite email sending not implemented
  - Integrate with emailService to send invite emails
  - Add email template for team invitations
  - Test email delivery in staging environment

### 2.2 Error Logging Standardization
- [ ] **Fix `middleware/auth.ts:353-361`** - Uses `console.error` instead of logger
- [ ] **Fix `middleware/auth.ts:415-416`** - Same issue in optional auth
- [ ] **Fix `middleware/sanitize.ts:181,189,211,230`** - Uses `console.warn/error` for security events
- [ ] **Fix `utils/queryOptimization.ts:640`** - Uses `console.warn` in production code
  - Replace all `console.*` with structured logger
  - Ensure security events use appropriate log levels

### 2.3 Prisma Instance Consolidation
- [ ] **Fix `services/teamService.ts:9`** - Uses `new PrismaClient()` instead of centralized instance
- [ ] **Fix `services/subscriptionService.ts:9`** - Same issue
- [ ] Audit all files for `new PrismaClient()` usage
- [ ] Use `utils/prisma.ts` centralized instance everywhere
  - Prevents connection pool exhaustion
  - Enables consistent query logging

---

## Priority 3: Type Safety Issues (73 `any` occurrences)

### 3.1 Critical Type Fixes
- [ ] **Fix `middleware/errorHandler.ts:201`** - `(err as any).type` for Stripe errors
  - Add proper Stripe error type definitions
- [ ] **Fix `middleware/errorHandler.ts:381`** - `(req as any).correlationId`
  - Extend Express Request type properly
- [ ] **Fix `config/database.ts:136,172`** - `@ts-expect-error` for Prisma events
  - Add proper Prisma event type definitions
- [ ] **Fix `routes/webhooks.ts:36`** - `Record<string, any>` for Notion properties
  - Create proper Notion property types

### 3.2 Consolidate Duplicate Types
- [ ] **Consolidate `AuthenticatedRequest`** - Defined in multiple files:
  - `routes/projects.ts`
  - `routes/leads.ts`
  - `routes/team.ts`
  - Move to single location in `middleware/auth.ts` or create `types/express.d.ts`

### 3.3 Target: Reduce `any` usage
- [ ] Current: 73 occurrences across 42 files
- [ ] Target: <30 occurrences
- [ ] Run: `grep -r "any" --include="*.ts" server/src | wc -l` to track progress

---

## Priority 4: Test Coverage Gaps

### 4.1 Critical Untested Flows
- [ ] **Stripe Webhook → Client Creation → Project Generation**
  - No integration tests for this critical payment flow
  - Add tests in `__tests__/integration/stripe-flow.test.ts`
- [ ] **Notion Sync Services** - No test coverage:
  - `notionLeadSync.ts`
  - `notionDeliverableSync.ts`
  - `notionProjectSync.ts`
  - `notionMilestoneSync.ts`
  - Add unit tests for each sync service

### 4.2 Password Reset Testing
- [ ] Test reset request with valid email
- [ ] Test reset request with invalid email (should still succeed - no enumeration)
- [ ] Test token validation
- [ ] Test password reset with valid token
- [ ] Test password reset with expired token
- [ ] Test password reset with already-used token
- [ ] Test password strength validation

### 4.3 Team Invite Testing
- [ ] Test invite creation by admin
- [ ] Test invite creation by non-admin (should fail)
- [ ] Test invite validation
- [ ] Test invite acceptance with valid data
- [ ] Test invite acceptance with weak password
- [ ] Test invite resend
- [ ] Test invite cancellation
- [ ] Test listing pending invites
- [ ] Test listing team members

### 4.4 Figma Protection Testing
- [ ] Test access with valid project assignment
- [ ] Test access with no assignment (should fail)
- [ ] Test access with unassigned (former) member (should fail)
- [ ] Test admin bypass works
- [ ] Test client owner access works

### 4.5 Current Test Statistics
- Total test files: 29
- Estimated coverage: ~30%
- Target coverage: >70% for critical paths

---

## Priority 5: Code Quality & Consistency

### 5.1 Error Handling Standardization
- [ ] **Audit `new Error()` usage** - Should use `AppError` class instead
  - `services/clientService.ts:98-99` - Generic Error thrown
  - Search: `throw new Error` to find all occurrences
- [ ] **Standardize error codes** - Ensure all errors have proper codes

### 5.2 Remove Code Duplication
- [ ] **Fix `config/environment.ts:183-185`** - Duplicate logging (same warning logged twice)
- [ ] **Fix `middleware/validate.ts:129-163`** - Duplicated error formatting logic
  - `formatZodErrors` and `getFirstError` duplicated locally when they're imported

### 5.3 Rate Limiter Consistency
- [ ] Review `middleware/rateLimit.ts` - Has both Redis-backed and in-memory stores with overlapping configs
- [ ] Consolidate rate limiter configuration
- [ ] Document when to use which implementation

### 5.4 Documentation Gaps
Missing JSDoc documentation in:
- [ ] `services/clientService.ts` - 5+ functions need docs
- [ ] `services/projectService.ts` - 8+ functions need docs
- [ ] `utils/queryOptimization.ts` - 10+ utilities need docs
- [ ] `routes/team.ts` - 6+ endpoints need docs
- [ ] `routes/multiProjectRoutes.ts` - Missing OpenAPI specs
- [ ] `routes/subscriptionRoutes.ts` - Incomplete response schemas
- [ ] `routes/referralRoutes.ts` - Missing all documentation
- [ ] `routes/portfolioRoutes.ts` - Missing all documentation

---

## Priority 6: Performance Optimizations

### 6.1 Memory Leak Prevention
- [ ] **Fix `middleware/rateLimit.ts:37-48`** - Memory stores grow unbounded
  - Add max size limit to `memoryStore` and `stores` Maps
  - Implement LRU eviction when limit reached
- [ ] **Fix `utils/queryOptimization.ts:762-799`** - `queryMetrics` Map grows indefinitely
  - Add max entries limit
  - Implement periodic cleanup beyond TTL

### 6.2 Database Query Optimization
- [ ] **Audit N+1 queries**:
  - `services/clientService.ts:94-96` - findUnique without include
  - `services/projectService.ts:79+` - Multiple separate queries
  - `services/auditService.ts` - findMany without pagination
- [ ] Add query analysis logging in development
- [ ] Implement cursor-based pagination for large lists

### 6.3 Configuration Consolidation
- [ ] **Fix `config/database.ts:136-189`** - Query event handlers duplicated
  - Consolidate dev and production handlers

---

## Priority 7: Security Hardening (Completed & Remaining)

### 7.1 Rate Limiting (COMPLETED)
- [x] Add rate limiting to password reset endpoint - `passwordResetRateLimit` (3 req/hour)
- [x] Add rate limiting to team invite endpoint - `teamInviteRateLimit` (10 req/15min)
- [x] Redis backing already implemented (with in-memory fallback)

### 7.2 Input Validation Improvements
- [ ] **Fix password validation inconsistency**
  - Some endpoints require uppercase/lowercase/number, others don't
  - Standardize across `routes/auth.ts` and all password schemas
- [ ] **Fix email validation** - `utils/validation.ts`
  - Current regex is basic, should use RFC 5322 validation
- [ ] **Fix IP extraction** - `middleware/rateLimit.ts:70-74`
  - `x-forwarded-for` not validated, could be spoofed

### 7.3 Audit Logging Review
- [x] Password reset logging implemented
- [x] Team invite logging implemented
- [ ] Review all audit logs are being captured correctly
- [ ] Add audit logs for:
  - Failed authentication attempts
  - Permission denied events
  - Data export requests
  - Admin actions on user accounts

### 7.4 Token Security
- [ ] **Review `middleware/auth.ts:225-226`** - New tokens in response headers
  - Verify httpOnly flag is set appropriately
  - Consider using secure cookies instead of headers

---

## Priority 8: Frontend Integration

### 8.1 Password Reset UI
- [ ] Create "Forgot Password" page at `/forgot-password`
- [ ] Create "Reset Password" page at `/reset-password?token=xxx`
- [ ] Add form validation matching backend requirements

### 8.2 Team Invite UI
- [ ] Create "Accept Invite" page at `/accept-invite?token=xxx`
- [ ] Add team management to admin dashboard
- [ ] Show pending invites list
- [ ] Add invite form with email and role selection

### 8.3 Figma Integration Update
- [ ] Update Figma API calls to include `projectId` query parameter
- [ ] Handle 401/403 errors appropriately

---

## ✅ COMPLETED: TypeScript Fixes (Sessions 2-3)

**Commits: `cadcf02`, `5923bc6`, `c6bd0ae`, `ed4cdcf`**

### Batch 1 (cadcf02):
- [x] Installed `@types/bcryptjs` for team invite service
- [x] Fixed admin.ts: Added requireAuth/requireAdmin imports
- [x] Fixed milestones.ts: Added requireAuth/requireAdmin imports
- [x] Fixed errorHandler.ts: Changed ZodError `.errors` to `.issues`
- [x] Fixed messages.ts: Changed ZodError `.errors` to `.issues`
- [x] Fixed notifications.ts: Changed ZodError `.errors` to `.issues`
- [x] Fixed passwordReset.ts: Changed ZodError `.errors` to `.issues`
- [x] Fixed sanitize.ts: Changed strictSanitize return type
- [x] Fixed validate.ts: Re-export getFirstError from validators
- [x] Fixed projects.ts: Added NextFunction and AuthenticatedUser imports
- [x] Fixed push.ts: Fixed imports for pushService and AuthenticatedRequest

### Batch 2 (5923bc6):
- [x] Fixed sentry.ts: Added addBreadcrumb export function
- [x] Fixed performance.ts: Fixed addBreadcrumb calls signature
- [x] Fixed notifications.ts: Fixed deleteNotification -> delete method call
- [x] Fixed push.ts: Use authenticate middleware instead of requireAuth
- [x] Fixed revisions.ts: Changed ZodError `.errors` to `.issues`

### Batch 3 (c6bd0ae):
- [x] Fixed referralRoutes.ts: Completely rewrote to match referralService API
- [x] Fixed portfolioRoutes.ts: Updated to match portfolioService API

### Batch 4 (ed4cdcf):
- [x] Added `teamInviteRateLimit` to rateLimit.ts (10 req/15min)
- [x] Applied rate limiting to team invite public endpoints
- [x] Updated middleware/index.ts to export all rate limiters
- [x] Added missing service exports to services/index.ts

**Build Status:**
- Build has errors due to Prisma client not being generated (network blocked)
- Remaining errors are all Prisma-related (implicit `any` types from query results)
- Build will succeed once `npx prisma generate` runs successfully

---

## ✅ COMPLETED: PR #62 - Figma Endpoint Protection

**Implemented in commit `d5fb777`**

- [x] Created `requireProjectAccess` middleware in `server/src/middleware/auth.ts`
- [x] Middleware checks `ProjectAssignment` table with `unassignedAt: null`
- [x] Protected `/file/:fileKey` and `/file/:fileKey/nodes` endpoints
- [x] Requires `projectId` query parameter
- [x] Allows admin/team bypass
- [x] Falls back to checking project client ownership

---

## ✅ COMPLETED: Password Reset Flow

**Implemented in commit `f6db03c`**

- [x] Created `server/src/services/passwordResetService.ts`
- [x] Implements `createResetToken`, `validateToken`, `resetPassword`
- [x] Tokens hashed with SHA-256, expire after 1 hour
- [x] Added password reset email template
- [x] Routes: `POST /api/auth/password/reset-request`, `validate-token`, `reset`

---

## ✅ COMPLETED: Team Invite Flow

**Implemented in commit `244097e`**

- [x] Created `server/src/services/teamInviteService.ts`
- [x] Implements `createInvite`, `validateInvite`, `acceptInvite`, `resendInvite`, `cancelInvite`
- [x] Tokens expire after 7 days
- [x] All CRUD routes implemented

---

## Session Start Checklist

When starting the next session:

1. [ ] Check current branch: `git branch`
2. [ ] Pull latest changes: `git pull origin claude/review-merge-issues-34jvV`
3. [ ] Check for uncommitted changes: `git status`
4. [ ] Run `npm install` in server/ and kaa-app/
5. [ ] Run `npx prisma generate`
6. [ ] Verify build works: `npm run build`
7. [ ] Review this TODO list and pick priority items

---

## Summary Statistics

| Category | Count | Status |
|----------|-------|--------|
| Critical Security Issues | 5 | **MUST FIX** |
| Incomplete Features | 3 | Blocking |
| Type Safety Issues (`any`) | 73+ | Medium |
| Missing Tests | 15+ | High |
| Code Quality Issues | 12 | Medium |
| Documentation Gaps | 30+ | Low |
| Performance Concerns | 5 | Low-Medium |

**Total Action Items: 80+**

---

## Recent Commits

```
ed4cdcf feat: Add rate limiting for team invites and update service exports
c6bd0ae fix: Align referralRoutes and portfolioRoutes with service APIs
5923bc6 fix: Additional TypeScript fixes for routes and config
cadcf02 fix: Resolve TypeScript errors in routes and middleware
244097e feat: Implement team invite flow with secure token handling
f6db03c feat: Implement password reset flow with secure token handling
d5fb777 feat: Add Figma endpoint protection with project access check
```

---

*Last updated: 2026-01-11 (Session 3 - Deep Review)*
*Branch: claude/review-merge-issues-34jvV*
