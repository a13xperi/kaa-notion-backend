# Task Backlog

## Ready (Unassigned)

Tasks ready to be claimed by agents. Check scope compatibility before claiming.

(none - add tasks here)

---

## Task Template

```markdown
### TASK-[NNN]: [Title]
- **Scope:** [paths affected]
- **Suitable for:** Agent [N]
- **Estimate:** [time estimate]
- **Dependencies:** [other tasks or none]
- **Description:** [detailed description]
- **Acceptance Criteria:**
  - [ ] Criterion 1
  - [ ] Criterion 2
  - [ ] Tests pass
```

---

## In Progress

Tasks currently being worked on.

(none)

---

## Done

Completed tasks for reference.

(none)

---

## Claiming a Task

1. Check this file for tasks matching your scope
2. Move task from "Ready" to "In Progress"
3. Add: "**Claimed by:** Agent [N] at [timestamp]"
4. Update `coordination/status.md` with your task
5. Begin work

## Completing a Task

1. Verify all acceptance criteria are met
2. Move task from "In Progress" to "Done"
3. Add: "**Completed by:** Agent [N] at [timestamp]"
4. Update `coordination/status.md`
5. Merge to integration branch
