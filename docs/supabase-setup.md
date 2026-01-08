# Supabase Setup Guide

**Last Updated:** 2024-12-28

---

## Overview

This guide walks you through setting up Supabase for the SAGE MVP platform, including creating the project, configuring the database, and setting up Row Level Security (RLS).

---

## Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Sign up or log in
3. Click **New Project**
4. Fill in project details:
   - **Name:** `sage-mvp` (or your preferred name)
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose closest to your users
   - **Pricing Plan:** Free tier is fine for development
5. Click **Create new project**
6. Wait for project to be created (2-3 minutes)

---

## Step 2: Get Connection Strings

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** → `SUPABASE_URL` in `.env`
   - **anon public** key → `SUPABASE_ANON_KEY` in `.env`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` in `.env`

3. Go to **Settings** → **Database**
4. Copy the **Connection string** (URI format)
   - Use the **Connection pooling** string for Prisma
   - Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true`
   - Add to `.env` as `DATABASE_URL`

---

## Step 3: Update Environment Variables

Add to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database Connection (for Prisma)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?pgbouncer=true
```

**Important:**
- Replace `[PASSWORD]` with your database password
- Replace `[PROJECT_REF]` with your project reference ID
- Use connection pooling string for Prisma (includes `pgbouncer=true`)

---

## Step 4: Set Up Database Schema

### Option A: Using Prisma (Recommended)

1. **Generate Prisma Client:**
```bash
npm run prisma:generate
```

2. **Create Initial Migration:**
```bash
npm run prisma:migrate
```
This will:
- Create all tables defined in `prisma/schema.prisma`
- Set up indexes
- Create foreign key relationships

3. **Verify Schema:**
```bash
npm run prisma:studio
```
Opens Prisma Studio in browser to view your database.

### Option B: Using SQL (Alternative)

1. Go to Supabase dashboard → **SQL Editor**
2. Run the SQL migrations from `supabase/migrations/` (if created)
3. Or manually create tables using SQL

---

## Step 5: Set Up Row Level Security (RLS)

RLS policies ensure users can only access their own data.

### Enable RLS on Tables

Run in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

### Create RLS Policies

**Clients can only see their own data:**

```sql
-- Clients can read their own projects
CREATE POLICY "Clients can read own projects"
ON projects FOR SELECT
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- Clients can read their own deliverables
CREATE POLICY "Clients can read own deliverables"
ON deliverables FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  )
);
```

**Team can see all data:**

```sql
-- Team can read all projects
CREATE POLICY "Team can read all projects"
ON projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND user_type IN ('TEAM', 'ADMIN')
  )
);
```

**Service role bypasses RLS:**

- Service role key automatically bypasses RLS
- Use service role key only in backend/server code
- Never expose service role key to frontend

---

## Step 6: Set Up Supabase Storage

1. Go to **Storage** in Supabase dashboard
2. Create bucket: `deliverables`
3. Set bucket to **Public** (or use signed URLs)
4. Configure policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'deliverables' 
  AND auth.role() = 'authenticated'
);

-- Allow users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deliverables'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Step 7: Test Connection

### Test from Backend

Create a test file `test-supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count');
    
    if (error) throw error;
    console.log('✅ Supabase connection successful!');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
  }
}

test();
```

Run: `node test-supabase.js`

### Test from Prisma

```bash
npm run prisma:studio
```

If Prisma Studio opens and shows your tables, connection is working.

---

## Step 8: Environment-Specific Setup

### Development

- Use free tier Supabase project
- Local `.env` file with dev credentials
- Connection pooling enabled

### Staging

- Create separate Supabase project for staging
- Use Vercel environment variables
- Test data, real Stripe test mode

### Production

- Create separate Supabase project for production
- Use Vercel environment variables
- Real Stripe keys
- Enable backups in Supabase dashboard

---

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use service role key only in backend** - Never expose to frontend
3. **Use anon key in frontend** - Limited permissions via RLS
4. **Enable RLS on all tables** - Defense in depth
5. **Use connection pooling** - Better performance and security
6. **Rotate keys periodically** - In Supabase dashboard → Settings → API

---

## Troubleshooting

### Connection Timeout

**Problem:** Prisma can't connect to Supabase

**Solutions:**
- Check `DATABASE_URL` format (should include `pgbouncer=true`)
- Verify database password is correct
- Check Supabase project is active
- Try direct connection string (without pooling) for testing

### RLS Blocking Queries

**Problem:** Queries return empty results

**Solutions:**
- Verify RLS policies are correct
- Check user authentication (auth.uid())
- Use service role key for backend operations
- Test policies in Supabase SQL Editor

### Migration Errors

**Problem:** Prisma migrations fail

**Solutions:**
- Check `DATABASE_URL` is correct
- Verify database password
- Check if tables already exist (may need to drop first)
- Review migration SQL in `prisma/migrations/`

---

## Next Steps

1. ✅ Supabase project created
2. ✅ Connection strings configured
3. ✅ Database schema created (Prisma migrations)
4. ✅ RLS policies set up
5. ✅ Storage bucket created
6. ✅ Connection tested
7. **Next:** Set up sync service (Postgres → Notion)

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-supabase)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
