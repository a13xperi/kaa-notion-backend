# SAGE Platform - Route Mapping

This document maps frontend pages/routes to their corresponding backend API endpoints.

## Route Naming Convention

- **Frontend**: Use kebab-case for URL paths (e.g., `/client-portal`)
- **Backend**: Use `/api/{resource}` pattern with RESTful naming
- **Consistency**: Frontend routes that fetch data should map predictably to API endpoints

## Frontend Routes → Backend APIs

| Frontend Route | Component | Backend API Endpoint(s) | Description |
|---------------|-----------|------------------------|-------------|
| `/` | LandingPage | None | Static landing page |
| `/demo` | FeatureDemo | None | Feature demonstration |
| `/client-portal` | ClientPortalLanding | None | Client portal welcome |
| `/client-login` | ClientLogin | `POST /api/auth/login` | Client authentication |
| `/client` | ClientWorkspace | `GET /api/projects`<br>`GET /api/projects/:id`<br>`GET /api/deliverables` | Main client dashboard |
| `/team-login` | TeamLogin | `POST /api/auth/login` | Team member authentication |
| `/team` | TeamDashboard | `GET /api/admin/analytics`<br>`GET /api/projects`<br>`GET /api/team` | Team dashboard |

## Backend API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/address + password |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/verify` | Verify JWT token |
| POST | `/api/auth/refresh` | Refresh JWT token |

### Projects (`/api/projects`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects (filtered by user/role) |
| GET | `/api/projects/:id` | Get project details with milestones |
| POST | `/api/projects` | Create new project |
| PATCH | `/api/projects/:id` | Update project (status, etc.) |
| DELETE | `/api/projects/:id` | Archive/delete project |

### Milestones (`/api/milestones`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/milestones` | List project milestones |
| GET | `/api/milestones/:id` | Get milestone details |
| POST | `/api/milestones` | Create milestone |
| PATCH | `/api/milestones/:id` | Update milestone status |

### Deliverables (`/api/deliverables`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/deliverables` | List project deliverables |
| GET | `/api/deliverables/:id` | Get deliverable details |
| POST | `/api/deliverables` | Upload deliverable |
| DELETE | `/api/deliverables/:id` | Delete deliverable |

### Team (`/api/team`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/team` | List team members |
| POST | `/api/team/invite` | Invite team member |
| PATCH | `/api/team/:id` | Update team member role |
| DELETE | `/api/team/:id` | Remove team member |

### Admin Analytics (`/api/admin/analytics`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/analytics` | Get dashboard analytics |
| GET | `/api/admin/analytics/leads` | Lead conversion metrics |
| GET | `/api/admin/analytics/revenue` | Revenue metrics |

### Leads (`/api/leads`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List all leads (admin) |
| POST | `/api/leads` | Create/submit new lead |
| PATCH | `/api/leads/:id` | Update lead status |

### Portfolio (`/api/portfolio`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolio` | List published portfolio items |
| GET | `/api/portfolio/:slug` | Get portfolio item by slug |
| POST | `/api/portfolio` | Create portfolio item (admin) |
| PATCH | `/api/portfolio/:id` | Update portfolio item |

### Payments (`/api/checkout`, `/api/subscriptions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/checkout/create-session` | Create Stripe checkout session |
| GET | `/api/subscriptions` | Get client subscription |
| POST | `/api/subscriptions/cancel` | Cancel subscription |

### Notifications (`/api/push`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/push/subscribe` | Subscribe to push notifications |
| DELETE | `/api/push/unsubscribe` | Unsubscribe from notifications |
| POST | `/api/push/send` | Send push notification (admin) |

### Referrals (`/api/referrals`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/referrals` | Get client's referrals |
| GET | `/api/referrals/code` | Get referral code |
| POST | `/api/referrals/track` | Track referral click |

### Webhooks (`/api/webhooks`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/stripe` | Stripe webhook handler |
| POST | `/api/webhooks/notion` | Notion webhook handler |

## Legacy Routes (Figma)

These routes are maintained for backward compatibility but are not actively used:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/file/:fileKey` | Get Figma file data |
| GET | `/file/:fileKey/nodes` | Get Figma file nodes |
| POST | `/webhook` | Figma webhook handler |

## Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/test` | Server health check |

## Frontend API Base URL

Configure via environment variable:
```
REACT_APP_API_URL=http://localhost:3001
```

## Recommended Improvements

1. **Add health endpoint**: Consider adding `/api/health` for better monitoring
2. **Standardize nested routes**: Use consistent `/api/projects/:id/milestones` pattern
3. **Consider versioning**: Future-proof with `/api/v1/...` prefix
