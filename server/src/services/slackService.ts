/**
 * Slack Notification Service
 * Sends notifications to Slack channels for important events.
 */

import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface SlackConfig {
  webhookUrl: string;
  defaultChannel?: string;
  enabled?: boolean;
}

export interface SlackMessage {
  text: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
}

export interface SlackAttachment {
  fallback?: string;
  color?: string;
  pretext?: string;
  author_name?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: SlackField[];
  footer?: string;
  footer_icon?: string;
  ts?: number;
  blocks?: SlackBlock[];
}

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context' | 'actions';
  text?: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: 'plain_text' | 'mrkdwn';
    text: string;
  }>;
  accessory?: Record<string, unknown>;
  elements?: Array<Record<string, unknown>>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

let slackConfig: SlackConfig = {
  webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '#notifications',
  enabled: process.env.SLACK_ENABLED !== 'false',
};

/**
 * Initialize the Slack service
 */
export function initSlackService(config: Partial<SlackConfig>): void {
  slackConfig = { ...slackConfig, ...config };
  
  if (!slackConfig.webhookUrl) {
    logger.warn('Slack webhook URL not configured, notifications disabled');
  } else {
    logger.info('Slack notification service initialized', {
      channel: slackConfig.defaultChannel,
      enabled: slackConfig.enabled,
    });
  }
}

/**
 * Check if Slack is configured and enabled
 */
export function isSlackEnabled(): boolean {
  return !!slackConfig.webhookUrl && slackConfig.enabled !== false;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Send a message to Slack
 */
export async function sendSlackMessage(message: SlackMessage): Promise<boolean> {
  if (!isSlackEnabled()) {
    logger.debug('Slack notification skipped (not configured)', { text: message.text });
    return false;
  }

  try {
    const response = await fetch(slackConfig.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...message,
        channel: message.channel || slackConfig.defaultChannel,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Slack notification failed', { status: response.status, error: errorText });
      return false;
    }

    logger.info('Slack notification sent', { channel: message.channel || slackConfig.defaultChannel });
    return true;
  } catch (error) {
    logger.error('Slack notification error', { error });
    return false;
  }
}

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

/**
 * Send notification for new lead
 */
export async function notifyNewLead(lead: {
  email: string;
  name?: string;
  projectAddress: string;
  recommendedTier: number;
  routingReason?: string;
}): Promise<boolean> {
  const tierNames: Record<number, string> = {
    1: 'The Concept',
    2: 'The Builder',
    3: 'The Concierge',
    4: 'KAA White Glove',
  };

  return sendSlackMessage({
    text: `New lead received from ${lead.name || lead.email}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🌱 New Lead Received',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Name:*\n${lead.name || 'Not provided'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Email:*\n${lead.email}`,
          },
          {
            type: 'mrkdwn',
            text: `*Project Address:*\n${lead.projectAddress}`,
          },
          {
            type: 'mrkdwn',
            text: `*Recommended Tier:*\nTier ${lead.recommendedTier} - ${tierNames[lead.recommendedTier] || 'Unknown'}`,
          },
        ],
      },
      ...(lead.routingReason ? [{
        type: 'context' as const,
        elements: [{
          type: 'mrkdwn' as const,
          text: `📋 Routing reason: ${lead.routingReason}`,
        }],
      }] : []),
    ],
  });
}

/**
 * Send notification for successful payment
 */
export async function notifyPaymentReceived(payment: {
  email: string;
  tier: number;
  amount: number;
  currency?: string;
}): Promise<boolean> {
  const tierNames: Record<number, string> = {
    1: 'The Concept',
    2: 'The Builder',
    3: 'The Concierge',
    4: 'KAA White Glove',
  };

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: payment.currency || 'USD',
  }).format(payment.amount / 100);

  return sendSlackMessage({
    text: `Payment received: ${formattedAmount} from ${payment.email}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '💰 Payment Received!',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Customer:*\n${payment.email}`,
          },
          {
            type: 'mrkdwn',
            text: `*Amount:*\n${formattedAmount}`,
          },
          {
            type: 'mrkdwn',
            text: `*Tier:*\nTier ${payment.tier} - ${tierNames[payment.tier] || 'Unknown'}`,
          },
        ],
      },
    ],
  });
}

