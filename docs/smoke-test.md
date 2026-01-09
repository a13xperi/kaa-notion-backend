# KAA Backend Smoke Test Guide

A step-by-step manual QA checklist for verifying the complete client journey. This guide requires no prior context—follow each step exactly as written.

---

## Prerequisites

### 1. Environment Setup

Ensure these services are running:

```bash
# Terminal 1: Start the backend API server
cd /home/user/kaa-notion-backend
node notion-api-server-enhanced.js
# Expected: "🚀 KAA Enhanced API Server running on http://localhost:3001"

# Terminal 2: Start the frontend (for UI testing)
cd /home/user/kaa-notion-backend/kaa-app
npm start
# Expected: App opens at http://localhost:3000
```

### 2. Required Environment Variables

Verify `.env` contains:

```env
NOTION_API_KEY=ntn_xxx          # Required for all operations
NOTION_PARENT_PAGE_ID=xxx       # Required for database creation
PORT=3001                       # Backend port
EMAIL_SERVICE=gmail             # Or resend/postmark
EMAIL_USER=xxx                  # For notifications
OPENAI_API_KEY=sk-xxx           # For Sage Chat (optional)
```

### 3. Tools Needed

- Browser (Chrome recommended with DevTools open)
- Terminal for server logs
- cURL or Postman for API testing
- Access to Notion workspace (to verify database entries)

---

## Test Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  1. INTAKE          → Create client account (admin)            │
│  2. CHECKOUT        → Payment setup (Stripe - future)          │
│  3. WEBHOOK         → Payment confirmation (Stripe - future)   │
│  4. PORTAL ACCESS   → Client login + verification              │
│  5. DELIVERABLE     → Upload document/design idea              │
│  6. CLIENT DOWNLOAD → Access uploaded files                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Test 1: Health Check

**Purpose:** Verify server is running and configured correctly.

### Steps

```bash
curl http://localhost:3001/api/health
```

### Expected Response

```json
{
  "status": "ok",
  "notion": true,
  "email": true,
  "openai": true
}
```

### Key Logs to Check

```
Server stdout:
✅ Notion API key configured
✅ Email configured
✅ OpenAI API configured - Sage ChatGPT enabled
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `notion: false` | Check `NOTION_API_KEY` in `.env` |
| `email: false` | Check `EMAIL_SERVICE` and credentials |
| `openai: false` | Check `OPENAI_API_KEY` (optional) |

---

## Test 2: Client Intake (Admin Creates Client)

**Purpose:** Simulate admin creating a new client account.

### Steps

```bash
curl -X POST http://localhost:3001/api/admin/clients/create \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Test Street",
    "email": "testclient@example.com",
    "password": "SecurePass123"
  }'
```

### Expected Response

```json
{
  "success": true,
  "message": "Client created successfully",
  "accessCode": "ABC12345"
}
```

### Expected Database Rows

**Notion: Client Credentials Database**

| Field | Value |
|-------|-------|
| Address | `123 Test Street` |
| Email | `testclient@example.com` |
| Password Hash | `$2b$10$...` (bcrypt hash) |
| Access Code | `ABC12345` |
| Created | Current timestamp |

**Notion: Clients Database**

| Field | Value |
|-------|-------|
| Address | `123 Test Street` |
| Last Name | (empty - set on first login) |
| Email | `testclient@example.com` |
| Status | `New` |

### Key Logs to Check

```
Server stdout:
📝 Creating new database: Client Credentials  (first run only)
✅ Email sent to testclient@example.com       (welcome email)
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `Error creating client` | Check Notion API key and parent page ID |
| Email not sent | Verify EMAIL_SERVICE credentials |

---

## Test 3: Checkout Flow (Stripe Integration)

> **Note:** Stripe integration is currently **not active**. The Prisma schema includes Payment and Tier models, but endpoints are not implemented. Skip to Test 4 for the current working flow.

### Future Implementation Reference

When implemented, the flow will be:

```bash
# Create checkout session
curl -X POST http://localhost:3001/api/checkout/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "xxx",
    "tierId": 2,
    "returnUrl": "http://localhost:3000/success"
  }'
```

### Expected Database Rows (Future)

**Prisma: payments table**

| Field | Expected Value |
|-------|----------------|
| id | UUID |
| project_id | Foreign key |
| stripe_payment_intent_id | `pi_xxx` |
| amount | (in cents) |
| status | `PENDING` |

---

## Test 4: Webhook Handler (Stripe)

> **Note:** Stripe webhooks are currently **not active**. Skip to Test 5.

### Future Implementation Reference

```bash
# Simulate Stripe webhook (payment succeeded)
curl -X POST http://localhost:3001/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: xxx" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_xxx",
        "amount": 49900,
        "metadata": {
          "clientId": "xxx",
          "tierId": "2"
        }
      }
    }
  }'
```

### Expected Database Changes (Future)

