# Development Guide

This guide covers local and Docker development workflows for the SAGE Platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Options](#development-options)
- [Option 1: Docker Development](#option-1-docker-development)
- [Option 2: Local Development](#option-2-local-development)
- [Services and Ports](#services-and-ports)
- [Common Workflows](#common-workflows)

## Prerequisites

### Required (All Setups)

- Node.js 18+
- npm 9+
- Git

### For Docker Development

- Docker 20+
- Docker Compose 2+

### For Local Development

- PostgreSQL 14+
- Redis 6+ (optional)

## Development Options

| Aspect | Docker | Local |
|--------|--------|-------|
| **Setup time** | ~5 minutes | ~15 minutes |
| **Dependencies** | Docker only | PostgreSQL, Redis, Node.js |
| **Database** | Managed by Docker | Requires local install |
| **Hot reload** | Yes (volume mounts) | Yes (native) |
| **Performance** | Slightly slower on macOS/Windows | Native speed |
| **Recommended for** | Quick start, team consistency | Debugging, IDE integration |

## Option 1: Docker Development

Docker provides a consistent environment with all dependencies containerized.

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/sage-platform.git
cd sage-platform

# 2. Copy environment files
cp server/.env.example server/.env
cp kaa-app/.env.example kaa-app/.env

# 3. Start all services
docker-compose up -d

# 4. Run database migrations
docker-compose exec server npx prisma migrate dev

# 5. (Optional) Seed the database
docker-compose exec server npx prisma db seed
```

### Docker Commands

See [COMMANDS.md - Docker Workflows](./COMMANDS.md#docker-workflows) for the complete command reference.

**Common operations:**

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after dependency changes
docker-compose build --no-cache
docker-compose up -d
```

### Docker Environment

Docker Compose uses environment variables from:
1. A `.env` file in the project root
2. Default values in `docker-compose.yml`

See [ENVIRONMENT_REFERENCE.md - Docker Variables](./ENVIRONMENT_REFERENCE.md#docker-variables) for details.

### Including Prisma Studio

Prisma Studio runs as an optional profile:

```bash
docker-compose --profile tools up -d
```

Access at http://localhost:5555

## Option 2: Local Development

Local development provides faster iteration and better debugging support.

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/sage-platform.git
cd sage-platform

# 2. Install dependencies
npm run install-all

# 3. Configure environment
cp server/.env.example server/.env
cp kaa-app/.env.example kaa-app/.env
# Edit .env files with your local values

# 4. Ensure PostgreSQL is running
# Update DATABASE_URL in server/.env

# 5. Run database migrations
cd server
npm run db:migrate

# 6. Start development servers
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd kaa-app
npm start
```

### Local PostgreSQL Setup

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb sage_dev
```

**Ubuntu/Debian:**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb sage_dev
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

**Connection string:**
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/sage_dev
```

### Local Redis Setup (Optional)

Redis is optional for development but required for rate limiting and caching.

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Connection string:**
```bash
REDIS_URL=redis://localhost:6379
```

### Running with Concurrently

Start both servers with a single command from the project root:

```bash
npm run dev
```

This runs the API server and frontend concurrently.

## Services and Ports

| Service | Port | Local URL | Docker URL |
|---------|------|-----------|------------|
| Frontend | 3000 | http://localhost:3000 | http://localhost:3000 |
| Backend API | 3001 | http://localhost:3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 | localhost:6379 |
| Prisma Studio | 5555 | http://localhost:5555 | http://localhost:5555 |

### API Endpoints

Once running, verify the API is working:

```bash
curl http://localhost:3001/api/health
```

### Frontend Access

Open http://localhost:3000 in your browser.

## Common Workflows

### After Pulling Changes

```bash
# Docker
docker-compose down
docker-compose build
docker-compose up -d
docker-compose exec server npx prisma migrate dev

# Local
npm run install-all
cd server && npm run db:migrate
```

### After Modifying Prisma Schema

```bash
# Docker
docker-compose exec server npx prisma migrate dev --name <migration_name>

# Local
cd server
npm run db:migrate -- --name <migration_name>
```

### Viewing Database

```bash
# Docker
docker-compose --profile tools up prisma-studio

# Local
cd server
npm run db:studio
```

### Resetting Database

```bash
# Docker
docker-compose exec server npx prisma migrate reset

# Local
cd server
npm run db:reset
```

### Troubleshooting

**Port already in use:**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

**Docker containers not starting:**
```bash
# Check logs
docker-compose logs

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up
```

**Database connection failed:**
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Ensure database exists: `createdb sage_dev`

**Module not found:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm run install-all
```

## Related Documentation

- [COMMANDS.md](./COMMANDS.md) - Complete command reference
- [ENVIRONMENT_REFERENCE.md](./ENVIRONMENT_REFERENCE.md) - Environment variables
- [TESTING.md](./TESTING.md) - Testing strategy
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
