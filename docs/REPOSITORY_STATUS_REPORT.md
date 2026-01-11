# SAGE MVP Platform - Repository Status Report

**Generated:** 2026-01-11
**Prepared for:** Notion Documentation

---

## Executive Summary

The SAGE MVP Platform is in active development with **two synchronized repositories**:

| Repository | Purpose | Status |
|------------|---------|--------|
| **aitkenassociates/kaa-notion-backend** | Production repository | Active, 328 commits |
| **a13xperi/kaa-notion-backend** | Development fork | 18 open PRs pending merge |

**Current Focus:** Consolidating 18 PRs from the development fork into the production repository through a 7-phase integration plan.

---

## Repository Comparison

### aitkenassociates/kaa-notion-backend (Production)

| Metric | Value |
|--------|-------|
| Total Commits | 328 |
| Remote Branches | 55 |
| Current Branch | `claude/review-merge-issues-34jvV` |
| Working Status | Clean |
| Main Branch | Not yet created (in consolidation) |

**Recent Activity:**
```
fb52fbf docs: Add PR merge checklist for integration roadmap
ef46b32 fix: Address PR blocker issues before merge
c15c3d4 Merge PR #6: fix-signin-error
e49c33d Merge: align-documentation-version (resolve auth.ts conflict)
d2a2f91 fix: Update index verification script
```

### a13xperi/kaa-notion-backend (Development Fork)

| Metric | Value |
|--------|-------|
| Total Commits | 219 (on portal-auth-upload) |
| Open PRs | 18 |
| Default Branch | portal-auth-upload |
| Stars | 0 |
| Forks | 1 |

---

## Open PRs Awaiting Integration

### Security & Authentication (PRs #61-68) - `codex` labeled

| PR | Title | Risk | Dependencies |
|----|-------|------|--------------|
| #68 | Enforce production env security: strong JWT, CORS allowlist, Stripe webhook | MEDIUM | Depends on #67 |
| #67 | Unify JWT handling with jsonwebtoken | MEDIUM | Foundation PR |
| #66 | Add persistent password reset tokens | MEDIUM | Schema migration |
| #65 | Use shared auth middleware for Notion admin routes | LOW | Depends on #67 |
| #64 | Portal API: use JWT Authorization header | MEDIUM | Depends on #67 |
| #63 | Harden route validation and add regression tests | HIGH | **Blocker fixed** |
| #62 | Protect Figma file endpoints with auth | MEDIUM | **Needs unassignedAt fix** |
| #61 | Secure team invites with hashed passwords | MEDIUM | Schema migration |

### Feature PRs (#59-60)

| PR | Title | Risk | Dependencies |
|----|-------|------|--------------|
| #60 | Delete deliverable files from storage with retry | LOW | Import fix applied |
| #59 | Add batch deliverable download endpoint | LOW | Import fix applied |

### Infrastructure PRs (#1-47)

| PR | Title | Risk | Dependencies |
|----|-------|------|--------------|
| #47 | docs: Add database setup instructions | LOW | None |
| #22 | fix: Deployment readiness improvements | LOW | None |
| #16 | fix: Align prisma and @prisma/client versions | LOW | Foundation PR |
| #11 | feat: Implement Sage intake flow with tier routing | LOW | Depends on #9 |
| #9 | feat: Add tier config module and router utility | LOW | Foundation PR |
| #4 | feat: Add Prisma client wrapper | LOW | Superseded by #16 |
| #2 | docs: Add MVP execution plan | LOW | Docs only |
| #1 | Add comprehensive dependency audit report | LOW | Docs only |

---

## Blockers Identified & Fixed

### 1. Password Sanitization Issue (PR #63)
**Problem:** `strictSanitize` middleware HTML-encoded password characters, breaking login for users with special characters in passwords.

**Fix Applied:** Added `EXCLUDED_FIELDS` set to skip password fields from HTML encoding while still removing null bytes.

**Files Modified:**
- `server/src/middleware/sanitize.ts`

### 2. Missing Middleware Imports (PRs #60, #59, #64)
**Problem:** `requireAuth` and `requireAdmin` used but not imported, causing build failures.

**Fix Applied:** Added proper imports from `../middleware`.

**Files Modified:**
- `server/src/routes/deliverables.ts`
- `server/src/routes/projects.ts`

### 3. CORS Configuration Gap (PR #68)
**Problem:** Environment validated `FRONTEND_URL` but CORS middleware only read `CORS_ORIGINS`.

**Fix Applied:** CORS now falls back to `FRONTEND_URL` if `CORS_ORIGINS` not set. Added production warning.

**Files Modified:**
- `server/src/config/cors.ts`
- `server/src/config/environment.ts`

### 4. Figma Access Check (PR #62) - PENDING
**Problem:** Former project members can still access Figma files because `unassignedAt` isn't checked.

**Fix Required:** Add `unassignedAt: null` to access check query when merging PR #62.

---

## Architecture Overview

### Monorepo Structure

