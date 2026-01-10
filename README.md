# SAGE MVP Platform

A production-ready tiered landscape architecture service platform with automated tier recommendation, Stripe payments, client portal, and admin dashboard.

[![Tests](https://img.shields.io/badge/tests-857%20passing-brightgreen)](./docs/DEPLOYMENT_CHECKLIST.md)
[![Backend](https://img.shields.io/badge/backend-262%20tests-blue)](./server)
[![Frontend](https://img.shields.io/badge/frontend-595%20tests-blue)](./kaa-app)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SAGE MVP Platform                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                                  │
│  ├── Landing Page → Service overview, CTAs                      │
│  ├── Intake Form → Tier recommendation                          │
│  ├── Pricing Page → Tier selection, Stripe checkout             │
│  ├── Client Portal → Projects, Milestones, Deliverables         │
│  └── Admin Dashboard → Leads, Projects, Clients, Stats          │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Node.js + Express + TypeScript)                       │
│  ├── /api/auth      → Registration, Login, JWT                  │
│  ├── /api/leads     → Lead management, Tier routing             │
│  ├── /api/checkout  → Stripe payment sessions                   │
│  ├── /api/projects  → Project & milestone management            │
│  ├── /api/admin     → Dashboard stats, admin operations         │
│  ├── /api/webhooks  → Stripe payment events                     │
│  ├── /api/upload    → File uploads to Supabase Storage          │
│  ├── /api/notion    → Notion sync operations                    │
│  └── /api/health    → Health monitoring endpoints               │
├─────────────────────────────────────────────────────────────────┤
│  Database: PostgreSQL (via Prisma ORM)                          │
│  Storage: Supabase Storage                                      │
│  Payments: Stripe Checkout                                      │
│  Email: Resend / SMTP                                           │
│  Sync: Notion (optional)                                        │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Service Tiers

| Tier | Name | Price | Description |
|------|------|-------|-------------|
| 1 | The Concept | $299 | DIY guidance, automated design |
| 2 | The Builder | $1,499 | Low-touch with checkpoints |
| 3 | The Concierge | $4,999 | Site visits, hybrid approach |
| 4 | White Glove | Custom | Full service, invitation-only |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or use SQLite for development)
- Stripe account (for payments)

### 1. Clone and Install

Clone the repository and install dependencies using the commands in
[docs/COMMANDS.md](./docs/COMMANDS.md).

### 2. Configure Environment

```bash
cp env.example .env
```

Edit `.env` with your configuration. See [ENVIRONMENT_REFERENCE.md](./docs/ENVIRONMENT_REFERENCE.md) for the full variable list and which app uses them. `env.example` is the canonical superset of required variables.

### 3. Setup Database

Follow the database setup commands in [docs/COMMANDS.md](./docs/COMMANDS.md).

### 4. Start Development

Start the development servers using the root scripts in
[docs/COMMANDS.md](./docs/COMMANDS.md).

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs
- Health Check: http://localhost:3001/api/health

## 📁 Project Structure

```
sage-mvp/
├── kaa-app/                 # React frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── admin/       # Admin dashboard components
│   │   │   ├── auth/        # Login, Register forms
│   │   │   ├── checkout/    # Payment pages
│   │   │   ├── common/      # Shared UI components
│   │   │   ├── portal/      # Client portal components
│   │   │   └── pricing/     # Pricing page
│   │   ├── api/             # API client functions
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # React Query hooks
│   │   ├── pages/           # Page components
│   │   └── types/           # TypeScript types
│   └── package.json
│
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utility functions
│   │   └── config/          # Configuration
│   └── package.json
│
├── prisma/                  # Database schema
│   ├── schema.prisma        # Prisma schema
│   └── seed.ts              # Database seed script
│
├── docs/                    # Documentation
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── DOCKER_SETUP.md
│   ├── API_REFERENCE.md
│   └── ENVIRONMENT_SETUP.md
│
├── docker-compose.yml       # Production Docker config
├── docker-compose.dev.yml   # Development Docker config
└── .github/workflows/       # CI/CD pipeline
```

## 🧪 Testing

See the root script commands in [docs/COMMANDS.md](./docs/COMMANDS.md).

**Test Coverage:**

| Category | Tests |
|----------|-------|
| Backend Unit Tests | 190 |
| Backend Integration | 36 |
| Backend Services | 36 |
| Frontend Components | 400+ |
| Frontend API/Utils | 195 |
| **Total** | **857** |

## 🐳 Docker Deployment

### Development

Use the Docker development commands in [docs/COMMANDS.md](./docs/COMMANDS.md).

### Production

Use the Docker production commands in [docs/COMMANDS.md](./docs/COMMANDS.md).

See [DOCKER_SETUP.md](./docs/DOCKER_SETUP.md) for detailed instructions.

## 📚 API Documentation

Interactive API documentation is available at `/api/docs` when running the server.

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Authenticate user |
| `/api/leads` | POST | Create lead from intake |
| `/api/checkout/create-session` | POST | Create Stripe checkout |
| `/api/projects` | GET | List user's projects |
| `/api/admin/dashboard` | GET | Admin stats |
| `/api/health` | GET | Health check |

See [API_REFERENCE.md](./docs/API_REFERENCE.md) for full documentation.

## 🔧 Configuration

### Environment Variables
See [ENVIRONMENT_REFERENCE.md](./docs/ENVIRONMENT_REFERENCE.md) for all environment variables and the apps that use them. The canonical template is [env.example](./env.example).

## 🔒 Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - Per-endpoint limits
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - Zod schema validation
- **CORS** - Configurable origin whitelist
- **Environment Validation** - Startup config checks

## 📊 Monitoring

### Health Endpoints

```bash
# Full health check
curl http://localhost:3001/api/health

# Detailed (includes all components)
curl "http://localhost:3001/api/health?detailed=true"

# Kubernetes probes
curl http://localhost:3001/api/health/live
curl http://localhost:3001/api/health/ready
```

### Logging

- JSON format in production
- Correlation IDs for request tracing
- Configurable log levels

## 🚢 Deployment

See [DEPLOYMENT_CHECKLIST.md](./docs/DEPLOYMENT_CHECKLIST.md) for complete production deployment guide.

### Quick Deploy

Follow the production build and start commands in
[docs/COMMANDS.md](./docs/COMMANDS.md).

## 📝 Scripts

See the canonical script list in [docs/COMMANDS.md](./docs/COMMANDS.md).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

Proprietary - All rights reserved.

---

Built with ❤️ for landscape architects and their clients.
