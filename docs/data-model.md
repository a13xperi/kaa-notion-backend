# SAGE MVP - Data Model

**Last Updated:** 2024-12-28  
**Status:** Design Phase

---

## Overview

This document defines the complete data model for the SAGE MVP platform, including entity relationships, schemas, and data flow.

**Database:** Supabase Postgres (source of truth)  
**Display Layer:** Notion (synced from Postgres)

---

## Entity Relationship Diagram

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1:1
     │
┌────▼─────┐      ┌──────────┐
│ Client   │──────│  Lead    │
└────┬─────┘ 1:N  └──────────┘
     │
     │ 1:N
     │
┌────▼─────┐
│ Project  │
└────┬─────┘
     │
     ├─── 1:N ───┐
     │           │
┌────▼─────┐ ┌───▼──────┐ ┌──────────┐ ┌──────────┐
│Milestone│ │Deliverable│ │ Payment  │ │ AuditLog │
└─────────┘ └───────────┘ └──────────┘ └──────────┘
     │
     │ N:1
     │
┌────▼─────┐
│  Tier    │
└──────────┘
```

---

## Core Entities

### User

**Purpose:** Authentication and user profiles

**Table:** `users`

**Fields:**
- `id` (uuid, PK)
- `email` (text, unique, nullable) - For SAGE clients
- `address` (text, nullable) - For KAA clients (address-based auth)
- `password_hash` (text, required)
- `user_type` (enum, required) - 'KAA_CLIENT', 'SAGE_CLIENT', 'TEAM', 'ADMIN'
- `tier` (integer, nullable) - 1, 2, 3, or 4
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `last_login` (timestamp, nullable)

**Relations:**
- 1:1 → `Client`
- 1:N → `AuditLog`
- 1:N → `Deliverable` (uploaded_by)

**Indexes:**
- `email` (unique)
- `address` (for KAA clients)

**Notes:**
- KAA clients use `address` for auth (no email required)
- SAGE clients use `email` for auth
- Team/admin users have `user_type` = 'TEAM' or 'ADMIN'

---

### Client

**Purpose:** Client metadata and tier assignment

**Table:** `clients`

**Fields:**
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id, unique)
- `tier` (integer, required) - 1, 2, 3, or 4
- `status` (enum, required) - 'ONBOARDING', 'ACTIVE', 'COMPLETED', 'CLOSED'
- `project_address` (text, required)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Relations:**
- N:1 → `User`
- 1:N → `Project`
- 1:N → `Lead`

**Indexes:**
- `user_id` (unique)
- `tier`

**Notes:**
- One user = one client (1:1 relationship)
- Tier is required (determines features and pricing)
- Status tracks client lifecycle

---

### Lead

**Purpose:** Intake form submissions

**Table:** `leads`

**Fields:**
- `id` (uuid, PK)
- `email` (text, required)
- `name` (text, nullable)
- `project_address` (text, required)
- `budget_range` (text, nullable) - "$X-$Y", "$Y-$Z", etc.
- `timeline` (text, nullable) - "2-4 weeks", "4-8 weeks", etc.
- `project_type` (text, nullable) - "renovation", "addition", "new_build", etc.
- `has_survey` (boolean, default: false)
- `has_drawings` (boolean, default: false)
- `recommended_tier` (integer, required) - 1, 2, 3, or 4
- `routing_reason` (text, nullable) - Why this tier was recommended
- `status` (enum, required) - 'NEW', 'QUALIFIED', 'NEEDS_REVIEW', 'CLOSED'
- `client_id` (uuid, FK → clients.id, nullable) - Set when lead converts
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Relations:**
- N:1 → `Client` (optional, set when lead converts)
- 1:N → `Project`

**Indexes:**
- `email`
- `status`
- `recommended_tier`

**Notes:**
- Lead is created from intake form
- Tier router recommends tier based on criteria
- Lead converts to client when payment received
- `client_id` links lead to client after conversion

---

### Project

**Purpose:** Project metadata and status

**Table:** `projects`

**Fields:**
- `id` (uuid, PK)
- `client_id` (uuid, FK → clients.id, required)
- `lead_id` (uuid, FK → leads.id, nullable) - Original lead
- `tier` (integer, required) - 1, 2, 3, or 4
- `status` (enum, required) - 'ONBOARDING', 'IN_PROGRESS', 'AWAITING_FEEDBACK', 'REVISIONS', 'DELIVERED', 'CLOSED'
- `name` (text, required)
- `notion_page_id` (text, nullable) - Link to Notion project page
- `payment_status` (text, required, default: 'pending') - 'pending', 'paid', 'refunded'
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Relations:**
- N:1 → `Client`
- N:1 → `Lead` (optional)
- 1:N → `Milestone`
- 1:N → `Payment`
- 1:N → `Deliverable`

**Indexes:**
- `client_id`
- `tier`
- `status`

**Notes:**
- Project created after payment received
- `notion_page_id` links to Notion for display/collaboration
- Status tracks project lifecycle
- Payment status determines portal access

---

### Tier

**Purpose:** Tier definitions and pricing

**Table:** `tiers`

**Fields:**
- `id` (integer, PK) - 1, 2, 3, or 4
- `name` (text, required) - "The Concept", "The Builder", "The Concierge", "KAA White Glove"
- `description` (text, nullable)
- `stripe_product_id` (text, nullable) - Stripe product ID
- `stripe_price_id` (text, nullable) - Stripe price ID
- `features` (jsonb, nullable) - Array of feature names
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Relations:**
- Referenced by `Client.tier`, `Project.tier`, `Lead.recommended_tier`

**Notes:**
- Static data (tiers don't change often)
- Stripe IDs link to Stripe products/prices
- Features stored as JSON array

---

### Milestone

**Purpose:** Per-tier milestone tracking

**Table:** `milestones`

**Fields:**
- `id` (uuid, PK)
- `project_id` (uuid, FK → projects.id, required)
- `tier` (integer, required) - Which tier this milestone belongs to
- `name` (text, required) - "Intake", "Concept", "Draft", "Review", etc.
- `order` (integer, required) - Display order
- `status` (enum, required) - 'PENDING', 'IN_PROGRESS', 'COMPLETED'
- `due_date` (timestamp, nullable)
- `completed_at` (timestamp, nullable)
- `created_at` (timestamp)

**Relations:**
- N:1 → `Project`

**Indexes:**
- `project_id`
- `tier`

**Notes:**
- Milestones vary by tier
- Tier 1: Intake → Concept → Delivery
- Tier 2: Intake → Draft → Review → Revisions → Final
- Tier 3: Deposit → Site Visit → Draft → Review → Final
- Order determines display sequence

---

### Payment

**Purpose:** Stripe payment records

**Table:** `payments`

**Fields:**
- `id` (uuid, PK)
- `project_id` (uuid, FK → projects.id, required)
- `stripe_payment_intent_id` (text, unique, required)
- `stripe_customer_id` (text, required)
- `amount` (integer, required) - Amount in cents
- `currency` (text, default: 'usd')
- `status` (enum, required) - 'PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'
- `tier` (integer, required) - Which tier was purchased
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Relations:**
- N:1 → `Project`

**Indexes:**
- `project_id`
- `stripe_payment_intent_id` (unique)
- `stripe_customer_id`

**Notes:**
- One payment per project (for MVP)
- Future: Support multiple payments (deposits, installments)
- Status synced from Stripe webhooks
- Never store full payment details (use Stripe IDs)

---

### Deliverable

**Purpose:** File metadata and storage references

**Table:** `deliverables`

**Fields:**
- `id` (uuid, PK)
- `project_id` (uuid, FK → projects.id, required)
- `name` (text, required)
- `file_path` (text, required) - Supabase Storage path
- `file_url` (text, required) - Public URL
- `file_size` (integer, required) - Bytes
- `file_type` (text, required) - MIME type
- `category` (text, required) - "Document", "Photo", "Invoice", etc.
- `description` (text, nullable)
- `notion_page_id` (text, nullable) - Link to Notion showcase page
- `uploaded_by_id` (uuid, FK → users.id, required)
- `created_at` (timestamp)

**Relations:**
- N:1 → `Project`
- N:1 → `User` (uploaded_by)

**Indexes:**
- `project_id`
- `uploaded_by_id`

**Notes:**
- Files stored in Supabase Storage
- Metadata in Postgres
- `notion_page_id` links to Notion for display
- Category helps organize deliverables

---

### AuditLog

**Purpose:** System activity and security logs

**Table:** `audit_log`

**Fields:**
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id, nullable)
- `action` (text, required) - "login", "upload", "payment", etc.
- `resource_type` (text, nullable) - "project", "deliverable", "payment", etc.
- `resource_id` (uuid, nullable) - UUID of the resource
- `details` (jsonb, nullable) - Additional context
- `ip_address` (text, nullable)
- `created_at` (timestamp)

**Relations:**
- N:1 → `User` (optional, for anonymous actions)

**Indexes:**
- `user_id`
- `action`
- `created_at`

**Notes:**
- Log all important actions
- Useful for security, debugging, analytics
- `details` JSON for flexible logging
- Can be queried for audit trails

---

## Data Flow

### Lead → Client → Project Flow

```
1. Lead Created (from intake form)
   └─> Store in `leads` table
   └─> Run tier router → Set `recommended_tier`
   └─> (Optional) Sync to Notion for team visibility

