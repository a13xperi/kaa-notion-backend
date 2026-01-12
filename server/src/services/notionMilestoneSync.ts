import { Client } from '@notionhq/client';
import { prisma } from '../utils/prisma';
import { queueMilestoneSync, queueProjectSync, SyncOperation } from './notionSyncQueue';

/**
 * Notion Milestone Sync Service
 *
 * Handles syncing milestone status to Notion by updating blocks
 * within the parent project page.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface MilestoneSyncData {
  id: string;
  name: string;
  status: string;
  order: number;
  dueDate: Date | null;
  completedAt: Date | null;
  projectId: string;
  notionBlockId: string | null;
  project?: {
    id: string;
    name: string;
    notionPageId: string | null;
  };
}

// ============================================
// CONFIGURATION
// ============================================

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';

// Status emoji mapping
const STATUS_EMOJI: Record<string, string> = {
  PENDING: '⏳',
  IN_PROGRESS: '🔄',
  COMPLETED: '✅',
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
  return Boolean(NOTION_API_KEY);
}

// ============================================
// MILESTONE SYNC FUNCTIONS
// ============================================

/**
 * Build a to-do block for a milestone
 */
function buildMilestoneBlock(milestone: MilestoneSyncData): any {
  const statusEmoji = STATUS_EMOJI[milestone.status] || '⏳';
  const isCompleted = milestone.status === 'COMPLETED';

  const richText: any[] = [
    {
      type: 'text',
      text: {
        content: `${statusEmoji} ${milestone.name}`,
      },
      annotations: {
        strikethrough: isCompleted,
      },
    },
  ];

  // Add due date if present
  if (milestone.dueDate) {
    richText.push({
      type: 'text',
      text: {
        content: ` (Due: ${new Date(milestone.dueDate).toLocaleDateString()})`,
      },
      annotations: {
        color: isCompleted ? 'gray' : 'default',
      },
    });
  }

  // Add completion date if completed
  if (milestone.completedAt) {
    richText.push({
      type: 'text',
      text: {
        content: ` — Completed ${new Date(milestone.completedAt).toLocaleDateString()}`,
      },
      annotations: {
        color: 'green',
        italic: true,
      },
    });
  }

  return {
    object: 'block',
    type: 'to_do',
    to_do: {
      checked: isCompleted,
      rich_text: richText,
    },
  };
}

/**
 * Find the milestones section in a project page
 * Returns the block ID after which milestones should be added
 */
async function findMilestonesSectionBlock(
  projectPageId: string
): Promise<{ headingBlockId: string | null; existingMilestoneBlockIds: string[] }> {
  const notion = getNotionClient();

  const blocks = await notion.blocks.children.list({
    block_id: projectPageId,
    page_size: 100,
  });

  let headingBlockId: string | null = null;
  let inMilestonesSection = false;
  const existingMilestoneBlockIds: string[] = [];

  for (const block of blocks.results as any[]) {
    // Look for the Milestones heading
    if (block.type === 'heading_2') {
      const text = block.heading_2?.rich_text?.[0]?.plain_text || '';
      if (text === 'Milestones') {
        headingBlockId = block.id;
        inMilestonesSection = true;
        continue;
      } else if (inMilestonesSection) {
        // We've hit the next section, stop collecting
        break;
      }
    }

    // Collect to-do blocks in the milestones section
    if (inMilestonesSection && block.type === 'to_do') {
      existingMilestoneBlockIds.push(block.id);
    }

    // Stop at divider after milestones section
    if (inMilestonesSection && block.type === 'divider') {
      break;
    }
  }

  return { headingBlockId, existingMilestoneBlockIds };
}

/**
 * Update a single milestone block in Notion
 */
export async function updateMilestoneBlock(
  milestone: MilestoneSyncData
): Promise<string | null> {
  if (!isNotionConfigured()) {
    console.log('[NotionSync] Notion not configured, skipping milestone update');
    return null;
  }

  const notion = getNotionClient();

  // If milestone has a block ID, update it
  if (milestone.notionBlockId) {
    try {
      const block = buildMilestoneBlock(milestone);

      await notion.blocks.update({
        block_id: milestone.notionBlockId,
        to_do: block.to_do,
      });

      console.log(`[NotionSync] Updated milestone block ${milestone.notionBlockId}`);
      return milestone.notionBlockId;
    } catch (error) {
      console.error(`[NotionSync] Failed to update milestone block:`, error);
      // Block might have been deleted, fall through to create new one
    }
  }

  // Need to create a new block - but we need the project's Notion page
  if (!milestone.project?.notionPageId) {
    console.log('[NotionSync] Project has no Notion page, cannot create milestone block');
    return null;
  }

  // Find where to insert the milestone
  const { headingBlockId, existingMilestoneBlockIds } = await findMilestonesSectionBlock(
    milestone.project.notionPageId
  );

  if (!headingBlockId) {
    console.log('[NotionSync] Milestones section not found in project page');
    // Trigger a full project sync to recreate the page structure
    await queueProjectSync(milestone.projectId, 'UPDATE');
    return null;
  }

  // Create the new milestone block after the heading or last milestone
  const afterBlockId = existingMilestoneBlockIds.length > 0
    ? existingMilestoneBlockIds[existingMilestoneBlockIds.length - 1]
    : headingBlockId;

  const block = buildMilestoneBlock(milestone);

  const response = await notion.blocks.children.append({
    block_id: milestone.project.notionPageId,
    children: [block],
    after: afterBlockId,
  } as any);

  const newBlockId = (response.results[0] as any)?.id;
  console.log(`[NotionSync] Created milestone block ${newBlockId}`);

  return newBlockId;
}

/**
 * Delete a milestone block from Notion
 */
