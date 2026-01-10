# Payment Gateway Test Scenarios

## Overview
Comprehensive test coverage for all payment, billing, and subscription flows.

---

## Critical Path Tests (@critical)

### PAY-001: Credit Card Payment
```typescript
test.describe('Credit Card Payment @critical', () => {
  test('should complete successful payment', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/billing/upgrade');

    // Select plan
    await page.click('[data-testid="plan-pro"]');
    await page.click('[data-testid="continue-button"]');

    // Enter card details (Stripe test card)
    const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await stripeFrame.locator('[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('[name="cvc"]').fill('123');
    await stripeFrame.locator('[name="postal"]').fill('10001');

    await page.click('[data-testid="pay-button"]');

    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page).toHaveURL('/billing/success');
  });

  test('should handle declined card', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/billing/upgrade');
    await page.click('[data-testid="plan-pro"]');
    await page.click('[data-testid="continue-button"]');

    // Use Stripe declined test card
    const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await stripeFrame.locator('[name="cardnumber"]').fill('4000000000000002');
    await stripeFrame.locator('[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('[name="cvc"]').fill('123');

    await page.click('[data-testid="pay-button"]');

    await expect(page.locator('[data-testid="payment-error"]')).toContainText('declined');
  });

  test('should handle 3D Secure authentication', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/billing/upgrade');
    await page.click('[data-testid="plan-pro"]');
    await page.click('[data-testid="continue-button"]');

    // Use Stripe 3DS test card
    const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await stripeFrame.locator('[name="cardnumber"]').fill('4000002500003155');
    await stripeFrame.locator('[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('[name="cvc"]').fill('123');

    await page.click('[data-testid="pay-button"]');

    // Handle 3DS modal
    const threeDSFrame = page.frameLocator('iframe[name="stripe-challenge-frame"]');
    await threeDSFrame.locator('[data-testid="test-source-authorize-3ds"]').click();

    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
  });
});
```

### PAY-002: Subscription Management
```typescript
test.describe('Subscription Management @critical', () => {
  test('should upgrade subscription', async ({ page }) => {
    await loginAsSubscribedUser(page, 'basic');
    await page.goto('/settings/billing');

    await page.click('[data-testid="upgrade-plan"]');
    await page.click('[data-testid="plan-pro"]');
    await page.click('[data-testid="confirm-upgrade"]');

    await expect(page.locator('[data-testid="current-plan"]')).toContainText('Pro');
    // Verify proration message
    await expect(page.locator('[data-testid="proration-info"]')).toBeVisible();
  });

  test('should downgrade subscription', async ({ page }) => {
    await loginAsSubscribedUser(page, 'pro');
    await page.goto('/settings/billing');

    await page.click('[data-testid="change-plan"]');
    await page.click('[data-testid="plan-basic"]');
    await page.click('[data-testid="confirm-downgrade"]');

    // Downgrade happens at end of billing period
    await expect(page.locator('[data-testid="downgrade-scheduled"]')).toBeVisible();
  });

  test('should cancel subscription', async ({ page }) => {
    await loginAsSubscribedUser(page, 'pro');
    await page.goto('/settings/billing');

    await page.click('[data-testid="cancel-subscription"]');
    await page.fill('[data-testid="cancellation-reason"]', 'Testing cancellation');
    await page.click('[data-testid="confirm-cancel"]');

    await expect(page.locator('[data-testid="subscription-cancelled"]')).toBeVisible();
    await expect(page.locator('[data-testid="access-until"]')).toBeVisible();
  });

  test('should reactivate cancelled subscription', async ({ page }) => {
    await loginAsUserWithCancelledSubscription(page);
    await page.goto('/settings/billing');

    await page.click('[data-testid="reactivate-subscription"]');
    await page.click('[data-testid="confirm-reactivate"]');

    await expect(page.locator('[data-testid="subscription-active"]')).toBeVisible();
  });
});
```

