import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../utils/prisma';
import { verifyToken } from '../utils/auth';
import {
  uploadFile,
  getSignedUrl,
  deleteFile,
  isAllowedFileType,
  isAllowedFileSize,
  getFileCategory,
  getMaxFileSize,
  formatBytes,
  ALLOWED_TYPES,
} from '../services/storageService';
import { onDeliverableCreated } from '../services/notionDeliverableSync';
import { logFileAction, logDeliverableAction } from '../services/auditService';

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max (will be validated per category)
    files: 10, // Max 10 files per request
  },
});

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Middleware to verify JWT token and attach user to request
 */
async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided',
      },
    });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token, JWT_SECRET);

  if (!payload || typeof payload.userId !== 'string') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }

  (req as Request & { user: { userId: string; role: string } }).user = {
    userId: payload.userId,
    role: (payload.role as string) || 'CLIENT',
  };

  next();
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as Request & { user: { userId: string; role: string } }).user;

  if (user.role !== 'ADMIN' && user.role !== 'TEAM') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
  }

  next();
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/upload
 * Upload a single file
 *
 * Body (multipart/form-data):
 * - file: The file to upload
 * - projectId: (optional) Project to associate with
 * - category: File category (Document, Photo, Drawing, etc.)
 * - description: (optional) File description
 * - folder: (optional) Storage folder path
 */
