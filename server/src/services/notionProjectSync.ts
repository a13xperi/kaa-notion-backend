import { Client } from '@notionhq/client';
import { prisma } from '../utils/prisma';
import { SyncOperation } from './notionSyncQueue';

/**
 * Notion Project Sync Service
 *
 * Handles creating and updating Notion pages for projects.
 * Integrates with the notionSyncQueue for queued processing.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface NotionProjectPage {
  pageId: string;
  url: string;
}

export interface ProjectSyncData {
  id: string;
  name: string;
  tier: number;
  status: string;
  projectAddress: string | null;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  client?: {
    id: string;
    tier: number;
    user: {
      id: string;
      email: string | null;
      name: string | null;
    };
  };
  milestones?: Array<{
    id: string;
    name: string;
    status: string;
    order: number;
    dueDate: Date | null;
    completedAt: Date | null;
  }>;
}

// ============================================
// CONFIGURATION
// ============================================

// Notion database IDs - should be set via environment variables
const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const NOTION_PROJECTS_DATABASE_ID = process.env.NOTION_PROJECTS_DATABASE_ID || '';

// Tier display names and colors
const TIER_NAMES: Record<number, string> = {
  1: 'Seedling',
  2: 'Sprout',
  3: 'Canopy',
  4: 'Legacy',
};

const TIER_COLORS: Record<number, string> = {
  1: 'green',
  2: 'blue',
  3: 'purple',
  4: 'yellow',
};

const STATUS_COLORS: Record<string, string> = {
  INTAKE: 'gray',
  ONBOARDING: 'blue',
  IN_PROGRESS: 'yellow',
  AWAITING_FEEDBACK: 'orange',
  REVISIONS: 'pink',
  DELIVERED: 'green',
  CLOSED: 'default',
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
  return Boolean(NOTION_API_KEY && NOTION_PROJECTS_DATABASE_ID);
}

// ============================================
// PROJECT SYNC FUNCTIONS
// ============================================

/**
 * Create a new Notion page for a project
 */
export async function createNotionProjectPage(
  project: ProjectSyncData
): Promise<NotionProjectPage> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion not configured, skipping project creation');
    throw new Error('Notion is not configured');
  }

  const notion = getNotionClient();

  // Calculate progress
  const completedMilestones = project.milestones?.filter(m => m.status === 'COMPLETED').length || 0;
  const totalMilestones = project.milestones?.length || 0;
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Build page properties
  const properties: Record<string, any> = {
    // Title property (required)
    Name: {
      title: [
        {
          text: {
            content: project.name,
          },
        },
      ],
    },
    // Status select
    Status: {
      select: {
        name: project.status,
        color: STATUS_COLORS[project.status] || 'default',
      },
    },
    // Tier select
    Tier: {
      select: {
        name: TIER_NAMES[project.tier] || `Tier ${project.tier}`,
        color: TIER_COLORS[project.tier] || 'default',
      },
    },
    // Progress number
    Progress: {
      number: progress,
    },
    // Payment status
    'Payment Status': {
      select: {
        name: project.paymentStatus,
        color: project.paymentStatus === 'paid' ? 'green' : 'yellow',
      },
    },
    // Project address
    Address: {
      rich_text: [
        {
          text: {
            content: project.projectAddress || 'N/A',
          },
        },
      ],
    },
    // Client name
    Client: {
      rich_text: [
        {
          text: {
            content: project.client?.user?.name || project.client?.user?.email || 'Unknown',
          },
        },
      ],
    },
    // Client email
    'Client Email': {
      email: project.client?.user?.email || null,
    },
    // Created date
    'Created At': {
      date: {
        start: project.createdAt.toISOString(),
      },
    },
    // Internal ID for linking
    'Internal ID': {
      rich_text: [
        {
          text: {
            content: project.id,
          },
        },
      ],
    },
  };

  // Create the page
  const response = await notion.pages.create({
    parent: {
      database_id: NOTION_PROJECTS_DATABASE_ID,
    },
    properties,
    // Add page content with milestones
    children: buildProjectPageContent(project),
  });

  console.log(`[NotionSync] Created Notion page for project ${project.id}: ${response.id}`);

  return {
    pageId: response.id,
    url: (response as any).url || `https://notion.so/${response.id.replace(/-/g, '')}`,
  };
}

/**
 * Update an existing Notion page for a project
 */
export async function updateNotionProjectPage(
  project: ProjectSyncData,
  notionPageId: string
): Promise<void> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion not configured, skipping project update');
    throw new Error('Notion is not configured');
  }

  const notion = getNotionClient();

  // Calculate progress
  const completedMilestones = project.milestones?.filter(m => m.status === 'COMPLETED').length || 0;
  const totalMilestones = project.milestones?.length || 0;
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Update properties
  const properties: Record<string, any> = {
    Name: {
      title: [
        {
          text: {
            content: project.name,
          },
        },
      ],
    },
    Status: {
      select: {
        name: project.status,
      },
    },
    Progress: {
      number: progress,
    },
    'Payment Status': {
      select: {
        name: project.paymentStatus,
      },
    },
  };

  await notion.pages.update({
    page_id: notionPageId,
    properties,
  });

  console.log(`[NotionSync] Updated Notion page for project ${project.id}: ${notionPageId}`);
}

