# Messaging & Communication Test Scenarios

## Overview
Comprehensive test coverage for real-time messaging, notifications, and communication flows.

---

## Critical Path Tests (@critical)

### MSG-001: Real-time Chat
```typescript
test.describe('Real-time Chat @critical', () => {
  test('should send and receive messages in real-time', async ({ browser }) => {
    // Create two browser contexts for two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const user1 = await context1.newPage();
    const user2 = await context2.newPage();

    await loginAsUser(user1, 'user1@example.com');
    await loginAsUser(user2, 'user2@example.com');

    // Both users open the same channel
    await user1.goto('/channels/general');
    await user2.goto('/channels/general');

    // User 1 sends a message
    await user1.fill('[data-testid="message-input"]', 'Hello from User 1!');
    await user1.click('[data-testid="send-message"]');

    // User 2 should receive it in real-time
    await expect(user2.locator('[data-testid="message-content"]').last()).toContainText('Hello from User 1!');

    // Verify typing indicator
    await user2.fill('[data-testid="message-input"]', 'Typing...');
    await expect(user1.locator('[data-testid="typing-indicator"]')).toBeVisible();
  });

  test('should show read receipts', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const sender = await context1.newPage();
    const receiver = await context2.newPage();

    await loginAsUser(sender, 'sender@example.com');
    await loginAsUser(receiver, 'receiver@example.com');

    // Send direct message
    await sender.goto('/messages/receiver-id');
    await sender.fill('[data-testid="message-input"]', 'Test message');
    await sender.click('[data-testid="send-message"]');

    // Message should show "sent" initially
    await expect(sender.locator('[data-testid="message-status"]').last()).toContainText('sent');

    // Receiver opens the conversation
    await receiver.goto('/messages/sender-id');

    // Sender should see "read" status
    await expect(sender.locator('[data-testid="message-status"]').last()).toContainText('read');
  });

  test('should handle message editing', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/channels/general');

    // Send a message
    await page.fill('[data-testid="message-input"]', 'Original message');
    await page.click('[data-testid="send-message"]');

    // Edit the message
    await page.click('[data-testid="message-menu-last"]');
    await page.click('[data-testid="edit-message"]');
    await page.fill('[data-testid="edit-input"]', 'Edited message');
    await page.click('[data-testid="save-edit"]');

    await expect(page.locator('[data-testid="message-content"]').last()).toContainText('Edited message');
    await expect(page.locator('[data-testid="edited-indicator"]').last()).toBeVisible();
  });
});
```

### MSG-002: Notification System
```typescript
test.describe('Notifications @critical', () => {
  test('should receive in-app notification', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard');

    // Trigger notification via API
    await page.evaluate(async () => {
      await fetch('/api/test/trigger-notification', { method: 'POST' });
    });

    await expect(page.locator('[data-testid="notification-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('1');
  });

  test('should show notification center', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard');

    await page.click('[data-testid="notification-bell"]');
    await expect(page.locator('[data-testid="notification-center"]')).toBeVisible();
  });

  test('should mark notification as read', async ({ page }) => {
    await loginAsUserWithNotifications(page);
    await page.goto('/dashboard');

    await page.click('[data-testid="notification-bell"]');
    await page.click('[data-testid="notification-item-0"]');

    await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();
  });

  test('should mark all notifications as read', async ({ page }) => {
    await loginAsUserWithNotifications(page, 5);
    await page.goto('/dashboard');

    await page.click('[data-testid="notification-bell"]');
    await page.click('[data-testid="mark-all-read"]');

    await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();
  });
});
```

### MSG-003: Email Communications
```typescript
test.describe('Email Communications @critical', () => {
  test('should send email notification for mentions', async ({ page, request }) => {
    await loginAsUser(page);
    await page.goto('/channels/general');

    // Mention another user
    await page.fill('[data-testid="message-input"]', '@john Check this out');
    await page.click('[data-testid="send-message"]');

    // Verify email was queued (via API)
    const response = await request.get('/api/test/email-queue');
    const emails = await response.json();

    expect(emails).toContainEqual(
      expect.objectContaining({
        to: 'john@example.com',
        subject: expect.stringContaining('mentioned you'),
      })
    );
  });

  test('should respect email preferences', async ({ page, request }) => {
    // User has email notifications disabled
    await loginAsUserWithEmailsDisabled(page);
    await page.goto('/channels/general');

    await page.fill('[data-testid="message-input"]', 'Test message');
    await page.click('[data-testid="send-message"]');

    // Verify no email was sent
    const response = await request.get('/api/test/email-queue');
    const emails = await response.json();

    expect(emails).not.toContainEqual(
      expect.objectContaining({
        to: 'user@example.com',
      })
    );
  });
});
```

---

## Edge Case Tests (@edge)

