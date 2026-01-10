/**
 * Image Optimization Service
 * Handles image resizing, compression, and format conversion
 */

import sharp from 'sharp';
import path from 'path';

// ============================================
// TYPES
// ============================================

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
}

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  background?: string;
  progressive?: boolean;
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  fit?: 'cover' | 'contain' | 'fill';
}

export interface OptimizedImage {
  buffer: Buffer;
  metadata: ImageMetadata;
  originalSize: number;
  optimizedSize: number;
  savings: number;
  savingsPercent: number;
}

// ============================================
// PRESETS
// ============================================

/**
 * Predefined optimization presets for common use cases
 */
export const OPTIMIZATION_PRESETS = {
  // Thumbnail for lists and previews
  thumbnail: {
    maxWidth: 200,
    maxHeight: 200,
    quality: 80,
    format: 'webp' as const,
    fit: 'cover' as const,
  },

  // Medium size for detail views
  medium: {
    maxWidth: 800,
    maxHeight: 600,
    quality: 85,
    format: 'webp' as const,
    fit: 'inside' as const,
  },

  // Large size for full screen
  large: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'webp' as const,
    fit: 'inside' as const,
  },

  // Avatar/profile pictures
  avatar: {
    maxWidth: 256,
    maxHeight: 256,
    quality: 90,
    format: 'webp' as const,
    fit: 'cover' as const,
  },

  // High quality for downloads
  highQuality: {
    maxWidth: 4096,
    maxHeight: 4096,
    quality: 95,
    format: 'jpeg' as const,
    fit: 'inside' as const,
    progressive: true,
  },
} as const;

// ============================================
// SUPPORTED FORMATS
// ============================================

const SUPPORTED_INPUT_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
  'image/avif',
  'image/heif',
  'image/heic',
];

const SUPPORTED_OUTPUT_FORMATS = ['jpeg', 'png', 'webp', 'avif'] as const;

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Check if a MIME type is a supported image format
 */
export function isSupportedImage(mimeType: string): boolean {
  return SUPPORTED_INPUT_FORMATS.includes(mimeType.toLowerCase());
}

/**
 * Get image metadata without loading full image into memory
 */
export async function getImageMetadata(input: Buffer | string): Promise<ImageMetadata> {
  const image = sharp(input);
  const metadata = await image.metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: metadata.size || 0,
    hasAlpha: metadata.hasAlpha || false,
  };
}

/**
 * Optimize an image with the given options
 */
export async function optimizeImage(
  input: Buffer,
  options: OptimizationOptions = {}
): Promise<OptimizedImage> {
  const originalSize = input.length;

  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 85,
    format = 'webp',
    fit = 'inside',
    background = '#ffffff',
    progressive = true,
  } = options;

  // Start with the input image
  let pipeline = sharp(input);

  // Get original metadata
  const originalMetadata = await pipeline.metadata();

  // Resize if necessary
  const needsResize =
    (originalMetadata.width && originalMetadata.width > maxWidth) ||
    (originalMetadata.height && originalMetadata.height > maxHeight);

  if (needsResize) {
    pipeline = pipeline.resize({
      width: maxWidth,
      height: maxHeight,
      fit,
      background,
      withoutEnlargement: true,
    });
  }

  // Apply format-specific optimizations
  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({
        quality,
        progressive,
        mozjpeg: true,
      });
      break;

    case 'png':
      pipeline = pipeline.png({
        quality,
        compressionLevel: 9,
        palette: true,
      });
      break;

    case 'webp':
      pipeline = pipeline.webp({
        quality,
        effort: 6,
        smartSubsample: true,
      });
      break;

    case 'avif':
      pipeline = pipeline.avif({
        quality,
        effort: 6,
      });
      break;
  }

  // Process the image
  const buffer = await pipeline.toBuffer();
  const newMetadata = await sharp(buffer).metadata();

  const optimizedSize = buffer.length;
  const savings = originalSize - optimizedSize;
  const savingsPercent = Math.round((savings / originalSize) * 100);

  return {
    buffer,
    metadata: {
      width: newMetadata.width || 0,
      height: newMetadata.height || 0,
      format: newMetadata.format || format,
      size: optimizedSize,
      hasAlpha: newMetadata.hasAlpha || false,
    },
    originalSize,
    optimizedSize,
    savings,
    savingsPercent,
  };
}

/**
 * Create a thumbnail from an image
 */