2. Payment Received (Stripe webhook)
   └─> Create `User` (if doesn't exist)
   └─> Create `Client` (link to user)
   └─> Update `Lead.client_id` (link lead to client)
   └─> Create `Project` (link to client)
   └─> Create `Payment` record
   └─> Sync project to Notion (create project page)

3. Project Active
   └─> Create `Milestone` records (based on tier)
   └─> Team uploads `Deliverable` files
   └─> Sync deliverables to Notion (create showcase pages)
   └─> Update milestone status
   └─> Sync milestone updates to Notion
```

---

## Access Control (RLS Policies)

### Clients
- Can read: Own projects, deliverables, milestones
- Can write: None (read-only portal)
- Cannot see: Other clients' data, payments, audit logs

### Team
- Can read: All projects, deliverables, milestones, leads
- Can write: All projects, deliverables, milestones
- Cannot see: Payment details (unless admin)

### Admin
- Can read: Everything
- Can write: Everything
- Full access to all tables

---

## Notion Sync Mapping

| Postgres Table | Notion Content | Sync Direction |
|----------------|----------------|----------------|
| `projects` | Project Pages | Postgres → Notion |
| `deliverables` | Showcase Pages | Postgres → Notion |
| `milestones` | Project Properties | Postgres → Notion |
| `leads` | CRM Entries (optional) | Postgres → Notion |
| `clients` | Client Database (optional) | Postgres → Notion |

See `docs/sync-strategy.md` for detailed sync implementation.

---

## Indexes & Performance

### Critical Indexes
- `users.email` (unique) - Fast login lookup
- `clients.user_id` (unique) - Fast client lookup
- `projects.client_id` - Fast project listing
- `payments.stripe_payment_intent_id` (unique) - Webhook lookup
- `audit_log.created_at` - Time-based queries

### Query Optimization
- Use indexes for frequently queried columns
- Paginate large result sets
- Cache Notion API responses when appropriate
- Use Supabase Realtime for live updates (if needed)

---

## Migration Notes

### From Notion-Only to Hybrid
1. Export existing Notion data (if any)
2. Create Postgres schema (run Prisma migrations)
3. Import data to Postgres
4. Set up sync service (Postgres → Notion)
5. Update application to use Postgres
6. Keep Notion for display/collaboration

### Data Integrity
- Foreign key constraints ensure referential integrity
- Cascade deletes (e.g., delete project → delete milestones)
- Unique constraints prevent duplicates
- Required fields prevent incomplete data

---

## Future Enhancements

- **Multi-payment support:** Multiple payments per project (deposits, installments)
- **Revision tracking:** Track revision count and history
- **Client feedback:** Store client feedback and satisfaction scores
- **Team assignments:** Assign designers to projects
- **Time tracking:** Track time spent per project/milestone
- **Analytics:** Aggregate data for reporting
