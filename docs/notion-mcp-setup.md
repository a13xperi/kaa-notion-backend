# Notion MCP Setup Guide

**Last Updated:** 2024-12-28

---

## Overview

Notion MCP (Model Context Protocol) gives AI tools (Cursor, Claude Code) secure read/write access to your Notion workspace via OAuth. This allows AI assistants to read your roadmap, documentation, and project plans directly from Notion.

---

## What is MCP?

MCP is a protocol that allows AI tools to connect to external services (like Notion) securely. It uses OAuth for authentication and provides a standardized way for AI tools to interact with Notion.

---

## Setup Methods

### Option A: Connect via Notion App (Fastest)

**Steps:**

1. Open Notion app (desktop or web)
2. Go to **Settings** → **Connections**
3. Find **Notion MCP** section
4. Click **Connect** next to your AI tool:
   - **Cursor** (if using Cursor IDE)
   - **Claude Code** (if using Claude Code CLI)
5. Complete OAuth flow:
   - Authorize Notion to share data with the AI tool
   - Grant access to specific pages or entire workspace
6. Verify connection in your AI tool

**Benefits:**
- Fastest setup
- Visual interface
- Easy to manage permissions

---

### Option B: Connect via Claude Code CLI

**Steps:**

1. Install Claude Code (see `docs/claude-code-setup.md`)
2. Run connection command:

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

3. Follow OAuth prompts in terminal
4. Authorize access in browser
5. Verify connection:

```bash
claude mcp list
```

**Benefits:**
- Command-line interface
- Good for automation
- Works with CI/CD (if needed)

---

## Testing the Connection

### Test 1: Read a Page

```bash
claude -p "Find the SAGE Integration Roadmap page and summarize Phase 1 deliverables"
```

If Claude can read and summarize the page, the connection is working.

### Test 2: Search for Pages

```bash
claude -p "Search for all pages related to SAGE MVP in Notion"
```

### Test 3: Read Database

```bash
claude -p "Read the SAGE System Inventory database and list all entries"
```

---

## Required Notion Pages

For SAGE MVP development, ensure the following pages are accessible:

1. **SAGE Integration Roadmap** - Main project plan
2. **SAGE System Inventory** - System audit database
3. **Tier Router Rules** - Tier assignment logic
4. **SAGE Beta Bugs** - Bug tracking (for beta phase)

**Access Level:**
- AI tools need **Read** access (minimum)
- **Write** access optional (for updating status, creating tasks)

---

## Managing Permissions

### Grant Access to Specific Pages

1. Open page in Notion
2. Click **Share** button (top right)
3. Add integration (your Notion MCP integration)
4. Set permission: **Can view** or **Can edit**

### Grant Access to Entire Workspace

1. Go to **Settings** → **Connections** → **Notion MCP**
2. Select your integration
3. Choose **Full workspace access** or **Specific pages**
4. Save changes

---

## Security Considerations

### Least Privilege

- Only grant access to pages that AI tools need
- Use **Can view** unless write access is required
- Review access periodically

### OAuth Security

- OAuth tokens are stored securely by the AI tool
- Tokens can be revoked in Notion settings
- Re-authentication required if token expires

---

## Troubleshooting

### Connection Not Working

**Symptoms:**
- AI tool can't find Notion pages
- "Permission denied" errors
- OAuth flow fails

**Solutions:**

1. **Verify Integration Exists:**
   - Go to Notion → Settings → Connections
   - Check if integration is listed
   - If not, create new integration

2. **Check Page Access:**
   - Ensure pages are shared with integration
   - Verify integration has correct permissions

3. **Reconnect:**
   - Remove connection in AI tool
   - Re-add connection
   - Complete OAuth flow again

4. **Check Notion API Status:**
   - Visit https://status.notion.so
   - Verify API is operational

### Pages Not Found

**Symptoms:**
- AI tool can't find specific pages
- Search returns no results

**Solutions:**

1. **Verify Page Names:**
   - Check exact page titles
   - Use Notion search to verify page exists

2. **Check Sharing:**
   - Ensure page is shared with integration
   - Check if page is in a private workspace

3. **Use Page IDs:**
   - If page name search fails, use page ID
   - Find page ID in page URL: `notion.so/[PAGE_ID]`

---

## Use Cases for SAGE MVP

### 1. Read Roadmap

```bash
claude -p "Read the SAGE Integration Roadmap and tell me what Phase 2 tasks are"
```

### 2. Update Status

```bash
claude -p "Mark Phase 1.2 as complete in the SAGE Integration Roadmap"
```

### 3. Create Tasks

```bash
claude -p "Create a new task in the SAGE System Inventory database for 'Set up Supabase project'"
```

### 4. Read Documentation

```bash
claude -p "Read the Tier Router Rules page and summarize the routing logic"
```

---

## Integration with Development Workflow

### During Planning

- AI reads roadmap from Notion
- Extracts requirements
- Creates implementation plan

### During Development

- AI references Notion docs
- Updates status in Notion
- Creates tasks as needed

### During Review

- AI reads updated roadmap
- Verifies completion
- Updates documentation

---

## Resources

- [Notion MCP Documentation](https://developers.notion.com/docs/mcp)
- [Notion MCP Getting Started](https://developers.notion.com/docs/get-started-with-mcp)
- [Notion API Documentation](https://developers.notion.com/reference)

---

## Next Steps

1. ✅ Connect Notion MCP (choose Option A or B)
2. ✅ Test connection (run test commands)
3. ✅ Grant access to required pages
4. ✅ Verify AI tools can read roadmap
5. ✅ Start using in development workflow
