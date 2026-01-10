# Database Development Task

## Zone
Database (Prisma/PostgreSQL)

## Stack
- PostgreSQL
- Prisma ORM
- Supabase (hosting)
- Database migrations

## Task
{{TASK}}

## Requirements
{{REQUIREMENTS}}

## Database Workflow

```
┌─────────────────────────────────────┐
│  1. Update schema.prisma            │
│  2. Run: npx prisma generate        │
│  3. Create migration                │
│  4. Test with Prisma Studio         │
│  5. Verify in application           │
└─────────────────────────────────────┘
```

## Commands
- Generate: `npx prisma generate`
- Migrate (dev): `npx prisma migrate dev --name <name>`
- Migrate (prod): `npx prisma migrate deploy`
- Studio: `npx prisma studio`
- Reset: `npx prisma migrate reset`
- Seed: `npx prisma db seed`

## Schema Best Practices
- Use `@@map` for table names (snake_case)
- Use `@map` for column names (snake_case)
- Add indexes for frequently queried fields
- Use relations with explicit foreign keys
- Add `@@index` for composite queries

## Migration Guidelines
1. Never modify existing migrations
2. Test migrations on dev database first
3. Back up production before deploying
4. Use feature flags for breaking changes

## Success Criteria
- [ ] Schema changes applied correctly
- [ ] Prisma client generated
- [ ] Migration created and applied
- [ ] Existing data preserved
- [ ] Application tests pass

When ALL criteria met, output: RALPH_COMPLETE
