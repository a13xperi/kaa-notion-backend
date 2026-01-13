# Deployment Guide - KAA/SAGE MVP Platform

This guide covers deploying the SAGE MVP Platform using the industry-standard split deployment architecture.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Vercel (CDN)   │────▶│  Railway        │────▶│  Supabase       │
│  Frontend       │     │  Backend API    │     │  PostgreSQL     │
│  kaa-app/       │     │  server/        │     │  + Storage      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     React SPA           Express + WS            Database + Files
```

**Why this architecture?**
- **Frontend on Vercel**: Global CDN, instant deploys, preview URLs
- **Backend on Railway**: Persistent server, WebSocket support, no cold starts
- **Database on Supabase**: Managed PostgreSQL with storage

---

## Part 1: Backend Deployment (Railway)

### 1.1 Create Railway Project

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Set the **Root Directory** to `server`

### 1.2 Add PostgreSQL (or use Supabase)

**Option A: Use existing Supabase database**
- Just add `DATABASE_URL` in environment variables (step 1.3)

**Option B: Railway PostgreSQL**
- Click **"+ New"** → **"Database"** → **"PostgreSQL"**
- Railway will auto-inject `DATABASE_URL`

### 1.3 Configure Environment Variables

In Railway dashboard, go to **Variables** and add:

#### Required
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Authentication
JWT_SECRET=your-super-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d

# Server
NODE_ENV=production
PORT=3001

# CORS - your Vercel frontend URL
CORS_ORIGINS=https://your-app.vercel.app
```

#### Stripe (Payments)
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://your-app.vercel.app/success
STRIPE_CANCEL_URL=https://your-app.vercel.app/checkout
STRIPE_TIER1_PRICE_ID=price_...
STRIPE_TIER2_PRICE_ID=price_...
STRIPE_TIER3_PRICE_ID=price_...
```

#### Supabase Storage
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
STORAGE_BUCKET=deliverables
```

#### Email (Resend)
```env
RESEND_API_KEY=re_...
EMAIL_FROM=SAGE <hello@yourdomain.com>
EMAIL_REPLY_TO=support@yourdomain.com
```

#### Google OAuth
```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/auth/google/callback
FRONTEND_URL=https://your-app.vercel.app
```

### 1.4 Deploy

Railway auto-deploys on push. To manually deploy:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

### 1.5 Get Backend URL

After deployment, Railway provides a URL like:
```
https://your-project.up.railway.app
```

Save this - you'll need it for the frontend.

---

## Part 2: Frontend Deployment (Vercel)

### 2.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `kaa-app`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### 2.2 Configure Environment Variables

In Vercel dashboard, go to **Settings** → **Environment Variables**:

```env
# API URL - Your Railway backend URL
REACT_APP_API_URL=https://your-project.up.railway.app

# Stripe (publishable key only - safe for frontend)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# App Config
REACT_APP_APP_NAME=SAGE
REACT_APP_SUPPORT_EMAIL=support@yourdomain.com

# Optional
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_DEBUG=false
```

### 2.3 Deploy

Vercel auto-deploys on push to `main`. Manual deploy:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from kaa-app directory)
cd kaa-app
vercel --prod
```

---

## Part 3: Post-Deployment Setup

### 3.1 Update CORS

After getting your Vercel URL, update Railway's `CORS_ORIGINS`:
```env
CORS_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```

### 3.2 Configure Stripe Webhooks

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter: `https://your-project.up.railway.app/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy signing secret → Update `STRIPE_WEBHOOK_SECRET` in Railway

### 3.3 Configure Google OAuth

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add **Authorized redirect URIs**:
   - `https://your-app.vercel.app/auth/google/callback`
4. Add **Authorized JavaScript origins**:
   - `https://your-app.vercel.app`

### 3.4 Run Database Migrations

Migrations run automatically on Railway deploy, but to run manually:
```bash
# Set DATABASE_URL locally
export DATABASE_URL="postgresql://..."

# Run migrations
npm run prisma:deploy

# (Optional) Seed data
npm run prisma:seed
```

---

## Custom Domains

### Vercel (Frontend)
1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `app.yourdomain.com`)
3. Update DNS records as instructed

### Railway (Backend)
1. Go to **Settings** → **Networking** → **Public Networking**
2. Add custom domain (e.g., `api.yourdomain.com`)
3. Update DNS records as instructed

After adding custom domains, update:
- `REACT_APP_API_URL` in Vercel → `https://api.yourdomain.com`
- `CORS_ORIGINS` in Railway → `https://app.yourdomain.com`
- Stripe webhook URL → `https://api.yourdomain.com/api/webhooks/stripe`
- Google OAuth URIs → new frontend domain

---

## Monitoring & Health Checks

### Health Endpoints
```bash
# Basic health check
curl https://api.yourdomain.com/api/health

# Detailed health check
curl https://api.yourdomain.com/api/health?detailed=true
```

### Railway Logs
```bash
railway logs
```

### Vercel Logs
Available in Vercel dashboard under **Deployments** → **Functions**

---

## Troubleshooting

### CORS Errors
- Verify `CORS_ORIGINS` includes your frontend URL (with https://)
- Check for trailing slashes (they matter!)

### Database Connection Issues
- Ensure `?sslmode=require` in DATABASE_URL
- Check Railway/Supabase allows external connections

### OAuth Not Working
- Verify redirect URIs match exactly (including protocol)
- Check client ID/secret are for the correct environment

### Stripe Webhooks Failing
- Verify webhook URL is correct
- Check webhook signing secret matches
- Ensure endpoint is publicly accessible

---

## Cost Estimates

| Service | Free Tier | Paid |
|---------|-----------|------|
| **Vercel** | 100GB bandwidth/mo | $20/mo (Pro) |
| **Railway** | $5 free credits | ~$5-20/mo |
| **Supabase** | 500MB DB, 1GB storage | $25/mo (Pro) |

**Typical production cost**: ~$30-50/month

---

## Alternative: Render

If you prefer Render over Railway:

1. Create a **Web Service** pointing to `server/`
2. Set **Build Command**: `npm install && npx prisma generate && npm run build`
3. Set **Start Command**: `npx prisma migrate deploy && node dist/index.js`
4. Add environment variables (same as Railway)

Render also supports WebSockets and has similar pricing.

---

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Supabase Documentation](https://supabase.com/docs)
- [Project Issues](https://github.com/a13xperi/kaa-notion-backend/issues)
