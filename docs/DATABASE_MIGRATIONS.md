# Database Migrations Guide

This guide covers database migrations for the SAGE MVP Platform using Prisma.

## Quick Reference

```bash
# Common commands
npm run prisma:migrate       # Apply migrations (dev)
npm run prisma:deploy        # Deploy migrations (prod)
npm run prisma:generate      # Generate Prisma Client
npm run prisma:studio        # Open Prisma Studio
npm run prisma:seed          # Seed database
npm run prisma:reset         # Reset database (dev only)

# Using the helper script
./scripts/db-migrate.sh status    # Check migration status
./scripts/db-migrate.sh create add_feature  # Create new migration
./scripts/db-migrate.sh apply     # Apply pending migrations
./scripts/db-migrate.sh rollback  # Get rollback instructions
```

## Creating Migrations

### 1. Modify the Schema

Edit `prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  avatar    String?  // NEW FIELD
  // ...
}
```

### 2. Generate Migration

```bash
# Development (creates migration and applies it)
npx prisma migrate dev --name add_user_avatar

# Or use the helper script
./scripts/db-migrate.sh create add_user_avatar
```

### 3. Review Migration SQL

Check the generated SQL in `prisma/migrations/<timestamp>_add_user_avatar/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "users" ADD COLUMN "avatar" TEXT;
```

## Migration Best Practices

### DO:
- ✅ Use descriptive migration names
- ✅ Review generated SQL before committing
- ✅ Test migrations on a copy of production data
- ✅ Include rollback instructions in complex migrations
- ✅ Keep migrations small and focused
- ✅ Add default values for non-nullable columns

### DON'T:
- ❌ Edit migrations after they've been applied
- ❌ Delete migrations from the migrations folder
- ❌ Run `migrate reset` in production
- ❌ Add non-nullable columns without defaults

## Handling Common Scenarios

### Adding a Required Column

```prisma
// Step 1: Add as optional
model User {
  newField String?
}

// Step 2: Backfill data
// Run: UPDATE users SET new_field = 'default' WHERE new_field IS NULL;

// Step 3: Make required
model User {
  newField String
}
```

### Renaming a Column

```prisma
// Prisma doesn't auto-detect renames, so:

// Option 1: Use @map to rename in DB only
model User {
  fullName String @map("name") // DB column stays "name"
}

// Option 2: Manual migration
// 1. Add new column
// 2. Copy data
// 3. Remove old column
```

### Adding an Index

```prisma
model Lead {
  email  String
  status LeadStatus

  @@index([status])           // Single column
  @@index([status, email])    // Composite
}
```

## Rollback Strategies

Prisma doesn't support automatic rollbacks. Here are your options:

### Option 1: Create a Reverse Migration

```bash
# Modify schema to previous state
# Then create new migration
npx prisma migrate dev --name revert_add_user_avatar
```

### Option 2: Manual Rollback (Development)

```bash
# Reset entire database
npx prisma migrate reset

# This drops all data!
```

### Option 3: Manual SQL Rollback (Production)

1. Connect to database
2. Run reverse SQL manually
3. Remove migration record:
   ```sql
   DELETE FROM _prisma_migrations 
   WHERE migration_name = '20240115_add_user_avatar';
   ```

## Deployment Workflow

### Development

```bash
# Make schema changes
# Generate and apply migration
npx prisma migrate dev --name description

# Test the migration
npm run test

# Commit the migration files
git add prisma/
git commit -m "Add user avatar column"
```

### Staging/Production

```bash
# Deploy migrations (doesn't create new ones)
npx prisma migrate deploy

# Or using script
./scripts/db-migrate.sh deploy
```

## Seed Data

### Development Seeds

Located in `prisma/seed.ts`. Run with:

```bash
npx prisma db seed
```

### Seed Data Includes:
- 4 tier definitions
- 5 test users (admin, team, clients)
- 3 demo leads
- 1 demo project with milestones

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sage.design | AdminPassword123! |
| Team | team@sage.design | TeamPassword123! |
| Client | client1@example.com | ClientPassword123! |

## Troubleshooting

### Migration Stuck

```bash
# Check status
npx prisma migrate status

# If needed, resolve manually
npx prisma migrate resolve --applied <migration_name>
```

### Schema Drift

```bash
# Reset schema state
npx prisma db push --accept-data-loss

# Then re-run migrations
npx prisma migrate dev
```

### Type Generation Issues

```bash
# Regenerate client
npx prisma generate

# Clear cache if needed
rm -rf node_modules/.prisma
npx prisma generate
```

## Migration Checklist

Before deploying migrations:

- [ ] Schema changes reviewed
- [ ] Migration SQL reviewed
- [ ] Tested on local database
- [ ] Tested with production data copy
- [ ] Rollback plan documented
- [ ] All tests passing
- [ ] Migration committed to git

## Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Migration Troubleshooting](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/troubleshooting-development)
