# Hybrid Data Architecture: Postgres + Notion

**Last Updated:** 2024-12-28  
**Status:** Design Phase

---

## Overview

SAGE MVP uses a **hybrid data architecture** combining Supabase Postgres (transactional data) and Notion (display/collaboration layer).

**Core Principle:** Postgres is the source of truth. Notion is synced from Postgres for rich content display and team collaboration.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Actions                          │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│  Supabase        │          │  Notion            │
│  Postgres        │          │  (Display Layer)   │
│                  │          │                    │
│  Source of Truth │          │  Rich Content      │
│  - Leads         │          │  - Project Pages   │
│  - Users         │          │  - Deliverables    │
│  - Projects      │          │  - Team Workspace  │
│  - Payments      │          │  - Kanban Boards   │
│  - Milestones    │          │                    │
└──────────────────┘          └──────────────────┘
          │                               │
          │                               │
          └───────────┬───────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Sync Service    │
            │  (Postgres →     │
            │   Notion)        │
            └──────────────────┘
```

---

## Data Location Matrix

| Data Type | Postgres | Notion | Sync Direction | Sync Trigger |
|-----------|----------|--------|----------------|--------------|
| **Leads** | ✅ Primary | ⚠️ Optional summary | Postgres → Notion | On lead creation |
| **Users** | ✅ Primary | ❌ No | N/A | N/A |
| **Clients** | ✅ Primary | ⚠️ Optional summary | Postgres → Notion | On client creation |
| **Projects** | ✅ Primary (metadata) | ✅ Display (rich content) | Postgres → Notion | On project create/update |
| **Payments** | ✅ Primary | ❌ No | N/A | N/A |
| **Milestones** | ✅ Primary | ✅ Display | Postgres → Notion | On milestone update |
| **Deliverables** | ✅ Primary (metadata) | ✅ Display (showcase) | Postgres → Notion | On deliverable upload |
| **Project Content** | ❌ No | ✅ Primary | Notion → Postgres | Manual (team updates) |
| **Team Tasks** | ❌ No | ✅ Primary | Notion → Postgres | Manual (task completion) |
| **Client Messages** | ⚠️ Optional | ✅ Primary | Notion → Postgres | Manual (message sent) |

**Legend:**
- ✅ Primary = Main storage location
- ⚠️ Optional = Synced for visibility, not required
- ❌ No = Not stored here

---

## Postgres Tables (Supabase)

### Core Tables

#### `users`
**Purpose:** Authentication and user profiles

**Columns:**
- `id` (uuid, primary key)
- `email` (text, unique, nullable for KAA users)
- `address` (text, nullable for SAGE users)
- `password_hash` (text)
- `user_type` (enum: 'kaa_client', 'sage_client', 'team', 'admin')
- `tier` (integer, nullable - 1, 2, 3, or 4)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `last_login` (timestamp, nullable)

#### `clients`
**Purpose:** Client metadata and tier assignment

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → users.id)
- `tier` (integer, not null - 1, 2, 3, or 4)
- `status` (enum: 'onboarding', 'active', 'completed', 'closed')
- `project_address` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `leads`
**Purpose:** Intake form submissions

**Columns:**
- `id` (uuid, primary key)
- `email` (text, not null)
- `name` (text)
- `project_address` (text, not null)
- `budget_range` (text)
- `timeline` (text)
- `project_type` (text)
- `has_survey` (boolean)
- `has_drawings` (boolean)
- `recommended_tier` (integer, not null - 1, 2, 3, or 4)
- `routing_reason` (text) - Why this tier was recommended
- `status` (enum: 'new', 'qualified', 'needs_review', 'closed')
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `projects`
**Purpose:** Project metadata and status

**Columns:**
- `id` (uuid, primary key)
- `client_id` (uuid, foreign key → clients.id)
- `lead_id` (uuid, foreign key → leads.id, nullable)
- `tier` (integer, not null)
- `status` (enum: 'onboarding', 'in_progress', 'awaiting_feedback', 'revisions', 'delivered', 'closed')
- `name` (text)
- `notion_page_id` (text, nullable) - Link to Notion project page
- `payment_status` (enum: 'pending', 'paid', 'refunded')
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `tiers`
**Purpose:** Tier definitions and pricing

**Columns:**
- `id` (integer, primary key) - 1, 2, 3, or 4
- `name` (text) - "The Concept", "The Builder", "The Concierge", "KAA White Glove"
- `description` (text)
- `stripe_product_id` (text, nullable)
- `stripe_price_id` (text, nullable)
- `features` (jsonb) - Array of feature names
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `milestones`
**Purpose:** Per-tier milestone tracking

**Columns:**
- `id` (uuid, primary key)
- `project_id` (uuid, foreign key → projects.id)
- `tier` (integer, not null)
- `name` (text) - "Intake", "Concept", "Draft", "Review", etc.
- `order` (integer) - Display order
- `status` (enum: 'pending', 'in_progress', 'completed')
- `due_date` (timestamp, nullable)
- `completed_at` (timestamp, nullable)
- `created_at` (timestamp)

#### `payments`
**Purpose:** Stripe payment records

**Columns:**
- `id` (uuid, primary key)
- `project_id` (uuid, foreign key → projects.id)
- `stripe_payment_intent_id` (text, unique)
- `stripe_customer_id` (text)
- `amount` (integer) - Amount in cents
- `currency` (text, default: 'usd')
- `status` (enum: 'pending', 'succeeded', 'failed', 'refunded')
- `tier` (integer, not null)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `deliverables`
**Purpose:** File metadata and storage references

**Columns:**
- `id` (uuid, primary key)
- `project_id` (uuid, foreign key → projects.id)
- `name` (text)
- `file_path` (text) - Supabase Storage path
- `file_url` (text) - Public URL
- `file_size` (integer) - Bytes
- `file_type` (text) - MIME type
- `category` (text) - "Document", "Photo", "Invoice", etc.
- `description` (text, nullable)
- `notion_page_id` (text, nullable) - Link to Notion showcase page
- `uploaded_by` (uuid, foreign key → users.id)
- `created_at` (timestamp)

#### `audit_log`
**Purpose:** System activity and security logs

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → users.id, nullable)
- `action` (text) - "login", "upload", "payment", etc.
- `resource_type` (text) - "project", "deliverable", "payment", etc.
- `resource_id` (uuid, nullable)
- `details` (jsonb) - Additional context
- `ip_address` (text, nullable)
- `created_at` (timestamp)

---

## Notion Structure

### Project Pages
**Purpose:** Rich content, design briefs, client communications

**Properties (synced from Postgres):**
- Title: Project name
- Client: Relation to client database
- Tier: Select (Tier 1, 2, 3, or 4)
- Status: Select (synced from Postgres)
- Payment Status: Select (synced from Postgres)
- Created Date: Date (synced from Postgres)

**Content:**
- Rich text content (design briefs, notes)
- Embedded files and images
- Client communication threads
- Team collaboration notes

### Deliverable Showcase Pages
**Purpose:** Visual presentation of deliverables

**Properties (synced from Postgres):**
- Title: Deliverable name
- Project: Relation to project page
- Category: Select
- Upload Date: Date
- File URL: URL (Supabase Storage)

**Content:**
- Embedded file previews
- Visual galleries
- Client-facing presentation

### Team Workspace
**Purpose:** Kanban boards, task tracking

**Structure:**
- Existing Notion workspace
- Kanban boards per tier
- Task tracking
- Team collaboration

**Sync:**
- Manual updates (team marks tasks complete)
- Optional: Sync task completion back to Postgres

---

## Sync Mechanism

### Postgres → Notion Sync

**When to Sync:**
1. **Project Created** → Create Notion project page
2. **Project Updated** → Update Notion page properties
3. **Milestone Updated** → Update milestone status in Notion
4. **Deliverable Uploaded** → Create Notion showcase page
5. **Payment Received** → Update project payment status in Notion

**Implementation:**
- Backend service function: `syncToNotion(resourceType, resourceId)`
- Called after Postgres write operations
- Handles errors gracefully (log but don't fail main operation)

**Example Flow:**
```javascript
// After creating project in Postgres
const project = await supabase.from('projects').insert({...});

