import crypto from 'crypto';

const SIGNATURE_VERSION = 'v1';

interface VerifyNotionSignatureParams {
  signingSecret: string;
  signatureHeader?: string;
  timestamp?: string;
  rawBody: Buffer;
}

export function verifyNotionWebhookSignature({
  signingSecret,
  signatureHeader,
  timestamp,
  rawBody,
}: VerifyNotionSignatureParams): boolean {
  if (!signatureHeader || !timestamp) {
    return false;
  }

  const [version, signature] = signatureHeader.split('=');
  if (version !== SIGNATURE_VERSION || !signature) {
    return false;
  }

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expectedSignature = crypto
    .createHmac('sha256', signingSecret)
    .update(payload)
    .digest('hex');
  const expectedHeader = `${SIGNATURE_VERSION}=${expectedSignature}`;

  const signatureBuffer = Buffer.from(signatureHeader, 'utf8');
  const expectedBuffer = Buffer.from(expectedHeader, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
