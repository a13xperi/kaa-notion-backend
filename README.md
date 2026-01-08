# SAGE MVP Platform

**SAGE** is a tiered service platform (Tiers 1-3) built on top of the **KAA App**, providing scalable, productized landscape architecture services. **KAA** (Tier 4) remains the white-glove, luxury service.

---

## Architecture

- **Frontend:** React (Create React App) + TypeScript
- **Backend:** Node.js/Express
- **Database:** Supabase Postgres (transactional) + Notion (display/collaboration)
- **Storage:** Supabase Storage
- **Payments:** Stripe
- **Hosting:** Vercel

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Notion integration
- Stripe account (for payments)

### Installation

1. **Clone repository:**
```bash
git clone <repository-url>
cd "KAA app"
```

2. **Install dependencies:**
```bash
npm run install-all
```

3. **Set up environment variables:**
```bash
cp env.example .env
# Edit .env with your actual values
```

4. **Set up Supabase:**
   - Create Supabase project at https://app.supabase.com
   - Get connection string and API keys
   - Add to `.env`:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

5. **Set up Prisma:**
```bash
npm run prisma:generate
npm run prisma:migrate
```

6. **Start development servers:**
```bash
npm run dev
```

This starts:
- Backend API server on `http://localhost:3001`
- Frontend React app on `http://localhost:3000`

---

## Project Structure

```
KAA app/
├── kaa-app/              # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── utils/        # Utility functions
│   │   └── ...
│   └── package.json
├── prisma/               # Prisma schema and migrations
│   └── schema.prisma
├── docs/                 # Documentation
│   ├── tech-stack.md
│   ├── hybrid-data-architecture.md
│   ├── sync-strategy.md
│   └── ...
├── notion-api-server-enhanced.js  # Backend API server
├── .cursorrules          # Cursor IDE rules
├── CONTRIBUTING.md       # Contribution guidelines
└── package.json
```

---

## Development

### Running Locally

```bash
# Start both frontend and backend
npm run dev

# Start backend only
npm start

# Start frontend only
cd kaa-app && npm start
```

### Database Migrations

```bash
# Create new migration
npm run prisma:migrate

# Apply migrations (production)
npm run prisma:deploy

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

### Code Quality

```bash
# Type checking
cd kaa-app && npm run typecheck

# Linting
cd kaa-app && npm run lint

# Testing
cd kaa-app && npm test
```

---

## Environment Variables

See `env.example` for complete list of required variables.

**Required:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NOTION_API_KEY` - Notion integration token
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

---

## Documentation

- **[Tech Stack](docs/tech-stack.md)** - Technology decisions and stack overview
- **[Hybrid Data Architecture](docs/hybrid-data-architecture.md)** - Postgres + Notion architecture
- **[Sync Strategy](docs/sync-strategy.md)** - Postgres ↔ Notion sync mechanism
- **[Data Model](docs/data-model.md)** - Database schema and relationships
- **[Tier Router Rules](docs/tier-router-rules.md)** - Tier assignment logic
- **[Claude Code Setup](docs/claude-code-setup.md)** - Claude Code installation and usage
- **[Notion MCP Setup](docs/notion-mcp-setup.md)** - Notion MCP connection guide
- **[Contributing](CONTRIBUTING.md)** - Contribution guidelines

---

## SAGE vs KAA

**SAGE (Tiers 1-3):**
- Accessible, scalable services
- Clients choose us
- Fixed pricing packages
- Automated to site visits

**KAA (Tier 4):**
- White-glove, luxury service
- We choose the clients
- Percentage of install pricing
- High-touch, full-service

---

## Deployment

### Vercel

The project is configured for Vercel deployment:

- **Frontend:** Automatically deployed from `kaa-app/`
- **Backend:** Serverless functions from `notion-api-server-enhanced.js`
- **Environments:** Preview (PRs), Staging (`staging` branch), Production (`main`)

### Environment Setup

1. Add environment variables in Vercel dashboard
2. Configure deployment checks (typecheck, lint, tests)
3. Set up webhooks (Stripe, Zapier, etc.)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Branch strategy
- PR process
- Definition of Done checklist
- Code standards

---

## Support

For issues, questions, or contributions:
- Check existing documentation in `/docs`
- Review [CONTRIBUTING.md](CONTRIBUTING.md)
- Open an issue or PR

---

## License

[Add license information]

---

## Roadmap

See the SAGE MVP Implementation Plan for current phase and next steps.

**Current Phase:** Phase 0 & 1 (Setup & Foundation)  
**Next Steps:** Supabase setup, data architecture implementation, SAGE landing pages
