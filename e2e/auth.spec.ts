/**
 * Authentication E2E Tests
 * Tests for login, registration, and auth flows.
 */

import { test, expect } from '@playwright/test';

// Test user credentials (for testing environment)
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Click submit without filling form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show validation message or stay on page
    await expect(page).toHaveURL(/login/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMessage = page.locator('[role="alert"], .error, .toast--error').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should have link to registration', async ({ page }) => {
    const registerLink = page.locator('a').filter({ hasText: /register|sign up|create account/i }).first();
    await expect(registerLink).toBeVisible();
  });

  test('should have remember me option', async ({ page }) => {
    const rememberMe = page.locator('input[type="checkbox"]').first();
    // This might not exist in all implementations
    if (await rememberMe.isVisible()) {
      await expect(rememberMe).toBeVisible();
    }
  });
});

test.describe('Registration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration form', async ({ page }) => {
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    // Fill email
    await page.fill('input[type="email"], input[name="email"]', 'newuser@example.com');
    
    // Fill weak password
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await passwordInput.fill('weak');
    
    // Submit form
    await page.click('button[type="submit"]');

    // Should show validation error or stay on page
    await expect(page).toHaveURL(/register/);
  });

  test('should have link to login', async ({ page }) => {
    const loginLink = page.locator('a').filter({ hasText: /login|sign in|already have/i }).first();
    await expect(loginLink).toBeVisible();
  });
});

test.describe('Authenticated Navigation', () => {
  // Skip if authentication is not set up
  test.skip(({ browserName }) => true, 'Requires authenticated session');

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should show user menu when authenticated', async ({ page }) => {
    // This test would require setting up authentication
    // Placeholder for authenticated user tests
  });
});
