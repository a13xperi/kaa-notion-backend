# Environment Variable Reference

This is the canonical environment variable reference for the SAGE Platform. The `.env.example` files in each workspace are the source of truth; this document provides comprehensive descriptions and setup guidance.

## Table of Contents

- [Quick Setup](#quick-setup)
- [Backend Variables](#backend-variables)
- [Frontend Variables](#frontend-variables)
- [Docker Variables](#docker-variables)
- [Production Checklist](#production-checklist)

## Quick Setup

```bash
# Copy example files
cp server/.env.example server/.env
cp kaa-app/.env.example kaa-app/.env

# Edit with your values
# See sections below for each variable
```

## Backend Variables

Location: `server/.env`
Source of truth: `server/.env.example`

### Core Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Environment: `development`, `production`, `test` |
| `PORT` | Yes | `3001` | Server port |
| `CORS_ORIGIN` | Yes | `http://localhost:3000` | Allowed CORS origin |

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |

**Format:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`

**Examples:**
```bash
# Local development
DATABASE_URL=postgresql://sage:sage_dev_password@localhost:5432/sage_dev

# Docker
DATABASE_URL=postgresql://sage:sage_dev_password@postgres:5432/sage_dev

# Production (with SSL)
DATABASE_URL=postgresql://user:pass@db.host.com:5432/sage_prod?sslmode=require
```

### Redis (Caching)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | - | Redis connection string |

**Examples:**
```bash
# Local
REDIS_URL=redis://localhost:6379

# Docker
REDIS_URL=redis://redis:6379

# Production (with auth)
REDIS_URL=redis://user:password@redis.host.com:6379
```

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration (e.g., `7d`, `24h`) |

**Generate a secure secret:**
```bash
openssl rand -base64 64
```

### Stripe (Payments)

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | API secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Publishable key (`pk_test_...` or `pk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_TIER_1` | Yes | Price ID for Tier 1 |
| `STRIPE_PRICE_TIER_2` | Yes | Price ID for Tier 2 |
| `STRIPE_PRICE_TIER_3` | Yes | Price ID for Tier 3 |
| `STRIPE_SPROUT_MONTHLY_PRICE_ID` | No | Sprout monthly subscription price |
| `STRIPE_SPROUT_YEARLY_PRICE_ID` | No | Sprout yearly subscription price |
| `STRIPE_CANOPY_MONTHLY_PRICE_ID` | No | Canopy monthly subscription price |
| `STRIPE_CANOPY_YEARLY_PRICE_ID` | No | Canopy yearly subscription price |

**Get keys from:** https://dashboard.stripe.com/apikeys

### Supabase (Storage)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Project URL (`https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Yes | Anonymous/public key |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key (server-side only) |
| `SUPABASE_STORAGE_BUCKET` | No | Bucket name (default: `deliverables`) |

**Get from:** https://supabase.com/dashboard/project/_/settings/api

### Notion (Integration)

| Variable | Required | Description |
|----------|----------|-------------|
| `NOTION_API_KEY` | No | Internal integration token (`secret_...`) |
| `NOTION_DATABASE_ID` | No | Main database ID |
| `NOTION_PROJECTS_DB` | No | Projects database ID |
| `NOTION_LEADS_DB` | No | Leads database ID |

**Get from:** https://www.notion.so/my-integrations

### Email (Resend)

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes | API key (`re_...`) |
| `FROM_EMAIL` | Yes | Sender address (e.g., `SAGE <noreply@sage.com>`) |
| `APP_NAME` | No | Application name for emails |
| `APP_URL` | No | Application URL for email links |

**Get from:** https://resend.com/api-keys

### Push Notifications

| Variable | Required | Description |
|----------|----------|-------------|
| `VAPID_PUBLIC_KEY` | No | VAPID public key |
| `VAPID_PRIVATE_KEY` | No | VAPID private key |
| `VAPID_SUBJECT` | No | Contact email (`mailto:admin@domain.com`) |

**Generate VAPID keys:**
```bash
npx web-push generate-vapid-keys
```

### Monitoring

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | No | Sentry project DSN |
| `LOG_LEVEL` | No | Logging level (`debug`, `info`, `warn`, `error`) |

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Window duration (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |

## Frontend Variables

Location: `kaa-app/.env`
Source of truth: `kaa-app/.env.example`

All frontend variables must be prefixed with `REACT_APP_` to be accessible.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_API_URL` | Yes | `http://localhost:3001` | Backend API URL |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Yes | - | Stripe publishable key |
| `REACT_APP_ENABLE_ANALYTICS` | No | `false` | Enable analytics |
| `REACT_APP_ENABLE_DEBUG` | No | `true` | Enable debug features |
| `REACT_APP_APP_NAME` | No | `SAGE` | Application name |
| `REACT_APP_SUPPORT_EMAIL` | No | - | Support email address |

## Docker Variables

When using Docker Compose, these variables can be set in a `.env` file at the project root or passed via environment.

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `sage` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `sage_dev_password` | PostgreSQL password |
| `POSTGRES_DB` | `sage_dev` | Database name |
| `JWT_SECRET` | `dev-jwt-secret-change-in-production` | JWT secret |
| `STRIPE_SECRET_KEY` | - | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | - | Stripe webhook secret |
| `SUPABASE_URL` | - | Supabase project URL |
| `SUPABASE_ANON_KEY` | - | Supabase anonymous key |
| `NOTION_API_KEY` | - | Notion integration token |
| `NOTION_DATABASE_ID` | - | Notion database ID |
| `STRIPE_PUBLISHABLE_KEY` | - | Stripe publishable key (frontend) |

### Docker Compose Example

Create a `.env` file in the project root:

```bash
# .env (project root - for Docker Compose)
POSTGRES_USER=sage
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=sage_dev

JWT_SECRET=your-jwt-secret-min-32-characters

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...

NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=...
```

## Production Checklist

Before deploying to production, verify:

### Security

- [ ] `JWT_SECRET` is at least 64 characters (generated with `openssl rand -base64 64`)
- [ ] `NODE_ENV` is set to `production`
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] `CORS_ORIGIN` is set to your production domain only
- [ ] No test/development keys are used

### Required Services

- [ ] `DATABASE_URL` points to production database
- [ ] `STRIPE_SECRET_KEY` uses live key (`sk_live_...`)
- [ ] `STRIPE_PUBLISHABLE_KEY` uses live key (`pk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` is configured for production endpoint
- [ ] `RESEND_API_KEY` is configured
- [ ] `SUPABASE_URL` and keys are set

### Optional but Recommended

- [ ] `SENTRY_DSN` is configured for error tracking
- [ ] `REDIS_URL` is configured for caching
- [ ] `VAPID_*` keys are set for push notifications

### Frontend

- [ ] `REACT_APP_API_URL` points to production API
- [ ] `REACT_APP_STRIPE_PUBLISHABLE_KEY` uses live key
- [ ] `REACT_APP_ENABLE_DEBUG` is `false`
