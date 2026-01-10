# RALPH - Autonomous Loop for Claude Code

Run Claude Code autonomously for hours. Give it a task, walk away, come back to completed work.

## Your Stack
- **Warp** - Terminal
- **Cursor** - IDE
- **Claude Code** - AI assistant
- **Codex** - Code generation

---

## Quick Start (30 seconds)

### Step 1: Edit Your Task
```bash
./ralph edit
```
This opens `PROMPT.md` in Cursor. Write what you want done.

**Example PROMPT.md:**
```markdown
# Task: Add user authentication

## Objective
Implement JWT-based authentication for the API.

## Requirements
1. Login endpoint POST /api/auth/login
2. Register endpoint POST /api/auth/register
3. Protected route middleware
4. Password hashing with bcrypt

## Success Criteria
- [ ] All endpoints working
- [ ] Tests pass: npm test
- [ ] No TypeScript errors

## Workflow
Run tests after each change. When ALL criteria met, output: RALPH_COMPLETE
```

### Step 2: Start the Loop
```bash
./ralph start 30
```
This launches Claude Code with your task. It will iterate up to 30 times until complete.

### Step 3: Walk Away
Ralph runs autonomously. Check status anytime:
```bash
./ralph status
./ralph watch    # Live activity feed
```

### Step 4: Stop (if needed)
```bash
./ralph stop
```

---

## Commands

| Command | Description |
|---------|-------------|
| `./ralph start [N]` | Start loop with N iterations (default: 30) |
| `./ralph stop` | Stop gracefully on next iteration |
| `./ralph status` | Show current status |
| `./ralph watch` | Live activity feed |
| `./ralph logs` | Show log history |
| `./ralph reset` | Reset to idle state |
| `./ralph edit` | Edit PROMPT.md in Cursor |
| `./ralph help` | Show all commands |

---

## Workflow for Warp + Cursor

### Terminal 1 (Warp) - Run Ralph
```bash
cd /path/to/project
./ralph start 30
```

### Terminal 2 (Warp) - Monitor
```bash
./ralph watch
```

### Cursor - View Changes
Open the project in Cursor. Watch files update in real-time as Claude works.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  1. You run: ./ralph start 30                               │
│                                                             │
│  2. Claude Code starts with your PROMPT.md                  │
│                                                             │
│  3. Claude works on the task...                             │
│                                                             │
│  4. Claude tries to exit                                    │
│     └─► Stop Hook intercepts                                │
│         └─► Checks: Complete? Max iterations?               │
│             ├─► NO  → Re-inject prompt, continue (go to 3)  │
│             └─► YES → Allow exit                            │
│                                                             │
│  5. Loop ends when:                                         │
│     - Claude outputs "RALPH_COMPLETE"                       │
│     - Max iterations reached                                │
│     - You run ./ralph stop                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Writing Good Prompts

### DO: Clear Success Criteria
```markdown
## Success Criteria
- [ ] All tests pass
- [ ] Coverage > 80%
- [ ] No linting errors
When complete, output: RALPH_COMPLETE
```

### DO: Incremental Phases
```markdown
## Phases
1. Database models (then test)
2. API endpoints (then test)
3. Frontend components (then test)
Complete each phase before moving on.
```

### DON'T: Vague Instructions
```markdown
# Bad
Make the app better.

# Good
Add input validation to all API endpoints using Zod schemas.
Validate: email format, password length (8+), required fields.
```

---

## Configuration

Edit `.ralph.json`:
```json
{
  "maxIterations": 30,
  "completionPromise": "RALPH_COMPLETE"
}
```

---

## Files

| File | Purpose |
|------|---------|
| `ralph` | Main CLI script |
| `PROMPT.md` | Your task instructions |
| `.ralph.json` | Configuration |
| `.ralph-output.log` | Activity log |
| `.claude/hooks/stop-hook.sh` | Loop mechanism |
| `.claude/settings.json` | Claude Code hook config |

---

## Cost Estimate

| Iterations | Estimated Cost |
|------------|----------------|
| 10 | $5-15 |
| 30 | $15-50 |
| 50 | $25-100 |

Costs vary by task complexity and model.

---

## Troubleshooting

### Loop exits immediately
- Check `PROMPT.md` exists
- Run `./ralph reset` then `./ralph start`

### Claude seems stuck
```bash
./ralph stop
# Edit PROMPT.md with more specific instructions
./ralph start
```

### Check what's happening
```bash
./ralph status
./ralph logs
tail -f .ralph-output.log
```

---

## Example: Full Development Session

```bash
# Morning: Start a big task
./ralph edit  # Write: "Migrate all tests from Jest to Vitest"
./ralph start 50

# Go to meetings...

# Afternoon: Check progress
./ralph status

# Evening: Review completed work in Cursor
git diff
npm test
```

---

## Pro Tips

1. **Start small** - Try 10 iterations first to calibrate
2. **Be specific** - "Add X to Y" not "improve Z"
3. **Include tests** - Ralph works best when it can verify itself
4. **Watch first run** - See how Claude interprets your prompt
5. **Iterate prompts** - Refine based on results

---

## Integration with Your Tools

### Warp
- Use split panes: Ralph in one, `./ralph watch` in another
- Warp's AI features complement Ralph for quick fixes

### Cursor
- Keep project open to see real-time file changes
- Use Cursor's diff view to review Ralph's work
- Cursor's chat can help refine your PROMPT.md

### Codex
- Use Codex for quick one-off generations
- Use Ralph for multi-step, iterative development
- They complement each other

---

## Quick Reference

```bash
# Start working
./ralph edit          # Write your task
./ralph start 30      # Begin loop

# Monitor
./ralph status        # Check status
./ralph watch         # Live feed

# Control
./ralph stop          # Stop gracefully
./ralph reset         # Start fresh
```

---

*Ralph Wiggum: "Me fail English? That's unpossible!"*
*Also Ralph: Ships code for 6 hours straight without failing.*
