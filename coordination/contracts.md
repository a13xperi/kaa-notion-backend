# Interface Contracts

> **DO NOT MODIFY** without all-agent sync and human approval

These interfaces define the boundaries between agent domains. Changes require coordination.

---

## Server API Contracts (Agent 1 & 2)

### Authentication Endpoints (Agent 1)

```typescript
// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// POST /api/auth/logout
// No request body, uses Authorization header

// POST /api/auth/refresh
interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  token: string;
  refreshToken: string;
}

// GET /api/auth/me
// Returns current user from token
interface MeResponse {
  user: User;
}
```

### Notion API Endpoints (Agent 1 routes, Agent 2 services)

```typescript
// GET /api/notion/databases
interface DatabasesResponse {
  databases: NotionDatabase[];
}

// GET /api/notion/database/:id
interface DatabaseResponse {
  database: NotionDatabase;
  pages: NotionPage[];
}

// POST /api/notion/page
interface CreatePageRequest {
  databaseId: string;
  properties: Record<string, unknown>;
}

// PATCH /api/notion/page/:id
interface UpdatePageRequest {
  properties: Record<string, unknown>;
}
```

---

## Frontend API Client Contracts (Agent 4)

```typescript
// /kaa-app/src/api/client.ts
interface ApiClient {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  put<T>(endpoint: string, data: unknown): Promise<T>;
  patch<T>(endpoint: string, data: unknown): Promise<T>;
  delete(endpoint: string): Promise<void>;
}

// Auth state from context
interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refreshToken(): Promise<void>;
}
```

---

## Shared Types (Agent 5)

```typescript
// /shared/types/user.ts
interface User {
  id: string;
  email: string;
  name: string;
  notionWorkspaceId?: string;
  createdAt: string;
  updatedAt: string;
}

// /shared/types/notion.ts
interface NotionDatabase {
  id: string;
  title: string;
  properties: Record<string, NotionProperty>;
}

interface NotionPage {
  id: string;
  databaseId: string;
  properties: Record<string, unknown>;
  createdTime: string;
  lastEditedTime: string;
}

interface NotionProperty {
  id: string;
  name: string;
  type: string;
}
```

---

## Database Schema Contracts (Agent 5)

```prisma
// Key models that other agents depend on
// Changes require migration coordination

model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String?
  notionWorkspaceId String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

---

## Contract Change Process

1. **Propose** - Add proposal to coordination/requests.md
2. **Notify** - Tag all affected agents
3. **Discuss** - Wait for feedback (min 1 hour or human approval)
4. **Approve** - Human operator confirms
5. **Update** - Agent 5 updates shared types
6. **Sync** - All agents pull and adapt