router.post(
  '/',
  authenticateUser,
  requireAdmin,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as Request & { user: { userId: string; role: string } }).user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
          },
        });
      }

      const { projectId, category, description, folder } = req.body;

      // Validate file type
      if (!isAllowedFileType(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `File type '${file.mimetype}' is not allowed`,
            allowedTypes: Object.keys(ALLOWED_TYPES),
          },
        });
      }

      // Get file category and validate size
      const fileCategory = category || getFileCategory(file.mimetype);
      const maxSize = getMaxFileSize(fileCategory);

      if (!isAllowedFileSize(file.size, fileCategory)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size (${formatBytes(file.size)}) exceeds maximum allowed (${formatBytes(maxSize)})`,
            maxSize: maxSize,
            maxSizeFormatted: formatBytes(maxSize),
          },
        });
      }

      // If projectId provided, verify it exists and user has access
      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
            },
          });
        }
      }

      // Determine storage folder
      const storageFolder = folder || (projectId ? `projects/${projectId}` : 'uploads');

      // Upload file to Supabase Storage
      const uploadResult = await uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        {
          folder: storageFolder,
        }
      );

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'UPLOAD_FAILED',
            message: uploadResult.error || 'Failed to upload file',
          },
        });
      }

      // If projectId provided, create deliverable record
      let deliverable = null;
      if (projectId) {
        deliverable = await prisma.deliverable.create({
          data: {
            projectId,
            name: file.originalname,
            filePath: uploadResult.filePath,
            fileUrl: uploadResult.fileUrl,
            fileSize: uploadResult.fileSize,
            fileType: uploadResult.fileType,
            category: category || capitalizeFirst(fileCategory),
            description: description || null,
            uploadedById: user.userId,
          },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // Queue Notion sync
        try {
          await onDeliverableCreated(deliverable.id);
        } catch (error) {
          console.error('[Upload] Failed to queue Notion sync:', error);
        }

        // Log audit event
        await logDeliverableAction(req, 'DELIVERABLE_CREATE', deliverable.id, {
          projectId,
          fileName: file.originalname,
          fileSize: uploadResult.fileSize,
          category: fileCategory,
        });
      } else {
        // Log file upload without deliverable
        await logFileAction(req, 'FILE_UPLOAD', uploadResult.filePath, {
          fileName: file.originalname,
          fileSize: uploadResult.fileSize,
        });
      }

      return res.status(201).json({
        success: true,
        data: {
          file: {
            name: file.originalname,
            path: uploadResult.filePath,
            url: uploadResult.fileUrl,
            size: uploadResult.fileSize,
            sizeFormatted: formatBytes(uploadResult.fileSize),
            type: uploadResult.fileType,
            category: fileCategory,
          },
          deliverable: deliverable || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/upload/multiple
 * Upload multiple files
 *
 * Body (multipart/form-data):
 * - files: Array of files to upload
 * - projectId: (optional) Project to associate with
 * - category: File category
 * - folder: (optional) Storage folder path
 */
router.post(
  '/multiple',
  authenticateUser,
  requireAdmin,
  upload.array('files', 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as Request & { user: { userId: string; role: string } }).user;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No files provided',
          },
        });
      }

      const { projectId, category, folder } = req.body;

      // Verify project if provided
      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
            },
          });
        }
      }

      const storageFolder = folder || (projectId ? `projects/${projectId}` : 'uploads');

      const results: Array<{
        success: boolean;
        file: {
          name: string;
          path?: string;
          url?: string;
          size: number;
          type: string;
        };
        deliverable?: any;
        error?: string;
      }> = [];

      for (const file of files) {
        // Validate file type
        if (!isAllowedFileType(file.mimetype)) {
          results.push({
            success: false,
            file: {
              name: file.originalname,
              size: file.size,
              type: file.mimetype,
            },
            error: `File type '${file.mimetype}' is not allowed`,
          });
          continue;
        }

        // Validate file size
        const fileCategory = category || getFileCategory(file.mimetype);
        if (!isAllowedFileSize(file.size, fileCategory)) {
          results.push({
            success: false,
            file: {
              name: file.originalname,
              size: file.size,
              type: file.mimetype,
            },
            error: `File size exceeds maximum (${formatBytes(getMaxFileSize(fileCategory))})`,
          });
          continue;
        }

        // Upload file
        const uploadResult = await uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          { folder: storageFolder }
        );

        if (!uploadResult.success) {
          results.push({
            success: false,
            file: {
              name: file.originalname,
              size: file.size,
              type: file.mimetype,
            },
            error: uploadResult.error,
          });
          continue;
        }

        // Create deliverable if projectId
        let deliverable = null;
        if (projectId) {
          deliverable = await prisma.deliverable.create({
            data: {
              projectId,
              name: file.originalname,
              filePath: uploadResult.filePath,
              fileUrl: uploadResult.fileUrl,
              fileSize: uploadResult.fileSize,
              fileType: uploadResult.fileType,
              category: category || capitalizeFirst(fileCategory),
              uploadedById: user.userId,
            },
          });

          // Queue Notion sync
          try {
            await onDeliverableCreated(deliverable.id);
          } catch (error) {
            console.error('[Upload] Failed to queue Notion sync:', error);
          }
        }

        results.push({
          success: true,
          file: {
            name: file.originalname,
            path: uploadResult.filePath,
            url: uploadResult.fileUrl,
            size: uploadResult.fileSize,
            type: uploadResult.fileType,
          },
          deliverable,
        });
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return res.status(successCount > 0 ? 201 : 400).json({
        success: successCount > 0,
        data: {
          results,
          summary: {
            total: files.length,
            success: successCount,
            failed: failCount,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/upload/signed-url/:filePath
 * Get a signed URL for a file
 */
router.get(
  '/signed-url/*',
  authenticateUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get file path from wildcard parameter
      const filePath = req.params[0];

      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'File path is required',
          },
        });
      }

      const expiresIn = parseInt(req.query.expiresIn as string) || 3600; // Default 1 hour

      const result = await getSignedUrl(filePath, undefined, expiresIn);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'SIGNED_URL_FAILED',
            message: result.error || 'Failed to generate signed URL',
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          signedUrl: result.signedUrl,
          expiresAt: result.expiresAt?.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/upload/:filePath
 * Delete a file from storage (admin only)
 */
router.delete(
  '/*',
  authenticateUser,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get file path from wildcard parameter
      const filePath = req.params[0];

      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'File path is required',
          },
        });
      }

      const result = await deleteFile(filePath);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: result.error || 'Failed to delete file',
          },
        });
      }

      // Log audit event
      await logFileAction(req, 'FILE_DELETE', filePath);

      return res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/upload/info
 * Get upload configuration info
 */
router.get('/info', async (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    data: {
      allowedTypes: ALLOWED_TYPES,
      maxSizes: {
        document: formatBytes(50 * 1024 * 1024),
        image: formatBytes(20 * 1024 * 1024),
        drawing: formatBytes(100 * 1024 * 1024),
        archive: formatBytes(500 * 1024 * 1024),
        video: formatBytes(500 * 1024 * 1024),
        audio: formatBytes(100 * 1024 * 1024),
        default: formatBytes(50 * 1024 * 1024),
      },
      maxFiles: 10,
    },
  });
});

// ============================================
// HELPERS
// ============================================

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default router;
