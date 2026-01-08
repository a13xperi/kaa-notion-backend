# MVP Execution Plan: Intake → Stripe → Provisioning → Portal Access

**Created:** 2026-01-08
**Status:** Ready for Implementation

---

## Architecture Summary

### Tech Stack
- **Backend:** Express.js v5.1.0 (`notion-api-server-enhanced.js`)
- **Frontend:** React 19.1.0 + TypeScript (`kaa-app/`)
- **Database:** PostgreSQL via Supabase + Prisma ORM (`prisma/schema.prisma`)
- **Payments:** Stripe (configured, not implemented)
- **Auth:** Address-based + bcrypt password hashing
- **External:** Notion API, OpenAI, Nodemailer

### Current Backend Endpoints

| Method | Endpoint | Purpose | File:Line |
|--------|----------|---------|-----------|
| POST | `/api/admin/clients/create` | Create client with credentials | `notion-api-server-enhanced.js:184` |
| POST | `/api/client/verify` | Authenticate client login | `notion-api-server-enhanced.js:254` |
| POST | `/api/client/verify-user` | Secondary verification | `notion-api-server-enhanced.js:399` |
| GET | `/api/client/data/:address` | Fetch client workspace data | `notion-api-server-enhanced.js:496` |
| POST | `/api/client/upload` | Upload files (10MB limit) | `notion-api-server-enhanced.js:647` |
| GET | `/api/notion/pages` | List Notion pages | `notion-api-server-enhanced.js:742` |
| GET | `/api/notion/pages/:pageId` | Get page content | `notion-api-server-enhanced.js:819` |
| GET | `/api/notion/databases` | List databases | `notion-api-server-enhanced.js:843` |
| POST | `/api/sage/chat` | OpenAI chat integration | `notion-api-server-enhanced.js:870` |
| GET | `/api/health` | Health check | `notion-api-server-enhanced.js:998` |
| GET | `/api/client/design-ideas/:address` | Get design ideas | `notion-api-server-enhanced.js:1017` |
| POST | `/api/client/design-ideas/upload` | Upload design image | `notion-api-server-enhanced.js:1035` |
| POST | `/api/client/design-ideas/add` | Add design idea | `notion-api-server-enhanced.js:1069` |
| POST | `/api/client/design-ideas/pinterest-import` | Import from Pinterest | `notion-api-server-enhanced.js:1098` |
| DELETE | `/api/client/design-ideas/:id` | Delete design idea | `notion-api-server-enhanced.js:1151` |

---

## MVP Execution Checklist

### Phase 1: Intake Form & Lead Capture

- [ ] **1.1 Create Intake Form Component**
  - File: `kaa-app/src/components/IntakeForm.tsx` (new)
  - Fields: name, email, projectAddress, budgetRange, timeline, projectType, hasSurvey, hasDrawings
  - Reference schema: `prisma/schema.prisma:104-129` (Lead model)

- [ ] **1.2 Implement Tier Router Function**
  - File: `kaa-app/src/utils/tierRouter.ts` (new)
  - Logic defined in: `docs/tier-router-rules.md:210-307`
  - Returns: `{ tier: 1|2|3|4, reason: string, confidence: string, needsManualReview: boolean }`

- [ ] **1.3 Create Lead Submission API**
  - File: `notion-api-server-enhanced.js` (add endpoint ~line 180)
  - Endpoint: `POST /api/leads/submit`
  - Actions: validate input, run tier router, save to DB, create Notion entry
  - Use Prisma client for Lead model

- [ ] **1.4 Build SAGE Landing Pages**
  - File: `kaa-app/src/components/SageLanding.tsx` (new)
  - Routes: `/sage`, `/sage/tiers`, `/sage/get-started`
  - Update: `kaa-app/src/App.tsx` with routes

- [ ] **1.5 Add Tier Display Component**
  - File: `kaa-app/src/components/TierDisplay.tsx` (new)
  - Show recommended tier after form submission
  - Display pricing and next steps per tier

---

### Phase 2: Stripe Payment Integration

- [ ] **2.1 Configure Stripe Products/Prices**
  - Create products in Stripe Dashboard for Tiers 1-4
  - Store IDs in: `prisma/schema.prisma:156-167` (Tier model)
  - Seed data: `prisma/seed.ts` (new)

- [ ] **2.2 Install Stripe Dependencies**
  - Backend: `npm install stripe`
  - Frontend: `npm install @stripe/stripe-js @stripe/react-stripe-js` (in kaa-app)
  - Config: `env.example:29-36` (already defined)

- [ ] **2.3 Create Checkout Session API**
  - File: `notion-api-server-enhanced.js` (add endpoint)
  - Endpoint: `POST /api/stripe/create-checkout-session`
  - Input: `{ leadId, tier, email }`
  - Returns: `{ sessionId, url }`

- [ ] **2.4 Implement Stripe Webhook Handler**
  - File: `notion-api-server-enhanced.js` (add endpoint)
  - Endpoint: `POST /api/stripe/webhook`
  - Events: `checkout.session.completed`, `payment_intent.succeeded`
  - Verify signature using `STRIPE_WEBHOOK_SECRET`
  - Update Payment record: `prisma/schema.prisma:188-207`

- [ ] **2.5 Build Checkout UI Component**
  - File: `kaa-app/src/components/StripeCheckout.tsx` (new)
  - Redirect to Stripe Checkout or embed Elements
  - Handle success/cancel redirects

