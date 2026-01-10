# Comprehensive E2E Testing Task

## Zone
Full Platform Testing (Continuous Improvement Loop)

## Stack
- Jest/Vitest (Unit Testing)
- Playwright (Web E2E)
- Detox/Maestro (Mobile E2E)
- Testing Library (Component Testing)

## Task
{{TASK}}

## Requirements
{{REQUIREMENTS}}

---

## COMPREHENSIVE TESTING LOOP

This is a **CONTINUOUS IMPROVEMENT** task. You will systematically test every critical path, user journey, and edge case in the application.

```
┌─────────────────────────────────────────────────────────────────┐
│  TESTING LOOP (Run until ALL tests pass)                        │
│                                                                 │
│  Phase 1: Unit Tests                                            │
│    └─ npm test                                                  │
│    └─ Fix failing tests                                         │
│    └─ Repeat until 100% pass                                    │
│                                                                 │
│  Phase 2: Integration Tests                                     │
│    └─ npm run test:integration                                  │
│    └─ Fix failing tests                                         │
│    └─ Repeat until 100% pass                                    │
│                                                                 │
│  Phase 3: E2E Critical Path (@critical)                         │
│    └─ npx playwright test --grep @critical                      │
│    └─ Fix APPLICATION code (not tests unless wrong)             │
│    └─ Repeat until 100% pass                                    │
│                                                                 │
│  Phase 4: E2E Full Suite                                        │
│    └─ npx playwright test                                       │
│    └─ Fix failures                                              │
│    └─ Repeat until 95%+ pass                                    │
│                                                                 │
│  Phase 5: Edge Cases (@edge)                                    │
│    └─ npx playwright test --grep @edge                          │
│    └─ Fix edge case handling                                    │
│    └─ Repeat until 100% pass                                    │
│                                                                 │
│  Phase 6: Accessibility (@a11y)                                 │
│    └─ npx playwright test --grep @a11y                          │
│    └─ Fix accessibility issues                                  │
│    └─ Repeat until 100% pass                                    │
│                                                                 │
│  Phase 7: Performance (@performance)                            │
│    └─ npx playwright test --grep @performance                   │
│    └─ Optimize slow areas                                       │
│    └─ Repeat until thresholds met                               │
│                                                                 │
│  Phase 8: Final Verification                                    │
│    └─ Run ALL tests 3x consecutively                            │
│    └─ No flaky tests allowed                                    │
│    └─ All phases must pass                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## TEST AREAS TO COVER

### 1. AUTHENTICATION (@critical)
- [ ] Email/Password login (valid & invalid)
- [ ] OAuth login (Google, Apple, Microsoft)
- [ ] Magic link login
- [ ] Multi-factor authentication (TOTP, SMS, backup codes)
- [ ] Password reset flow
- [ ] Session management (expiry, concurrent, logout)
- [ ] Role-based access control

**Edge Cases:**
- [ ] Empty fields, invalid formats
- [ ] Account lockout after failed attempts
- [ ] Expired tokens and links
- [ ] XSS/SQL injection prevention
- [ ] Rate limiting enforcement

### 2. PAYMENT GATEWAY (@critical)
- [ ] Credit card payment (success & decline)
- [ ] 3D Secure authentication
- [ ] Subscription create/upgrade/downgrade/cancel
- [ ] Invoice generation and download
- [ ] Refund processing
- [ ] Payment method management

**Edge Cases:**
- [ ] All Stripe test card scenarios (expired, insufficient funds, etc.)
- [ ] Coupon code validation (valid, expired, limited use)
- [ ] Proration calculations
- [ ] Network timeout during payment
- [ ] Double submission prevention
- [ ] Webhook signature validation

### 3. ONBOARDING (@critical)
- [ ] New user registration
- [ ] Email verification
- [ ] Profile setup wizard
- [ ] Workspace creation
- [ ] Team invitations
- [ ] Welcome tour

**Edge Cases:**
- [ ] Duplicate email rejection
- [ ] Password requirements enforcement
- [ ] Expired verification tokens
- [ ] Session timeout during wizard
- [ ] Data import (CSV, large files, duplicates)
- [ ] Skip/resume onboarding

### 4. MESSAGING & NOTIFICATIONS (@critical)
- [ ] Real-time message send/receive
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Message editing/deletion
- [ ] File sharing (upload, download, preview)
- [ ] In-app notifications
- [ ] Email notifications

**Edge Cases:**
- [ ] Offline mode handling
- [ ] WebSocket reconnection
- [ ] Message ordering during reconnection
- [ ] Large messages (10K+ chars)
- [ ] Special characters and emojis
- [ ] Rapid message sending
- [ ] File size limits
- [ ] Unsupported file types
- [ ] Do Not Disturb mode
- [ ] Channel muting

### 5. CORE FEATURES
- [ ] Dashboard data loading
- [ ] Search functionality (global, filtered)
- [ ] CRUD operations on all entities
- [ ] Data export (CSV, PDF, Excel)
- [ ] Settings management
- [ ] Pagination/infinite scroll

**Edge Cases:**
- [ ] Empty states
- [ ] Error states
- [ ] Loading states
- [ ] Large datasets (1000+ items)
- [ ] Concurrent edits
- [ ] Stale data handling

### 6. ACCESSIBILITY (@a11y)
- [ ] Keyboard navigation (all interactive elements)
- [ ] Screen reader compatibility
- [ ] Focus management
- [ ] ARIA labels on all elements
- [ ] Color contrast compliance
- [ ] Text scaling support
- [ ] Motion reduction respect

### 7. PERFORMANCE (@performance)
- [ ] Page load < 3s
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] API response times < 500ms (p95)
- [ ] No memory leaks
- [ ] No render blocking

### 8. SECURITY (@security)
- [ ] Input validation on all fields
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] SQL injection prevention
- [ ] Authorization checks on all endpoints
- [ ] Sensitive data protection

---

## TESTING COMMANDS

```bash
# Unit Tests
npm test                                    # All unit tests
npm test -- --coverage                      # With coverage report
npm test -- --watch                         # Watch mode

