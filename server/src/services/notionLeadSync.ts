import { Client } from '@notionhq/client';
import { prisma } from '../utils/prisma';
import { queueLeadSync, SyncOperation } from './notionSyncQueue';

/**
 * Notion Lead Sync Service
 *
 * Handles syncing leads to a Notion CRM database for team visibility.
 * Optional sync - only enabled when NOTION_LEADS_DATABASE_ID is set.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface LeadSyncData {
  id: string;
  email: string;
  name: string | null;
  projectAddress: string;
  budgetRange: string | null;
  timeline: string | null;
  projectType: string | null;
  hasSurvey: boolean;
  hasDrawings: boolean;
  recommendedTier: number;
  routingReason: string | null;
  status: string;
  notionPageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotionLeadPage {
  pageId: string;
  url: string;
}

// ============================================
// CONFIGURATION
// ============================================

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const NOTION_LEADS_DATABASE_ID = process.env.NOTION_LEADS_DATABASE_ID || '';

// Tier display names
const TIER_NAMES: Record<number, string> = {
  1: 'Seedling',
  2: 'Sprout',
  3: 'Canopy',
  4: 'Legacy',
};

// Tier colors for Notion
const TIER_COLORS: Record<number, string> = {
  1: 'green',
  2: 'blue',
  3: 'purple',
  4: 'yellow',
};

// Status colors for Notion
const STATUS_COLORS: Record<string, string> = {
  NEW: 'blue',
  QUALIFIED: 'green',
  NEEDS_REVIEW: 'orange',
  CONVERTED: 'purple',
  CLOSED: 'gray',
};

// Status emoji mapping
const STATUS_EMOJI: Record<string, string> = {
  NEW: '🆕',
  QUALIFIED: '✅',
  NEEDS_REVIEW: '👀',
  CONVERTED: '🎉',
  CLOSED: '❌',
};

// Budget range display
const BUDGET_DISPLAY: Record<string, string> = {
  'under_5k': 'Under $5,000',
  '5k_15k': '$5,000 - $15,000',
  '15k_50k': '$15,000 - $50,000',
  '50k_plus': '$50,000+',
  'not_sure': 'Not Sure',
};

// Timeline display
const TIMELINE_DISPLAY: Record<string, string> = {
  'asap': 'ASAP',
  '1_3_months': '1-3 Months',
  '3_6_months': '3-6 Months',
  '6_12_months': '6-12 Months',
  'planning': 'Just Planning',
};

// ============================================
// NOTION CLIENT
// ============================================

let notionClient: Client | null = null;

function getNotionClient(): Client {
  if (!notionClient) {
    if (!NOTION_API_KEY) {
      throw new Error('NOTION_API_KEY environment variable is not set');
    }
    notionClient = new Client({ auth: NOTION_API_KEY });
  }
  return notionClient;
}

function isNotionConfigured(): boolean {
  return Boolean(NOTION_API_KEY && NOTION_LEADS_DATABASE_ID);
}

// ============================================
// LEAD SYNC FUNCTIONS
// ============================================

/**
 * Create a new Notion page for a lead
 */
