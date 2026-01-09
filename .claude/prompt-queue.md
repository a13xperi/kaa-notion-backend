# Claude Code Prompt Queue
# Reference: "Run the next pending prompt from .claude/prompt-queue.md"

## How to Use
1. Add prompts to the appropriate section below
2. Tell Claude: "Run the next pending prompt" or "Run all pending prompts in [section]"
3. Claude will execute and update status from `[ ]` to `[x]`

---

## Active Queue

### High Priority
- [ ] `new-endpoint`: POST /api/projects - create new project with tier assignment
- [ ] `new-endpoint`: GET /api/projects/:id - get project with milestones
- [ ] `new-component`: ProjectCard - display project summary with status badge

### Normal Priority
- [ ] `new-hook`: useProjects - fetch user's projects with filtering
- [ ] `new-hook`: useProject - fetch single project by ID
- [ ] `prisma-model`: Milestone - projectId, title, dueDate, status, completedAt

### Low Priority
- [ ] `notion-sync`: Project - sync project creation to Notion workspace
- [ ] `stripe-integration`: checkout session for tier upgrades

---

## Backlog (Not Started)

### API Endpoints
- [ ] `new-endpoint`: CRUD for milestones
- [ ] `new-endpoint`: CRUD for documents
- [ ] `new-endpoint`: GET /api/users/me - current user profile
- [ ] `new-webhook`: Stripe payment success handler
- [ ] `new-webhook`: Notion page update handler

### Components
- [ ] `new-component`: MilestoneList - display project milestones
- [ ] `new-component`: DocumentUpload - file upload with progress
- [ ] `new-component`: TierBadge - display tier with styling
- [ ] `new-component`: PaymentForm - Stripe Elements integration
- [ ] `new-form`: ProjectIntakeForm - initial project questionnaire

### Hooks
- [ ] `new-hook`: useMilestones - fetch milestones by project
- [ ] `new-hook`: useDocuments - fetch documents by project
- [ ] `new-hook`: useStripeCheckout - handle payment flow

### Database
- [ ] `prisma-model`: Document - projectId, name, url, type, uploadedBy
- [ ] `prisma-model`: Payment - userId, projectId, amount, stripeId, status
- [ ] `prisma-migration`: add tier column to projects table

### Integrations
- [ ] `notion-sync`: Milestone - sync milestones to project page
- [ ] `notion-sync`: Document - link documents in Notion
- [ ] `stripe-integration`: subscription management for Tier 3

---

## Completed
<!-- Move completed items here with date -->

### 2025-01-09
- [x] Initial project setup
- [x] Claude Code configuration files

---

## Custom Prompts (Add Your Own)

### Template
```
- [ ] `prompt-type`: description - specific details
```

### Your Prompts
- [ ]

---

## Quick Reference

| Prompt Type | Use For |
|-------------|---------|
| `new-endpoint` | API routes (GET, POST, PATCH, DELETE) |
| `new-component` | React components |
| `new-hook` | Custom React hooks with React Query |
| `new-form` | Form components with validation |
| `prisma-model` | Database models |
| `prisma-migration` | Schema changes |
| `notion-sync` | Notion integration for entity |
| `stripe-integration` | Payment features |
| `new-webhook` | Webhook handlers |
| `audit` | Code review / security check |
| `test` | Write tests for component/endpoint |

---

## Invocation Examples

```bash
# Run next item
"Run the next pending prompt from the queue"

# Run specific section
"Run all high priority prompts from the queue"

# Run specific type
"Run all pending new-endpoint prompts"

# Add new item
"Add to prompt queue: new-component UserProfile"

# Check status
"Show me the prompt queue status"
```
