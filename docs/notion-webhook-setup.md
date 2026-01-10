# Notion Webhook Setup Guide

This guide explains how to set up and use Notion webhooks for bidirectional sync between Notion and Postgres.

## Overview

Notion webhooks allow the application to receive real-time updates when pages or databases are modified in Notion. This enables automatic synchronization of data from Notion back to Postgres, completing the bidirectional sync loop.

## Architecture

```
Notion Page Update
    ↓
Notion Webhook Event
    ↓
POST /api/webhooks/notion
    ↓
Idempotency Check (AuditLog)
    ↓
Fetch Full Page from Notion API
    ↓
Compare with Postgres
    ↓
Sync Name/Status to Postgres (if newer)
    ↓
Log to AuditLog
```

## Setup Process

### 1. Configure Webhook in Notion

1. Go to your Notion workspace settings
2. Navigate to "Connections" → "Integrations"
3. Find your integration and click "Manage"
4. Go to "Webhooks" section
5. Click "Add webhook"
6. Enter your webhook URL: `https://yourdomain.com/api/webhooks/notion`
7. Select events to subscribe to:
   - `page.updated`
   - `database.updated` (optional, for database-level changes)
8. Save the webhook

### 2. Verify Webhook Challenge

When you first create the webhook, Notion will send a challenge request:

```json
{
  "type": "webhook_challenge",
  "challenge": "random-challenge-token"
}
```

The endpoint automatically responds with:

```json
{
  "challenge": "random-challenge-token"
}
```

This verifies that your endpoint is accessible and ready to receive webhooks.

### 3. Test Webhook

After setup, update a Notion page that's linked to a project (has `notionPageId` in Postgres). The webhook should:

1. Receive the `page.updated` event
2. Check idempotency (skip if already processed)
3. Fetch full page details from Notion API
4. Compare `name` and `status` with Postgres
5. Update Postgres if Notion has newer data
6. Log the sync action to AuditLog

## Webhook Events

### Page Updated Event

```json
{
  "type": "page.updated",
  "object": {
    "id": "notion-page-id",
    "last_edited_time": "2025-01-10T12:00:00.000Z",
    "properties": {
      "Name": {
        "type": "title",
        "title": [
          {
            "type": "text",
            "plain_text": "Updated Project Name"
          }
        ]
      },
      "Status": {
        "type": "select",
        "select": {
          "name": "IN_PROGRESS"
        }
      }
    }
  }
}
```

### Database Updated Event

```json
{
  "type": "database.updated",
  "object": {
    "id": "notion-database-id",
    "last_edited_time": "2025-01-10T12:00:00.000Z"
  }
}
```

## Idempotency

The webhook endpoint implements idempotency checks to prevent duplicate processing:

1. **Primary Check**: Compares `last_edited_time` from Notion with the most recent audit log entry
2. **Fallback Check**: If timestamps are unavailable, checks if event was processed within the last 60 seconds
3. **Skip Logic**: If the event is older than or equal to the last processed event, it's skipped

This ensures that:
- Duplicate webhook deliveries don't cause duplicate updates
- Race conditions are avoided
- Only newer Notion updates override Postgres data

## Sync Logic

When a `page.updated` event is received:

1. **Find Linked Project**: Query Postgres for a project with matching `notionPageId`
2. **Fetch Full Page**: Retrieve complete page details from Notion API (webhook payload may be partial)
3. **Extract Properties**:
   - `Name` property → `project.name`
   - `Status` property → `project.status` (mapped via `mapNotionStatusToPostgres()`)
4. **Compare Timestamps**: Only update if Notion's `last_edited_time` is newer than Postgres `updatedAt`
5. **Update Postgres**: Update project record if changes detected
6. **Log Action**: Create audit log entry with sync details

## Error Handling

- **Page Not Linked**: If a Notion page update is received but no linked project exists, the event is logged but no sync occurs
- **Notion API Errors**: If fetching page details fails, the webhook payload is used as fallback
- **Database Errors**: Database errors are logged and the webhook responds with success (to prevent Notion retries) but includes error details
- **Missing API Key**: If `NOTION_API_KEY` is not configured, webhook is accepted but processing is skipped

## Monitoring

All webhook events are logged to the `AuditLog` table with:
- `action`: `'notion_webhook'`
- `resourceType`: `'notion_page'`
- `resourceId`: Notion page ID
- `details`: Full event payload and sync results

Query recent webhook events:

```sql
SELECT * FROM audit_logs
WHERE action = 'notion_webhook'
ORDER BY created_at DESC
LIMIT 100;
```

## Reconciliation

Use the `/api/admin/sync/health` endpoint to compare Notion and Postgres data and identify discrepancies:

```bash
curl -X GET \
  https://yourdomain.com/api/admin/sync/health \
  -H "Authorization: Bearer <admin-token>"
```

This provides:
- Count of projects in Postgres vs Notion
- List of discrepancies (name/status mismatches)
- Orphaned pages (Notion pages not linked to projects)
- Sync status health indicator

## Troubleshooting

### Webhook Not Receiving Events

1. **Check Webhook Status**: Verify webhook is active in Notion settings
2. **Verify URL**: Ensure webhook URL is publicly accessible (use ngrok for local testing)
3. **Check Logs**: Review server logs for incoming webhook requests
4. **Test Challenge**: Manually send a challenge request to verify endpoint is working

### Events Not Syncing

1. **Check Project Link**: Verify project has `notionPageId` set in Postgres
2. **Check Idempotency**: Query audit logs to see if event was already processed
3. **Check Timestamps**: Verify Notion `last_edited_time` is actually newer than Postgres `updatedAt`
4. **Check Notion API**: Verify `NOTION_API_KEY` is configured and valid
5. **Check Property Names**: Ensure Notion page has `Name` and `Status` properties with correct names

### Duplicate Updates

If duplicate updates occur:

1. **Check Idempotency Logic**: Verify timestamp comparison is working correctly
2. **Check Audit Logs**: Look for duplicate `notion_webhook` entries
3. **Review Webhook Configuration**: Ensure only one webhook is configured for the integration

## Security Considerations

- **Webhook Verification**: Currently, webhook payloads are not verified with signatures. For production, consider implementing Notion webhook signature verification
- **Rate Limiting**: Webhook endpoints should not be rate-limited (they use the `/api/webhooks/notion` path which bypasses rate limiting)
- **Idempotency**: Always implement idempotency checks to prevent duplicate processing
- **Audit Logging**: All webhook events should be logged for audit purposes

## Related Documentation

- [API Reference - Webhook Endpoints](./API_REFERENCE.md#webhook-endpoints)
- [API Reference - Notion Sync Endpoints](./API_REFERENCE.md#notion-sync-endpoints)
- [API Reference - Admin Sync Endpoints](./API_REFERENCE.md#admin-sync-endpoints)
- [Notion MCP Setup](./notion-mcp-setup.md)
- [Sync Strategy](./sync-strategy.md)