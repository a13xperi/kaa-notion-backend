# SAGE Platform - Shared Types

This directory contains TypeScript types shared between the backend (`server/`) and frontend (`kaa-app/`).

## Structure

```
shared/
├── README.md
└── types/
    ├── index.ts    # Main export file
    └── api.ts      # API types (entities, requests, responses)
```

## Usage

### In Backend (server/)

```typescript
import { Project, ApiResponse, ProjectStatus } from '../../shared/types';
```

### In Frontend (kaa-app/)

Option 1: Direct import (relative path)
```typescript
import { Project, ApiResponse } from '../../../shared/types';
```

Option 2: Copy types to frontend (using npm script)
```bash
npm run types:copy
```
Then import:
```typescript
import { Project, ApiResponse } from './shared-types';
```

## Keeping Types in Sync

The types in `shared/types/api.ts` are derived from:
1. Prisma schema models (`prisma/schema.prisma`)
2. API endpoint request/response contracts

When updating the Prisma schema:
1. Run `npm run prisma:generate` to update Prisma client
2. Manually update `shared/types/api.ts` to match any model changes
3. Run `npm run types:check` to verify TypeScript compatibility

## Type Categories

### Enums
Status and type enumerations matching Prisma enums.

### Core Entities
Database model types (User, Client, Project, etc.) formatted for API responses.

### API Response Types
Standard response wrappers (`ApiResponse<T>`, `PaginatedResponse<T>`).

### API Request Types
Request payload types for each endpoint.

### Query Parameters
URL parameter types for filtering and pagination.