```
kaa-notion-backend/
├── kaa-app/          # React Frontend (v0.1.0)
│   ├── src/
│   │   ├── api/          # API clients
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── pages/        # Route pages
│   │   └── config/       # Configuration
│   └── e2e/              # Playwright E2E tests
│
├── server/           # Node.js Backend (v1.0.0)
│   ├── src/
│   │   ├── routes/       # Express routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── config/       # Configuration
│   │   └── utils/        # Utilities
│   └── prisma/           # Database schema
│
├── shared/           # Shared Types (@sage/shared-types)
│
└── docs/             # Documentation (49 files)
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19.1, TypeScript 4.9.5, React Router 6 |
| Backend | Node.js 20, Express 4.21, TypeScript 5.0 |
| Database | PostgreSQL (Supabase), Prisma 7.2.0 |
| Auth | JWT (jsonwebtoken), bcrypt |
| Payments | Stripe (Checkout, Webhooks) |
| Storage | Supabase Storage |
| Email | Resend |
| Cache | Redis (ioredis) |
| Monitoring | Sentry |
| Testing | Jest, Playwright |

### Service Tiers

| Tier | Name | Price | Description |
|------|------|-------|-------------|
| 1 | The Concept | $299 | DIY guidance, automated design |
| 2 | The Builder | $1,499 | Low-touch with checkpoints |
| 3 | The Concierge | $4,999 | Site visits, hybrid approach |
| 4 | White Glove | Custom | Full service, invitation-only |

---

## Database Schema Summary

### Core Entities

| Entity | Purpose |
|--------|---------|
| User | Authentication, roles (KAA_CLIENT, SAGE_CLIENT, TEAM, ADMIN) |
| Client | Tier-based clients with subscription support |
| Lead | Lead intake with tier recommendation |
| Project | Project management with milestones |
| Payment | Stripe payment tracking |
| Deliverable | File uploads to Supabase Storage |

### Supporting Entities

| Entity | Purpose |
|--------|---------|
| Subscription | Stripe subscription tracking |
| TeamMember | Team collaboration |
| ProjectAssignment | Project team assignments |
| Notification | User notifications |
| Message | Project messaging |
| RevisionRequest | Milestone feedback loop |
| DesignIdea | Pinterest/image inspiration |
| SyncJob | Notion synchronization queue |
| PasswordResetToken | Secure password reset |
| PushSubscription | Web push notifications |

---

## Test Coverage

| Area | Tests | Status |
|------|-------|--------|
| Backend | 262 | Passing |
| Frontend | 595 | Passing |
| **Total** | **857** | **All Passing** |

### Test Types
- Unit tests (Jest)
- Integration tests (server)
- Component tests (React Testing Library)
- E2E tests (Playwright)

---

## CI/CD Pipeline

### Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| ci.yml | Push/PR to main/develop | Full test suite, Docker build, Deploy |
| build.yml | Push/PR | Build validation |
| e2e-tests.yml | Manual/Push | Playwright E2E tests |
| lint.yml | Push/PR | ESLint checks |
| unit-tests.yml | Push/PR | Jest unit tests |
| sync-to-upstream.yml | Push to portal-auth-upload | Sync to a13xperi fork |

### Deployment Targets

| Environment | Branch | Target |
|-------------|--------|--------|
| Staging | develop | Auto-deploy |
| Production | main | Manual approval |

---

## Integration Roadmap

### Phase 1: Foundation (Low Risk)
- [ ] PR #16 - Prisma version alignment
- [ ] PR #22 - Deployment readiness
- [ ] PR #47 - Database setup docs

### Phase 2: Core Auth (Medium Risk)
- [ ] PR #67 - JWT unification
- [ ] PR #68 - Production security

### Phase 3: Auth Extensions
- [ ] PR #65 - Notion admin auth
- [ ] PR #64 - Portal API auth
- [ ] PR #62 - Figma protection (**add unassignedAt fix**)

### Phase 4: Schema Migrations
- [ ] PR #66 - Password reset tokens
- [ ] PR #61 - Secure team invites

### Phase 5: Route Hardening
- [ ] PR #63 - Route validation (**blocker fixed**)

### Phase 6: Features
- [ ] PR #60 - Delete deliverables
- [ ] PR #59 - Batch download
- [ ] PR #9 - Tier config
- [ ] PR #11 - Sage intake

### Phase 7: Final Sync
- [ ] Run full test suite
- [ ] Create PR to aitkenassociates master
- [ ] Deploy to production

---

## Key Contacts & Resources

### Repository URLs
- **Production:** https://github.com/aitkenassociates/kaa-notion-backend
- **Development Fork:** https://github.com/a13xperi/kaa-notion-backend

### Documentation Files
- `PR_MERGE_CHECKLIST.md` - Integration checklist
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `SETUP_GUIDE.md` - Initial setup
- `README_TESTING.md` - Testing strategy

---

## Next Steps

1. **Set up Notion MCP Server** for direct documentation sync
2. **Begin Phase 1** - Merge foundation PRs (#16, #22, #47)
3. **Run test suite** after each phase
4. **Create main branch** after full integration
5. **Deploy to production** with proper CI/CD

---

*This report is auto-generated and should be synced to Notion for team visibility.*