### PAY-003: Invoice & Receipts
```typescript
test.describe('Invoices & Receipts @critical', () => {
  test('should display payment history', async ({ page }) => {
    await loginAsSubscribedUser(page, 'pro');
    await page.goto('/settings/billing/history');

    await expect(page.locator('[data-testid="invoice-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-item"]')).toHaveCount.greaterThan(0);
  });

  test('should download invoice PDF', async ({ page }) => {
    await loginAsSubscribedUser(page, 'pro');
    await page.goto('/settings/billing/history');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-invoice-0"]'),
    ]);

    expect(download.suggestedFilename()).toMatch(/invoice.*\.pdf$/);
  });

  test('should send invoice to email', async ({ page }) => {
    await loginAsSubscribedUser(page, 'pro');
    await page.goto('/settings/billing/history');

    await page.click('[data-testid="email-invoice-0"]');
    await expect(page.locator('[data-testid="email-sent-confirmation"]')).toBeVisible();
  });
});
```

---

## Edge Case Tests (@edge)

### Card Validation
```typescript
test.describe('Card Validation @edge', () => {
  const testCards = [
    { number: '4000000000000069', error: 'expired_card' },
    { number: '4000000000000127', error: 'incorrect_cvc' },
    { number: '4000000000000119', error: 'processing_error' },
    { number: '4000000000009995', error: 'insufficient_funds' },
    { number: '4000000000009987', error: 'lost_card' },
    { number: '4000000000009979', error: 'stolen_card' },
  ];

  for (const card of testCards) {
    test(`should handle ${card.error}`, async ({ page }) => {
      await loginAsUser(page);
      await page.goto('/billing/upgrade');
      await selectPlanAndEnterCard(page, card.number);
      await page.click('[data-testid="pay-button"]');
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    });
  }
});
```

### Coupon & Discounts
```typescript
test.describe('Coupons & Discounts @edge', () => {
  test('should apply valid coupon code', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/billing/upgrade');
    await page.click('[data-testid="plan-pro"]');

    await page.fill('[data-testid="coupon-code"]', 'SAVE20');
    await page.click('[data-testid="apply-coupon"]');

    await expect(page.locator('[data-testid="discount-applied"]')).toContainText('20%');
    await expect(page.locator('[data-testid="final-price"]')).not.toBe(
      page.locator('[data-testid="original-price"]')
    );
  });

  test('should reject expired coupon', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/billing/upgrade');

    await page.fill('[data-testid="coupon-code"]', 'EXPIRED2023');
    await page.click('[data-testid="apply-coupon"]');

    await expect(page.locator('[data-testid="coupon-error"]')).toContainText('expired');
  });

  test('should reject invalid coupon', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/billing/upgrade');

    await page.fill('[data-testid="coupon-code"]', 'NOTAREALCODE');
    await page.click('[data-testid="apply-coupon"]');

    await expect(page.locator('[data-testid="coupon-error"]')).toContainText('invalid');
  });

  test('should handle coupon with usage limit', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/billing/upgrade');

    await page.fill('[data-testid="coupon-code"]', 'LIMITEDUSE');
    await page.click('[data-testid="apply-coupon"]');

    await expect(page.locator('[data-testid="coupon-error"]')).toContainText('limit reached');
  });
});
```

### Refunds
```typescript
test.describe('Refunds @edge', () => {
  test('should request refund for recent payment', async ({ page }) => {
    await loginAsSubscribedUser(page, 'pro');
    await page.goto('/settings/billing/history');

    await page.click('[data-testid="request-refund-0"]');
    await page.fill('[data-testid="refund-reason"]', 'Not satisfied with service');
    await page.click('[data-testid="submit-refund"]');

    await expect(page.locator('[data-testid="refund-pending"]')).toBeVisible();
  });

  test('should reject refund for old payment', async ({ page }) => {
    await loginAsSubscribedUser(page, 'pro');
    await page.goto('/settings/billing/history');

    // Try to refund payment older than 30 days
    await page.click('[data-testid="request-refund-old"]');

    await expect(page.locator('[data-testid="refund-error"]')).toContainText('window expired');
  });
});
```

