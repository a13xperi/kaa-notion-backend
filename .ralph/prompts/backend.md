# Backend Task

## Zone
Backend (server/)

## Stack
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- Stripe for payments

## Task
{{TASK}}

## Requirements
{{REQUIREMENTS}}

## Constraints
- Follow existing route patterns in server/routes
- Use existing services from server/services
- All endpoints must have input validation
- Use Prisma for database operations
- Handle errors with proper HTTP status codes
- Log important operations

## Verification
1. Run tests: `npm run test:backend`
2. Check types: `npx tsc --noEmit`
3. Test endpoints: `npm run dev` then use curl/Postman

## Success Criteria
- [ ] All requirements implemented
- [ ] Tests pass
- [ ] No TypeScript errors
- [ ] Endpoints respond correctly
- [ ] Database operations work

When ALL criteria met, output: RALPH_COMPLETE
