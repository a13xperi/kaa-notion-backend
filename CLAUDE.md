# Claude Code Instructions

## Multi-Agent Coordination

This repository supports multi-agent Claude Code workflows. **Before starting work, check if you've been assigned an agent number.**

If the human says "You are Agent [N]", read and follow the full protocol in:
- **[CLAUDE-CODE-MULTI-AGENT.md](./CLAUDE-CODE-MULTI-AGENT.md)**

### Quick Reference

| Agent | Scope |
|-------|-------|
| 1 | `/server/src/routes/*`, `/server/src/middleware/*` |
| 2 | `/server/src/services/*`, `/server/src/utils/*`, `/server/src/config/*` |
| 3 | `/kaa-app/src/components/*`, `/kaa-app/src/pages/*` |
| 4 | `/kaa-app/src/api/*`, `/kaa-app/src/contexts/*`, `/kaa-app/src/hooks/*` |
| 5 | `/shared/*`, `/prisma/*`, `/e2e/*`, `/scripts/*` |

### If No Agent Number Assigned

If you're working solo (no agent number given), you can work normally across the codebase. The multi-agent protocol only applies when explicitly activated.

---

## Project Overview

**SAGE MVP Platform** - Tiered landscape architecture services with hybrid Postgres/Notion architecture.

### Tech Stack
- **Frontend:** React + TypeScript (`kaa-app/`)
- **Backend:** Node.js + Express (`server/`)
- **Database:** Supabase Postgres + Notion API
- **ORM:** Prisma

### Key Directories
```
kaa-app/src/          # React frontend
server/src/           # Express backend
prisma/               # Database schema
shared/               # Shared types
coordination/         # Multi-agent coordination files
```

### Common Commands
```bash
npm run dev           # Start dev servers
npm test              # Run tests
npm run prisma:studio # Database GUI
```

---

## Code Style

See `.cursorrules` for detailed conventions. Key points:
- TypeScript strict mode
- Functional React components
- React Query for server state
- Prisma for database access
- Always handle errors appropriately
