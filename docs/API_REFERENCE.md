# SAGE MVP Platform - API Reference

Base URL: `http://localhost:3001/api` (development) or `https://yourdomain.com/api` (production)

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### POST /auth/register

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "tier": 2
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "userType": "SAGE_CLIENT",
      "tier": 2
    },
    "token": "jwt-token",
    "expiresIn": "7d"
  }
}
```

---

### POST /auth/login

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "userType": "SAGE_CLIENT",
      "tier": 2
    },
    "token": "jwt-token",
    "expiresIn": "7d"
  }
}
```

---

### GET /auth/me

Get current user's profile. **Requires authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "userType": "SAGE_CLIENT",
    "tier": 2,
    "client": {
      "id": "client-uuid",
      "status": "ACTIVE",
      "projectAddress": "123 Main St"
    },
    "projects": [
      {
        "id": "project-uuid",
        "name": "My Project",
        "status": "IN_PROGRESS",
        "tier": 2
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### POST /auth/refresh

Refresh authentication token. **Requires authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "new-jwt-token",
    "expiresIn": "7d"
  }
}
```

---

## Lead Endpoints

### POST /leads

Create a new lead from intake form.

**Request Body:**
```json
{
  "email": "lead@example.com",
  "projectAddress": "456 Oak Ave",
  "budgetRange": "5000_15000",
  "timeline": "3_6_months",
  "projectType": "full_landscape",
  "hasSurvey": true,
  "hasDrawings": false,
  "notes": "Optional notes"
}
```

**Budget Range Options:**
- `under_5000`
- `5000_15000`
- `15000_50000`
- `50000_100000`
- `over_100000`

**Timeline Options:**
- `under_3_months`
- `3_6_months`
- `6_12_months`
- `over_12_months`
- `flexible`

**Project Type Options:**
- `consultation_only`
- `planting_plan`
- `full_landscape`
- `hardscape_focus`
- `outdoor_living`
- `complete_transformation`
- `major_renovation`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "lead": {
      "id": "lead-uuid",
      "email": "lead@example.com",
      "status": "NEW",
      "recommendedTier": 2
    },
    "tierRecommendation": {
      "tier": 2,
      "confidence": "high",
      "needsManualReview": false,
      "reasons": ["Budget aligns with Tier 2", "Timeline suitable for Builder package"],
      "alternatives": [1, 3]
    }
  }
}
```

---

### GET /leads

List all leads (admin only). **Requires authentication.**

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| status | string | Filter by status |
| tier | number | Filter by recommended tier |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "leads": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### GET /leads/:id

Get a single lead by ID. **Requires authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "lead-uuid",
    "email": "lead@example.com",
    "projectAddress": "456 Oak Ave",
    "budgetRange": "5000_15000",
    "timeline": "3_6_months",
    "projectType": "full_landscape",
    "hasSurvey": true,
    "hasDrawings": false,
    "status": "NEW",
    "recommendedTier": 2,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### PATCH /leads/:id

Update a lead (admin only). **Requires authentication.**

**Request Body:**
```json
{
  "status": "QUALIFIED",
  "tierOverride": 3,
  "tierOverrideReason": "Client needs site visits"
}
```

**Status Options:**
- `NEW`
- `QUALIFIED`
- `NEEDS_REVIEW`
- `CLOSED`

---

### POST /leads/:id/convert

Convert a lead to a client. **Requires authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "client": { "id": "client-uuid", ... },
    "project": { "id": "project-uuid", ... },
    "user": { "id": "user-uuid", ... }
  }
}
```

---

## Checkout Endpoints

### POST /checkout/create-session

Create a Stripe checkout session.

**Request Body:**
```json
{
  "leadId": "lead-uuid",
  "tier": 2,
  "email": "user@example.com",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_...",
    "url": "https://checkout.stripe.com/...",
    "expiresAt": 1234567890
  }
}
```

---

### GET /checkout/session/:sessionId

Get checkout session status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "cs_test_...",
    "status": "complete",
    "paymentStatus": "paid",
    "amountTotal": 149900,
    "currency": "usd",
    "customerEmail": "user@example.com"
  }
}
```

---

### GET /checkout/pricing

