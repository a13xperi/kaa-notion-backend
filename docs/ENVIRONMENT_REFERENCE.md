# Environment Reference

This document lists every environment variable used across the repo and which app consumes it. The canonical list lives in [`env.example`](../env.example); copy it to `.env` and adjust values for your environment.

## Quick Setup

```bash
# 1. Copy environment files
cp env.example .env
cp server/.env.example server/.env

# 2. Install dependencies
npm install

# 3. Generate Prisma client (requires DATABASE_URL)
npx prisma generate

# 4. Push schema to database (for quick setup)
npx prisma db push

# 5. Seed with demo data (optional)
npx prisma db seed

# 6. Start server
cd server && npm run dev
```

## Required Environment Variables

These variables **must** be configured for the application to work:

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/sage` |
| `JWT_SECRET` | Secret for signing JWT tokens (min 32 chars) | `your-secure-random-secret-key-min-32-characters` |

## Recommended Environment Variables

These are needed for full functionality:

| Variable | Description | Service |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase project URL | Storage |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Storage |
| `STRIPE_SECRET_KEY` | Stripe API secret key | Payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Payments |

## Variable Catalog

| Variable | Used by | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | Backend API (server), Docker | Supabase project URL for storage integration. |
| `SUPABASE_ANON_KEY` | Supabase tooling | Not currently used in app code; reserved for client-side Supabase access. |
| `SUPABASE_SERVICE_KEY` | Backend API (server), Docker, `scripts/verify-deployment.sh` | Service role key for storage access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase tooling | Legacy alias used in docs/scripts (not used by app code). |
| `DATABASE_URL` | Backend API (server), Docker | Primary database connection string (required). |
| `DATABASE_CONNECTION_LIMIT` | Backend API (server) | Connection pool size. |
| `DATABASE_CONNECTION_TIMEOUT` | Backend API (server) | Connection timeout (ms). |
| `DATABASE_QUERY_TIMEOUT` | Backend API (server) | Query timeout (ms). |
| `DATABASE_IDLE_TIMEOUT` | Backend API (server) | Idle timeout (ms). |
| `SLOW_QUERY_THRESHOLD` | Backend API (server) | Slow query threshold (ms). |
| `NOTION_API_KEY` | Backend API (server), Notion API server | Notion integration token. |
| `NOTION_PARENT_PAGE_ID` | Notion API server | Parent page used for auto-created databases. |
| `NOTION_PROJECTS_DATABASE_ID` | Backend API (server), Docker | Notion projects database ID. |
| `CLIENT_CREDENTIALS_DB_ID` | Notion API server | Notion database ID for client credentials. |
| `CLIENT_DOCUMENTS_DB_ID` | Notion API server | Notion database ID for client documents. |
| `ACTIVITY_LOG_DB_ID` | Notion API server | Notion database ID for activity logs. |
| `CLIENT_ACTIVITIES_DB_ID` | Notion API server | Alternate activity log database ID. |
| `CLIENTS_DB_ID` | Notion API server | Notion database ID for client records. |
| `STRIPE_SECRET_KEY` | Backend API (server) | Stripe secret key for payments. |
| `STRIPE_PUBLISHABLE_KEY` | Frontend build (Docker) | Passed into the frontend build. |
| `STRIPE_WEBHOOK_SECRET` | Backend API (server) | Stripe webhook signing secret. |
| `STRIPE_SUCCESS_URL` | Backend API (server), Docker | Checkout success redirect URL. |
| `STRIPE_CANCEL_URL` | Backend API (server), Docker | Checkout cancel redirect URL. |
| `STRIPE_TIER1_PRICE_ID` | Backend API (server) | Optional Stripe price ID override. |
| `STRIPE_TIER2_PRICE_ID` | Backend API (server) | Optional Stripe price ID override. |
| `STRIPE_TIER3_PRICE_ID` | Backend API (server) | Optional Stripe price ID override. |
| `STRIPE_TIER4_PRICE_ID` | Backend API (server) | Optional Stripe price ID override. |
| `RESEND_API_KEY` | Backend API (server) | Resend email provider key. |
| `SMTP_HOST` | Backend API (server) | SMTP host for email. |
| `SMTP_PORT` | Backend API (server) | SMTP port. |
| `SMTP_SECURE` | Backend API (server) | SMTP TLS toggle (`true`/`false`). |
| `SMTP_USER` | Backend API (server) | SMTP username. |
| `SMTP_PASS` | Backend API (server) | SMTP password. |
| `EMAIL_FROM` | Backend API (server) | Default sender address. |
| `EMAIL_REPLY_TO` | Backend API (server) | Reply-to address. |
| `TEAM_EMAIL` | Notion API server | Notifications for team updates. |
| `NODE_ENV` | Backend API (server), Docker | Runtime environment. |
| `PORT` | Backend API (server) | API port. |
| `FRONTEND_URL` | Backend API (server), Docker | Used to build links in emails. |
| `ENABLE_API_DOCS` | Backend API (server) | Opt-in API docs in production. |
| `LOG_LEVEL` | Backend API (server) | Log verbosity. |
| `LOG_FORMAT` | Backend API (server) | Log format (`json` or `pretty`). |
| `SERVICE_NAME` | Backend API (server) | Service name for logs/metrics. |
| `CORS_ORIGINS` | Backend API (server) | Allowed origins (comma-separated). |
| `SENTRY_DSN` | Backend API (server) | Sentry DSN for error tracking. |
| `SLACK_WEBHOOK_URL` | Backend API (server) | Slack webhook URL. |
| `SLACK_DEFAULT_CHANNEL` | Backend API (server) | Default Slack channel. |
| `SLACK_ENABLED` | Backend API (server) | Toggle Slack notifications. |
| `REDIS_URL` | Backend API (server) | Redis connection string. |
| `CACHE_TTL` | Backend API (server) | Default cache TTL (seconds). |
| `CACHE_ENABLED` | Backend API (server) | Toggle caching. |
| `WEBHOOK_SIGNING_SECRET` | Backend API (server) | HMAC secret for outgoing webhooks. |
| `FIGMA_WEBHOOK_PASSCODE` | Backend API (server) | Passcode validation for Figma webhook. |
| `REACT_APP_API_URL` | Frontend (kaa-app) | Base API URL for the React app. |
| `REACT_APP_WS_URL` | Frontend (kaa-app) | WebSocket URL for realtime features. |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Frontend (kaa-app) | Stripe publishable key for client-side checkout. |
| `REACT_APP_VERSION` | Frontend (kaa-app) | Display/build version. |
| `REACT_APP_STRIPE_TIER1_PRODUCT_ID` | Frontend (kaa-app) | Optional Stripe product ID override. |
| `REACT_APP_STRIPE_TIER1_PRICE_ID` | Frontend (kaa-app) | Optional Stripe price ID override. |
| `REACT_APP_STRIPE_TIER2_PRODUCT_ID` | Frontend (kaa-app) | Optional Stripe product ID override. |
| `REACT_APP_STRIPE_TIER2_PRICE_ID` | Frontend (kaa-app) | Optional Stripe price ID override. |
| `REACT_APP_STRIPE_TIER3_PRODUCT_ID` | Frontend (kaa-app) | Optional Stripe product ID override. |
| `REACT_APP_STRIPE_TIER3_PRICE_ID` | Frontend (kaa-app) | Optional Stripe price ID override. |
| `REACT_APP_STRIPE_TIER3_DEPOSIT_PRICE_ID` | Frontend (kaa-app) | Optional Stripe deposit price ID override. |
| `REACT_APP_STRIPE_TIER4_PRODUCT_ID` | Frontend (kaa-app) | Optional Stripe product ID override. |
| `REACT_APP_STRIPE_TIER4_PRICE_ID` | Frontend (kaa-app) | Optional Stripe price ID override. |
| `JWT_SECRET` | Backend API (server) | JWT signing secret (required). |
| `JWT_EXPIRES_IN` | Backend API (server) | Access token TTL. |
| `REFRESH_TOKEN_EXPIRES_IN` | Backend API (server) | Refresh token TTL. |
| `STORAGE_BUCKET` | Backend API (server) | Supabase storage bucket. |
| `MAX_FILE_SIZE_MB` | Backend API (server) | File upload size limit. |
| `POSTGRES_USER` | Docker/Postgres | Database user for local containers. |
| `POSTGRES_PASSWORD` | Docker/Postgres | Database password for local containers. |
| `POSTGRES_DB` | Docker/Postgres | Database name for local containers. |
| `OPENAI_API_KEY` | Notion API server, `transcribe-audio.js` | OpenAI API key for chat/transcription utilities. |

## Push Notifications (PWA)

| Variable | Description |
| --- | --- |
| `VAPID_PUBLIC_KEY` | VAPID public key for web push |
| `VAPID_PRIVATE_KEY` | VAPID private key for web push |
| `VAPID_SUBJECT` | Contact email for push service |

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

## Subscription Billing

| Variable | Description |
| --- | --- |
| `STRIPE_SPROUT_MONTHLY_PRICE_ID` | Stripe Price ID for Sprout monthly plan |
| `STRIPE_SPROUT_YEARLY_PRICE_ID` | Stripe Price ID for Sprout yearly plan |
| `STRIPE_CANOPY_MONTHLY_PRICE_ID` | Stripe Price ID for Canopy monthly plan |
| `STRIPE_CANOPY_YEARLY_PRICE_ID` | Stripe Price ID for Canopy yearly plan |

## Related Files

- Canonical template: [`env.example`](../env.example)
- Server template: [`server/.env.example`](../server/.env.example)
- Docker walkthrough: [`docs/DOCKER_SETUP.md`](./DOCKER_SETUP.md)
- Environment setup: [`docs/ENVIRONMENT_SETUP.md`](./ENVIRONMENT_SETUP.md)
- Database setup: [`docs/DATABASE_SETUP_REQUIRED.md`](./DATABASE_SETUP_REQUIRED.md)
