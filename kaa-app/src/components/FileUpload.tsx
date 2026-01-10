/**
 * FileUpload Component
 * Drag-drop file upload with progress, validation, and preview.
 */

import React, { JSX, useState, useCallback, useRef } from 'react';
import './FileUpload.css';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadedFile {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  fileSizeFormatted: string;
  fileType: string;
  category: string;
  createdAt: string;
}

export interface FileUploadProps {
  projectId: string;
  category?: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

interface FileWithPreview extends File {
  preview?: string;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  uploadedFile?: UploadedFile;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const FILE_TYPE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'video/mp4': '🎬',
  'video/quicktime': '🎬',
  'audio/mpeg': '🎵',
  'application/zip': '📦',
};

// ============================================================================
// HELPERS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(mimeType: string): string {
  return FILE_TYPE_ICONS[mimeType] || '📎';
}

function generateId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FileUpload({
  projectId,
  category = 'Document',
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  maxSizeMB = 50,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  disabled = false,
  className = '',
}: FileUploadProps): React.JSX.Element {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // FILE VALIDATION
  // ============================================================================

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `File type "${file.type}" is not allowed`,
        };
      }

      // Check file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return {
          valid: false,
          error: `File size exceeds ${maxSizeMB}MB limit`,
        };
      }

      return { valid: true };
    },
    [allowedTypes, maxSizeMB]
  );

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      // Check max files
      if (files.length + fileArray.length > maxFiles) {
        onUploadError?.(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const processedFiles: FileWithPreview[] = fileArray.map((file) => {
        const validation = validateFile(file);
        const fileWithPreview = file as FileWithPreview;

        // Create preview for images
        if (file.type.startsWith('image/')) {
          fileWithPreview.preview = URL.createObjectURL(file);
        }

        fileWithPreview.uploadStatus = validation.valid ? 'pending' : 'error';
        fileWithPreview.errorMessage = validation.error;
        fileWithPreview.uploadProgress = 0;

        return fileWithPreview;
      });

      setFiles((prev) => [...prev, ...processedFiles]);
    },
    [files.length, maxFiles, validateFile, onUploadError]
  );

  // ============================================================================
  // DRAG & DROP HANDLERS
  // ============================================================================

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const { files: droppedFiles } = e.dataTransfer;
      if (droppedFiles && droppedFiles.length > 0) {
        handleFiles(droppedFiles);
      }
    },
    [disabled, handleFiles]
  );

  // ============================================================================
  // FILE INPUT HANDLER
  // ============================================================================

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files: selectedFiles } = e.target;
      if (selectedFiles && selectedFiles.length > 0) {
        handleFiles(selectedFiles);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ============================================================================
  // REMOVE FILE
  // ============================================================================

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];

      // Revoke preview URL
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview);
      }

      return newFiles;
    });
  }, []);

  // ============================================================================
  // UPLOAD FILES
  // ============================================================================

  const uploadFiles = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.uploadStatus === 'pending');

    if (pendingFiles.length === 0) {
      return;
    }

    setIsUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.uploadStatus !== 'pending') continue;

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, uploadStatus: 'uploading' as const } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        formData.append('category', category);

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            // Auth headers would go here
            'x-user-id': 'placeholder-user-id',
            'x-user-type': 'ADMIN',
          },
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? {
                    ...f,
                    uploadStatus: 'success' as const,
                    uploadProgress: 100,
                    uploadedFile: result.data,
                  }
                : f
            )
          );
          uploadedFiles.push(result.data);
        } else {
          throw new Error(result.error?.message || 'Upload failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, uploadStatus: 'error' as const, errorMessage }
              : f
          )
        );
        onUploadError?.(errorMessage);
      }
    }

    setIsUploading(false);

    if (uploadedFiles.length > 0) {
      onUploadComplete?.(uploadedFiles);
    }
  }, [files, projectId, category, onUploadComplete, onUploadError]);

  // ============================================================================
  // CLEAR ALL FILES
  // ============================================================================

  const clearFiles = useCallback(() => {
    files.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
  }, [files]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const pendingCount = files.filter((f) => f.uploadStatus === 'pending').length;
  const successCount = files.filter((f) => f.uploadStatus === 'success').length;
  const errorCount = files.filter((f) => f.uploadStatus === 'error').length;

  return (
    <div className={`file-upload ${className}`}>
      {/* Drop Zone */}
      <div
        className={`file-upload__dropzone ${isDragging ? 'file-upload__dropzone--dragging' : ''} ${disabled ? 'file-upload__dropzone--disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!disabled ? handleBrowseClick : undefined}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileInputChange}
          className="file-upload__input"
          disabled={disabled}
        />

        <div className="file-upload__dropzone-content">
          <span className="file-upload__icon">📁</span>
          <p className="file-upload__text">
            {isDragging
              ? 'Drop files here...'
              : 'Drag & drop files here, or click to browse'}
          </p>
          <p className="file-upload__hint">
            Max {maxFiles} files, {maxSizeMB}MB each
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="file-upload__list">
          <div className="file-upload__list-header">
            <span className="file-upload__list-title">
              Files ({files.length})
            </span>
            <button
              className="file-upload__clear-btn"
              onClick={clearFiles}
              disabled={isUploading}
            >
              Clear all
            </button>
          </div>

          <div className="file-upload__files">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className={`file-upload__file file-upload__file--${file.uploadStatus}`}
              >
                {/* Preview */}
                <div className="file-upload__file-preview">
                  {file.preview ? (
                    <img src={file.preview} alt={file.name} />
                  ) : (
                    <span className="file-upload__file-icon">
                      {getFileIcon(file.type)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="file-upload__file-info">
                  <span className="file-upload__file-name">{file.name}</span>
                  <span className="file-upload__file-size">
                    {formatFileSize(file.size)}
                  </span>
                  {file.errorMessage && (
                    <span className="file-upload__file-error">
                      {file.errorMessage}
                    </span>
                  )}
                </div>

                {/* Status */}
                <div className="file-upload__file-status">
                  {file.uploadStatus === 'pending' && (
                    <span className="file-upload__status-badge file-upload__status-badge--pending">
                      Pending
                    </span>
                  )}
                  {file.uploadStatus === 'uploading' && (
                    <span className="file-upload__status-badge file-upload__status-badge--uploading">
                      Uploading...
                    </span>
                  )}
                  {file.uploadStatus === 'success' && (
                    <span className="file-upload__status-badge file-upload__status-badge--success">
                      ✓ Uploaded
                    </span>
                  )}
                  {file.uploadStatus === 'error' && (
                    <span className="file-upload__status-badge file-upload__status-badge--error">
                      ✗ Failed
                    </span>
                  )}
                </div>

                {/* Remove Button */}
                {!isUploading && file.uploadStatus !== 'uploading' && (
                  <button
                    className="file-upload__remove-btn"
                    onClick={() => removeFile(index)}
                    title="Remove file"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Summary & Upload Button */}
          <div className="file-upload__actions">
            <div className="file-upload__summary">
              {pendingCount > 0 && (
                <span className="file-upload__summary-item">
                  {pendingCount} pending
                </span>
              )}
              {successCount > 0 && (
                <span className="file-upload__summary-item file-upload__summary-item--success">
                  {successCount} uploaded
                </span>
              )}
              {errorCount > 0 && (
                <span className="file-upload__summary-item file-upload__summary-item--error">
                  {errorCount} failed
                </span>
              )}
            </div>

            <button
              className="file-upload__upload-btn"
              onClick={uploadFiles}
              disabled={isUploading || pendingCount === 0}
            >
              {isUploading ? 'Uploading...' : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
