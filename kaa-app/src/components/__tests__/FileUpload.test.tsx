/**
 * FileUpload Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FileUpload, UploadedFile } from '../FileUpload';

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'mock-preview-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper to create mock files
function createMockFile(
  name: string,
  type: string,
  size: number = 1024
): File {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('FileUpload', () => {
  const defaultProps = {
    projectId: 'project-123',
    category: 'Document',
    onUploadComplete: jest.fn(),
    onUploadError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            id: 'file-1',
            name: 'test.pdf',
            fileUrl: 'https://example.com/test.pdf',
            fileSize: 1024,
            fileSizeFormatted: '1 KB',
            fileType: 'application/pdf',
            category: 'Document',
            createdAt: new Date().toISOString(),
          } as UploadedFile,
        }),
    });
  });

  describe('rendering', () => {
    it('should render the dropzone', () => {
      render(<FileUpload {...defaultProps} />);

      expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    });

    it('should display max files and size hint', () => {
      render(<FileUpload {...defaultProps} maxFiles={5} maxSizeMB={25} />);

      expect(screen.getByText(/max 5 files, 25mb each/i)).toBeInTheDocument();
    });

    it('should render file input', () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
    });

    it('should accept multiple files', () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('multiple');
    });
  });

  describe('file selection', () => {
    it('should display selected files', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.pdf', 'application/pdf');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });

    it('should show file size for selected files', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.pdf', 'application/pdf', 2048);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('2 KB')).toBeInTheDocument();
      });
    });

    it('should show pending status for valid files', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.pdf', 'application/pdf');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });
    });

    it('should create preview for image files', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('image.png', 'image/png');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
      });
    });
  });

  describe('file validation', () => {
    it('should reject files with invalid type', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('script.js', 'text/javascript');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/file type.*not allowed/i)).toBeInTheDocument();
      });
    });

    it('should reject files exceeding max size', async () => {
      render(<FileUpload {...defaultProps} maxSizeMB={1} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      // Create file larger than 1MB
      const file = createMockFile('large.pdf', 'application/pdf', 2 * 1024 * 1024);

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/exceeds.*1mb limit/i)).toBeInTheDocument();
      });
    });

    it('should reject when exceeding max files', async () => {
      render(<FileUpload {...defaultProps} maxFiles={2} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const files = [
        createMockFile('file1.pdf', 'application/pdf'),
        createMockFile('file2.pdf', 'application/pdf'),
        createMockFile('file3.pdf', 'application/pdf'),
      ];

      fireEvent.change(input, { target: { files } });

      await waitFor(() => {
        expect(defaultProps.onUploadError).toHaveBeenCalledWith(
          expect.stringContaining('Maximum 2 files')
        );
      });
    });
  });

  describe('drag and drop', () => {
    it('should show dragging state', () => {
      render(<FileUpload {...defaultProps} />);

      const dropzone = document.querySelector('.file-upload__dropzone');
      if (dropzone) {
        fireEvent.dragEnter(dropzone);
        expect(dropzone).toHaveClass('file-upload__dropzone--dragging');
      }
    });

    it('should remove dragging state on drag leave', () => {
      render(<FileUpload {...defaultProps} />);

      const dropzone = document.querySelector('.file-upload__dropzone');
      if (dropzone) {
        fireEvent.dragEnter(dropzone);
        fireEvent.dragLeave(dropzone);
        expect(dropzone).not.toHaveClass('file-upload__dropzone--dragging');
      }
    });

    it('should show drop text when dragging', () => {
      render(<FileUpload {...defaultProps} />);

      const dropzone = document.querySelector('.file-upload__dropzone');
      if (dropzone) {
        fireEvent.dragEnter(dropzone);
        expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
      }
    });
  });

  describe('file removal', () => {
    it('should remove file when remove button is clicked', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.pdf', 'application/pdf');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      const removeButton = screen.getByTitle('Remove file');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
      });
    });

    it('should remove image file and cleanup', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('image.png', 'image/png');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('image.png')).toBeInTheDocument();
      });

      const removeButton = screen.getByTitle('Remove file');
      fireEvent.click(removeButton);

      // File should be removed from the list
      await waitFor(() => {
        expect(screen.queryByText('image.png')).not.toBeInTheDocument();
      });
    });
  });

  describe('clear all', () => {
    it('should clear all files when clear button is clicked', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const files = [
        createMockFile('file1.pdf', 'application/pdf'),
        createMockFile('file2.pdf', 'application/pdf'),
      ];

      fireEvent.change(input, { target: { files } });

      await waitFor(() => {
        expect(screen.getByText('file1.pdf')).toBeInTheDocument();
        expect(screen.getByText('file2.pdf')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear all');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText('file1.pdf')).not.toBeInTheDocument();
        expect(screen.queryByText('file2.pdf')).not.toBeInTheDocument();
      });
    });
  });

  describe('upload', () => {
    it('should upload files when upload button is clicked', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.pdf', 'application/pdf');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText(/upload 1 file/i);
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/upload',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('should show success status after upload', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.pdf', 'application/pdf');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText(/upload 1 file/i);
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/✓ uploaded/i)).toBeInTheDocument();
      });
    });

    it('should call onUploadComplete after successful upload', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.pdf', 'application/pdf');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText(/upload 1 file/i);
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(defaultProps.onUploadComplete).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'file-1',
              name: 'test.pdf',
            }),
          ])
        );
      });
    });

    it('should show error status on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: { message: 'Upload failed' },
          }),
      });

      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.pdf', 'application/pdf');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText(/upload 1 file/i);
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/✗ failed/i)).toBeInTheDocument();
      });
    });

    it('should disable upload button when no pending files', async () => {
      render(<FileUpload {...defaultProps} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.pdf', 'application/pdf');

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      const uploadButton = screen.getByText(/upload 1 file/i);
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/✓ uploaded/i)).toBeInTheDocument();
      });

      // After successful upload, button should show 0 files and be disabled
      await waitFor(() => {
        const disabledButton = screen.getByText(/upload 0 file/i);
        expect(disabledButton).toBeDisabled();
      });
    });
  });

  describe('disabled state', () => {
    it('should apply disabled class to dropzone', () => {
      render(<FileUpload {...defaultProps} disabled={true} />);

      const dropzone = document.querySelector('.file-upload__dropzone');
      expect(dropzone).toHaveClass('file-upload__dropzone--disabled');
    });

    it('should disable file input when disabled', () => {
      render(<FileUpload {...defaultProps} disabled={true} />);

      const input = document.querySelector('input[type="file"]');
      expect(input).toBeDisabled();
    });

    it('should not handle drops when disabled', () => {
      render(<FileUpload {...defaultProps} disabled={true} />);

      const dropzone = document.querySelector('.file-upload__dropzone');
      const file = createMockFile('test.pdf', 'application/pdf');
      
      const dataTransfer = {
        files: [file],
        items: [],
        types: ['Files'],
      };

      if (dropzone) {
        fireEvent.drop(dropzone, { dataTransfer });
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
      }
    });
  });

  describe('file type icons', () => {
    const testCases = [
      { type: 'application/pdf', icon: '📄' },
      { type: 'image/png', icon: '🖼️' },
      { type: 'application/msword', icon: '📝' },
      { type: 'unknown/type', icon: '📎' },
    ];

    testCases.forEach(({ type, icon }) => {
      it(`should show ${icon} icon for ${type}`, async () => {
        render(<FileUpload {...defaultProps} allowedTypes={[type]} />);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = createMockFile('test.file', type);

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
          expect(screen.getByText(icon)).toBeInTheDocument();
        });
      });
    });
  });
});