export async function createNotionLeadPage(
  lead: LeadSyncData
): Promise<NotionLeadPage> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion CRM not configured, skipping lead creation');
    throw new Error('Notion CRM is not configured');
  }

  const notion = getNotionClient();

  const statusEmoji = STATUS_EMOJI[lead.status] || '📋';
  const tierName = TIER_NAMES[lead.recommendedTier] || `Tier ${lead.recommendedTier}`;
  const budgetDisplay = lead.budgetRange ? (BUDGET_DISPLAY[lead.budgetRange] || lead.budgetRange) : 'Not specified';
  const timelineDisplay = lead.timeline ? (TIMELINE_DISPLAY[lead.timeline] || lead.timeline) : 'Not specified';

  // Build page properties
  const properties: Record<string, any> = {
    // Title - Lead name or email
    Name: {
      title: [
        {
          text: {
            content: lead.name || lead.email,
          },
        },
      ],
    },
    // Email
    Email: {
      email: lead.email,
    },
    // Status
    Status: {
      select: {
        name: lead.status,
        color: STATUS_COLORS[lead.status] || 'default',
      },
    },
    // Recommended Tier
    'Recommended Tier': {
      select: {
        name: tierName,
        color: TIER_COLORS[lead.recommendedTier] || 'default',
      },
    },
    // Budget Range
    Budget: {
      select: {
        name: budgetDisplay,
      },
    },
    // Timeline
    Timeline: {
      select: {
        name: timelineDisplay,
      },
    },
    // Project Type
    'Project Type': {
      rich_text: [
        {
          text: {
            content: lead.projectType || 'Not specified',
          },
        },
      ],
    },
    // Address
    Address: {
      rich_text: [
        {
          text: {
            content: lead.projectAddress,
          },
        },
      ],
    },
    // Has Survey
    'Has Survey': {
      checkbox: lead.hasSurvey,
    },
    // Has Drawings
    'Has Drawings': {
      checkbox: lead.hasDrawings,
    },
    // Created Date
    'Created At': {
      date: {
        start: lead.createdAt.toISOString(),
      },
    },
    // Internal ID
    'Internal ID': {
      rich_text: [
        {
          text: {
            content: lead.id,
          },
        },
      ],
    },
  };

  // Build page content
  const children: any[] = [];

  // Status callout
  children.push({
    object: 'block',
    type: 'callout',
    callout: {
      icon: { emoji: statusEmoji },
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Status: ${lead.status} • Tier: ${tierName}`,
          },
        },
      ],
      color: lead.status === 'NEEDS_REVIEW' ? 'orange_background' : 'gray_background',
    },
  });

  // Contact info section
  children.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: 'Contact Information' } }],
    },
  });

  children.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { type: 'text', text: { content: 'Email: ' }, annotations: { bold: true } },
        { type: 'text', text: { content: lead.email } },
      ],
    },
  });

  if (lead.name) {
    children.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          { type: 'text', text: { content: 'Name: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: lead.name } },
        ],
      },
    });
  }

  children.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { type: 'text', text: { content: 'Address: ' }, annotations: { bold: true } },
        { type: 'text', text: { content: lead.projectAddress } },
      ],
    },
  });

  // Divider
  children.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  // Project details section
  children.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: 'Project Details' } }],
    },
  });

  children.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { type: 'text', text: { content: 'Budget: ' }, annotations: { bold: true } },
        { type: 'text', text: { content: budgetDisplay } },
      ],
    },
  });

  children.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { type: 'text', text: { content: 'Timeline: ' }, annotations: { bold: true } },
        { type: 'text', text: { content: timelineDisplay } },
      ],
    },
  });

  children.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { type: 'text', text: { content: 'Project Type: ' }, annotations: { bold: true } },
        { type: 'text', text: { content: lead.projectType || 'Not specified' } },
      ],
    },
  });

  // Assets section
  children.push({
    object: 'block',
    type: 'heading_3',
    heading_3: {
      rich_text: [{ type: 'text', text: { content: 'Available Assets' } }],
    },
  });

  children.push({
    object: 'block',
    type: 'to_do',
    to_do: {
      checked: lead.hasSurvey,
      rich_text: [{ type: 'text', text: { content: 'Property Survey' } }],
    },
  });

  children.push({
    object: 'block',
    type: 'to_do',
    to_do: {
      checked: lead.hasDrawings,
      rich_text: [{ type: 'text', text: { content: 'Architectural Drawings' } }],
    },
  });

  // Divider
  children.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  // Tier recommendation section
  children.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: 'Tier Recommendation' } }],
    },
  });

  children.push({
    object: 'block',
    type: 'callout',
    callout: {
      icon: { emoji: '🌱' },
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Recommended: ${tierName}`,
          },
          annotations: { bold: true },
        },
      ],
      color: TIER_COLORS[lead.recommendedTier] === 'green' ? 'green_background' :
             TIER_COLORS[lead.recommendedTier] === 'blue' ? 'blue_background' :
             TIER_COLORS[lead.recommendedTier] === 'purple' ? 'purple_background' :
             'yellow_background',
    },
  });

  if (lead.routingReason) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: 'Reason: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: lead.routingReason } },
        ],
      },
    });
  }

  // Create the page
  const response = await notion.pages.create({
    parent: {
      database_id: NOTION_LEADS_DATABASE_ID,
    },
    icon: {
      emoji: statusEmoji,
    },
    properties,
    children,
  });

  console.log(`[NotionSync] Created Notion page for lead ${lead.id}: ${response.id}`);

  return {
    pageId: response.id,
    url: (response as any).url || `https://notion.so/${response.id.replace(/-/g, '')}`,
  };
}

/**
 * Update an existing Notion page for a lead
 */
