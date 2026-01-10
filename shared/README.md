# @sage/shared-types

Shared TypeScript types for the SAGE MVP Platform.

## Overview

This package contains TypeScript type definitions that are shared between the frontend (React) and backend (Node.js) to ensure type consistency across the API boundary.

## Installation

From the monorepo root:

```bash
# Link the package locally
cd shared && npm install && npm run build
cd ../kaa-app && npm link ../shared
cd ../server && npm link ../shared
```

Or import directly:

```typescript
// In frontend or backend
import type { 
  User, 
  Project, 
  Lead,
  ApiResponse 
} from '../../shared/types';
```

## Types Included

### Enums
- `UserType` - SAGE_CLIENT, KAA_CLIENT, TEAM, ADMIN
- `LeadStatus` - NEW, CONTACTED, QUALIFIED, PROPOSAL, CLOSED, LOST
- `ProjectStatus` - DRAFT, ONBOARDING, IN_PROGRESS, REVIEW, COMPLETED, etc.
- `MilestoneStatus` - NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED
- `PaymentStatus` - PENDING, SUCCEEDED, FAILED, REFUNDED
- `DeliverableCategory` - DESIGN, PLAN, RENDER, DOCUMENT, PHOTO, OTHER

### Auth Types
- `LoginRequest`, `RegisterRequest`
- `AuthResponse`, `User`, `UserProfile`

### Lead Types
- `CreateLeadRequest`, `Lead`, `LeadWithRecommendation`
- `TierRecommendation`, `UpdateLeadRequest`, `LeadStats`

### Project Types
- `Project`, `ProjectSummary`, `ProjectDetail`
- `ProjectPayments`, `PaymentRecord`

### Milestone Types
- `Milestone`, `UpdateMilestoneRequest`

### Deliverable Types
- `Deliverable`, `CreateDeliverableRequest`

### Client Types
- `ClientSummary`, `Client`

### Checkout Types
- `CreateCheckoutRequest`, `CheckoutSession`, `TierPricing`

### Admin Types
- `DashboardStats`, `ActivityItem`

### Upload Types
- `UploadConfig`, `UploadResult`

### Health Types
- `HealthStatus`, `HealthCheckResult`, `ComponentHealth`

### API Types
- `ApiResponse<T>`, `ApiErrorResponse`, `PaginationMeta`

## Usage Example

```typescript
import type { 
  ApiResponse, 
  Lead, 
  CreateLeadRequest,
  LeadStatus 
} from '@sage/shared-types';

// Type-safe API response
const response: ApiResponse<Lead> = await api.post('/leads', leadData);

// Type-safe request body
const newLead: CreateLeadRequest = {
  email: 'client@example.com',
  projectAddress: '123 Main St',
  budgetRange: '15k_50k',
};

// Type-safe enum usage
if (lead.status === LeadStatus.QUALIFIED) {
  // Handle qualified lead
}
```

## Building

```bash
npm run build
```

This generates TypeScript declaration files in the `dist/` directory.
