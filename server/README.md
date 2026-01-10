# SAGE Platform - Backend API Server

The SAGE Platform backend provides a comprehensive API server for project management, client collaboration, and workspace integration. It connects to Notion for data synchronization, supports Stripe for payments, and provides real-time updates via WebSocket.

## Features

- **Project Management**: Full CRUD operations for projects, milestones, and deliverables
- **Client Portal**: Secure client authentication and workspace access
- **Team Dashboard**: Administrative controls and analytics
- **Notion Integration**: Bi-directional sync with Notion databases
- **Payment Processing**: Stripe integration for subscriptions and checkout
- **Real-time Updates**: WebSocket support for live collaboration
- **Push Notifications**: Web push notification support
- **Email Services**: Transactional email via Resend/Postmark

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (via Supabase)
- Notion integration token
- Stripe account (for payments)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment template and configure:
   ```bash
   cp ../env.example .env
   ```

3. Configure your environment variables (see `env.example` for full list):
   - Database: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - Notion: `NOTION_API_KEY`, `NOTION_PARENT_PAGE_ID`
   - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - Email: `RESEND_API_KEY` or `POSTMARK_API_KEY`

4. Run database migrations:
   ```bash
   npm run db:migrate
   ```

5. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify` - Token verification

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Milestones & Deliverables
- `GET /api/projects/:id/milestones` - List project milestones
- `GET /api/projects/:id/deliverables` - List project deliverables
- `POST /api/milestones` - Create milestone
- `POST /api/deliverables` - Create deliverable

### Team & Admin
- `GET /api/team` - List team members
- `GET /api/admin/analytics` - Dashboard analytics

### Payments
- `POST /api/checkout/create-session` - Create Stripe checkout
- `POST /api/webhooks/stripe` - Stripe webhook handler

### Other
- `GET /api/portfolio` - Public portfolio items
- `POST /api/leads` - Lead capture
- `POST /api/push/subscribe` - Push notification subscription

## WebSocket Connection

Connect to the WebSocket server at `ws://localhost:3002` for real-time updates.

## Development

For development with hot-reloading:
```bash
npm run dev
```

## Database Management

```bash
npm run db:migrate    # Run migrations
npm run db:push       # Push schema changes
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio
```

## Testing

Run the test suite:
```bash
npm test
``` 