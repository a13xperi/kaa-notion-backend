# Claude Code Multi-Agent Coordination Protocol

> **Add this file to your repository root. Each Claude Code instance reads this at session start.**

## Prerequisites (One-Time Setup)

Before using multi-agent coordination, ensure the `integration` branch exists:

```bash
# Create integration branch from your default branch
git fetch origin portal-auth-upload
git checkout -b integration origin/portal-auth-upload
git push -u origin integration
```

Or via GitHub UI: Create branch `integration` from `portal-auth-upload`.

---

## Agent Identity

When starting a session, the human operator assigns you an agent number:

```
I am Agent [1-5]. My designated scope is: [SCOPE]
Branch: agent-[N]/[feature-name]
```

**If no agent number is assigned, ASK before proceeding.**

---

## Hard Rules (Never Violate)

1. **NEVER commit directly to `main` or `integration`** - Always use your agent branch
2. **NEVER modify files outside your designated scope** - Request changes via coordination file
3. **NEVER change interface contracts without sync** - These are locked unless all agents agree
4. **NEVER work longer than 60 minutes without committing** - Merge conflicts grow exponentially
5. **NEVER assume another agent's code works** - Pull latest integration before depending on it

---

## Directory Ownership

This codebase is a monorepo with backend (server/), frontend (kaa-app/), and shared code.

```
/coordination/                    <- ALL AGENTS: Read/write coordination files

# Agent 1: Backend Routes & Auth
/server/src/routes/*              <- Agent 1 ONLY
/server/src/middleware/*          <- Agent 1 ONLY
/server/src/routes/__tests__/*    <- Agent 1 ONLY (tests mirror source)

# Agent 2: Backend Services & Utils
/server/src/services/*            <- Agent 2 ONLY
/server/src/utils/*               <- Agent 2 ONLY
/server/src/config/*              <- Agent 2 ONLY

# Agent 3: Frontend Components & Pages
/kaa-app/src/components/*         <- Agent 3 ONLY
/kaa-app/src/pages/*              <- Agent 3 ONLY

# Agent 4: Frontend API, State & Hooks
/kaa-app/src/api/*                <- Agent 4 ONLY
/kaa-app/src/contexts/*           <- Agent 4 ONLY
/kaa-app/src/hooks/*              <- Agent 4 ONLY
/kaa-app/src/utils/*              <- Agent 4 ONLY

# Agent 5: Shared, Database & E2E
/shared/*                         <- Agent 5 ONLY
/prisma/*                         <- Agent 5 ONLY
/e2e/*                            <- Agent 5 ONLY
/kaa-app/e2e/*                    <- Agent 5 ONLY
/scripts/*                        <- Agent 5 ONLY

# Any Agent (non-conflicting)
/docs/*                           <- Any agent
```

**Shared files requiring lock acquisition:**

- `/package.json`
- `/server/package.json`
- `/kaa-app/package.json`
- `/tsconfig.json`
- `/server/src/types/*`
- `/kaa-app/src/types/*`
- `/shared/types/*`
- `/env.example`
- Any config at root level

---

## Workflow Protocol

### Session Start Checklist

When human starts your Claude Code session:

```bash
# 1. Confirm identity
# Human should say: "You are Agent [N], your scope is [paths]"

# 2. Fetch latest
git fetch origin

# 3. Update integration branch
git checkout integration
git pull origin integration

# 4. Create or update your feature branch
git checkout -b agent-[N]/[feature] integration
# OR if continuing:
git checkout agent-[N]/[feature]
git rebase integration

# 5. Check coordination status
cat coordination/status.md

# 6. Announce your work
# Update coordination/status.md with your current task
```

### Every 30-60 Minutes (Set a Timer)

```bash
# 1. Commit your work
git add -A
git commit -m "Agent [N]: [description]"

# 2. Push your branch
git push origin agent-[N]/[feature]

# 3. Rebase on integration (if others have merged)
git fetch origin
git rebase origin/integration

# 4. Update coordination status
# Edit coordination/status.md with current state

# 5. Check for requests from other agents
cat coordination/requests.md
```

### When Your Task is Complete

```bash
# 1. Final commit and push
git add -A
git commit -m "Agent [N]: Complete [feature]"
git push origin agent-[N]/[feature]

# 2. Merge to integration
git checkout integration
git pull origin integration
git merge agent-[N]/[feature]
git push origin integration

# 3. Update status to COMPLETE in coordination/status.md

# 4. Notify human: "Task complete. Ready for next assignment."
```

---

## Coordination Files

All coordination files are in `/coordination/` directory:

- `status.md` - Current agent status and blockers
- `requests.md` - Cross-agent requests
- `locks.md` - File locks for shared resources
- `contracts.md` - Interface contracts between modules
- `backlog.md` - Task queue

---

## Conflict Resolution

### Prevention (Preferred)

1. **Stay in your lane** - Only modify files in your scope
2. **Small commits** - Easier to rebase/merge
3. **Frequent sync** - Rebase on integration every 30-60 min
4. **Lock shared files** - Use locks.md for configs

### When Conflicts Occur

```bash
# 1. Don't panic - save your work
git stash

# 2. Get clean integration
git checkout integration
git pull origin integration

# 3. Create fresh branch from your changes
git checkout -b agent-[N]/[feature]-v2
git stash pop

# 4. If conflict is in YOUR scope
# Resolve it yourself, you own that code

# 5. If conflict is in ANOTHER agent's scope
# Do NOT resolve - add request to coordination/requests.md
# That agent must resolve conflicts in their domain

# 6. If conflict is in shared file
# Add to coordination/requests.md and wait for human coordination
```

