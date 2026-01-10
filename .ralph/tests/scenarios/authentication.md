# Authentication Test Scenarios

## Overview
Comprehensive test coverage for all authentication and authorization flows.

---

## Critical Path Tests (@critical)

### AUTH-001: Email/Password Login
```typescript
test.describe('Email/Password Login @critical', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'validPassword123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'wrongPassword');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });

  test('should handle account lockout after failed attempts', async ({ page }) => {
    await page.goto('/login');
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="email"]', 'user@example.com');
      await page.fill('[data-testid="password"]', 'wrongPassword');
      await page.click('[data-testid="login-button"]');
    }
    await expect(page.locator('[data-testid="lockout-message"]')).toBeVisible();
  });
});
```

### AUTH-002: OAuth Login
```typescript
test.describe('OAuth Login @critical', () => {
  const providers = ['google', 'apple', 'microsoft'];

  for (const provider of providers) {
    test(`should initiate ${provider} OAuth flow`, async ({ page }) => {
      await page.goto('/login');
      await page.click(`[data-testid="oauth-${provider}"]`);
      // Verify redirect to OAuth provider
      await expect(page.url()).toContain(provider);
    });
  }

  test('should handle OAuth callback success', async ({ page }) => {
    // Mock OAuth callback
    await page.goto('/auth/callback?code=valid_code&state=valid_state');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle OAuth cancellation', async ({ page }) => {
    await page.goto('/auth/callback?error=access_denied');
    await expect(page.locator('[data-testid="oauth-error"]')).toBeVisible();
  });
});
```

### AUTH-003: Session Management
```typescript
test.describe('Session Management @critical', () => {
  test('should maintain session across page refreshes', async ({ page }) => {
    await loginAsUser(page);
    await page.reload();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should redirect to login on session expiry', async ({ page }) => {
    await loginAsUser(page);
    // Simulate session expiry
    await page.evaluate(() => localStorage.clear());
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should handle concurrent sessions', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await loginAsUser(page1);
    await loginAsUser(page2);

    // Both sessions should be valid
    await page1.goto('/dashboard');
    await page2.goto('/dashboard');
    await expect(page1.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page2.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});
```

---

## Edge Case Tests (@edge)

### Input Validation
```typescript
test.describe('Login Input Validation @edge', () => {
  test('should reject empty email', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('required');
  });

  test('should reject invalid email format', async ({ page }) => {
    const invalidEmails = ['notanemail', 'missing@tld', '@nodomain.com', 'spaces in@email.com'];
    for (const email of invalidEmails) {
      await page.goto('/login');
      await page.fill('[data-testid="email"]', email);
      await page.click('[data-testid="login-button"]');
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    }
  });

  test('should handle XSS attempts in email field', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', '<script>alert("xss")</script>@test.com');
    await page.click('[data-testid="login-button"]');
    // Should sanitize input, not execute script
    await expect(page.locator('script')).toHaveCount(0);
  });

  test('should handle SQL injection attempts', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', "' OR '1'='1");
    await page.fill('[data-testid="password"]', "' OR '1'='1");
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
```

### Password Reset
```typescript
test.describe('Password Reset @edge', () => {
  test('should send reset email for existing account', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.click('[data-testid="reset-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('email sent');
  });

  test('should handle non-existent email gracefully', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('[data-testid="email"]', 'nonexistent@example.com');
    await page.click('[data-testid="reset-button"]');
    // Should show same message to prevent email enumeration
    await expect(page.locator('[data-testid="success-message"]')).toContainText('email sent');
  });

  test('should reject expired reset token', async ({ page }) => {
    await page.goto('/reset-password?token=expired_token');
    await expect(page.locator('[data-testid="token-expired"]')).toBeVisible();
  });

  test('should enforce password requirements', async ({ page }) => {
    await page.goto('/reset-password?token=valid_token');
    const weakPasswords = ['short', 'nouppercase123', 'NOLOWERCASE123', 'NoNumbers'];
    for (const password of weakPasswords) {
      await page.fill('[data-testid="new-password"]', password);
      await page.click('[data-testid="submit-button"]');
      await expect(page.locator('[data-testid="password-requirements"]')).toBeVisible();
    }
  });
});
```

