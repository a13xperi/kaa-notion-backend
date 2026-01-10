# SAGE MVP Platform - Environment Setup Guide

This guide covers all environment variables required to run the SAGE MVP Platform.

## Quick Start

1. Copy `env.example` to `.env` in the root directory
2. Copy `env.example` to `server/.env` for the backend
3. Fill in the required values for each service

---

## Backend Environment Variables

### Database (Required)

```bash
# PostgreSQL connection via Supabase
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"
```

### Authentication (Required)

```bash
# JWT Configuration
JWT_SECRET="your-secure-random-secret-key-min-32-chars"
JWT_EXPIRES_IN="7d"  # Token expiration (e.g., "7d", "24h", "1h")
```

### Stripe (Required for Payments)

```bash
# Stripe API Keys (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY="sk_test_..."  # Use sk_live_... in production
STRIPE_WEBHOOK_SECRET="whsec_..."  # From Stripe webhook settings

# Checkout URLs
STRIPE_SUCCESS_URL="https://yourdomain.com/success"
STRIPE_CANCEL_URL="https://yourdomain.com/cancel"

# Optional: Pre-configured Price IDs (if using Stripe Products)
STRIPE_TIER1_PRICE_ID="price_..."
STRIPE_TIER2_PRICE_ID="price_..."
STRIPE_TIER3_PRICE_ID="price_..."
```

### Supabase Storage (Required for File Uploads)

```bash
# Supabase Project Settings
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Storage Configuration
STORAGE_BUCKET="deliverables"
MAX_FILE_SIZE_MB="50"
```

### Notion Integration (Optional)

```bash
# Notion API (from https://www.notion.so/my-integrations)
NOTION_API_KEY="secret_..."
NOTION_PROJECTS_DATABASE_ID="..."  # Database ID for project sync
```

### Figma Integration (Optional)

```bash
# Figma API (from https://www.figma.com/developers/api)
FIGMA_ACCESS_TOKEN="figd_..."
```

### Server Configuration

```bash
# Server
PORT=3001
NODE_ENV="development"  # or "production"

# CORS (comma-separated origins)
CORS_ORIGINS="http://localhost:3000,https://yourdomain.com"
```

---

## Frontend Environment Variables

Create a `.env` file in the `kaa-app` directory:

```bash
# API Configuration
REACT_APP_API_URL="http://localhost:3001"

# Stripe Public Key
REACT_APP_STRIPE_PUBLIC_KEY="pk_test_..."

# Optional: Feature Flags
REACT_APP_ENABLE_ANALYTICS="true"
REACT_APP_ENABLE_PWA="true"
```

---

## Service-Specific Setup

### 1. Supabase Setup

1. Create a project at https://supabase.com
2. Go to Settings → API to get:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_KEY` (service_role key)
3. Create a storage bucket named "deliverables":
   - Go to Storage → Create bucket
   - Set as private (authenticated access only)
4. Database is automatically available via `DATABASE_URL`

### 2. Stripe Setup

1. Create account at https://stripe.com
2. Get API keys from Dashboard → Developers → API Keys
3. Create webhook endpoint:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 3. Notion Setup (Optional)

1. Create integration at https://www.notion.so/my-integrations
2. Create a database for projects with these properties:
   - Name (title)
   - Status (select)
   - Tier (number)
   - Client (text)
   - Progress (number)
3. Share the database with your integration
4. Copy database ID from the URL

### 4. JWT Secret Generation

Generate a secure secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

---

## Environment Files Structure

```
/workspace
├── .env                    # Root environment (shared)
├── kaa-app/
│   └── .env               # Frontend environment
└── server/
    └── .env               # Backend environment
```

---

## Development vs Production

### Development

```bash
NODE_ENV="development"
STRIPE_SECRET_KEY="sk_test_..."
DATABASE_URL="postgresql://..."  # Can use local or Supabase dev
```

### Production

```bash
NODE_ENV="production"
STRIPE_SECRET_KEY="sk_live_..."
DATABASE_URL="postgresql://..."  # Production Supabase
JWT_SECRET="<very-secure-production-secret>"
```

---

## Validation Checklist

Before deploying, verify:

- [ ] `DATABASE_URL` connects successfully (`npx prisma db push`)
- [ ] `JWT_SECRET` is at least 32 characters
- [ ] `STRIPE_SECRET_KEY` matches environment (test/live)
- [ ] `STRIPE_WEBHOOK_SECRET` is set for webhook verification
- [ ] `SUPABASE_SERVICE_KEY` has storage access
- [ ] All URLs use HTTPS in production

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
npx prisma db pull

# If using Supabase, check:
# - IP allowlist in project settings
# - Correct password in connection string
```

### Stripe Webhook Failures

```bash
# Test webhooks locally with Stripe CLI
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

### JWT Token Issues

```bash
# Verify secret is consistent between services
# Check token expiration settings
# Ensure clock sync on server
```

---

## Security Notes

1. **Never commit `.env` files** - they're in `.gitignore`
2. **Use different secrets** for development and production
3. **Rotate secrets** periodically, especially `JWT_SECRET`
4. **Restrict Supabase service key** usage to server-side only
5. **Enable Stripe webhook signature verification** in production
