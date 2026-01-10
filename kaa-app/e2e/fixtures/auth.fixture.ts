import { test as base, Page } from '@playwright/test';

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
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    try {
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          userType: 'SAGE_CLIENT',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        user.token = data.data?.token || '';
      }
    } catch {
      // API might not be available in all test scenarios
      console.log('Could not register test user via API');
    }

    await use(user);

    // Cleanup could be added here if needed
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Set auth token in localStorage before navigation
    await page.addInitScript((token) => {
      if (token) {
        localStorage.setItem('authToken', token);
      }
    }, testUser.token);

    await use(page);
  },

  adminPage: async ({ page }, use) => {
    // Login as admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@test.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminTestPass123!';

    await page.goto('/admin/login');
    await page.fill('[name="email"]', adminEmail);
    await page.fill('[name="password"]', adminPassword);
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/admin\/dashboard/, { timeout: 5000 });
    } catch {
      // Admin login might fail in test environment
      console.log('Admin login redirect not completed');
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
