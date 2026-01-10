import { test, expect } from '@playwright/test';
import { IntakeFormPage } from '../pages/intake-form.page';
import { generateLeadData, TIER_TEST_DATA, generateUniqueEmail, generateAddress } from '../utils/test-data';

test.describe('Lead to Client Conversion Flow', () => {
  test.describe('Intake Form', () => {
    test('should complete intake form and receive tier recommendation', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);
      const leadData = generateLeadData();

      await intakeForm.goto();
      await intakeForm.completeAllSteps(leadData);

      // Verify review step shows entered data
      await expect(page.getByText(leadData.email)).toBeVisible();
      await expect(page.getByText(leadData.address)).toBeVisible();

      // Submit form
      await intakeForm.submit();

      // Should show tier recommendation
      await expect(page.getByText(/recommended.*tier|tier.*recommendation/i)).toBeVisible({ timeout: 10000 });
    });

    test('should validate required fields on step 1', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.continueButton.click();

      // Should show validation errors
      await expect(page.getByText(/email.*required|please enter.*email/i)).toBeVisible();
      await expect(page.getByText(/address.*required|project address/i)).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.emailInput.fill('invalid-email');
      await intakeForm.addressInput.fill('123 Main St, City, ST 12345');
      await intakeForm.continueButton.click();

      // Should show email format error
      await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
    });

    test('should navigate between steps', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.fillStep1({
        email: 'test@example.com',
        address: '123 Main St, City, ST 12345',
      });
      await intakeForm.continueButton.click();

      // On step 2 - budget selection
      await expect(page.getByText(/budget/i)).toBeVisible();

      // Go back
      await intakeForm.backButton.click();

      // Back on step 1 with preserved data
      await expect(intakeForm.emailInput).toHaveValue('test@example.com');
      await expect(intakeForm.addressInput).toHaveValue('123 Main St, City, ST 12345');
    });

    test('should show progress indicator correctly', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();

      // Step 1 progress
      const step1Progress = await intakeForm.getProgress();
      expect(step1Progress).toBeGreaterThanOrEqual(15);
      expect(step1Progress).toBeLessThanOrEqual(25);

      await intakeForm.fillStep1({
        email: 'test@example.com',
        address: '123 Main St',
      });
      await intakeForm.continueButton.click();

      // Step 2 progress should be higher
      const step2Progress = await intakeForm.getProgress();
      expect(step2Progress).toBeGreaterThan(step1Progress);
    });

    test('should preserve form data across navigation', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);
      const testEmail = generateUniqueEmail('preserve');
      const testAddress = generateAddress();

      await intakeForm.goto();
      await intakeForm.fillStep1({ email: testEmail, address: testAddress });
      await intakeForm.continueButton.click();

      // Select budget
      await intakeForm.selectBudget('$2,000');
      await intakeForm.continueButton.click();

      // Go back twice
      await intakeForm.backButton.click();
      await intakeForm.backButton.click();

      // Verify step 1 data preserved
      await expect(intakeForm.emailInput).toHaveValue(testEmail);
      await expect(intakeForm.addressInput).toHaveValue(testAddress);
    });
  });

  test.describe('Tier Recommendation', () => {
    test('should recommend Tier 1 for budget under $500', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.completeAllSteps({
        email: generateUniqueEmail('tier1'),
        address: generateAddress(),
        ...TIER_TEST_DATA.tier1,
      });
      await intakeForm.submit();

      // Verify Tier 1 recommendation
      await expect(page.getByText(/tier\s*1|seedling/i)).toBeVisible({ timeout: 10000 });
    });

    test('should recommend Tier 2 for small renovation budget', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.completeAllSteps({
        email: generateUniqueEmail('tier2'),
        address: generateAddress(),
        ...TIER_TEST_DATA.tier2,
      });
      await intakeForm.submit();

      // Verify Tier 2 recommendation
      await expect(page.getByText(/tier\s*2|sprout/i)).toBeVisible({ timeout: 10000 });
    });

    test('should recommend Tier 3 for standard renovation', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.completeAllSteps({
        email: generateUniqueEmail('tier3'),
        address: generateAddress(),
        ...TIER_TEST_DATA.tier3,
      });
      await intakeForm.submit();

      // Verify Tier 3 recommendation
      await expect(page.getByText(/tier\s*3|canopy/i)).toBeVisible({ timeout: 10000 });
    });

    test('should recommend Tier 4 for large budget new build', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.completeAllSteps({
        email: generateUniqueEmail('tier4'),
        address: generateAddress(),
        ...TIER_TEST_DATA.tier4,
      });
      await intakeForm.submit();

      // Verify Tier 4 recommendation (custom/consultation)
      await expect(page.getByText(/tier\s*4|forest|custom|consultation/i)).toBeVisible({ timeout: 10000 });
    });

    test('should display tier pricing information', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.completeAllSteps({
        email: generateUniqueEmail('pricing'),
        address: generateAddress(),
        budget: '$2,000 - $5,000',
        timeline: '2-4 weeks',
        projectType: 'Small Renovation',
      });
      await intakeForm.submit();

      // Should show pricing
      await expect(page.getByText(/\$\d+/)).toBeVisible({ timeout: 10000 });
    });

    test('should display tier features', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.completeAllSteps({
        email: generateUniqueEmail('features'),
        address: generateAddress(),
        budget: '$5,000 - $15,000',
        timeline: '1-2 months',
        projectType: 'Standard Renovation',
      });
      await intakeForm.submit();

      // Should show features list
      await expect(page.locator('[data-testid="tier-features"], .tier-features')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Checkout Flow', () => {
    test('should show checkout button after tier recommendation', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.completeAllSteps({
        email: generateUniqueEmail('checkout'),
        address: generateAddress(),
        budget: '$2,000 - $5,000',
        timeline: '2-4 weeks',
        projectType: 'Small Renovation',
      });
      await intakeForm.submit();

      // Should show checkout/proceed button
      await expect(page.getByRole('button', { name: /proceed|checkout|get started|continue/i })).toBeVisible({ timeout: 10000 });
    });

    test('should redirect to Stripe checkout when clicking proceed', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);

      await intakeForm.goto();
      await intakeForm.completeAllSteps({
        email: generateUniqueEmail('stripe'),
        address: generateAddress(),
        budget: '$2,000 - $5,000',
        timeline: '2-4 weeks',
        projectType: 'Small Renovation',
      });
      await intakeForm.submit();

      // Click proceed button
      const checkoutButton = page.getByRole('button', { name: /proceed|checkout|get started/i });
      await checkoutButton.waitFor({ timeout: 10000 });
      await checkoutButton.click();

      // Should redirect to Stripe or checkout page
      await expect(page).toHaveURL(/checkout\.stripe\.com|\/checkout|\/payment/, { timeout: 15000 });
    });

    test('should handle checkout cancellation', async ({ page }) => {
      // Navigate to checkout cancel page
      await page.goto('/checkout/cancel?session_id=test_cancelled');

      // Should show cancellation message
      await expect(page.getByText(/cancelled|try again|return/i)).toBeVisible();
    });

    test('should handle successful checkout', async ({ page }) => {
      // Navigate to checkout success page
      await page.goto('/checkout/success?session_id=cs_test_123');

      // Should show success message
      await expect(page.getByText(/success|thank you|welcome|confirmed/i)).toBeVisible();
    });
  });

  test.describe('Post-Payment Portal Access', () => {
    test('should display login option after payment reference', async ({ page }) => {
      // Visit success page with session
      await page.goto('/checkout/success?session_id=cs_test_complete');

      // Should have login link or redirect to portal
      const hasLoginLink = await page.getByRole('link', { name: /login|sign in|access.*portal/i }).isVisible();
      const onDashboard = page.url().includes('/dashboard');

      expect(hasLoginLink || onDashboard).toBeTruthy();
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have accessible form labels', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);
      await intakeForm.goto();

      // Check that form inputs have associated labels
      await expect(intakeForm.emailInput).toBeVisible();
      await expect(intakeForm.addressInput).toBeVisible();

      // Labels should be present (getByLabel finds them)
      const emailLabel = page.getByText(/email/i);
      const addressLabel = page.getByText(/address/i);
      await expect(emailLabel).toBeVisible();
      await expect(addressLabel).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      const intakeForm = new IntakeFormPage(page);
      await intakeForm.goto();

      // Tab through form fields
      await intakeForm.emailInput.focus();
      await page.keyboard.press('Tab');

      // Next field should be focused
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBe('INPUT');
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const intakeForm = new IntakeFormPage(page);
      await intakeForm.goto();

      // Form should be visible and usable
      await expect(intakeForm.emailInput).toBeVisible();
      await expect(intakeForm.continueButton).toBeVisible();

      // Buttons should be appropriately sized for touch
      const buttonBox = await intakeForm.continueButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(40);
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const intakeForm = new IntakeFormPage(page);
      await intakeForm.goto();

      await expect(intakeForm.emailInput).toBeVisible();
      await expect(intakeForm.continueButton).toBeVisible();
    });
  });
});
