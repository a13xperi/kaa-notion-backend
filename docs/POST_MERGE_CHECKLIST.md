# Post-Merge Checklist

This checklist should be completed after every PR merge to ensure the codebase remains stable and all systems are functioning correctly.

## Immediate Post-Merge Tasks

### ✅ Git Operations
- [x] Pull latest changes from main branch
- [x] Delete merged feature branch locally
- [x] Verify all changes are present

### ✅ Build Verification
- [x] TypeScript compilation passes (`cd server && npm run build`)
- [ ] All tests pass (if applicable)
- [ ] No TypeScript errors
- [ ] No linting errors

### ✅ Script Verification
- [x] `npm run phase0-setup` - Setup script works
- [x] `npm run verify-env` - Environment validation works
- [x] `npm run prisma:generate` - Prisma client generation works
- [ ] `npm run verify-indexes` - Index verification (requires database)
- [ ] `npm run test:e2e-sync` - End-to-end test (requires server running)

### ✅ Documentation
- [x] CHANGELOG.md updated
- [x] All new features documented
- [x] Setup guides are accurate
- [x] API reference is up to date

## Follow-Up Tasks (Within 24 Hours)

### Environment Setup
- [ ] Run `npm run phase0-setup` on staging/production
- [ ] Verify all environment variables are set correctly
- [ ] Run database migrations if needed
- [ ] Verify database indexes are applied

### Monitoring & Observability
- [ ] Verify Sentry is capturing errors correctly
- [ ] Check Prometheus metrics endpoint (`/api/metrics`)
- [ ] Verify structured logging is working
- [ ] Check database connection pooling stats

### Integration Testing
- [ ] Test Notion webhook integration (if applicable)
- [ ] Verify Notion-Postgres sync is working
- [ ] Test reconciliation endpoint (`/api/admin/sync/health`)
- [ ] Run end-to-end sync test (`npm run test:e2e-sync`)

### Deployment Verification
- [ ] Verify server starts without errors
- [ ] Check health endpoint (`/api/health`)
- [ ] Verify all routes are accessible
- [ ] Check database connection on startup

## Long-Term Follow-Up (Within 1 Week)

### Performance Monitoring
- [ ] Review Prometheus metrics for slow queries
- [ ] Check database connection pool utilization
- [ ] Monitor Sentry for any new errors
- [ ] Review slow query logs

### Documentation Updates
- [ ] Update any outdated documentation
- [ ] Add examples for new features
- [ ] Update deployment guides if needed
- [ ] Create migration guides if schema changed

### Team Communication
- [ ] Announce new features/scripts to team
- [ ] Share setup guide with new team members
- [ ] Document any breaking changes
- [ ] Update onboarding documentation

## Rollback Plan (If Issues Found)

If critical issues are discovered after merge:

1. **Identify the Issue**
   - Check Sentry for error details
   - Review server logs
   - Check Prometheus metrics for anomalies

2. **Assess Impact**
   - Is the issue affecting production?
   - How many users are affected?
   - Can it be fixed with a hotfix?

3. **Fix or Rollback**
   - If fixable quickly: Create hotfix PR
   - If critical: Revert the merge commit
   - Communicate with team

4. **Post-Mortem**
   - Document what went wrong
   - Update processes to prevent recurrence
   - Share learnings with team

## Success Criteria

A successful post-merge follow-up includes:

✅ All automated checks pass
✅ Server builds and starts without errors
✅ All new scripts work as expected
✅ Documentation is complete and accurate
✅ Monitoring is configured and working
✅ No critical errors in Sentry
✅ Database connections are stable
✅ Metrics are being collected correctly

---

## Last Updated

This checklist was last updated: 2025-01-XX (Post-porting optimizations PR #29)