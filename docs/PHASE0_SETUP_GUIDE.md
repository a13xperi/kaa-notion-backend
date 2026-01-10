# Phase 0 Environment Setup Guide

This guide covers the complete Phase 0 environment setup process, including environment variable configuration, database migrations, and full stack verification.

## Quick Start

Run the automated setup script:

```bash
npm run phase0-setup
```

This script will:
1. Check if `.env` file exists (creates from `env.example` if not)
2. Validate all environment variables
3. Generate Prisma Client
4. Check database connection
5. Run Prisma migrations (if needed)
6. Verify database indexes
7. Build the server

## Manual Setup Steps

If you prefer to set up manually:

### 1. Environment Variables

Copy the example file and fill in your values:

```bash
cp env.example .env
```

Required variables (minimum for basic operation):
- `DATABASE_URL` - PostgreSQL connection string (Supabase)
- `JWT_SECRET` - Secure random secret for JWT tokens (min 32 chars)
- `OPENAI_API_KEY` - Required for Sage chat functionality

Optional but recommended:
- `NOTION_API_KEY` - For Notion integration
- `STRIPE_SECRET_KEY` - For payments
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` - For file storage
- `SENTRY_DSN` - For error tracking

### 2. Validate Environment

```bash
npm run verify-env
```

This will validate all environment variables and test connectivity to services.

### 3. Database Setup

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate
```

For production, use:

```bash
npm run prisma:deploy
```

Verify indexes are applied:

```bash
npm run verify-indexes
```

### 4. Build

Build the server:

```bash
cd server && npm run build
```

Build the frontend:

```bash
cd kaa-app && npm run build
```

## End-to-End Sync Testing

After setup is complete, you can test the Notion-Postgres sync flow:

```bash
npm run test:e2e-sync
```

This test will:
1. Create a test project in Postgres
2. Trigger Notion sync (if configured)
3. Simulate Notion webhook trigger
4. Verify Postgres sync status
5. Check reconciliation endpoint

**Note:** Some tests may require:
- Server to be running (`npm start`)
- `NOTION_API_KEY` to be configured
- Admin authentication for reconciliation endpoint

## Troubleshooting

### Database Connection Failed

- Verify `DATABASE_URL` is correct
- Check if database is accessible
- For Supabase, use the connection pooling URL with `pgbouncer=true`

### Migrations Failed

- Ensure database is accessible
- Check if migrations have been initialized
- Try `npm run prisma:migrate` manually
- Check Prisma logs for specific errors

### Index Verification Failed

- Run migrations first: `npm run prisma:migrate`
- Check if database indexes are actually created
- Review Prisma schema for index definitions

### Build Errors

- Ensure all dependencies are installed: `npm install`
- Check TypeScript errors: `cd server && npm run build`
- Verify Prisma Client is generated: `npm run prisma:generate`

## Next Steps

After Phase 0 setup is complete:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Verify health check:**
   ```bash
   curl http://localhost:3001/api/health
   ```

3. **Check metrics endpoint:**
   ```bash
   curl http://localhost:3001/api/metrics
   ```

4. **Run end-to-end sync test:**
   ```bash
   npm run test:e2e-sync
   ```

## Environment Variable Reference

See `env.example` for a complete list of all environment variables with descriptions.

Key variables:
- **Database:** `DATABASE_URL`
- **Authentication:** `JWT_SECRET`, `JWT_EXPIRES_IN`
- **Notion:** `NOTION_API_KEY`, `NOTION_PROJECTS_DATABASE_ID`
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Supabase:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **OpenAI:** `OPENAI_API_KEY` (required for Sage chat)
- **Error Tracking:** `SENTRY_DSN`

## Scripts Reference

- `npm run phase0-setup` - Complete Phase 0 setup automation
- `npm run verify-env` - Validate environment variables
- `npm run verify-indexes` - Verify database indexes are applied
- `npm run test:e2e-sync` - Run end-to-end sync tests
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations (dev)
- `npm run prisma:deploy` - Deploy migrations (prod)
- `npm run prisma:studio` - Open Prisma Studio (database GUI)