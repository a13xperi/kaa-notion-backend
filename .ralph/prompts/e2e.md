# E2E Testing Task

## Zone
End-to-End Testing (continuous test loop)

## Stack
- Playwright (web)
- Detox (React Native)
- Maestro (mobile)
- Jest/Vitest (unit)

## Task
{{TASK}}

## Requirements
{{REQUIREMENTS}}

## E2E Testing Loop
This is a CONTINUOUS TESTING task. Follow this cycle:

```
┌─────────────────────────────────────┐
│  1. Run E2E tests                   │
│  2. Analyze failures                │
│  3. Fix the code (not the tests)    │
│  4. Re-run tests                    │
│  5. Repeat until all pass           │
└─────────────────────────────────────┘
```

## Test Commands
- Web E2E: `npx playwright test`
- React Native: `npm run e2e:ios` or `detox test`
- Mobile: `maestro test .maestro/`
- Unit: `npm test`

## Debugging Failures
1. Check test output for specific errors
2. Look at screenshots/videos in test-results/
3. Use `--debug` flag for step-through
4. Check network requests in traces

## Verification
Run ALL test suites:
```bash
npm test                    # Unit tests
npx playwright test         # E2E web
npm run e2e                 # E2E mobile (if applicable)
```

## Success Criteria
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] No flaky tests (run 3x)
- [ ] Coverage maintained
- [ ] CI pipeline would pass

When ALL tests pass consistently, output: RALPH_COMPLETE
