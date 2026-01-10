# Database Setup Required

**Status:** ⚠️ Database configuration needed to complete setup

## Current Status

- ✅ Notion API: Configured and connected
- ✅ OpenAI API: Configured and connected
- ❌ **DATABASE_URL: NOT CONFIGURED** (Required)
- ❌ Supabase: Not configured (Optional but recommended)

## Quick Setup Options

### Option 1: Supabase (Recommended - Free Tier Available)

1. **Create a Supabase Project:**
   - Go to https://app.supabase.com
   - Click "New Project"
   - Fill in project details
   - Save your database password!

2. **Get Connection String:**
   - Go to Settings → Database
   - Copy the "Connection pooling" connection string
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?pgbouncer=true`

3. **Configure .env:**
   ```bash
   # Add to .env:
   DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?pgbouncer=true"
   SUPABASE_URL="https://[PROJECT_REF].supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
   ```

4. **Run Setup:**
   ```bash
   npm run configure-db  # Interactive helper
   # OR
   npm run phase0-setup  # Full automated setup
   ```

### Option 2: Docker (Local Development)

1. **Install Docker:**
   - Download from: https://www.docker.com/get-started

2. **Start PostgreSQL:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d db
   ```

3. **Configure .env:**
   ```bash
   # Add to .env:
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sage"
   ```

4. **Run Setup:**
   ```bash
   npm run phase0-setup
   ```

### Option 3: Local PostgreSQL

1. **Install PostgreSQL:**
   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15
   
   # Linux
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create Database:**
   ```bash
   createdb sage
   ```

3. **Configure .env:**
   ```bash
   # Add to .env:
   DATABASE_URL="postgresql://postgres:password@localhost:5432/sage"
   ```

4. **Run Setup:**
   ```bash
   npm run phase0-setup
   ```

## After Database Configuration

Once `DATABASE_URL` is configured, run:

```bash
# Full automated setup
npm run phase0-setup

# Or manual steps:
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run verify-indexes     # Verify indexes are applied
npm start                  # Start server
npm run test:e2e-sync      # Run end-to-end tests
```

## Verification

After configuration, verify it works:

```bash
# Check environment
npm run verify-env

# Check database connection
npm run prisma:generate

# Check migrations
npx prisma migrate status

# Check indexes
npm run verify-indexes
```

## Need Help?

- **Supabase Setup:** See `docs/supabase-setup.md`
- **Docker Setup:** See `docs/DOCKER_SETUP.md`
- **Environment Setup:** See `docs/ENVIRONMENT_SETUP.md`
- **Phase 0 Guide:** See `docs/PHASE0_SETUP_GUIDE.md`

---

**Last Updated:** 2025-01-XX  
**Status:** Waiting for DATABASE_URL configuration