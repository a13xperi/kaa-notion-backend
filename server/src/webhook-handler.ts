import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

interface FigmaWebhookEvent {
  event_type: string;
  timestamp: number;
  webhook_id: string;
  file_key: string;
  triggered_by: {
    id: string;
    handle: string;
  };
  passcode: string;
}

export const handleFigmaWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.body as FigmaWebhookEvent;

    // Verify webhook passcode if configured
    if (process.env.FIGMA_WEBHOOK_PASSCODE && event.passcode !== process.env.FIGMA_WEBHOOK_PASSCODE) {
      return res.status(401).json({ error: 'Invalid webhook passcode' });
    }

    // Handle different event types
    switch (event.event_type) {
      case 'FILE_UPDATE':
        // Handle file update event
        logger.info(`File ${event.file_key} was updated by ${event.triggered_by.handle}`);
        break;

      case 'COMMENT_CREATE':
        // Handle new comment event
        logger.info(`New comment created in file ${event.file_key} by ${event.triggered_by.handle}`);
        break;

      case 'COMMENT_RESOLVE':
        // Handle comment resolution event
        logger.info(`Comment resolved in file ${event.file_key} by ${event.triggered_by.handle}`);
        break;

      default:
        logger.warn(`Unhandled event type: ${event.event_type}`);
    }

    // Acknowledge the webhook
    res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error('Error handling Figma webhook', { error });
    next(error);
  }
}; 
