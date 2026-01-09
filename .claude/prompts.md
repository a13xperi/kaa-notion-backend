# KAA Notion Backend - Claude Code Prompt Library

## API Development

### Create CRUD Endpoints
```
Create CRUD endpoints for {{ENTITY_NAME}}:

Endpoints needed:
- GET /api/{{entities}} - List with pagination
- GET /api/{{entities}}/:id - Get single
- POST /api/{{entities}} - Create new
- PATCH /api/{{entities}}/:id - Update
- DELETE /api/{{entities}}/:id - Soft delete

Include:
- Request validation with Joi/Zod
- Authorization checks
- Prisma queries
- Notion sync (if applicable)
- Error handling
- Response formatting

Add to server/routes/{{entities}}.js
Update API documentation.
```

### Create Webhook Handler
```
Create webhook handler for {{SERVICE}} (Stripe/Notion/etc.):

Events to handle:
- {{LIST_EVENTS}}

Requirements:
- Signature verification
- Idempotent processing
- Event logging
- Error recovery
- Response within timeout

Add to server/routes/webhooks.js
Document webhook setup in docs/.
```

### Add Authentication Endpoint
```
Create auth endpoint: {{ENDPOINT_DESCRIPTION}}

Requirements:
- Input validation
- Secure password handling
- JWT token generation/verification
- Rate limiting
- Session management
- Audit logging

Follow existing auth patterns in server/routes/auth.js
```

## Frontend Development

### Create Data-Fetching Component
```
Create {{ComponentName}} with data fetching:

Data requirements:
- Endpoint: {{API_ENDPOINT}}
- Response shape: {{DESCRIBE}}

Component requirements:
- TypeScript with proper types
- React Query hook for data
- Loading skeleton
- Error state with retry
- Empty state
- Responsive layout
- Accessibility

Save to kaa-app/src/components/{{ComponentName}}.tsx
Create hook at kaa-app/src/hooks/use{{DataName}}.ts
```

### Create Form Component
```
Create form for {{PURPOSE}}:

Fields:
{{LIST_FIELDS_WITH_TYPES}}

Requirements:
- React Hook Form integration
- Validation rules per field
- Error message display
- Loading state during submit
- Success feedback
- API submission
- Accessibility (labels, errors linked)

Save to kaa-app/src/components/{{FormName}}Form.tsx
```

### Create Dashboard Widget
```
Create dashboard widget: {{WIDGET_NAME}}

Display:
- {{DATA_TO_SHOW}}
- {{METRICS/CHARTS/LISTS}}

Features:
- Data refresh capability
- Loading state
- Time period selector (if applicable)
- Mobile-responsive
- Click-through to detail view

Save to kaa-app/src/components/widgets/{{WidgetName}}.tsx
```

## Database Operations

### Add Prisma Model
```
Add Prisma model for {{ENTITY}}:

Fields:
{{LIST_FIELDS}}

Relations:
{{LIST_RELATIONS}}

Requirements:
- Add to prisma/schema.prisma
- Include createdAt, updatedAt
- Add appropriate indexes
- Use @map for snake_case DB columns
- Generate migration
- Update TypeScript types

Run: npm run prisma:migrate
```

### Create Database Migration
```
Create migration for: {{CHANGE_DESCRIPTION}}

Changes:
- {{LIST_CHANGES}}

Steps:
1. Update prisma/schema.prisma
2. Generate migration: npx prisma migrate dev --name {{migration-name}}
3. Review generated SQL
4. Test on development database
5. Document breaking changes if any
```

## Notion Integration

### Create Notion Page Template
```
Create Notion page creation for {{ENTITY}}:

Page structure:
- Title: {{TITLE_SOURCE}}
- Properties: {{LIST_PROPERTIES}}
- Content blocks: {{DESCRIBE_BLOCKS}}

Requirements:
- Use sync queue (not direct API call)
- Map Prisma fields to Notion properties
- Handle rich text formatting
- Include error handling
- Track sync status

Add to server/services/notionSync.js
```

