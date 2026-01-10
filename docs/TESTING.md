# Testing Strategy

This document describes the testing approach for the SAGE Platform, including unit tests, integration tests, and end-to-end tests.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Quick Reference](#quick-reference)
- [Unit Tests](#unit-tests)
- [E2E Tests](#e2e-tests)
- [Test Database](#test-database)
- [CI/CD Integration](#cicd-integration)

## Overview

| Test Type | Framework | Location | Command |
|-----------|-----------|----------|---------|
| Server Unit | Jest | `server/` | `npm test` |
| Frontend Unit | Jest + RTL | `kaa-app/` | `npm test` |
| E2E | Playwright | `kaa-app/` | `npm run test:e2e` |

## Test Types

### Unit Tests
- Test individual functions and components in isolation
- Fast execution, run frequently during development
- Mock external dependencies

### Integration Tests
- Test interactions between modules
- May use a test database
- Verify API endpoints work correctly

### End-to-End (E2E) Tests
- Test complete user flows through the application
- Run against a real browser
- Verify the entire stack works together

## Quick Reference

```bash
# Server unit tests
cd server && npm test

# Frontend unit tests
cd kaa-app && npm test

# E2E tests (requires running services)
cd kaa-app && npm run test:e2e

# E2E with UI
cd kaa-app && npm run test:e2e:ui
```

See [COMMANDS.md](./COMMANDS.md) for the complete command reference.

## Unit Tests

### Server Tests (Jest)

Location: `server/`

```bash
cd server

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.ts

# Run in watch mode
npm test -- --watch
```

**Configuration:** `server/jest.config.js` (if exists) or `package.json`

**Writing tests:**
```typescript
// server/src/__tests__/example.test.ts
describe('Example', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
```

### Frontend Tests (Jest + React Testing Library)

Location: `kaa-app/`

```bash
cd kaa-app

# Run tests (watch mode by default)
npm test

# Run once without watch
npm test -- --watchAll=false

# Run with coverage
npm test -- --coverage --watchAll=false

# Run specific test file
npm test -- Button.test.tsx
```

**Configuration:** Built into Create React App

**Writing tests:**
```typescript
// kaa-app/src/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../components/Button';

describe('Button', () => {
  it('should render', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## E2E Tests

E2E tests use Playwright to test complete user workflows.

Location: `kaa-app/`

### Prerequisites

1. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install
   ```

2. **Start the application:**
   ```bash
   # Option A: Docker
   docker-compose up -d

   # Option B: Local
   npm run dev  # From project root
   ```

### Running E2E Tests

```bash
cd kaa-app

# Run all E2E tests
npm run test:e2e

# Run with Playwright UI (recommended for debugging)
npm run test:e2e:ui

# Run in headed mode (see the browser)
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug

# View test report
npm run test:e2e:report

# Generate tests interactively
npm run test:e2e:codegen
```

### E2E Command Mapping

| Task | Script | Description |
|------|--------|-------------|
| Run tests | `npm run test:e2e` | Headless execution |
| With UI | `npm run test:e2e:ui` | Playwright Test UI |
| Headed | `npm run test:e2e:headed` | See browser window |
| Debug | `npm run test:e2e:debug` | Step through tests |
| Report | `npm run test:e2e:report` | View HTML report |
| Codegen | `npm run test:e2e:codegen` | Record new tests |

### Writing E2E Tests

```typescript
// kaa-app/e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### E2E Test Plan

See [docs/e2e-test-plan.md](./e2e-test-plan.md) for the comprehensive E2E test plan covering:

- Authentication flows
- Lead intake and tier routing
- Client portal functionality
- Admin dashboard
- Payment flows

## Test Database

For integration tests that require a database:

### Setup

```bash
# Create test database
createdb sage_test

# Set environment variable
export DATABASE_URL="postgresql://user:pass@localhost:5432/sage_test"

# Run migrations
npx prisma migrate deploy
```

### In Tests

```typescript
// Reset database before each test
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
});
```

### Docker Test Database

```bash
# Start test database container
docker run -d \
  --name sage-test-db \
  -e POSTGRES_DB=sage_test \
  -e POSTGRES_USER=sage \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 \
  postgres:15-alpine
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm run install-all

      - name: Run server tests
        run: cd server && npm test

      - name: Run frontend tests
        run: cd kaa-app && npm test -- --watchAll=false

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: sage_test
          POSTGRES_USER: sage
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm run install-all

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Setup database
        run: |
          cd server
          npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://sage:test@localhost:5432/sage_test

      - name: Start services
        run: npm run dev &
        env:
          DATABASE_URL: postgresql://sage:test@localhost:5432/sage_test

      - name: Wait for services
        run: npx wait-on http://localhost:3000 http://localhost:3001

      - name: Run E2E tests
        run: cd kaa-app && npm run test:e2e

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: kaa-app/playwright-report/
```

## Related Documentation

- [COMMANDS.md](./COMMANDS.md) - Complete command reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup
- [e2e-test-plan.md](./e2e-test-plan.md) - Detailed E2E test plan
