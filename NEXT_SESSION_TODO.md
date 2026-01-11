# Next Claude Code Session - TODO List

This document outlines the work to be done in the next Claude Code session after the PR integration is merged.

**Last Updated:** 2026-01-11
**Branch:** `claude/review-merge-issues-34jvV`

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

## ✅ COMPLETED: TypeScript Fixes (Session 2)

**Implemented in commit `cadcf02`**

- [x] Installed `@types/bcryptjs` for team invite service
- [x] Fixed admin.ts: Added requireAuth/requireAdmin imports, use authMiddleware pattern
- [x] Fixed milestones.ts: Added requireAuth/requireAdmin imports, use authMiddleware pattern
- [x] Fixed errorHandler.ts: Changed ZodError `.errors` to `.issues`
- [x] Fixed messages.ts: Changed ZodError `.errors` to `.issues`
- [x] Fixed notifications.ts: Changed ZodError `.errors` to `.issues`
- [x] Fixed passwordReset.ts: Changed ZodError `.errors` to `.issues`, fixed sendPasswordResetEmail call
- [x] Fixed sanitize.ts: Changed strictSanitize return type to `void | Response`
- [x] Fixed validate.ts: Re-export getFirstError from validators
- [x] Fixed projects.ts: Added NextFunction and AuthenticatedUser imports
- [x] Fixed push.ts: Fixed imports for pushService and AuthenticatedRequest

**Build Status:**
- Build still has errors due to Prisma client not being generated (network blocked)
- Most remaining errors are Prisma-related (missing types) or implicit any types
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

**Files Modified:**
- `server/src/middleware/auth.ts` - Added `requireProjectAccess` function
- `server/src/middleware/index.ts` - Exported new middleware
- `server/src/index.ts` - Applied middleware to Figma routes

---

## ✅ COMPLETED: Password Reset Flow

**Implemented in commit `f6db03c`**

- [x] Created `server/src/services/passwordResetService.ts`
- [x] Implements `createResetToken`, `validateToken`, `resetPassword`
- [x] Tokens hashed with SHA-256, expire after 1 hour
- [x] Added password reset email template to `emailService.ts`
- [x] Routes added to auth router:
  - `POST /api/auth/password/reset-request`
  - `POST /api/auth/password/validate-token`
  - `POST /api/auth/password/reset`
- [x] In development mode, returns token for testing

**Files Created:**
- `server/src/services/passwordResetService.ts`

**Files Modified:**
- `server/src/services/authService.ts`
- `server/src/services/emailService.ts`
- `server/src/routes/auth.ts`

---

## ✅ COMPLETED: Team Invite Flow

**Implemented in commit `244097e`**

- [x] Created `server/src/services/teamInviteService.ts`
- [x] Implements `createInvite`, `validateInvite`, `acceptInvite`, `resendInvite`, `cancelInvite`
- [x] Tokens expire after 7 days
- [x] Creates placeholder user until invite accepted
- [x] Routes added:
  - `POST /api/team/invite` - Create invite (admin)
  - `GET /api/team/invite/:token` - Validate invite (public)
  - `POST /api/team/invite/:token/accept` - Accept invite (public)
  - `POST /api/team/invite/:id/resend` - Resend invite (admin)
  - `DELETE /api/team/invite/:id` - Cancel invite (admin)
  - `GET /api/team/invites` - List pending (admin)
  - `GET /api/team/members` - List members (admin)
  - `PATCH /api/team/members/:id` - Update member (admin)

**Files Created:**
- `server/src/services/teamInviteService.ts`
- `server/src/routes/team.ts`

**Files Modified:**
- `server/src/routes/index.ts`
- `server/src/index.ts`

---

## Priority 4: Testing New Features

### 4.1 Password Reset Testing
- [ ] Test reset request with valid email
- [ ] Test reset request with invalid email (should still succeed)
- [ ] Test token validation
- [ ] Test password reset with valid token
- [ ] Test password reset with expired token
- [ ] Test password reset with already-used token
- [ ] Test password strength validation

### 4.2 Team Invite Testing
- [ ] Test invite creation by admin
- [ ] Test invite creation by non-admin (should fail)
- [ ] Test invite validation
- [ ] Test invite acceptance with valid data
- [ ] Test invite acceptance with weak password
- [ ] Test invite resend
- [ ] Test invite cancellation
- [ ] Test listing pending invites
- [ ] Test listing team members

### 4.3 Figma Protection Testing
- [ ] Test access with valid project assignment
- [ ] Test access with no assignment (should fail)
- [ ] Test access with unassigned (former) member (should fail)
- [ ] Test admin bypass works
- [ ] Test client owner access works

---

## Priority 5: Security Hardening

### 5.1 Rate Limiting
- [ ] Add rate limiting to password reset endpoint (prevent abuse)
- [ ] Add rate limiting to team invite endpoint
- [ ] Consider Redis backing for distributed rate limiting

### 5.2 Audit Logging Review
- [x] Password reset logging implemented
- [x] Team invite logging implemented
- [ ] Review all audit logs are being captured correctly

---

## Priority 6: Frontend Integration

### 6.1 Password Reset UI
- [ ] Create "Forgot Password" page at `/forgot-password`
- [ ] Create "Reset Password" page at `/reset-password?token=xxx`
- [ ] Add form validation matching backend requirements

### 6.2 Team Invite UI
- [ ] Create "Accept Invite" page at `/accept-invite?token=xxx`
- [ ] Add team management to admin dashboard
- [ ] Show pending invites list
- [ ] Add invite form with email and role selection

### 6.3 Figma Integration Update
- [ ] Update Figma API calls to include `projectId` query parameter
- [ ] Handle 401/403 errors appropriately

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

## Recent Commits

```
cadcf02 fix: Resolve TypeScript errors in routes and middleware
b84b404 docs: Update TODO with completed implementations
244097e feat: Implement team invite flow with secure token handling
f6db03c feat: Implement password reset flow with secure token handling
d5fb777 feat: Add Figma endpoint protection with project access check (PR #62)
fce4a2b docs: Add comprehensive TODO list for next session
7a20c6b docs: Add post-merge checklist for deployment
09f6d97 fix: Add TypeScript type annotations to batch download
74403c0 docs: Update PR merge checklist with completed phases
49c4365 feat: Add storage cleanup and batch download for deliverables (PRs #60, #59)
1650daa feat: Add password reset tokens and team invite tokens (PRs #66, #61)
```

---

*Last updated: 2026-01-11 (Session 2)*
*Branch: claude/review-merge-issues-34jvV*
