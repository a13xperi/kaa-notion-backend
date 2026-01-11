# kaa-notion-backend - Actionable TODO List

**Last Updated:** 2026-01-11
**Branch:** `claude/review-merge-issues-34jvV`
**Code Quality Score:** 8/10 | **Production Readiness:** 7.5/10

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

### ✅ Task 4: Consolidate AuthenticatedRequest Type
**Commit:** `703ba40`
- [x] Exported `AuthenticatedRequest` from `middleware/index.ts`
- [x] Updated 8 route files to import from middleware
- [x] Removed duplicate definitions from `team.ts`, `leads.ts`
- [x] Kept backwards-compatible re-export from `projects.ts`

### ✅ Task 5: Fix ALL Prisma Instantiations
**Commits:** `02998cf`, `703ba40`, `cc2373a`
- [x] Fixed `subscriptionService.ts`
- [x] Fixed `teamService.ts`
- [x] Fixed `passwordReset.ts`
- [x] Fixed `health.ts`, `messages.ts`, `revisions.ts`
- [x] Fixed `multiProjectRoutes.ts`, `subscriptionRoutes.ts`
- [x] Fixed `referralRoutes.ts`
- [x] Fixed `metricsService.ts`, `multiProjectService.ts`
- [x] Fixed `notificationService.ts`, `portfolioService.ts`, `pushService.ts`

**All 17 files now use centralized Prisma from `utils/prisma.ts`**

---

## REMAINING TASKS (No Network Required)

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

### Summary Stats
| Category | Before | After |
|----------|--------|-------|
| Critical Security | 5 | 1 |
| Code Quality Issues | 7 | 3 |
| Prisma Duplicates | 17 | 0 |
| Type Duplicates | 3 | 0 |

---

## Session 3 Commits
```
cc2373a refactor: Fix remaining Prisma instantiations
703ba40 refactor: Consolidate types and Prisma instances
d4f8ea7 docs: Update TODO with completed tasks and remaining work
02998cf fix: Security hardening and code quality improvements
76bff1e docs: Restructure TODO into actionable task list
d7c9b6b docs: Expand TODO with comprehensive codebase review findings
ed4cdcf feat: Add rate limiting for team invites and update service exports
c6bd0ae fix: Align referralRoutes and portfolioRoutes with service APIs
```

---

*Last updated: 2026-01-11 (Session 3)*
*Branch: claude/review-merge-issues-34jvV*
