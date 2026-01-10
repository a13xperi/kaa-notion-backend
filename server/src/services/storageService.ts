import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import path from 'path';

/**
 * Supabase Storage Service
 *
 * Handles file uploads, signed URL generation, and file deletion
 * for deliverables and other project assets.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  fileName?: string;
  contentType?: string;
  upsert?: boolean;
  cacheControl?: string;
}

export interface UploadResult {
  success: boolean;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  error?: string;
}

export interface SignedUrlResult {
  success: boolean;
  signedUrl?: string;
  expiresAt?: Date;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified?: Date;
}

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const DEFAULT_BUCKET = process.env.STORAGE_BUCKET || 'deliverables';
const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour in seconds

// Allowed file types by category
const ALLOWED_TYPES: Record<string, string[]> = {
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/tiff',
  ],
  drawing: [
    'application/pdf',
    'image/svg+xml',
    'application/dxf',
    'image/vnd.dxf',
    'application/dwg',
  ],
  archive: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
  ],
  video: [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
  ],
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
  ],
};

// Max file sizes by category (in bytes)
const MAX_FILE_SIZES: Record<string, number> = {
  document: 50 * 1024 * 1024,  // 50 MB
  image: 20 * 1024 * 1024,     // 20 MB
  drawing: 100 * 1024 * 1024,  // 100 MB
  archive: 500 * 1024 * 1024,  // 500 MB
  video: 500 * 1024 * 1024,    // 500 MB
  audio: 100 * 1024 * 1024,    // 100 MB
  default: 50 * 1024 * 1024,   // 50 MB default
};

// ============================================
// SUPABASE CLIENT
// ============================================

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

function isStorageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique file path
 */
function generateFilePath(
  originalName: string,
  folder?: string,
  customFileName?: string
): string {
  const ext = path.extname(originalName);
  const baseName = customFileName || `${randomUUID()}${ext}`;

  if (folder) {
    // Ensure folder doesn't start or end with /
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    return `${cleanFolder}/${baseName}`;
  }

  return baseName;
}

/**
 * Get file category from MIME type
 */
function getFileCategory(mimeType: string): string {
  for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
    if (types.includes(mimeType)) {
      return category;
    }
  }
  return 'other';
}

/**
 * Validate file type
 */
function isAllowedFileType(mimeType: string, category?: string): boolean {
  if (category && ALLOWED_TYPES[category]) {
    return ALLOWED_TYPES[category].includes(mimeType);
  }

  // Check all categories
  return Object.values(ALLOWED_TYPES).some(types => types.includes(mimeType));
}

/**
 * Validate file size
 */
function isAllowedFileSize(size: number, category?: string): boolean {
  const maxSize = category ? (MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default) : MAX_FILE_SIZES.default;
  return size <= maxSize;
}

/**
 * Get max file size for category
 */
