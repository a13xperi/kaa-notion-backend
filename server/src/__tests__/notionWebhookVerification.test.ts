/**
 * Notion webhook signature verification tests.
 */

import crypto from 'crypto';
import { verifyNotionWebhookSignature } from '../utils/notionWebhookVerification';

describe('Notion webhook signature verification', () => {
  const signingSecret = 'notion-signing-secret';
  const timestamp = '1700000000';
  const payload = { type: 'page.updated', object: { id: 'page-1', last_edited_time: '2024-01-01T00:00:00.000Z' } };
  const rawBody = Buffer.from(JSON.stringify(payload));

  it('returns true for a valid signature', () => {
    const signature = crypto
      .createHmac('sha256', signingSecret)
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');
    const signatureHeader = `v1=${signature}`;

    const isValid = verifyNotionWebhookSignature({
      signingSecret,
      signatureHeader,
      timestamp,
      rawBody,
    });

    expect(isValid).toBe(true);
  });

  it('returns false for an invalid signature', () => {
    const signatureHeader = 'v1=invalidsignature';

    const isValid = verifyNotionWebhookSignature({
      signingSecret,
      signatureHeader,
      timestamp,
      rawBody,
    });

    expect(isValid).toBe(false);
  });
});