export async function deleteMilestoneBlock(notionBlockId: string): Promise<void> {
  if (!isNotionConfigured()) {
    return;
  }

  const notion = getNotionClient();

  try {
    await notion.blocks.delete({
      block_id: notionBlockId,
    });
    console.log(`[NotionSync] Deleted milestone block ${notionBlockId}`);
  } catch (error) {
    console.error(`[NotionSync] Failed to delete milestone block:`, error);
  }
}

/**
 * Sync all milestones for a project
 * Used when recreating or fully syncing a project page
 */
export async function syncAllMilestonesForProject(
  projectId: string,
  projectNotionPageId: string
): Promise<void> {
  if (!isNotionConfigured()) {
    return;
  }

  const notion = getNotionClient();

  // Get all milestones for the project
  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  });

  if (milestones.length === 0) {
    return;
  }

  // Find existing milestone blocks and the section heading
  const { headingBlockId, existingMilestoneBlockIds } = await findMilestonesSectionBlock(
    projectNotionPageId
  );

  // Delete existing milestone blocks (we'll recreate them in order)
  for (const blockId of existingMilestoneBlockIds) {
    try {
      await notion.blocks.delete({ block_id: blockId });
    } catch (error) {
      // Ignore deletion errors
    }
  }

  // If no heading found, we can't add milestones
  if (!headingBlockId) {
    console.log('[NotionSync] Milestones heading not found, skipping milestone sync');
    return;
  }

  // Create milestone blocks in order
  const milestoneBlocks = milestones.map((m: typeof milestones[number]) =>
    buildMilestoneBlock({
      id: m.id,
      name: m.name,
      status: m.status,
      order: m.order,
      dueDate: m.dueDate,
      completedAt: m.completedAt,
      projectId: m.projectId,
      notionBlockId: m.notionBlockId,
    })
  );

  // Append all milestone blocks after the heading
  const response = await notion.blocks.children.append({
    block_id: projectNotionPageId,
    children: milestoneBlocks,
    after: headingBlockId,
  } as any);

  // Update milestone records with their new block IDs
  const newBlockIds = (response.results as any[]).map((r) => r.id);

  for (let i = 0; i < milestones.length; i++) {
    await prisma.milestone.update({
      where: { id: milestones[i].id },
      data: {
        notionBlockId: newBlockIds[i],
        lastSyncedAt: new Date(),
        syncStatus: 'SYNCED',
      },
    });
  }

  console.log(`[NotionSync] Synced ${milestones.length} milestones for project ${projectId}`);
}

// ============================================
// SYNC TRIGGERS
// ============================================

/**
 * Sync a milestone to Notion
 * Called by the sync queue processor
 */
export async function syncMilestoneToNotion(
  milestoneId: string,
  operation: SyncOperation
): Promise<string | undefined> {
  // Fetch milestone with project
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          notionPageId: true,
        },
      },
    },
  });

  if (!milestone) {
    throw new Error(`Milestone not found: ${milestoneId}`);
  }

  const syncData: MilestoneSyncData = {
    id: milestone.id,
    name: milestone.name,
    status: milestone.status,
    order: milestone.order,
    dueDate: milestone.dueDate,
    completedAt: milestone.completedAt,
    projectId: milestone.projectId,
    notionBlockId: milestone.notionBlockId,
    project: milestone.project ? {
      id: milestone.project.id,
      name: milestone.project.name,
      notionPageId: milestone.project.notionPageId,
    } : undefined,
  };

  switch (operation) {
    case 'CREATE':
    case 'UPDATE': {
      const blockId = await updateMilestoneBlock(syncData);

      if (blockId) {
        // Update milestone with block ID
        await prisma.milestone.update({
          where: { id: milestoneId },
          data: {
            notionBlockId: blockId,
            lastSyncedAt: new Date(),
            syncStatus: 'SYNCED',
          },
        });
      }

      return blockId || undefined;
    }

    case 'DELETE': {
      if (milestone.notionBlockId) {
        await deleteMilestoneBlock(milestone.notionBlockId);
      }
      return milestone.notionBlockId || undefined;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

// ============================================
// HELPER FUNCTIONS FOR TRIGGERING SYNC
// ============================================

/**
 * Queue a milestone for sync after status change
 */
export async function onMilestoneStatusChanged(
  milestoneId: string,
  projectId: string
): Promise<void> {
  if (!isNotionConfigured()) {
    return;
  }

  await queueMilestoneSync(milestoneId, 'UPDATE');
  console.log(`[NotionSync] Queued UPDATE sync for milestone ${milestoneId}`);

  // Also update project page (progress may have changed)
  await queueProjectSync(projectId, 'UPDATE');
}

/**
 * Queue a milestone for sync after creation
 */
export async function onMilestoneCreated(milestoneId: string): Promise<void> {
  if (!isNotionConfigured()) {
    return;
  }

  await queueMilestoneSync(milestoneId, 'CREATE');
  console.log(`[NotionSync] Queued CREATE sync for milestone ${milestoneId}`);
}

/**
 * Queue a milestone for sync after deletion
 */
export async function onMilestoneDeleted(
  milestoneId: string,
  notionBlockId: string | null
): Promise<void> {
  if (!isNotionConfigured() || !notionBlockId) {
    return;
  }

  await queueMilestoneSync(milestoneId, 'DELETE');
  console.log(`[NotionSync] Queued DELETE sync for milestone ${milestoneId}`);
}

export default {
  updateMilestoneBlock,
  deleteMilestoneBlock,
  syncAllMilestonesForProject,
  syncMilestoneToNotion,
  onMilestoneStatusChanged,
  onMilestoneCreated,
  onMilestoneDeleted,
  isNotionConfigured,
};