export async function createThumbnail(
  input: Buffer,
  options: ThumbnailOptions = { width: 200, height: 200 }
): Promise<Buffer> {
  const { width, height, fit = 'cover' } = options;

  return sharp(input)
    .resize({
      width,
      height,
      fit,
      position: 'centre',
    })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Generate multiple sizes of an image
 */
export async function generateResponsiveSizes(
  input: Buffer,
  sizes: ImageDimensions[] = [
    { width: 320, height: 240 },
    { width: 640, height: 480 },
    { width: 1024, height: 768 },
    { width: 1920, height: 1080 },
  ]
): Promise<Map<string, Buffer>> {
  const results = new Map<string, Buffer>();

  await Promise.all(
    sizes.map(async ({ width, height }) => {
      const key = `${width}x${height}`;
      const buffer = await sharp(input)
        .resize({
          width,
          height,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
      results.set(key, buffer);
    })
  );

  return results;
}

/**
 * Convert image to different format
 */
export async function convertFormat(
  input: Buffer,
  format: typeof SUPPORTED_OUTPUT_FORMATS[number],
  quality: number = 85
): Promise<Buffer> {
  const pipeline = sharp(input);

  switch (format) {
    case 'jpeg':
      return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    case 'png':
      return pipeline.png({ quality, compressionLevel: 9 }).toBuffer();
    case 'webp':
      return pipeline.webp({ quality }).toBuffer();
    case 'avif':
      return pipeline.avif({ quality }).toBuffer();
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Strip metadata from image (EXIF, etc.) for privacy
 */
export async function stripMetadata(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate() // Auto-rotate based on EXIF, then strip
    .toBuffer();
}

/**
 * Add watermark to image
 */
export async function addWatermark(
  input: Buffer,
  watermark: Buffer,
  position: 'center' | 'bottom-right' | 'bottom-left' = 'bottom-right',
  opacity: number = 0.5
): Promise<Buffer> {
  const image = sharp(input);
  const imageMetadata = await image.metadata();

  // Resize watermark to fit
  const watermarkResized = await sharp(watermark)
    .resize({
      width: Math.round((imageMetadata.width || 800) * 0.2),
      fit: 'inside',
    })
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      },
    ])
    .toBuffer();

  const watermarkMeta = await sharp(watermarkResized).metadata();

  // Calculate position
  let gravity: string;
  switch (position) {
    case 'center':
      gravity = 'centre';
      break;
    case 'bottom-left':
      gravity = 'southwest';
      break;
    case 'bottom-right':
    default:
      gravity = 'southeast';
      break;
  }

  return image
    .composite([
      {
        input: watermarkResized,
        gravity: gravity as any,
      },
    ])
    .toBuffer();
}

/**
 * Optimize image using a preset
 */
export async function optimizeWithPreset(
  input: Buffer,
  preset: keyof typeof OPTIMIZATION_PRESETS
): Promise<OptimizedImage> {
  return optimizeImage(input, OPTIMIZATION_PRESETS[preset]);
}

/**
 * Process uploaded image file
 * Returns optimized versions for storage
 */
export async function processUploadedImage(
  input: Buffer,
  filename: string
): Promise<{
  original: Buffer;
  optimized: Buffer;
  thumbnail: Buffer;
  metadata: ImageMetadata;
}> {
  // Get original metadata
  const metadata = await getImageMetadata(input);

  // Optimize original (strip metadata, auto-rotate)
  const original = await stripMetadata(input);

  // Create optimized version for web
  const optimizedResult = await optimizeImage(input, OPTIMIZATION_PRESETS.large);

  // Create thumbnail
  const thumbnail = await createThumbnail(input);

  console.log(
    `[ImageService] Processed ${filename}: ` +
      `${metadata.width}x${metadata.height} ${metadata.format}, ` +
      `saved ${optimizedResult.savingsPercent}%`
  );

  return {
    original,
    optimized: optimizedResult.buffer,
    thumbnail,
    metadata,
  };
}

/**
 * Get file extension for format
 */
export function getExtensionForFormat(format: string): string {
  const extensions: Record<string, string> = {
    jpeg: '.jpg',
    jpg: '.jpg',
    png: '.png',
    webp: '.webp',
    avif: '.avif',
    gif: '.gif',
  };
  return extensions[format.toLowerCase()] || `.${format}`;
}

/**
 * Get MIME type for format
 */
export function getMimeTypeForFormat(format: string): string {
  const mimeTypes: Record<string, string> = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
  };
  return mimeTypes[format.toLowerCase()] || `image/${format}`;
}
