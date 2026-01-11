/**
 * Input Sanitization Middleware
 *
 * Sanitizes user input to prevent XSS and injection attacks.
 */

import { Request, Response, NextFunction } from 'express';

// Characters that could be used for XSS attacks
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<[^>]+on\w+\s*=/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
];

// SQL injection patterns (for logging, not blocking)
const SQL_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
  /(--|;|\/\*|\*\/)/g,
];

/**
 * Sanitize a string value
 */
function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;

  let sanitized = value;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}

/**
 * Fields that should be excluded from HTML encoding
 * These fields contain sensitive data that should not be modified
 */
const EXCLUDED_FIELDS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'passwordConfirm',
  'oldPassword',
]);

/**
 * Sanitize value recursively
 * @param value - The value to sanitize
 * @param fieldName - Optional field name to check for exclusions
 */
function sanitizeValue(value: unknown, fieldName?: string): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Skip HTML encoding for password fields to preserve special characters
    // These fields are validated separately and never rendered as HTML
    if (fieldName && EXCLUDED_FIELDS.has(fieldName)) {
      // Still remove null bytes for security
      return value.replace(/\0/g, '');
    }
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Sanitize keys too
      const sanitizedKey = sanitizeString(key);
      // Pass the field name to check for exclusions
      sanitized[sanitizedKey] = sanitizeValue(val, key);
    }
    return sanitized;
  }

  return value;
}

/**
 * Check for XSS patterns in a string
 */
function hasXSSPatterns(value: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Check for SQL injection patterns (for logging)
 */
function hasSQLPatterns(value: string): boolean {
  return SQL_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Deep check object for malicious patterns
 */
function checkForMaliciousInput(
  obj: unknown,
  path: string = '',
  skipFields: Set<string> = EXCLUDED_FIELDS
): { xss: string[]; sql: string[] } {
  const issues = { xss: [] as string[], sql: [] as string[] };

  // Extract field name from path (e.g., "body.password" -> "password")
  const fieldName = path.split('.').pop() || '';

  // Skip password fields - they may contain special characters that look like XSS
  if (skipFields.has(fieldName)) {
    return issues;
  }

  if (typeof obj === 'string') {
    if (hasXSSPatterns(obj)) {
      issues.xss.push(path || 'value');
    }
    if (hasSQLPatterns(obj)) {
      issues.sql.push(path || 'value');
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const childIssues = checkForMaliciousInput(item, `${path}[${index}]`, skipFields);
      issues.xss.push(...childIssues.xss);
      issues.sql.push(...childIssues.sql);
    });
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const childPath = path ? `${path}.${key}` : key;
      const childIssues = checkForMaliciousInput(value, childPath, skipFields);
      issues.xss.push(...childIssues.xss);
      issues.sql.push(...childIssues.sql);
    }
  }

  return issues;
}

/**
 * Input sanitization middleware
 *
 * Sanitizes request body, query, and params to prevent XSS attacks.
 * Logs potential SQL injection attempts but doesn't block them
 * (let the ORM handle parameterized queries).
 */
export function sanitizeInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Check for malicious patterns before sanitization
    const bodyIssues = checkForMaliciousInput(req.body, 'body');
    const queryIssues = checkForMaliciousInput(req.query, 'query');
    const paramsIssues = checkForMaliciousInput(req.params, 'params');

    const allXSS = [...bodyIssues.xss, ...queryIssues.xss, ...paramsIssues.xss];
    const allSQL = [...bodyIssues.sql, ...queryIssues.sql, ...paramsIssues.sql];

    // Log potential attacks
    if (allXSS.length > 0) {
      console.warn(`[SECURITY] Potential XSS detected in ${req.method} ${req.path}:`, {
        fields: allXSS,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    if (allSQL.length > 0) {
      console.warn(`[SECURITY] Potential SQL injection patterns in ${req.method} ${req.path}:`, {
        fields: allSQL,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    // Sanitize all inputs
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeValue(req.query) as typeof req.query;
    }

    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeValue(req.params) as typeof req.params;
    }

    next();
  } catch (error) {
    console.error('[SECURITY] Sanitization error:', error);
    next(); // Continue even if sanitization fails
  }
}

/**
 * Strict sanitization that blocks requests with XSS patterns
 */
export function strictSanitize(
  req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  const bodyIssues = checkForMaliciousInput(req.body, 'body');
  const queryIssues = checkForMaliciousInput(req.query, 'query');

  const allXSS = [...bodyIssues.xss, ...queryIssues.xss];

  if (allXSS.length > 0) {
    console.error(`[SECURITY] Blocked request with XSS in ${req.method} ${req.path}:`, {
      fields: allXSS,
      ip: req.ip,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Request contains invalid characters',
      },
    });
  }

  // Still sanitize the input
  sanitizeInput(req, res, next);
}

/**
 * Trim whitespace from string values
 */
export function trimStrings(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  function trimValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (Array.isArray(value)) {
      return value.map(trimValue);
    }
    if (value && typeof value === 'object') {
      const trimmed: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        trimmed[key] = trimValue(val);
      }
      return trimmed;
    }
    return value;
  }

  if (req.body) {
    req.body = trimValue(req.body);
  }

  next();
}

export default sanitizeInput;