### Connection Handling
```typescript
test.describe('Connection Handling @edge', () => {
  test('should handle offline mode gracefully', async ({ page, context }) => {
    await loginAsUser(page);
    await page.goto('/channels/general');

    // Go offline
    await context.setOffline(true);

    // Try to send message
    await page.fill('[data-testid="message-input"]', 'Offline message');
    await page.click('[data-testid="send-message"]');

    // Should show pending state
    await expect(page.locator('[data-testid="message-pending"]').last()).toBeVisible();
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Message should be sent
    await expect(page.locator('[data-testid="message-sent"]').last()).toBeVisible({ timeout: 10000 });
  });

  test('should reconnect WebSocket after disconnect', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/channels/general');

    // Simulate WebSocket disconnect
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await expect(page.locator('[data-testid="reconnecting-indicator"]')).toBeVisible();

    // Simulate reconnect
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    await expect(page.locator('[data-testid="connected-indicator"]')).toBeVisible({ timeout: 10000 });
  });

  test('should maintain message order during reconnection', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const user1 = await context1.newPage();
    const user2 = await context2.newPage();

    await loginAsUser(user1, 'user1@example.com');
    await loginAsUser(user2, 'user2@example.com');

    await user1.goto('/channels/general');
    await user2.goto('/channels/general');

    // User2 goes offline
    await context2.setOffline(true);

    // User1 sends multiple messages
    for (let i = 1; i <= 5; i++) {
      await user1.fill('[data-testid="message-input"]', `Message ${i}`);
      await user1.click('[data-testid="send-message"]');
    }

    // User2 comes back online
    await context2.setOffline(false);
    await user2.reload();

    // Verify message order
    const messages = await user2.locator('[data-testid="message-content"]').allTextContents();
    expect(messages.slice(-5)).toEqual(['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5']);
  });
});
```

### Message Edge Cases
```typescript
test.describe('Message Edge Cases @edge', () => {
  test('should handle very long messages', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/channels/general');

    const longMessage = 'A'.repeat(10000);
    await page.fill('[data-testid="message-input"]', longMessage);
    await page.click('[data-testid="send-message"]');

    await expect(page.locator('[data-testid="message-content"]').last()).toContainText(longMessage.slice(0, 100));
    await expect(page.locator('[data-testid="show-more"]').last()).toBeVisible();
  });

  test('should handle special characters and emojis', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/channels/general');

    const specialMessage = '🎉 Test <script>alert("xss")</script> & "quotes" \'single\'';
    await page.fill('[data-testid="message-input"]', specialMessage);
    await page.click('[data-testid="send-message"]');

    // Should be sanitized but preserve emojis
    const messageContent = await page.locator('[data-testid="message-content"]').last().textContent();
    expect(messageContent).toContain('🎉');
    expect(messageContent).not.toContain('<script>');
  });

  test('should handle rapid message sending', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/channels/general');

    // Send 10 messages rapidly
    for (let i = 1; i <= 10; i++) {
      await page.fill('[data-testid="message-input"]', `Rapid message ${i}`);
      await page.click('[data-testid="send-message"]');
    }

    // All messages should be sent (rate limiting should queue, not block)
    const messages = await page.locator('[data-testid="message-content"]').allTextContents();
    expect(messages.filter(m => m.includes('Rapid message'))).toHaveLength(10);
  });

  test('should handle concurrent message edits', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const user1 = await context1.newPage();
    const user2 = await context2.newPage();

    await loginAsUser(user1, 'user1@example.com');
    await loginAsAdmin(user2);

    await user1.goto('/channels/general');
    await user2.goto('/channels/general');

    // User1 sends message
    await user1.fill('[data-testid="message-input"]', 'Original message');
    await user1.click('[data-testid="send-message"]');

    // Both try to edit at the same time
    await user1.click('[data-testid="message-menu-last"]');
    await user1.click('[data-testid="edit-message"]');
    await user1.fill('[data-testid="edit-input"]', 'User1 edit');

    await user2.click('[data-testid="message-menu-last"]');
    await user2.click('[data-testid="edit-message"]');
    await user2.fill('[data-testid="edit-input"]', 'Admin edit');

    // Both save
    await user1.click('[data-testid="save-edit"]');
    await user2.click('[data-testid="save-edit"]');

    // One should succeed, one should show conflict
    // (implementation-dependent, but should handle gracefully)
    await expect(
      user1.locator('[data-testid="edit-conflict"]').or(user2.locator('[data-testid="edit-conflict"]'))
    ).toBeVisible();
  });
});
```

### File Sharing
```typescript
test.describe('File Sharing @edge', () => {
  test('should upload and share file', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/channels/general');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles('tests/fixtures/test-document.pdf');

    await expect(page.locator('[data-testid="file-preview"]')).toBeVisible();
    await page.click('[data-testid="send-message"]');

    await expect(page.locator('[data-testid="file-attachment"]').last()).toBeVisible();
  });

  test('should handle large file upload', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/channels/general');

    // Create a large test file (50MB)
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles('tests/fixtures/large-file.zip');

    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-attachment"]').last()).toBeVisible({ timeout: 120000 });
  });

  test('should reject files exceeding size limit', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/channels/general');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles('tests/fixtures/oversized-file.zip'); // > 100MB

    await expect(page.locator('[data-testid="file-size-error"]')).toContainText('100MB');
  });

  test('should reject unsupported file types', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/channels/general');

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles('tests/fixtures/malicious.exe');

    await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
  });
});
```

