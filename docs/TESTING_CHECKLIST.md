# Testing Checklist - SAGE MVP Platform

This checklist provides a recommended testing sequence to verify your setup is working correctly.

## 🚀 Quick Start Tests (2 minutes)

These are the fastest tests to verify basic functionality:

### 1. Environment Verification
```bash
npm run verify-env
```
✅ **Expected:** All services connected (database, Supabase, Stripe, Notion, OpenAI)

### 2. Database Indexes
```bash
npm run verify-indexes
```
✅ **Expected:** All 49 indexes found in database

### 3. Server Health Check
```bash
# Test endpoint (simple)
curl http://localhost:3001/test

# Health endpoint (full check)
curl http://localhost:3001/api/health

# Liveness probe
curl http://localhost:3001/api/health/live
```
✅ **Expected:** JSON responses indicating server is running

### 4. Swagger Documentation
Open in browser: http://localhost:3001/api/docs
✅ **Expected:** Interactive API documentation loads

---

## 🧪 Unit Tests (5-10 minutes)

### Backend Tests
```bash
npm run test:backend
```
✅ **Expected:** ~262 tests passing (auth, services, validators, etc.)

### Frontend Tests
```bash
npm run test:frontend
```
✅ **Expected:** ~595 tests passing (components, API clients, utils)

### All Tests
```bash
npm test
```
✅ **Expected:** Both backend and frontend tests passing

---

## 🔄 Integration Tests (10-15 minutes)

### End-to-End Sync Test
This tests the complete Notion-Postgres sync flow:
```bash
npm run test:e2e-sync
```
✅ **Expected:** 
- Creates project in Postgres
- Syncs to Notion
- Webhook updates Postgres
- Reconciliation endpoint works

**Note:** Requires server running and Notion API configured

---

## 🎭 End-to-End Tests (Playwright) (15-20 minutes)

These test the full user journey in a real browser:

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run with UI (Recommended for first time)
```bash
npm run test:e2e:ui
```
This opens Playwright's interactive UI where you can see tests running.

### Run in Headed Mode (See browser)
```bash
npm run test:e2e:headed
```

### View Test Report
```bash
npm run test:e2e:report
```

✅ **Expected:** All E2E tests passing (lead creation, client portal, checkout flow)

---

## 🔍 Manual API Testing

### 1. Authentication Flow

```bash
# Register a user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "tier": 1
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

### 2. Create a Lead

```bash
# Save token from login response as $TOKEN
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "lead@example.com",
    "name": "John Doe",
    "projectAddress": "123 Main St, City, State 12345",
    "budgetRange": "5k_15k",
    "timeline": "3_6_months",
    "projectType": "full_landscape",
    "hasSurvey": false,
    "hasDrawings": false
  }'
```

### 3. Get Projects

```bash
curl -X GET http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Recommended Testing Sequence

### First Time Setup (Complete Verification)
1. ✅ `npm run verify-env` - Verify environment
2. ✅ `npm run verify-indexes` - Verify database
3. ✅ `curl http://localhost:3001/test` - Quick server check
4. ✅ `npm run test:backend` - Backend unit tests
5. ✅ Open http://localhost:3001/api/docs - Check Swagger
6. ✅ `npm run test:e2e-sync` - Integration test (if Notion configured)

### Before Committing Code
1. ✅ `npm run test:backend` - Backend tests
2. ✅ `npm run test:frontend` - Frontend tests
3. ✅ `npm run lint` - Code quality

### Before Deployment
1. ✅ `npm test` - All unit tests
2. ✅ `npm run test:e2e` - Full E2E tests
3. ✅ `npm run verify-env` - Environment check
4. ✅ `npm run verify-indexes` - Database check
5. ✅ Manual smoke test of critical flows

---

## 🐛 Troubleshooting

### If tests fail:

1. **Server not running:**
   ```bash
   npm start
   # Wait for "Server running on port 3001"
   ```

2. **Database connection issues:**
   ```bash
   npm run verify-env
   # Check DATABASE_URL is configured
   ```

3. **Missing indexes:**
   ```bash
   npm run create-indexes
   npm run verify-indexes
   ```

4. **Environment variables missing:**
   ```bash
   npm run verify-env
   # Check which variables are missing
   ```

5. **Port already in use:**
   ```bash
   lsof -ti:3001 | xargs kill -9
   npm start
   ```

---

## 🎯 Success Criteria

Your setup is working correctly if:

- ✅ `verify-env` shows all services connected
- ✅ `verify-indexes` shows all 49 indexes found
- ✅ `/test` endpoint returns `{"status":"Server is running"}`
- ✅ Swagger docs load at `/api/docs`
- ✅ Backend tests pass (~262 tests)
- ✅ Frontend tests pass (~595 tests)
- ✅ E2E sync test passes (if Notion configured)

---

## 📝 Test Coverage Summary

| Test Type | Count | Command |
|-----------|-------|---------|
| Backend Unit | ~262 | `npm run test:backend` |
| Frontend Unit | ~595 | `npm run test:frontend` |
| E2E (Playwright) | Multiple | `npm run test:e2e` |
| Integration | 1 | `npm run test:e2e-sync` |
| **Total** | **857+** | `npm test` |

---

**Last Updated:** 2025-01-XX  
**Status:** ✅ Ready for testing