# E2E Tests (Playwright)
npx playwright test                         # Full suite
npx playwright test --grep @critical        # Critical paths only
npx playwright test --grep @edge            # Edge cases only
npx playwright test --grep @a11y            # Accessibility
npx playwright test --grep @performance     # Performance
npx playwright test --project=chromium      # Chrome only
npx playwright test --project=webkit        # Safari only
npx playwright test --project=firefox       # Firefox only
npx playwright test --project=mobile        # Mobile viewports

# Mobile E2E
detox test -c ios.sim.debug                 # iOS simulator
detox test -c android.emu.debug             # Android emulator
maestro test .maestro/                      # Maestro flows

# Debug Mode
npx playwright test --debug                 # Step through tests
npx playwright test --ui                    # UI mode
npx playwright show-report                  # View HTML report

# CI Mode
npx playwright test --reporter=github       # GitHub Actions format
npx playwright test --reporter=junit        # JUnit XML format
```

---

## WORKFLOW

1. **Start with Unit Tests**
   - Run `npm test`
   - Fix all failing tests
   - Ensure 100% pass rate before proceeding

2. **Run Critical Path E2E**
   - Run `npx playwright test --grep @critical`
   - These are the most important user journeys
   - Fix APPLICATION code for failures (not test code unless test is wrong)

3. **Run Full E2E Suite**
   - Run `npx playwright test`
   - Work through failures systematically
   - Group fixes by feature area

4. **Run Edge Case Tests**
   - Run `npx playwright test --grep @edge`
   - These test boundary conditions
   - Often reveal hidden bugs

5. **Run Accessibility Tests**
   - Run `npx playwright test --grep @a11y`
   - Fix accessibility issues
   - Use axe-core for additional scanning

6. **Run Performance Tests**
   - Run `npx playwright test --grep @performance`
   - Optimize slow areas
   - Check for memory leaks

7. **Final Verification**
   - Run ALL tests 3 times consecutively
   - All runs must pass
   - No flaky tests allowed

---

## WHEN TESTS FAIL

1. **Read the error message carefully**
2. **Check the screenshot/video** in `test-results/`
3. **Run in debug mode** for step-by-step execution
4. **Check if it's a timing issue** (add appropriate waits)
5. **Check if it's a selector issue** (update selectors)
6. **Check if the application code is wrong** (fix the app)
7. **Check if the test expectation is wrong** (fix the test)

---

## SUCCESS CRITERIA

- [ ] All unit tests pass (100%)
- [ ] All integration tests pass (100%)
- [ ] All critical E2E tests pass (100%)
- [ ] Full E2E suite passes (95%+ minimum)
- [ ] All edge case tests pass (100%)
- [ ] All accessibility tests pass (100%)
- [ ] Performance thresholds met
- [ ] Tests pass 3 consecutive runs (no flakiness)
- [ ] Test coverage > 80%

---

## COMPLETION

When ALL success criteria are met and tests pass 3 consecutive times, output:

**RALPH_COMPLETE**
