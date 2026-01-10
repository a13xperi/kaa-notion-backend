# SAGE MVP Comprehensive Testing Task

## Project
SAGE MVP Platform - Tiered Landscape Architecture Services

## Stack
- **Frontend:** React 19, TypeScript, React Query, React Router
- **Backend:** Express 5, Prisma 7, PostgreSQL, TypeScript
- **Testing:** Jest (backend), React Testing Library (frontend), Playwright (E2E)
- **Integrations:** Stripe, Notion, Supabase, Resend

## Task
{{TASK}}

## Requirements
{{REQUIREMENTS}}

---

## CONTINUOUS TESTING LOOP

Run this loop until ALL tests pass consistently.

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: Backend Unit Tests (100% required)                    │
│    └─ npm run test:backend                                      │
│                                                                 │
│  Phase 2: Frontend Unit Tests (100% required)                   │
│    └─ npm run test:frontend                                     │
│                                                                 │
│  Phase 3: E2E Auth Tests                                        │
│    └─ npx playwright test e2e/auth.spec.ts                      │
│                                                                 │
│  Phase 4: E2E Checkout Tests                                    │
│    └─ npx playwright test e2e/checkout.spec.ts                  │
│                                                                 │
│  Phase 5: E2E Intake Tests                                      │
│    └─ npx playwright test e2e/intake.spec.ts                    │
│                                                                 │
│  Phase 6: E2E Landing Tests                                     │
│    └─ npx playwright test e2e/landing.spec.ts                   │
│                                                                 │
│  Phase 7: Full E2E Suite (All Browsers)                         │
│    └─ npm run test:e2e                                          │
│                                                                 │
│  Phase 8: Final Verification (3 consecutive passes)             │
│    └─ npm test && npm run test:e2e                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## TEST COMMANDS

### Unit Tests
```bash
npm test                           # All tests (backend + frontend)
npm run test:backend               # Backend only (Jest)
npm run test:frontend              # Frontend only (React Testing Library)
```

### E2E Tests (Playwright)
```bash
npm run test:e2e                   # Full suite (all browsers)
npm run test:e2e:ui                # Interactive UI mode
npm run test:e2e:headed            # Visible browser
npm run test:e2e:report            # View HTML report

# Individual test files
npx playwright test e2e/auth.spec.ts
npx playwright test e2e/checkout.spec.ts
npx playwright test e2e/intake.spec.ts
npx playwright test e2e/landing.spec.ts

# By browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project='Mobile Chrome'
npx playwright test --project='Mobile Safari'

# Tagged tests
npx playwright test --grep @critical
npx playwright test --grep @edge
```

---

## EXISTING TEST FILES

### Backend Tests (server/src/__tests__/)
| File | Coverage |
|------|----------|
| `auth.test.ts` | Authentication, JWT, password hashing |
| `loginProtection.test.ts` | Brute force protection, rate limiting |
| `payments.test.ts` | Stripe integration, checkout sessions |
| `stripeHelpers.test.ts` | Stripe utility functions |
| `leads.test.ts` | Lead management, tier recommendation |
| `tierFeatures.test.ts` | Tier feature matrix |
| `projects.test.ts` | Project CRUD operations |
| `deliverables.test.ts` | Deliverable management |
| `clientService.test.ts` | Client operations |
| `milestoneTemplates.test.ts` | Milestone templates |
| `validators.test.ts` | Input validation |
| `rateLimit.test.ts` | Rate limiting logic |
| `appError.test.ts` | Error handling |
| `logger.test.ts` | Logging functionality |

### Integration Tests (server/src/__tests__/integration/)
| File | Coverage |
|------|----------|
| `clientPortalFlow.test.ts` | Full client portal flow |
| `leadToClientFlow.test.ts` | Lead conversion flow |

### Service Tests (server/src/services/__tests__/)
| File | Coverage |
|------|----------|
| `cacheService.test.ts` | Redis caching |
| `emailService.test.ts` | Email sending (Resend) |
| `healthService.test.ts` | Health checks |
| `messagingService.test.ts` | Real-time messaging |
| `realtimeService.test.ts` | WebSocket connections |
| `webhookService.test.ts` | Webhook processing |
| `slackService.test.ts` | Slack notifications |
| `referralService.test.ts` | Referral tracking |
| `calendarService.test.ts` | Calendar/booking |

