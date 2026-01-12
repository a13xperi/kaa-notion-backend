/**
 * Upload Routes
 * API endpoints for file uploads with validation (JWT-authenticated).
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import type { PrismaClient, SyncStatus } from '@prisma/client';
import { StorageService } from '../services/storageService';
import { logger } from '../logger';
import { internalError } from '../utils/AppError';
import { recordDeliverableUploaded } from '../config/metrics';
import { requireAuth, requireAdmin } from '../middleware';

// ============================================================================
// TYPES
// ============================================================================

interface UploadRouterDependencies {
  prisma: PrismaClient;
}

interface StorageServiceRequest extends Request {
  storageService?: StorageService;
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
    const storageService = (req as StorageServiceRequest).storageService as StorageService;
    const allowedTypes = storageService.getAllowedMimeTypes();

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

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
  const authMiddleware = requireAuth(prisma);
  const adminMiddleware = requireAdmin(); // AdminOptions - no prisma needed

  // ============================================================================
  // POST /api/upload - Upload a single file
  // ============================================================================
  router.post(
    '/',
    authMiddleware,
    adminMiddleware,
    upload.single('file'),
    handleMulterError,
    async (req: Request, res: Response, next: NextFunction) => {
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
        const storageService = (req as StorageServiceRequest).storageService as StorageService;

        // Upload file
        const uploadResult = await storageService.uploadFile(file.buffer, {
          projectId,
          category: category || 'Document',
          fileName: file.originalname,
          contentType: file.mimetype,
          userId: req.user!.id,
        });

        if (!uploadResult.success) {
          return next(internalError(uploadResult.error || 'Upload failed'));
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
            details: JSON.stringify({
              projectId,
              fileName: file.originalname,
              fileSize: uploadResult.fileSize,
              category,
            }),
          },
        });

        recordDeliverableUploaded(category || 'Document');

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
        next(internalError('Upload failed', error as Error));
      }
    }
  );

  // ============================================================================
  // POST /api/upload/multiple - Upload multiple files
  // ============================================================================
  router.post(
    '/multiple',
    authMiddleware,
    adminMiddleware,
    upload.array('files', 10),
    handleMulterError,
    async (req: Request, res: Response, next: NextFunction) => {
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

        const storageService = (req as StorageServiceRequest).storageService as StorageService;

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
            recordDeliverableUploaded(category || 'Document');
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
            details: JSON.stringify({
              projectId,
              fileCount: files.length,
              successCount: results.filter((r) => r.success).length,
            }),
          },
        });

        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        return res.status(successCount > 0 ? 201 : 207).json({
          success: successCount > 0,
          data: {
            uploaded: successCount,
            failed: failureCount,
            results,
          },
        });
      } catch (error) {
        next(internalError('Upload failed', error as Error));
      }
    }
  );

  // ============================================================================
  // GET /api/upload/config - Get upload configuration (allowed types, max size)
  // ============================================================================
  router.get('/config', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storageService = (req as StorageServiceRequest).storageService as StorageService;
      const allowedTypes = storageService.getAllowedMimeTypes();
      const maxSizeBytes = storageService.getMaxFileSizeBytes();

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
      return next(internalError('Failed to get config', error as Error));
    }
  });

  // ============================================================================
  // DELETE /api/upload/:deliverableId - Delete a file
  // ============================================================================
  router.delete(
    '/:deliverableId',
    authMiddleware,
    adminMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
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
          const storageService = (req as StorageServiceRequest).storageService as StorageService;
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
            details: JSON.stringify({
              projectId: deliverable.projectId,
              fileName: deliverable.name,
            }),
          },
        });

        return res.json({
          success: true,
          data: { message: 'File deleted successfully' },
        });
      } catch (error) {
        return next(internalError('Delete failed', error as Error));
      }
    }
  );

  return router;
}

export default createUploadRouter;
