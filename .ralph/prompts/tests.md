# Testing Task

## Zone
Tests (tests/, kaa-app/src/**/*.test.*, server/**/*.test.*)

## Stack
- Jest for unit tests
- React Testing Library for components
- Playwright for E2E
- MSW for API mocking

## Task
{{TASK}}

## Requirements
{{REQUIREMENTS}}

## Test Types
1. **Unit Tests**: Individual functions/utilities
2. **Component Tests**: React components with Testing Library
3. **Integration Tests**: API routes with supertest
4. **E2E Tests**: Full user flows with Playwright

## Verification
1. Run all tests: `npm test`
2. Check coverage: `npm test -- --coverage`
3. Run E2E: `npm run test:e2e`

## Success Criteria
- [ ] All new tests pass
- [ ] No regressions in existing tests
- [ ] Coverage maintained or improved
- [ ] E2E tests pass (if applicable)

When ALL criteria met, output: RALPH_COMPLETE
