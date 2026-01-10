/**
 * FileUploader Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUploader, FileUpload } from '../FileUploader';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('FileUploader', () => {
  const mockOnUpload = jest.fn().mockImplementation(
    (_file: File, onProgress: (progress: number) => void) => {
      // Simulate upload progress
      onProgress(50);
      onProgress(100);
      return Promise.resolve('https://example.com/file.pdf');
    }
  );

  const defaultProps = {
    onUpload: mockOnUpload,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render drop zone with default label', () => {
      render(<FileUploader {...defaultProps} />);
      
      expect(screen.getByText('Upload Files')).toBeInTheDocument();
      expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    });

    it('should render custom label', () => {
      render(<FileUploader {...defaultProps} label="Upload Documents" />);
      
      expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    });

    it('should render helper text', () => {
      render(<FileUploader {...defaultProps} helperText="Max 50MB per file" />);
      
      expect(screen.getByText('Max 50MB per file')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<FileUploader {...defaultProps} disabled />);
      
      const dropzone = screen.getByRole('button', { name: /upload/i });
      expect(dropzone).toHaveClass('disabled');
    });
  });

  describe('File Selection', () => {
    it('should trigger file input on click', () => {
      render(<FileUploader {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: /upload/i });
      fireEvent.click(dropzone);
      
      // Input should exist and be clickable (we can't fully test file dialog)
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
    });

    it('should trigger file input on Enter key', () => {
      render(<FileUploader {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: /upload/i });
      fireEvent.keyDown(dropzone, { key: 'Enter' });
      
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
    });

    it('should accept specified file types', () => {
      render(<FileUploader {...defaultProps} accept=".pdf,image/*" />);
      
      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('accept', '.pdf,image/*');
    });

    it('should support multiple file selection', () => {
      render(<FileUploader {...defaultProps} multiple />);
      
      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('multiple');
    });
  });

  describe('Drag and Drop', () => {
    it('should show dragging state on drag enter', () => {
      render(<FileUploader {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: /upload/i });
      
      fireEvent.dragEnter(dropzone, {
        dataTransfer: { items: [{ kind: 'file' }] },
      });
      
      expect(dropzone).toHaveClass('dragging');
    });

    it('should remove dragging state on drag leave', () => {
      render(<FileUploader {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: /upload/i });
      
      fireEvent.dragEnter(dropzone, {
        dataTransfer: { items: [{ kind: 'file' }] },
      });
      
      fireEvent.dragLeave(dropzone);
      
      expect(dropzone).not.toHaveClass('dragging');
    });

    it('should show "Drop files here" text when dragging', () => {
      render(<FileUploader {...defaultProps} />);
      
      const dropzone = screen.getByRole('button', { name: /upload/i });
      
      fireEvent.dragEnter(dropzone, {
        dataTransfer: { items: [{ kind: 'file' }] },
      });
      
      expect(screen.getByText('Drop files here')).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('should call onUpload when file is selected', async () => {
      render(<FileUploader {...defaultProps} />);
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(file, expect.any(Function));
      });
    });

    it('should display uploaded file in list', async () => {
      render(<FileUploader {...defaultProps} />);
      
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
      });
    });

    it('should call onError for oversized files', async () => {
      const onError = jest.fn();
      render(
        <FileUploader
          {...defaultProps}
          maxSize={100} // 100 bytes
          onError={onError}
        />
      );
      
      const file = new File(['x'.repeat(200)], 'large.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
        expect(onError.mock.calls[0][0]).toContain('size');
      });
    });

    it('should call onComplete when upload succeeds', async () => {
      const onComplete = jest.fn();
      render(<FileUploader {...defaultProps} onComplete={onComplete} />);
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      }, { timeout: 100 });
    });
  });

  describe('Upload Item Actions', () => {
    it('should allow removing uploaded files', async () => {
      render(<FileUploader {...defaultProps} />);
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });
      
      fireEvent.change(input);
      
      // Wait for upload to complete (status changes to success)
      await waitFor(() => {
        const successIcon = document.querySelector('.file-upload-success');
        expect(successIcon).toBeInTheDocument();
      });
      
      const removeButton = screen.getByLabelText('Remove file');
      fireEvent.click(removeButton);
      
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  describe('File Type Validation', () => {
    it('should reject files with invalid extensions', async () => {
      const onError = jest.fn();
      render(
        <FileUploader
          {...defaultProps}
          accept=".pdf"
          onError={onError}
        />
      );
      
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.stringContaining('type'),
          file
        );
      });
    });

    it('should accept files matching MIME type pattern', async () => {
      render(<FileUploader {...defaultProps} accept="image/*" showPreviews={false} />);
      
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalled();
      });
    });
  });

  describe('Max Files Limit', () => {
    it('should limit files to maxFiles count in single selection', async () => {
      const onComplete = jest.fn();
      render(
        <FileUploader
          {...defaultProps}
          maxFiles={2}
          multiple
          onComplete={onComplete}
        />
      );
      
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Try to upload three files at once - should only process first 2
      const files = [
        new File(['1'], '1.pdf', { type: 'application/pdf' }),
        new File(['2'], '2.pdf', { type: 'application/pdf' }),
        new File(['3'], '3.pdf', { type: 'application/pdf' }),
      ];
      
      Object.defineProperty(input, 'files', { value: files, configurable: true });
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText('1.pdf')).toBeInTheDocument();
        expect(screen.getByText('2.pdf')).toBeInTheDocument();
      });
      
      // Third file should not be uploaded
      expect(screen.queryByText('3.pdf')).not.toBeInTheDocument();
    });
  });
});
