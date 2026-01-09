/**
 * Storage Service
 * Handles file uploads to Supabase Storage, signed URL generation, and file deletion.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface StorageConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  bucketName: string;
  maxFileSizeMB: number;
  allowedMimeTypes: string[];
}

export interface UploadOptions {
  projectId: string;
  category: string;
  fileName: string;
  contentType: string;
  userId: string;
}

export interface UploadResult {
  success: boolean;
  filePath?: string;
  fileUrl?: string;
  fileSize?: number;
  error?: string;
}

export interface SignedUrlResult {
  success: boolean;
  signedUrl?: string;
  expiresAt?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  contentType: string;
  lastModified: string;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: Partial<StorageConfig> = {
  bucketName: 'deliverables',
  maxFileSizeMB: 50,
  allowedMimeTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/tiff',
    // Design files
    'application/zip',
    'application/x-zip-compressed',
    // CAD/Vector
    'application/dxf',
    'image/vnd.dwg',
    // Video
    'video/mp4',
    'video/quicktime',
    // Audio
    'audio/mpeg',
    'audio/wav',
  ],
};

// ============================================================================
// STORAGE SERVICE CLASS
// ============================================================================

export class StorageService {
  private supabase: SupabaseClient;
  private config: StorageConfig;

  constructor(config: Partial<StorageConfig> & { supabaseUrl: string; supabaseServiceKey: string }) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as StorageConfig;

    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // ============================================================================
  // FILE UPLOAD
  // ============================================================================

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    fileBuffer: Buffer,
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      // Validate file size
      const fileSizeBytes = fileBuffer.length;
      const maxSizeBytes = this.config.maxFileSizeMB * 1024 * 1024;

      if (fileSizeBytes > maxSizeBytes) {
        return {
          success: false,
          error: `File size exceeds maximum allowed (${this.config.maxFileSizeMB}MB)`,
        };
      }

      // Validate content type
      if (!this.isAllowedMimeType(options.contentType)) {
        return {
          success: false,
          error: `File type not allowed: ${options.contentType}`,
        };
      }

      // Generate unique file path
      const filePath = this.generateFilePath(options);

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.config.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: options.contentType,
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.config.bucketName)
        .getPublicUrl(filePath);

      return {
        success: true,
        filePath: data.path,
        fileUrl: urlData.publicUrl,
        fileSize: fileSizeBytes,
      };
    } catch (error) {
      console.error('Storage upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload from a readable stream (for larger files)
   */
  async uploadStream(
    stream: NodeJS.ReadableStream,
    options: UploadOptions & { fileSize: number }
  ): Promise<UploadResult> {
    // For streams, we need to collect chunks first
    const chunks: Buffer[] = [];

    return new Promise((resolve) => {
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        const result = await this.uploadFile(buffer, options);
        resolve(result);
      });

      stream.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });
    });
  }

  // ============================================================================
  // SIGNED URLS
  // ============================================================================

  /**
   * Generate a signed URL for secure file access
   */
  async getSignedUrl(
    filePath: string,
    expiresInSeconds: number = 3600
  ): Promise<SignedUrlResult> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.config.bucketName)
        .createSignedUrl(filePath, expiresInSeconds);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

      return {
        success: true,
        signedUrl: data.signedUrl,
        expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate signed URL',
      };
    }
  }

  /**
   * Generate signed URLs for multiple files
   */
  async getSignedUrls(
    filePaths: string[],
    expiresInSeconds: number = 3600
  ): Promise<Map<string, SignedUrlResult>> {
    const results = new Map<string, SignedUrlResult>();

    await Promise.all(
      filePaths.map(async (filePath) => {
        const result = await this.getSignedUrl(filePath, expiresInSeconds);
        results.set(filePath, result);
      })
    );

    return results;
  }

  // ============================================================================
  // FILE DELETION
  // ============================================================================

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<DeleteResult> {
    try {
      const { error } = await this.supabase.storage
        .from(this.config.bucketName)
        .remove([filePath]);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(filePaths: string[]): Promise<DeleteResult> {
    try {
      const { error } = await this.supabase.storage
        .from(this.config.bucketName)
        .remove(filePaths);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Delete all files for a project
   */
  async deleteProjectFiles(projectId: string): Promise<DeleteResult> {
    try {
      const { data: files, error: listError } = await this.supabase.storage
        .from(this.config.bucketName)
        .list(`projects/${projectId}`);

      if (listError) {
        return {
          success: false,
          error: listError.message,
        };
      }

      if (!files || files.length === 0) {
        return { success: true };
      }

      const filePaths = files.map((f) => `projects/${projectId}/${f.name}`);
      return this.deleteFiles(filePaths);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  // ============================================================================
  // FILE METADATA
  // ============================================================================

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      // Extract folder and file name from path
      const folder = path.dirname(filePath);
      const fileName = path.basename(filePath);

      const { data, error } = await this.supabase.storage
        .from(this.config.bucketName)
        .list(folder, {
          search: fileName,
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      const file = data.find((f) => f.name === fileName);
      if (!file) return null;

      return {
        name: file.name,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || 'application/octet-stream',
        lastModified: file.updated_at || file.created_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * List files in a project folder
   */
  async listProjectFiles(projectId: string): Promise<FileMetadata[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.config.bucketName)
        .list(`projects/${projectId}`);

      if (error || !data) {
        return [];
      }

      return data.map((file) => ({
        name: file.name,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || 'application/octet-stream',
        lastModified: file.updated_at || file.created_at,
      }));
    } catch {
      return [];
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Generate a unique file path
   */
  private generateFilePath(options: UploadOptions): string {
    const timestamp = Date.now();
    const uniqueId = randomUUID().slice(0, 8);
    const sanitizedName = this.sanitizeFileName(options.fileName);
    const extension = path.extname(sanitizedName);
    const baseName = path.basename(sanitizedName, extension);

    return `projects/${options.projectId}/${options.category}/${baseName}_${timestamp}_${uniqueId}${extension}`;
  }

  /**
   * Sanitize file name for safe storage
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/__+/g, '_')
      .toLowerCase();
  }

  /**
   * Check if MIME type is allowed
   */
  private isAllowedMimeType(mimeType: string): boolean {
    return this.config.allowedMimeTypes.includes(mimeType);
  }

  /**
   * Get allowed MIME types
   */
  getAllowedMimeTypes(): string[] {
    return [...this.config.allowedMimeTypes];
  }

  /**
   * Get max file size in bytes
   */
  getMaxFileSizeBytes(): number {
    return this.config.maxFileSizeMB * 1024 * 1024;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file extension from MIME type
   */
  static getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'application/zip': '.zip',
    };
    return mimeToExt[mimeType] || '';
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let storageServiceInstance: StorageService | null = null;

/**
 * Initialize the storage service
 */
export function initStorageService(
  config: Partial<StorageConfig> & { supabaseUrl: string; supabaseServiceKey: string }
): StorageService {
  storageServiceInstance = new StorageService(config);
  return storageServiceInstance;
}

/**
 * Get the storage service instance
 */
export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    throw new Error('StorageService not initialized. Call initStorageService first.');
  }
  return storageServiceInstance;
}

export default StorageService;
