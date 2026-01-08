import React, { useState } from 'react';
import logger from '../utils/logger';
import './DocumentUpload.css';

interface DocumentUploadProps {
  clientAddress: string;
  onUploadComplete: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ clientAddress, onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Document');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = ['Document', 'Invoice', 'Contract', 'Photo', 'Report', 'Other'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // File size validation
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError('File size must be less than 10MB');
        return;
      }
      
      // File type validation (optional but recommended)
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif'];
      const fileName = selectedFile.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        setError(`File type not supported. Allowed types: ${allowedExtensions.join(', ')}`);
        return;
      }
      
      // Sanitize file name (remove potentially dangerous characters)
      const sanitizedFileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
      if (sanitizedFileName !== fileName) {
        logger.warn('File name contained invalid characters and was sanitized');
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Sanitize and validate inputs
      const sanitizedAddress = clientAddress.trim().slice(0, 200); // Limit length
      const sanitizedCategory = category.trim().slice(0, 50);
      const sanitizedDescription = description.trim().slice(0, 1000); // Limit description length
      
      formData.append('address', sanitizedAddress);
      formData.append('category', sanitizedCategory);
      formData.append('description', sanitizedDescription);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/client/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Upload failed';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `Server error (${response.status})`;
        }
        setError(errorMessage);
        setUploading(false);
        return;
      }

      // Success
      await response.json(); // Response data not needed for success state
      setSuccess(true);
      setFile(null);
      setDescription('');
      setCategory('Document');
      setError(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Show success message for 3 seconds
      setTimeout(() => {
        setSuccess(false);
        onUploadComplete();
      }, 3000);
    } catch (err) {
      logger.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Connection error. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="document-upload-container">
      <div className="upload-header">
        <h3>📤 Upload Document</h3>
        <p className="upload-subtitle">Share files with your project team</p>
      </div>

      {success && (
        <div className="upload-success">
          <span className="success-icon">✅</span>
          <span>Document uploaded successfully!</span>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label htmlFor="file-upload" className="file-upload-label">
            <div className="file-upload-box">
              {file ? (
                <div className="file-selected">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div className="file-placeholder">
                  <span className="upload-icon">☁️</span>
                  <span className="upload-text">Click to select file or drag and drop</span>
                  <span className="upload-hint">Max size: 10MB</span>
                </div>
              )}
            </div>
          </label>
          <input
            type="file"
            id="file-upload"
            onChange={handleFileChange}
            disabled={uploading}
            accept="*/*"
            style={{ display: 'none' }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="category" className="form-label">Category</label>
          <select
            id="category"
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={uploading}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Description <span className="optional">(Optional)</span>
          </label>
          <textarea
            id="description"
            className="form-textarea"
            placeholder="Add any notes about this document..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
            rows={3}
          />
        </div>

        <button
          type="submit"
          className="upload-button"
          disabled={!file || uploading}
          aria-label={uploading ? 'Uploading document...' : 'Upload document'}
          aria-busy={uploading}
        >
          {uploading ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">📤</span>
              <span>Upload Document</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default DocumentUpload;

