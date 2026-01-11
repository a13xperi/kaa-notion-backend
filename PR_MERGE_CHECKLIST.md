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

## Phase 1: Foundation (Low Risk)

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [ ] | #16 | Prisma version alignment | Node >=18, prisma ^7.2.0, .nvmrc |
| [ ] | #22 | Deployment readiness | Build scripts, .gitignore, railway.json |
| [ ] | #47 | Database setup docs | ENVIRONMENT_REFERENCE.md, server imports |

**After Phase 1:**
- [ ] Run `npm install` in both server/ and kaa-app/
- [ ] Run `npx prisma generate`
- [ ] Verify build passes: `npm run build`

---

## Phase 2: Core Auth (Review Carefully)

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [ ] | #67 | JWT unification with jsonwebtoken | Large PR (131 files), foundation for auth PRs |
| [ ] | #68 | Production env security | Strong JWT, CORS allowlist, Stripe webhook checks |

**After Phase 2:**
- [ ] Verify JWT_SECRET validation works in production mode
- [ ] Test login/register flows
- [ ] Check CORS configuration loads correctly

---

## Phase 3: Auth Extensions

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [ ] | #65 | Notion admin shared auth middleware | Clean integration |
| [ ] | #64 | Portal API JWT Authorization | Import fix applied |
| [ ] | #62 | Figma file endpoint protection | **IMPORTANT: Add unassignedAt: null check** |

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
- [ ] Test Notion admin endpoints require auth
- [ ] Test Portal API uses JWT headers
- [ ] Verify former project members can't access Figma files

---

## Phase 4: Schema Migrations

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [ ] | #66 | Password reset tokens | New PasswordResetToken model |
| [ ] | #61 | Secure team invites | inviteToken fields on TeamMember |

**After Phase 4:**
- [ ] Run `npx prisma migrate dev` to apply schema changes
- [ ] Verify new tables created: PasswordResetToken
- [ ] Test password reset flow end-to-end
- [ ] Test team invite flow with hashed tokens

---

## Phase 5: Route Hardening

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [ ] | #63 | Route validation and sanitization | Password fix already applied |

**After Phase 5:**
- [ ] Test login with passwords containing special chars: `P@ss<>word!`
- [ ] Verify XSS patterns blocked on non-password fields
- [ ] Run validation regression tests

---

## Phase 6: Features

| Status | PR | Title | Notes |
|--------|-----|-------|-------|
| [ ] | #60 | Delete deliverable files from storage | Import fix applied, retry logic |
| [ ] | #59 | Batch deliverable download | Import fix applied, Download All UI |
| [ ] | #9 | Tier config module | Foundation for #11 |
| [ ] | #11 | Sage intake flow with tier routing | Depends on #9 |

**After Phase 6:**
- [ ] Test deliverable deletion removes files from storage
- [ ] Test batch download generates signed URLs
- [ ] Verify tier routing works for intake form

---

## Phase 7: Final Integration

- [ ] Run full test suite: `npm test`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Build production bundle: `npm run build`
- [ ] Review all TypeScript errors resolved
- [ ] Create PR from a13xperi fork to aitkenassociates master
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

### Key Files Modified by Fixes
- `server/src/middleware/sanitize.ts` - Password field exclusions
- `server/src/routes/deliverables.ts` - Added middleware imports
- `server/src/routes/projects.ts` - Added middleware imports
- `server/src/config/cors.ts` - FRONTEND_URL fallback
- `server/src/config/environment.ts` - CORS warning

---

*Last updated: 2026-01-11*
