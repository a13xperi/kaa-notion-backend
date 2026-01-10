/**
 * Feature Flag Guard Middleware
 * Blocks requests when feature-flagged services are disabled.
 */

import { Request, Response, NextFunction } from 'express';
import { getFeatureFlags } from '../config/environment';
import { recordServiceDisabled } from '../config/metrics';
import { logger } from '../logger';
import { AppError, ErrorCodes } from '../utils/AppError';
import { getNotionSyncService, NotionSyncService } from '../services';
import { getStorageService, StorageService } from '../services/storageService';

type GuardedService = 'notion' | 'storage';

interface ServiceRequest extends Request {
  notionSyncService?: NotionSyncService;
  storageService?: StorageService;
}

function blockDisabledService(
  req: Request,
  res: Response,
  service: GuardedService,
  message: string,
  details?: Record<string, unknown>
): void {
  const error = new AppError({
    code: ErrorCodes.SERVICE_UNAVAILABLE,
    message,
    details: {
      service,
      ...details,
    },
  });

  recordServiceDisabled(service);
  logger.warn('Blocked request for disabled service', {
    service,
    message,
    method: req.method,
    path: req.originalUrl,
    correlationId: req.correlationId,
    details,
  });

  res.status(error.statusCode).json(error.toJSON());
}

export function requireNotionService(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const features = getFeatureFlags();

  if (!features.notionEnabled) {
    return blockDisabledService(req, res, 'notion', 'Notion service is disabled', {
      reason: 'feature_flag_disabled',
    });
  }

  try {
    (req as ServiceRequest).notionSyncService = getNotionSyncService();
  } catch (error) {
    return blockDisabledService(req, res, 'notion', 'Notion sync service not configured', {
      reason: 'service_not_initialized',
      error: (error as Error).message,
    });
  }

  next();
}

export function requireStorageService(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const features = getFeatureFlags();

  if (!features.storageEnabled) {
    return blockDisabledService(req, res, 'storage', 'Storage service is disabled', {
      reason: 'feature_flag_disabled',
    });
  }

  try {
    (req as ServiceRequest).storageService = getStorageService();
  } catch (error) {
    return blockDisabledService(req, res, 'storage', 'Storage service not configured', {
      reason: 'service_not_initialized',
      error: (error as Error).message,
    });
  }

  next();
}