/**
 * Send notification for project status change
 */
export async function notifyProjectStatusChange(project: {
  name: string;
  clientEmail: string;
  oldStatus: string;
  newStatus: string;
}): Promise<boolean> {
  const statusEmoji: Record<string, string> = {
    ONBOARDING: '📋',
    IN_PROGRESS: '🚧',
    AWAITING_FEEDBACK: '⏳',
    REVISIONS: '✏️',
    DELIVERED: '🎉',
    CLOSED: '✅',
  };

  return sendSlackMessage({
    text: `Project "${project.name}" status changed to ${project.newStatus}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji[project.newStatus] || '📌'} Project Status Update`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Project:*\n${project.name}`,
          },
          {
            type: 'mrkdwn',
            text: `*Client:*\n${project.clientEmail}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status Change:*\n${project.oldStatus} → ${project.newStatus}`,
          },
        ],
      },
    ],
  });
}

/**
 * Send notification for milestone completion
 */
export async function notifyMilestoneCompleted(milestone: {
  projectName: string;
  milestoneName: string;
  clientEmail: string;
}): Promise<boolean> {
  return sendSlackMessage({
    text: `Milestone "${milestone.milestoneName}" completed for ${milestone.projectName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎯 Milestone Completed',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Project:*\n${milestone.projectName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Milestone:*\n${milestone.milestoneName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Client:*\n${milestone.clientEmail}`,
          },
        ],
      },
    ],
  });
}

/**
 * Send notification for new document upload
 */
export async function notifyDocumentUploaded(document: {
  fileName: string;
  fileSize: number;
  projectName: string;
  uploadedBy: string;
}): Promise<boolean> {
  const fileSizeFormatted = document.fileSize < 1024 * 1024
    ? `${Math.round(document.fileSize / 1024)} KB`
    : `${(document.fileSize / (1024 * 1024)).toFixed(1)} MB`;

  return sendSlackMessage({
    text: `New document uploaded to ${document.projectName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📎 New Document Uploaded',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*File:*\n${document.fileName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Size:*\n${fileSizeFormatted}`,
          },
          {
            type: 'mrkdwn',
            text: `*Project:*\n${document.projectName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Uploaded by:*\n${document.uploadedBy}`,
          },
        ],
      },
    ],
  });
}

/**
 * Send a custom alert/error notification
 */
export async function notifyAlert(alert: {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  details?: Record<string, string>;
}): Promise<boolean> {
  const severityConfig = {
    info: { emoji: 'ℹ️', color: '#2563eb' },
    warning: { emoji: '⚠️', color: '#f59e0b' },
    error: { emoji: '🚨', color: '#dc2626' },
  };

  const config = severityConfig[alert.severity];
  const fields = alert.details
    ? Object.entries(alert.details).map(([key, value]) => ({
        type: 'mrkdwn' as const,
        text: `*${key}:*\n${value}`,
      }))
    : [];

  return sendSlackMessage({
    text: `${config.emoji} ${alert.title}: ${alert.message}`,
    attachments: [{
      color: config.color,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${config.emoji} ${alert.title}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alert.message,
          },
        },
        ...(fields.length > 0 ? [{
          type: 'section' as const,
          fields,
        }] : []),
      ],
    }],
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initSlackService,
  isSlackEnabled,
  sendSlackMessage,
  notifyNewLead,
  notifyPaymentReceived,
  notifyProjectStatusChange,
  notifyMilestoneCompleted,
  notifyDocumentUploaded,
  notifyAlert,
};
