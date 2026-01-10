# SAGE MVP Platform - Deployment Checklist

Complete this checklist before deploying to production.

## Pre-Deployment

### 1. Environment Configuration ✅

```bash
# Required Variables
DATABASE_URL=postgresql://user:pass@host:5432/sage?schema=public
JWT_SECRET=<64+ character random string>

# Recommended Variables
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
RESEND_API_KEY=re_...
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
NODE_ENV=production
```

Generate secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Database Setup

- [ ] Database provisioned (PostgreSQL 15+)
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify connection: `npx prisma db pull`
- [ ] Optional: Seed initial data: `npx prisma db seed`

### 3. Stripe Configuration

- [ ] Create Stripe products for Tiers 1-3
- [ ] Set price IDs in environment:
  ```
  STRIPE_TIER1_PRICE_ID=price_...
  STRIPE_TIER2_PRICE_ID=price_...
  STRIPE_TIER3_PRICE_ID=price_...
  ```
- [ ] Configure webhook endpoint: `https://api.yourdomain.com/api/webhooks/stripe`
- [ ] Enable webhook events:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- [ ] Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`

### 4. Email Configuration

Option A - Resend (Recommended):
- [ ] Create Resend account
- [ ] Verify sending domain
- [ ] Set `RESEND_API_KEY`

Option B - SMTP:
- [ ] Set SMTP credentials:
  ```
  SMTP_HOST=smtp.provider.com
  SMTP_PORT=587
  SMTP_USER=...
  SMTP_PASS=...
  ```

### 5. Security Review

- [ ] JWT_SECRET is 64+ characters and randomly generated
- [ ] DATABASE_URL uses SSL: `?sslmode=require`
- [ ] CORS_ORIGINS includes only your domains
- [ ] No debug credentials in production env
- [ ] API docs disabled or protected: `ENABLE_API_DOCS=false`

---

## Deployment Steps

### Docker Deployment

```bash
# 1. Build images
docker compose build

# 2. Run migrations
docker compose --profile migrate up migrate

# 3. Start services
docker compose up -d

# 4. Verify health
curl https://api.yourdomain.com/api/health
```

### Manual Deployment

**Backend:**
```bash
cd server
npm ci --production
npx prisma generate
npx prisma migrate deploy
npm run build
NODE_ENV=production node dist/index.js
```

**Frontend:**
```bash
cd kaa-app
npm ci
REACT_APP_API_URL=https://api.yourdomain.com/api npm run build
# Deploy build/ folder to static hosting
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Basic health
curl https://api.yourdomain.com/api/health

# Detailed health
curl "https://api.yourdomain.com/api/health?detailed=true"

# Liveness probe
curl https://api.yourdomain.com/api/health/live

# Readiness probe  
curl https://api.yourdomain.com/api/health/ready
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "components": {
    "database": { "status": "healthy", "latency": 12 },
    "memory": { "status": "healthy" }
  }
}
```

### 2. API Verification

```bash
# Test lead creation
curl -X POST https://api.yourdomain.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "projectAddress": "123 Test St",
    "budgetRange": "15k_50k",
    "timeline": "3_6_months",
    "projectType": "full_landscape"
  }'

# Test pricing endpoint
curl https://api.yourdomain.com/api/checkout/pricing
```

### 3. Frontend Verification

- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] Intake form submits
- [ ] Pricing page displays tiers
- [ ] Login/Register forms work (if enabled)

### 4. Payment Flow Test

1. Create a test lead via intake form
2. Select a tier on pricing page
3. Complete checkout with Stripe test card: `4242 4242 4242 4242`
4. Verify redirect to success page
5. Check email received (or console log in dev)

### 5. Webhook Verification

Check Stripe dashboard → Webhooks → Recent events:
- [ ] Events received
- [ ] 200 response status
- [ ] No signature errors

---

## Monitoring Setup

### Recommended Monitoring

- **Uptime**: Pingdom, UptimeRobot, or similar
  - Monitor `/api/health/live`
  - Alert on 503 responses

- **Logs**: CloudWatch, Datadog, or ELK
  - JSON logs in production for easy parsing
  - Alert on error level logs

- **APM**: New Relic, Datadog APM
  - Track response times
  - Monitor error rates

### Key Metrics to Track

| Metric | Warning | Critical |
|--------|---------|----------|
| API Response Time | > 500ms | > 2000ms |
| Error Rate | > 1% | > 5% |
| Database Latency | > 100ms | > 500ms |
| Memory Usage | > 80% | > 95% |

---

## Rollback Plan

### Quick Rollback

```bash
# Docker
docker compose down
docker compose up -d --build  # with previous image

# Or revert to previous version
git checkout v1.0.0
docker compose up -d --build
```

### Database Rollback

```bash
# List migrations
npx prisma migrate status

# Rollback last migration (CAUTION: data loss possible)
npx prisma migrate resolve --rolled-back <migration_name>
```

---

## Support Contacts

| Issue | Contact |
|-------|---------|
| Stripe | support@stripe.com |
| Database | Your DB provider support |
| Domain/DNS | Your registrar support |
| Infrastructure | Your hosting provider |

---

## Checklist Summary

### Pre-Deploy
- [ ] Environment variables set
- [ ] Database provisioned and migrated
- [ ] Stripe products and webhooks configured
- [ ] Email service configured
- [ ] Security review complete

### Deploy
- [ ] Backend deployed and healthy
- [ ] Frontend deployed
- [ ] DNS configured

### Verify
- [ ] Health endpoints return healthy
- [ ] API endpoints respond correctly
- [ ] Full user flow works
- [ ] Payment flow works
- [ ] Emails send correctly

### Monitor
- [ ] Uptime monitoring configured
- [ ] Log aggregation set up
- [ ] Alerts configured

---

## Test Summary

| Component | Tests | Status |
|-----------|-------|--------|
| Backend | 262 | ✅ Passing |
| Frontend | 595 | ✅ Passing |
| **Total** | **857** | ✅ **All Passing** |

Last verified: January 2026
