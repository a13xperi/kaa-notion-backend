# Vercel Deployment Guide for KAA/SAGE MVP Platform

This guide covers deploying the SAGE MVP Platform to Vercel.

## Architecture Overview

The deployment consists of:
- **Frontend**: React SPA (`kaa-app/`) - Deployed as static files
- **Backend API**: Express routes (`api/`) - Deployed as Vercel Serverless Functions
- **Database**: Supabase PostgreSQL (external)
- **Storage**: Supabase Storage (external)

> **Note**: WebSocket features (real-time updates) are not supported in Vercel serverless. For full WebSocket support, consider deploying the backend to Railway, Render, or Fly.io.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. A [Supabase project](https://supabase.com/) with PostgreSQL database
3. Optional: [Stripe account](https://stripe.com/) for payments
4. Optional: [Resend account](https://resend.com/) for emails
5. Optional: [Google Cloud Console](https://console.cloud.google.com/) for OAuth

## Quick Start

### 1. Connect to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project (from repository root)
vercel link
```

### 2. Configure Environment Variables

In the Vercel Dashboard (Settings > Environment Variables), add the following:

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | `your-super-secret-jwt-key-min-32-chars` |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `NODE_ENV` | Environment | `production` |

#### Frontend Variables (prefix with `REACT_APP_`)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | API base URL | `https://your-app.vercel.app` |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Stripe public key | `pk_live_...` |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `REACT_APP_APP_NAME` | Application name | `SAGE` |

#### Stripe (for payments)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_SUCCESS_URL` | Checkout success redirect URL |
| `STRIPE_CANCEL_URL` | Checkout cancel redirect URL |
| `STRIPE_TIER1_PRICE_ID` | Price ID for Tier 1 |
| `STRIPE_TIER2_PRICE_ID` | Price ID for Tier 2 |
| `STRIPE_TIER3_PRICE_ID` | Price ID for Tier 3 |

#### Supabase (storage)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `STORAGE_BUCKET` | Storage bucket name (default: `deliverables`) |

#### Email (Resend)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Default sender email |
| `EMAIL_REPLY_TO` | Reply-to email address |

#### Google OAuth

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI |
| `FRONTEND_URL` | Frontend URL for redirects |

#### Notion (optional)

| Variable | Description |
|----------|-------------|
| `NOTION_API_KEY` | Notion integration token |
| `NOTION_PROJECTS_DATABASE_ID` | Projects database ID |

#### CORS & Security

| Variable | Description |
|----------|-------------|
| `CORS_ORIGINS` | Allowed origins (comma-separated) |

### 3. Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Database Setup

### 1. Run Prisma Migrations

Before first deployment, run migrations against your Supabase database:

```bash
# Set DATABASE_URL locally
export DATABASE_URL="postgresql://..."

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:deploy

# (Optional) Seed the database
npm run prisma:seed
```

### 2. Verify Connection

After deployment, verify the database connection:

```bash
curl https://your-app.vercel.app/api/health?detailed=true
```

## Project Structure for Vercel

```
/
├── api/                    # Serverless API functions
│   ├── index.ts           # Main API handler (Express wrapper)
│   └── tsconfig.json      # TypeScript config for API
├── kaa-app/               # React frontend
│   ├── build/             # Built static files (output)
│   └── vercel.json        # Frontend-specific config
├── server/                # Backend source code
│   └── src/               # Express routes, services, etc.
├── prisma/                # Database schema
├── vercel.json            # Root Vercel configuration
└── package.json           # Root package.json
```

## Configuration Files

### Root `vercel.json`

The root configuration handles:
- Building both frontend and backend
- Routing `/api/*` to serverless functions
- Routing all other paths to the React SPA
- CORS headers for API requests

### Frontend `kaa-app/vercel.json`

Handles React Router client-side routing with rewrites.

## Deployment Workflow

### Automatic Deployments

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pushes to other branches / Pull Requests

### Manual Deployments

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod

# Redeploy with updated env vars
vercel --prod --force
```

## Updating Stripe Webhooks

After deployment, update Stripe webhooks:

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET` env var

## Updating Google OAuth

After deployment, update Google OAuth redirect URIs:

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add authorized redirect URI: `https://your-app.vercel.app/auth/google/callback`
4. Add authorized JavaScript origin: `https://your-app.vercel.app`

## Troubleshooting

### Build Failures

```bash
# Check build logs
vercel logs

# Test build locally
npm run build:vercel
```

### API Errors

```bash
# Check function logs
vercel logs --follow

# Test health endpoint
curl https://your-app.vercel.app/api/health
```

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Ensure Supabase allows connections from Vercel IPs
3. Check SSL mode in connection string (`?sslmode=require`)

### CORS Issues

1. Check `CORS_ORIGINS` includes your frontend URL
2. Verify API headers in `vercel.json`

## Performance Optimization

### Cold Starts

Serverless functions have cold starts. To minimize:
- Keep function code small
- Use connection pooling for database
- Consider Vercel Pro for faster cold starts

### Caching

Add caching headers in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

## Alternative: Split Deployment

For full WebSocket support, consider:

1. **Frontend on Vercel**: `kaa-app/` only
2. **Backend on Railway/Render**: `server/` with WebSockets

Update `REACT_APP_API_URL` to point to the separate backend URL.

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard > Analytics

### Health Checks

- `/api/health` - Basic health check
- `/api/health?detailed=true` - Detailed component status

### Error Tracking

Configure Sentry:
```
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Project Issues](https://github.com/a13xperi/kaa-notion-backend/issues)