**payments table:** `status` → `SUCCEEDED`
**projects table:** `payment_status` → `paid`

---

## Test 5: Portal Access (Client Login)

**Purpose:** Test client authentication flow.

### Step 5a: Initial Login

```bash
curl -X POST http://localhost:3001/api/client/verify \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Test Street",
    "password": "SecurePass123"
  }'
```

### Expected Response

```json
{
  "success": true,
  "message": "Credentials verified"
}
```

### Step 5b: User Verification (Two-Factor)

```bash
curl -X POST http://localhost:3001/api/client/verify-user \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Test Street",
    "lastName": "Smith"
  }'
```

### Expected Response

```json
{
  "success": true,
  "message": "User verified"
}
```

### Expected Database Rows

**Notion: Activity Log Database**

| Field | Value |
|-------|-------|
| Activity | `Login Success` |
| Address | `123 Test Street` |
| Timestamp | Current time |

### Key Logs to Check

```
Server stdout:
Login Success (logged to Notion Activity DB)
User Verification Success
```

### Demo Mode Testing

For quick testing without creating a client:

```bash
# Demo credentials (always work)
curl -X POST http://localhost:3001/api/client/verify \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Demo Project",
    "password": "demo123"
  }'
```

---

## Test 6: Deliverable Upload

**Purpose:** Test file upload functionality.

### Step 6a: Document Upload

```bash
curl -X POST http://localhost:3001/api/client/upload \
  -F "file=@/path/to/test-document.pdf" \
  -F "address=123 Test Street" \
  -F "category=Document" \
  -F "description=Test upload for smoke test"
```

### Expected Response

```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "document": {
    "id": "xxx-xxx-xxx",
    "name": "test-document.pdf",
    "category": "Document",
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Expected Database Rows

**Notion: Client Documents Database**

| Field | Value |
|-------|-------|
| Name | `test-document.pdf` |
| Address | `123 Test Street` |
| Category | `Document` |
| Description | `Test upload for smoke test` |
| Uploaded At | Current timestamp |
| File URL | Notion file attachment URL |

**Notion: Activity Log Database**

| Field | Value |
|-------|-------|
| Activity | `Document Upload` |
| Address | `123 Test Street` |
| Details | `test-document.pdf` |

### Key Logs to Check

```
Server stdout:
Document Upload (logged to Activity)
✅ Email sent to team@kaa.com (upload notification)
```

### File Validation Rules

| Rule | Limit |
|------|-------|
| Max file size | 10 MB |
| Allowed extensions | pdf, doc, docx, xls, xlsx, jpg, jpeg, png, gif |
| Filename | Auto-sanitized (special chars removed) |

### Step 6b: Design Idea Upload

```bash
curl -X POST http://localhost:3001/api/client/design-ideas/upload \
  -F "file=@/path/to/inspiration.jpg" \
  -F "address=123 Test Street" \
  -F "title=Living Room Inspiration" \
  -F "description=Modern minimalist style" \
  -F "tags=modern,minimalist,living-room"
```

### Expected Response

```json
{
  "success": true,
  "designIdea": {
    "id": "xxx",
    "title": "Living Room Inspiration",
    "imageUrl": "data:image/jpeg;base64,...",
    "addedAt": "2024-01-15T10:35:00Z"
  }
}
```

---

## Test 7: Client Download (Access Uploaded Files)

**Purpose:** Verify client can retrieve their documents.

### Step 7a: Fetch Client Data

```bash
curl http://localhost:3001/api/client/data/123%20Test%20Street
```

> Note: URL encode spaces as `%20`

### Expected Response

```json
{
  "success": true,
  "clientInfo": {
    "address": "123 Test Street",
    "email": "testclient@example.com",
    "status": "Active"
  },
  "documents": [
    {
      "id": "xxx",
      "name": "test-document.pdf",
      "category": "Document",
      "fileUrl": "https://notion.so/...",
      "uploadedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "activities": [
    {
      "activity": "Document Upload",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "activity": "Login Success",
      "timestamp": "2024-01-15T10:25:00Z"
    }
  ]
}
```

### Step 7b: Fetch Design Ideas

```bash
curl http://localhost:3001/api/client/design-ideas/123%20Test%20Street
```

### Expected Response

```json
{
  "success": true,
  "designIdeas": [
    {
      "id": "xxx",
      "title": "Living Room Inspiration",
      "imageUrl": "data:image/jpeg;base64,...",
      "description": "Modern minimalist style",
      "tags": ["modern", "minimalist", "living-room"],
      "addedAt": "2024-01-15T10:35:00Z"
    }
  ]
}
```

---

## Test 8: Sage Chat (AI Assistant)

**Purpose:** Verify OpenAI integration for client assistance.

### Steps

```bash
curl -X POST http://localhost:3001/api/sage/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What services does KAA offer?",
    "conversationHistory": [],
    "clientAddress": "123 Test Street",
    "mode": "general"
  }'
