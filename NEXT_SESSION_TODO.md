# kaa-notion-backend - Actionable TODO List

**Last Updated:** 2026-01-11
**Branch:** `claude/review-merge-issues-34jvV`
**Code Quality Score:** 7.5/10 | **Production Readiness:** 7/10

---

## COMPLETED TASKS (Session 3)

### ✅ Task 1: Fix Development Auth Bypass (CRITICAL)
**Commit:** `02998cf`
- [x] Added `ALLOW_DEV_AUTH_BYPASS=true` requirement
- [x] Added warning logs when bypass is used
- [x] Documented in .env.example

### ✅ Task 2: Replace console.* with Logger
**Commit:** `02998cf`
- [x] Fixed `middleware/auth.ts` - 4 console.error → logger.error
- [x] Fixed `middleware/sanitize.ts` - 4 console.warn/error → logger

### ✅ Task 3: Add Stripe Config Validation
**Commit:** `02998cf`
- [x] Added `STRIPE_OPTIONAL` flag for graceful degradation
- [x] Throw error in production if not configured
- [x] Added `isStripeEnabled` and `requireStripe` exports
- [x] Documented in .env.example

### ✅ Task 5: Fix Duplicate Prisma Instantiations (Partial)
**Commit:** `02998cf`
- [x] Fixed `subscriptionService.ts` - use centralized prisma
- [x] Fixed `teamService.ts` - use centralized prisma
- [x] Fixed `passwordReset.ts` - use centralized prisma

---

## REMAINING TASKS (No Network Required)

### Task 4: Consolidate AuthenticatedRequest Type
**Files with duplicates:**
- `server/src/routes/projects.ts`
- `server/src/routes/leads.ts`
- `server/src/routes/team.ts`

**Steps:**
- [ ] Check each route file for duplicate `AuthenticatedRequest` definition
- [ ] Remove duplicates, import from `middleware/auth.ts`
- [ ] Add to `middleware/index.ts` exports if not present

---

### Task 5b: Fix Remaining Prisma Instantiations
**Files still using `new PrismaClient()`:**
- `server/src/routes/referralRoutes.ts`
- `server/src/routes/revisions.ts`
- `server/src/routes/messages.ts`
- `server/src/routes/health.ts`
- `server/src/routes/multiProjectRoutes.ts`
- `server/src/routes/subscriptionRoutes.ts`
- `server/src/services/metricsService.ts`
- `server/src/services/multiProjectService.ts`
- `server/src/services/notificationService.ts`
- `server/src/services/portfolioService.ts`
- `server/src/services/pushService.ts`

**Steps:**
- [ ] Replace `const prisma = new PrismaClient()` with `import { prisma } from '../utils/prisma'`
- [ ] Remove unused PrismaClient imports

---

### Task 6: Standardize Error Handling
**Files:**
- `server/src/services/clientService.ts:98-99` - `throw new Error()` should be `AppError`

**Steps:**
- [ ] Search for `throw new Error` in services/
- [ ] Replace with appropriate `AppError` call
- [ ] Ensure error codes are consistent

---

### Task 7: Fix Code Duplication
**Files:**
- `server/src/config/environment.ts:183-185` - duplicate logging
- `server/src/middleware/validate.ts:129-163` - duplicate error formatting

**Steps:**
- [ ] Read each file and identify duplication
- [ ] Remove redundant code

---

### Task 8: Add Memory Store Limits (Prevent Leaks)
**Files:**
- `server/src/middleware/rateLimit.ts:37-48` - unbounded Map growth
- `server/src/utils/queryOptimization.ts:762-799` - unbounded queryMetrics

**Steps:**
- [ ] Add MAX_ENTRIES constant (e.g., 10000)
- [ ] Implement LRU eviction when limit reached

---

### Task 9: WebSocket Token Verification
**File:** `server/src/services/realtimeService.ts:168`

**Steps:**
- [ ] Find TODO at line 168
- [ ] Implement JWT verification for WebSocket connections
- [ ] Add token expiry check

---

### Task 10: Improve XSS Detection
**File:** `server/src/middleware/sanitize.ts:104-113`

**Steps:**
- [ ] Review current regex-based XSS detection
- [ ] Either strengthen regex or add library dependency

---

## REQUIRES NETWORK ACCESS

### Task N1: Generate Prisma Client
```bash
cd server && npx prisma generate
```

### Task N2: Run Database Migrations
```bash
cd server && npx prisma migrate dev --name "add_password_reset_and_invite_tokens"
```

### Task N3: Verify Build
```bash
cd server && npm run build
```

### Task N4: Run Tests
```bash
cd server && npm test
```

---

## TEST COVERAGE TO ADD

### Password Reset Tests
- [ ] `__tests__/services/passwordResetService.test.ts`

### Team Invite Tests
- [ ] `__tests__/services/teamInviteService.test.ts`

### Stripe Flow Integration Tests
- [ ] `__tests__/integration/stripe-flow.test.ts`

### Notion Sync Tests
- [ ] `__tests__/services/notionLeadSync.test.ts`
- [ ] `__tests__/services/notionProjectSync.test.ts`
- [ ] `__tests__/services/notionMilestoneSync.test.ts`
- [ ] `__tests__/services/notionDeliverableSync.test.ts`

---

## QUICK REFERENCE

### Files Needing Attention
| File | Issue | Status |
|------|-------|--------|
| `middleware/auth.ts` | Dev auth bypass | ✅ Fixed |
| `middleware/auth.ts` | console.error | ✅ Fixed |
| `middleware/sanitize.ts` | console.warn | ✅ Fixed |
| `utils/stripe.ts` | Missing validation | ✅ Fixed |
| `services/subscriptionService.ts` | Duplicate Prisma | ✅ Fixed |
| `services/teamService.ts` | Duplicate Prisma | ✅ Fixed |
| `routes/passwordReset.ts` | Duplicate Prisma | ✅ Fixed |
| `services/realtimeService.ts:168` | WebSocket auth TODO | Pending |
| `services/clientService.ts:98-99` | Generic Error | Pending |
| `middleware/rateLimit.ts:37-48` | Unbounded Map | Pending |

### Summary Stats
| Category | Before | After |
|----------|--------|-------|
| Critical Security | 5 | 2 |
| Code Quality | 7 | 4 |
| Type Safety | 73+ `any` | 73+ `any` |
| Missing Tests | 15+ | 15+ |

---

## Session 3 Commits
```
02998cf fix: Security hardening and code quality improvements
76bff1e docs: Restructure TODO into actionable task list
d7c9b6b docs: Expand TODO with comprehensive codebase review findings
ed4cdcf feat: Add rate limiting for team invites and update service exports
c6bd0ae fix: Align referralRoutes and portfolioRoutes with service APIs
```

---

*Last updated: 2026-01-11 (Session 3)*
*Branch: claude/review-merge-issues-34jvV*
