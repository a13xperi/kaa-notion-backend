import { Client } from '@notionhq/client';
import { prisma } from '../utils/prisma';
import { queueDeliverableSync, SyncOperation } from './notionSyncQueue';

/**
 * Notion Deliverable Sync Service
 *
 * Handles creating showcase pages for deliverables in Notion.
 * Each deliverable gets its own page with file details and preview.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface DeliverableSyncData {
  id: string;
  name: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  category: string;
  description: string | null;
  createdAt: Date;
  projectId: string;
  notionPageId: string | null;
  project?: {
    id: string;
    name: string;
    tier: number;
    notionPageId: string | null;
    client?: {
      user: {
        name: string | null;
        email: string | null;
      };
    };
  };
  uploadedBy?: {
    name: string | null;
    email: string | null;
  };
}

export interface NotionDeliverablePage {
  pageId: string;
  url: string;
}

// ============================================
// CONFIGURATION
// ============================================

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const NOTION_DELIVERABLES_DATABASE_ID = process.env.NOTION_DELIVERABLES_DATABASE_ID || '';

// Category emoji mapping
const CATEGORY_EMOJI: Record<string, string> = {
  Document: '📄',
  Photo: '📷',
  Drawing: '📐',
  Plan: '🗺️',
  Invoice: '🧾',
  Contract: '📝',
  Report: '📊',
  Presentation: '📽️',
  Video: '🎬',
  Audio: '🎵',
  Archive: '📦',
  Other: '📎',
};

// File type icon mapping
const FILE_TYPE_EMOJI: Record<string, string> = {
  'application/pdf': '📕',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
  'application/zip': '📦',
  'application/x-rar-compressed': '📦',
  'video/mp4': '🎬',
  'video/quicktime': '🎬',
  'audio/mpeg': '🎵',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📽️',
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
  return Boolean(NOTION_API_KEY && NOTION_DELIVERABLES_DATABASE_ID);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toUpperCase() || '';
  return ext;
}

function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] || CATEGORY_EMOJI['Other'];
}

function getFileTypeEmoji(mimeType: string): string {
  return FILE_TYPE_EMOJI[mimeType] || '📎';
}

function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

// ============================================
// DELIVERABLE SYNC FUNCTIONS
// ============================================

/**
 * Create a new Notion page for a deliverable
 */
export async function createNotionDeliverablePage(
  deliverable: DeliverableSyncData
): Promise<NotionDeliverablePage> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion not configured, skipping deliverable creation');
    throw new Error('Notion is not configured');
  }

  const notion = getNotionClient();

  const categoryEmoji = getCategoryEmoji(deliverable.category);
  const fileTypeEmoji = getFileTypeEmoji(deliverable.fileType);
  const fileExtension = getFileExtension(deliverable.name);
  const fileSize = formatFileSize(deliverable.fileSize);

  // Build page properties
  const properties: Record<string, any> = {
    // Title property (required)
    Name: {
      title: [
        {
          text: {
            content: deliverable.name,
          },
        },
      ],
    },
    // Category
    Category: {
      select: {
        name: deliverable.category,
      },
    },
    // File Type
    'File Type': {
      rich_text: [
        {
          text: {
            content: fileExtension,
          },
        },
      ],
    },
    // File Size
    'File Size': {
      rich_text: [
        {
          text: {
            content: fileSize,
          },
        },
      ],
    },
    // Project Name
    Project: {
      rich_text: [
        {
          text: {
            content: deliverable.project?.name || 'Unknown Project',
          },
        },
      ],
    },
    // Client Name
    Client: {
      rich_text: [
        {
          text: {
            content: deliverable.project?.client?.user?.name ||
                     deliverable.project?.client?.user?.email ||
                     'Unknown Client',
          },
        },
      ],
    },
    // Upload Date
    'Uploaded At': {
      date: {
        start: deliverable.createdAt.toISOString(),
      },
    },
    // Uploaded By
    'Uploaded By': {
      rich_text: [
        {
          text: {
            content: deliverable.uploadedBy?.name ||
                     deliverable.uploadedBy?.email ||
                     'System',
          },
        },
      ],
    },
    // Internal ID
    'Internal ID': {
      rich_text: [
        {
          text: {
            content: deliverable.id,
          },
        },
      ],
    },
    // Download URL
    'Download URL': {
      url: deliverable.fileUrl,
    },
  };

  // Build page content
  const children: any[] = [];

  // Header callout with file info
  children.push({
    object: 'block',
    type: 'callout',
    callout: {
      icon: { emoji: categoryEmoji },
      rich_text: [
        {
          type: 'text',
          text: {
            content: `${deliverable.category} • ${fileExtension} • ${fileSize}`,
          },
        },
      ],
      color: 'gray_background',
    },
  });

  // Description if present
  if (deliverable.description) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: deliverable.description,
            },
          },
        ],
      },
    });
  }

  // Divider
  children.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  // Preview section for images
  if (isImageType(deliverable.fileType)) {
    children.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Preview' } }],
      },
    });

    children.push({
      object: 'block',
      type: 'image',
      image: {
        type: 'external',
        external: {
          url: deliverable.fileUrl,
        },
      },
    });

    children.push({
      object: 'block',
      type: 'divider',
      divider: {},
    });
  }

  // Download button
  children.push({
    object: 'block',
    type: 'heading_3',
    heading_3: {
      rich_text: [{ type: 'text', text: { content: 'Download' } }],
    },
  });

  children.push({
    object: 'block',
    type: 'bookmark',
    bookmark: {
      url: deliverable.fileUrl,
    },
  });

  // Project link if available
  if (deliverable.project?.notionPageId) {
    children.push({
      object: 'block',
      type: 'divider',
      divider: {},
    });

    children.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Related Project' } }],
      },
    });

    children.push({
      object: 'block',
      type: 'link_to_page',
      link_to_page: {
        type: 'page_id',
        page_id: deliverable.project.notionPageId,
      },
    });
  }

  // Metadata section
  children.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  children.push({
    object: 'block',
    type: 'heading_3',
    heading_3: {
      rich_text: [{ type: 'text', text: { content: 'Metadata' } }],
    },
  });

  children.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: { content: 'File Path: ' },
          annotations: { bold: true },
        },
        {
          type: 'text',
          text: { content: deliverable.filePath },
          annotations: { code: true },
        },
      ],
    },
  });

  children.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: { content: 'MIME Type: ' },
          annotations: { bold: true },
        },
        {
          type: 'text',
          text: { content: deliverable.fileType },
          annotations: { code: true },
        },
      ],
    },
  });

  children.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: { content: 'Internal ID: ' },
          annotations: { bold: true },
        },
        {
          type: 'text',
          text: { content: deliverable.id },
          annotations: { code: true },
        },
      ],
    },
  });

  // Create the page
  const response = await notion.pages.create({
    parent: {
      database_id: NOTION_DELIVERABLES_DATABASE_ID,
    },
    icon: {
      type: 'emoji' as const,
      emoji: fileTypeEmoji as any,
    },
    properties,
    children,
  });

  console.log(`[NotionSync] Created Notion page for deliverable ${deliverable.id}: ${response.id}`);

  return {
    pageId: response.id,
    url: (response as any).url || `https://notion.so/${response.id.replace(/-/g, '')}`,
  };
}

