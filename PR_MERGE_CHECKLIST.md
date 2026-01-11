# PR Integration Checklist

## Overview
This checklist tracks the integration of PRs from the a13xperi fork into the aitkenassociates/kaa-notion-backend master branch.

**Branch with blocker fixes:** `claude/review-merge-issues-34jvV`

---

## Pre-Merge Fixes Applied
- [x] Fix strictSanitize breaking passwords (PR #63 blocker)
- [x] Add missing requireAuth/requireAdmin imports in deliverables.ts
- [x] Add missing requireAuth/requireAdmin imports in projects.ts
- [x] Add CORS fallback to FRONTEND_URL when CORS_ORIGINS not set
- [x] Add production warning for missing CORS configuration

---

## Phase 1: Foundation (Low Risk) - COMPLETED

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [x] | #16 | Prisma version alignment | Node >=18, prisma ^7.2.0, .nvmrc |
| [x] | #22 | Deployment readiness | Build scripts, .gitignore, railway.json |
| [x] | #47 | Database setup docs | ENVIRONMENT_REFERENCE.md, server imports |

**After Phase 1:**
- [x] Run `npm install` in both server/ and kaa-app/
- [x] Run `npx prisma generate`
- [x] Verify build passes: `npm run build`

---

## Phase 2: Core Auth (Review Carefully) - COMPLETED

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [x] | #67 | JWT unification with jsonwebtoken | Already in codebase |
| [x] | #68 | Production env security | Strong JWT, CORS allowlist, Stripe webhook checks |

**After Phase 2:**
- [x] Verify JWT_SECRET validation works in production mode
- [x] Test login/register flows
- [x] Check CORS configuration loads correctly

---

## Phase 3: Auth Extensions - COMPLETED

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [x] | #65 | Notion admin shared auth middleware | Clean integration |
| [x] | #64 | Portal API JWT Authorization | Import fix applied |
| [~] | #62 | Figma file endpoint protection | Deferred - needs new middleware |

**PR #62 Required Fix:**
```typescript
// In Figma access check, ensure former members can't access:
where: {
  projectId: projectId,
  userId: userId,
  unassignedAt: null  // <-- ADD THIS LINE
}
```

**After Phase 3:**
- [x] Test Notion admin endpoints require auth
- [x] Test Portal API uses JWT headers
- [ ] Verify former project members can't access Figma files (pending #62)

---

## Phase 4: Schema Migrations - COMPLETED

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [x] | #66 | Password reset tokens | New PasswordResetToken model |
| [x] | #61 | Secure team invites | inviteToken fields on TeamMember |

**After Phase 4:**
- [ ] Run `npx prisma migrate dev` to apply schema changes
- [ ] Verify new tables created: PasswordResetToken
- [ ] Test password reset flow end-to-end
- [ ] Test team invite flow with hashed tokens

---

## Phase 5: Route Hardening - COMPLETED

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [x] | #63 | Route validation and sanitization | Password fix already applied |

**After Phase 5:**
- [x] Test login with passwords containing special chars: `P@ss<>word!`
- [x] Verify XSS patterns blocked on non-password fields
- [ ] Run validation regression tests

---

## Phase 6: Features - COMPLETED

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [x] | #60 | Delete deliverable files from storage | Retry logic with exponential backoff |
| [x] | #59 | Batch deliverable download | batch-download endpoint with signed URLs |
| [x] | #9 | Tier config module | Already in codebase (tierRouter.ts) |
| [x] | #11 | Sage intake flow with tier routing | Already in leads.ts |

**After Phase 6:**
- [x] Test deliverable deletion removes files from storage
- [x] Test batch download generates signed URLs
- [x] Verify tier routing works for intake form

---

## Phase 7: Final Integration

- [ ] Run full test suite: `npm test`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Build production bundle: `npm run build`
- [ ] Review all TypeScript errors resolved
- [ ] Create PR from claude/review-merge-issues-34jvV to aitkenassociates master
- [ ] Merge to aitkenassociates/kaa-notion-backend master

---

## Rollback Plan

If issues arise after merging a phase:
1. Identify the problematic PR
2. `git revert <commit-hash>` for that PR's merge commit
3. Push revert to master
4. Fix the issue on a separate branch
5. Re-merge after fix verified

---

## Notes

### PRs Not Included (Documentation/Planning)
- #2 - MVP execution plan (docs only)
- #1 - Dependency audit report (docs only)
- #4 - Prisma client wrapper (superseded by #16)

### Key Files Modified

**Pre-existing blocker fixes:**
- `server/src/middleware/sanitize.ts` - Password field exclusions
- `server/src/routes/deliverables.ts` - Added middleware imports + storage cleanup + batch download
- `server/src/routes/projects.ts` - Added middleware imports
- `server/src/config/cors.ts` - FRONTEND_URL fallback
- `server/src/config/environment.ts` - Production fatal errors

**New additions:**
- `.nvmrc` - Node 20
- `DEPLOYMENT_CHECKLIST.md` - Deployment guide
- `prisma/schema.prisma` - PasswordResetToken model, TeamMember invite fields
- `server/src/routes/notion.ts` - Shared JWT middleware

---

## Commits in Integration Branch

1. `feat: Integrate Phase 1 foundation PRs (#16, #22, #47)`
2. `feat: Enforce production security checks (PR #68)`
3. `feat: Use shared JWT middleware for Notion admin routes (PR #65)`
4. `feat: Add password reset tokens and team invite tokens (PRs #66, #61)`
5. `feat: Add storage cleanup and batch download for deliverables (PRs #60, #59)`

---

*Last updated: 2026-01-11*
