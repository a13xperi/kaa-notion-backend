/**
 * Compression Middleware
 * Configures response compression for improved performance.
 */

import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CompressionConfig {
  /** Minimum response size to compress (default: 1KB) */
  threshold: number;
  /** Compression level 1-9 (default: 6) */
  level: number;
  /** Enable Brotli compression (requires Node.js 11.7+) */
  brotli: boolean;
  /** Memory level for compression (1-9, default: 8) */
  memLevel: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: CompressionConfig = {
  threshold: 1024, // 1KB minimum
  level: 6,
  brotli: true,
  memLevel: 8,
};

// Content types that should be compressed
const COMPRESSIBLE_TYPES = [
  'text/html',
  'text/css',
  'text/plain',
  'text/xml',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'application/json',
  'application/xml',
  'application/rss+xml',
  'application/atom+xml',
  'application/xhtml+xml',
  'image/svg+xml',
];

// Content types that should NOT be compressed (already compressed)
const NON_COMPRESSIBLE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'video/',
  'audio/',
  'application/zip',
  'application/gzip',
  'application/pdf',
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if content type should be compressed
 */
function shouldCompress(contentType: string | undefined): boolean {
  if (!contentType) return false;
  
  const type = contentType.toLowerCase().split(';')[0].trim();
  
  // Skip already-compressed types
  for (const nonCompressible of NON_COMPRESSIBLE_TYPES) {
    if (type.startsWith(nonCompressible)) {
      return false;
    }
  }
  
  // Compress known compressible types
  return COMPRESSIBLE_TYPES.some((compressible) => type === compressible);
}

/**
 * Filter function for compression middleware
 */
function compressionFilter(req: Request, res: Response): boolean {
  // Don't compress if client doesn't support it
  const acceptEncoding = req.headers['accept-encoding'];
  if (!acceptEncoding) return false;
  
  // Don't compress Server-Sent Events
  if (req.headers.accept === 'text/event-stream') {
    return false;
  }
  
  // Check response content type
  const contentType = res.getHeader('content-type') as string | undefined;
  if (contentType && !shouldCompress(contentType)) {
    return false;
  }
  
  // Use default filter for other cases
  return compression.filter(req, res);
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Create compression middleware with configuration
 */
export function createCompressionMiddleware(
  config: Partial<CompressionConfig> = {}
): ReturnType<typeof compression> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  logger.debug('Compression middleware configured', {
    threshold: finalConfig.threshold,
    level: finalConfig.level,
  });
  
  return compression({
    threshold: finalConfig.threshold,
    level: finalConfig.level,
    memLevel: finalConfig.memLevel,
    filter: compressionFilter,
  });
}

/**
 * Default compression middleware
 */
export const compressionMiddleware = createCompressionMiddleware();

// ============================================================================
// RESPONSE SIZE TRACKING
// ============================================================================

interface ResponseSizeStats {
  totalResponses: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  compressionRatio: number;
}

let stats: ResponseSizeStats = {
  totalResponses: 0,
  totalOriginalBytes: 0,
  totalCompressedBytes: 0,
  compressionRatio: 0,
};

/**
 * Track response size for monitoring
 */
export function trackResponseSize(originalSize: number, compressedSize: number): void {
  stats.totalResponses++;
  stats.totalOriginalBytes += originalSize;
  stats.totalCompressedBytes += compressedSize;
  stats.compressionRatio = 
    stats.totalOriginalBytes > 0
      ? 1 - stats.totalCompressedBytes / stats.totalOriginalBytes
      : 0;
}

/**
 * Get compression statistics
 */
export function getCompressionStats(): ResponseSizeStats {
  return { ...stats };
}

/**
 * Reset compression statistics
 */
export function resetCompressionStats(): void {
  stats = {
    totalResponses: 0,
    totalOriginalBytes: 0,
    totalCompressedBytes: 0,
    compressionRatio: 0,
  };
}

// ============================================================================
// JSON OPTIMIZATION MIDDLEWARE
// ============================================================================

/**
 * Optimize JSON responses by removing nulls and undefined values
 */
export function jsonOptimizer(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  
  res.json = function (body: unknown): Response {
    // Remove null and undefined values to reduce payload size
    const optimized = JSON.parse(
      JSON.stringify(body, (_, value) => (value === null ? undefined : value))
    );
    return originalJson(optimized);
  };
  
  next();
}

// ============================================================================
// ETAGs FOR CACHING
// ============================================================================

import crypto from 'crypto';

/**
 * Generate ETag for response body
 */
export function generateETag(body: string | Buffer): string {
  const hash = crypto.createHash('md5').update(body).digest('hex');
  return `"${hash}"`;
}

/**
 * ETag middleware for conditional GET requests
 */
export function etagMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  
  res.json = function (body: unknown): Response {
    // Generate ETag
    const bodyString = JSON.stringify(body);
    const etag = generateETag(bodyString);
    
    // Check If-None-Match header
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.status(304).end();
      return res;
    }
    
    // Set ETag header
    res.setHeader('ETag', etag);
    
    return originalJson(body);
  };
  
  next();
}

// ============================================================================
// RESPONSE TIME HEADER
// ============================================================================

/**
 * Add X-Response-Time header
 */
export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
  });
  
  next();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createCompressionMiddleware,
  compressionMiddleware,
  jsonOptimizer,
  etagMiddleware,
  responseTimeMiddleware,
  trackResponseSize,
  getCompressionStats,
  resetCompressionStats,
  generateETag,
};