- [ ] **2.6 Add Payment Status Tracking**
  - Update Lead → Client conversion on payment success
  - Log to AuditLog: `prisma/schema.prisma:232-249`

---

### Phase 3: Client Provisioning

- [ ] **3.1 Create Project Provisioning API**
  - File: `notion-api-server-enhanced.js` (add endpoint)
  - Endpoint: `POST /api/projects/provision`
  - Triggered by: Stripe webhook (payment success)
  - Actions:
    - Create User record (`prisma/schema.prisma:64-83`)
    - Create Client record (`prisma/schema.prisma:85-102`)
    - Create Project record (`prisma/schema.prisma:131-154`)
    - Create Milestones based on tier (`prisma/schema.prisma:169-186`)

- [ ] **3.2 Generate Client Credentials**
  - Extend existing logic: `notion-api-server-enhanced.js:184-252`
  - Generate secure password with bcrypt (already in use)
  - Store passwordHash in User record

- [ ] **3.3 Create Notion Workspace for Client**
  - Use existing Notion integration: `notion-api-server-enhanced.js:72-130`
  - Create project page under parent
  - Link notionPageId to Project record

- [ ] **3.4 Send Welcome Email**
  - Use existing email function: `notion-api-server-enhanced.js:141-181`
  - Include: login credentials, portal URL, next steps
  - Template per tier

- [ ] **3.5 Create Admin Notification**
  - Notify team via TEAM_EMAIL (`env.example:53`)
  - Include: client info, tier, payment amount

---

### Phase 4: Client Portal Access

- [ ] **4.1 Update Client Login Flow**
  - File: `kaa-app/src/components/ClientLogin.tsx` (exists)
  - Support SAGE clients (email-based) in addition to KAA (address-based)
  - Update API: `notion-api-server-enhanced.js:254-397`

- [ ] **4.2 Create Tier-Aware Dashboard**
  - File: `kaa-app/src/components/ClientHub.tsx` (update)
  - Show features based on client tier
  - Display project milestones from DB

- [ ] **4.3 Implement Milestone Tracker Component**
  - File: `kaa-app/src/components/MilestoneTracker.tsx` (new)
  - Query: `GET /api/client/milestones/:projectId` (new endpoint)
  - Display progress by tier-specific milestones

- [ ] **4.4 Add Document Upload for Clients**
  - Use existing: `notion-api-server-enhanced.js:647-739`
  - Save Deliverable records: `prisma/schema.prisma:209-230`
  - Integrate with Supabase Storage

- [ ] **4.5 Build Payment History View**
  - File: `kaa-app/src/components/PaymentHistory.tsx` (new)
  - Endpoint: `GET /api/client/payments/:clientId` (new)
  - Query Payment table

- [ ] **4.6 Enable Project Status Updates**
  - Admin: update ProjectStatus enum values
  - Client: view current status and next steps
  - Auto-update on milestone completion

---

## File Reference Quick Index

### Existing Files to Modify
| File | Purpose |
|------|---------|
| `notion-api-server-enhanced.js` | Add Stripe, lead, provisioning endpoints |
| `kaa-app/src/App.tsx` | Add SAGE routes |
| `kaa-app/src/components/ClientLogin.tsx` | Support SAGE email auth |
| `kaa-app/src/components/ClientHub.tsx` | Tier-aware dashboard |
| `prisma/schema.prisma` | Database models (complete) |
| `env.example` | Environment vars (complete) |
| `package.json` | Add Stripe dependency |

### New Files to Create
| File | Purpose |
|------|---------|
| `kaa-app/src/components/IntakeForm.tsx` | Lead capture form |
| `kaa-app/src/components/SageLanding.tsx` | SAGE landing pages |
| `kaa-app/src/components/TierDisplay.tsx` | Tier recommendation display |
| `kaa-app/src/components/StripeCheckout.tsx` | Payment UI |
| `kaa-app/src/components/MilestoneTracker.tsx` | Project progress |
| `kaa-app/src/components/PaymentHistory.tsx` | Payment records |
| `kaa-app/src/utils/tierRouter.ts` | Tier routing logic |
| `prisma/seed.ts` | Seed tier data |

### New API Endpoints Needed
| Method | Endpoint | Phase |
|--------|----------|-------|
| POST | `/api/leads/submit` | 1 |
| POST | `/api/stripe/create-checkout-session` | 2 |
| POST | `/api/stripe/webhook` | 2 |
| POST | `/api/projects/provision` | 3 |
| GET | `/api/client/milestones/:projectId` | 4 |
| GET | `/api/client/payments/:clientId` | 4 |

---

## Pre-requisites (User Action Required)

1. **Supabase Setup**
   - Create project at https://app.supabase.com
   - Get DATABASE_URL connection string
   - See: `docs/supabase-setup.md`

2. **Run Prisma Migrations**
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

3. **Stripe Dashboard Setup**
   - Create Products for Tiers 1-4
   - Get API keys → add to `.env`
   - Create webhook endpoint → get signing secret

4. **Environment Variables**
   - Copy `env.example` to `.env`
   - Fill all required values
   - See: `env.example:1-83`

---

## Success Criteria

- [ ] Lead submits intake form → tier assigned automatically
- [ ] Lead completes Stripe checkout → payment recorded
- [ ] Payment success → client provisioned automatically
- [ ] Client receives welcome email with credentials
- [ ] Client logs into portal → sees tier-appropriate dashboard
- [ ] Client can view milestones and upload documents
