# Postgres ↔ Notion Sync Strategy

**Last Updated:** 2024-12-28  
**Status:** Design Phase

---

## Overview

This document defines how data flows between Supabase Postgres (source of truth) and Notion (display/collaboration layer).

**Core Principle:** Postgres is always the source of truth. Notion is synced from Postgres for display and collaboration.

---

## Sync Direction: Postgres → Notion

### When Sync Happens

**Automatic Sync (After Postgres Write):**
1. **Project Created** → Create Notion project page
2. **Project Updated** → Update Notion page properties
3. **Milestone Updated** → Update milestone status in Notion
4. **Deliverable Uploaded** → Create Notion showcase page
5. **Payment Received** → Update project payment status in Notion
6. **Lead Created** → (Optional) Create Notion CRM entry

**Manual Sync (On Demand):**
- Admin can trigger sync for specific resources
- Useful for recovery or initial setup

---

## Sync Implementation

### Backend Service Function

**Location:** `notion-api-server-enhanced.js` or separate `sync-service.js`

**Function Signature:**
```javascript
async function syncToNotion(resourceType, resourceId, data) {
  // resourceType: 'project', 'deliverable', 'milestone', 'lead'
  // resourceId: UUID from Postgres
  // data: Resource data to sync
}
```

### Sync Functions by Resource Type

#### 1. Project Sync

**Trigger:** After project created/updated in Postgres

**Action:**
- Create or update Notion project page
- Set properties: name, tier, status, payment_status
- Link to client page (if exists)
- Create rich content structure

**Example:**
```javascript
async function syncProjectToNotion(projectId) {
  const project = await supabase
    .from('projects')
    .select('*, clients(*), tiers(*)')
    .eq('id', projectId)
    .single();

  const notionPage = await notion.pages.create({
    parent: { database_id: PROJECTS_DB_ID },
    properties: {
      'Name': { title: [{ text: { content: project.name } }] },
      'Tier': { select: { name: `Tier ${project.tier}` } },
      'Status': { select: { name: project.status } },
      'Payment Status': { select: { name: project.payment_status } },
      'Created': { date: { start: project.created_at } }
    }
  });

  // Store Notion page ID in Postgres
  await supabase
    .from('projects')
    .update({ notion_page_id: notionPage.id })
    .eq('id', projectId);
}
```

#### 2. Deliverable Sync

**Trigger:** After deliverable uploaded to Supabase Storage

**Action:**
- Create Notion showcase page
- Embed file preview
- Link to project page
- Set properties: name, category, upload date

**Example:**
```javascript
async function syncDeliverableToNotion(deliverableId) {
  const deliverable = await supabase
    .from('deliverables')
    .select('*, projects(*)')
    .eq('id', deliverableId)
    .single();

  const notionPage = await notion.pages.create({
    parent: { database_id: DELIVERABLES_DB_ID },
    properties: {
      'Name': { title: [{ text: { content: deliverable.name } }] },
      'Category': { select: { name: deliverable.category } },
      'Project': { relation: [{ id: deliverable.projects.notion_page_id }] },
      'Upload Date': { date: { start: deliverable.created_at } },
      'File URL': { url: deliverable.file_url }
    }
  });

  // Add file block to page
  await notion.blocks.children.append({
    block_id: notionPage.id,
    children: [{
      type: 'file',
      file: {
        type: 'external',
        external: { url: deliverable.file_url }
      }
    }]
  });

  // Store Notion page ID
  await supabase
    .from('deliverables')
    .update({ notion_page_id: notionPage.id })
    .eq('id', deliverableId);
}
```

#### 3. Milestone Sync

**Trigger:** After milestone status updated

**Action:**
- Update milestone status in Notion project page
- Add milestone block or update properties
- Notify team if milestone completed

**Example:**
```javascript
async function syncMilestoneToNotion(milestoneId) {
  const milestone = await supabase
    .from('milestones')
    .select('*, projects(*)')
    .eq('id', milestoneId)
    .single();

  if (!milestone.projects.notion_page_id) return;

  // Update project page with milestone status
  await notion.pages.update({
    page_id: milestone.projects.notion_page_id,
    properties: {
      'Current Milestone': { 
        select: { name: milestone.name } 
      },
      'Milestone Status': {
        select: { name: milestone.status }
      }
    }
  });
}
```

