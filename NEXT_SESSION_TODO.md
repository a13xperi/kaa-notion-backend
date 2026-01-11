# Next Claude Code Session - TODO List

This document outlines the work to be done in the next Claude Code session after the PR integration is merged.

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

## Priority 2: Deferred PR #62 - Figma Endpoint Protection

### 2.1 Research Current Implementation
- [ ] Read `server/src/routes/figma.ts` (or similar) to understand current Figma endpoints
- [ ] Identify all endpoints that expose Figma file access
- [ ] Check current authorization logic

### 2.2 Create Project Assignment Middleware
- [ ] Create new middleware `requireProjectAccess` in `server/src/middleware/`
- [ ] Middleware must check `ProjectAssignment` table
- [ ] **CRITICAL**: Include `unassignedAt: null` in query to exclude former members
  ```typescript
  const assignment = await prisma.projectAssignment.findFirst({
    where: {
      projectId: projectId,
      userId: userId,
      unassignedAt: null  // Only current members
    }
  });
  ```
- [ ] Return 403 if no valid assignment found
- [ ] Add proper error messages

### 2.3 Apply Middleware to Figma Routes
- [ ] Import new middleware in Figma routes file
- [ ] Apply to all Figma file access endpoints
- [ ] Test with assigned user (should work)
- [ ] Test with unassigned user (should fail)
- [ ] Test with user who was previously assigned then unassigned (should fail)

### 2.4 Testing
- [ ] Write unit tests for `requireProjectAccess` middleware
- [ ] Write integration tests for Figma endpoints
- [ ] Test edge cases:
  - User never assigned
  - User currently assigned
  - User previously assigned, now unassigned
  - Admin bypass (if applicable)
  - Team member access

---

## Priority 3: Password Reset Flow Implementation

### 3.1 Create Password Reset Service
- [ ] Create `server/src/services/passwordResetService.ts`
- [ ] Implement `createResetToken(email: string)`:
  - Generate secure random token (crypto.randomBytes)
  - Hash token with SHA-256 before storing
  - Set expiration (e.g., 1 hour)
  - Store in `PasswordResetToken` table
  - Return unhashed token for email
- [ ] Implement `validateResetToken(token: string)`:
  - Hash provided token
  - Look up in database
  - Check not expired
  - Check not already used
- [ ] Implement `resetPassword(token: string, newPassword: string)`:
  - Validate token
  - Hash new password
  - Update user's passwordHash
  - Mark token as used (set usedAt)

