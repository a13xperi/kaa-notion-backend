# Branch Consolidation Plan

**Date:** 2026-01-12
**Repository:** a13xperi/kaa-notion-backend

> **Note:** The `aitkenassociates/kaa-notion-backend` repository is not accessible (authorization error). This plan covers only the accessible repository.

---

## Summary

| Metric | Count |
|--------|-------|
| Total branches | 35 |
| Merged branches (safe to delete) | 16 |
| Unmerged branches with value | 18 |
| Stale branches (30+ days) | 0 |

**Current default branch:** `portal-auth-upload`

---

## Branch Analysis

### Merged Branches (SAFE TO DELETE)

These branches have been fully merged into `portal-auth-upload`:

| Branch | Status |
|--------|--------|
| `codex/add-feature-flag-middleware-to-routes` | Merged |
| `codex/add-guide-for-local-vs-docker-development` | Merged |
| `codex/add-testing-strategy-documentation` | Merged |
| `codex/apply-jwt-authentication-in-routes` | Merged |
| `codex/audit-and-update-route-validation-schemas` | Merged |
| `codex/choose-raw-body-handling-method` | Merged |
| `codex/create-canonical-docs-for-scripts-and-commands` | Merged |
| `codex/create-environment-reference-file` | Merged |
| `codex/establish-canonical-checkout-endpoint` | Merged |
| `codex/refactor-logging-and-error-handling` | Merged |
| `codex/remove-duplicate-refresh-route` | Merged |
| `codex/review-websocket-usage-in-realtimeservice` | Merged |
| `codex/verify-script-name-consistency-in-package.json` | Merged |
| `cursor/to-do-list-progress-check-695e` | Merged |
| `feature/post-porting-optimizations` | Merged |
| `fix/typescript-build-errors` | Merged |

---

### Unmerged Branches - Clean Merge (NO CONFLICTS)

These can be merged directly:

| Branch | Commits | Description |
|--------|---------|-------------|
| `codex/perform-audit-of-recent-merges` | 1 | React/TypeScript version alignment |
| `codex/add-metrics-recording-for-leads-and-payments` | 3 | Metrics tracking for payments |
| `codex/enforce-production-security-requirements` | 3 | Production security env validation |
| `codex/extend-notion-webhook-signature-verification` | 3 | Webhook signature verification |

---

### Unmerged Branches - WITH CONFLICTS

These require manual conflict resolution:

| Branch | Commits | Conflicts |
|--------|---------|-----------|
| `codex/audit-and-refactor-api-route-permissions` | 3 | `server/src/index.ts` |
| `codex/implement-audit-logging-enhancements` | 3 | `admin.ts`, `upload.ts`, `webhooks.ts`, `realtimeService.ts` |
| `codex/implement-redis-backed-rate-limiting` | 3 | `index.ts`, `middleware/index.ts` |
| `codex/secure-file-routes-with-authentication` | 3 | `server/src/index.ts` |
| `codex/update-handleconnection-for-jwt-verification` | 3 | `realtimeService.ts` |
| `codex/update-route-validation-and-sanitization` | 3 | Multiple route files |
| `claude/fix-server-build-1768043209` | 3 | 18 files (extensive conflicts) |

---

### Large Branches (OLD BASE - Need Cherry-Pick)

These branches are 56 commits ahead but share a stale common ancestor. Only the top commit contains unique work:

| Branch | Top Commit | Key Changes |
|--------|------------|-------------|
| `codex/consolidate-jwt-implementation-and-validate-config` | Harden JWT handling | `middleware/auth.ts`, `utils/auth.ts` |
| `codex/define-batch-download-api-and-update-ui` | Add batch downloads | `routes/deliverables.ts`, UI components |
| `codex/enable-and-handle-storage-delete-calls` | Handle storage deletes | `routes/deliverables.ts` |
| `codex/implement-password-reset-functionality` | Password reset | `authService.ts`, Prisma migration |
| `codex/implement-team-invite-processing` | Secure team invites | `teamService.ts`, `teamRoutes.ts` |
| `codex/update-notion-routes-for-jwt-auth` | Notion admin auth | `routes/notion.ts` |
| `codex/update-portalapi-for-jwt-authentication` | Portal auth headers | `api/portalApi.ts` |

---

## Recommended Consolidation Strategy

### Phase 1: Delete Merged Branches
Delete all 16 merged branches to clean up the repository.

### Phase 2: Clean Merges
Merge the 4 branches without conflicts:
1. `codex/perform-audit-of-recent-merges`
2. `codex/add-metrics-recording-for-leads-and-payments`
3. `codex/enforce-production-security-requirements`
4. `codex/extend-notion-webhook-signature-verification`

### Phase 3: Cherry-Pick from Large Branches
For the 7 large branches, cherry-pick only the unique top commit:
```bash
git cherry-pick <commit-sha>
```

### Phase 4: Resolve Conflicts
Manually resolve conflicts for the 6 branches with conflicts, merging in order of fewest conflicts:
1. `codex/audit-and-refactor-api-route-permissions`
2. `codex/secure-file-routes-with-authentication`
3. `codex/update-handleconnection-for-jwt-verification`
4. `codex/implement-redis-backed-rate-limiting`
5. `codex/implement-audit-logging-enhancements`
6. `codex/update-route-validation-and-sanitization`

### Phase 5: Handle claude branch
The `claude/fix-server-build-1768043209` branch has extensive conflicts (18 files). Evaluate if the changes are still needed or if they've been superseded.

### Phase 6: Rename Default Branch
Consider renaming `portal-auth-upload` to `main` for clarity:
```bash
git branch -m portal-auth-upload main
git push origin main
git push origin --delete portal-auth-upload
```

---

## Execution Commands

### Delete Merged Branches
```bash
# List of merged branches to delete
MERGED_BRANCHES=(
  "codex/add-feature-flag-middleware-to-routes"
  "codex/add-guide-for-local-vs-docker-development"
  "codex/add-testing-strategy-documentation"
  "codex/apply-jwt-authentication-in-routes"
  "codex/audit-and-update-route-validation-schemas"
  "codex/choose-raw-body-handling-method"
  "codex/create-canonical-docs-for-scripts-and-commands"
  "codex/create-environment-reference-file"
  "codex/establish-canonical-checkout-endpoint"
  "codex/refactor-logging-and-error-handling"
  "codex/remove-duplicate-refresh-route"
  "codex/review-websocket-usage-in-realtimeservice"
  "codex/verify-script-name-consistency-in-package.json"
  "cursor/to-do-list-progress-check-695e"
  "feature/post-porting-optimizations"
  "fix/typescript-build-errors"
)

for branch in "${MERGED_BRANCHES[@]}"; do
  git push origin --delete "$branch"
done
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Data loss from deleted branches | Branches are merged; commits preserved in history |
| Merge conflicts | Test merges before executing; backup branch |
| Breaking changes | Run tests after each merge |
| Authentication issues | May need owner permissions for some branches |
