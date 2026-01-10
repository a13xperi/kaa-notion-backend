# E2E Test Integration Plan

## Overview

This document outlines the comprehensive plan for integrating End-to-End (E2E) tests using Playwright for the SAGE MVP platform. E2E tests validate complete user flows across the frontend and backend.

---

## 1. Playwright Setup

### 1.1 Installation

```bash
# In the kaa-app directory
cd kaa-app
npm init playwright@latest

# This will:
# - Install @playwright/test
# - Create playwright.config.ts
# - Create example tests in tests/ directory
# - Optionally install browsers
```

### 1.2 Dependencies to Add

```json
// kaa-app/package.json - devDependencies
{
  "@playwright/test": "^1.40.0",
  "@types/node": "^20.0.0"
}
```

### 1.3 Playwright Configuration

```typescript
// kaa-app/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'e2e-results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Start local dev servers before running tests
  webServer: [
    {
      command: 'npm run start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'cd ../server && npm run dev',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
```

---

## 2. Directory Structure

```
kaa-app/
├── e2e/
│   ├── fixtures/
│   │   ├── auth.fixture.ts       # Authentication fixtures
│   │   ├── database.fixture.ts   # Database seeding/cleanup
│   │   └── api.fixture.ts        # API mocking fixtures
│   │
│   ├── pages/
│   │   ├── intake-form.page.ts   # Intake form page object
│   │   ├── checkout.page.ts      # Stripe checkout page object
│   │   ├── login.page.ts         # Login page object
│   │   ├── dashboard.page.ts     # Project dashboard page object
│   │   └── project-detail.page.ts# Project detail page object
│   │
│   ├── utils/
│   │   ├── test-data.ts          # Test data generators
│   │   ├── api-helpers.ts        # API interaction helpers
│   │   └── assertions.ts         # Custom assertions
│   │
│   ├── flows/
│   │   ├── lead-to-client.spec.ts    # Full lead conversion flow
│   │   └── client-portal.spec.ts     # Client portal flow
│   │
│   └── global-setup.ts           # Global test setup
│
├── playwright.config.ts
└── package.json
```

---

## 3. Test Infrastructure

### 3.1 Custom Fixtures

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base, expect } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
  testUser: { email: string; password: string; token: string };
};

export const test = base.extend<AuthFixtures>({
  testUser: async ({}, use) => {
    const user = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      token: '',
    };

    // Create user via API
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const data = await response.json();
    user.token = data.data.token;

    await use(user);

    // Cleanup: Delete user after test
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    await page.addInitScript((token) => {
      localStorage.setItem('authToken', token);
    }, testUser.token);

    await use(page);
  },

  adminPage: async ({ page }, use) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[name="email"]', process.env.ADMIN_EMAIL!);
    await page.fill('[name="password"]', process.env.ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');

    await use(page);
  },
});

export { expect };
```

### 3.2 Page Objects

```typescript
// e2e/pages/intake-form.page.ts
import { Page, Locator } from '@playwright/test';

export class IntakeFormPage {
  readonly page: Page;

  // Step 1 elements
  readonly emailInput: Locator;
  readonly nameInput: Locator;
  readonly addressInput: Locator;

  // Navigation
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;

