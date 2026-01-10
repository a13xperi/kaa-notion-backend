/**
 * File Uploader Component
 * Drag-and-drop file upload with progress indicator.
 */

import React, { useState, useRef, useCallback } from 'react';
import './FileUploader.css';

// ============================================================================
// TYPES
// ============================================================================

export interface FileUpload {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

export interface FileUploaderProps {
  /** Accept file types (e.g., "image/*,.pdf") */
  accept?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Upload handler function */
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<string>;
  /** Called when upload is complete */
  onComplete?: (uploads: FileUpload[]) => void;
  /** Called when upload fails */
  onError?: (error: string, file: File) => void;
  /** Custom label */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Disable the uploader */
  disabled?: boolean;
  /** Show file previews */
  showPreviews?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_MAX_FILES = 10;

// ============================================================================
// COMPONENT
// ============================================================================

export function FileUploader({
  accept,
  multiple = false,
  maxSize = DEFAULT_MAX_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  onUpload,
  onComplete,
  onError,
  label = 'Upload Files',
  helperText,
  disabled = false,
  showPreviews = true,
}: FileUploaderProps): React.JSX.Element {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  // Generate unique ID for uploads
  const generateId = (): string => {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)}`;
    }

    if (accept) {
      const acceptedTypes = accept.split(',').map((t) => t.trim());
      const fileType = file.type;
      const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;

      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith('.')) {
          return fileExt === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.replace('/*', '/'));
        }
        return fileType === type;
      });

      if (!isAccepted) {
        return 'File type not accepted';
      }
    }

    return null;
  }, [accept, maxSize]);

  // Process selected files
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const currentCount = uploads.filter((u) => u.status !== 'error').length;
    const availableSlots = maxFiles - currentCount;

    if (availableSlots <= 0) {
      onError?.(`Maximum ${maxFiles} files allowed`, fileArray[0]);
      return;
    }

    const filesToProcess = fileArray.slice(0, availableSlots);

    // Create upload entries
    const newUploads: FileUpload[] = filesToProcess.map((file) => ({
      id: generateId(),
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Validate and upload each file
    for (const upload of newUploads) {
      const validationError = validateFile(upload.file);

      if (validationError) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? { ...u, status: 'error' as const, error: validationError }
              : u
          )
        );
        onError?.(validationError, upload.file);
        continue;
      }

      // Start upload
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id ? { ...u, status: 'uploading' as const } : u
        )
      );

      try {
        const url = await onUpload(upload.file, (progress) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id ? { ...u, progress } : u
            )
          );
        });

        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? { ...u, status: 'success' as const, progress: 100, url }
              : u
          )
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? { ...u, status: 'error' as const, error: errorMessage }
              : u
          )
        );
        onError?.(errorMessage, upload.file);
      }
    }

    // Call onComplete with updated uploads
    setUploads((currentUploads) => {
      const completed = currentUploads.filter((u) => u.status === 'success');
      if (completed.length > 0) {
        onComplete?.(completed);
      }
      return currentUploads;
    });
  }, [uploads, maxFiles, validateFile, onUpload, onComplete, onError]);

  // Handle file input change
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input
    event.target.value = '';
  }, [processFiles]);

  // Handle drag events
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCountRef.current++;
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    dragCountRef.current = 0;

    if (disabled) return;

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [disabled, processFiles]);

  // Remove upload
  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  // Retry failed upload
  const retryUpload = useCallback(async (upload: FileUpload) => {
    setUploads((prev) =>
      prev.map((u) =>
        u.id === upload.id
          ? { ...u, status: 'uploading' as const, progress: 0, error: undefined }
          : u
      )
    );

    try {
      const url = await onUpload(upload.file, (progress) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id ? { ...u, progress } : u
          )
        );
      });

      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? { ...u, status: 'success' as const, progress: 100, url }
            : u
        )
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? { ...u, status: 'error' as const, error: errorMessage }
            : u
        )
      );
    }
  }, [onUpload]);

  // Open file dialog
  const openFileDialog = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className="file-uploader">
      {/* Drop Zone */}
      <div
        className={`file-uploader-dropzone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && openFileDialog()}
        aria-label={label}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="file-uploader-input"
          disabled={disabled}
        />

        <div className="file-uploader-content">
          <UploadIcon className="file-uploader-icon" />
          <p className="file-uploader-label">{label}</p>
          <p className="file-uploader-hint">
            {isDragging
              ? 'Drop files here'
              : 'Drag & drop files here or click to browse'}
          </p>
          {helperText && (
            <p className="file-uploader-helper">{helperText}</p>
          )}
        </div>
      </div>

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="file-uploader-list">
          {uploads.map((upload) => (
            <FileUploadItem
              key={upload.id}
              upload={upload}
              onRemove={() => removeUpload(upload.id)}
              onRetry={() => retryUpload(upload)}
              showPreview={showPreviews}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface FileUploadItemProps {
  upload: FileUpload;
  onRemove: () => void;
  onRetry: () => void;
  showPreview: boolean;
}

function FileUploadItem({
  upload,
  onRemove,
  onRetry,
  showPreview,
}: FileUploadItemProps): React.JSX.Element {
  const isImage = upload.file.type.startsWith('image/');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Generate preview for images
  React.useEffect(() => {
    if (showPreview && isImage) {
      const url = URL.createObjectURL(upload.file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [upload.file, isImage, showPreview]);

  return (
    <div className={`file-upload-item status-${upload.status}`}>
      {/* Preview/Icon */}
      <div className="file-upload-preview">
        {previewUrl ? (
          <img src={previewUrl} alt={upload.file.name} />
        ) : (
          <FileIcon type={upload.file.type} />
        )}
      </div>

      {/* Info */}
      <div className="file-upload-info">
        <p className="file-upload-name" title={upload.file.name}>
          {upload.file.name}
        </p>
        <p className="file-upload-size">{formatFileSize(upload.file.size)}</p>

        {/* Progress Bar */}
        {upload.status === 'uploading' && (
          <div className="file-upload-progress">
            <div
              className="file-upload-progress-bar"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
        )}

        {/* Error Message */}
        {upload.status === 'error' && upload.error && (
          <p className="file-upload-error">{upload.error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="file-upload-actions">
        {upload.status === 'success' && (
          <span className="file-upload-success" aria-label="Upload complete">✓</span>
        )}
        {upload.status === 'error' && (
          <button
            className="file-upload-retry"
            onClick={onRetry}
            aria-label="Retry upload"
          >
            ↻
          </button>
        )}
        {upload.status !== 'uploading' && (
          <button
            className="file-upload-remove"
            onClick={onRemove}
            aria-label="Remove file"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ICONS
// ============================================================================

function UploadIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FileIcon({ type }: { type: string }): React.JSX.Element {
  const getIcon = () => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    if (type.includes('video')) return '🎬';
    if (type.includes('audio')) return '🎵';
    return '📎';
  };

  return <span className="file-icon">{getIcon()}</span>;
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default FileUploader;