### 3.2 Create Password Reset Routes
- [ ] Add `POST /api/auth/forgot-password` endpoint:
  - Accept email
  - Create reset token
  - Send email with reset link (or return token in dev)
  - Always return success (don't leak user existence)
- [ ] Add `POST /api/auth/reset-password` endpoint:
  - Accept token and new password
  - Validate token
  - Reset password
  - Invalidate all existing sessions (optional)

### 3.3 Email Integration
- [ ] Check if email service exists (nodemailer, SendGrid, etc.)
- [ ] Create password reset email template
- [ ] Implement email sending in forgot-password flow
- [ ] Handle email failures gracefully

### 3.4 Testing
- [ ] Test full password reset flow end-to-end
- [ ] Test expired token rejection
- [ ] Test already-used token rejection
- [ ] Test invalid token rejection
- [ ] Test password complexity validation

---

## Priority 4: Team Invite Flow Implementation

### 4.1 Create Team Invite Service
- [ ] Create `server/src/services/teamInviteService.ts`
- [ ] Implement `createInvite(email: string, role: TeamRole, invitedById: string)`:
  - Generate secure invite token
  - Set expiration (e.g., 7 days)
  - Create TeamMember record with pending status
  - Return invite token/link
- [ ] Implement `acceptInvite(token: string, userData: {...})`:
  - Validate token not expired
  - Create user account if needed
  - Link user to TeamMember record
  - Set acceptedAt timestamp
  - Clear invite token

### 4.2 Create Team Invite Routes
- [ ] Add `POST /api/team/invite` endpoint (admin only):
  - Accept email and role
  - Create invite
  - Send invite email
- [ ] Add `GET /api/team/invite/:token` endpoint:
  - Validate token
  - Return invite details (role, inviter, etc.)
- [ ] Add `POST /api/team/invite/:token/accept` endpoint:
  - Accept invite with user details
  - Create/link user account

### 4.3 Testing
- [ ] Test invite creation
- [ ] Test invite acceptance
- [ ] Test expired invite rejection
- [ ] Test duplicate invite handling

---

## Priority 5: Security Hardening

### 5.1 Rate Limiting
- [ ] Add rate limiting to auth endpoints:
  - `/api/auth/login` - 5 attempts per 15 minutes per IP
  - `/api/auth/register` - 3 attempts per hour per IP
  - `/api/auth/forgot-password` - 3 attempts per hour per email
- [ ] Implement using express-rate-limit or similar
- [ ] Add Redis backing for distributed rate limiting

### 5.2 Audit Logging Improvements
- [ ] Review all sensitive operations have audit logs
- [ ] Add audit log for:
  - Password reset requests
  - Password changes
  - Team invite creation/acceptance
  - Role changes
  - Project assignment changes
- [ ] Consider log retention policy

### 5.3 Session Management
- [ ] Implement session invalidation on password change
- [ ] Add "logout all devices" functionality
- [ ] Consider refresh token rotation

### 5.4 Input Validation Review
- [ ] Review all route input validation
- [ ] Ensure Zod schemas cover all edge cases
- [ ] Add validation for file uploads (size, type)

---

## Priority 6: API Documentation

### 6.1 OpenAPI/Swagger Updates
- [ ] Update OpenAPI spec for new endpoints:
  - `POST /api/projects/:id/deliverables/batch-download`
  - Password reset endpoints
  - Team invite endpoints
- [ ] Add request/response schemas
- [ ] Add authentication requirements
- [ ] Add error response documentation

### 6.2 Developer Documentation
- [ ] Update README with new features
- [ ] Document environment variables
- [ ] Document database migrations
- [ ] Add API usage examples

---

## Priority 7: Frontend Integration

### 7.1 Batch Download UI
- [ ] Add "Download All" button to deliverables list
- [ ] Implement file selection for batch download
- [ ] Handle download progress/status
- [ ] Consider ZIP packaging for multiple files

### 7.2 Password Reset UI
- [ ] Create "Forgot Password" page
- [ ] Create "Reset Password" page
- [ ] Add form validation
- [ ] Handle success/error states

### 7.3 Team Invite UI
- [ ] Create team management page (admin)
- [ ] Add invite form
- [ ] Create invite acceptance page
- [ ] Show pending invites list

---

## Priority 8: Performance & Monitoring

### 8.1 Database Optimization
- [ ] Review new indexes are effective
- [ ] Add composite indexes if needed
- [ ] Check query performance with EXPLAIN

### 8.2 Monitoring
- [ ] Add metrics for new endpoints
- [ ] Monitor password reset attempts (detect abuse)
- [ ] Monitor storage deletion success rate
- [ ] Add alerting for failed operations

### 8.3 Caching
- [ ] Consider caching for frequently accessed data
- [ ] Implement cache invalidation strategy

---

## Priority 9: Cleanup & Technical Debt

### 9.1 Code Cleanup
- [ ] Remove any TODO comments that are now done
- [ ] Fix remaining TypeScript `any` types
- [ ] Standardize error handling across routes
- [ ] Review and remove unused imports

### 9.2 Test Coverage
- [ ] Add missing unit tests
- [ ] Add integration tests for new features
- [ ] Aim for 80%+ coverage on new code

### 9.3 Documentation Cleanup
- [ ] Archive PR_MERGE_CHECKLIST.md (move to docs/archive/)
- [ ] Update REPOSITORY_STATUS_REPORT.md
- [ ] Close completed items in POST_MERGE_TODO.md

---

## Priority 10: Future Enhancements (Backlog)

### 10.1 Deliverables
- [ ] Add ZIP download for batch (server-side packaging)
- [ ] Add deliverable versioning
- [ ] Add deliverable preview thumbnails

### 10.2 Team Management
- [ ] Add team member deactivation (soft delete)
- [ ] Add role change history
- [ ] Add team activity feed

### 10.3 Notifications
- [ ] Email notifications for project updates
- [ ] In-app notification center
- [ ] Push notification support

### 10.4 Analytics
- [ ] Project progress tracking
- [ ] Team performance metrics
- [ ] Client engagement analytics

---

## Session Start Checklist

When starting the next session:

1. [ ] Check current branch: `git branch`
2. [ ] Pull latest changes: `git pull origin master`
3. [ ] Check for uncommitted changes: `git status`
4. [ ] Run `npm install` in server/ and kaa-app/
5. [ ] Run `npx prisma generate`
6. [ ] Verify build works: `npm run build`
7. [ ] Review this TODO list and pick priority items

---

## Notes

- PR #62 (Figma protection) is the highest priority deferred work
- Password reset and team invite flows use the new schema added in this PR
- All new features should follow existing patterns in the codebase
- Test thoroughly before committing

---

*Created: 2026-01-11*
*Last PR: claude/review-merge-issues-34jvV*