// Sync to Notion
await syncToNotion('project', project.id, {
  name: project.name,
  tier: project.tier,
  status: project.status
});
```

### Notion → Postgres Sync

**When to Sync:**
1. **Task Completed** (optional) → Update milestone status in Postgres
2. **Manual Updates** → Team marks project complete in Notion → Update Postgres

**Implementation:**
- Manual trigger (admin action)
- Or webhook from Notion (if configured)
- Less frequent than Postgres → Notion

---

## Access Control

### Postgres (Supabase RLS)

**Policies:**
- **Clients:** Can only read their own projects, deliverables, milestones
- **Team:** Can read all projects, can write to all projects
- **Admin:** Full access

**Implementation:**
- Row Level Security (RLS) enabled on all tables
- Policies based on `user_id` and `client_id`
- Service role key bypasses RLS (backend only)

### Notion

**Access:**
- Team: Full access to all pages
- Clients: Shared pages only (via Notion sharing)
- Public: None (all pages private)

---

## Migration Strategy

### Phase 1: Set Up Postgres
1. Create Supabase project
2. Run migrations to create tables
3. Set up RLS policies
4. Test connection

### Phase 2: Migrate Existing Data
1. Export existing Notion data (if any)
2. Import to Postgres
3. Verify data integrity

### Phase 3: Implement Sync
1. Build sync service functions
2. Test Postgres → Notion sync
3. Handle errors gracefully

### Phase 4: Update Application
1. Update API endpoints to use Postgres
2. Keep Notion API for display/collaboration
3. Add sync calls after Postgres writes

---

## Benefits of Hybrid Approach

**Postgres Benefits:**
- ✅ ACID transactions (critical for payments)
- ✅ Complex queries and joins
- ✅ Better performance for transactional operations
- ✅ Row Level Security
- ✅ Real-time subscriptions (if needed)

**Notion Benefits:**
- ✅ Rich content editing (no custom editor needed)
- ✅ Team collaboration (existing workflows)
- ✅ Visual presentation (better than raw data)
- ✅ Kanban boards (no custom UI needed)
- ✅ Client-facing pages (professional presentation)

**Combined:**
- ✅ Best of both worlds
- ✅ Postgres handles transactions, Notion handles presentation
- ✅ Team can work in familiar Notion environment
- ✅ System has reliable transactional layer

---

## Future Considerations

**Potential Optimizations:**
- Cache Notion API responses
- Batch sync operations
- Background sync jobs (queue system)
- Conflict resolution (if Notion and Postgres diverge)

**Potential Migrations:**
- Move more data to Postgres if Notion becomes bottleneck
- Keep Notion for display/collaboration only
- Consider Notion API v2 for better sync capabilities
