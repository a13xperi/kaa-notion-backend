/**
 * DeliverableCard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeliverableCard } from '../DeliverableCard';
import { DeliverableSummary, Deliverable } from '../../types/portal.types';

const mockDeliverableSummary: DeliverableSummary = {
  id: 'deliverable-1',
  name: 'Site_Plan_v2.pdf',
  category: 'Document',
  fileType: 'application/pdf',
  fileSize: 2457600, // 2.34 MB
  createdAt: '2024-11-01T10:30:00.000Z',
};

const mockImageDeliverable: DeliverableSummary = {
  id: 'deliverable-2',
  name: 'Rendering_Front_View.png',
  category: 'Rendering',
  fileType: 'image/png',
  fileSize: 5242880, // 5 MB
  createdAt: '2024-11-05T14:00:00.000Z',
};

const mockFullDeliverable: Deliverable = {
  id: 'deliverable-3',
  projectId: 'project-1',
  name: 'Project_Contract.pdf',
  category: 'Contract',
  description: 'Final project contract',
  fileType: 'application/pdf',
  fileSize: 1048576, // 1 MB
  fileSizeFormatted: '1 MB',
  createdAt: '2024-11-10T09:00:00.000Z',
  uploadedBy: {
    id: 'user-1',
    email: 'admin@example.com',
  },
};

describe('DeliverableCard', () => {
  const mockOnDownload = jest.fn();
  const mockOnView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render deliverable name', () => {
      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={mockOnDownload}
        />
      );

      expect(screen.getByText('Site_Plan_v2.pdf')).toBeInTheDocument();
    });

    it('should render category badge', () => {
      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={mockOnDownload}
        />
      );

      expect(screen.getByText('Document')).toBeInTheDocument();
    });

    it('should render formatted file size', () => {
      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={mockOnDownload}
        />
      );

      // 2457600 bytes = 2.34 MB
      expect(screen.getByText('2.34 MB')).toBeInTheDocument();
    });

    it('should use pre-formatted file size when available', () => {
      render(
        <DeliverableCard
          deliverable={mockFullDeliverable}
          onDownload={mockOnDownload}
        />
      );

      expect(screen.getByText('1 MB')).toBeInTheDocument();
    });

    it('should render file type icon for PDFs', () => {
      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={mockOnDownload}
        />
      );

      expect(screen.getByText('📄')).toBeInTheDocument();
    });

    it('should render file type icon for images', () => {
      render(
        <DeliverableCard
          deliverable={mockImageDeliverable}
          onDownload={mockOnDownload}
        />
      );

      expect(screen.getByText('🖼️')).toBeInTheDocument();
    });

    it('should render upload date', () => {
      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={mockOnDownload}
        />
      );

      expect(screen.getByText('Nov 1, 2024')).toBeInTheDocument();
    });

    it('should render description when available', () => {
      render(
        <DeliverableCard
          deliverable={mockFullDeliverable}
          onDownload={mockOnDownload}
        />
      );

      expect(screen.getByText('Final project contract')).toBeInTheDocument();
    });

    it('should render uploader info when available', () => {
      render(
        <DeliverableCard
          deliverable={mockFullDeliverable}
          onDownload={mockOnDownload}
        />
      );

      expect(screen.getByText(/uploaded by admin@example.com/i)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onDownload when download button is clicked', () => {
      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={mockOnDownload}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadButton);

      expect(mockOnDownload).toHaveBeenCalledWith('deliverable-1');
    });

    it('should call onView when preview button is clicked for viewable files', () => {
      render(
        <DeliverableCard
          deliverable={mockImageDeliverable}
          onDownload={mockOnDownload}
          onView={mockOnView}
        />
      );

      const previewButton = screen.getByRole('button', { name: /preview/i });
      fireEvent.click(previewButton);

      expect(mockOnView).toHaveBeenCalledWith('deliverable-2');
    });

    it('should show preview button for images when onView is provided', () => {
      render(
        <DeliverableCard
          deliverable={mockImageDeliverable}
          onDownload={mockOnDownload}
          onView={mockOnView}
        />
      );

      expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    });

    it('should show preview button for PDFs when onView is provided', () => {
      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={mockOnDownload}
          onView={mockOnView}
        />
      );

      expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    });

    it('should not show preview button if onView is not provided', () => {
      render(
        <DeliverableCard
          deliverable={mockImageDeliverable}
          onDownload={mockOnDownload}
        />
      );

      expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument();
    });

    it('should not show preview button for non-previewable files', () => {
      const zipDeliverable: DeliverableSummary = {
        ...mockDeliverableSummary,
        fileType: 'application/zip',
      };

      render(
        <DeliverableCard
          deliverable={zipDeliverable}
          onDownload={mockOnDownload}
          onView={mockOnView}
        />
      );

      expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('should render in compact mode', () => {
      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={mockOnDownload}
          compact={true}
        />
      );

      const card = document.querySelector('.deliverable-card--compact');
      expect(card).toBeInTheDocument();
    });

    it('should still show essential info in compact mode', () => {
      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={mockOnDownload}
          compact={true}
        />
      );

      expect(screen.getByText('Site_Plan_v2.pdf')).toBeInTheDocument();
      expect(screen.getByText('2.34 MB')).toBeInTheDocument();
    });

    it('should show download action in compact mode', () => {
      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={mockOnDownload}
          compact={true}
        />
      );

      const downloadButton = screen.getByLabelText(/download/i);
      expect(downloadButton).toBeInTheDocument();
    });
  });

  describe('category styling', () => {
    it('should apply correct class for Document category', () => {
      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={mockOnDownload}
        />
      );

      const categoryBadge = document.querySelector('.deliverable-card__category');
      expect(categoryBadge).toHaveClass('category-blue');
    });

    it('should apply correct class for Rendering category', () => {
      render(
        <DeliverableCard
          deliverable={mockImageDeliverable}
          onDownload={mockOnDownload}
        />
      );

      const categoryBadge = document.querySelector('.deliverable-card__category');
      expect(categoryBadge).toHaveClass('category-purple');
    });

    it('should apply correct class for Contract category', () => {
      render(
        <DeliverableCard
          deliverable={mockFullDeliverable}
          onDownload={mockOnDownload}
        />
      );

      const categoryBadge = document.querySelector('.deliverable-card__category');
      expect(categoryBadge).toHaveClass('category-red');
    });
  });

  describe('file icons', () => {
    const testCases = [
      { fileType: 'application/pdf', expectedIcon: '📄' },
      { fileType: 'image/png', expectedIcon: '🖼️' },
      { fileType: 'image/jpeg', expectedIcon: '🖼️' },
      { fileType: 'application/zip', expectedIcon: '📦' },
      { fileType: 'application/msword', expectedIcon: '📝' },
      { fileType: 'application/vnd.ms-excel', expectedIcon: '📊' },
      { fileType: 'unknown/type', expectedIcon: '📎' },
    ];

    testCases.forEach(({ fileType, expectedIcon }) => {
      it(`should show ${expectedIcon} for ${fileType}`, () => {
        const deliverable: DeliverableSummary = {
          ...mockDeliverableSummary,
          fileType,
        };

        render(
          <DeliverableCard
            deliverable={deliverable}
            onDownload={mockOnDownload}
          />
        );

        expect(screen.getByText(expectedIcon)).toBeInTheDocument();
      });
    });
  });

  describe('downloading state', () => {
    it('should disable download button while downloading', async () => {
      const slowDownload = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <DeliverableCard
          deliverable={mockDeliverableSummary}
          onDownload={slowDownload}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadButton);

      // Button should be disabled during download
      await waitFor(() => {
        expect(downloadButton).toBeDisabled();
      });
    });
  });
});