---

## Claude Code Session Prompts

Human operators: Use these prompts when starting each Claude Code instance.

### Agent 1 Start Prompt

```
You are Agent 1 in a multi-agent Claude Code setup.

Read CLAUDE-CODE-MULTI-AGENT.md for full protocol.

Your scope:
- /server/src/routes/*
- /server/src/middleware/*
- Related __tests__/ directories

Your branch: agent-1/[feature-name]
Do NOT touch files outside your scope.

Current task: [DESCRIBE TASK]

Start by:
1. git fetch && git checkout integration && git pull
2. Create/checkout your branch
3. Check coordination/status.md
4. Update status.md with your task
5. Begin work
```

### Agent 2 Start Prompt

```
You are Agent 2 in a multi-agent Claude Code setup.

Read CLAUDE-CODE-MULTI-AGENT.md for full protocol.

Your scope:
- /server/src/services/*
- /server/src/utils/*
- /server/src/config/*
- Related __tests__/ directories

Your branch: agent-2/[feature-name]
Do NOT touch files outside your scope.

Current task: [DESCRIBE TASK]

Start by:
1. git fetch && git checkout integration && git pull
2. Create/checkout your branch
3. Check coordination/status.md
4. Update status.md with your task
5. Begin work
```

### Agent 3 Start Prompt

```
You are Agent 3 in a multi-agent Claude Code setup.

Read CLAUDE-CODE-MULTI-AGENT.md for full protocol.

Your scope:
- /kaa-app/src/components/*
- /kaa-app/src/pages/*
- Related __tests__/ directories

Your branch: agent-3/[feature-name]
Do NOT touch files outside your scope.

Current task: [DESCRIBE TASK]

Start by:
1. git fetch && git checkout integration && git pull
2. Create/checkout your branch
3. Check coordination/status.md
4. Update status.md with your task
5. Begin work
```

### Agent 4 Start Prompt

```
You are Agent 4 in a multi-agent Claude Code setup.

Read CLAUDE-CODE-MULTI-AGENT.md for full protocol.

Your scope:
- /kaa-app/src/api/*
- /kaa-app/src/contexts/*
- /kaa-app/src/hooks/*
- /kaa-app/src/utils/*
- Related __tests__/ directories

Your branch: agent-4/[feature-name]
Do NOT touch files outside your scope.

Current task: [DESCRIBE TASK]

Start by:
1. git fetch && git checkout integration && git pull
2. Create/checkout your branch
3. Check coordination/status.md
4. Update status.md with your task
5. Begin work
```

### Agent 5 Start Prompt

```
You are Agent 5 in a multi-agent Claude Code setup.

Read CLAUDE-CODE-MULTI-AGENT.md for full protocol.

Your scope:
- /shared/*
- /prisma/*
- /e2e/*
- /kaa-app/e2e/*
- /scripts/*

Your branch: agent-5/[feature-name]
Do NOT touch files outside your scope.

Current task: [DESCRIBE TASK]

Start by:
1. git fetch && git checkout integration && git pull
2. Create/checkout your branch
3. Check coordination/status.md
4. Update status.md with your task
5. Begin work
```

---

## Testing Protocol

### Test Isolation

Each agent runs tests only for their scope:

```bash
# Agent 1 - Backend routes/middleware
npm test -- --testPathPattern="routes|middleware"

# Agent 2 - Backend services/utils/config
npm test -- --testPathPattern="services|utils|config"

# Agent 3 - Frontend components/pages
cd kaa-app && npm test -- --testPathPattern="components|pages"

# Agent 4 - Frontend API/contexts/hooks
cd kaa-app && npm test -- --testPathPattern="api|contexts|hooks"

# Agent 5 - E2E tests
npm run test:e2e
```

### Before Merging to Integration

```bash
# Run full test suite
npm test

# If tests fail outside your scope:
# 1. Do NOT fix them
# 2. Add note to coordination/requests.md
# 3. Notify human operator
# 4. Do NOT merge until resolved
```

---

## Quick Reference Card

```
+----------------------------------------------------------+
| CLAUDE CODE MULTI-AGENT QUICK REFERENCE                  |
+----------------------------------------------------------+
| START SESSION:                                           |
|   1. Confirm "I am Agent [N]"                           |
|   2. git fetch && git rebase origin/integration         |
|   3. Check coordination/status.md                       |
|   4. Update status with your task                       |
+----------------------------------------------------------+
| EVERY 30-60 MIN:                                         |
|   1. git commit && git push                             |
|   2. git fetch && git rebase origin/integration         |
|   3. Update coordination/status.md                      |
|   4. Check coordination/requests.md                     |
+----------------------------------------------------------+
| NEED SOMETHING FROM ANOTHER AGENT?                       |
|   -> Add request to coordination/requests.md            |
|   -> Do NOT modify their files                          |
|   -> Continue with other work if possible               |
+----------------------------------------------------------+
| MODIFYING SHARED FILE (package.json, types, configs)?   |
|   -> Check coordination/locks.md first                  |
|   -> Add your lock BEFORE editing                       |
|   -> Remove lock AFTER pushing                          |
+----------------------------------------------------------+
| CONFLICT IN YOUR SCOPE? -> Resolve it yourself          |
| CONFLICT IN OTHER SCOPE? -> Add to requests.md, wait    |
+----------------------------------------------------------+
```

---

**Version:** 1.0
**Last Updated:** 2025-01-11
**For Use With:** Claude Code (Anthropic)