Get tier pricing information.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "tier": 1,
      "name": "SAGE Tier 1 - The Concept",
      "description": "No-Touch, Fully Automated design package",
      "amount": 29900,
      "currency": "usd",
      "formattedPrice": "$299"
    },
    {
      "tier": 2,
      "name": "SAGE Tier 2 - The Builder",
      "description": "Low-Touch, Systematized with Checkpoints",
      "amount": 149900,
      "currency": "usd",
      "formattedPrice": "$1,499"
    },
    {
      "tier": 3,
      "name": "SAGE Tier 3 - The Concierge",
      "description": "Site Visits, Hybrid Tech + Boots on Ground",
      "amount": 499900,
      "currency": "usd",
      "formattedPrice": "$4,999"
    }
  ]
}
```

---

## Project Endpoints

### GET /projects

List user's projects. **Requires authentication.**

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| status | string | Filter by status |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "project-uuid",
        "name": "123 Main St Project",
        "status": "IN_PROGRESS",
        "tier": 2,
        "paymentStatus": "paid",
        "progress": 40,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### GET /projects/:id

Get project with details. **Requires authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "project-uuid",
    "name": "123 Main St Project",
    "status": "IN_PROGRESS",
    "tier": 2,
    "paymentStatus": "paid",
    "milestones": [...],
    "deliverables": [...],
    "payments": [...],
    "client": { ... }
  }
}
```

---

### GET /projects/:id/milestones

Get milestones for a project. **Requires authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "milestones": [
      {
        "id": "milestone-uuid",
        "name": "Intake",
        "status": "COMPLETED",
        "order": 1,
        "dueDate": "2024-01-15T00:00:00.000Z",
        "completedAt": "2024-01-14T00:00:00.000Z"
      },
      {
        "id": "milestone-uuid-2",
        "name": "Draft",
        "status": "IN_PROGRESS",
        "order": 2,
        "dueDate": "2024-01-29T00:00:00.000Z"
      }
    ],
    "summary": {
      "total": 5,
      "completed": 1,
      "inProgress": 1,
      "pending": 3,
      "progress": 20
    }
  }
}
```

---

### GET /projects/:id/deliverables

Get deliverables for a project. **Requires authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deliverables": [
      {
        "id": "deliverable-uuid",
        "name": "Concept Design.pdf",
        "fileName": "concept-design-v1.pdf",
        "fileSize": 2500000,
        "fileType": "application/pdf",
        "category": "DESIGN",
        "createdAt": "2024-01-20T00:00:00.000Z"
      }
    ],
    "summary": {
      "total": 5,
      "byCategory": {
        "DESIGN": 2,
        "DOCUMENT": 3
      }
    }
  }
}
```

---

### GET /deliverables/:id/download

Get a signed download URL for a deliverable. **Requires authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://storage.supabase.co/...",
    "expiresAt": "2024-01-20T01:00:00.000Z",
    "fileName": "concept-design-v1.pdf"
  }
}
```

---

## Admin Endpoints

### GET /admin/dashboard

Get admin dashboard statistics. **Requires admin authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "leads": {
      "total": 150,
      "new": 25,
      "qualified": 45,
      "needsReview": 10,
      "closed": 70
    },
    "projects": {
      "total": 80,
      "byTier": { "1": 20, "2": 35, "3": 20, "4": 5 },
      "byStatus": { "ONBOARDING": 5, "IN_PROGRESS": 50, "COMPLETED": 25 }
    },
    "revenue": {
      "total": 250000,
      "thisMonth": 45000,
      "byTier": { "1": 5970, "2": 52465, "3": 99980, "4": 91585 }
    },
    "clients": {
      "total": 75,
      "active": 55
    }
  }
}
```

---

### GET /admin/leads

List all leads with filters. **Requires admin authentication.**

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| status | string | Filter by status |
| tier | number | Filter by tier |
| search | string | Search by email/address |
| startDate | string | Filter from date |
| endDate | string | Filter to date |

---

### GET /admin/projects

List all projects. **Requires admin authentication.**

---

### GET /admin/clients

List all clients. **Requires admin authentication.**

---

## Upload Endpoints

### POST /upload

Upload a single file. **Requires admin authentication.**

**Request:** Multipart form data
- `file`: The file to upload
- `projectId`: Project UUID
- `category`: File category (DESIGN, DOCUMENT, IMAGE, OTHER)
- `name`: Display name (optional)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "deliverable-uuid",
    "name": "Design Document",
    "fileName": "design-doc.pdf",
    "fileSize": 1500000,
    "fileType": "application/pdf",
    "storagePath": "projects/uuid/deliverables/design-doc.pdf"
  }
}
```

---

### GET /upload/config

Get upload configuration.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "maxFileSize": 52428800,
    "maxFileSizeMB": 50,
    "allowedTypes": [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/zip"
    ],
    "categories": ["DESIGN", "DOCUMENT", "IMAGE", "OTHER"]
  }
}
```

---

## Webhook Endpoints

### POST /webhooks/stripe

Handle Stripe webhook events. **Requires valid Stripe signature.**

**Headers:**
```
stripe-signature: t=...,v1=...,v0=...
```

**Handled Events:**
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

---

### POST /webhooks/notion

