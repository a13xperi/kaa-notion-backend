/**
 * Login Protection Middleware
 * Prevents brute force attacks with account lockout.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

interface LoginProtectionConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
  skipSuccessfulRequests: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: LoginProtectionConfig = {
  maxAttempts: 5,           // Lock after 5 failed attempts
  windowMs: 15 * 60 * 1000, // 15 minute window
  lockoutMs: 30 * 60 * 1000, // 30 minute lockout
  skipSuccessfulRequests: true,
};

// ============================================================================
// IN-MEMORY STORE (Replace with Redis in production)
// ============================================================================

const loginAttempts = new Map<string, LoginAttempt>();

// Cleanup old entries every 10 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, attempt] of loginAttempts.entries()) {
    // Remove if window expired and not locked
    if (now > attempt.firstAttempt + DEFAULT_CONFIG.windowMs && !attempt.lockedUntil) {
      loginAttempts.delete(key);
    }
    // Remove if lockout expired
    if (attempt.lockedUntil && now > attempt.lockedUntil) {
      loginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000);

// Allow cleanup interval to not prevent process exit
cleanupInterval.unref();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get identifier for rate limiting (email or IP)
 */
function getIdentifier(req: Request): string {
  const email = req.body?.email?.toLowerCase();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Use email if provided, otherwise use IP
  return email ? `email:${email}` : `ip:${ip}`;
}

/**
 * Check if identifier is currently locked out
 */
export function isLockedOut(identifier: string): boolean {
  const attempt = loginAttempts.get(identifier);
  if (!attempt?.lockedUntil) return false;
  
  if (Date.now() > attempt.lockedUntil) {
    // Lockout expired, clear it
    loginAttempts.delete(identifier);
    return false;
  }
  
  return true;
}

/**
 * Get remaining lockout time in seconds
 */
export function getLockoutRemaining(identifier: string): number {
  const attempt = loginAttempts.get(identifier);
  if (!attempt?.lockedUntil) return 0;
  
  const remaining = attempt.lockedUntil - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(identifier: string): { locked: boolean; attemptsRemaining: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);
  
  if (!attempt || now > attempt.firstAttempt + DEFAULT_CONFIG.windowMs) {
    // Start new window
    loginAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
    });
    return { locked: false, attemptsRemaining: DEFAULT_CONFIG.maxAttempts - 1 };
  }
  
  attempt.count++;
  
  if (attempt.count >= DEFAULT_CONFIG.maxAttempts) {
    // Lock the account
    attempt.lockedUntil = now + DEFAULT_CONFIG.lockoutMs;
    logger.warn('Account locked due to too many failed login attempts', {
      identifier: identifier.startsWith('email:') ? identifier : 'IP hidden',
      attempts: attempt.count,
      lockoutMinutes: DEFAULT_CONFIG.lockoutMs / 60000,
    });
    return { locked: true, attemptsRemaining: 0 };
  }
  
  return { locked: false, attemptsRemaining: DEFAULT_CONFIG.maxAttempts - attempt.count };
}

/**
 * Clear failed attempts after successful login
 */
export function clearFailedAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Login protection middleware
 * Checks for lockout before allowing login attempt
 */
export function loginProtection(config: Partial<LoginProtectionConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = getIdentifier(req);

    // Check if locked out
    if (isLockedOut(identifier)) {
      const remaining = getLockoutRemaining(identifier);
      
      logger.warn('Login attempt while locked out', {
        identifier: identifier.startsWith('email:') ? identifier : 'IP hidden',
        remainingSeconds: remaining,
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Too many failed login attempts. Please try again in ${Math.ceil(remaining / 60)} minutes.`,
          retryAfter: remaining,
        },
      });
      return;
    }

    // Store identifier for later use
    (req as Request & { loginIdentifier: string }).loginIdentifier = identifier;

    next();
  };
}

/**
 * Call this after successful login to clear attempts
 */
export function onLoginSuccess(req: Request): void {
  const identifier = (req as Request & { loginIdentifier?: string }).loginIdentifier;
  if (identifier) {
    clearFailedAttempts(identifier);
  }
}

/**
 * Call this after failed login to record attempt
 */
export function onLoginFailure(req: Request): { locked: boolean; attemptsRemaining: number } {
  const identifier = (req as Request & { loginIdentifier?: string }).loginIdentifier || getIdentifier(req);
  return recordFailedAttempt(identifier);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default loginProtection;
