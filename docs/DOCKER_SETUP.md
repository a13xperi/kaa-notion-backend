# Docker Setup Guide

This guide covers Docker configuration for the SAGE MVP Platform.

## Quick Start

### Development Mode (with hot reload)

Use the Docker development commands listed in [COMMANDS.md](./COMMANDS.md).

See [Development Environments](./DEV_ENVIRONMENTS.md#docker-development) for Docker dev access points and local alternatives.

### Production Mode

Use the Docker production commands listed in [COMMANDS.md](./COMMANDS.md).

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

# Run backend tests (from repo root)
npm run test:backend

# Or run backend tests inside the container
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
See the common Docker operations in [COMMANDS.md](./COMMANDS.md).

See [Testing Strategy](./TESTING_STRATEGY.md) for test prerequisites and command mappings.

## Production Deployment

### 1. Build Images

Use the Docker build commands in [COMMANDS.md](./COMMANDS.md).

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

Use the Docker deploy commands in [COMMANDS.md](./COMMANDS.md).

## Health Checks

All containers include health checks:

See the command list in [COMMANDS.md](./COMMANDS.md) for health check commands.

## Troubleshooting

### Container won't start

Refer to [COMMANDS.md](./COMMANDS.md) for troubleshooting commands.

### Database connection issues

Refer to [COMMANDS.md](./COMMANDS.md) for database troubleshooting commands.

### Frontend build fails

Refer to [COMMANDS.md](./COMMANDS.md) for build troubleshooting commands.

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
