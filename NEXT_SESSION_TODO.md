# kaa-notion-backend - Actionable TODO List

**Last Updated:** 2026-01-11
**Branch:** `claude/review-merge-issues-34jvV`
**Code Quality Score:** 7/10 | **Production Readiness:** 6/10

---

## WORK NOW (No Network Required)

These tasks can be completed immediately without Prisma or network access.

---

### Task 1: Fix Development Auth Bypass (CRITICAL)
**File:** `server/src/middleware/auth.ts:164-180`
**Risk:** Security vulnerability - headers allow unauthenticated access

**Steps:**
- [ ] Read `middleware/auth.ts` and locate lines 164-180
- [ ] Add explicit environment check with warning log
- [ ] Require `ALLOW_DEV_AUTH_BYPASS=true` environment variable
- [ ] Add rate limiting to dev bypass usage
- [ ] Test that bypass only works with explicit flag

**Code Pattern:**
```typescript
// Before: if (process.env.NODE_ENV === 'development') {
// After:
if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_AUTH_BYPASS === 'true') {
  logger.warn('DEV AUTH BYPASS ACTIVE - DO NOT USE IN PRODUCTION', {
    userId: devUserId,
    ip: req.ip
  });
  // ... existing bypass code
}
```

---

### Task 2: Replace console.* with Logger in Auth
**Files:**
- `server/src/middleware/auth.ts:353-361` - `console.error` in authenticate
- `server/src/middleware/auth.ts:415-416` - `console.error` in optionalAuthenticate
- `server/src/middleware/sanitize.ts:181,189,211,230` - security event logging

**Steps:**
- [ ] Read each file location
- [ ] Import logger if not already imported
- [ ] Replace `console.error` → `logger.error`
- [ ] Replace `console.warn` → `logger.warn`
- [ ] Add structured context (userId, action, ip)

---

### Task 3: Add Stripe Configuration Validation
**Files:**
- `server/src/utils/stripe.ts:4-10`
- `server/src/services/subscriptionService.ts:9-14`

**Steps:**
- [ ] Read both files
- [ ] Add validation function that throws if STRIPE_SECRET_KEY missing
- [ ] Call validation at module load time
- [ ] Add graceful degradation option with feature flag

**Code Pattern:**
```typescript
function validateStripeConfig(): void {
  if (!process.env.STRIPE_SECRET_KEY) {
    if (process.env.STRIPE_OPTIONAL === 'true') {
      logger.warn('Stripe not configured - payment features disabled');
      return;
    }
    throw new Error('STRIPE_SECRET_KEY is required. Set STRIPE_OPTIONAL=true to disable.');
  }
}
```

---

### Task 4: Consolidate AuthenticatedRequest Type
**Files with duplicates:**
- `server/src/routes/projects.ts`
- `server/src/routes/leads.ts`
- `server/src/routes/team.ts`

**Steps:**
- [ ] Read `middleware/auth.ts` to see existing `AuthenticatedRequest` export
- [ ] Check each route file for duplicate definition
- [ ] Remove duplicates, import from `middleware/auth.ts`
- [ ] Add to `middleware/index.ts` exports if not present

---

### Task 5: Fix Duplicate Prisma Instantiations
**Files:**
- `server/src/services/teamService.ts:9`
- `server/src/services/subscriptionService.ts:9`

**Steps:**
- [ ] Read `utils/prisma.ts` to confirm centralized instance exists
- [ ] Read each service file
- [ ] Replace `const prisma = new PrismaClient()` with import from `../utils/prisma`
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
- [ ] Consolidate into single implementation

---

### Task 8: Add Memory Store Limits (Prevent Leaks)
**Files:**
- `server/src/middleware/rateLimit.ts:37-48` - unbounded Map growth
- `server/src/utils/queryOptimization.ts:762-799` - unbounded queryMetrics

**Steps:**
- [ ] Read each file
- [ ] Add MAX_ENTRIES constant (e.g., 10000)
- [ ] Implement LRU eviction when limit reached
- [ ] Add periodic cleanup for stale entries