  // Progress
  readonly progressBar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email address/i);
    this.nameInput = page.getByLabel(/your name/i);
    this.addressInput = page.getByLabel(/project address/i);
    this.continueButton = page.getByRole('button', { name: /continue/i });
    this.backButton = page.getByRole('button', { name: /back/i });
    this.submitButton = page.getByRole('button', { name: /get my recommendation/i });
    this.progressBar = page.locator('.intake-progress-fill');
  }

  async goto() {
    await this.page.goto('/intake');
  }

  async fillStep1(data: { email: string; name?: string; address: string }) {
    await this.emailInput.fill(data.email);
    if (data.name) await this.nameInput.fill(data.name);
    await this.addressInput.fill(data.address);
  }

  async selectBudget(value: string) {
    await this.page.getByLabel(new RegExp(value, 'i')).click();
  }

  async selectTimeline(value: string) {
    await this.page.getByLabel(new RegExp(value, 'i')).click();
  }

  async selectProjectType(value: string) {
    await this.page.getByLabel(new RegExp(value, 'i')).click();
  }

  async toggleSurvey(checked: boolean) {
    const checkbox = this.page.getByRole('checkbox', { name: /property survey/i });
    if (checked) await checkbox.check();
    else await checkbox.uncheck();
  }

  async toggleDrawings(checked: boolean) {
    const checkbox = this.page.getByRole('checkbox', { name: /drawings/i });
    if (checked) await checkbox.check();
    else await checkbox.uncheck();
  }

  async completeAllSteps(data: {
    email: string;
    name?: string;
    address: string;
    budget: string;
    timeline: string;
    projectType: string;
    hasSurvey?: boolean;
    hasDrawings?: boolean;
  }) {
    // Step 1
    await this.fillStep1({ email: data.email, name: data.name, address: data.address });
    await this.continueButton.click();

    // Step 2
    await this.selectBudget(data.budget);
    await this.continueButton.click();

    // Step 3
    await this.selectTimeline(data.timeline);
    await this.continueButton.click();

    // Step 4
    await this.selectProjectType(data.projectType);
    if (data.hasSurvey) await this.toggleSurvey(true);
    if (data.hasDrawings) await this.toggleDrawings(true);
    await this.continueButton.click();

    // Now on Step 5 (Review)
  }

  async submit() {
    await this.submitButton.click();
  }

  async getProgress(): Promise<number> {
    const style = await this.progressBar.getAttribute('style');
    const match = style?.match(/width:\s*(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }
}
```

```typescript
// e2e/pages/dashboard.page.ts
import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly greeting: Locator;
  readonly activeProjectsSection: Locator;
  readonly projectCards: Locator;
  readonly statsCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.greeting = page.locator('.dashboard-greeting h1');
    this.activeProjectsSection = page.locator('.dashboard-section').first();
    this.projectCards = page.locator('.project-card');
    this.statsCards = page.locator('.stat-card');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async waitForLoad() {
    await this.page.waitForSelector('.project-dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async getActiveProjectCount(): Promise<number> {
    return this.projectCards.count();
  }

  async clickProject(name: string) {
    await this.page.getByRole('button', { name: new RegExp(`view project.*${name}`, 'i') }).click();
  }

  async getStatValue(label: string): Promise<string> {
    const card = this.statsCards.filter({ hasText: label });
    return card.locator('.stat-value').textContent() ?? '';
  }
}
```

### 3.3 Test Data Generators

```typescript
// e2e/utils/test-data.ts
import { faker } from '@faker-js/faker';

export function generateLeadData() {
  return {
    email: faker.internet.email(),
    name: faker.person.fullName(),
    address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`,
    budget: '$5,000 - $15,000',
    timeline: '1-2 months',
    projectType: 'Standard Renovation',
    hasSurvey: faker.datatype.boolean(),
    hasDrawings: faker.datatype.boolean(),
  };
}

export function generateUserData() {
  return {
    email: faker.internet.email(),
    password: 'TestPassword123!',
    name: faker.person.fullName(),
  };
}

export const TIER_TEST_DATA = {
  tier1: {
    budget: 'Under $500',
    timeline: 'As soon as possible',
    projectType: 'Simple Consultation',
  },
  tier2: {
    budget: '$2,000 - $5,000',
    timeline: '2-4 weeks',
    projectType: 'Small Renovation',
  },
  tier3: {
    budget: '$15,000 - $50,000',
    timeline: '2-4 months',
    projectType: 'Standard Renovation',
  },
  tier4: {
    budget: '$50,000+',
    timeline: '4+ months',
    projectType: 'New Build',
  },
};
```

---

## 4. E2E Test Specifications

### 4.1 Lead-to-Client Flow (lead-to-client.spec.ts)

```typescript
// e2e/flows/lead-to-client.spec.ts
import { test, expect } from '../fixtures/auth.fixture';
import { IntakeFormPage } from '../pages/intake-form.page';
import { generateLeadData, TIER_TEST_DATA } from '../utils/test-data';

test.describe('Lead to Client Conversion Flow', () => {

  test.describe('Intake Form', () => {
    test('should complete intake form and receive tier recommendation', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);
      const leadData = generateLeadData();

      await intakeForm.goto();
      await intakeForm.completeAllSteps(leadData);

      // Verify review step
      await expect(page.getByText(leadData.email)).toBeVisible();
      await expect(page.getByText(leadData.address)).toBeVisible();

      // Submit
      await intakeForm.submit();

      // Should show tier recommendation
      await expect(page.getByText(/recommended.*tier/i)).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.continueButton.click();

      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(page.getByText(/valid project address/i)).toBeVisible();
    });

    test('should navigate between steps', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.fillStep1({
        email: 'test@example.com',
        address: '123 Main St, City, ST 12345',
      });
      await intakeForm.continueButton.click();

      // On step 2
      await expect(page.getByText(/budget/i)).toBeVisible();

      // Go back
      await intakeForm.backButton.click();

      // Back on step 1 with preserved data
      await expect(intakeForm.emailInput).toHaveValue('test@example.com');
    });

    test('should show progress correctly', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      expect(await intakeForm.getProgress()).toBe(20); // Step 1 of 5

      await intakeForm.fillStep1({
        email: 'test@example.com',
        address: '123 Main St',
      });
      await intakeForm.continueButton.click();

      expect(await intakeForm.getProgress()).toBe(40); // Step 2 of 5
    });
  });

  test.describe('Tier Recommendation', () => {
    test.each([
      ['tier1', 1],
      ['tier2', 2],
      ['tier3', 3],
      ['tier4', 4],
    ])('should recommend %s for matching criteria', async ({ page }, [tierKey, expectedTier]) => {
      const intakeForm = new IntakeFormPage(page);
      const tierData = TIER_TEST_DATA[tierKey as keyof typeof TIER_TEST_DATA];

      await intakeForm.goto();
      await intakeForm.completeAllSteps({
        email: `${tierKey}@test.com`,
        address: '123 Test St, City, ST 12345',
        ...tierData,
      });
      await intakeForm.submit();

      // Verify correct tier recommendation
      await expect(page.getByText(new RegExp(`tier.*${expectedTier}`, 'i'))).toBeVisible();
    });
  });

  test.describe('Checkout Flow', () => {
    test('should redirect to Stripe checkout', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.completeAllSteps({
        email: 'checkout@test.com',
        address: '123 Checkout St',
        budget: '$2,000 - $5,000',
        timeline: '2-4 weeks',
        projectType: 'Small Renovation',
      });
      await intakeForm.submit();

      // Click proceed to checkout
      await page.getByRole('button', { name: /proceed.*checkout/i }).click();

      // Should redirect to Stripe (or mock in test mode)
      await expect(page).toHaveURL(/checkout\.stripe\.com|\/checkout/);
    });

    test('should handle checkout cancellation', async ({ page }) => {
      // Test returning from cancelled checkout
      await page.goto('/checkout/cancel?session_id=test');

      await expect(page.getByText(/cancelled|try again/i)).toBeVisible();
    });

    test('should handle successful checkout', async ({ page }) => {
      // Test success redirect
      await page.goto('/checkout/success?session_id=cs_test_123');

      await expect(page.getByText(/success|welcome/i)).toBeVisible();
    });
  });

  test.describe('Post-Payment Portal Access', () => {
    test('should grant portal access after payment', async ({ page }) => {
      // Simulate successful payment webhook (via test API)
      const response = await page.request.post('/api/test/simulate-payment', {
        data: {
          leadId: 'test-lead-id',
          email: 'newclient@test.com',
        },
      });
      expect(response.ok()).toBeTruthy();

      // Login as new client
      await page.goto('/login');
      await page.fill('[name="email"]', 'newclient@test.com');
      await page.fill('[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      // Should access dashboard
      await expect(page).toHaveURL(/dashboard/);
      await expect(page.getByText(/welcome/i)).toBeVisible();
    });
  });
});
```

### 4.2 Client Portal Flow (client-portal.spec.ts)

```typescript
// e2e/flows/client-portal.spec.ts
import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Client Portal Flow', () => {

  test.describe('Authentication', () => {
    test('should login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('[name="email"]', 'testclient@example.com');
      await page.fill('[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/dashboard/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('[name="email"]', 'invalid@example.com');
      await page.fill('[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      await expect(page.getByText(/invalid.*credentials/i)).toBeVisible();
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page).toHaveURL(/login/);
    });

    test('should logout successfully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/dashboard');
      await page.click('[aria-label="User menu"]');
      await page.click('text=Logout');

      await expect(page).toHaveURL(/login|home/);
    });
  });

  test.describe('Dashboard', () => {
    test('should display user projects', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboard = new DashboardPage(page);

      await dashboard.goto();
      await dashboard.waitForLoad();

      // Should show greeting
      await expect(dashboard.greeting).toContainText(/good (morning|afternoon|evening)/i);

      // Should show project cards or empty state
      const projectCount = await dashboard.getActiveProjectCount();
      if (projectCount > 0) {
        await expect(dashboard.projectCards.first()).toBeVisible();
      } else {
        await expect(page.getByText(/no active projects/i)).toBeVisible();
      }
    });

    test('should show project statistics', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboard = new DashboardPage(page);

      await dashboard.goto();
      await dashboard.waitForLoad();

      // Stats should be visible
      await expect(page.getByText('Active')).toBeVisible();
      await expect(page.getByText('Completed')).toBeVisible();
      await expect(page.getByText('Total')).toBeVisible();
    });

    test('should navigate to project detail', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const dashboard = new DashboardPage(page);

      await dashboard.goto();
      await dashboard.waitForLoad();

      // Click first project
      await dashboard.projectCards.first().click();

      await expect(page).toHaveURL(/projects\/[a-z0-9-]+/);
    });
  });

  test.describe('Project Detail', () => {
    test('should display project information', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/projects/test-project-id');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/status/i)).toBeVisible();
      await expect(page.getByText(/tier/i)).toBeVisible();
    });

    test('should display milestone timeline', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/projects/test-project-id');

      await expect(page.getByRole('list', { name: /milestones/i })).toBeVisible();
    });

    test('should display deliverables', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/projects/test-project-id');

      // Navigate to deliverables tab/section
      await page.click('text=Deliverables');

      await expect(page.getByText(/deliverables|files/i)).toBeVisible();
    });
  });

  test.describe('Deliverable Download', () => {
    test('should download deliverable file', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/projects/test-project-id');
      await page.click('text=Deliverables');

      // Set up download handler
      const downloadPromise = page.waitForEvent('download');

      await page.click('[aria-label="Download file"]');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBeTruthy();
    });

    test('should preview image deliverables', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.goto('/projects/test-project-id');
      await page.click('text=Deliverables');

      // Click on image deliverable
      await page.click('[data-type="image"]');

      // Should open preview modal
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('img[alt*="preview"]')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ authenticatedPage }) => {
      const page = authenticatedPage;

      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Should show mobile navigation
      await expect(page.locator('[aria-label="Menu"]')).toBeVisible();

      // Project cards should be full width
      const card = page.locator('.project-card').first();
      const box = await card.boundingBox();
      expect(box?.width).toBeGreaterThan(300);
    });
  });
});
```

---

## 5. Test Environment Setup

### 5.1 Environment Variables

```bash
# .env.test
E2E_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001

# Test database (isolated from development)
DATABASE_URL=postgresql://test:test@localhost:5432/sage_test

# Test Stripe keys (test mode)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx

# Admin credentials for tests
ADMIN_EMAIL=admin@test.com
ADMIN_PASSWORD=AdminTestPass123!
```

### 5.2 Database Seeding

```typescript
// e2e/utils/seed-test-data.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedTestData() {
  // Create test admin user
  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash: '$2b$10$...', // hashed 'AdminTestPass123!'
      role: 'ADMIN',
      userType: 'ADMIN',
    },
  });

  // Create test client with project
  const user = await prisma.user.create({
    data: {
      email: 'testclient@example.com',
      passwordHash: '$2b$10$...', // hashed 'TestPassword123!'
      role: 'CLIENT',
      userType: 'SAGE_CLIENT',
      tier: 2,
    },
  });

  const client = await prisma.client.create({
    data: {
      userId: user.id,
      tier: 2,
      status: 'ACTIVE',
    },
  });

  await prisma.project.create({
    data: {
      id: 'test-project-id',
      clientId: client.id,
      name: 'Test Project',
      tier: 2,
      status: 'IN_PROGRESS',
      paymentStatus: 'paid',
      milestones: {
        create: [
          { name: 'Intake', order: 1, tier: 2, status: 'COMPLETED' },
          { name: 'Design', order: 2, tier: 2, status: 'IN_PROGRESS' },
          { name: 'Review', order: 3, tier: 2, status: 'PENDING' },
        ],
      },
    },
  });
}

export async function cleanupTestData() {
  await prisma.auditLog.deleteMany({});
  await prisma.deliverable.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
}
```

### 5.3 Global Setup/Teardown

```typescript
// e2e/global-setup.ts
import { seedTestData, cleanupTestData } from './utils/seed-test-data';

async function globalSetup() {
  console.log('🌱 Seeding test database...');
  await cleanupTestData();
  await seedTestData();
  console.log('✅ Test database ready');
}

export default globalSetup;
```

---

## 6. CI/CD Integration

### 6.1 GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: sage_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd kaa-app && npm ci
          cd ../server && npm ci

      - name: Install Playwright browsers
        run: cd kaa-app && npx playwright install --with-deps

      - name: Setup test database
        run: |
          cd server
          npx prisma migrate deploy
          npx ts-node ../kaa-app/e2e/utils/seed-test-data.ts
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/sage_test

      - name: Run E2E tests
        run: cd kaa-app && npx playwright test
        env:
          E2E_BASE_URL: http://localhost:3000
          DATABASE_URL: postgresql://test:test@localhost:5432/sage_test
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: kaa-app/playwright-report/
          retention-days: 30

      - name: Upload test videos
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-videos
          path: kaa-app/test-results/
          retention-days: 7
```

---

## 7. NPM Scripts

```json
// kaa-app/package.json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report",
    "test:e2e:codegen": "playwright codegen localhost:3000"
  }
}
```

---

## 8. Implementation Phases

### Phase 1: Setup (1-2 hours)
- [ ] Install Playwright
- [ ] Create playwright.config.ts
- [ ] Set up directory structure
- [ ] Create .env.test

### Phase 2: Infrastructure (2-3 hours)
- [ ] Create page objects (IntakeFormPage, DashboardPage, etc.)
- [ ] Create test fixtures (auth, database)
- [ ] Create test data generators
- [ ] Set up database seeding

### Phase 3: Lead-to-Client Tests (2-3 hours)
- [ ] Intake form tests
- [ ] Tier recommendation tests
- [ ] Checkout flow tests (with Stripe test mode)
- [ ] Post-payment access tests

### Phase 4: Client Portal Tests (2-3 hours)
- [ ] Authentication tests
- [ ] Dashboard tests
- [ ] Project detail tests
- [ ] Deliverable tests

### Phase 5: CI/CD Integration (1-2 hours)
- [ ] Create GitHub Actions workflow
- [ ] Set up test artifacts
- [ ] Configure test database in CI
- [ ] Add Slack/email notifications (optional)

---

## 9. Best Practices

1. **Isolation**: Each test should be independent and not rely on state from other tests
2. **Selectors**: Prefer accessible selectors (role, label, text) over CSS/XPath
3. **Waits**: Use Playwright's auto-waiting; avoid explicit timeouts
4. **Data**: Generate unique test data to avoid collisions
5. **Cleanup**: Clean up test data after each test suite
6. **Parallelization**: Design tests to run in parallel when possible
7. **Flakiness**: Retry failed tests (configured in playwright.config.ts)
8. **Screenshots**: Capture on failure for debugging
9. **Videos**: Record for flaky test investigation

---

## 10. Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Setup | 1-2 hours | None |
| Infrastructure | 2-3 hours | Setup |
| Lead-to-Client Tests | 2-3 hours | Infrastructure |
| Client Portal Tests | 2-3 hours | Infrastructure |
| CI/CD Integration | 1-2 hours | All tests |

**Total: 8-13 hours**

---

## Next Steps

1. Run `npm init playwright@latest` in kaa-app
2. Copy configuration from this document
3. Implement page objects
4. Write first test suite
5. Integrate with CI/CD
