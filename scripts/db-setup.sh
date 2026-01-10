#!/bin/bash

# ============================================
# SAGE MVP Platform - Database Setup
# ============================================
# Sets up Prisma, runs migrations, and seeds data

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   SAGE MVP - Database Setup${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo -e "   Copy env.example to .env and configure DATABASE_URL"
    echo -e "   ${YELLOW}cp env.example .env${NC}"
    exit 1
fi

# Source .env file
set -a
source .env
set +a

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set${NC}"
    echo ""
    echo "Options:"
    echo "  1. For local development with SQLite:"
    echo "     Add to .env: DATABASE_URL=\"file:./dev.db\""
    echo ""
    echo "  2. For Supabase (production-like):"
    echo "     Add to .env: DATABASE_URL=\"postgresql://user:pass@host:5432/db\""
    echo ""
    read -p "Use SQLite for development? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo 'DATABASE_URL="file:./dev.db"' >> .env
        export DATABASE_URL="file:./dev.db"
        echo -e "${GREEN}✓ Added SQLite DATABASE_URL to .env${NC}"
        
        # Update prisma schema for SQLite
        echo -e "${YELLOW}Note: You'll need to update prisma/schema.prisma:${NC}"
        echo '  Change: provider = "postgresql"'
        echo '  To:     provider = "sqlite"'
        echo ""
    else
        echo -e "${RED}Please configure DATABASE_URL in .env${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ DATABASE_URL configured${NC}"
echo ""

# ============================================
# Install Dependencies
# ============================================
echo -e "${BLUE}Installing dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    npm install
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ============================================
# Generate Prisma Client
# ============================================
echo -e "${BLUE}Generating Prisma client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma client generated${NC}"
echo ""

# ============================================
# Run Migrations
# ============================================
echo -e "${BLUE}Running database migrations...${NC}"

# Check if this is a fresh database
if npx prisma migrate status 2>&1 | grep -q "Database schema is not empty"; then
    echo -e "${YELLOW}Existing database detected. Running migrations...${NC}"
    npx prisma migrate deploy
else
    echo -e "${YELLOW}Creating initial migration...${NC}"
    npx prisma migrate dev --name init
fi

echo -e "${GREEN}✓ Migrations complete${NC}"
echo ""

# ============================================
# Seed Database
# ============================================
read -p "Seed database with demo data? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Seeding database...${NC}"
    npx prisma db seed
    echo -e "${GREEN}✓ Database seeded${NC}"
else
    echo -e "${YELLOW}Skipped seeding${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Database Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the development servers:"
echo "     ${BLUE}./scripts/start-dev.sh${NC}"
echo ""
echo "  2. Or start manually:"
echo "     ${BLUE}cd server && npm run dev${NC}"
echo "     ${BLUE}cd kaa-app && npm start${NC}"
echo ""
echo "  3. Open Prisma Studio to view data:"
echo "     ${BLUE}npm run prisma:studio${NC}"
echo ""
