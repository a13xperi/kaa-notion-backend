# Command Reference

This is the canonical command reference for the SAGE Platform. All documentation links here instead of repeating commands.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Root Scripts](#root-scripts)
- [Server Scripts](#server-scripts)
- [Frontend Scripts](#frontend-scripts)
- [Database Commands](#database-commands)
- [Docker Workflows](#docker-workflows)
- [Script Mapping](#script-mapping)

## Quick Reference

| Task | Command | Location |
|------|---------|----------|
| Install all dependencies | `npm run install-all` | Root |
| Start development (all) | `npm run dev` | Root |
| Start backend only | `npm run dev` | `server/` |
| Start frontend only | `npm start` | `kaa-app/` |
| Run unit tests (server) | `npm test` | `server/` |
| Run unit tests (frontend) | `npm test` | `kaa-app/` |
| Run E2E tests | `npm run test:e2e` | `kaa-app/` |
| Build server | `npm run build` | `server/` |
| Build frontend | `npm run build` | `kaa-app/` |
| Database migrations | `npm run db:migrate` | `server/` |
| Open Prisma Studio | `npm run db:studio` | `server/` |

## Root Scripts

Run these from the project root directory.

```bash
# Install all dependencies (root + workspaces)
npm run install-all

# Start all services concurrently (API + Frontend)
npm run dev

# Start API server only
npm run start

# Prisma commands (run from root)
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations (development)
npm run prisma:studio      # Open database GUI
npm run prisma:deploy      # Apply migrations (production)
npm run prisma:seed        # Seed database
```

## Server Scripts

Run these from the `server/` directory.

```bash
cd server

# Development
npm run dev        # Start with hot reload (nodemon)
npm start          # Start without hot reload

# Build
npm run build      # Compile TypeScript to dist/

# Testing
npm test           # Run Jest tests
npm run test:coverage  # Run with coverage report

# Lint/Typecheck
npm run lint       # Type check (tsc --noEmit)

# Database
npm run db:migrate # Run migrations (development)
npm run db:push    # Push schema changes (no migration files)
npm run db:seed    # Seed database
npm run db:studio  # Open Prisma Studio
npm run db:reset   # Reset database (destructive)
```

## Frontend Scripts

Run these from the `kaa-app/` directory.

```bash
cd kaa-app

# Development
npm start          # Start development server
npm run dev        # Alias for start

# Build
npm run build      # Build for production

# Testing
npm test           # Run unit tests (watch mode)

# Lint
npm run lint       # Lint source files

# E2E Tests
npm run test:e2e   # Run Playwright E2E tests
npm run test:e2e:ui    # Run E2E with Playwright UI
npm run test:e2e:headed    # Run E2E in headed browser
npm run test:e2e:debug     # Run E2E in debug mode
npm run test:e2e:report    # View E2E test report
npm run test:e2e:codegen   # Generate E2E tests interactively
```

## Database Commands

All database commands require the `DATABASE_URL` environment variable to be set.

### Development Workflow

```bash
cd server

# Create a new migration after schema changes
npm run db:migrate -- --name <migration_name>

# Quick prototyping (no migration files)
npm run db:push

# View/edit data in browser
npm run db:studio

# Reset database completely (development only)
npm run db:reset
```

### Production Workflow

```bash
# Apply pending migrations (never creates new ones)
npm run prisma:deploy
# Or from server directory:
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

## Docker Workflows

### Starting Services

```bash
# Start all services (detached)
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis

# Start with live logs
docker-compose up

# Include Prisma Studio (optional tool)
docker-compose --profile tools up -d
```

### Service Management

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f              # All services
docker-compose logs -f server       # Server only
docker-compose logs -f frontend     # Frontend only

# Stop services
docker-compose down

# Stop and remove volumes (destructive)
docker-compose down -v
```

### Database Operations (Docker)

```bash
# Run migrations inside container
docker-compose exec server npx prisma migrate dev

# Deploy migrations (production)
docker-compose exec server npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec server npx prisma studio
# Or use the dedicated service:
docker-compose --profile tools up prisma-studio

# Seed database
docker-compose exec server npx prisma db seed

# Access PostgreSQL directly
docker-compose exec postgres psql -U sage -d sage_dev
```

### Building Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build server
docker-compose build frontend

# Build with no cache
docker-compose build --no-cache
```

## Script Mapping

This table shows how scripts map across workspaces for consistency.

| Task | Root | Server | Frontend |
|------|------|--------|----------|
| **Development** | `npm run dev` | `npm run dev` | `npm run dev` or `npm start` |
| **Production Start** | `npm start` | `npm start` | N/A |
| **Build** | `npm run build`* | `npm run build` | `npm run build` |
| **Test (Unit)** | N/A | `npm test` | `npm test` |
| **Test (Coverage)** | N/A | `npm run test:coverage` | `npm test -- --coverage` |
| **Test (E2E)** | N/A | N/A | `npm run test:e2e` |
| **Lint** | N/A | `npm run lint` | `npm run lint` |
| **Install** | `npm run install-all` | `npm install` | `npm install` |

\* Root build script is a no-op; use workspace-specific builds.

### Prisma Script Naming

The project uses two naming conventions for Prisma scripts:

| Root (prisma:*) | Server (db:*) | Description |
|-----------------|---------------|-------------|
| `prisma:generate` | N/A | Generate Prisma client |
| `prisma:migrate` | `db:migrate` | Run migrations (dev) |
| `prisma:studio` | `db:studio` | Open database GUI |
| `prisma:deploy` | N/A | Deploy migrations (prod) |
| `prisma:seed` | `db:seed` | Seed database |
| N/A | `db:push` | Push schema (no migration) |
| N/A | `db:reset` | Reset database |

## Ports Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| Prisma Studio | 5555 | http://localhost:5555 |
