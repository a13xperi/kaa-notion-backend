# RALPH - Production-Grade Autonomous Loop

Run Claude Code autonomously with circuit breakers, error detection, and safety mechanisms.

```
  ╦═╗╔═╗╦  ╔═╗╦ ╦
  ╠╦╝╠═╣║  ╠═╝╠═╣
  ╩╚═╩ ╩╩═╝╩  ╩ ╩
```

**Stack:** Warp + Cursor + Claude Code + Codex

---

## Safety Features

| Feature | Description |
|---------|-------------|
| **Circuit Breaker** | Stops loop when stuck (no progress, same error, test-only) |
| **Two-Stage Error Detection** | Filters false positives from JSON fields |
| **Progress Monitoring** | Tracks file changes to detect stalls |
| **Checkpointing** | Saves state every iteration for recovery |
| **Max Iterations** | Hard limit prevents runaway costs |
| **Manual Stop** | `./ralph stop` or create `.ralph-stop` file |

---

## Quick Start

```bash
# 1. Create task
./ralph new                  # Interactive wizard
# OR
./ralph zone frontend        # Quick zone prompt

# 2. Customize (optional)
./ralph edit                 # Opens in Cursor

# 3. Run
./ralph start 30             # 30 iterations max

# 4. Monitor
./ralph watch                # Live activity feed
```

---

## Platform Zones

| Zone | Path | Stack |
|------|------|-------|
| `frontend` | kaa-app/src | React, TypeScript, Tailwind |
| `backend` | server/ | Express, Prisma, Node.js |
| `database` | prisma/ | PostgreSQL, Supabase |
| `tests` | tests/ | Jest, Playwright |
| `fullstack` | ./ | End-to-end features |

---

## Commands

```
TASK CREATION
  ./ralph new              Interactive wizard
  ./ralph zone <zone>      Quick zone prompt
  ./ralph edit             Edit PROMPT.md in Cursor

EXECUTION
  ./ralph start [N]        Start with N iterations (default: 30)
  ./ralph parallel <zones> Run zones in parallel (tmux)
  ./ralph stop             Stop gracefully

MONITORING
  ./ralph status           Current state + circuit breaker info
  ./ralph watch            Live activity feed
  ./ralph logs [N]         Last N log entries
  ./ralph dashboard        Auto-refresh status

UTILITIES
  ./ralph reset            Clear state
  ./ralph help             Show help
```

---

## Circuit Breaker

The circuit breaker prevents infinite loops and wasted API costs.

### Thresholds (configurable in `.ralph.json`)

| Threshold | Default | Triggers When |
|-----------|---------|---------------|
| `noProgressThreshold` | 4 | No file changes for N iterations |
| `sameErrorThreshold` | 5 | Same error repeated N times |
| `testOnlyThreshold` | 5 | Only running tests, no code changes |
| `consecutiveFailures` | 3 | Response quality declining |

### When Circuit Breaker Trips

Ralph stops and provides detailed guidance:
- What triggered the breaker
- Suggested recovery actions
- Option to output `RALPH_COMPLETE` if truly done

### Configure Thresholds

```json
{
  "circuitBreaker": {
    "noProgressThreshold": 4,
    "sameErrorThreshold": 5,
    "testOnlyThreshold": 5,
    "consecutiveFailures": 3
  }
}
```

---

## Best Practices

### 1. Clear Completion Criteria
```markdown
## Success Criteria
- [ ] All CRUD endpoints working
- [ ] Tests pass (npm test)
- [ ] No TypeScript errors
- [ ] Build succeeds (npm run build)

When ALL criteria met, output: RALPH_COMPLETE
```

### 2. Incremental Phases
```markdown
## Phases
1. Database schema (then test)
2. API endpoints (then test)
3. Frontend components (then test)

Complete each phase before moving on.
```

### 3. Self-Correction Instructions
```markdown
## Workflow
1. Make a change
2. Run tests: npm test
3. If tests fail, fix before continuing
4. Commit working code
5. Move to next item
```

