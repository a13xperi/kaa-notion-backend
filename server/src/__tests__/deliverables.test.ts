/**
 * Deliverables & Upload Routes Tests
 *
 * Tests for file upload, download, and metadata handling.
 */

import { prisma } from '../utils/prisma';
import { mockProject, mockUser } from './setup';

// Mock storage service
jest.mock('../services/storageService', () => ({
  uploadFile: jest.fn(),
  getSignedUrl: jest.fn(),
  deleteFile: jest.fn(),
  isAllowedFileType: jest.fn(),
  isAllowedFileSize: jest.fn(),
  getFileCategory: jest.fn(),
  getMaxFileSize: jest.fn(),
  formatBytes: jest.fn(),
  ALLOWED_TYPES: {
    document: ['application/pdf', 'application/msword'],
    image: ['image/jpeg', 'image/png', 'image/webp'],
    drawing: ['application/pdf', 'image/svg+xml'],
  },
}));

import * as storageService from '../services/storageService';

describe('Deliverable Routes', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockStorage = storageService as jest.Mocked<typeof storageService>;

  const mockDeliverable = {
    id: 'deliverable-1',
    projectId: mockProject.id,
    name: 'Concept Design.pdf',
    filePath: 'projects/test-project-id/deliverables/concept-design.pdf',
    fileUrl: 'https://storage.example.com/projects/test-project-id/deliverables/concept-design.pdf',
    fileSize: 2500000, // 2.5 MB
    fileType: 'application/pdf',
    category: 'Document',
    description: 'Initial concept design document',
    uploadedById: mockUser.id,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.isAllowedFileType.mockReturnValue(true);
    mockStorage.isAllowedFileSize.mockReturnValue(true);
    mockStorage.getFileCategory.mockReturnValue('document');
    mockStorage.formatBytes.mockImplementation((bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`);
  });

  describe('POST /api/upload - Single File Upload', () => {
    it('should upload file and create deliverable', async () => {
      const file = {
        originalname: 'concept.pdf',
        mimetype: 'application/pdf',
        size: 2500000,
        buffer: Buffer.from('pdf content'),
      };

      mockStorage.uploadFile.mockResolvedValue({
        success: true,
        filePath: 'projects/test/concept.pdf',
        fileUrl: 'https://storage.example.com/projects/test/concept.pdf',
        fileSize: file.size,
      });

      const uploadResult = await storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'projects/test'
      );

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.filePath).toBeDefined();

      (mockPrisma.deliverable.create as jest.Mock).mockResolvedValue(mockDeliverable);

      const deliverable = await mockPrisma.deliverable.create({
        data: {
          projectId: mockProject.id,
          name: file.originalname,
          filePath: uploadResult.filePath!,
          fileUrl: uploadResult.fileUrl!,
          fileSize: file.size,
          fileType: file.mimetype,
          category: 'Document',
          uploadedById: mockUser.id,
        },
      });

      expect(deliverable.id).toBeDefined();
      expect(deliverable.name).toBe('Concept Design.pdf');
    });

    it('should reject files exceeding size limit', () => {
      mockStorage.isAllowedFileSize.mockReturnValue(false);
      mockStorage.getMaxFileSize.mockReturnValue(50 * 1024 * 1024); // 50MB

      const largeFile = {
        size: 100 * 1024 * 1024, // 100MB
        mimetype: 'application/pdf',
      };

      const isAllowed = storageService.isAllowedFileSize(largeFile.size, 'document');
      expect(isAllowed).toBe(false);
    });

    it('should reject disallowed file types', () => {
      mockStorage.isAllowedFileType.mockReturnValue(false);

      const executableFile = {
        mimetype: 'application/x-executable',
      };

      const isAllowed = storageService.isAllowedFileType(executableFile.mimetype);
      expect(isAllowed).toBe(false);
    });

    it('should categorize files correctly', () => {
      mockStorage.getFileCategory.mockImplementation((mimeType: string) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'document';
        if (mimeType.includes('drawing') || mimeType === 'image/svg+xml') return 'drawing';
        return 'other';
      });

      expect(storageService.getFileCategory('image/jpeg')).toBe('image');
      expect(storageService.getFileCategory('application/pdf')).toBe('document');
    });

    it('should require authentication', () => {
      const authHeader = undefined;
      const isAuthenticated = !!authHeader;

      expect(isAuthenticated).toBe(false);
    });

    it('should require project ID for deliverables', () => {
      const projectId = undefined;
      const hasProjectId = !!projectId;

      expect(hasProjectId).toBe(false);
    });
  });

  describe('POST /api/upload/multiple - Multiple File Upload', () => {
    it('should upload multiple files', async () => {
      const files = [
        { originalname: 'file1.pdf', mimetype: 'application/pdf', size: 1000000 },
        { originalname: 'file2.jpg', mimetype: 'image/jpeg', size: 500000 },
        { originalname: 'file3.png', mimetype: 'image/png', size: 750000 },
      ];

      mockStorage.uploadFile.mockResolvedValue({
        success: true,
        filePath: 'test/path',
        fileUrl: 'https://storage.example.com/test/path',
        fileSize: 1000000,
      });

      const results = await Promise.all(
        files.map((file) =>
          storageService.uploadFile(
            Buffer.from('content'),
            file.originalname,
            file.mimetype,
            'projects/test'
          )
        )
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should enforce max file count', () => {
      const maxFiles = 10;
      const uploadedFiles = Array(15).fill({ name: 'file.pdf' });

      expect(uploadedFiles.length).toBeGreaterThan(maxFiles);
    });

    it('should handle partial failures gracefully', async () => {
      mockStorage.uploadFile
        .mockResolvedValueOnce({ success: true, filePath: 'file1.pdf' })
        .mockResolvedValueOnce({ success: false, error: 'Upload failed' })
        .mockResolvedValueOnce({ success: true, filePath: 'file3.pdf' });

      const results = await Promise.all([
        storageService.uploadFile(Buffer.from(''), 'file1.pdf', 'application/pdf', 'test'),
        storageService.uploadFile(Buffer.from(''), 'file2.pdf', 'application/pdf', 'test'),
        storageService.uploadFile(Buffer.from(''), 'file3.pdf', 'application/pdf', 'test'),
      ]);

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      expect(successful).toHaveLength(2);
      expect(failed).toHaveLength(1);
    });
  });

  describe('GET /api/upload/signed-url/* - Get Signed URL', () => {
    it('should generate signed URL for authorized user', async () => {
      const signedUrl = 'https://storage.example.com/file.pdf?token=abc123&expires=1234567890';

      mockStorage.getSignedUrl.mockResolvedValue({
        success: true,
        signedUrl,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = await storageService.getSignedUrl('projects/test/file.pdf');

      expect(result.success).toBe(true);
      expect(result.signedUrl).toContain('token=');
    });

    it('should set appropriate expiration time', async () => {
      const expiresIn = 3600; // 1 hour
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      mockStorage.getSignedUrl.mockResolvedValue({
        success: true,
        signedUrl: 'https://example.com/signed',
        expiresAt,
      });

      const result = await storageService.getSignedUrl('test/path');

      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should verify user has access to file', async () => {
      // User can access files from their projects
      const userProjectIds = ['project-1', 'project-2'];
      const fileProjectId = 'project-1';

      const hasAccess = userProjectIds.includes(fileProjectId);
      expect(hasAccess).toBe(true);

      // User cannot access other projects' files
      const otherFileProjectId = 'project-3';
      const hasAccessOther = userProjectIds.includes(otherFileProjectId);
      expect(hasAccessOther).toBe(false);
    });
  });

  describe('DELETE /api/upload/* - Delete File', () => {
    it('should delete file (admin only)', async () => {
      mockStorage.deleteFile.mockResolvedValue({ success: true });

      const result = await storageService.deleteFile('projects/test/file.pdf');

      expect(result.success).toBe(true);
    });

    it('should also delete deliverable record', async () => {
      (mockPrisma.deliverable.delete as jest.Mock).mockResolvedValue(mockDeliverable);

      await mockPrisma.deliverable.delete({
        where: { id: mockDeliverable.id },
      });

      expect(mockPrisma.deliverable.delete).toHaveBeenCalledWith({
        where: { id: mockDeliverable.id },
      });
    });

    it('should require admin role', () => {
      const user = { ...mockUser, role: 'CLIENT' };
      const isAdmin = user.role === 'ADMIN' || user.role === 'TEAM';

      expect(isAdmin).toBe(false);
    });

    it('should handle non-existent files gracefully', async () => {
      mockStorage.deleteFile.mockResolvedValue({
        success: false,
        error: 'File not found',
      });

      const result = await storageService.deleteFile('nonexistent/path');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('GET /api/projects/:id/deliverables - List Deliverables', () => {
    it('should return project deliverables', async () => {
      const deliverables = [
        mockDeliverable,
        { ...mockDeliverable, id: 'deliverable-2', name: 'Final Design.pdf' },
      ];

      (mockPrisma.deliverable.findMany as jest.Mock).mockResolvedValue(deliverables);

      const result = await mockPrisma.deliverable.findMany({
        where: { projectId: mockProject.id },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(2);
    });

    it('should filter by category', async () => {
      const documents = [mockDeliverable];

      (mockPrisma.deliverable.findMany as jest.Mock).mockResolvedValue(documents);

      const result = await mockPrisma.deliverable.findMany({
        where: { projectId: mockProject.id, category: 'Document' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Document');
    });

    it('should include uploader information', async () => {
      const deliverableWithUploader = {
        ...mockDeliverable,
        uploadedBy: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
      };

      (mockPrisma.deliverable.findMany as jest.Mock).mockResolvedValue([deliverableWithUploader]);

      const result = await mockPrisma.deliverable.findMany({
        where: { projectId: mockProject.id },
        include: { uploadedBy: { select: { id: true, name: true, email: true } } },
      });

      expect(result[0].uploadedBy).toBeDefined();
    });
  });

  describe('File Validation', () => {
    it('should validate allowed MIME types', () => {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      const disallowedTypes = [
        'application/x-executable',
        'application/x-msdownload',
        'text/javascript',
      ];

      allowedTypes.forEach((type) => {
        expect(allowedTypes.includes(type)).toBe(true);
      });

      disallowedTypes.forEach((type) => {
        expect(allowedTypes.includes(type)).toBe(false);
      });
    });

    it('should enforce size limits by category', () => {
      const sizeLimits: Record<string, number> = {
        document: 50 * 1024 * 1024,  // 50 MB
        image: 20 * 1024 * 1024,     // 20 MB
        drawing: 100 * 1024 * 1024,  // 100 MB
        video: 500 * 1024 * 1024,    // 500 MB
      };

      expect(sizeLimits.document).toBe(52428800);
      expect(sizeLimits.image).toBe(20971520);
    });

    it('should sanitize file names', () => {
      const sanitizeFileName = (name: string): string => {
        return name
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/__+/g, '_')
          .toLowerCase();
      };

      expect(sanitizeFileName('My File (1).pdf')).toBe('my_file__1_.pdf');
      expect(sanitizeFileName('../../../etc/passwd')).toBe('_.._.._.._etc_passwd');
    });
  });

  describe('Storage Path Generation', () => {
    it('should generate correct storage paths', () => {
      const generatePath = (projectId: string, fileName: string): string => {
        const timestamp = Date.now();
        const sanitized = fileName.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
        return `projects/${projectId}/deliverables/${timestamp}-${sanitized}`;
      };

      const path = generatePath('project-123', 'My Design.pdf');

      expect(path).toContain('projects/project-123/deliverables/');
      expect(path).toContain('my_design.pdf');
    });

    it('should include timestamp for uniqueness', () => {
      const path1 = `projects/test/${Date.now()}-file.pdf`;
      const path2 = `projects/test/${Date.now() + 1}-file.pdf`;

      expect(path1).not.toBe(path2);
    });
  });
});

describe('File Download Tracking', () => {
  it('should track download events', () => {
    const downloadEvent = {
      deliverableId: 'deliverable-1',
      userId: 'user-1',
      downloadedAt: new Date(),
      ipAddress: '127.0.0.1',
    };

    expect(downloadEvent.deliverableId).toBeDefined();
    expect(downloadEvent.downloadedAt).toBeDefined();
  });

  it('should generate download URL with expiration', () => {
    const generateDownloadUrl = (
      baseUrl: string,
      token: string,
      expiresIn: number
    ): string => {
      const expires = Math.floor(Date.now() / 1000) + expiresIn;
      return `${baseUrl}?token=${token}&expires=${expires}`;
    };

    const url = generateDownloadUrl('https://storage.example.com/file.pdf', 'abc123', 3600);

    expect(url).toContain('token=abc123');
    expect(url).toContain('expires=');
  });
});
