/**
 * Upload Routes
 * API endpoints for file uploads with validation.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import type { PrismaClient, SyncStatus } from '@prisma/client';
import { getStorageService, StorageService } from '../services/storageService';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

interface UploadRouterDependencies {
  prisma: PrismaClient;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        userType: 'KAA_CLIENT' | 'SAGE_CLIENT' | 'TEAM' | 'ADMIN';
      };
    }
  }
}

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

// Store files in memory for processing before sending to Supabase
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Get allowed types from storage service if available
    try {
      const storageService = getStorageService();
      const allowedTypes = storageService.getAllowedMimeTypes();
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`));
      }
    } catch {
      // If storage service not initialized, use default list
      const defaultAllowed = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      
      if (defaultAllowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`));
      }
    }
  },
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Require authentication
 */
function requireAuth(req: Request, res: Response, next: Function): void {
  const userId = req.headers['x-user-id'] as string;
  const userType = req.headers['x-user-type'] as string;
  const userEmail = req.headers['x-user-email'] as string;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  const validTypes = ['KAA_CLIENT', 'SAGE_CLIENT', 'TEAM', 'ADMIN'];
  if (!validTypes.includes(userType)) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid user type' },
    });
    return;
  }

  req.user = {
    id: userId,
    email: userEmail || '',
    userType: userType as 'KAA_CLIENT' | 'SAGE_CLIENT' | 'TEAM' | 'ADMIN',
  };

  next();
}

/**
 * Require admin or team access
 */
function requireAdmin(req: Request, res: Response, next: Function): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  const adminTypes = ['ADMIN', 'TEAM'];
  if (!adminTypes.includes(req.user.userType)) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
    return;
  }

  next();
}

/**
 * Handle multer errors
 */
function handleMulterError(err: any, req: Request, res: Response, next: Function): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds maximum allowed (50MB)' },
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        error: { code: 'TOO_MANY_FILES', message: 'Maximum 10 files per upload' },
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: err.message },
    });
    return;
  }
  
  if (err) {
    res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: err.message },
    });
    return;
  }
  
  next();
}

// ============================================================================
// ROUTER
// ============================================================================

