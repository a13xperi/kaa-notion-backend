# RALPH - Multi-Agent Platform Orchestrator

Run autonomous AI loops across your entire platform.

```
  ╦═╗╔═╗╦  ╔═╗╦ ╦
  ╠╦╝╠═╣║  ╠═╝╠═╣
  ╩╚═╩ ╩╩═╝╩  ╩ ╩
```

**Your Stack:** Warp + Cursor + Claude Code + Codex

---

## Platform Zones

| Zone | Path | Stack |
|------|------|-------|
| `frontend` | kaa-app/src | React, TypeScript, Tailwind |
| `backend` | server/ | Express, Prisma, Node.js |
| `database` | prisma/ | PostgreSQL, Supabase |
| `tests` | tests/ | Jest, Playwright |
| `fullstack` | ./ | All of the above |

---

## Quick Start

### Option 1: Interactive (Recommended)
```bash
./ralph new
```
Select zone → Describe task → Start

### Option 2: Quick Zone
```bash
./ralph zone frontend        # Generate prompt for zone
./ralph edit                 # Customize in Cursor
./ralph start 30             # Run 30 iterations
```

### Option 3: Parallel (Advanced)
```bash
./ralph parallel frontend backend
```
Runs both zones simultaneously in tmux.

---

## Commands

```
TASK CREATION
  ./ralph new              Interactive wizard
  ./ralph zone <zone>      Quick: frontend|backend|database|tests|fullstack
  ./ralph edit             Edit PROMPT.md in Cursor

EXECUTION
  ./ralph start [N]        Start with N iterations (default: 30)
  ./ralph parallel <zones> Run multiple zones in parallel
  ./ralph stop             Stop gracefully

MONITORING
  ./ralph status           Current state
  ./ralph watch            Live activity feed
  ./ralph logs [N]         Last N log entries
  ./ralph dashboard        Auto-refresh status

UTILITIES
  ./ralph reset            Clear state
  ./ralph help             Show help
```

---

## Workflows

### Single Zone

**Frontend:**
```bash
./ralph zone frontend
# Edit PROMPT.md: "Build user profile page with avatar upload"
./ralph start 25
```

**Backend:**
```bash
./ralph zone backend
# Edit: "Create CRUD endpoints for milestones"
./ralph start 20
```

**Full-Stack:**
```bash
./ralph new
# Select: fullstack
# Describe: "Add notifications with email + in-app"
./ralph start 50
```

### Parallel Zones

```bash
# Run frontend and backend simultaneously
./ralph parallel frontend backend

# Attach to see both panes
tmux attach -t ralph-parallel-*

# tmux controls:
# Ctrl+B → D     Detach (keeps running)
# Ctrl+B → ←/→   Switch panes
# Ctrl+B → z     Zoom current pane
```

---

## Warp + Cursor Flow

### Warp Terminal 1 - Ralph
```bash
./ralph new           # Create task
./ralph start 30      # Launch
```

### Warp Terminal 2 - Monitor
```bash
./ralph watch         # Live feed
```

### Cursor
- Files update in real-time as Claude works
- Use diff view to review changes
- AI chat for quick questions

---

## Writing Good Prompts

### Example (Good)
```markdown
# Task: Add dark mode to settings

## Objective
Toggle that persists user preference.

## Requirements
1. Toggle switch in Settings page
2. Theme context provider
3. Persist to localStorage
4. Apply to all components

## Success Criteria
- [ ] Toggle works
- [ ] Theme persists on refresh
- [ ] All components styled
- [ ] Tests pass

When complete, output: RALPH_COMPLETE
```

### Bad Examples
```markdown
# Too vague
Make the app look better.

# No success criteria
Add some features.
```

---

## Files

```
project/
├── ralph                    # CLI
├── PROMPT.md               # Current task
├── .ralph.json             # Config
├── .ralph-output.log       # Activity
└── .ralph/
    ├── platform.json       # Platform config
    ├── agents/             # Agent configs
    │   ├── claude-code.json
    │   └── codex.json
    └── prompts/            # Zone templates
        ├── frontend.md
        ├── backend.md
        ├── fullstack.md
        └── tests.md
```

---

## Cost Estimates

| Iterations | Est. Cost | Use Case |
|------------|-----------|----------|
| 10 | $5-15 | Small fix |
| 30 | $15-50 | Feature |
| 50 | $25-100 | Large feature |

---

## Troubleshooting

**Loop exits immediately:**
```bash
./ralph reset && ./ralph start
```

**Stuck on same error:**
```bash
./ralph stop
./ralph edit  # Add more specific instructions
./ralph start
```

**Check activity:**
```bash
./ralph watch
./ralph logs 100
```

---

## Example Session

```bash
# Morning
./ralph new
# Zone: fullstack
# Task: "Add project timeline with milestones"
./ralph start 50

# Go to meetings...

# Afternoon
./ralph status

# Evening - Review in Cursor
git diff
npm test
```

---

## Quick Reference

```bash
./ralph new                 # Create task (interactive)
./ralph zone frontend       # Quick zone prompt
./ralph edit                # Edit in Cursor
./ralph start 30            # Run loop
./ralph parallel fe be      # Parallel zones
./ralph status              # Check state
./ralph watch               # Live feed
./ralph stop                # Stop gracefully
./ralph reset               # Clear all
```

---

*"Me fail English? That's unpossible!"*
*Also Ralph: Ships your entire platform while you sleep.*
