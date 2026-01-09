import crypto from 'crypto';

/**
 * Hash a password using PBKDF2
 * Using built-in crypto to avoid external dependencies
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate a random salt
    const salt = crypto.randomBytes(16).toString('hex');

    // Hash the password with PBKDF2
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      // Store salt and hash together
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = storedHash.split(':');

    if (!salt || !hash) {
      resolve(false);
      return;
    }

    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey.toString('hex') === hash);
    });
  });
}

/**
 * Generate a JWT token
 * Simple implementation - in production, use a proper JWT library
 */
export function generateToken(payload: Record<string, unknown>, secret: string, expiresInHours = 24): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInHours * 3600,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string, secret: string): Record<string, unknown> | null {
  try {
    const [base64Header, base64Payload, signature] = token.split('.');

    if (!base64Header || !base64Payload || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${base64Header}.${base64Payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString());

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate a random token for password reset, email verification, etc.
 */
export function generateRandomToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
