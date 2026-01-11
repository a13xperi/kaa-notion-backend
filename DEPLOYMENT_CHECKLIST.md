# Deployment Readiness Checklist

**Generated:** 2026-01-09
**Status:** Review Required Before Production Release

---

## Executive Summary

| Category | Status | Critical Issues |
|----------|--------|----------------|
| Vercel Config | ⚠️ Needs Attention | Build script, environment variables |
| Prisma/Database | ❌ Critical Issues | Migrations gitignored, missing DATABASE_URL |
| Environment Variables | ⚠️ Incomplete | Missing required vars in env.example |
| Backend | ⚠️ Needs Attention | In-memory storage, Railway config mismatch |
| Frontend | ✅ Ready | Minor documentation gap |

---

## Critical Issues (Must Fix Before Release)

### 1. ❌ Prisma Migrations Are Gitignored

**Location:** `.gitignore` (line 13) and `prisma/.gitignore` (line 2)

**Problem:** `prisma/migrations/` is ignored, meaning:
- No migration history tracked in version control
- `prisma migrate deploy` will fail in production (no migrations to apply)
- Database schema changes are not reproducible

**Fix:**
```bash
# Remove from .gitignore
# Delete or comment out: prisma/migrations/

# Generate initial migration
npx prisma migrate dev --name init

# Commit the migrations folder
git add prisma/migrations/
git commit -m "feat: Add Prisma migrations"
```

### 2. ❌ Missing DATABASE_URL in env.example

**Location:** `env.example`

**Problem:** Prisma schema requires `DATABASE_URL` but env.example only shows separate Supabase keys.