Handle Notion webhook events. Receives updates from Notion when pages or databases are modified.

**Webhook Challenge (Initial Setup):**

When setting up the webhook in Notion, Notion sends a challenge request that must be responded to:

**Request:**
```json
{
  "type": "webhook_challenge",
  "challenge": "challenge-token-here"
}
```

**Response:**
```json
{
  "challenge": "challenge-token-here"
}
```

**Page Update Event:**

**Request:**
```json
{
  "type": "page.updated",
  "object": {
    "id": "notion-page-id",
    "last_edited_time": "2025-01-10T12:00:00.000Z",
    "properties": {
      "Name": { "title": [{ "plain_text": "Updated Project Name" }] },
      "Status": { "select": { "name": "IN_PROGRESS" } }
    }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "received": true,
  "synced": true,
  "correlationId": "uuid-here"
}
```

**Features:**
- Idempotency: Duplicate events are automatically skipped based on `last_edited_time`
- Syncs project `name` and `status` from Notion to Postgres
- Logs all webhook events to audit log
- Handles pages not linked to projects gracefully

---

## Notion Sync Endpoints

### GET /notion/status

Get sync status and statistics. **Requires admin authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "initialized": true,
    "queue": {
      "pending": 5,
      "processing": 2,
      "failed": 1,
      "completed": 150
    },
    "database": {
      "projects": {
        "pending": 3,
        "syncing": 1,
        "synced": 80,
        "failed": 2
      },
      "milestones": {
        "pending": 10,
        "syncing": 2,
        "synced": 200,
        "failed": 1
      },
      "deliverables": {
        "pending": 5,
        "syncing": 0,
        "synced": 150,
        "failed": 0
      }
    }
  }
}
```

---

### POST /notion/sync

Trigger sync for all pending entities. **Requires admin authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Sync triggered for pending entities",
    "queued": {
      "projects": 3,
      "milestones": 10,
      "deliverables": 5
    }
  }
}
```

---

### POST /notion/sync/project/:id

Manually sync a specific project to Notion. **Requires admin authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Project sync queued",
    "taskId": "sync-task-uuid",
    "projectId": "project-uuid"
  }
}
```

---

### POST /notion/retry

Retry all failed syncs. **Requires admin authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Retry triggered for failed syncs",
    "reset": {
      "projects": 2,
      "milestones": 1,
      "deliverables": 0
    }
  }
}
```

---

### GET /notion/failed

Get list of all failed syncs. **Requires admin authentication.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "project-uuid",
        "name": "Project Name",
        "syncError": "Notion API rate limit exceeded",
        "updatedAt": "2025-01-10T12:00:00.000Z"
      }
    ],
    "milestones": [...],
    "deliverables": [...],
    "total": 3
  }
}
```

---

## Admin Sync Endpoints

### GET /admin/sync/health

Get Notion-Postgres reconciliation report. **Requires admin authentication.**

This endpoint compares data between Notion and Postgres to identify discrepancies and ensure data consistency.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-10T12:00:00.000Z",
    "projects": {
      "postgres": {
        "total": 85,
        "withNotionPage": 80,
        "pendingSync": 3,
        "synced": 75,
        "failed": 2
      },
      "notion": {
        "total": 82,
        "linkedToProject": 78,
        "orphaned": 4
      },
      "discrepancies": [
        {
          "projectId": "project-uuid",
          "notionPageId": "notion-page-id",
          "issue": "name_mismatch",
          "postgres": { "name": "Project Name (Postgres)" },
          "notion": { "name": "Project Name (Notion)" },
          "lastSynced": "2025-01-09T10:00:00.000Z",
          "notionLastEdited": "2025-01-10T11:00:00.000Z"
        },
        {
          "projectId": "project-uuid-2",
          "notionPageId": "notion-page-id-2",
          "issue": "status_mismatch",
          "postgres": { "status": "IN_PROGRESS" },
          "notion": { "status": "AWAITING_FEEDBACK" },
          "lastSynced": "2025-01-09T15:00:00.000Z",
          "notionLastEdited": "2025-01-10T09:00:00.000Z"
        }
      ]
    },
    "syncStatus": "mostly_synced"
  }
}
```

**Sync Status Values:**
- `healthy`: All projects are in sync
- `mostly_synced`: Minor discrepancies detected
- `needs_attention`: Multiple discrepancies require review
- `error`: Error occurred during reconciliation

---

## Health Check

### GET /health

Check API health status.

**Response (200):**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "stripe": "configured",
    "notion": "configured",
    "storage": "configured"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

**Common Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request data |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

- Standard endpoints: 100 requests/minute
- Authentication endpoints: 10 requests/minute
- Upload endpoints: 20 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```
