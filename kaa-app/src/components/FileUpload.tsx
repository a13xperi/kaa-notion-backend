import React, { useState, useRef, useCallback } from 'react';
import './FileUpload.css';

/**
 * FileUpload Component
 *
 * Drag-drop upload with progress, file type validation, and preview.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface FileUploadProps {
  onUpload: (files: File[]) => Promise<UploadResult[]>;
  accept?: string[];
  maxFiles?: number;
  maxSize?: number;
  projectId?: string;
  category?: string;
  disabled?: boolean;
  showPreview?: boolean;
  className?: string;
}

export interface UploadResult {
  success: boolean;
  file: {
    name: string;
    path?: string;
    url?: string;
    size: number;
    type: string;
  };
  error?: string;
}

export interface FileWithPreview extends File {
  preview?: string;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  result?: UploadResult;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const FILE_TYPE_ICONS: Record<string, string> = {
  'application/pdf': '📕',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
  'application/zip': '📦',
  'video/mp4': '🎬',
  'audio/mpeg': '🎵',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  default: '📄',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string): string {
  return FILE_TYPE_ICONS[mimeType] || FILE_TYPE_ICONS.default;
}

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

// ============================================
// COMPONENT
// ============================================

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept,
  maxFiles = DEFAULT_MAX_FILES,
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
  showPreview = true,
  className = '',
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Validate file
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (accept && accept.length > 0) {
        const isAccepted = accept.some((type) => {
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.replace('/*', ''));
          }
          return file.type === type || file.name.endsWith(type);
        });

        if (!isAccepted) {
          return `File type "${file.type}" is not allowed`;
        }
      }

      // Check file size
      if (file.size > maxSize) {
        return `File size (${formatBytes(file.size)}) exceeds maximum (${formatBytes(maxSize)})`;
      }

      return null;
    },
    [accept, maxSize]
  );

  // Process selected files
  const processFiles = useCallback(
    (selectedFiles: FileList | File[]) => {
      const fileArray = Array.from(selectedFiles);

      // Check max files limit
      if (files.length + fileArray.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const newFiles: FileWithPreview[] = fileArray.map((file) => {
        const error = validateFile(file);
        const fileWithPreview = file as FileWithPreview;

        fileWithPreview.id = generateId();
        fileWithPreview.status = error ? 'error' : 'pending';
        fileWithPreview.progress = 0;
        fileWithPreview.error = error || undefined;

        // Generate preview for images
        if (showPreview && isImageType(file.type) && !error) {
          fileWithPreview.preview = URL.createObjectURL(file);
        }

        return fileWithPreview;
      });

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, maxFiles, validateFile, showPreview]
  );

  // Handle file input change
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (selectedFiles) {
        processFiles(selectedFiles);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFiles]
  );

  // Drag event handlers
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      if (disabled) return;

      const droppedFiles = event.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [disabled, processFiles]
  );

  // Remove file from list
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    files.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
  }, [files]);

  // Upload files
  const handleUpload = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');

    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'pending' ? { ...f, status: 'uploading' as const, progress: 0 } : f
      )
    );

    try {
      // Get the actual File objects
      const filesToUpload = pendingFiles.map((f) => f as File);
      const results = await onUpload(filesToUpload);

      // Update files with results
      setFiles((prev) =>
        prev.map((file) => {
          if (file.status !== 'uploading') return file;

          const result = results.find((r) => r.file.name === file.name);

          if (result?.success) {
            return {
              ...file,
              status: 'success' as const,
              progress: 100,
              result,
            };
          } else {
            return {
              ...file,
              status: 'error' as const,
              progress: 0,
              error: result?.error || 'Upload failed',
            };
          }
        })
      );
    } catch (error) {
      // Mark all uploading files as error
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  }, [files, onUpload]);

  // Click to browse
  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Calculate stats
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className={`file-upload ${className}`}>
      {/* Drop Zone */}
      <div
        className={`file-upload__dropzone ${isDragging ? 'file-upload__dropzone--dragging' : ''} ${disabled ? 'file-upload__dropzone--disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="file-upload__input"
          onChange={handleFileChange}
          accept={accept?.join(',')}
          multiple={maxFiles > 1}
          disabled={disabled}
        />

        <div className="file-upload__dropzone-content">
          <div className="file-upload__icon">
            {isDragging ? '📥' : '📁'}
          </div>
          <p className="file-upload__text">
            {isDragging ? (
              'Drop files here...'
            ) : (
              <>
                Drag & drop files here, or <span className="file-upload__browse">browse</span>
              </>
            )}
          </p>
          <p className="file-upload__hint">
            Max {maxFiles} files, up to {formatBytes(maxSize)} each
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="file-upload__list">
          <div className="file-upload__list-header">
            <span className="file-upload__list-title">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              className="file-upload__clear-btn"
              onClick={clearFiles}
              disabled={isUploading}
            >
              Clear all
            </button>
          </div>

          <ul className="file-upload__files">
            {files.map((file) => (
              <li key={file.id} className={`file-upload__file file-upload__file--${file.status}`}>
                {/* Preview or Icon */}
                <div className="file-upload__file-preview">
                  {file.preview ? (
                    <img src={file.preview} alt={file.name} className="file-upload__thumbnail" />
                  ) : (
                    <span className="file-upload__file-icon">{getFileIcon(file.type)}</span>
                  )}
                </div>

                {/* File Info */}
                <div className="file-upload__file-info">
                  <span className="file-upload__file-name" title={file.name}>
                    {file.name}
                  </span>
                  <span className="file-upload__file-size">{formatBytes(file.size)}</span>

                  {/* Progress Bar */}
                  {file.status === 'uploading' && (
                    <div className="file-upload__progress">
                      <div
                        className="file-upload__progress-bar"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {file.error && <span className="file-upload__file-error">{file.error}</span>}
                </div>

                {/* Status Icon */}
                <div className="file-upload__file-status">
                  {file.status === 'pending' && <span className="status-pending">⏳</span>}
                  {file.status === 'uploading' && <span className="status-uploading">⏳</span>}
                  {file.status === 'success' && <span className="status-success">✅</span>}
                  {file.status === 'error' && <span className="status-error">❌</span>}
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  className="file-upload__remove-btn"
                  onClick={() => removeFile(file.id)}
                  disabled={file.status === 'uploading'}
                  title="Remove file"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          {/* Upload Button */}
          {pendingCount > 0 && (
            <div className="file-upload__actions">
              <button
                type="button"
                className="file-upload__upload-btn"
                onClick={handleUpload}
                disabled={isUploading || pendingCount === 0}
              >
                {isUploading ? 'Uploading...' : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {/* Summary */}
          {(successCount > 0 || errorCount > 0) && (
            <div className="file-upload__summary">
              {successCount > 0 && (
                <span className="file-upload__summary-success">
                  ✅ {successCount} uploaded
                </span>
              )}
              {errorCount > 0 && (
                <span className="file-upload__summary-error">
                  ❌ {errorCount} failed
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