**Fix:** Add to `env.example`:
```bash
# ============================================
# Database Configuration (Required for Prisma)
# ============================================
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 3. ❌ @prisma/client in Wrong Dependency Section

**Location:** `package.json` (line 29)

**Problem:** `@prisma/client` is in `devDependencies` but needs to be in `dependencies` for production runtime.

**Fix:**
```bash
npm uninstall @prisma/client
npm install @prisma/client
```

---

## High Priority Issues

### 4. ⚠️ Build Script Doesn't Run Prisma Generate

**Location:** `package.json` (line 7)

**Problem:** The build script is just `echo 'No build required'` but Vercel deployments need `prisma generate` to create the client.

**Current:**
```json
"build": "echo 'No build required for API server'"
```

**Fix:**
```json
"build": "prisma generate"
```

Or for Vercel specifically, add a `vercel-build` script:
```json
"vercel-build": "prisma generate"
```

### 5. ⚠️ Railway Config Points to Wrong Server File

**Location:** `railway.json` (line 4)

**Problem:** References `notion-api-server.js` but main server is `notion-api-server-enhanced.js`

**Current:**
```json
"startCommand": "node notion-api-server.js"
```

**Fix:**
```json
"startCommand": "node notion-api-server-enhanced.js"
```

### 6. ⚠️ In-Memory Storage for Design Ideas

**Location:** `notion-api-server-enhanced.js` (line 1014)

**Problem:** `designIdeasStore` uses `Map()` in memory. On Vercel serverless:
- Data lost on cold starts
- Not shared between function instances

**Recommendation:**
- For MVP: Document this limitation
- For production: Migrate to Supabase/Postgres using Prisma model or store in Notion

### 7. ⚠️ REACT_APP_API_URL Not Documented

**Location:** `env.example`

**Problem:** Frontend uses `REACT_APP_API_URL` (used in 10+ files) but it's not in env.example.

**Fix:** Add to `env.example`:
```bash
# ============================================
# Frontend Configuration (for kaa-app)
# ============================================
REACT_APP_API_URL=http://localhost:3001
# For production: REACT_APP_API_URL=https://your-backend-url.vercel.app
```

---

## Vercel Configuration Review

### Root `vercel.json` - ✅ Correct

```json
{
  "version": 2,
  "builds": [
    { "src": "notion-api-server-enhanced.js", "use": "@vercel/node" },
    { "src": "kaa-app/package.json", "use": "@vercel/static-build", "config": { "distDir": "build" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/notion-api-server-enhanced.js" },
    { "src": "/(.*)", "dest": "/kaa-app/$1" }
  ],
  "env": { "NODE_ENV": "production" },
  "github": { "enabled": true, "silent": true },
  "git": { "deploymentEnabled": { "main": true, "staging": true } }
}
```

**Analysis:**
- ✅ API routes correctly point to enhanced server
- ✅ Static build configured for React app
- ✅ GitHub integration enabled
- ✅ Staging branch deployment enabled

### Frontend `kaa-app/vercel.json` - ✅ Correct

- ✅ Correct Create React App configuration
- ✅ SPA rewrites configured

---

## Environment Variables - Manual Setup Required

### Vercel Environment Variables (Required)

Set these in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Required | Environments | Notes |
|----------|----------|--------------|-------|
| `NODE_ENV` | Yes | All | Auto-set by vercel.json |
| `DATABASE_URL` | Yes | Production, Preview | Supabase PostgreSQL connection string |
| `NOTION_API_KEY` | Yes | All | Notion integration token |
| `NOTION_PARENT_PAGE_ID` | Yes | All | For database creation |
| `STRIPE_SECRET_KEY` | Yes | Production | Use test key for Preview |
| `STRIPE_PUBLISHABLE_KEY` | Yes | All | Frontend needs this |
| `STRIPE_WEBHOOK_SECRET` | Yes | Production | Webhook signing |
| `OPENAI_API_KEY` | Optional | All | For Sage chat feature |
| `EMAIL_SERVICE` | Optional | All | gmail/resend/postmark |
| `EMAIL_USER` | Optional | All | If using gmail |
| `EMAIL_PASSWORD` | Optional | All | App-specific password |
| `RESEND_API_KEY` | Optional | All | If using Resend |
| `TEAM_EMAIL` | Optional | All | Admin notifications |
| `FRONTEND_URL` | Yes | All | For email links, CORS |

### Frontend Environment Variables (kaa-app)

| Variable | Required | Notes |
|----------|----------|-------|
| `REACT_APP_API_URL` | Yes | Backend API URL (auto in Vercel monorepo) |

**Note for Vercel Monorepo:** When deploying from root, the frontend at `/api/*` routes should work automatically. If deploying frontend separately, set `REACT_APP_API_URL` to your backend URL.

---

## Prisma Migration Steps

### Initial Setup (Before First Deploy)

```bash
# 1. Remove migrations from gitignore
# Edit .gitignore - remove line: prisma/migrations/
# Edit prisma/.gitignore - remove line: migrations/

# 2. Generate Prisma client
npm run prisma:generate

# 3. Create initial migration
npm run prisma:migrate -- --name init

# 4. Commit migrations
git add prisma/migrations/
git commit -m "feat: Add initial Prisma migration"
```

### Production Deployment

```bash
# Run migrations on deploy (add to Vercel build command or post-deploy hook)
npx prisma migrate deploy
```

**Vercel Build Command Option:**
```
prisma generate && prisma migrate deploy
```

---

## Manual Setup Checklist

Before going to production, complete these manual tasks:

### Database (Supabase)
- [ ] Create Supabase project at https://app.supabase.com
- [ ] Copy connection string to `DATABASE_URL`
- [ ] Run `prisma migrate deploy` to create tables
- [ ] (Optional) Run `prisma db seed` if seed script exists

### Notion
- [ ] Create Notion integration at https://www.notion.so/my-integrations
- [ ] Share parent page with integration
- [ ] Copy integration token to `NOTION_API_KEY`
- [ ] Copy parent page ID to `NOTION_PARENT_PAGE_ID`

### Stripe
- [ ] Set up Stripe account at https://dashboard.stripe.com
- [ ] Copy API keys (use test keys for staging)
- [ ] Set up webhook endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
- [ ] Copy webhook signing secret

### Email (Choose One)
- [ ] **Resend:** Get API key from https://resend.com
- [ ] **Postmark:** Get API key from https://postmarkapp.com
- [ ] **Gmail:** Create app-specific password (not recommended for production)

### OpenAI (Optional)
- [ ] Get API key from https://platform.openai.com/api-keys
- [ ] Set usage limits to prevent unexpected charges

### Domain (Optional)
- [ ] Configure custom domain in Vercel
- [ ] Update `FRONTEND_URL` environment variable
- [ ] Update Stripe webhook URL if using custom domain

---

## Staging vs Production

### Staging Environment

Vercel auto-deploys `staging` branch with Preview environment:
- Uses Preview environment variables
- Use Stripe test keys (`sk_test_*`, `pk_test_*`)
- Point to staging database (or same DB with caution)

### Production Environment

Vercel auto-deploys `main` branch:
- Uses Production environment variables
- Use Stripe live keys (`sk_live_*`, `pk_live_*`)
- Point to production database

---

## Post-Deployment Verification

After deployment, verify these endpoints:

```bash
# Health check
curl https://your-app.vercel.app/api/health

# Expected response:
{
  "status": "ok",
  "notion_configured": true,
  "email_configured": true,
  "openai_configured": true,
  "databases_configured": true,
  "timestamp": "2026-01-09T..."
}
```

### Checklist
- [ ] `/api/health` returns all `true` values
- [ ] Frontend loads at root URL
- [ ] Client login works with demo credentials
- [ ] Notion pages load correctly
- [ ] Sage chat responds (if OpenAI configured)
- [ ] Email notifications work (test with TEAM_EMAIL)

---

## Quick Fix Summary

```bash
# 1. Fix Prisma migrations (Critical)
sed -i '/prisma\/migrations/d' .gitignore
sed -i '/migrations\//d' prisma/.gitignore
npm run prisma:generate
npx prisma migrate dev --name init

# 2. Fix package.json dependencies
npm uninstall @prisma/client
npm install @prisma/client

# 3. Update build script in package.json
# Change: "build": "echo 'No build required for API server'"
# To: "build": "prisma generate"

# 4. Fix railway.json
# Change: "startCommand": "node notion-api-server.js"
# To: "startCommand": "node notion-api-server-enhanced.js"

# 5. Update env.example with missing variables
# Add DATABASE_URL and REACT_APP_API_URL sections

# 6. Commit all changes
git add -A
git commit -m "fix: Deployment configuration updates"
git push
```

---

## Known Limitations

1. **Design Ideas Storage:** Currently uses in-memory storage; data will be lost on serverless cold starts. For production, implement persistent storage.

2. **File Uploads:** Uses memory storage (`multer.memoryStorage()`), suitable for small files but may hit Vercel serverless limits (50MB uncompressed).

3. **Demo Mode:** Client verification accepts `demo123` as password - consider removing for production or adding rate limiting.

---

## Contact & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Supabase Docs:** https://supabase.com/docs
- **Notion API:** https://developers.notion.com/
