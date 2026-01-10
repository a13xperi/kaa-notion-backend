/**
 * CDN Configuration and URL Generation
 * Utilities for serving static assets through a CDN
 */

// ============================================
// CONFIGURATION
// ============================================

interface CDNConfig {
  enabled: boolean;
  baseUrl: string;
  imageUrl: string;
  staticUrl: string;
  cacheControl: {
    static: string;
    images: string;
    api: string;
  };
}

const cdnConfig: CDNConfig = {
  enabled: process.env.CDN_ENABLED === 'true',
  baseUrl: process.env.CDN_BASE_URL || '',
  imageUrl: process.env.CDN_IMAGE_URL || process.env.CDN_BASE_URL || '',
  staticUrl: process.env.CDN_STATIC_URL || process.env.CDN_BASE_URL || '',
  cacheControl: {
    static: 'public, max-age=31536000, immutable', // 1 year
    images: 'public, max-age=2592000', // 30 days
    api: 'private, max-age=0, must-revalidate',
  },
};

// ============================================
// URL GENERATION
// ============================================

/**
 * Get CDN URL for a static asset
 */
export function getStaticUrl(path: string): string {
  if (!cdnConfig.enabled) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${cdnConfig.staticUrl}${normalizedPath}`;
}

/**
 * Get CDN URL for an image with optional transformations
 */
export function getImageUrl(
  path: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  }
): string {
  if (!cdnConfig.enabled) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  let url = `${cdnConfig.imageUrl}${normalizedPath}`;

  // Add transformation parameters if CDN supports them (e.g., Cloudflare, Cloudinary)
  if (options) {
    const params = new URLSearchParams();
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return url;
}

/**
 * Get responsive image srcset
 */
export function getImageSrcSet(
  path: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  return widths
    .map((width) => `${getImageUrl(path, { width })} ${width}w`)
    .join(', ');
}

/**
 * Generate picture element sources for responsive images
 */
export function getPictureSources(
  path: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): Array<{ srcset: string; type: string }> {
  const formats = ['avif', 'webp'] as const;

  return formats.map((format) => ({
    srcset: widths
      .map((width) => `${getImageUrl(path, { width, format })} ${width}w`)
      .join(', '),
    type: `image/${format}`,
  }));
}

// ============================================
// CACHE HEADERS
// ============================================

/**
 * Get cache control header for asset type
 */
export function getCacheControlHeader(type: 'static' | 'images' | 'api'): string {
  return cdnConfig.cacheControl[type];
}

/**
 * Get cache headers for response
 */
export function getCacheHeaders(
  type: 'static' | 'images' | 'api',
  options?: {
    etag?: string;
    lastModified?: Date;
    vary?: string[];
  }
): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': getCacheControlHeader(type),
  };

  if (options?.etag) {
    headers['ETag'] = options.etag;
  }

  if (options?.lastModified) {
    headers['Last-Modified'] = options.lastModified.toUTCString();
  }

  if (options?.vary?.length) {
    headers['Vary'] = options.vary.join(', ');
  }

  return headers;
}

// ============================================
// ASSET MANIFEST
// ============================================

interface AssetManifest {
  [key: string]: {
    path: string;
    hash: string;
    size: number;
  };
}

let assetManifest: AssetManifest = {};

/**
 * Load asset manifest for cache busting
 */
export function loadAssetManifest(manifest: AssetManifest): void {
  assetManifest = manifest;
}

/**
 * Get cache-busted URL for an asset
 */
export function getAssetUrl(name: string): string {
  const asset = assetManifest[name];
  if (asset) {
    return getStaticUrl(asset.path);
  }
  return getStaticUrl(name);
}

// ============================================
// PRELOAD HINTS
// ============================================

interface PreloadHint {
  href: string;
  as: 'script' | 'style' | 'image' | 'font' | 'fetch';
  type?: string;
  crossorigin?: boolean;
}

/**
 * Generate preload link headers for critical assets
 */
export function getPreloadHeaders(hints: PreloadHint[]): string {
  return hints
    .map((hint) => {
      let link = `<${hint.href}>; rel=preload; as=${hint.as}`;
      if (hint.type) link += `; type=${hint.type}`;
      if (hint.crossorigin) link += '; crossorigin';
      return link;
    })
    .join(', ');
}

/**
 * Get critical CSS preload hints
 */
export function getCriticalPreloads(): PreloadHint[] {
  return [
    { href: getAssetUrl('main.css'), as: 'style' },
    { href: getAssetUrl('main.js'), as: 'script' },
  ];
}

// ============================================
// CDN PURGE
// ============================================

interface PurgeOptions {
  urls?: string[];
  tags?: string[];
  prefixes?: string[];
  all?: boolean;
}

/**
 * Purge CDN cache (implementation depends on CDN provider)
 */
export async function purgeCDNCache(options: PurgeOptions): Promise<void> {
  if (!cdnConfig.enabled) {
    console.log('[CDN] CDN not enabled, skipping purge');
    return;
  }

  const purgeApiUrl = process.env.CDN_PURGE_API_URL;
  const purgeApiToken = process.env.CDN_PURGE_API_TOKEN;

  if (!purgeApiUrl || !purgeApiToken) {
    console.warn('[CDN] Purge API not configured');
    return;
  }

  try {
    // Example implementation for Cloudflare
    const response = await fetch(purgeApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${purgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        purge_everything: options.all,
        files: options.urls,
        tags: options.tags,
        prefixes: options.prefixes,
      }),
    });

    if (!response.ok) {
      throw new Error(`CDN purge failed: ${response.statusText}`);
    }

    console.log('[CDN] Cache purged successfully');
  } catch (error) {
    console.error('[CDN] Failed to purge cache:', error);
    throw error;
  }
}

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add CDN-friendly cache headers
 */
export function cdnCacheMiddleware(type: 'static' | 'images' | 'api') {
  return (req: Request, res: Response, next: NextFunction) => {
    const headers = getCacheHeaders(type, {
      vary: ['Accept-Encoding', 'Accept'],
    });

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    next();
  };
}

/**
 * Middleware to rewrite URLs to CDN
 */
export function cdnRewriteMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!cdnConfig.enabled) {
      return next();
    }

    // Add helper to locals for templates
    res.locals.cdnUrl = (path: string) => getStaticUrl(path);
    res.locals.imageUrl = (path: string, options?: Parameters<typeof getImageUrl>[1]) =>
      getImageUrl(path, options);

    next();
  };
}

// ============================================
// EXPORT CONFIG
// ============================================

export { cdnConfig };
