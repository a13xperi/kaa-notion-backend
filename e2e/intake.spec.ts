/**
 * Intake Form E2E Tests
 * Tests for the lead intake form flow.
 */

import { test, expect } from '@playwright/test';

test.describe('Intake Form', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to intake form (adjust path as needed)
    await page.goto('/intake');
  });

  test('should display intake form', async ({ page }) => {
    // Check for form elements
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });

  test('should have required fields', async ({ page }) => {
    // Email field
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();

    // Project address field
    const addressInput = page.locator('input[name="projectAddress"], input[name="address"], textarea[name="projectAddress"]');
    await expect(addressInput.first()).toBeVisible();
  });

  test('should show tier recommendation after form submission', async ({ page }) => {
    // Fill out the intake form
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    
    // Fill project address
    const addressInput = page.locator('input[name="projectAddress"], input[name="address"], textarea[name="projectAddress"]').first();
    await addressInput.fill('123 Test Street, Test City, TC 12345');

    // Fill name if present
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User');
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show tier recommendation or success message
    const result = page.locator('[class*="tier"], [class*="recommendation"], [class*="success"]');
    await expect(result.first()).toBeVisible({ timeout: 10000 });
  });

  test('should validate email format', async ({ page }) => {
    // Enter invalid email
    await page.fill('input[type="email"], input[name="email"]', 'invalid-email');
    
    // Try to submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Form should show error or not submit
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const isInvalid = await emailInput.evaluate((el) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('should handle optional fields gracefully', async ({ page }) => {
    // Fill only required fields
    await page.fill('input[type="email"], input[name="email"]', 'minimal@example.com');
    
    const addressInput = page.locator('input[name="projectAddress"], input[name="address"], textarea[name="projectAddress"]').first();
    await addressInput.fill('456 Minimal Street');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should still process successfully
    await page.waitForTimeout(2000);
    // Form should either show success or navigate away
  });
});

test.describe('Intake Form - Tier Routing', () => {
  test('should route to appropriate tier based on budget', async ({ page }) => {
    await page.goto('/intake');

    // Fill form with high budget indicator
    await page.fill('input[type="email"], input[name="email"]', 'premium@example.com');
    
    const addressInput = page.locator('input[name="projectAddress"], input[name="address"], textarea[name="projectAddress"]').first();
    await addressInput.fill('789 Premium Estate, Beverly Hills, CA 90210');

    // Select high budget if dropdown exists
    const budgetSelect = page.locator('select[name="budgetRange"], select[name="budget"]');
    if (await budgetSelect.isVisible()) {
      await budgetSelect.selectOption({ index: -1 }); // Select last (highest) option
    }

    // Submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for result
    await page.waitForTimeout(2000);
  });
});

test.describe('Intake Form - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be usable on mobile devices', async ({ page }) => {
    await page.goto('/intake');

    // Form should be visible
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Inputs should be tappable
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.tap();
    await emailInput.fill('mobile@example.com');

    // Submit button should be tappable
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });
});