**Code Pattern:**
```typescript
const MAX_STORE_ENTRIES = 10000;

function addToStore(key: string, value: any) {
  if (store.size >= MAX_STORE_ENTRIES) {
    // Remove oldest entry (first key)
    const firstKey = store.keys().next().value;
    store.delete(firstKey);
  }
  store.set(key, value);
}
```

---

### Task 9: WebSocket Token Verification
**File:** `server/src/services/realtimeService.ts:168`

**Steps:**
- [ ] Read realtimeService.ts and find TODO at line 168
- [ ] Implement JWT verification for WebSocket connections
- [ ] Add token expiry check
- [ ] Add connection cleanup on invalid token

---

### Task 10: Improve XSS Detection
**File:** `server/src/middleware/sanitize.ts:104-113`

**Steps:**
- [ ] Read current regex-based XSS detection
- [ ] Research bypass techniques
- [ ] Either strengthen regex or add library dependency
- [ ] Add test cases for common bypass attempts

---

## REQUIRES NETWORK ACCESS

These tasks need `npx prisma generate` or external dependencies.

---

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

### Task N5: Install XSS Library (if chosen)
```bash
npm install xss-filters
# or
npm install dompurify
```

---

## TEST COVERAGE TO ADD

After network access is restored:

### Password Reset Tests
- [ ] `__tests__/services/passwordResetService.test.ts`
  - Test token creation
  - Test token validation
  - Test token expiry
  - Test password update

### Team Invite Tests
- [ ] `__tests__/services/teamInviteService.test.ts`
  - Test invite creation
  - Test invite validation
  - Test invite acceptance
  - Test role assignment

### Stripe Flow Integration Tests
- [ ] `__tests__/integration/stripe-flow.test.ts`
  - Test webhook receipt
  - Test client creation
  - Test project generation

### Notion Sync Tests
- [ ] `__tests__/services/notionLeadSync.test.ts`
- [ ] `__tests__/services/notionProjectSync.test.ts`
- [ ] `__tests__/services/notionMilestoneSync.test.ts`
- [ ] `__tests__/services/notionDeliverableSync.test.ts`

---

## DOCUMENTATION TO ADD

Low priority but important:

- [ ] `services/clientService.ts` - Add JSDoc to 5+ functions
- [ ] `services/projectService.ts` - Add JSDoc to 8+ functions
- [ ] `utils/queryOptimization.ts` - Add JSDoc to 10+ utilities
- [ ] `routes/team.ts` - Add OpenAPI specs
- [ ] `routes/portfolioRoutes.ts` - Add OpenAPI specs
- [ ] `routes/referralRoutes.ts` - Add OpenAPI specs

---

## COMPLETED WORK

### Session 3 Commits
- `d7c9b6b` docs: Expand TODO with comprehensive codebase review findings
- `ed4cdcf` feat: Add rate limiting for team invites and update service exports
- `c6bd0ae` fix: Align referralRoutes and portfolioRoutes with service APIs

### Previously Completed
- [x] TypeScript fixes (4 batches)
- [x] Rate limiting for password reset and team invites
- [x] Service exports updated
- [x] PR #62 Figma endpoint protection
- [x] Password reset flow
- [x] Team invite flow

---

## QUICK REFERENCE

### Files Needing Immediate Attention
| File | Line | Issue |
|------|------|-------|
| `middleware/auth.ts` | 164-180 | Dev auth bypass |
| `middleware/auth.ts` | 353-361, 415-416 | console.error |
| `middleware/sanitize.ts` | 181,189,211,230 | console.warn |
| `utils/stripe.ts` | 4-10 | Missing validation |
| `services/subscriptionService.ts` | 9-14 | Missing validation |
| `services/teamService.ts` | 9 | Duplicate Prisma |
| `services/realtimeService.ts` | 168 | WebSocket auth TODO |
| `services/clientService.ts` | 98-99 | Generic Error |
| `middleware/rateLimit.ts` | 37-48 | Unbounded Map |
| `utils/queryOptimization.ts` | 762-799 | Unbounded Map |

### Summary Stats
| Category | Count |
|----------|-------|
| Critical Security | 5 |
| Code Quality | 7 |
| Type Safety | 73+ `any` |
| Missing Tests | 15+ |

---

*Last updated: 2026-01-11 (Session 3)*
*Branch: claude/review-merge-issues-34jvV*