```

### Expected Response

```json
{
  "success": true,
  "response": "KAA offers comprehensive architectural...",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

### Key Logs to Check

```
Server stdout:
(No specific logs - check for errors only)
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `OpenAI not configured` | Set `OPENAI_API_KEY` in `.env` |
| Rate limit errors | Wait and retry, or check API quota |

---

## Full End-to-End UI Test

### Browser Test Steps

1. **Open App:** Navigate to `http://localhost:3000`

2. **Select Portal:** Click "Client Portal" from landing page

3. **Login:**
   - Enter Address: `Demo Project` (or created client address)
   - Enter Password/Access Code: `demo123`
   - Click "Sign In"

4. **Verify User:**
   - Confirm address displayed is correct
   - Enter Last Name: `Demo` (or actual last name)
   - Click "Continue"

5. **Portal Dashboard:**
   - Verify stats cards display (uploads, projects, etc.)
   - Check recent activity section

6. **Upload Document:**
   - Click "Upload" in navigation
   - Select a PDF file (< 10MB)
   - Choose category: "Document"
   - Add description
   - Click "Upload"
   - **Expected:** Success message, file appears in Documents

7. **View Documents:**
   - Click "Documents" in navigation
   - **Expected:** Uploaded file listed with download link

8. **Design Ideas:**
   - Click "Design Ideas" in navigation
   - Upload an image or add URL
   - **Expected:** Image displayed in gallery

9. **Sage Chat:**
   - Click chat icon
   - Send message: "Hello"
   - **Expected:** AI response within 2-3 seconds

---

## Database Verification Queries

### Notion API Queries

```bash
# List all pages in Client Credentials DB
curl https://api.notion.com/v1/databases/{CLIENT_CREDENTIALS_DB_ID}/query \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28"

# List all pages in Client Documents DB
curl https://api.notion.com/v1/databases/{CLIENT_DOCUMENTS_DB_ID}/query \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28"

# List activity log entries
curl https://api.notion.com/v1/databases/{ACTIVITY_LOG_DB_ID}/query \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28"
```

### Expected Tables Summary

| Table | Created When | Key Fields |
|-------|--------------|------------|
| `Client Credentials` | Client created | address, email, password_hash, access_code |
| `Clients` | Client created | address, last_name, email, status |
| `Client Documents` | Upload completed | name, address, category, file_url |
| `Activity Log` | Any action | activity, address, timestamp, details |

### Future Prisma Tables (When Supabase Active)

| Table | Key Fields |
|-------|------------|
| `leads` | email, project_address, recommended_tier, status |
| `projects` | client_id, tier, status, payment_status |
| `payments` | stripe_payment_intent_id, amount, status |
| `deliverables` | project_id, name, file_path, file_url |
| `milestones` | project_id, name, status, completed_at |

---

## Quick Reference: All Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/admin/clients/create` | Create client (admin) |
| POST | `/api/client/verify` | Login verification |
| POST | `/api/client/verify-user` | Two-factor verification |
| GET | `/api/client/data/:address` | Get client data + docs |
| POST | `/api/client/upload` | Upload document |
| GET | `/api/client/design-ideas/:address` | List design ideas |
| POST | `/api/client/design-ideas/upload` | Upload design idea |
| POST | `/api/client/design-ideas/add` | Add design idea URL |
| DELETE | `/api/client/design-ideas/:id` | Delete design idea |
| POST | `/api/sage/chat` | AI chat |
| GET | `/api/notion/pages` | List Notion pages |
| GET | `/api/notion/databases` | List Notion databases |

---

## Smoke Test Checklist

Copy this checklist for each test run:

```
[ ] Environment started (backend + frontend)
[ ] Health check passes
[ ] Client creation works (or using demo)
[ ] Login verification succeeds
[ ] User verification succeeds
[ ] Client data fetches correctly
[ ] Document upload succeeds
[ ] Document appears in list
[ ] Design idea upload works
[ ] Sage chat responds
[ ] Activity log entries created
[ ] Email notifications sent (if configured)
```

---

## Common Issues & Solutions

| Symptom | Cause | Solution |
|---------|-------|----------|
| `CORS error` | Frontend URL mismatch | Set `FRONTEND_URL` in backend `.env` |
| `Database not found` | First run | Databases auto-create on first request |
| `Upload fails` | File too large | Ensure file < 10MB |
| `Login fails` | Wrong credentials | Use demo mode or verify client exists |
| `Notion errors` | API key invalid | Check `NOTION_API_KEY` format |
| `Email not sent` | Credentials wrong | Verify `EMAIL_USER`/`EMAIL_PASSWORD` |
| `Chat unavailable` | OpenAI not set | Set `OPENAI_API_KEY` (optional feature) |

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2024-01-15 | 1.0 | Initial smoke test documentation |

---

*This document enables any engineer to validate the complete client journey without prior codebase knowledge.*
