# Onboarding Test Scenarios

## Overview
Comprehensive test coverage for all user onboarding and team invitation flows.

---

## Critical Path Tests (@critical)

### ONB-001: New User Registration
```typescript
test.describe('User Registration @critical', () => {
  test('should complete full registration flow', async ({ page }) => {
    await page.goto('/signup');

    // Step 1: Account creation
    await page.fill('[data-testid="email"]', 'newuser@example.com');
    await page.fill('[data-testid="password"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password"]', 'SecurePass123!');
    await page.click('[data-testid="signup-button"]');

    await expect(page.locator('[data-testid="verify-email-prompt"]')).toBeVisible();

    // Step 2: Email verification (mock)
    await page.goto('/verify-email?token=valid_token');

    // Step 3: Profile setup
    await expect(page).toHaveURL('/onboarding/profile');
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="company"]', 'Acme Corp');
    await page.click('[data-testid="continue-button"]');

    // Step 4: Welcome tour
    await expect(page).toHaveURL('/onboarding/tour');
    await page.click('[data-testid="start-tour"]');
    await page.click('[data-testid="next-step"]');
    await page.click('[data-testid="next-step"]');
    await page.click('[data-testid="finish-tour"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('John');
  });

  test('should reject duplicate email', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('[data-testid="email"]', 'existing@example.com');
    await page.fill('[data-testid="password"]', 'SecurePass123!');
    await page.click('[data-testid="signup-button"]');

    await expect(page.locator('[data-testid="email-error"]')).toContainText('already registered');
  });

  test('should enforce password requirements', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('[data-testid="email"]', 'newuser@example.com');

    const weakPasswords = ['short', '12345678', 'nouppercase', 'NOLOWERCASE'];
    for (const password of weakPasswords) {
      await page.fill('[data-testid="password"]', password);
      await page.click('[data-testid="signup-button"]');
      await expect(page.locator('[data-testid="password-requirements"]')).toBeVisible();
    }
  });
});
```

### ONB-002: Setup Wizard
```typescript
test.describe('Setup Wizard @critical', () => {
  test('should complete workspace setup', async ({ page }) => {
    await loginAsNewUser(page);
    await page.goto('/onboarding/workspace');

    // Workspace info
    await page.fill('[data-testid="workspace-name"]', 'My Workspace');
    await page.selectOption('[data-testid="team-size"]', '10-50');
    await page.selectOption('[data-testid="industry"]', 'technology');
    await page.click('[data-testid="next-step"]');

    // Goals selection
    await page.check('[data-testid="goal-project-management"]');
    await page.check('[data-testid="goal-team-collaboration"]');
    await page.click('[data-testid="next-step"]');

    // Integrations (optional)
    await page.click('[data-testid="skip-integrations"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="workspace-name"]')).toContainText('My Workspace');
  });

  test('should allow navigation between wizard steps', async ({ page }) => {
    await loginAsNewUser(page);
    await page.goto('/onboarding/workspace');

    await page.fill('[data-testid="workspace-name"]', 'Test Workspace');
    await page.click('[data-testid="next-step"]');

    // Go back
    await page.click('[data-testid="back-button"]');
    await expect(page.locator('[data-testid="workspace-name"]')).toHaveValue('Test Workspace');
  });

  test('should preserve progress on page refresh', async ({ page }) => {
    await loginAsNewUser(page);
    await page.goto('/onboarding/workspace');

    await page.fill('[data-testid="workspace-name"]', 'Persistent Workspace');
    await page.click('[data-testid="next-step"]');

    await page.reload();

    // Should return to current step with data preserved
    await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 2');
  });
});
```

### ONB-003: Team Invitations
```typescript
test.describe('Team Invitations @critical', () => {
  test('should send team invitations', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings/team');

    await page.click('[data-testid="invite-members"]');
    await page.fill('[data-testid="invite-email-0"]', 'member1@example.com');
    await page.click('[data-testid="add-another"]');
    await page.fill('[data-testid="invite-email-1"]', 'member2@example.com');
    await page.selectOption('[data-testid="invite-role"]', 'member');
    await page.click('[data-testid="send-invites"]');

    await expect(page.locator('[data-testid="invite-success"]')).toContainText('2 invitations sent');
  });

  test('should accept team invitation', async ({ page }) => {
    await page.goto('/invite/accept?token=valid_invite_token');

    // Create account or link existing
    await page.fill('[data-testid="password"]', 'NewMember123!');
    await page.fill('[data-testid="confirm-password"]', 'NewMember123!');
    await page.click('[data-testid="accept-invite"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="workspace-name"]')).toContainText('Invited Workspace');
  });

  test('should handle expired invitation', async ({ page }) => {
    await page.goto('/invite/accept?token=expired_token');

    await expect(page.locator('[data-testid="invite-expired"]')).toBeVisible();
    await expect(page.locator('[data-testid="request-new-invite"]')).toBeVisible();
  });
});
```

---

## Edge Case Tests (@edge)

### Email Verification
```typescript
test.describe('Email Verification @edge', () => {
  test('should handle expired verification token', async ({ page }) => {
    await page.goto('/verify-email?token=expired_token');
    await expect(page.locator('[data-testid="token-expired"]')).toBeVisible();
    await expect(page.locator('[data-testid="resend-verification"]')).toBeVisible();
  });

  test('should resend verification email', async ({ page }) => {
    await page.goto('/verify-email?token=expired_token');
    await page.click('[data-testid="resend-verification"]');

    await expect(page.locator('[data-testid="verification-sent"]')).toBeVisible();
  });

  test('should handle already verified token', async ({ page }) => {
    await page.goto('/verify-email?token=already_used_token');
    await expect(page.locator('[data-testid="already-verified"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-link"]')).toBeVisible();
  });
});
```