### E2E Tests (e2e/)
| File | Coverage |
|------|----------|
| `auth.spec.ts` | Login, registration, password reset |
| `checkout.spec.ts` | Stripe checkout, payment flow |
| `intake.spec.ts` | Lead intake form, tier recommendation |
| `landing.spec.ts` | Landing page, tier comparison |

---

## AREAS TO TEST

### 1. AUTHENTICATION
- [ ] User registration (email/password)
- [ ] User login
- [ ] Password reset flow
- [ ] JWT token validation
- [ ] Session management
- [ ] Role-based access (SAGE_ADMIN, SAGE_CLIENT, TEAM_MEMBER)
- [ ] Brute force protection
- [ ] Rate limiting

**Edge Cases:**
- Duplicate email registration
- Weak password rejection
- Invalid email format
- Expired tokens
- Concurrent sessions

### 2. LEAD INTAKE & TIER RECOMMENDATION
- [ ] Intake form submission
- [ ] Tier recommendation engine
- [ ] Lead creation in database
- [ ] Admin lead queue view
- [ ] Lead status updates

**Tiers:**
- Tier 1 - The Concept ($299)
- Tier 2 - The Builder ($1,499)
- Tier 3 - The Concierge ($4,999)
- Tier 4 - White Glove (Custom)

**Edge Cases:**
- Empty form fields
- Invalid data types
- Duplicate lead submission
- Edge score boundaries

### 3. PAYMENT & CHECKOUT (Stripe)
- [ ] Checkout session creation
- [ ] Stripe redirect flow
- [ ] Payment success handling
- [ ] Webhook processing
- [ ] Subscription management

**Test Cards:**
- `4242424242424242` - Success
- `4000000000000002` - Declined
- `4000000000000069` - Expired
- `4000000000009995` - Insufficient funds
- `4000002500003155` - 3D Secure

**Edge Cases:**
- Payment declined scenarios
- 3D Secure authentication
- Webhook signature validation
- Duplicate payment prevention

### 4. CLIENT PORTAL
- [ ] Project dashboard
- [ ] Project details view
- [ ] Milestone tracking
- [ ] Deliverables management
- [ ] File upload/download
- [ ] Messaging system
- [ ] Notification center

**Edge Cases:**
- Empty project list
- Large file uploads
- Permission denied scenarios
- Real-time updates

### 5. ADMIN DASHBOARD
- [ ] Lead queue management
- [ ] Client management
- [ ] Analytics dashboard
- [ ] Team management
- [ ] Lead to client conversion

**Edge Cases:**
- Empty states
- Bulk operations
- Concurrent edits
- Role permissions

### 6. INTEGRATIONS
- [ ] Notion sync (leads, deliverables)
- [ ] Supabase storage (file uploads)
- [ ] Resend emails (transactional)
- [ ] Stripe webhooks

**Edge Cases:**
- API rate limits
- Connection failures
- Webhook retries

---

## WHEN TESTS FAIL

1. **Read the error message** carefully
2. **Check screenshots/videos** in `playwright-report/`
3. **Run in UI mode** for debugging: `npm run test:e2e:ui`
4. **Check if timing issue** - add appropriate waits
5. **Fix the APPLICATION code** (not tests unless tests are wrong)
6. **Re-run the failing test** to verify fix
7. **Run full suite** to check for regressions

---

## SUCCESS CRITERIA

- [ ] All backend unit tests pass (262 tests)
- [ ] All frontend unit tests pass (595 tests)
- [ ] All E2E auth tests pass
- [ ] All E2E checkout tests pass
- [ ] All E2E intake tests pass
- [ ] All E2E landing tests pass
- [ ] Tests pass on Chromium
- [ ] Tests pass on Firefox
- [ ] Tests pass on WebKit
- [ ] Tests pass on Mobile Chrome
- [ ] Tests pass on Mobile Safari
- [ ] Tests pass 3 consecutive runs (no flakiness)

---

## COMPLETION

When ALL success criteria are met and tests pass 3 consecutive times, output:

**RALPH_COMPLETE**
