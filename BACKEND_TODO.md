# Backend To-Do List
## KAA Notion Backend Implementation Tasks

**Created:** January 9, 2026
**Based on:** Claude Code Implementation Plan
**Status:** Active Development

---

## Phase 2: Backend Development Workflows

### 2.1 Backend API Development

- [ ] **Add POST /api/projects/upload-images endpoint**
  - Accept multipart form data
  - Validate image types (jpg, png, webp)
  - Upload to Supabase Storage
  - Create Notion page with image references
  - Return URLs and Notion page ID
  - Follow existing endpoint patterns and error handling in `notion-api-server.js`

- [ ] **Enhance authentication middleware**
  - Add rate limiting per user
  - Implement refresh token rotation
  - Add session management with Redis (if available) or memory store
  - Document the auth flow in `/docs`
  - Reference existing Supabase auth integration

---

### 2.2 Frontend Development (kaa-app)

- [ ] **Create ProjectTimeline component**
  - Display project milestones from Notion
  - Show progress percentage
  - Interactive milestone markers
  - Mobile-responsive design
  - Use existing TypeScript patterns from `kaa-app/src/components/`
  - Location: `kaa-app/src/components/ProjectTimeline.tsx`

- [ ] **Review and fix mobile issues**
  - Review `HAMBURGER_MENU_MOBILE.md`
  - Review `MOBILE_RESPONSIVE_COMPLETE.md`
  - Identify any remaining mobile issues
  - Test sidebar overflow fixes
  - Create checklist of mobile-specific tests
  - Implement any missing responsive styles

---

### 2.3 Database & Data Tasks

- [ ] **Update Prisma schema** (`prisma/schema.prisma`)
  - Add `FileUpload` model linked to Projects
  - Add `ActivityLog` model for audit trail (expand existing AuditLog)
  - Add `NotificationPreference` model per user
  - Generate migration: `npm run prisma:migrate`
  - Update relevant TypeScript types in `kaa-app/src/types/`
  - Create seed data for testing

- [ ] **Enhance Notion sync mechanism**
  - Review `/docs/sync-strategy.md`
  - Add conflict resolution for bidirectional sync
  - Implement webhook handling for Notion updates
  - Add sync status tracking in Postgres
  - Create sync health dashboard endpoint `/api/sync/health`

---

### 2.4 Payment Integration

- [ ] **Enhance Stripe checkout flow**
  - Add support for subscription tiers (SAGE 1/2/3)
  - Implement trial periods
  - Add upgrade/downgrade logic
  - Create payment history view component
  - Reference `/docs/tier-router-rules.md`

---

## Phase 3: Cross-Repository Workflows

### 3.1 Design System

- [ ] **Import design tokens from kaa-landing**
  - Read design-tokens.json from kaa-landing
  - Create matching Tailwind config
  - Update kaa-app components to use shared tokens
  - Ensure visual consistency between landing and portal

### 3.2 Shared Components

- [ ] **Create shared-components folder**
  - Button variants
  - Form inputs
  - Card layouts
  - Modal dialogs
  - Loading states
  - Export as React compatible components

### 3.3 Environment Configuration

- [ ] **Create environment setup script**
  - Generate `.env` from `env.example`
  - Validate required variables
  - Check Notion API connectivity
  - Check Supabase connectivity
  - Check Stripe connectivity
  - Output setup status report

---

## Phase 4: CI/CD and DevOps

### 4.1 GitHub Actions

- [ ] **Create test-deploy workflow** (`.github/workflows/test-deploy.yml`)
  - Run Prisma migrations check
  - TypeScript type checking
  - Jest tests
  - E2E tests with Playwright (when added)
  - Deploy to Vercel with env setup

### 4.2 Testing Setup

- [ ] **Set up Jest for unit tests**
  - Configure Jest for Node.js backend
  - Create tests for API endpoints
  - Reference existing tests in `kaa-app/src/api/__tests__/`

- [ ] **Create API endpoint tests**
  - Test `/api/client/verify`
  - Test `/api/client/verify-user`
  - Test `/api/client/upload`
  - Test `/api/admin/clients/create`
  - Test `/api/notion/pages`
  - Test `/api/notion/databases`

- [ ] **Create Notion sync function tests**
  - Test `findOrCreateDatabase()`
  - Test `logActivity()`
  - Test bidirectional sync (when implemented)

- [ ] **Create Stripe webhook handler tests**
  - Test payment success webhook
  - Test payment failure webhook
  - Test subscription events

- [ ] **Add Playwright for E2E testing**
  - Set up Playwright configuration
  - Create login flow tests
  - Create document upload tests
  - Create payment flow tests
  - Reference `TESTING_SUMMARY.md`

---

## Quick Reference

### Existing Files to Reference
| File | Purpose |
|------|---------|
| `notion-api-server.js` | Main backend server |
| `prisma/schema.prisma` | Database schema |
| `docs/sync-strategy.md` | Notion sync mechanism |
| `docs/tier-router-rules.md` | SAGE tier logic |
| `docs/hybrid-data-architecture.md` | Data architecture |
| `MOBILE_RESPONSIVE_COMPLETE.md` | Mobile fix documentation |
| `kaa-app/src/types/notion.types.ts` | TypeScript types |

### Existing Tests
| Test File | Coverage |
|-----------|----------|
| `kaa-app/src/api/__tests__/notionApi.test.ts` | Notion API |
| `kaa-app/src/components/__tests__/NotionWorkspaceViewer.test.tsx` | Workspace viewer |
| `kaa-app/src/components/__tests__/ErrorBoundary.test.tsx` | Error handling |
| `kaa-app/src/components/__tests__/sortingFiltering.test.ts` | Sort/filter logic |
| `kaa-app/src/components/__tests__/propertyRendering.test.tsx` | Property rendering |

### Commands
```bash
# Development
npm run dev              # Start both frontend and backend
npm start               # Start backend only
cd kaa-app && npm start  # Start frontend only

# Database
npm run prisma:migrate   # Create new migration
npm run prisma:deploy    # Apply migrations (production)
npm run prisma:studio    # Open Prisma Studio

# Testing
cd kaa-app && npm test   # Run tests
cd kaa-app && npm run typecheck  # Type checking
cd kaa-app && npm run lint       # Linting
```

---

## Progress Tracking

| Phase | Section | Status | Completion |
|-------|---------|--------|------------|
| 2.1 | Backend API Development | Not Started | 0% |
| 2.2 | Frontend Development | Not Started | 0% |
| 2.3 | Database & Data Tasks | Not Started | 0% |
| 2.4 | Payment Integration | Not Started | 0% |
| 3.1 | Design System | Not Started | 0% |
| 3.2 | Shared Components | Not Started | 0% |
| 3.3 | Environment Configuration | Not Started | 0% |
| 4.1 | GitHub Actions | Not Started | 0% |
| 4.2 | Testing Setup | Partial | 20% |

---

*Last updated: January 9, 2026*
