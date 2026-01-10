/**
 * Landing Page E2E Tests
 * Tests for the main landing page and navigation.
 */

import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main heading', async ({ page }) => {
    // Look for the main heading or hero section
    const heading = page.locator('h1, [role="heading"]').first();
    await expect(heading).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();
  });

  test('should have a call-to-action button', async ({ page }) => {
    // Look for CTA buttons
    const ctaButton = page.locator('button, a').filter({ hasText: /get started|sign up|learn more/i }).first();
    await expect(ctaButton).toBeVisible();
  });

  test('should be accessible', async ({ page }) => {
    // Check for basic accessibility
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeVisible();
  });

  test('should have responsive meta tag', async ({ page }) => {
    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content');
    });
    expect(viewport).toContain('width=device-width');
  });
});

test.describe('Landing Page - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display properly on mobile', async ({ page }) => {
    await page.goto('/');
    
    // Page should load without horizontal scroll
    const body = page.locator('body');
    const bodyWidth = await body.evaluate((el) => el.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small tolerance
  });
});
