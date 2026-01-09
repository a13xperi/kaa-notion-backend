# SAGE MVP Development Runner

You are continuing development on the SAGE MVP platform. Follow these steps:

## Step 1: Check Current State

Read `.claude/prompt-queue.md` and identify:
1. The current phase being worked on
2. The next pending prompt (first `- [ ]` item)
3. How many prompts remain in the current phase

## Step 2: Report Status

Before starting work, report:
```
📍 Phase: [X] - [Phase Name]
📋 Next: [prompt type]: [description]
📊 Progress: [X]/[Y] complete in this phase, [Z] total remaining
```

## Step 3: Execute the Prompt

Execute the next pending prompt by:
1. Reading relevant context from `.claude/context/` and `docs/`
2. Following patterns in `.claude/prompts.md` for the prompt type
3. Implementing the feature/component/endpoint
4. Writing tests if applicable

## Step 4: Update the Queue

After completing work:
1. Change `- [ ]` to `- [x]` for the completed item
2. Add completion date if starting a new day
3. Commit changes with descriptive message
4. Push to the current branch

## Step 5: Continue or Stop

Ask: "Continue to the next prompt, or stop here?"
- If continue: Repeat from Step 1
- If stop: Summarize what was completed and what's next

---

## Context Files

Reference these as needed:
- `docs/data-model.md` - Entity schemas and relationships
- `docs/tier-router-rules.md` - Tier assignment logic
- `docs/sync-strategy.md` - Notion sync patterns
- `docs/hybrid-data-architecture.md` - Postgres/Notion architecture
- `.cursorrules` - Code style and conventions

## Code Locations

- Frontend: `kaa-app/src/`
- Backend: `server/`
- Database: `prisma/schema.prisma`
- Tests: `tests/` and `kaa-app/src/__tests__/`

## Quality Checklist

Before marking complete:
- [ ] Code follows `.cursorrules` conventions
- [ ] TypeScript types are explicit (no `any`)
- [ ] Error handling is implemented
- [ ] Loading/error states for components
- [ ] Accessibility attributes included
- [ ] Tests written (if test prompt or significant feature)