export async function updateNotionLeadPage(
  lead: LeadSyncData,
  notionPageId: string
): Promise<void> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion CRM not configured, skipping lead update');
    throw new Error('Notion CRM is not configured');
  }

  const notion = getNotionClient();

  const statusEmoji = STATUS_EMOJI[lead.status] || '📋';
  const tierName = TIER_NAMES[lead.recommendedTier] || `Tier ${lead.recommendedTier}`;
  const budgetDisplay = lead.budgetRange ? (BUDGET_DISPLAY[lead.budgetRange] || lead.budgetRange) : 'Not specified';
  const timelineDisplay = lead.timeline ? (TIMELINE_DISPLAY[lead.timeline] || lead.timeline) : 'Not specified';

  // Update properties
  const properties: Record<string, any> = {
    Name: {
      title: [
        {
          text: {
            content: lead.name || lead.email,
          },
        },
      ],
    },
    Status: {
      select: {
        name: lead.status,
      },
    },
    'Recommended Tier': {
      select: {
        name: tierName,
      },
    },
    Budget: {
      select: {
        name: budgetDisplay,
      },
    },
    Timeline: {
      select: {
        name: timelineDisplay,
      },
    },
  };

  await notion.pages.update({
    page_id: notionPageId,
    icon: {
      emoji: statusEmoji,
    },
    properties,
  });

  console.log(`[NotionSync] Updated Notion page for lead ${lead.id}: ${notionPageId}`);
}

/**
 * Archive a Notion page for a closed/converted lead
 */
export async function archiveNotionLeadPage(notionPageId: string): Promise<void> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion CRM not configured, skipping lead archive');
    throw new Error('Notion CRM is not configured');
  }

  const notion = getNotionClient();

  await notion.pages.update({
    page_id: notionPageId,
    archived: true,
  });

  console.log(`[NotionSync] Archived Notion lead page: ${notionPageId}`);
}

// ============================================
// SYNC TRIGGERS
// ============================================

/**
 * Sync a lead to Notion CRM
 * Called by the sync queue processor
 */
export async function syncLeadToNotion(
  leadId: string,
  operation: SyncOperation
): Promise<string | undefined> {
  // Fetch lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  const syncData: LeadSyncData = {
    id: lead.id,
    email: lead.email,
    name: lead.name,
    projectAddress: lead.projectAddress,
    budgetRange: lead.budgetRange,
    timeline: lead.timeline,
    projectType: lead.projectType,
    hasSurvey: lead.hasSurvey,
    hasDrawings: lead.hasDrawings,
    recommendedTier: lead.recommendedTier,
    routingReason: lead.routingReason,
    status: lead.status,
    notionPageId: lead.notionPageId,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };

  switch (operation) {
    case 'CREATE': {
      const result = await createNotionLeadPage(syncData);
      return result.pageId;
    }

    case 'UPDATE': {
      if (lead.notionPageId) {
        await updateNotionLeadPage(syncData, lead.notionPageId);
        return lead.notionPageId;
      } else {
        // No existing page, create one
        const result = await createNotionLeadPage(syncData);
        return result.pageId;
      }
    }

    case 'DELETE': {
      if (lead.notionPageId) {
        await archiveNotionLeadPage(lead.notionPageId);
        return lead.notionPageId;
      }
      return undefined;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

// ============================================
// HELPER FUNCTIONS FOR TRIGGERING SYNC
// ============================================

/**
 * Queue a lead for sync after creation
 */
export async function onLeadCreated(leadId: string): Promise<void> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion CRM not configured, skipping lead sync');
    return;
  }

  await queueLeadSync(leadId, 'CREATE');
  console.log(`[NotionSync] Queued CREATE sync for lead ${leadId}`);
}

/**
 * Queue a lead for sync after status change
 */
export async function onLeadStatusChanged(leadId: string): Promise<void> {
  if (!isNotionConfigured()) {
    return;
  }

  await queueLeadSync(leadId, 'UPDATE');
  console.log(`[NotionSync] Queued UPDATE sync for lead ${leadId}`);
}

/**
 * Queue a lead for sync after tier override
 */
export async function onLeadTierOverride(leadId: string): Promise<void> {
  if (!isNotionConfigured()) {
    return;
  }

  await queueLeadSync(leadId, 'UPDATE');
  console.log(`[NotionSync] Queued UPDATE sync for lead ${leadId} (tier override)`);
}

/**
 * Queue a lead for archive after conversion or closure
 */
export async function onLeadClosed(leadId: string): Promise<void> {
  if (!isNotionConfigured()) {
    return;
  }

  // Update status in Notion rather than archiving
  // This keeps the lead visible in the CRM but marked as closed/converted
  await queueLeadSync(leadId, 'UPDATE');
  console.log(`[NotionSync] Queued UPDATE sync for lead ${leadId} (closed/converted)`);
}

export default {
  createNotionLeadPage,
  updateNotionLeadPage,
  archiveNotionLeadPage,
  syncLeadToNotion,
  onLeadCreated,
  onLeadStatusChanged,
  onLeadTierOverride,
  onLeadClosed,
  isNotionConfigured,
};
