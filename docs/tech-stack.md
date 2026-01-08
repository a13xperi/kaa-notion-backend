# SAGE MVP - Technical Stack Decisions

**Last Updated:** 2024-12-28  
**Status:** Decisions Made ✅

---

## Architecture Decision

**✅ Extend KAA App** (not separate app)
- Single codebase for both KAA and SAGE
- Faster to MVP
- Reuse existing components and infrastructure
- Routes: `/sage`, `/sage/tiers`, `/sage/get-started`

---

## Frontend Stack

**Framework:** React (Create React App) + TypeScript
- **Rationale:** Already in use, stable, well-documented
- **Location:** `kaa-app/`
- **Build Tool:** react-scripts
- **State Management:** React hooks (useState, useEffect, useContext)

**UI Components:**
- Custom components in `kaa-app/src/components/`
- Reusable components for both KAA and SAGE

---

## Backend Stack

**Runtime:** Node.js + Express
- **File:** `notion-api-server-enhanced.js`
- **Port:** 3001 (configurable via PORT env var)

**API Style:** RESTful
- Endpoints: `/api/sage/*`, `/api/client/*`, `/api/stripe/*`

---

## Database Architecture

**✅ Hybrid Approach: Supabase Postgres + Notion**

### Supabase Postgres (Source of Truth)
**Purpose:** Transactional data, real-time queries, payment processing

**Tables:**
- `users` - Authentication, profiles, preferences
- `clients` - Client metadata, tier assignment
- `leads` - Intake submissions, tier recommendations
- `projects` - Project metadata, status, tier, payment status
- `tiers` - Tier definitions, pricing, features
- `milestones` - Per-tier milestone tracking
- `payments` - Stripe payment records, invoices
- `deliverables` - File metadata, storage references
- `audit_log` - System activity, security logs

**Why Postgres:**
- ACID transactions for payments
- Complex joins and queries
- Real-time subscriptions (if needed)
- Row Level Security (RLS) for access control
- Better performance for transactional operations

### Notion (Display/Collaboration Layer)
**Purpose:** Rich content, team collaboration, visual presentation

**Content:**
- Project pages (synced from Postgres) - Design briefs, rich content
- Deliverable showcase pages - Visual presentation
- Team workspace - Kanban boards, task tracking
- Client communications - Message threads, notes

**Why Notion:**
- Excellent for rich content and collaboration
- Team already uses Notion workflows
- No need to build custom rich text editor
- Visual presentation of deliverables
- Existing Kanban boards and task tracking

**Sync Strategy:**
- Postgres → Notion: Automated sync (project created, milestone updated, deliverable uploaded)
- Notion → Postgres: Manual updates (team marks tasks complete)
- Postgres is always source of truth

---

## Authentication

**✅ Extend KAA App Authentication**

**Current System:**
- KAA clients: Address + password
- Two-step verification: Address confirmation + last name

**SAGE Extension:**
- SAGE clients: Email-based authentication
- Unified auth system supporting both KAA and SAGE users
- Store auth data in Supabase `users` table

**Implementation:**
- Extend existing `ClientLogin.tsx` and `UserVerification.tsx`
- Add email-based flow for SAGE clients
- Unified session management

---

## Hosting & Deployment

**Frontend:** Vercel
- **Current:** Already deployed
- **Environments:** Preview (PRs), Staging (`staging` branch), Production (`main`)
- **Deployment Checks:** Typecheck, lint, tests

**Backend:** Vercel (Serverless Functions)
- **Current:** `notion-api-server-enhanced.js` deployed as serverless function
- **Configuration:** `vercel.json`

**Database:** Supabase
- **Hosting:** Managed by Supabase
- **Backups:** Automatic (configured in Supabase dashboard)
- **Environments:** Separate projects for staging/prod (recommended)

---

## Storage

**✅ Supabase Storage**

**Purpose:** Deliverable files (PDFs, images, CAD files, etc.)

**Structure:**
- Bucket: `deliverables`
- Organization: `projects/{project_id}/{deliverable_id}/{filename}`
- Metadata stored in Postgres `deliverables` table
- Public URLs for client access (with expiration if needed)

**Why Supabase Storage:**
- Integrated with Supabase Postgres
- Built-in CDN
- Access control via RLS
- Simple API
- Cost-effective

---

## Payments

**Provider:** Stripe

**Integration:**
- Stripe Checkout (hosted payment page)
- Stripe Webhooks (payment confirmation)
- Products/prices defined in Stripe dashboard

**Flow:**
1. Client selects tier → redirected to Stripe Checkout
2. Payment processed by Stripe
3. Webhook confirms payment → create client/project in Postgres
4. Email portal access link

**Security:**
- Webhook signature validation
- Never store full payment details
- Use Stripe Customer IDs for reference

---

## Email Service

**Provider:** Resend (recommended) or Postmark

**Current:** Gmail (legacy, for development)

**Upgrade Path:**
- Resend for production (better deliverability, analytics)
- Postmark as alternative
- Keep Gmail for local development

**Templates:**
- Welcome (per tier)
- Payment confirmation
- Deliverable ready
- Feedback request

---

## Monitoring & Analytics

**Error Tracking:** Sentry (to be configured)
**Analytics:** PostHog (to be configured)
**Logging:** Custom logger utility (development only, production via Sentry)

---

## Development Tools

**Code Editor:** Cursor (with `.cursorrules`)
**AI Assistant:** Claude Code (for scaffolding, refactors)
**Notion Integration:** Notion MCP (for reading roadmap/docs)
**Version Control:** Git + GitHub
**CI/CD:** Vercel (automatic on push)

---

## Environment Variables

See `.env.example` for complete list of required variables.

**Required for MVP:**
- Supabase URL, anon key, service role key
- Notion API key
- Stripe secret key, publishable key, webhook secret
- Email provider API key
- Frontend URL

---

## Migration Path

**Phase 1:** Set up Supabase, migrate auth data
**Phase 2:** Migrate transactional data (leads, projects, payments)
**Phase 3:** Set up sync mechanism (Postgres → Notion)
**Phase 4:** Migrate file storage to Supabase Storage
**Phase 5:** Decommission Notion-only data storage (keep for display)

---

## Key Principles

1. **Postgres = Source of Truth** - All transactional data lives here
2. **Notion = Display Layer** - Synced from Postgres for collaboration
3. **Unified Auth** - Single system for KAA and SAGE
4. **Extend, Don't Replace** - Build on existing KAA App infrastructure
5. **Security First** - Validate all inputs, use RLS, never log secrets
