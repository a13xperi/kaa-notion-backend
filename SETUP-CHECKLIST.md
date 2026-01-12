# SAGE MVP Platform - Setup Checklist

This document tracks all infrastructure components needed for the platform to function correctly.

## Current Status Overview

| Component | Status | Notes |
|-----------|--------|-------|
| Database (Postgres/Supabase) | ⏳ Needs Verification | Check connection & user data |
| Stripe Integration | ⏳ Needs Verification | Checkout flow & webhooks |
| Landing Page | 🔗 External Repo | `a13xperi/kaa-landing` |
| Vercel Deployment | ⏳ Needs Config | Environment variables needed |
| Google OAuth | ✅ Code Ready | Needs Google Console setup |
| Admin Portal | ✅ Working | Dashboard, leads, projects, clients |
| Super Admin (Karen & Pam) | ✅ Code Ready | `/api/super-admin/*` routes |
| Team Portal | ⚠️ Issues Reported | Needs investigation |
| Email Service | ⏳ Needs Config | Resend or SMTP setup |

---

## 1. Database Setup

### Required Environment Variables
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Verification Steps
- [ ] Run `npx prisma migrate deploy` to apply migrations
- [ ] Run `npx prisma db seed` to seed initial data (if applicable)
- [ ] Test database connection via `/api/health`
- [ ] Verify user data exists in database

---

## 2. Stripe Integration

### Required Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_TIER1_PRICE_ID=price_...
STRIPE_TIER2_PRICE_ID=price_...
STRIPE_TIER3_PRICE_ID=price_...
```

### Setup Steps
1. [ ] Create Stripe account at https://dashboard.stripe.com
2. [ ] Create products for each tier:
   - Tier 1: "The Concept" - $299
   - Tier 2: "The Builder" - $1,499
   - Tier 3: "The Concierge" - $4,999
3. [ ] Get API keys from Stripe Dashboard
4. [ ] Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
5. [ ] Configure webhook events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

---

## 3. Google OAuth Setup

### Required Environment Variables
```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
```

### Setup Steps
1. [ ] Go to https://console.cloud.google.com
2. [ ] Create a new project (or use existing)
3. [ ] Enable Google+ API
4. [ ] Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. [ ] Configure OAuth consent screen:
   - App name: SAGE
   - User support email: your-email
   - Authorized domains: your-domain.com
6. [ ] Add authorized redirect URIs:
   - Development: `http://localhost:3000/auth/google/callback`
   - Production: `https://your-domain.com/auth/google/callback`
7. [ ] Copy Client ID and Client Secret to environment variables

### Frontend Integration
Add to `kaa-app/.env`:
```env
REACT_APP_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

---

## 4. Vercel Deployment

### Required Environment Variables (in Vercel Dashboard)
```
# Server
NODE_ENV=production
DATABASE_URL=
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NOTION_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
RESEND_API_KEY=

# Frontend
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=
REACT_APP_GOOGLE_CLIENT_ID=
```

### Setup Steps
1. [ ] Connect GitHub repository to Vercel
2. [ ] Configure environment variables
3. [ ] Set up custom domain (if applicable)
4. [ ] Configure build settings:
   - Root Directory: (leave empty or specify)
   - Build Command: `npm run build`
   - Output Directory: `build` or `dist`

---

## 5. Super Admin Access (Karen & Pam)

### Configuration
Add to server `.env`:
```env
SUPER_ADMIN_EMAIL_1=karen@kaalandscape.com
SUPER_ADMIN_EMAIL_2=pam@kaalandscape.com
```

### Available Endpoints
- `GET /api/super-admin/overview` - Complete platform overview
- `GET /api/super-admin/users` - All users with detailed info
- `GET /api/super-admin/revenue` - Detailed revenue analytics
- `GET /api/super-admin/activity` - Platform-wide activity log
- `GET /api/super-admin/health` - System health status
- `POST /api/super-admin/impersonate/:userId` - View user data (view-only)

---

## 6. Landing Page Integration

The landing page is in a separate repository: `a13xperi/kaa-landing`

### Integration Options
1. **Subdomain approach**: `www.sage.design` → landing, `app.sage.design` → app
2. **Path-based**: Landing at `/`, app at `/app/*`
3. **Separate deployment**: Each repo deploys independently

---

## 7. Email Service Setup

### Option A: Resend (Recommended)
```env
RESEND_API_KEY=re_...
FROM_EMAIL=SAGE <noreply@sage.design>
```

### Option B: SMTP
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASS=your-password
```

---

## 8. Team Portal Issues

### Known Issues to Investigate
- [ ] Team members not displaying correctly
- [ ] Invite flow not working as expected
- [ ] Role permissions not applying

### Team Routes Available
- `POST /api/team/invite` - Create invite (admin only)
- `GET /api/team/invite/:token` - Validate invite token
- `POST /api/team/invite/:token/accept` - Accept invite
- `GET /api/team/invites` - List pending invites
- `GET /api/team/members` - List team members

---

## Quick Start Commands

```bash
# Install dependencies
cd server && npm install
cd kaa-app && npm install

# Set up database
npx prisma migrate deploy
npx prisma db seed

# Run development servers
npm run dev  # From root (if configured) or run in each directory

# Test API health
curl http://localhost:3001/api/health

# Test auth providers
curl http://localhost:3001/api/auth/providers
```

---

## Support Contacts

- Technical Issues: Check logs via Sentry or server console
- Stripe Issues: https://dashboard.stripe.com/logs
- Database Issues: Check Supabase dashboard
