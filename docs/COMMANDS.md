# Commands Reference

This document is the canonical list of root `package.json` scripts and Docker commands for the SAGE MVP Platform.

**Source of truth:** The root `package.json` scripts are the definitive implementation. Update this document whenever those scripts change.

## Prerequisites

- Node.js 20+
- npm 9+
- Docker + Docker Compose (for container workflows)
- PostgreSQL 15+ (local development without Docker)

## Ports & Access Points

### Local development (npm scripts)
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3002
- API Docs: http://localhost:3001/api/docs
- Health Check: http://localhost:3001/api/health

### Docker (dev profile tools)
- Adminer (DB UI): http://localhost:8080
- MailHog (Email): http://localhost:8025

## Root npm Scripts

Run these from the repository root. Script definitions live in `package.json`.

| Script | Description |
| --- | --- |
| `npm run quickstart` | Run the guided quickstart script. |
| `npm run dev` | Start backend + frontend dev servers concurrently. |
| `npm run start` | Start the backend server. |
| `npm run build` | Build backend + frontend for production. |
| `npm test` | Run backend + frontend tests. |
| `npm run test:backend` | Run backend tests only. |
| `npm run test:frontend` | Run frontend tests only. |
| `npm run install-all` | Install root, frontend, and backend dependencies. |
| `npm run prisma:generate` | Generate Prisma client. |
| `npm run prisma:migrate` | Run Prisma migrations (dev). |
| `npm run prisma:deploy` | Run Prisma migrations (production). |
| `npm run prisma:seed` | Seed the database. |
| `npm run prisma:reset` | Reset the database (destructive). |
| `npm run db:setup` | Generate client, migrate, seed. |
| `npm run db:reset` | Reset database via Prisma. |
| `npm run lint` | Lint backend + frontend. |
| `npm run docker:dev` | Start Docker development stack. |
| `npm run docker:prod` | Build and start Docker production stack. |
| `npm run test:e2e` | Run Playwright E2E tests. |
| `npm run test:e2e:ui` | Run Playwright E2E tests with UI. |
| `npm run test:e2e:headed` | Run Playwright E2E tests headed. |
| `npm run test:e2e:report` | Open Playwright report. |
| `npm run generate:api-types` | Generate API types from OpenAPI spec. |

## Docker Commands

### Development

```bash
# Start all services in development mode
docker compose -f docker-compose.dev.yml up

# Start with database admin tools (Adminer, MailHog)
docker compose -f docker-compose.dev.yml --profile tools up

# Run database migrations
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev

# Seed the database
docker compose -f docker-compose.dev.yml exec backend npx prisma db seed
```

### Production

```bash
# Build and start all services
docker compose up -d --build

# Run migrations (first time only)
docker compose --profile migrate up migrate

# Seed demo data (optional)
docker compose --profile seed up seed

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### Common Docker Operations

```bash
# Build specific service
docker compose build frontend
docker compose build backend

# View container logs
docker compose logs -f backend
docker compose logs -f frontend

# Execute command in container
docker compose exec backend npx prisma studio
docker compose exec backend npm test

# Database operations
docker compose exec db psql -U postgres -d sage

# Restart specific service
docker compose restart backend

# Remove all containers and volumes
docker compose down -v

# Clean build (no cache)
docker compose build --no-cache
```

## Environment Setup

Create a `.env` file in the project root (start from `env.example`) before running scripts or Docker commands.
