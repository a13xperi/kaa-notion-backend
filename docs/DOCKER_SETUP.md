# Docker Setup Guide

This guide covers Docker configuration for the SAGE MVP Platform.

## Quick Start

### Development Mode (with hot reload)

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

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3002
- Adminer (DB UI): http://localhost:8080 (with `--profile tools`)
- MailHog (Email): http://localhost:8025 (with `--profile tools`)

### Production Mode

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

## Environment Variables

Create a `.env` file in the project root by copying the canonical template:

```bash
cp env.example .env
```

For the complete list of variables (including Docker/Postgres defaults), see [ENVIRONMENT_REFERENCE.md](./ENVIRONMENT_REFERENCE.md). `env.example` remains the canonical superset of required variables.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Network                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │   Backend    │    │  PostgreSQL  │  │
│  │   (nginx)    │───▶│  (Node.js)   │───▶│     (db)     │  │
│  │   Port 3000  │    │  Port 3001   │    │  Port 5432   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                               │
│         │                   │                               │
│         ▼                   ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  External Services                    │  │
│  │  • Stripe (Payments)  • Notion (Sync)                │  │
│  │  • Resend (Email)     • Supabase (Storage)           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Container Details

### Frontend Container
- **Base Image**: `nginx:alpine`
- **Build**: Multi-stage (Node.js build → nginx serve)
- **Features**:
  - Gzip compression
  - Static asset caching
  - React Router support (SPA)
  - Security headers

### Backend Container
- **Base Image**: `node:20-alpine`
- **Build**: Multi-stage (deps → build → production)
- **Features**:
  - Non-root user
  - Health checks
  - Prisma client generated

### Database Container
- **Image**: `postgres:15-alpine`
- **Features**:
  - Persistent volume
  - Health checks
  - Automatic initialization

## Common Commands

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

## Production Deployment

### 1. Build Images

```bash
# Build with production settings
docker compose -f docker-compose.yml build

# Or build for specific platform
docker compose build --platform linux/amd64
```

### 2. Push to Registry

```bash
# Tag images
docker tag sage-frontend:latest your-registry/sage-frontend:v1.0.0
docker tag sage-backend:latest your-registry/sage-backend:v1.0.0

# Push images
docker push your-registry/sage-frontend:v1.0.0
docker push your-registry/sage-backend:v1.0.0
```

### 3. Deploy

```bash
# Pull and run
docker compose pull
docker compose up -d

# Or with custom env file
docker compose --env-file .env.production up -d
```

## Health Checks

All containers include health checks:

```bash
# Check container health
docker compose ps

# Manual health check
curl http://localhost:3001/api/health
curl http://localhost:3000/health
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs backend

# Check if port is in use
lsof -i :3001

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up
```

### Database connection issues

```bash
# Check database is healthy
docker compose exec db pg_isready -U postgres

# Reset database
docker compose down -v
docker compose up db -d
docker compose --profile migrate up migrate
```

### Frontend build fails

```bash
# Check build logs
docker compose build frontend 2>&1 | tee build.log

# Build with more memory
DOCKER_BUILDKIT=1 docker compose build frontend
```

## Resource Limits (Optional)

Add to `docker-compose.yml` for production:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## SSL/TLS (Production)

For production with HTTPS, use a reverse proxy like Traefik or nginx-proxy:

```yaml
# Add to docker-compose.yml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=your@email.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt
```

## Next Steps

1. Set up CI/CD pipeline (see `docs/CI_CD_SETUP.md`)
2. Configure monitoring (Prometheus/Grafana)
3. Set up log aggregation (ELK stack)
4. Implement backup strategy for database
