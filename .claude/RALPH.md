# Ralph Wiggum Loop

An autonomous development loop for Claude Code that iterates on tasks until completion.

## Overview

The Ralph loop uses a Stop hook to intercept Claude's exit attempts and re-feed the prompt, allowing Claude to work autonomously for extended periods until a task is complete.

**Named after:** Ralph Wiggum from The Simpsons, embodying the philosophy of persistent iteration despite setbacks.

**Philosophy:** "Iteration beats perfection" - failures are learning data, and the loop converges toward success.

## Quick Start

```bash
# 1. Edit PROMPT.md with your task
vim PROMPT.md

# 2. Edit @fix_plan.md with your task breakdown
vim @fix_plan.md

# 3. Initialize the loop
./scripts/ralph.sh start 30  # 30 iterations max

# 4. Start Claude Code
claude "$(cat PROMPT.md)"

# 5. Walk away - Claude will iterate until done
```

## Files

| File | Purpose |
|------|---------|
| `PROMPT.md` | Your task instructions (read each iteration) |
| `@fix_plan.md` | Progress tracking across iterations |
| `.claude/hooks/stop-hook.sh` | The loop mechanism |
| `.claude/settings.json` | Hook configuration |
| `scripts/ralph.sh` | Management script |

## Management Commands

```bash
./scripts/ralph.sh start [max]  # Start with optional max iterations
./scripts/ralph.sh stop         # Stop gracefully on next iteration
./scripts/ralph.sh status       # Show current status
./scripts/ralph.sh reset        # Reset iteration counter
./scripts/ralph.sh logs         # View loop logs
```

## Writing Good Prompts

### Do: Clear Completion Criteria

```markdown
## Success Criteria
- [ ] All CRUD endpoints working
- [ ] Tests passing (coverage > 80%)
- [ ] No TypeScript errors

When complete, output: <promise>COMPLETE</promise>
```

### Do: Incremental Goals

```markdown
## Phases
1. User authentication (JWT, tests)
2. Product catalog (CRUD, tests)
3. Shopping cart (add/remove, tests)

Complete each phase before moving to the next.
```

### Do: Self-Correction Instructions

```markdown
## Workflow
1. Write failing tests
2. Implement feature
3. Run tests: `npm test`
4. If any fail, debug and fix
5. Repeat until all green
```

### Don't: Vague Instructions

```markdown
# Bad
Build a todo API and make it good.

# Good
Build a REST API for todos with:
- GET/POST/PUT/DELETE endpoints
- Input validation using Zod
- PostgreSQL with Prisma
- 90%+ test coverage
```

## Configuration

### Environment Variables

```bash
export RALPH_MAX_ITERATIONS=50           # Default: 50
export RALPH_COMPLETION_PROMISE="<promise>COMPLETE</promise>"
```

### Stop Hook Settings

Edit `.claude/hooks/stop-hook.sh` to customize:

```bash
MAX_ITERATIONS="${RALPH_MAX_ITERATIONS:-50}"
COMPLETION_PROMISE="${RALPH_COMPLETION_PROMISE:-<promise>COMPLETE</promise>}"
```

## Safety Mechanisms

1. **Max Iterations**: Always set a limit to prevent runaway loops
2. **Manual Stop**: Create `.ralph-stop` file or run `./scripts/ralph.sh stop`
3. **Completion Promise**: Loop exits when Claude outputs the signal
4. **Cost Control**: Monitor API usage; a 50-iteration loop can cost $50-100+

## When to Use Ralph

**Good for:**
- Well-defined tasks with clear success criteria
- Tasks with automatic verification (tests, linters)
- Greenfield development
- Refactoring with test coverage
- Migration tasks

**Not good for:**
- Tasks requiring human judgment
- Unclear success criteria
- Production debugging
- One-shot operations

## Troubleshooting

### Loop doesn't stop

```bash
./scripts/ralph.sh stop
# or
touch .ralph-stop
```

### Loop stops immediately

Check that `PROMPT.md` exists and contains your task.

### Stuck on same error

Add fallback instructions to your prompt:

```markdown
After 10 iterations on the same issue:
- Document what's blocking progress
- Try an alternative approach
- If still stuck, output: <promise>COMPLETE</promise>
  with a summary of what remains
```

## References

- [Awesome Claude - Ralph Wiggum](https://awesomeclaude.ai/ralph-wiggum)
- [GitHub - frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code)