export function createUploadRouter({ prisma }: UploadRouterDependencies): Router {
  const router = Router();

  // ============================================================================
  // POST /api/upload - Upload a single file
  // ============================================================================
  router.post(
    '/',
    requireAuth,
    requireAdmin,
    upload.single('file'),
    handleMulterError,
    async (req: Request, res: Response) => {
      try {
        const file = req.file;
        const { projectId, category, description } = req.body;

        // Validate required fields
        if (!file) {
          return res.status(400).json({
            success: false,
            error: { code: 'NO_FILE', message: 'No file provided' },
          });
        }

        if (!projectId) {
          return res.status(400).json({
            success: false,
            error: { code: 'MISSING_PROJECT', message: 'projectId is required' },
          });
        }

        // Verify project exists
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          return res.status(404).json({
            success: false,
            error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' },
          });
        }

        // Get storage service
        let storageService: StorageService;
        try {
          storageService = getStorageService();
        } catch {
          return res.status(503).json({
            success: false,
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Storage service not configured' },
          });
        }

        // Upload file
        const uploadResult = await storageService.uploadFile(file.buffer, {
          projectId,
          category: category || 'Document',
          fileName: file.originalname,
          contentType: file.mimetype,
          userId: req.user!.id,
        });

        if (!uploadResult.success) {
          return res.status(500).json({
            success: false,
            error: { code: 'UPLOAD_FAILED', message: uploadResult.error },
          });
        }

        // Create deliverable record
        const deliverable = await prisma.deliverable.create({
          data: {
            projectId,
            name: file.originalname,
            filePath: uploadResult.filePath!,
            fileUrl: uploadResult.fileUrl!,
            fileSize: uploadResult.fileSize!,
            fileType: file.mimetype,
            category: category || 'Document',
            description: description || null,
            uploadedById: req.user!.id,
            syncStatus: 'PENDING' as SyncStatus,
          },
        });

        // Log audit
        await prisma.auditLog.create({
          data: {
            userId: req.user!.id,
            action: 'file_uploaded',
            resourceType: 'deliverable',
            resourceId: deliverable.id,
            details: {
              projectId,
              fileName: file.originalname,
              fileSize: uploadResult.fileSize,
              category,
            },
          },
        });

        return res.status(201).json({
          success: true,
          data: {
            id: deliverable.id,
            name: deliverable.name,
            filePath: deliverable.filePath,
            fileUrl: deliverable.fileUrl,
            fileSize: deliverable.fileSize,
            fileSizeFormatted: StorageService.formatFileSize(deliverable.fileSize),
            fileType: deliverable.fileType,
            category: deliverable.category,
            createdAt: deliverable.createdAt.toISOString(),
          },
        });
      } catch (error) {
        logger.error('Upload error', {
          error: (error as Error).message,
          correlationId: req.correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Upload failed' },
        });
      }
    }
  );

  // ============================================================================
  // POST /api/upload/multiple - Upload multiple files
  // ============================================================================
  router.post(
    '/multiple',
    requireAuth,
    requireAdmin,
    upload.array('files', 10),
    handleMulterError,
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];
        const { projectId, category } = req.body;

        if (!files || files.length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'NO_FILES', message: 'No files provided' },
          });
        }

        if (!projectId) {
          return res.status(400).json({
            success: false,
            error: { code: 'MISSING_PROJECT', message: 'projectId is required' },
          });
        }

        // Verify project exists
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          return res.status(404).json({
            success: false,
            error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' },
          });
        }

        let storageService: StorageService;
        try {
          storageService = getStorageService();
        } catch {
          return res.status(503).json({
            success: false,
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Storage service not configured' },
          });
        }

        const results: Array<{
          fileName: string;
          success: boolean;
          deliverable?: any;
          error?: string;
        }> = [];

        // Process each file
        for (const file of files) {
          const uploadResult = await storageService.uploadFile(file.buffer, {
            projectId,
            category: category || 'Document',
            fileName: file.originalname,
            contentType: file.mimetype,
            userId: req.user!.id,
          });

          if (uploadResult.success) {
            const deliverable = await prisma.deliverable.create({
              data: {
                projectId,
                name: file.originalname,
                filePath: uploadResult.filePath!,
                fileUrl: uploadResult.fileUrl!,
                fileSize: uploadResult.fileSize!,
                fileType: file.mimetype,
                category: category || 'Document',
                uploadedById: req.user!.id,
                syncStatus: 'PENDING' as SyncStatus,
              },
            });

            results.push({
              fileName: file.originalname,
              success: true,
              deliverable: {
                id: deliverable.id,
                name: deliverable.name,
                fileUrl: deliverable.fileUrl,
                fileSize: deliverable.fileSize,
              },
            });
          } else {
            results.push({
              fileName: file.originalname,
              success: false,
              error: uploadResult.error,
            });
          }
        }

        // Log audit
        await prisma.auditLog.create({
          data: {
            userId: req.user!.id,
            action: 'files_uploaded',
            resourceType: 'deliverable',
            details: {
              projectId,
              fileCount: files.length,
              successCount: results.filter((r) => r.success).length,
            },
          },
        });

        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        return res.status(successCount > 0 ? 201 : 500).json({
          success: successCount > 0,
          data: {
            uploaded: successCount,
            failed: failureCount,
            results,
          },
        });
      } catch (error) {
        logger.error('Multiple upload error', {
          error: (error as Error).message,
          correlationId: req.correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Upload failed' },
        });
      }
    }
  );

  // ============================================================================
  // GET /api/upload/config - Get upload configuration (allowed types, max size)
  // ============================================================================
  router.get('/config', async (req: Request, res: Response) => {
    try {
      let allowedTypes: string[];
      let maxSizeBytes: number;

      try {
        const storageService = getStorageService();
        allowedTypes = storageService.getAllowedMimeTypes();
        maxSizeBytes = storageService.getMaxFileSizeBytes();
      } catch {
        // Default configuration
        allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        maxSizeBytes = 50 * 1024 * 1024;
      }

      return res.json({
        success: true,
        data: {
          allowedTypes,
          maxSizeBytes,
          maxSizeMB: maxSizeBytes / (1024 * 1024),
          maxFiles: 10,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get config' },
      });
    }
  });

  // ============================================================================
  // DELETE /api/upload/:deliverableId - Delete a file
  // ============================================================================
  router.delete(
    '/:deliverableId',
    requireAuth,
    requireAdmin,
    async (req: Request, res: Response) => {
      const { deliverableId } = req.params;
      
      try {

        // Get deliverable
        const deliverable = await prisma.deliverable.findUnique({
          where: { id: deliverableId },
        });

        if (!deliverable) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Deliverable not found' },
          });
        }

        // Delete from storage
        try {
          const storageService = getStorageService();
          const deleteResult = await storageService.deleteFile(deliverable.filePath);

          if (!deleteResult.success) {
            logger.warn('Storage delete failed', {
              error: deleteResult.error,
              correlationId: req.correlationId,
              filePath: deliverable.filePath,
            });
            // Continue with database deletion even if storage delete fails
          }
        } catch (error) {
          logger.error('Storage service error', {
            error: (error as Error).message,
            correlationId: req.correlationId,
          });
        }

        // Delete from database
        await prisma.deliverable.delete({
          where: { id: deliverableId },
        });

        // Log audit
        await prisma.auditLog.create({
          data: {
            userId: req.user!.id,
            action: 'file_deleted',
            resourceType: 'deliverable',
            resourceId: deliverableId,
            details: {
              projectId: deliverable.projectId,
              fileName: deliverable.name,
            },
          },
        });

        return res.json({
          success: true,
          data: { message: 'File deleted successfully' },
        });
      } catch (error) {
        logger.error('Delete error', {
          error: (error as Error).message,
          correlationId: req.correlationId,
          deliverableId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Delete failed' },
        });
      }
    }
  );

  return router;
}

export default createUploadRouter;