### Data Import
```typescript
test.describe('Data Import @edge', () => {
  test('should import CSV data', async ({ page }) => {
    await loginAsNewUser(page);
    await page.goto('/onboarding/import');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles('tests/fixtures/valid-import.csv');

    await page.click('[data-testid="preview-import"]');
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="row-count"]')).toContainText('100 rows');

    await page.click('[data-testid="start-import"]');
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 30000 });
  });

  test('should handle invalid CSV format', async ({ page }) => {
    await loginAsNewUser(page);
    await page.goto('/onboarding/import');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles('tests/fixtures/invalid-format.csv');

    await expect(page.locator('[data-testid="format-error"]')).toBeVisible();
  });

  test('should handle large file import', async ({ page }) => {
    await loginAsNewUser(page);
    await page.goto('/onboarding/import');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles('tests/fixtures/large-import.csv'); // 10MB+

    await page.click('[data-testid="preview-import"]');
    await expect(page.locator('[data-testid="processing-large-file"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible({ timeout: 60000 });
  });

  test('should detect and handle duplicates', async ({ page }) => {
    await loginAsNewUser(page);
    await page.goto('/onboarding/import');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles('tests/fixtures/import-with-duplicates.csv');

    await page.click('[data-testid="preview-import"]');
    await expect(page.locator('[data-testid="duplicate-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="duplicate-count"]')).toContainText('5 duplicates');

    // Choose duplicate handling strategy
    await page.selectOption('[data-testid="duplicate-strategy"]', 'skip');
    await page.click('[data-testid="start-import"]');
  });
});
```

### Progressive Onboarding
```typescript
test.describe('Progressive Onboarding @edge', () => {
  test('should skip optional steps', async ({ page }) => {
    await loginAsNewUser(page);
    await page.goto('/onboarding/workspace');

    // Skip workspace setup
    await page.click('[data-testid="skip-step"]');

    // Should still be able to proceed
    await expect(page).toHaveURL('/onboarding/goals');
    await page.click('[data-testid="skip-step"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('should complete onboarding later', async ({ page }) => {
    await loginAsNewUser(page);
    await page.goto('/onboarding/workspace');

    // Navigate away
    await page.goto('/dashboard');

    // Should show incomplete onboarding reminder
    await expect(page.locator('[data-testid="complete-onboarding-cta"]')).toBeVisible();

    // Resume onboarding
    await page.click('[data-testid="complete-onboarding-cta"]');
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('should handle session timeout during onboarding', async ({ page }) => {
    await loginAsNewUser(page);
    await page.goto('/onboarding/workspace');

    await page.fill('[data-testid="workspace-name"]', 'Test Workspace');

    // Simulate session timeout
    await page.evaluate(() => localStorage.clear());
    await page.click('[data-testid="next-step"]');

    // Should redirect to login with return URL
    await expect(page).toHaveURL(/\/login.*returnUrl=/);
  });
});
```

---

## Unit Tests

```typescript
// tests/unit/onboarding.test.ts

describe('Onboarding Progress Tracking', () => {
  test('should calculate progress correctly', () => {
    const steps = ['account', 'profile', 'workspace', 'tour'];
    const completed = ['account', 'profile'];

    expect(calculateProgress(steps, completed)).toBe(50);
  });

  test('should identify next step', () => {
    const steps = ['account', 'profile', 'workspace', 'tour'];
    const completed = ['account', 'profile'];

    expect(getNextStep(steps, completed)).toBe('workspace');
  });

  test('should handle all steps completed', () => {
    const steps = ['account', 'profile'];
    const completed = ['account', 'profile'];

    expect(calculateProgress(steps, completed)).toBe(100);
    expect(getNextStep(steps, completed)).toBeNull();
  });
});

describe('Email Validation', () => {
  test('should validate correct email formats', () => {
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.com',
      'user@subdomain.example.com',
    ];

    validEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(true);
    });
  });

  test('should reject invalid email formats', () => {
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user@.com',
      'user space@example.com',
    ];

    invalidEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(false);
    });
  });
});

describe('Invitation Token Generation', () => {
  test('should generate unique tokens', () => {
    const token1 = generateInviteToken();
    const token2 = generateInviteToken();

    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(32);
  });

  test('should include expiration in token', () => {
    const token = generateInviteToken({ expiresIn: '7d' });
    const decoded = decodeInviteToken(token);

    expect(decoded.expiresAt).toBeDefined();
    expect(new Date(decoded.expiresAt)).toBeInstanceOf(Date);
  });
});

describe('Import Data Parsing', () => {
  test('should parse CSV correctly', () => {
    const csv = 'name,email\\nJohn,john@test.com\\nJane,jane@test.com';
    const result = parseCSV(csv);

    expect(result.length).toBe(2);
    expect(result[0].name).toBe('John');
    expect(result[0].email).toBe('john@test.com');
  });

  test('should handle quoted fields', () => {
    const csv = 'name,description\\n"John","Has a, comma"';
    const result = parseCSV(csv);

    expect(result[0].description).toBe('Has a, comma');
  });

  test('should detect column mismatches', () => {
    const csv = 'name,email\\nJohn\\nJane,jane@test.com';

    expect(() => parseCSV(csv, { strict: true })).toThrow('Column mismatch');
  });
});
```
