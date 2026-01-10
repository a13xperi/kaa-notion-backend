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

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/sage-platform.git
cd sage-platform

# Copy environment files
cp server/.env.example server/.env
cp kaa-app/.env.example kaa-app/.env

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec server npx prisma migrate dev

# Seed the database (optional)
docker-compose exec server npx prisma db seed
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Prisma Studio: http://localhost:5555

### Option 2: Manual Setup

#### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install frontend dependencies
cd ../kaa-app
npm install
```

#### 2. Configure Environment

```bash
# Server configuration
cp server/.env.example server/.env
# Edit server/.env with your values

# Frontend configuration
cp kaa-app/.env.example kaa-app/.env
# Edit kaa-app/.env with your values
```

#### 3. Set Up Database

```bash
# Ensure PostgreSQL is running
# Run migrations
cd server
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npx prisma db seed
```

#### 4. Start Development Servers

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd kaa-app
npm run dev
```

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

### Running the Server

```bash
cd server

# Development with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### Running the Frontend

```bash
cd kaa-app

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database Commands

```bash
cd server

# Create a new migration
npx prisma migrate dev --name <migration_name>

# Apply migrations (production)
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Generate client after schema changes
npx prisma generate
```

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npm run typecheck

# Format code
npm run format
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

### Unit Tests

```bash
# Run server tests
cd server
npm test

# Run with coverage
npm run test:coverage

# Run frontend tests
cd kaa-app
npm test
```

### E2E Tests

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test lead-to-client.spec.ts
```

### Test Database

```bash
# Set test database URL
export DATABASE_URL="postgresql://user:pass@localhost:5432/sage_test"

# Run migrations on test database
npx prisma migrate deploy
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

### Server (.env)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sage"

# Authentication
JWT_SECRET="your-secure-jwt-secret-min-32-chars"
JWT_EXPIRES_IN="7d"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_TIER1="price_..."
STRIPE_PRICE_TIER2="price_..."
STRIPE_PRICE_TIER3="price_..."

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@your-domain.com"

# Push Notifications
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_EMAIL="mailto:admin@your-domain.com"

# Notion (optional)
NOTION_API_KEY="secret_..."
NOTION_DATABASE_ID="..."

# Supabase Storage
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_KEY="..."

# Sentry
SENTRY_DSN="https://..."

# Redis
REDIS_URL="redis://localhost:6379"

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

### Frontend (.env)

```bash
VITE_API_URL="http://localhost:3001/api"
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."
VITE_SENTRY_DSN="https://..."
```

## Documentation

- **[API Documentation](docs/openapi.yaml)** - OpenAPI specification
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **[User Guide](docs/USER_GUIDE.md)** - Client portal documentation
- **[Tech Stack](docs/tech-stack.md)** - Technology decisions
- **[Data Model](docs/data-model.md)** - Database schema
- **[Tier Router Rules](docs/tier-router-rules.md)** - Tier assignment logic

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