---

## Error Handling

### Sync Failures

**Strategy:** Log error but don't fail main operation

**Example:**
```javascript
async function createProject(projectData) {
  try {
    // 1. Create in Postgres (critical)
    const project = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    // 2. Sync to Notion (non-critical)
    try {
      await syncProjectToNotion(project.id);
    } catch (syncError) {
      logger.error('Notion sync failed (non-critical):', syncError);
      // Continue - project is still created in Postgres
    }

    return project;
  } catch (error) {
    logger.error('Project creation failed:', error);
    throw error;
  }
}
```

### Retry Logic

**For Critical Syncs:**
- Retry up to 3 times with exponential backoff
- Queue failed syncs for later processing
- Alert team if sync consistently fails

**For Non-Critical Syncs:**
- Log and continue
- Manual retry available via admin interface

---

## Sync Direction: Notion → Postgres

### When Sync Happens

**Manual Sync (Team Actions):**
1. **Task Completed in Notion** → Update milestone status in Postgres
2. **Project Status Changed in Notion** → Update project status in Postgres
3. **Manual Trigger** → Admin syncs specific resource

**Implementation:**
- Less frequent than Postgres → Notion
- Usually triggered by team member action
- Optional webhook from Notion (if configured)

### Example: Task Completion Sync

```javascript
async function syncTaskCompletionFromNotion(notionPageId) {
  // Read task status from Notion
  const notionPage = await notion.pages.retrieve({ page_id: notionPageId });
  const status = notionPage.properties.Status?.select?.name;

  // Find corresponding milestone in Postgres
  const milestone = await supabase
    .from('milestones')
    .select('*')
    .eq('notion_page_id', notionPageId)
    .single();

  if (milestone && status === 'Completed') {
    // Update Postgres
    await supabase
      .from('milestones')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', milestone.id);
  }
}
```

---

## Sync Queue System (Future)

**For High-Volume Operations:**

**Implementation:**
- Queue sync jobs in Postgres `sync_queue` table
- Background worker processes queue
- Retry failed syncs
- Monitor queue health

**Schema:**
```sql
CREATE TABLE sync_queue (
  id uuid PRIMARY KEY,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  direction text NOT NULL, -- 'postgres_to_notion' or 'notion_to_postgres'
  status text NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  retry_count integer DEFAULT 0,
  error_message text,
  created_at timestamp DEFAULT now(),
  processed_at timestamp
);
```

---

## Initial Data Migration

### Step 1: Export Existing Data
- Export any existing Notion data (if applicable)
- Export existing KAA App data (if stored in Notion)

### Step 2: Import to Postgres
- Create users, clients, projects in Postgres
- Preserve relationships and IDs where possible

### Step 3: Sync to Notion
- Run sync for all existing projects
- Create Notion pages for display/collaboration
- Link Postgres records to Notion pages

### Step 4: Verify
- Check data integrity
- Verify all relationships
- Test sync in both directions

---

## Monitoring & Alerts

### Metrics to Track
- Sync success rate
- Sync latency (time to complete)
- Failed sync count
- Queue depth (if using queue system)

### Alerts
- Sync failure rate > 10%
- Sync latency > 30 seconds
- Queue depth > 100 items

### Dashboard
- Admin dashboard showing sync status
- Recent sync operations
- Failed syncs requiring attention

---

## Best Practices

1. **Always Write to Postgres First** - Postgres is source of truth
2. **Sync After Write** - Trigger sync immediately after Postgres write
3. **Handle Errors Gracefully** - Don't fail main operation if sync fails
4. **Log Everything** - Track all sync operations for debugging
5. **Idempotent Syncs** - Sync operations should be safe to retry
6. **Monitor Sync Health** - Alert on sync failures or delays

---

## Future Enhancements

- **Real-time Sync** - Use Supabase Realtime + Notion webhooks
- **Bidirectional Sync** - Automatic Notion → Postgres sync
- **Conflict Resolution** - Handle cases where data diverges
- **Batch Sync** - Sync multiple resources at once
- **Incremental Sync** - Only sync changed fields
