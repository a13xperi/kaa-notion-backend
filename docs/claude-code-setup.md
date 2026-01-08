# Claude Code Setup Guide

**Last Updated:** 2024-12-28

---

## Overview

Claude Code is an agentic coding tool that can edit files, run commands, and work in your terminal. It supports connecting external tools via MCP (Model Context Protocol).

---

## Installation

### macOS/Linux/WSL

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

### npm (Alternative)

```bash
npm install -g @anthropic-ai/claude-code
```

---

## Verification

### Test Installation

```bash
claude --version
```

### Test Basic Command

```bash
claude -p "Summarize this repository"
```

---

## Core CLI Patterns

### Interactive Mode

```bash
claude
```

Starts an interactive session where you can have a conversation with Claude Code.

### One-Shot Commands

```bash
claude -p "Your prompt here"
```

Runs a single command and exits.

### Continue in Directory

```bash
claude -c
```

Continues the previous conversation in the current directory.

---

## Connecting to Notion MCP

### Option A: Connect via Notion App (Recommended)

1. Open Notion app
2. Go to **Settings** → **Connections** → **Notion MCP**
3. Choose your AI tool (Cursor / Claude Code)
4. Complete OAuth flow
5. Grant access to required pages

### Option B: Connect via Claude Code CLI

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

### Test Connection

```bash
claude -p "Find the SAGE Integration Roadmap page and summarize Phase 1 deliverables"
```

If Claude can read the page, the connection is working.

---

## Common Use Cases

### Template A: Implement Feature from Notion Spec

```bash
claude -p "Read the Notion MCP docs connected in this repo. Find the SAGE Integration Roadmap page and extract requirements for Phase 3. Then implement the MVP client portal login + dashboard + deliverable download. Plan first, list files, then implement in small commits. Add tests."
```

### Template B: Create DB Schema + Migrations

```bash
claude -p "Create a Postgres schema for leads, clients, users, projects, milestones, deliverables, payments. Generate migrations and a short data model doc in /docs/data-model.md."
```

### Template C: Stripe Checkout + Webhooks

```bash
claude -p "Implement Stripe Checkout for Tier 1. Add a checkout endpoint, success/cancel pages, and a webhook handler that validates signature and provisions the user + project. Include local testing steps with stripe-cli."
```

---

## Integration with Cursor

Claude Code can work alongside Cursor:

- **Cursor:** Primary IDE for development
- **Claude Code:** Terminal agent for scaffolding, refactors, one-off tasks

Both can connect to Notion MCP for reading roadmap and documentation.

---

## Troubleshooting

### Connection Issues

- Verify Notion integration has access to required pages
- Check MCP connection status: `claude mcp list`
- Reconnect if needed: `claude mcp remove notion` then re-add

### Permission Issues

- Ensure Notion pages are shared with the integration
- Check integration permissions in Notion settings

---

## Resources

- [Claude Code Documentation](https://code.claude.com/docs/en/overview)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Notion MCP Documentation](https://developers.notion.com/docs/mcp)