### 4. Escape Hatches
```markdown
## If Stuck
After 3 failed attempts at the same issue:
1. Document the blocker
2. Try a different approach
3. If blocked externally, output RALPH_COMPLETE with notes
```

---

## Warp + Cursor Workflow

**Terminal 1 (Warp) - Run:**
```bash
./ralph new
./ralph start 30
```

**Terminal 2 (Warp) - Monitor:**
```bash
./ralph watch
```

**Cursor:**
- Watch files update in real-time
- Use diff view to review changes
- AI chat for quick questions

---

## Configuration

Edit `.ralph.json`:

```json
{
  "maxIterations": 30,
  "completionPromise": "RALPH_COMPLETE",

  "circuitBreaker": {
    "noProgressThreshold": 4,
    "sameErrorThreshold": 5,
    "testOnlyThreshold": 5,
    "consecutiveFailures": 3
  },

  "safety": {
    "createCheckpoints": true,
    "maxCheckpoints": 10
  }
}
```

### Environment Variables

Override thresholds without editing config:

```bash
export RALPH_CB_NO_PROGRESS=6      # More lenient
export RALPH_CB_SAME_ERROR=3       # Stricter
export RALPH_DEBUG=1               # Enable debug logging
```

---

## Files

```
project/
├── ralph                    # CLI
├── PROMPT.md               # Current task
├── .ralph.json             # Configuration
├── .ralph-output.log       # Activity log
├── .ralph-stop             # Create to stop loop
└── .ralph/
    ├── platform.json       # Platform config
    ├── agents/             # Agent configs
    └── prompts/            # Zone templates

~/.ralph/
├── state.json              # Current state
├── ralph.log               # Full log history
└── checkpoints/            # State checkpoints
```

---

## Cost Estimates

| Iterations | Est. Cost | Use Case |
|------------|-----------|----------|
| 10 | $5-15 | Quick fix |
| 30 | $15-50 | Feature |
| 50 | $25-100 | Large feature |
| 100+ | $50-200+ | Major work |

**Tip:** Start with 10-20 iterations to calibrate, then increase.

---

## Troubleshooting

### Loop exits immediately
```bash
./ralph reset
./ralph start
```

### Circuit breaker trips
```bash
./ralph status              # See which threshold
./ralph logs 20             # Check recent activity
./ralph edit                # Adjust prompt
./ralph reset
./ralph start
```

### Check what's happening
```bash
./ralph status              # State + circuit breaker
./ralph watch               # Live feed
tail -f ~/.ralph/ralph.log  # Full logs
```

### Force stop
```bash
./ralph stop                # Graceful
# OR
touch .ralph-stop           # Creates stop signal
# OR
Ctrl+C                      # Immediate
```

---

## Example Session

```bash
# Morning: Start big feature
./ralph new
# Zone: fullstack
# Task: "Add user authentication with JWT"
./ralph start 40

# Go to meetings...

# Check progress
./ralph status
# Shows: Iteration 15/40, circuit breaker: closed

# Evening: Review
git diff
npm test
git add . && git commit -m "feat: Add JWT auth"
```

---

## Quick Reference

```bash
./ralph new                 # Interactive wizard
./ralph zone frontend       # Quick zone
./ralph edit                # Edit prompt
./ralph start 30            # Run loop
./ralph parallel fe be      # Parallel zones
./ralph status              # State + safety info
./ralph watch               # Live feed
./ralph stop                # Stop gracefully
./ralph reset               # Clear all
```

---

## Sources

Based on best practices from:
- [Ralph Wiggum - Awesome Claude](https://awesomeclaude.ai/ralph-wiggum)
- [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code)
- [AI Agent Safety: Circuit Breakers](https://www.syntaxia.com/post/ai-agent-safety-circuit-breakers-for-autonomous-systems)
- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks)

---

*"Me fail English? That's unpossible!"*
*Also Ralph: Ships production code with circuit breakers.*
