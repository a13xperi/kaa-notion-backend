# KAA/SAGE Deployment Plan

Complete step-by-step deployment guide for production.

---

## Overview

| Component | Platform | URL Pattern |
|-----------|----------|-------------|
| Frontend | Vercel | `kaa-app.vercel.app` → `app.kaalandscape.com` |
| Backend | Railway | `kaa-backend.up.railway.app` → `api.kaalandscape.com` |
| Database | Supabase | (existing or new project) |
| Storage | Supabase Storage | (same project as database) |

**Estimated time**: 1-2 hours

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] GitHub repository access
- [ ] Supabase account with project (or create new)
- [ ] Stripe account with products created
- [ ] Google Cloud Console project for OAuth
- [ ] Resend account for transactional emails
- [ ] Domain DNS access (optional, for custom domains)

---

## Phase 1: Supabase Setup (Database + Storage)

### 1.1 Create or Access Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create new project or select existing
3. Note the project URL and region

### 1.2 Get Database Connection String

1. Go to **Settings** → **Database**
2. Find **Connection string** → **URI**
3. Copy the connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. Add `?sslmode=require` to the end:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
   ```

### 1.3 Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://[PROJECT-REF].supabase.co`
   - **anon public key**: `eyJ...` (safe for frontend)
   - **service_role key**: `eyJ...` (keep secret!)

### 1.4 Create Storage Bucket

1. Go to **Storage** → **Buckets**
2. Click **New bucket**
3. Name: `deliverables`
4. Set to **Private** (authenticated access only)
5. Click **Create bucket**

### 1.5 Run Database Migrations

From your local machine:
```bash
# Set the production DATABASE_URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require"

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:deploy

# (Optional) Seed initial data
npm run prisma:seed
```

**Checkpoint**: Database tables should now exist in Supabase

---

## Phase 2: External Service Setup

### 2.1 Stripe Setup

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Get API Keys** (Developers → API keys):
   - Secret key: `sk_live_...` (or `sk_test_...` for testing)
   - Publishable key: `pk_live_...` (or `pk_test_...`)

3. **Create Products** (Products → Add product):

   | Product | Type | Price |
   |---------|------|-------|
   | Seed (Tier 1) | One-time | Per-project pricing |
   | Sprout (Tier 2) | Subscription | $49/mo or $470/yr |
   | Canopy (Tier 3) | Subscription | $99/mo or $950/yr |

4. **Copy Price IDs** for each product:
   - `STRIPE_PRICE_TIER_1`: price_...
   - `STRIPE_PRICE_TIER_2`: price_...
   - `STRIPE_PRICE_TIER_3`: price_...
   - Subscription prices (monthly/yearly for each tier)

5. **Webhook setup** - Do this AFTER Railway deployment (Phase 4)

### 2.2 Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create or select project
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure:
   - Application type: **Web application**
   - Name: `KAA Production`
   - Authorized JavaScript origins:
     - `https://kaa-app.vercel.app` (or your domain)
   - Authorized redirect URIs:
     - `https://kaa-app.vercel.app/auth/google/callback`
6. Copy **Client ID** and **Client Secret**

### 2.3 Resend Email Setup

