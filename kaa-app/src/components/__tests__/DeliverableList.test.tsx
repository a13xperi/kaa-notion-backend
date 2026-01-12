/**
 * DeliverableList Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeliverableList } from '../DeliverableList';
import { Deliverable } from '../../types/portal.types';
import { batchDownloadDeliverables } from '../../api/portalApi';

jest.mock('../../api/portalApi', () => ({
  batchDownloadDeliverables: jest.fn(),
}));

const mockDeliverables: Deliverable[] = [
  {
    id: 'deliverable-1',
    projectId: 'project-1',
    name: 'Kitchen_Render.pdf',
    category: 'Rendering',
    description: null,
    fileType: 'application/pdf',
    fileSize: 1200000,
    fileSizeFormatted: '1.2 MB',
    createdAt: '2024-11-05T10:00:00.000Z',
    uploadedBy: {
      id: 'user-1',
      email: 'admin@example.com',
    },
  },
  {
    id: 'deliverable-2',
    projectId: 'project-1',
    name: 'Site_Photo.png',
    category: 'Photo',
    description: null,
    fileType: 'image/png',
    fileSize: 800000,
    fileSizeFormatted: '0.8 MB',
    createdAt: '2024-11-06T10:00:00.000Z',
    uploadedBy: {
      id: 'user-1',
      email: 'admin@example.com',
    },
  },
];

describe('DeliverableList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call batch download API when clicking download all', async () => {
    const batchDownloadMock = batchDownloadDeliverables as jest.Mock;
    batchDownloadMock.mockResolvedValue({
      success: true,
      data: {
        projectId: 'project-1',
        downloadCount: 2,
        deliverables: [
          {
            id: 'deliverable-1',
            name: 'Kitchen_Render.pdf',
            downloadUrl: 'https://example.com/kitchen.pdf',
            expiresAt: '2024-11-06T12:00:00.000Z',
            fileType: 'application/pdf',
            fileSize: 1200000,
          },
          {
            id: 'deliverable-2',
            name: 'Site_Photo.png',
            downloadUrl: 'https://example.com/site.png',
            expiresAt: '2024-11-06T12:00:00.000Z',
            fileType: 'image/png',
            fileSize: 800000,
          },
        ],
      },
    });

    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <DeliverableList
        deliverables={mockDeliverables}
        projectId="project-1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /download all/i }));

    await waitFor(() => {
      expect(batchDownloadMock).toHaveBeenCalledWith('project-1', [
        'deliverable-1',
        'deliverable-2',
      ]);
    });

    expect(openSpy).toHaveBeenCalledTimes(2);

    openSpy.mockRestore();
  });
});
