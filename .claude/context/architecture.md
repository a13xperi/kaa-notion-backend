# KAA Notion Backend - Architecture Context

## System Overview
The SAGE MVP Platform uses a hybrid data architecture combining Supabase Postgres (transactional) with Notion (collaboration/display).

## Data Flow

```
Client App (React)
       |
   API Server (Express)
       |
+------+------+
|             |
Supabase    Notion
(Postgres)  (Display)
|             |
+------+------+
       |
  Sync Queue
```

## Why Hybrid?

### Postgres (Supabase) Handles:
- User authentication
- Payment records
- Transactional data
- Real-time subscriptions
- Row-level security
- Complex queries

### Notion Handles:
- Client-facing project views
- Rich content editing
- Team collaboration
- Design presentations
- Meeting notes
- Client communication

## Sync Strategy

### Postgres -> Notion
- Triggered on create/update in Postgres
- Added to sync queue
- Processed async with rate limiting
- Retry on failure (3 attempts)

### Notion -> Postgres (Optional)
- Webhook-based
- Limited to specific properties
- Conflict resolution: Postgres wins

## Key Entities

### User
- Stored in: Postgres
- Auth: Supabase Auth
- Notion: No direct sync

### Project
- Primary: Postgres
- Synced to: Notion page
- Sync: Bidirectional (limited)

### Milestone
- Primary: Postgres
- Synced to: Notion blocks in project page
- Sync: Postgres -> Notion only

### Document
- Metadata: Postgres
- Files: Supabase Storage
- Reference: Notion page links

### Payment
- Stored in: Postgres only
- Source: Stripe webhooks
- No Notion sync (sensitive)

## API Authentication
- JWT tokens via Supabase Auth
- Refresh token rotation
- Role-based access (user, admin)

## Deployment
- Frontend: Vercel (static + edge functions)
- Backend: Vercel (serverless functions)
- Database: Supabase (managed Postgres)
- Storage: Supabase Storage
- Notion: Direct API integration

## Business Context

### Service Tiers
- **SAGE Tier 1 ($299)**: Garden Guide - DIY consultation and guidance
- **SAGE Tier 2 ($1,499)**: Design Package - Custom design plans
- **SAGE Tier 3 ($4,999+)**: Full Service - Complete design-build
- **KAA Tier 4 (Custom)**: Premium - White-glove luxury service (invitation only)

### Data Flow Principle
Postgres is always the source of truth. Notion is the display/collaboration layer that syncs from Postgres.

## File Structure
```
kaa-notion-backend/
+-- kaa-app/                 # React frontend
|   +-- src/
|       +-- components/
|       +-- hooks/
|       +-- pages/
|       +-- utils/
|       +-- types/
+-- server/                  # Backend
|   +-- routes/
|   +-- middleware/
|   +-- services/
+-- prisma/
|   +-- schema.prisma
+-- docs/                    # Documentation
+-- tests/
```

## Related Documentation
- Tech Stack: docs/tech-stack.md
- Data Model: docs/data-model.md
- Sync Strategy: docs/sync-strategy.md
- Tier Rules: docs/tier-router-rules.md
