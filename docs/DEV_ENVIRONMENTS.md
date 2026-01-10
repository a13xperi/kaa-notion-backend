# Development Environments

This guide contrasts local development versus Docker-based development, including prerequisites, steps, and port/service mappings.

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or SQLite for development)
- Stripe account (for payments)

### Steps

```bash
# Install dependencies
npm run install-all

# Copy environment template
cp env.example .env

# Run migrations and seed demo data
npm run db:setup

# Start both frontend and backend
npm run dev
```

### Ports & Services

| Service | URL | Notes |
| --- | --- | --- |
| Frontend | http://localhost:3000 | React app |
| Backend API | http://localhost:3001 | Express API |
| API Docs | http://localhost:3001/api/docs | Swagger UI |
| Health Check | http://localhost:3001/api/health | API health endpoint |

## Docker Development

### Prerequisites

- Docker Desktop (or Docker Engine + Compose)

### Steps

```bash
# Start all services in development mode
docker compose -f docker-compose.dev.yml up

# Start with database admin tools
docker compose -f docker-compose.dev.yml --profile tools up

# Run database migrations
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev

# Seed the database
docker compose -f docker-compose.dev.yml exec backend npx prisma db seed
```

### Ports & Services

| Service | URL | Notes |
| --- | --- | --- |
| Frontend | http://localhost:3000 | React app via Docker |
| Backend API | http://localhost:3001 | Express API |
| WebSocket | ws://localhost:3002 | Real-time updates |
| Adminer (DB UI) | http://localhost:8080 | Requires `--profile tools` |
| MailHog (Email) | http://localhost:8025 | Requires `--profile tools` |
