# Changelog

## [Unreleased] - 2026-01-11

### Security
- **Dev Auth Bypass Protection**: Added explicit `ALLOW_DEV_AUTH_BYPASS` flag required for development authentication bypass
- **WebSocket JWT Verification**: Implemented proper JWT token verification for WebSocket connections with userId validation
- **Enhanced XSS Detection**: Expanded XSS patterns to catch SVG, math, style, base, meta tags, data URIs, livescript, and encoded attack attempts
- **Rate Limiting for Team Invites**: Added dedicated rate limiter for team invite endpoints

### Changed
- **Standardized Error Handling**: Replaced `throw new Error()` with `AppError` factory functions across all services
- **Consolidated Prisma Instances**: Reduced 17 separate PrismaClient instantiations to a single shared instance
- **Consolidated AuthenticatedRequest Type**: Single source of truth for authentication types in middleware/auth.ts
- **Memory Store Limits**: Added MAX_STORE_ENTRIES limits and LRU/LFU eviction to prevent unbounded memory growth

### Fixed
- **Code Duplication**: Extracted helper functions in validation middleware and environment config
- **CORS Types**: Fixed CorsOptionsDelegate to use proper CorsRequest type from cors package
- **Auth Middleware**: Removed undefined variable references in error logging
- **Jest Module Resolution**: Added jest-util dependency to fix ts-jest module resolution

### Added
- **Password Reset Flow**: Secure token-based password reset with email verification
- **Team Invite Flow**: Secure team invitation system with token generation
- **Figma Endpoint Protection**: Project access check for Figma endpoints
- **authHandler Helper**: Type-safe wrapper for authenticated route handlers

## Pre-Merge Requirements

Before build and tests will pass, run:
```bash
npx prisma generate
```

The Prisma client must be generated to provide TypeScript types for database operations.
