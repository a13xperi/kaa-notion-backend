# SAGE Platform

A full-stack project management and client collaboration platform with tiered service offerings.

**SAGE** (Tiers 1-3) provides scalable, productized landscape architecture services. **KAA** (Tier 4) remains the white-glove, luxury service.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)

## Overview

SAGE Platform features:

- **Tiered Service Model**: 4-tier pricing with automated recommendations
- **Lead Intake & Routing**: Intelligent tier assignment based on project scope
- **Client Portal**: Project tracking, deliverables, messaging, and revisions
- **Admin Dashboard**: Lead management, analytics, and team tools
- **PWA Support**: Offline capability, push notifications, installable app
- **Payment Integration**: Stripe checkout with tier-specific pricing
- **Notion Sync**: Workspace integration for team collaboration

### SAGE vs KAA

| Feature | SAGE (Tiers 1-3) | KAA (Tier 4) |
|---------|------------------|--------------|
| Model | Accessible, scalable | White-glove, luxury |
| Selection | Clients choose us | We choose clients |
| Pricing | Fixed packages ($500-$3,500) | Percentage of install |
| Delivery | Automated to site visits | High-touch, full-service |

## Tech Stack

### Frontend (kaa-app)
- React 18 with TypeScript
- React Query for data fetching
- React Router for navigation
- CSS Modules with CSS variables
- PWA with service worker

### Backend (server)
- Node.js with Express
- TypeScript
- Prisma ORM
- PostgreSQL database
- Redis for caching/rate limiting

### Integrations
- **Stripe** - Payment processing
- **Resend** - Transactional emails
- **Notion** - Workspace sync
- **Supabase** - File storage
- **Sentry** - Error tracking

## Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL 14+
- Redis 6+ (optional for development)
- Docker (optional, for containerized development)

## Quick Start

For complete setup instructions, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

### Docker (Recommended)

```bash
git clone https://github.com/your-org/sage-platform.git
cd sage-platform
cp server/.env.example server/.env
cp kaa-app/.env.example kaa-app/.env

docker-compose up -d
docker-compose exec server npx prisma migrate dev
```

### Local Development

```bash
npm run install-all
cp server/.env.example server/.env
cp kaa-app/.env.example kaa-app/.env

cd server && npm run db:migrate && cd ..
npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Prisma Studio | http://localhost:5555 |

## Project Structure

```
sage-platform/
├── kaa-app/                 # React frontend
│   ├── public/              # Static assets, PWA files
│   │   ├── manifest.json    # PWA manifest
│   │   └── sw.js            # Service worker
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   └── App.tsx          # Main application
│   └── package.json
│
├── server/                  # Express backend
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utility functions
│   │   └── index.ts         # Server entry point
│   └── package.json
│
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Database migrations
│   └── seed.ts              # Database seeder
│
├── docs/                    # Documentation
│   ├── openapi.yaml         # API specification
│   ├── DEPLOYMENT.md        # Deployment guide
│   └── USER_GUIDE.md        # End-user documentation
│
├── .github/
│   └── workflows/           # CI/CD pipelines
│
├── docker-compose.yml       # Docker orchestration
└── README.md
```

## Development

For complete command reference, see [docs/COMMANDS.md](docs/COMMANDS.md).

### Common Commands

```bash
# Start all services
npm run dev

# Run tests
cd server && npm test
cd kaa-app && npm test

# Database operations
cd server
npm run db:migrate        # Run migrations
npm run db:studio         # Open Prisma Studio

# Lint code
cd server && npm run lint
cd kaa-app && npm run lint
```

## API Documentation

The API is documented using OpenAPI 3.0 specification.

### View Documentation

1. **Swagger UI**: Import `docs/openapi.yaml` into [Swagger Editor](https://editor.swagger.io)
2. **Postman**: Import the OpenAPI spec into Postman

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User authentication |
| `/api/auth/register` | POST | User registration |
| `/api/leads` | POST | Create lead from intake |
| `/api/projects` | GET | List user's projects |
| `/api/projects/:id` | GET | Project details |
| `/api/checkout/create-session` | POST | Create Stripe checkout |
| `/api/notifications` | GET | User notifications |
| `/api/push/subscribe` | POST | Push notification subscription |
| `/api/admin/dashboard` | GET | Admin statistics |
| `/api/admin/analytics` | GET | Analytics data |

See `docs/openapi.yaml` for complete API documentation.

## Testing

For complete testing guide, see [docs/TESTING.md](docs/TESTING.md).

```bash
# Unit tests
cd server && npm test
cd kaa-app && npm test

# E2E tests (requires running services)
cd kaa-app && npm run test:e2e

# E2E with UI
cd kaa-app && npm run test:e2e:ui
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Checklist

1. Set production environment variables
2. Run database migrations: `npx prisma migrate deploy`
3. Build applications: `npm run build`
4. Configure reverse proxy (nginx/caddy)
5. Set up SSL certificates
6. Configure monitoring (Sentry)
7. Set up log aggregation

### Vercel Deployment

The project is configured for Vercel:

- **Frontend:** Deployed from `kaa-app/`
- **Backend:** Serverless functions or separate deployment
- **Environments:** Preview (PRs), Staging, Production

## Environment Variables

For complete environment variable reference, see [docs/ENVIRONMENT_REFERENCE.md](docs/ENVIRONMENT_REFERENCE.md).

**Quick setup:**
```bash
cp server/.env.example server/.env
cp kaa-app/.env.example kaa-app/.env
```

The `.env.example` files in each workspace are the source of truth.

## Documentation

### Development
- **[Development Guide](docs/DEVELOPMENT.md)** - Local and Docker setup
- **[Command Reference](docs/COMMANDS.md)** - All scripts and commands
- **[Environment Reference](docs/ENVIRONMENT_REFERENCE.md)** - Environment variables
- **[Testing Guide](docs/TESTING.md)** - Unit and E2E testing

### Architecture
- **[API Documentation](docs/openapi.yaml)** - OpenAPI specification
- **[Tech Stack](docs/tech-stack.md)** - Technology decisions
- **[Data Model](docs/data-model.md)** - Database schema
- **[Tier Router Rules](docs/tier-router-rules.md)** - Tier assignment logic

### Operations
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **[User Guide](docs/USER_GUIDE.md)** - Client portal documentation

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add my feature'`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

Proprietary - All rights reserved.

## Support

- Check documentation in `/docs`
- Review [CONTRIBUTING.md](CONTRIBUTING.md)
- Open an issue for bugs or feature requests