### Payment Method Management
```typescript
test.describe('Payment Methods @edge', () => {
  test('should add new payment method', async ({ page }) => {
    await loginAsSubscribedUser(page, 'pro');
    await page.goto('/settings/billing/payment-methods');

    await page.click('[data-testid="add-payment-method"]');
    await enterCardDetails(page, '4242424242424242');
    await page.click('[data-testid="save-card"]');

    await expect(page.locator('[data-testid="payment-method-list"] >> li')).toHaveCount.greaterThan(1);
  });

  test('should set default payment method', async ({ page }) => {
    await loginAsSubscribedUser(page, 'pro');
    await page.goto('/settings/billing/payment-methods');

    await page.click('[data-testid="set-default-1"]');

    await expect(page.locator('[data-testid="default-badge-1"]')).toBeVisible();
  });

  test('should remove payment method', async ({ page }) => {
    await loginAsSubscribedUser(page, 'pro');
    await page.goto('/settings/billing/payment-methods');

    const initialCount = await page.locator('[data-testid="payment-method-list"] >> li').count();
    await page.click('[data-testid="remove-payment-1"]');
    await page.click('[data-testid="confirm-remove"]');

    await expect(page.locator('[data-testid="payment-method-list"] >> li')).toHaveCount(initialCount - 1);
  });

  test('should prevent removing last payment method with active subscription', async ({ page }) => {
    await loginAsSubscribedUser(page, 'pro');
    await page.goto('/settings/billing/payment-methods');

    // User with only one payment method
    await page.click('[data-testid="remove-payment-0"]');

    await expect(page.locator('[data-testid="remove-error"]')).toContainText('active subscription');
  });
});
```

### Network & Error Handling
```typescript
test.describe('Payment Error Handling @edge', () => {
  test('should handle network timeout during payment', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/billing/upgrade');
    await selectPlanAndEnterCard(page, '4242424242424242');

    // Simulate network delay
    await page.route('**/api/payments/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 35000));
      route.continue();
    });

    await page.click('[data-testid="pay-button"]');
    await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
  });

  test('should show pending state for processing payment', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/billing/upgrade');
    await selectPlanAndEnterCard(page, '4242424242424242');

    await page.click('[data-testid="pay-button"]');

    // Should show processing indicator
    await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible();
  });

  test('should prevent double submission', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/billing/upgrade');
    await selectPlanAndEnterCard(page, '4242424242424242');

    // Click pay button multiple times
    await page.click('[data-testid="pay-button"]');
    await page.click('[data-testid="pay-button"]');
    await page.click('[data-testid="pay-button"]');

    // Button should be disabled after first click
    await expect(page.locator('[data-testid="pay-button"]')).toBeDisabled();
  });
});
```

---

## Unit Tests

