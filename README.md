# SAGE MVP Platform

A tiered landscape architecture service platform with automated tier recommendation, Stripe payments, client portal, and admin dashboard.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SAGE MVP Platform                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                                  │
│  ├── Intake Form → Tier Recommendation                          │
│  ├── Client Portal → Projects, Milestones, Deliverables        │
│  └── Admin Dashboard → Leads, Projects, Clients                │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Node.js + Express + TypeScript)                       │
│  ├── /api/auth      → Registration, Login, JWT                  │
│  ├── /api/leads     → Lead management, Tier routing            │
│  ├── /api/checkout  → Stripe payment sessions                   │
│  ├── /api/projects  → Project management                        │
│  ├── /api/admin     → Admin dashboard data                      │
│  └── /api/webhooks  → Stripe payment events                     │
├─────────────────────────────────────────────────────────────────┤
│  Database: PostgreSQL (Supabase)                                │
│  Storage: Supabase Storage                                      │
│  Payments: Stripe                                               │
│  Sync: Notion (optional)                                        │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Service Tiers

| Tier | Name | Price | Description |
|------|------|-------|-------------|
| 1 | The Concept | $299 | DIY guidance, automated |
| 2 | The Builder | $1,499 | Low-touch with checkpoints |
| 3 | The Concierge | $4,999 | Site visits, hybrid approach |
| 4 | White Glove | Custom | Full service, invitation-only |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase account)
- Stripe account
- (Optional) Notion integration

### Setup

1. **Clone and install dependencies:**

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install frontend dependencies
cd kaa-app && npm install && cd ..
```

2. **Configure environment:**

```bash
# Copy example env file
cp env.example .env
cp env.example server/.env

# Edit .env with your values
```

3. **Set up database:**

```bash
cd server
npx prisma db push
npx prisma generate
```

4. **Start development:**

```bash
# Option 1: Use the dev script
./scripts/dev-start.sh

# Option 2: Start manually
cd server && npm start &
cd kaa-app && npm start
```

5. **Access the app:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 📁 Project Structure

```
/workspace
├── kaa-app/                 # React frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── intake/      # Intake form components
│   │   │   ├── portal/      # Client portal components
│   │   │   └── admin/       # Admin dashboard components
│   │   ├── api/             # API client
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utilities
│   └── public/              # Static assets
│
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utilities
│   │   └── __tests__/       # Tests
│   └── prisma/              # Database schema
│
├── docs/                    # Documentation
│   ├── API_REFERENCE.md     # API documentation
│   └── ENVIRONMENT_SETUP.md # Environment guide
│
└── scripts/                 # Utility scripts
    ├── dev-start.sh         # Development startup
    └── verify-deployment.sh # Deployment check
```

## 🔧 Available Scripts

### Server (in `/server`)

```bash
npm start           # Start production server
npm run dev         # Start with nodemon
npm run build       # Build TypeScript
npm test            # Run tests
```

### Frontend (in `/kaa-app`)

```bash
npm start           # Start development server
npm run build       # Production build
npm test            # Run tests
```

### Root

```bash
./scripts/dev-start.sh           # Start both services
./scripts/verify-deployment.sh   # Verify deployment config
```

## 📊 Test Coverage

| Category | Tests | Status |
|----------|-------|--------|
| Backend | 186 | ✅ Passing |
| Frontend | 314 | ✅ Passing |
| **Total** | **500** | ✅ |

Run tests:
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd kaa-app && npm test
```

## 🔐 Environment Variables

See [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md) for complete configuration.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Authentication secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service key

## 📚 Documentation

- [API Reference](docs/API_REFERENCE.md) - Complete API documentation
- [Environment Setup](docs/ENVIRONMENT_SETUP.md) - Configuration guide
- [Architecture](/.claude/context/architecture.md) - System architecture

## 🛠️ Tech Stack

**Frontend:**
- React 19
- TypeScript
- CSS Modules

**Backend:**
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL

**Services:**
- Stripe (Payments)
- Supabase (Database + Storage)
- Notion (Optional sync)

**Testing:**
- Jest
- React Testing Library

## 📝 License

Private - KAA Design Studio

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
