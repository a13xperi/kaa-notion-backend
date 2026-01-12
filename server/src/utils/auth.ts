import crypto from 'crypto';
import jwt from 'jsonwebtoken';

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
 * Uses jsonwebtoken for signing to align with the service implementation.
 */
export function generateToken(payload: Record<string, unknown>, secret: string, expiresInHours = 24): string {
  return jwt.sign(payload, secret, { expiresIn: `${expiresInHours}h` });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string, secret: string): Record<string, unknown> | null {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'string') {
      return null;
    }
    return decoded as Record<string, unknown>;
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