/**
 * Update an existing Notion page for a deliverable
 */
export async function updateNotionDeliverablePage(
  deliverable: DeliverableSyncData,
  notionPageId: string
): Promise<void> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion not configured, skipping deliverable update');
    throw new Error('Notion is not configured');
  }

  const notion = getNotionClient();

  const fileExtension = getFileExtension(deliverable.name);
  const fileSize = formatFileSize(deliverable.fileSize);

  // Update properties
  const properties: Record<string, any> = {
    Name: {
      title: [
        {
          text: {
            content: deliverable.name,
          },
        },
      ],
    },
    Category: {
      select: {
        name: deliverable.category,
      },
    },
    'File Type': {
      rich_text: [
        {
          text: {
            content: fileExtension,
          },
        },
      ],
    },
    'File Size': {
      rich_text: [
        {
          text: {
            content: fileSize,
          },
        },
      ],
    },
    'Download URL': {
      url: deliverable.fileUrl,
    },
  };

  await notion.pages.update({
    page_id: notionPageId,
    properties,
  });

  console.log(`[NotionSync] Updated Notion page for deliverable ${deliverable.id}: ${notionPageId}`);
}

/**
 * Archive a Notion page for a deleted deliverable
 */
export async function archiveNotionDeliverablePage(notionPageId: string): Promise<void> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion not configured, skipping deliverable archive');
    throw new Error('Notion is not configured');
  }

  const notion = getNotionClient();

  await notion.pages.update({
    page_id: notionPageId,
    archived: true,
  });

  console.log(`[NotionSync] Archived Notion deliverable page: ${notionPageId}`);
}

/**
 * Add a link to a deliverable in the project page
 */
