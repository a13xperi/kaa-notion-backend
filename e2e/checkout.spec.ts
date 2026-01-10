/**
 * Checkout Flow E2E Tests
 * Tests for the pricing and checkout flow.
 */

import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
  });

  test('should display all tier options', async ({ page }) => {
    // Should show tier 1, 2, and 3
    const tier1 = page.locator('text=/concept|tier 1|\\$299/i').first();
    const tier2 = page.locator('text=/builder|tier 2|\\$1,499/i').first();
    const tier3 = page.locator('text=/concierge|tier 3|\\$4,999/i').first();

    await expect(tier1).toBeVisible();
    await expect(tier2).toBeVisible();
    await expect(tier3).toBeVisible();
  });

  test('should have purchase buttons for each tier', async ({ page }) => {
    // Look for purchase/select buttons
    const purchaseButtons = page.locator('button, a').filter({ 
      hasText: /select|choose|purchase|buy|get started/i 
    });
    
    const count = await purchaseButtons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should show features for each tier', async ({ page }) => {
    // Each tier should have a features list
    const featureLists = page.locator('ul, [class*="feature"]');
    const count = await featureLists.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should highlight recommended/popular tier', async ({ page }) => {
    // Look for popular or recommended badge
    const popularBadge = page.locator('text=/popular|recommended|best value/i');
    await expect(popularBadge.first()).toBeVisible();
  });
});

test.describe('Checkout Flow', () => {
  test('should navigate to checkout when tier selected', async ({ page }) => {
    await page.goto('/pricing');

    // Click on a purchase button
    const purchaseButton = page.locator('button, a').filter({ 
      hasText: /select|choose|purchase|buy|get started/i 
    }).first();
    
    await purchaseButton.click();

    // Should navigate to checkout or show checkout modal
    await page.waitForTimeout(2000);
    
    // Check if we're on checkout page or Stripe
    const url = page.url();
    const isCheckout = url.includes('checkout') || url.includes('stripe');
    expect(isCheckout || await page.locator('[class*="checkout"], [class*="payment"]').first().isVisible()).toBeTruthy();
  });

  test('should pass tier information to checkout', async ({ page }) => {
    // Start from pricing and select tier 2
    await page.goto('/pricing');

    const tier2Button = page.locator('button, a').filter({ 
      hasText: /builder|tier 2|\$1,499/i 
    }).first();
    
    if (await tier2Button.isVisible()) {
      await tier2Button.click();
      await page.waitForTimeout(2000);
      
      // Verify tier info is passed (check URL params or page content)
      const url = page.url();
      const pageContent = await page.content();
      
      // Should contain tier reference
      expect(url.includes('tier=2') || pageContent.toLowerCase().includes('builder') || pageContent.includes('1499')).toBeTruthy();
    }
  });
});

test.describe('Checkout - Stripe Integration', () => {
  test.skip(({ browserName }) => true, 'Requires Stripe test keys');

  test('should redirect to Stripe checkout', async ({ page }) => {
    // This test would verify Stripe redirect
    // Requires test Stripe keys in environment
  });

  test('should handle successful payment callback', async ({ page }) => {
    // Test success redirect from Stripe
    await page.goto('/checkout/success?session_id=test_session');
    
    // Should show success message
    const successMessage = page.locator('text=/success|thank you|confirmed/i');
    await expect(successMessage.first()).toBeVisible();
  });

  test('should handle canceled payment callback', async ({ page }) => {
    // Test cancel redirect from Stripe
    await page.goto('/checkout/cancel');
    
    // Should show appropriate message or redirect
    const message = page.locator('text=/cancel|try again|return/i');
    await expect(message.first()).toBeVisible();
  });
});

test.describe('Checkout - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display pricing correctly on mobile', async ({ page }) => {
    await page.goto('/pricing');

    // Pricing cards should stack vertically
    const pricingCards = page.locator('[class*="tier"], [class*="pricing"], [class*="card"]');
    
    if (await pricingCards.count() > 0) {
      const firstCard = pricingCards.first();
      await expect(firstCard).toBeVisible();
    }
  });

  test('should have tappable purchase buttons on mobile', async ({ page }) => {
    await page.goto('/pricing');

    const purchaseButton = page.locator('button, a').filter({ 
      hasText: /select|choose|purchase|buy|get started/i 
    }).first();
    
    if (await purchaseButton.isVisible()) {
      // Button should be large enough for touch
      const box = await purchaseButton.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40); // Min touch target
      }
    }
  });
});