### Multi-Factor Authentication
```typescript
test.describe('MFA @edge', () => {
  test('should prompt for MFA after password', async ({ page }) => {
    await loginAsUserWithMFA(page);
    await expect(page.locator('[data-testid="mfa-prompt"]')).toBeVisible();
  });

  test('should accept valid TOTP code', async ({ page }) => {
    await loginAsUserWithMFA(page);
    await page.fill('[data-testid="totp-code"]', '123456'); // Mock valid code
    await page.click('[data-testid="verify-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should reject invalid TOTP code', async ({ page }) => {
    await loginAsUserWithMFA(page);
    await page.fill('[data-testid="totp-code"]', '000000');
    await page.click('[data-testid="verify-button"]');
    await expect(page.locator('[data-testid="mfa-error"]')).toBeVisible();
  });

  test('should allow backup code usage', async ({ page }) => {
    await loginAsUserWithMFA(page);
    await page.click('[data-testid="use-backup-code"]');
    await page.fill('[data-testid="backup-code"]', 'valid-backup-code');
    await page.click('[data-testid="verify-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle rate limiting on MFA attempts', async ({ page }) => {
    await loginAsUserWithMFA(page);
    for (let i = 0; i < 10; i++) {
      await page.fill('[data-testid="totp-code"]', '000000');
      await page.click('[data-testid="verify-button"]');
    }
    await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
  });
});
```

---

## Unit Tests

```typescript
// tests/unit/auth.test.ts

describe('Password Hashing', () => {
  test('should hash password correctly', async () => {
    const hash = await hashPassword('testPassword123');
    expect(hash).not.toBe('testPassword123');
    expect(hash.length).toBeGreaterThan(50);
  });

  test('should verify correct password', async () => {
    const hash = await hashPassword('testPassword123');
    const isValid = await verifyPassword('testPassword123', hash);
    expect(isValid).toBe(true);
  });

  test('should reject incorrect password', async () => {
    const hash = await hashPassword('testPassword123');
    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });
});

describe('Token Generation', () => {
  test('should generate valid JWT', () => {
    const token = generateToken({ userId: '123', role: 'user' });
    expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  test('should decode token correctly', () => {
    const token = generateToken({ userId: '123', role: 'user' });
    const decoded = decodeToken(token);
    expect(decoded.userId).toBe('123');
    expect(decoded.role).toBe('user');
  });

  test('should detect expired token', () => {
    const expiredToken = generateToken({ userId: '123' }, { expiresIn: '-1h' });
    expect(() => verifyToken(expiredToken)).toThrow('TokenExpired');
  });

  test('should detect tampered token', () => {
    const token = generateToken({ userId: '123' });
    const tamperedToken = token.slice(0, -5) + 'xxxxx';
    expect(() => verifyToken(tamperedToken)).toThrow('InvalidToken');
  });
});

describe('Permission Checks', () => {
  test('should allow admin access to admin routes', () => {
    const user = { role: 'admin' };
    expect(canAccess(user, '/admin/users')).toBe(true);
  });

  test('should deny user access to admin routes', () => {
    const user = { role: 'user' };
    expect(canAccess(user, '/admin/users')).toBe(false);
  });

  test('should handle resource-level permissions', () => {
    const user = { id: '123', role: 'user' };
    const resource = { ownerId: '123' };
    expect(canModify(user, resource)).toBe(true);
  });

  test('should deny access to others resources', () => {
    const user = { id: '123', role: 'user' };
    const resource = { ownerId: '456' };
    expect(canModify(user, resource)).toBe(false);
  });
});

describe('Rate Limiting', () => {
  test('should allow requests under limit', () => {
    const limiter = createRateLimiter({ max: 5, window: 60 });
    for (let i = 0; i < 5; i++) {
      expect(limiter.check('user-123')).toBe(true);
    }
  });

  test('should block requests over limit', () => {
    const limiter = createRateLimiter({ max: 5, window: 60 });
    for (let i = 0; i < 5; i++) {
      limiter.check('user-123');
    }
    expect(limiter.check('user-123')).toBe(false);
  });

  test('should reset after window expires', async () => {
    const limiter = createRateLimiter({ max: 1, window: 1 });
    limiter.check('user-123');
    expect(limiter.check('user-123')).toBe(false);
    await sleep(1100);
    expect(limiter.check('user-123')).toBe(true);
  });
});
```

---

## Test Data Fixtures

```typescript
// tests/fixtures/auth.ts

export const validUsers = [
  { email: 'user@example.com', password: 'ValidPass123!', role: 'user' },
  { email: 'admin@example.com', password: 'AdminPass123!', role: 'admin' },
  { email: 'manager@example.com', password: 'ManagerPass123!', role: 'manager' },
];

export const invalidCredentials = [
  { email: 'user@example.com', password: 'wrongpassword', expectedError: 'Invalid credentials' },
  { email: 'nonexistent@example.com', password: 'anypassword', expectedError: 'Invalid credentials' },
  { email: 'locked@example.com', password: 'ValidPass123!', expectedError: 'Account locked' },
  { email: 'unverified@example.com', password: 'ValidPass123!', expectedError: 'Email not verified' },
];

export const mfaTestCases = [
  { method: 'totp', validCode: '123456', invalidCode: '000000' },
  { method: 'sms', validCode: '123456', invalidCode: '000000' },
  { method: 'email', validCode: '123456', invalidCode: '000000' },
];
```
