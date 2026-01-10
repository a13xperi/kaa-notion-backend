# Commands for Warp Terminal

**Updated:** 2025-01-XX  
**Issue Fixed:** npm workspaces resolution problem

## ✅ Fixed Commands (Use These)

### Option 1: Use Direct Script Path (Recommended)
```bash
# Direct execution (always works)
bash scripts/configure-database.sh
```

### Option 2: Use npm from Root Directory
```bash
# Make sure you're in the root directory
cd "/Users/alex/KAA app/KAA app"

# Then run (should work now)
npm run configure-db
```

### Option 3: Use Full Path
```bash
# Absolute path (always works)
bash "/Users/alex/KAA app/KAA app/scripts/configure-database.sh"
```

## Step-by-Step Commands for Warp Terminal

### Step 1: Check Current Status
```bash
# Navigate to project root
cd "/Users/alex/KAA app/KAA app"

# Check if DATABASE_URL is configured
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ CONFIGURED' : '❌ NOT CONFIGURED')"

# Verify environment
npm run verify-env
```

### Step 2: Configure Database (Choose One)

#### Option A: Interactive Helper (Recommended)
```bash
# Direct script execution (always works)
bash scripts/configure-database.sh

# OR use npm (should work after fix)
npm run configure-db
```

**Follow the prompts:**
- Option 1: Supabase (recommended) - requires connection string
- Option 2: Local PostgreSQL - requires PostgreSQL installed
- Option 3: Docker PostgreSQL - requires Docker installed
- Option 4: Skip for now

#### Option B: Manual Configuration (Supabase)
```bash
# Edit .env file and add (replace with your values):
cat >> .env << 'EOF'
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?pgbouncer=true"
SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
EOF

# Verify it was added
grep DATABASE_URL .env
```

#### Option C: Manual Configuration (Docker)
```bash
# Check if Docker is installed
which docker

# If Docker is installed:
docker compose -f docker-compose.dev.yml up -d db

# Wait for database to be ready
sleep 10

# Add DATABASE_URL to .env
cat >> .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sage"
EOF

# Verify it was added
grep DATABASE_URL .env
```

### Step 3: Verify Configuration
```bash
# Check if DATABASE_URL is now configured
node -e "require('dotenv').config(); const db = process.env.DATABASE_URL; console.log('DATABASE_URL:', db ? '✅ CONFIGURED: ' + db.substring(0, 50) + '...' : '❌ NOT CONFIGURED')"

# Test database connection
npm run verify-env
```

### Step 4: Run Full Setup (After DATABASE_URL Configured)
```bash
# Non-interactive mode (will skip database steps if not configured)
NON_INTERACTIVE=true npm run phase0-setup

# OR if DATABASE_URL is configured, run normally:
npm run phase0-setup
```

### Step 5: Start Server
```bash
# Start the server
npm start

# OR for development mode with hot reload:
npm run dev
```

**In another terminal, verify it's working:**
```bash
# Check health endpoint
curl http://localhost:3001/api/health

# Check metrics endpoint
curl http://localhost:3001/api/metrics
```

### Step 6: Run Tests (After Server is Running)
```bash
# End-to-end sync tests
npm run test:e2e-sync

# All tests
npm test

# Or specific test suites:
npm run test:backend
npm run test:frontend
```

## Quick Start (Copy-Paste All)

If you have DATABASE_URL ready:

```bash
# 1. Navigate to project root
cd "/Users/alex/KAA app/KAA app"

# 2. Configure DATABASE_URL (choose method above)
# For Supabase, add manually:
# echo 'DATABASE_URL="postgresql://postgres:password@host:5432/database"' >> .env

# 3. Verify it's configured
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ CONFIGURED' : '❌ NOT CONFIGURED')"

# 4. Run full setup
npm run phase0-setup

# 5. Start server
npm start

# 6. In another terminal, verify health
curl http://localhost:3001/api/health

# 7. Run tests
npm run test:e2e-sync
```

## Troubleshooting Commands

```bash
# Check if you're in the right directory
pwd
# Should show: /Users/alex/KAA app/KAA app

# Check if script exists
ls -la scripts/configure-database.sh

# Check npm workspaces
npm config get workspaces

# Run script directly (bypasses npm)
bash scripts/configure-database.sh

# Check all available scripts
npm run

# Check current workspace
npm whoami 2>/dev/null || echo "Not logged in"
```

## Alternative: Manual .env Configuration

If the interactive script doesn't work, manually edit `.env`:

```bash
# Open .env in your editor
open .env
# OR
nano .env
# OR
vim .env

# Add this line (replace with your actual database URL):
# DATABASE_URL="postgresql://user:password@host:5432/database"
```

---

**Note:** The npm workspace issue has been fixed. Use `bash scripts/configure-database.sh` directly if npm still has issues.