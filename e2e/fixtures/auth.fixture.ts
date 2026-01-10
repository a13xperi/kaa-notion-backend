/**
 * Authentication Test Fixtures
 * Provides authenticated page contexts for tests.
 */

import { test as base, Page } from '@playwright/test';

// Test user credentials
export const TEST_USERS = {
  client: {
    email: 'test-client@sage.design',
    password: 'TestClient123!',
    tier: 2,
  },
  admin: {
    email: 'test-admin@sage.design',
    password: 'TestAdmin123!',
    tier: 4,
  },
  team: {
    email: 'test-team@sage.design',
    password: 'TestTeam123!',
    tier: 3,
  },
};

// Extended test fixture with authentication
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
}>({
  // Authenticated client page
  authenticatedPage: async ({ page }, use) => {
    await loginAs(page, TEST_USERS.client);
    await use(page);
    await logout(page);
  },

  // Admin authenticated page
  adminPage: async ({ page }, use) => {
    await loginAs(page, TEST_USERS.admin);
    await use(page);
    await logout(page);
  },
});

/**
 * Login helper function
 */
export async function loginAs(
  page: Page,
  user: { email: string; password: string }
): Promise<void> {
  await page.goto('/login');
  
  await page.fill('input[type="email"], input[name="email"]', user.email);
  await page.fill('input[type="password"], input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation away from login page
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10000,
  });
}

/**
 * Logout helper function
 */
export async function logout(page: Page): Promise<void> {
  // Try to find and click logout button
  const logoutButton = page.locator('button, a').filter({ hasText: /logout|sign out/i }).first();
  
  if (await logoutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL((url) => url.pathname.includes('/login') || url.pathname === '/');
  } else {
    // Clear storage directly
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/');
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const hasToken = await page.evaluate(() => {
    return !!(localStorage.getItem('token') || sessionStorage.getItem('token'));
  });
  return hasToken;
}

/**
 * Get stored auth token
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  });
}

export { expect } from '@playwright/test';