### Notification Preferences
```typescript
test.describe('Notification Preferences @edge', () => {
  test('should respect Do Not Disturb mode', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/settings/notifications');

    // Enable DND
    await page.click('[data-testid="dnd-toggle"]');

    await page.goto('/dashboard');

    // Trigger notification
    await page.evaluate(async () => {
      await fetch('/api/test/trigger-notification', { method: 'POST' });
    });

    // Should not show notification badge (or show muted)
    await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();
  });

  test('should schedule Do Not Disturb', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/settings/notifications');

    await page.click('[data-testid="schedule-dnd"]');
    await page.fill('[data-testid="dnd-start"]', '22:00');
    await page.fill('[data-testid="dnd-end"]', '08:00');
    await page.click('[data-testid="save-dnd-schedule"]');

    await expect(page.locator('[data-testid="dnd-scheduled"]')).toContainText('22:00 - 08:00');
  });

  test('should filter notifications by channel', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/channels/general/settings');

    // Mute channel
    await page.click('[data-testid="mute-channel"]');
    await page.selectOption('[data-testid="mute-duration"]', 'forever');
    await page.click('[data-testid="confirm-mute"]');

    await page.goto('/channels/general');

    // New messages should not trigger notifications
    // Verify via API that notification wasn't created
    await expect(page.locator('[data-testid="channel-muted"]')).toBeVisible();
  });
});
```

---

## Unit Tests

```typescript
// tests/unit/messaging.test.ts

describe('Message Sanitization', () => {
  test('should escape HTML tags', () => {
    const input = '<script>alert("xss")</script>';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });

  test('should preserve safe HTML for formatting', () => {
    const input = '**bold** and _italic_';
    const formatted = formatMessage(input);
    expect(formatted).toContain('<strong>bold</strong>');
    expect(formatted).toContain('<em>italic</em>');
  });

  test('should convert URLs to links', () => {
    const input = 'Check out https://example.com';
    const formatted = formatMessage(input);
    expect(formatted).toContain('<a href="https://example.com"');
  });

  test('should handle mentions', () => {
    const input = 'Hey @john, check this';
    const formatted = formatMessage(input, { users: [{ id: '123', username: 'john' }] });
    expect(formatted).toContain('data-mention="123"');
  });
});

describe('WebSocket Connection', () => {
  test('should establish connection', async () => {
    const ws = await createWebSocketConnection('wss://test.com');
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  test('should reconnect on disconnect', async () => {
    const ws = await createWebSocketConnection('wss://test.com', { autoReconnect: true });
    ws.close();

    await waitFor(() => ws.readyState === WebSocket.OPEN);
    expect(ws.reconnectCount).toBe(1);
    ws.close();
  });

  test('should apply exponential backoff', async () => {
    const delays: number[] = [];
    const ws = await createWebSocketConnection('wss://test.com', {
      autoReconnect: true,
      onReconnectAttempt: (delay) => delays.push(delay),
    });

    // Simulate multiple disconnects
    for (let i = 0; i < 4; i++) {
      ws.close();
      await waitFor(() => ws.readyState === WebSocket.OPEN);
    }

    expect(delays).toEqual([1000, 2000, 4000, 8000]); // Exponential backoff
    ws.close();
  });
});

describe('Notification Priority', () => {
  test('should prioritize direct messages', () => {
    const notifications = [
      { type: 'channel_message', priority: 'normal' },
      { type: 'direct_message', priority: 'high' },
      { type: 'mention', priority: 'high' },
    ];

    const sorted = sortByPriority(notifications);
    expect(sorted[0].type).toBe('direct_message');
  });

  test('should respect user preferences', () => {
    const notification = { type: 'channel_message', channelId: 'general' };
    const preferences = { mutedChannels: ['general'] };

    expect(shouldNotify(notification, preferences)).toBe(false);
  });

  test('should batch notifications for digest', () => {
    const notifications = Array.from({ length: 10 }, (_, i) => ({
      type: 'channel_message',
      timestamp: Date.now() - i * 1000,
    }));

    const batched = batchForDigest(notifications, { maxPerBatch: 5 });
    expect(batched.length).toBe(2);
    expect(batched[0].length).toBe(5);
  });
});

describe('File Validation', () => {
  test('should validate file size', () => {
    expect(validateFileSize(50 * 1024 * 1024, 100 * 1024 * 1024)).toBe(true);
    expect(validateFileSize(150 * 1024 * 1024, 100 * 1024 * 1024)).toBe(false);
  });

  test('should validate file type', () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    expect(validateFileType('image/jpeg', allowedTypes)).toBe(true);
    expect(validateFileType('application/exe', allowedTypes)).toBe(false);
  });

  test('should detect potential malicious files', () => {
    expect(isPotentiallyMalicious('script.exe')).toBe(true);
    expect(isPotentiallyMalicious('document.pdf')).toBe(false);
    expect(isPotentiallyMalicious('image.jpg.exe')).toBe(true); // Double extension
  });
});
```
