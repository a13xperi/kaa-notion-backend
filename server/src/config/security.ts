/**
 * Security Configuration
 *
 * Configures Helmet.js for security headers and other security measures.
 */

import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Helmet middleware with custom configuration
 */
export const securityMiddleware = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: [
        "'self'",
        'https://api.stripe.com',
        'https://*.supabase.co',
        process.env.SUPABASE_URL || '',
      ].filter(Boolean),
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },

  // Cross-Origin settings
  crossOriginEmbedderPolicy: false, // Disable for Stripe embeds
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Frameguard - prevent clickjacking
  frameguard: { action: 'deny' },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // HSTS - Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // IE No Open - prevent IE from executing downloads
  ieNoOpen: true,

  // No Sniff - prevent MIME type sniffing
  noSniff: true,

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // XSS Filter
  xssFilter: true,
});

/**
 * Additional security headers middleware
 */
export function additionalSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(self "https://js.stripe.com"), usb=()'
  );

  // Cache Control for sensitive endpoints
  if (req.path.includes('/api/auth') || req.path.includes('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  next();
}

/**
 * Request ID middleware - adds unique ID to each request
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    (req.headers['x-correlation-id'] as string) ||
    generateRequestId();

  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

/**
 * Prevent parameter pollution
 */
export function preventParamPollution(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // For each query parameter, if it's an array, take the last value
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      const value = req.query[key];
      if (Array.isArray(value)) {
        req.query[key] = value[value.length - 1];
      }
    }
  }
  next();
}

export default securityMiddleware;
