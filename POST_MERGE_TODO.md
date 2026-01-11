# Post-Merge TODO List

After merging PR `claude/review-merge-issues-34jvV` to master, complete these tasks:

---

## 1. Database Migration (Required)

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name "add_password_reset_and_invite_tokens"
```

**New tables/fields created:**
- `password_reset_tokens` table (PasswordResetToken model)
- `invite_token` column on `team_members`
- `invite_token_expires_at` column on `team_members`

---

## 2. Environment Variables (Required for Production)

Verify these are set in production:

- [ ] `JWT_SECRET` - Must be at least 64 characters
- [ ] `CORS_ORIGINS` or `FRONTEND_URL` - At least one must be set
- [ ] `STRIPE_WEBHOOK_SECRET` - Required if `STRIPE_SECRET_KEY` is set

**Note:** Server will fail to start in production if these are misconfigured.

---

## 3. Build Verification

```bash
cd server
npm run build
npm test
```

- [ ] TypeScript build passes
- [ ] All tests pass

---

## 4. Manual Testing

### Security
- [ ] Try logging in with special characters in password: `P@ss<>word!`
- [ ] Verify XSS input is blocked on non-password fields
- [ ] Confirm server rejects weak JWT_SECRET in production mode

### Deliverables API
- [ ] Test `DELETE /api/deliverables/:id` removes file from storage
- [ ] Test `POST /api/projects/:id/deliverables/batch-download` returns signed URLs
- [ ] Verify batch download limit (max 50) is enforced

### Auth
- [ ] Verify Notion admin endpoints require JWT authentication
- [ ] Test admin routes return 401 without valid token

---

## 5. Deferred Work (Future PR)

- [ ] **PR #62 - Figma endpoint protection**
  - Create middleware to check `ProjectAssignment.unassignedAt: null`
  - Prevent former team members from accessing Figma files

  ```typescript
  // Required fix in Figma access check:
  where: {
    projectId: projectId,
    userId: userId,
    unassignedAt: null  // Ensures only current members have access
  }
  ```

---

## 6. Sync Fork (Optional)

If you want to sync the a13xperi fork:

```bash
# In the a13xperi/kaa-notion-backend fork
git remote add upstream https://github.com/aitkenassociates/kaa-notion-backend.git
git fetch upstream
git checkout master
git merge upstream/master
git push origin master
```

---

## 7. Close Related PRs

After merge, close these PRs in the a13xperi fork (changes integrated):
- #9, #11, #16, #22, #47, #59, #60, #61, #63, #64, #65, #66, #67, #68

Leave open:
- #62 (Figma protection - needs separate implementation)

---

*Created: 2026-01-11*
