#!/bin/bash

# SAGE MVP Platform - Deployment Verification Script
# Run this script to verify your deployment is correctly configured

echo "=========================================="
echo "  SAGE MVP Platform - Deployment Check"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

check_env() {
    if [ -z "${!1}" ]; then
        if [ "$2" = "required" ]; then
            echo -e "${RED}✗ $1 is not set (required)${NC}"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "${YELLOW}○ $1 is not set (optional)${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${GREEN}✓ $1 is set${NC}"
    fi
}

echo "Checking environment variables..."
echo ""

echo "--- Database ---"
check_env "DATABASE_URL" "required"

echo ""
echo "--- Authentication ---"
check_env "JWT_SECRET" "required"
check_env "JWT_EXPIRES_IN" "optional"

echo ""
echo "--- Stripe ---"
check_env "STRIPE_SECRET_KEY" "required"
check_env "STRIPE_WEBHOOK_SECRET" "required"
check_env "STRIPE_SUCCESS_URL" "optional"
check_env "STRIPE_CANCEL_URL" "optional"

echo ""
echo "--- Supabase Storage ---"
check_env "SUPABASE_URL" "required"
check_env "SUPABASE_SERVICE_KEY" "required"
check_env "STORAGE_BUCKET" "optional"

echo ""
echo "--- Notion (Optional) ---"
check_env "NOTION_API_KEY" "optional"
check_env "NOTION_PROJECTS_DATABASE_ID" "optional"

echo ""
echo "--- Server ---"
check_env "PORT" "optional"
check_env "NODE_ENV" "optional"

echo ""
echo "=========================================="

# Check if server can start
echo ""
echo "Checking server health..."

if [ -f "server/dist/index.js" ]; then
    echo -e "${GREEN}✓ Server build exists${NC}"
else
    echo -e "${YELLOW}○ Server build not found - run 'cd server && npm run build'${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check if frontend build exists
if [ -d "kaa-app/build" ]; then
    echo -e "${GREEN}✓ Frontend build exists${NC}"
else
    echo -e "${YELLOW}○ Frontend build not found - run 'cd kaa-app && npm run build'${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check database connection
echo ""
echo "Checking database connection..."
if command -v npx &> /dev/null; then
    cd server 2>/dev/null || cd ..
    if npx prisma db pull --force 2>/dev/null; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    else
        echo -e "${RED}✗ Database connection failed${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    cd - > /dev/null 2>&1
else
    echo -e "${YELLOW}○ Cannot verify database (npx not available)${NC}"
fi

echo ""
echo "=========================================="
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Deployment check failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Deployment check passed with $WARNINGS warning(s)${NC}"
    exit 0
else
    echo -e "${GREEN}Deployment check passed! All systems ready.${NC}"
    exit 0
fi