/**
 * Archive a Notion page for a deleted project
 */
export async function archiveNotionProjectPage(notionPageId: string): Promise<void> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion not configured, skipping project archive');
    throw new Error('Notion is not configured');
  }

  const notion = getNotionClient();

  await notion.pages.update({
    page_id: notionPageId,
    archived: true,
  });

  console.log(`[NotionSync] Archived Notion page: ${notionPageId}`);
}

/**
 * Build the page content blocks for a project
 */
function buildProjectPageContent(project: ProjectSyncData): any[] {
  const blocks: any[] = [];

  // Header with project info
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: 'Project Overview' } }],
    },
  });

  // Client info callout
  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      icon: { emoji: '👤' },
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Client: ${project.client?.user?.name || 'Unknown'} (${project.client?.user?.email || 'No email'})`,
          },
        },
      ],
    },
  });

  // Tier info
  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      icon: { emoji: '🌱' },
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Tier: ${TIER_NAMES[project.tier] || `Tier ${project.tier}`}`,
          },
        },
      ],
    },
  });

  // Divider
  blocks.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  // Milestones section
  if (project.milestones && project.milestones.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Milestones' } }],
      },
    });

    // Sort milestones by order
    const sortedMilestones = [...project.milestones].sort((a, b) => a.order - b.order);

    for (const milestone of sortedMilestones) {
      const statusEmoji = milestone.status === 'COMPLETED' ? '✅' :
                          milestone.status === 'IN_PROGRESS' ? '🔄' : '⏳';

      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          checked: milestone.status === 'COMPLETED',
          rich_text: [
            {
              type: 'text',
              text: {
                content: `${statusEmoji} ${milestone.name}`,
              },
            },
            ...(milestone.dueDate ? [{
              type: 'text',
              text: {
                content: ` (Due: ${new Date(milestone.dueDate).toLocaleDateString()})`,
              },
              annotations: { color: 'gray' },
            }] : []),
          ],
        },
      });
    }
  }

  // Divider
  blocks.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  // Deliverables placeholder
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: 'Deliverables' } }],
    },
  });

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: 'Deliverables will appear here as they are added to the project.',
          },
          annotations: { italic: true, color: 'gray' },
        },
      ],
    },
  });

  return blocks;
}

// ============================================
// SYNC TRIGGERS
// ============================================

/**
 * Sync a project to Notion (create or update)
 * Called by the sync queue processor
 */
export async function syncProjectToNotion(
  projectId: string,
  operation: SyncOperation
): Promise<string | undefined> {
  // Fetch project with all related data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      milestones: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const syncData: ProjectSyncData = {
    id: project.id,
    name: project.name,
    tier: project.tier,
    status: project.status,
    projectAddress: project.projectAddress,
    paymentStatus: project.paymentStatus,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    client: project.client ? {
      id: project.client.id,
      tier: project.client.tier,
      user: project.client.user,
    } : undefined,
    milestones: project.milestones.map(m => ({
      id: m.id,
      name: m.name,
      status: m.status,
      order: m.order,
      dueDate: m.dueDate,
      completedAt: m.completedAt,
    })),
  };

  switch (operation) {
    case 'CREATE': {
      const result = await createNotionProjectPage(syncData);
      return result.pageId;
    }

    case 'UPDATE': {
      if (project.notionPageId) {
        await updateNotionProjectPage(syncData, project.notionPageId);
        return project.notionPageId;
      } else {
        // No existing page, create one
        const result = await createNotionProjectPage(syncData);
        return result.pageId;
      }
    }

    case 'DELETE': {
      if (project.notionPageId) {
        await archiveNotionProjectPage(project.notionPageId);
        return project.notionPageId;
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
 * Sync a project after creation
 */
export async function onProjectCreated(projectId: string): Promise<void> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion not configured, skipping project sync');
    return;
  }

  await syncProjectToNotion(projectId, 'CREATE');
  console.log(`[NotionSync] Synced CREATE for project ${projectId}`);
}

/**
 * Sync a project after update
 */
export async function onProjectUpdated(projectId: string): Promise<void> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion not configured, skipping project sync');
    return;
  }

  await syncProjectToNotion(projectId, 'UPDATE');
  console.log(`[NotionSync] Synced UPDATE for project ${projectId}`);
}

/**
 * Sync a project after deletion/archive
 */
export async function onProjectDeleted(projectId: string): Promise<void> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion not configured, skipping project sync');
    return;
  }

  await syncProjectToNotion(projectId, 'DELETE');
  console.log(`[NotionSync] Synced DELETE for project ${projectId}`);
}

/**
 * Sync project when milestone status changes
 */
export async function onMilestoneStatusChanged(
  _milestoneId: string,
  projectId: string
): Promise<void> {
  if (!isNotionConfigured()) {
    return;
  }

  // Update the project page to reflect new milestone status
  await syncProjectToNotion(projectId, 'UPDATE');
  console.log(`[NotionSync] Synced UPDATE for project ${projectId} (milestone changed)`);
}

export default {
  createNotionProjectPage,
  updateNotionProjectPage,
  archiveNotionProjectPage,
  syncProjectToNotion,
  onProjectCreated,
  onProjectUpdated,
  onProjectDeleted,
  onMilestoneStatusChanged,
  isNotionConfigured,
};