1. Go to [resend.com](https://resend.com)
2. Create account and verify domain (or use their test domain)
3. Go to **API Keys** → **Create API Key**
4. Copy the API key: `re_...`

---

## Phase 3: Backend Deployment (Railway)

### 3.1 Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `a13xperi/kaa-notion-backend`
4. **IMPORTANT**: Set **Root Directory** to `server`

### 3.2 Configure Environment Variables

In Railway dashboard, click on your service → **Variables** → **Raw Editor**, paste:

```env
# ===========================================
# REQUIRED - Core Configuration
# ===========================================
NODE_ENV=production
PORT=3001

# Database (from Phase 1.2)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require

# Authentication - GENERATE A SECURE SECRET
# Run: openssl rand -base64 32
JWT_SECRET=REPLACE_WITH_SECURE_32_CHAR_MIN_SECRET
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# CORS - Your Vercel frontend URL (update after Vercel deploy)
CORS_ORIGIN=https://kaa-app.vercel.app

# ===========================================
# REQUIRED - Supabase (from Phase 1.3)
# ===========================================
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=deliverables

# ===========================================
# REQUIRED - Stripe (from Phase 2.1)
# ===========================================
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
# Webhook secret - add AFTER setting up webhook in Phase 4
# STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_PRICE_TIER_1=price_...
STRIPE_PRICE_TIER_2=price_...
STRIPE_PRICE_TIER_3=price_...

# Subscription Price IDs (if using subscriptions)
STRIPE_SPROUT_MONTHLY_PRICE_ID=price_...
STRIPE_SPROUT_YEARLY_PRICE_ID=price_...
STRIPE_CANOPY_MONTHLY_PRICE_ID=price_...
STRIPE_CANOPY_YEARLY_PRICE_ID=price_...

# ===========================================
# REQUIRED - Google OAuth (from Phase 2.2)
# ===========================================
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://kaa-app.vercel.app/auth/google/callback

# ===========================================
# REQUIRED - Email (from Phase 2.3)
# ===========================================
RESEND_API_KEY=re_...
FROM_EMAIL=SAGE <noreply@kaalandscape.com>
APP_NAME=SAGE
APP_URL=https://kaa-app.vercel.app

# ===========================================
# OPTIONAL - Super Admin Access
# ===========================================
SUPER_ADMIN_EMAIL_1=karen@kaalandscape.com
SUPER_ADMIN_EMAIL_2=pam@kaalandscape.com

# ===========================================
# OPTIONAL - Notion Integration
# ===========================================
# NOTION_API_KEY=secret_...
# NOTION_DATABASE_ID=...
# NOTION_PROJECTS_DB=...
# NOTION_LEADS_DB=...

# ===========================================
# OPTIONAL - Monitoring
# ===========================================
# SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=info

# ===========================================
# OPTIONAL - Push Notifications
# ===========================================
# Generate with: npx web-push generate-vapid-keys
# VAPID_PUBLIC_KEY=...
# VAPID_PRIVATE_KEY=...
# VAPID_SUBJECT=mailto:admin@kaalandscape.com
```

### 3.3 Deploy

Railway will auto-deploy. Wait for:
1. Build to complete
2. Migrations to run
3. Health check to pass

### 3.4 Get Backend URL

1. Go to **Settings** → **Networking**
2. Click **Generate Domain** (or add custom domain)
3. Copy the URL: `https://kaa-backend-production.up.railway.app`

### 3.5 Verify Deployment

```bash
# Health check
curl https://[YOUR-RAILWAY-URL]/api/health

# Should return: {"success":true,"status":"healthy",...}
```

**Checkpoint**: Backend API is live and healthy

---

## Phase 4: Stripe Webhook Setup

Now that Railway is deployed, configure Stripe webhooks:

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter URL: `https://[YOUR-RAILWAY-URL]/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy **Signing secret**: `whsec_...`
7. Add to Railway: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## Phase 5: Frontend Deployment (Vercel)

### 5.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New...** → **Project**
3. Import `a13xperi/kaa-notion-backend`
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `kaa-app`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### 5.2 Configure Environment Variables

In Vercel, go to **Settings** → **Environment Variables**:

```env
# Backend API URL (from Phase 3.4)
REACT_APP_API_URL=https://[YOUR-RAILWAY-URL]

# Stripe Publishable Key (safe for frontend)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Google OAuth Client ID
REACT_APP_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# App Configuration
REACT_APP_APP_NAME=SAGE
REACT_APP_SUPPORT_EMAIL=support@kaalandscape.com

# Optional
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_DEBUG=false
```

### 5.3 Deploy

Click **Deploy** and wait for build to complete.

### 5.4 Get Frontend URL

Copy your Vercel URL: `https://kaa-app.vercel.app`

**Checkpoint**: Frontend is live

---

## Phase 6: Final Configuration

### 6.1 Update Backend CORS

In Railway, update `CORS_ORIGIN` with your actual Vercel URL:
```env
CORS_ORIGIN=https://kaa-app.vercel.app
```

### 6.2 Update Google OAuth

In Google Cloud Console, add your actual URLs:
- **Authorized JavaScript origins**: `https://kaa-app.vercel.app`
- **Authorized redirect URIs**: `https://kaa-app.vercel.app/auth/google/callback`

### 6.3 Update Backend URLs

In Railway, update:
```env
APP_URL=https://kaa-app.vercel.app
GOOGLE_REDIRECT_URI=https://kaa-app.vercel.app/auth/google/callback
```

---

## Phase 7: Verification Checklist

Test each feature:

### Core Functionality
- [ ] Homepage loads
- [ ] Can register new user
- [ ] Can login with email/password
- [ ] Can login with Google OAuth
- [ ] Dashboard loads after login

### Payments
- [ ] Checkout page loads
- [ ] Can complete test purchase (use Stripe test mode first)
- [ ] Webhook received (check Stripe dashboard)

### Project Features
- [ ] Can create new project
- [ ] Can upload files
- [ ] Can view project details

### Admin Features
- [ ] Admin dashboard accessible (for super admins)
- [ ] Can view all projects

### Emails
- [ ] Welcome email sent on registration
- [ ] Password reset email works

---

## Phase 8: Custom Domains (Optional)

### Frontend (Vercel)

1. Go to **Settings** → **Domains**
2. Add domain: `app.kaalandscape.com`
3. Add DNS records:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

### Backend (Railway)

1. Go to **Settings** → **Networking**
2. Add custom domain: `api.kaalandscape.com`
3. Add DNS records as instructed

### After Custom Domains

Update everywhere:
1. **Railway env vars**:
   ```env
   CORS_ORIGIN=https://app.kaalandscape.com
   APP_URL=https://app.kaalandscape.com
   GOOGLE_REDIRECT_URI=https://app.kaalandscape.com/auth/google/callback
   ```

2. **Vercel env vars**:
   ```env
   REACT_APP_API_URL=https://api.kaalandscape.com
   ```

3. **Google OAuth**: Update redirect URIs

4. **Stripe Webhook**: Update endpoint URL

---

## Quick Reference

### URLs After Deployment

| Service | URL |
|---------|-----|
| Frontend | `https://kaa-app.vercel.app` |
| Backend | `https://[project].up.railway.app` |
| API Health | `https://[backend]/api/health` |
| Stripe Webhook | `https://[backend]/api/webhooks/stripe` |

### Environment Variables Summary

| Platform | Variables Count | Key Vars |
|----------|----------------|----------|
| Railway | ~25 | DATABASE_URL, JWT_SECRET, STRIPE_*, SUPABASE_* |
| Vercel | ~6 | REACT_APP_API_URL, REACT_APP_STRIPE_PUBLISHABLE_KEY |

### Dashboards

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Railway Dashboard](https://railway.app/dashboard)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Google Cloud Console](https://console.cloud.google.com)

---

## Troubleshooting

### Build Fails on Railway
```bash
# Check logs
railway logs

# Common issues:
# - Missing environment variables
# - Prisma generation failing (check DATABASE_URL)
```

### CORS Errors
- Verify CORS_ORIGIN matches frontend URL exactly
- No trailing slash
- Include protocol (https://)

### OAuth Redirect Issues
- Verify redirect URI matches EXACTLY
- Check both Google Console and env vars

### Stripe Webhooks Not Working
- Verify endpoint URL is correct
- Check signing secret matches
- View webhook logs in Stripe dashboard

### Database Connection Failed
- Verify ?sslmode=require in DATABASE_URL
- Check Supabase allows external connections
- Verify password is correct (URL encoded if special chars)

---

## Rollback Procedure

### Railway
```bash
# List deployments
railway deployments

# Rollback to previous
railway rollback
```

### Vercel
1. Go to **Deployments**
2. Find previous working deployment
3. Click **...** → **Promote to Production**

---

## Maintenance

### Database Backups
- Supabase handles automatic backups
- For manual: **Database** → **Backups**

### Updating
1. Push changes to GitHub
2. Railway and Vercel auto-deploy
3. Verify health checks pass

### Monitoring
- Railway: Built-in metrics and logs
- Vercel: Analytics and function logs
- Sentry: Error tracking (if configured)
