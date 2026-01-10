# Deployment Guide

This guide covers deploying the SAGE Platform to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Reverse Proxy Configuration](#reverse-proxy-configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Health Checks](#health-checks)
- [Rollback Procedures](#rollback-procedures)
- [Security Checklist](#security-checklist)

## Prerequisites

Before deploying, ensure you have:

- [ ] Production PostgreSQL database (14+)
- [ ] Redis instance (6+) for rate limiting and caching
- [ ] Domain name with DNS configured
- [ ] SSL certificate (or use Let's Encrypt)
- [ ] Stripe account with production keys
- [ ] Resend account for production emails
- [ ] Sentry project for error tracking
- [ ] Supabase project for file storage

## Environment Setup

For complete environment variable documentation, see [ENVIRONMENT_REFERENCE.md](./ENVIRONMENT_REFERENCE.md).

### Production Environment Variables

Create a `.env.production` file. Key production-specific settings:

```bash
# Database - Use SSL in production
DATABASE_URL="postgresql://user:password@db.host.com:5432/sage_production?sslmode=require"

# Use production Stripe keys
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Production settings
NODE_ENV=production
CORS_ORIGIN="https://yourdomain.com"
```

See [ENVIRONMENT_REFERENCE.md - Production Checklist](./ENVIRONMENT_REFERENCE.md#production-checklist) for the complete checklist.

### Generate Secure Keys

```bash
# Generate JWT secret
openssl rand -base64 64

# Generate VAPID keys
npx web-push generate-vapid-keys
```

## Database Setup

### 1. Create Production Database

```sql
-- Connect to PostgreSQL as admin
CREATE DATABASE sage_production;
CREATE USER sage_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE sage_production TO sage_user;
```

### 2. Run Migrations

```bash
# Set production database URL
export DATABASE_URL="postgresql://sage_user:password@host:5432/sage_production"

# Deploy migrations (don't create new ones in production)
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

### 3. Seed Initial Data (Optional)

```bash
# Only run if you need initial admin users or tier data
npx prisma db seed
```

## Backend Deployment

### Option 1: Docker Deployment

#### Build Docker Image

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

#### Build and Run

```bash
# Build image
docker build -t sage-api:latest ./server

# Run container
docker run -d \
  --name sage-api \
  -p 3001:3001 \
  --env-file .env.production \
  sage-api:latest
```

### Option 2: PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Build the application
cd server
npm run build

# Start with PM2
pm2 start dist/index.js --name sage-api -i max

# Save PM2 configuration
pm2 save
pm2 startup
```

#### PM2 Ecosystem File

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'sage-api',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Option 3: Vercel Serverless

For serverless deployment, create an API route handler:

```typescript
// api/index.ts
import { createServer } from '@vercel/node';
import app from '../server/src/index';

export default createServer(app);
```

## Frontend Deployment

### Build for Production

```bash
cd kaa-app

# Set production API URL
echo "VITE_API_URL=https://api.yourdomain.com" > .env.production

# Build
npm run build
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

### Deploy to Nginx

```bash
# Copy build files
scp -r dist/* user@server:/var/www/sage/

# Nginx configuration
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/sage;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Reverse Proxy Configuration

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/sage

upstream sage_api {
    server 127.0.0.1:3001;
    keepalive 64;
}

# API Server
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://sage_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Webhook endpoints (no rate limiting)
    location /api/webhooks {
        proxy_pass http://sage_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /var/www/sage;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker - no cache
    location /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## SSL/TLS Setup

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

## Monitoring & Logging

### Sentry Integration

Sentry is already integrated. Ensure the DSN is set in production:

```bash
SENTRY_DSN="https://xxx@sentry.io/xxx"
```

### Log Aggregation

Configure structured logging output for log aggregation services:

```bash
# View PM2 logs
pm2 logs sage-api

# Tail logs
tail -f /var/log/sage/combined.log
```

### Uptime Monitoring

Set up monitoring for:

- `https://api.yourdomain.com/api/health` - API health
- `https://yourdomain.com` - Frontend availability
- Database connectivity
- Redis connectivity

## Health Checks

The API includes a health check endpoint:

```bash
# Check API health
curl https://api.yourdomain.com/api/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-10T12:00:00Z",
  "database": "connected",
  "redis": "connected"
}
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1
```

## Rollback Procedures

### Database Rollback

```bash
# List migrations
npx prisma migrate status

# Rollback last migration (development only)
# In production, apply a new corrective migration
npx prisma migrate dev --name rollback_xxx
```

### Application Rollback

```bash
# PM2 - Rollback to previous version
pm2 deploy production revert 1

# Docker - Switch to previous image tag
docker stop sage-api
docker run -d --name sage-api sage-api:previous-tag

# Vercel - Instant rollback in dashboard
vercel rollback
```

## Security Checklist

### Pre-Deployment

- [ ] All secrets are using production values
- [ ] JWT secret is at least 64 characters
- [ ] Database uses SSL connection
- [ ] CORS is restricted to production domain
- [ ] Rate limiting is enabled
- [ ] Helmet.js security headers are configured
- [ ] Input validation is in place
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS prevention (React + sanitization)

### Post-Deployment

- [ ] SSL certificate is valid
- [ ] HSTS header is enabled
- [ ] Security headers are present (X-Frame-Options, etc.)
- [ ] Cookies are secure and HttpOnly
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't include sensitive data
- [ ] Admin routes require authentication
- [ ] Stripe webhooks verify signatures

### Ongoing

- [ ] Regular dependency updates
- [ ] Security audit every quarter
- [ ] Penetration testing annually
- [ ] Backup verification monthly
- [ ] Access review quarterly

## Backup Strategy

### Database Backups

```bash
# Automated daily backup (add to cron)
0 2 * * * pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > /backups/sage_$(date +\%Y\%m\%d).sql.gz

# Retention: Keep 7 daily, 4 weekly, 12 monthly backups
```

### File Storage Backups

Supabase Storage handles replication. Enable point-in-time recovery for additional protection.

## Troubleshooting

### Common Issues

**502 Bad Gateway**
- Check if the API server is running: `pm2 status`
- Check nginx logs: `tail -f /var/log/nginx/error.log`

**Database Connection Failed**
- Verify DATABASE_URL is correct
- Check database server is accessible
- Verify SSL settings if required

**Stripe Webhooks Failing**
- Verify webhook secret matches
- Check webhook URL is accessible
- Ensure raw body parsing for webhook route

**Push Notifications Not Working**
- Verify VAPID keys are correct
- Check browser console for subscription errors
- Ensure HTTPS is enabled (required for push)

### Logs Location

- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`
- Application logs: `/var/log/sage/`

## Related Documentation

- [COMMANDS.md](./COMMANDS.md) - Complete command reference
- [ENVIRONMENT_REFERENCE.md](./ENVIRONMENT_REFERENCE.md) - Environment variables
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local development setup
- [TESTING.md](./TESTING.md) - Testing strategy