function getMaxFileSize(category?: string): number {
  return category ? (MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default) : MAX_FILE_SIZES.default;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================
// STORAGE OPERATIONS
// ============================================

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  if (!isStorageConfigured()) {
    return {
      success: false,
      filePath: '',
      fileUrl: '',
      fileSize: 0,
      fileType: mimeType,
      error: 'Storage is not configured',
    };
  }

  const {
    bucket = DEFAULT_BUCKET,
    folder,
    fileName,
    contentType = mimeType,
    upsert = false,
    cacheControl = '3600',
  } = options;

  // Validate file type
  const category = getFileCategory(mimeType);
  if (!isAllowedFileType(mimeType)) {
    return {
      success: false,
      filePath: '',
      fileUrl: '',
      fileSize: fileBuffer.length,
      fileType: mimeType,
      error: `File type '${mimeType}' is not allowed`,
    };
  }

  // Validate file size
  if (!isAllowedFileSize(fileBuffer.length, category)) {
    const maxSize = getMaxFileSize(category);
    return {
      success: false,
      filePath: '',
      fileUrl: '',
      fileSize: fileBuffer.length,
      fileType: mimeType,
      error: `File size exceeds maximum allowed (${formatBytes(maxSize)})`,
    };
  }

  try {
    const supabase = getSupabaseClient();
    const filePath = generateFilePath(originalName, folder, fileName);

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert,
        cacheControl,
      });

    if (error) {
      console.error('[Storage] Upload error:', error);
      return {
        success: false,
        filePath: '',
        fileUrl: '',
        fileSize: fileBuffer.length,
        fileType: mimeType,
        error: error.message,
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log(`[Storage] Uploaded file: ${filePath} (${formatBytes(fileBuffer.length)})`);

    return {
      success: true,
      filePath: data.path,
      fileUrl: urlData.publicUrl,
      fileSize: fileBuffer.length,
      fileType: mimeType,
    };
  } catch (error) {
    console.error('[Storage] Upload exception:', error);
    return {
      success: false,
      filePath: '',
      fileUrl: '',
      fileSize: fileBuffer.length,
      fileType: mimeType,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Get a signed URL for private file access
 */
export async function getSignedUrl(
  filePath: string,
  bucket: string = DEFAULT_BUCKET,
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<SignedUrlResult> {
  if (!isStorageConfigured()) {
    return {
      success: false,
      error: 'Storage is not configured',
    };
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('[Storage] Signed URL error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      success: true,
      signedUrl: data.signedUrl,
      expiresAt,
    };
  } catch (error) {
    console.error('[Storage] Signed URL exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate signed URL',
    };
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  filePath: string,
  bucket: string = DEFAULT_BUCKET
): Promise<DeleteResult> {
  if (!isStorageConfigured()) {
    return {
      success: false,
      error: 'Storage is not configured',
    };
  }

  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('[Storage] Delete error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(`[Storage] Deleted file: ${filePath}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('[Storage] Delete exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Delete multiple files from storage
 */
export async function deleteFiles(
  filePaths: string[],
  bucket: string = DEFAULT_BUCKET
): Promise<DeleteResult> {
  if (!isStorageConfigured()) {
    return {
      success: false,
      error: 'Storage is not configured',
    };
  }

  if (filePaths.length === 0) {
    return { success: true };
  }

  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.storage
      .from(bucket)
      .remove(filePaths);

    if (error) {
      console.error('[Storage] Bulk delete error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(`[Storage] Deleted ${filePaths.length} files`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('[Storage] Bulk delete exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bulk delete failed',
    };
  }
}

/**
 * Check if a file exists in storage
 */
export async function fileExists(
  filePath: string,
  bucket: string = DEFAULT_BUCKET
): Promise<boolean> {
  if (!isStorageConfigured()) {
    return false;
  }

  try {
    const supabase = getSupabaseClient();

    // Try to get file metadata
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path.dirname(filePath), {
        search: path.basename(filePath),
      });

    if (error) {
      return false;
    }

    return data.some(file => file.name === path.basename(filePath));
  } catch {
    return false;
  }
}

/**
 * List files in a folder
 */
export async function listFiles(
  folder: string,
  bucket: string = DEFAULT_BUCKET,
  options: { limit?: number; offset?: number } = {}
): Promise<FileMetadata[]> {
  if (!isStorageConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: options.limit || 100,
        offset: options.offset || 0,
      });

    if (error) {
      console.error('[Storage] List files error:', error);
      return [];
    }

    return data
      .filter(item => item.id) // Filter out folders
      .map(item => ({
        name: item.name,
        size: item.metadata?.size || 0,
        type: item.metadata?.mimetype || 'application/octet-stream',
        lastModified: item.updated_at ? new Date(item.updated_at) : undefined,
      }));
  } catch (error) {
    console.error('[Storage] List files exception:', error);
    return [];
  }
}

/**
 * Copy a file within storage
 */
export async function copyFile(
  sourcePath: string,
  destinationPath: string,
  bucket: string = DEFAULT_BUCKET
): Promise<UploadResult> {
  if (!isStorageConfigured()) {
    return {
      success: false,
      filePath: '',
      fileUrl: '',
      fileSize: 0,
      fileType: '',
      error: 'Storage is not configured',
    };
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .copy(sourcePath, destinationPath);

    if (error) {
      console.error('[Storage] Copy error:', error);
      return {
        success: false,
        filePath: '',
        fileUrl: '',
        fileSize: 0,
        fileType: '',
        error: error.message,
      };
    }

    // Get public URL for new file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(destinationPath);

    console.log(`[Storage] Copied file: ${sourcePath} -> ${destinationPath}`);

    return {
      success: true,
      filePath: data.path,
      fileUrl: urlData.publicUrl,
      fileSize: 0, // Size not available from copy operation
      fileType: '', // Type not available from copy operation
    };
  } catch (error) {
    console.error('[Storage] Copy exception:', error);
    return {
      success: false,
      filePath: '',
      fileUrl: '',
      fileSize: 0,
      fileType: '',
      error: error instanceof Error ? error.message : 'Copy failed',
    };
  }
}

/**
 * Move a file within storage
 */
export async function moveFile(
  sourcePath: string,
  destinationPath: string,
  bucket: string = DEFAULT_BUCKET
): Promise<UploadResult> {
  if (!isStorageConfigured()) {
    return {
      success: false,
      filePath: '',
      fileUrl: '',
      fileSize: 0,
      fileType: '',
      error: 'Storage is not configured',
    };
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .move(sourcePath, destinationPath);

    if (error) {
      console.error('[Storage] Move error:', error);
      return {
        success: false,
        filePath: '',
        fileUrl: '',
        fileSize: 0,
        fileType: '',
        error: error.message,
      };
    }

    // Get public URL for moved file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(destinationPath);

    console.log(`[Storage] Moved file: ${sourcePath} -> ${destinationPath}`);

    return {
      success: true,
      filePath: data.path,
      fileUrl: urlData.publicUrl,
      fileSize: 0,
      fileType: '',
    };
  } catch (error) {
    console.error('[Storage] Move exception:', error);
    return {
      success: false,
      filePath: '',
      fileUrl: '',
      fileSize: 0,
      fileType: '',
      error: error instanceof Error ? error.message : 'Move failed',
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export {
  isStorageConfigured,
  getFileCategory,
  isAllowedFileType,
  isAllowedFileSize,
  getMaxFileSize,
  formatBytes,
  ALLOWED_TYPES,
  MAX_FILE_SIZES,
};

export default {
  uploadFile,
  getSignedUrl,
  deleteFile,
  deleteFiles,
  fileExists,
  listFiles,
  copyFile,
  moveFile,
  isStorageConfigured,
  getFileCategory,
  isAllowedFileType,
  isAllowedFileSize,
  getMaxFileSize,
  formatBytes,
};