```typescript
// tests/unit/payments.test.ts

describe('Price Calculations', () => {
  test('should calculate monthly price correctly', () => {
    const plan = { monthlyPrice: 29, yearlyPrice: 290 };
    expect(calculatePrice(plan, 'monthly')).toBe(29);
  });

  test('should calculate yearly price with discount', () => {
    const plan = { monthlyPrice: 29, yearlyPrice: 290 };
    expect(calculatePrice(plan, 'yearly')).toBe(290);
    expect(calculateSavings(plan, 'yearly')).toBe(58); // 29 * 12 - 290
  });

  test('should apply percentage discount correctly', () => {
    const price = 100;
    const discount = { type: 'percentage', value: 20 };
    expect(applyDiscount(price, discount)).toBe(80);
  });

  test('should apply fixed discount correctly', () => {
    const price = 100;
    const discount = { type: 'fixed', value: 25 };
    expect(applyDiscount(price, discount)).toBe(75);
  });

  test('should not allow negative final price', () => {
    const price = 20;
    const discount = { type: 'fixed', value: 50 };
    expect(applyDiscount(price, discount)).toBe(0);
  });
});

describe('Proration Calculations', () => {
  test('should calculate upgrade proration', () => {
    const currentPlan = { monthlyPrice: 29, startDate: new Date('2024-01-01') };
    const newPlan = { monthlyPrice: 99 };
    const midCycleDate = new Date('2024-01-15');

    const proration = calculateProration(currentPlan, newPlan, midCycleDate);
    expect(proration.credit).toBeCloseTo(14.5); // Half month unused
    expect(proration.charge).toBeCloseTo(49.5); // Half month at new rate
  });

  test('should handle downgrade proration', () => {
    const currentPlan = { monthlyPrice: 99, startDate: new Date('2024-01-01') };
    const newPlan = { monthlyPrice: 29 };
    const midCycleDate = new Date('2024-01-15');

    const proration = calculateProration(currentPlan, newPlan, midCycleDate);
    expect(proration.credit).toBeCloseTo(49.5); // Half month unused at high rate
    expect(proration.charge).toBe(0); // Downgrade starts at next billing
  });
});

describe('Tax Calculations', () => {
  test('should calculate US tax correctly', () => {
    const price = 100;
    const address = { country: 'US', state: 'CA' };
    const tax = calculateTax(price, address);
    expect(tax.rate).toBe(0.0725); // CA sales tax
    expect(tax.amount).toBe(7.25);
  });

  test('should calculate EU VAT correctly', () => {
    const price = 100;
    const address = { country: 'DE' };
    const tax = calculateTax(price, address);
    expect(tax.rate).toBe(0.19); // German VAT
    expect(tax.amount).toBe(19);
  });

  test('should handle tax-exempt countries', () => {
    const price = 100;
    const address = { country: 'HK' };
    const tax = calculateTax(price, address);
    expect(tax.rate).toBe(0);
    expect(tax.amount).toBe(0);
  });
});

describe('Webhook Signature Validation', () => {
  test('should validate correct Stripe signature', () => {
    const payload = '{"type": "payment_intent.succeeded"}';
    const signature = createStripeSignature(payload, 'whsec_test');

    expect(validateStripeWebhook(payload, signature, 'whsec_test')).toBe(true);
  });

  test('should reject invalid signature', () => {
    const payload = '{"type": "payment_intent.succeeded"}';
    const invalidSignature = 'invalid_signature';

    expect(validateStripeWebhook(payload, invalidSignature, 'whsec_test')).toBe(false);
  });

  test('should reject expired signature', () => {
    const payload = '{"type": "payment_intent.succeeded"}';
    const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
    const signature = createStripeSignature(payload, 'whsec_test', oldTimestamp);

    expect(() => validateStripeWebhook(payload, signature, 'whsec_test')).toThrow('timestamp too old');
  });
});

describe('Idempotency', () => {
  test('should generate consistent idempotency key', () => {
    const params = { userId: '123', planId: 'pro', amount: 99 };
    const key1 = generateIdempotencyKey(params);
    const key2 = generateIdempotencyKey(params);
    expect(key1).toBe(key2);
  });

  test('should generate different keys for different params', () => {
    const key1 = generateIdempotencyKey({ userId: '123', amount: 99 });
    const key2 = generateIdempotencyKey({ userId: '123', amount: 100 });
    expect(key1).not.toBe(key2);
  });
});
```

---

## Test Data Fixtures

```typescript
// tests/fixtures/payments.ts

export const testPlans = [
  { id: 'free', name: 'Free', monthlyPrice: 0, yearlyPrice: 0 },
  { id: 'basic', name: 'Basic', monthlyPrice: 19, yearlyPrice: 190 },
  { id: 'pro', name: 'Pro', monthlyPrice: 49, yearlyPrice: 490 },
  { id: 'enterprise', name: 'Enterprise', monthlyPrice: 199, yearlyPrice: 1990 },
];

export const testCards = {
  success: '4242424242424242',
  declined: '4000000000000002',
  expired: '4000000000000069',
  insufficientFunds: '4000000000009995',
  requires3DS: '4000002500003155',
  requiresAuth: '4000002760003184',
};

export const testCoupons = [
  { code: 'SAVE20', discount: 20, type: 'percentage', valid: true },
  { code: 'SAVE50', discount: 50, type: 'fixed', valid: true },
  { code: 'EXPIRED2023', discount: 10, type: 'percentage', valid: false },
  { code: 'LIMITEDUSE', discount: 15, type: 'percentage', valid: false, reason: 'Usage limit reached' },
];
```
