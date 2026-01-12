/**
 * Project Messages Routes
 *
 * GET /api/projects/:projectId/messages - Get messages for a project
 * POST /api/projects/:projectId/messages - Send a message
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod/v3';
import { prisma } from '../utils/prisma';
import { logger } from '../config/logger';
import { notifyNewMessage } from '../services/notificationService';

const router = Router({ mergeParams: true });

// ========================================
// Validation Schemas
// ========================================

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  attachments: z.array(z.string().url()).optional(),
  isInternal: z.boolean().optional().default(false),
});

const getMessagesSchema = z.object({
  limit: z.string().optional().transform((v) => v ? parseInt(v, 10) : 50),
  before: z.string().optional(), // Cursor for pagination (message ID)
  includeInternal: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
});

// ========================================
// Routes
// ========================================

/**
 * GET /api/projects/:projectId/messages
 *
 * Get messages for a project.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { projectId } = req.params;

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        client: { userId: user.id },
      },
      include: { client: true },
    });

    // Allow team/admin access
    const isTeamOrAdmin = user.role === 'ADMIN' || user.role === 'TEAM';

    if (!project && !isTeamOrAdmin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const validation = getMessagesSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.issues[0].message,
        },
      });
    }

    const { limit, before, includeInternal } = validation.data;

    // Build query
    const where: any = { projectId };

    // Only admins/team can see internal messages
    if (!isTeamOrAdmin || !includeInternal) {
      where.isInternal = false;
    }

    // Cursor-based pagination
    if (before) {
      where.createdAt = {
        lt: (await prisma.message.findUnique({ where: { id: before } }))?.createdAt,
      };
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Get one extra to check if there are more
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Reverse to get chronological order
    messages.reverse();

    return res.json({
      success: true,
      data: {
        messages,
        hasMore,
        nextCursor: hasMore ? messages[0]?.id : null,
      },
    });
  } catch (error) {
    logger.error('Failed to get messages', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch messages' },
    });
  }
});

/**
 * POST /api/projects/:projectId/messages
 *
 * Send a message on a project.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { projectId } = req.params;

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: { id: projectId },
      include: {
        client: {
          include: { user: true },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const isTeamOrAdmin = user.role === 'ADMIN' || user.role === 'TEAM';
    const isProjectOwner = project.client.userId === user.id;

    if (!isProjectOwner && !isTeamOrAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this project' },
      });
    }

    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.issues[0].message,
        },
      });
    }

    const { content, attachments, isInternal } = validation.data;

    // Only team/admin can send internal messages
    if (isInternal && !isTeamOrAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only team members can send internal messages' },
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        projectId,
        senderId: user.id,
        content,
        attachments: attachments || [],
        isInternal: isInternal || false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Notify the other party (if not internal)
    if (!isInternal) {
      if (isTeamOrAdmin) {
        // Team sent message, notify client
        await notifyNewMessage(
          project.client.userId,
          projectId,
          project.name,
          user.name || 'SAGE Team'
        );
      } else {
        // Client sent message, notify team (get admins)
        const admins = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'TEAM'] } },
          select: { id: true },
        });

        for (const admin of admins) {
          await notifyNewMessage(
            admin.id,
            projectId,
            project.name,
            user.name || 'Client'
          );
        }
      }
    }

    logger.info('Message sent', {
      projectId,
      messageId: message.id,
      senderId: user.id,
      isInternal,
    });

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    logger.error('Failed to send message', { projectId: req.params.projectId }, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to send message' },
    });
  }
});

/**
 * GET /api/projects/:projectId/messages/:messageId
 *
 * Get a single message.
 */
router.get('/:messageId', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { projectId, messageId } = req.params;

    const message = await prisma.message.findFirst({
      where: { id: messageId, projectId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Message not found' },
      });
    }

    // Check access
    const isTeamOrAdmin = user.role === 'ADMIN' || user.role === 'TEAM';
    if (message.isInternal && !isTeamOrAdmin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Message not found' },
      });
    }

    return res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    logger.error('Failed to get message', { messageId: req.params.messageId }, error as Error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch message' },
    });
  }
});

export default router;