### Sync Entity to Notion
```
Implement Notion sync for {{ENTITY}}:

Sync requirements:
- Direction: {{Postgres->Notion / Bidirectional}}
- Trigger: {{On create/update/delete}}
- Fields to sync: {{LIST_FIELDS}}

Implementation:
1. Add to sync queue on entity change
2. Process queue with rate limiting
3. Handle sync failures
4. Update lastSyncedAt timestamp
5. Log sync operations

Update docs/sync-strategy.md with new entity.
```

## Stripe Integration

### Add Payment Feature
```
Add Stripe feature: {{FEATURE_NAME}}

Requirements:
- {{DESCRIBE_FLOW}}

Implementation:
- Create/update checkout session
- Handle relevant webhooks
- Update database on success
- Send confirmation (stub email)
- Handle failures gracefully

Webhook events to handle:
- {{LIST_EVENTS}}

Add to server/services/stripe.js and server/routes/payments.js
```

## Testing

### Create API Tests
```
Create tests for {{API_ENDPOINT}}:

Test cases:
- Success case with valid input
- Validation error cases
- Authentication required
- Authorization (own resource only)
- Not found handling
- Server error handling

Use Jest + Supertest
Add to tests/api/{{entity}}.test.js
```

### Create Component Tests
```
Create tests for {{ComponentName}}:

Test cases:
- Renders correctly with props
- Loading state displays
- Error state displays
- User interactions work
- Accessibility requirements met

Use React Testing Library
Add to kaa-app/src/__tests__/{{ComponentName}}.test.tsx
```

## Tier-Specific Development

### Add Tier-Gated Feature
```
Add tier-gated feature: {{FEATURE_NAME}}

Available for tiers: {{TIER_LIST}}

Implementation:
1. Add feature flag to tier configuration
2. Implement backend tier check
3. Add frontend tier gate component
4. Handle upgrade prompts for lower tiers
5. Test across all tier levels

Reference: docs/tier-router-rules.md
```

### Create Tier-Specific UI
```
Create tier-specific UI for {{COMPONENT}}:

Tier variations:
- Tier 1: {{DESCRIPTION}}
- Tier 2: {{DESCRIPTION}}
- Tier 3: {{DESCRIPTION}}
- Tier 4 (KAA): {{DESCRIPTION}}

Requirements:
- Use TierGate component wrapper
- Show appropriate upgrade CTAs
- Maintain consistent UX across tiers
- Test each tier variation

Save to kaa-app/src/components/{{ComponentName}}.tsx
```

## Maintenance & Debugging

### Debug Data Sync Issue
```
Debug sync issue between Postgres and Notion for {{ENTITY}}:

Steps:
1. Check sync queue for pending/failed items
2. Verify Notion API connectivity
3. Check field mappings in sync service
4. Review error logs
5. Test manual sync trigger
6. Verify data consistency

Tools:
- Prisma Studio: npm run prisma:studio
- Server logs: Check console output
- Notion API: Direct API testing
```

### Performance Audit
```
Audit performance for {{AREA}}:

Check:
1. Database query efficiency (N+1 problems)
2. React component re-renders
3. API response times
4. Bundle size impact
5. Memory usage

Tools:
- React DevTools Profiler
- Network tab analysis
- Prisma query logging
- Lighthouse audit

Document findings and recommendations.
```

## Documentation

### Document API Endpoint
```
Document API endpoint: {{ENDPOINT}}

Include:
- Endpoint URL and method
- Request parameters/body schema
- Response format with examples
- Error codes and messages
- Authentication requirements
- Rate limiting info
- Example curl commands

Add to docs/api/{{resource}}.md
```

### Update Architecture Docs
```
Update architecture documentation for {{CHANGE}}:

Files to update:
- docs/hybrid-data-architecture.md
- docs/sync-strategy.md
- docs/data-model.md

Include:
- Diagram updates (if needed)
- Data flow changes
- New dependencies
- Migration notes
```
