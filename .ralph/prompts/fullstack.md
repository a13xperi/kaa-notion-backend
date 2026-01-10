# Full-Stack Task

## Platform
SAGE MVP - Tiered landscape architecture services

## Stack
- Frontend: React + TypeScript + TailwindCSS
- Backend: Node.js + Express + Prisma
- Database: PostgreSQL (Supabase)
- Payments: Stripe

## Task
{{TASK}}

## Requirements
{{REQUIREMENTS}}

## Approach
1. **Database First**: Update Prisma schema if needed
2. **Backend Second**: Create/update API endpoints
3. **Frontend Last**: Build UI components

## Verification After Each Phase
- Database: `npx prisma generate && npx prisma migrate dev`
- Backend: `npm run test:backend`
- Frontend: `cd kaa-app && npm test`
- Full: `npm test && npm run build`

## Success Criteria
- [ ] Database schema correct
- [ ] API endpoints working
- [ ] Frontend components complete
- [ ] All tests pass
- [ ] Build succeeds

When ALL criteria met, output: RALPH_COMPLETE