export async function linkDeliverableToProjectPage(
  projectNotionPageId: string,
  deliverableNotionPageId: string,
  deliverableName: string
): Promise<void> {
  if (!isNotionConfigured()) {
    return;
  }

  const notion = getNotionClient();

  // Find the Deliverables section in the project page
  const blocks = await notion.blocks.children.list({
    block_id: projectNotionPageId,
    page_size: 100,
  });

  let deliverablesHeadingId: string | null = null;
  let lastBlockInSection: string | null = null;
  let inDeliverablesSection = false;

  for (const block of blocks.results as any[]) {
    if (block.type === 'heading_2') {
      const text = block.heading_2?.rich_text?.[0]?.plain_text || '';
      if (text === 'Deliverables') {
        deliverablesHeadingId = block.id;
        inDeliverablesSection = true;
        continue;
      } else if (inDeliverablesSection) {
        break;
      }
    }

    if (inDeliverablesSection) {
      // Skip the placeholder paragraph
      if (block.type === 'paragraph') {
        const text = block.paragraph?.rich_text?.[0]?.plain_text || '';
        if (text.includes('Deliverables will appear here')) {
          // Delete the placeholder
          await notion.blocks.delete({ block_id: block.id });
          continue;
        }
      }
      lastBlockInSection = block.id;
    }

    if (inDeliverablesSection && block.type === 'divider') {
      break;
    }
  }

  if (!deliverablesHeadingId) {
    console.log('[NotionSync] Deliverables section not found in project page');
    return;
  }

  // Add link to deliverable page
  const afterBlockId = lastBlockInSection || deliverablesHeadingId;

  await notion.blocks.children.append({
    block_id: projectNotionPageId,
    children: [
      {
        object: 'block',
        type: 'link_to_page',
        link_to_page: {
          type: 'page_id',
          page_id: deliverableNotionPageId,
        },
      },
    ],
    after: afterBlockId,
  } as any);

  console.log(`[NotionSync] Linked deliverable to project page`);
}

// ============================================
// SYNC TRIGGERS
// ============================================

/**
 * Sync a deliverable to Notion
 * Called by the sync queue processor
 */
export async function syncDeliverableToNotion(
  deliverableId: string,
  operation: SyncOperation
): Promise<string | undefined> {
  // Fetch deliverable with related data
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          tier: true,
          notionPageId: true,
          client: {
            select: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      uploadedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!deliverable) {
    throw new Error(`Deliverable not found: ${deliverableId}`);
  }

  const syncData: DeliverableSyncData = {
    id: deliverable.id,
    name: deliverable.name,
    filePath: deliverable.filePath,
    fileUrl: deliverable.fileUrl,
    fileSize: deliverable.fileSize,
    fileType: deliverable.fileType,
    category: deliverable.category,
    description: deliverable.description,
    createdAt: deliverable.createdAt,
    projectId: deliverable.projectId,
    notionPageId: deliverable.notionPageId,
    project: deliverable.project ? {
      id: deliverable.project.id,
      name: deliverable.project.name,
      tier: deliverable.project.tier,
      notionPageId: deliverable.project.notionPageId,
      client: deliverable.project.client ? {
        user: deliverable.project.client.user,
      } : undefined,
    } : undefined,
    uploadedBy: deliverable.uploadedBy,
  };

  switch (operation) {
    case 'CREATE': {
      const result = await createNotionDeliverablePage(syncData);

      // Link to project page if available
      if (syncData.project?.notionPageId) {
        try {
          await linkDeliverableToProjectPage(
            syncData.project.notionPageId,
            result.pageId,
            syncData.name
          );
        } catch (error) {
          console.error('[NotionSync] Failed to link deliverable to project:', error);
        }
      }

      return result.pageId;
    }

    case 'UPDATE': {
      if (deliverable.notionPageId) {
        await updateNotionDeliverablePage(syncData, deliverable.notionPageId);
        return deliverable.notionPageId;
      } else {
        // No existing page, create one
        const result = await createNotionDeliverablePage(syncData);
        return result.pageId;
      }
    }

    case 'DELETE': {
      if (deliverable.notionPageId) {
        await archiveNotionDeliverablePage(deliverable.notionPageId);
        return deliverable.notionPageId;
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
 * Queue a deliverable for sync after upload
 */
export async function onDeliverableCreated(deliverableId: string): Promise<void> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion not configured, skipping deliverable sync');
    return;
  }

  await queueDeliverableSync(deliverableId, 'CREATE');
  console.log(`[NotionSync] Queued CREATE sync for deliverable ${deliverableId}`);
}

/**
 * Queue a deliverable for sync after update
 */
export async function onDeliverableUpdated(deliverableId: string): Promise<void> {
  if (!isNotionConfigured()) {
    return;
  }

  await queueDeliverableSync(deliverableId, 'UPDATE');
  console.log(`[NotionSync] Queued UPDATE sync for deliverable ${deliverableId}`);
}

/**
 * Queue a deliverable for sync after deletion
 */
export async function onDeliverableDeleted(deliverableId: string): Promise<void> {
  if (!isNotionConfigured()) {
    return;
  }

  await queueDeliverableSync(deliverableId, 'DELETE');
  console.log(`[NotionSync] Queued DELETE sync for deliverable ${deliverableId}`);
}

export default {
  createNotionDeliverablePage,
  updateNotionDeliverablePage,
  archiveNotionDeliverablePage,
  linkDeliverableToProjectPage,
  syncDeliverableToNotion,
  onDeliverableCreated,
  onDeliverableUpdated,
  onDeliverableDeleted,
  isNotionConfigured,
};
