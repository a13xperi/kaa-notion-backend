#!/bin/bash
#
# SAGE MVP Platform - Quick Start Script
# Gets everything running with one command
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           SAGE MVP Platform - Quick Start                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 20+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18+. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ No .env file found. Creating from example...${NC}"
    cp env.example .env
    
    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    
    # Update .env with generated secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|g" .env
    else
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|g" .env
    fi
    
    echo -e "${GREEN}✓ Created .env with secure JWT_SECRET${NC}"
    echo -e "${YELLOW}⚠ Please configure DATABASE_URL in .env${NC}"
fi

# Check DATABASE_URL
source .env 2>/dev/null || true
if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "postgresql://user:pass@localhost:5432/sage?schema=public" ]; then
    echo -e "${YELLOW}"
    echo "═══════════════════════════════════════════════════════════════"
    echo "DATABASE_URL not configured. Options:"
    echo ""
    echo "1. Use SQLite (simple, no setup required):"
    echo "   DATABASE_URL=\"file:./dev.db\""
    echo ""
    echo "2. Use PostgreSQL:"
    echo "   DATABASE_URL=\"postgresql://user:pass@localhost:5432/sage\""
    echo ""
    echo "3. Use Supabase (free tier available):"
    echo "   Get connection string from: https://supabase.com"
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${NC}"
    
    read -p "Use SQLite for development? (y/n): " use_sqlite
    if [ "$use_sqlite" = "y" ] || [ "$use_sqlite" = "Y" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' 's|DATABASE_URL=.*|DATABASE_URL="file:./dev.db"|g' .env
        else
            sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:./dev.db"|g' .env
        fi
        echo -e "${GREEN}✓ Configured SQLite database${NC}"
    else
        echo -e "${YELLOW}Please configure DATABASE_URL in .env and re-run this script${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm run install-all

echo ""
echo -e "${BLUE}🗄️  Setting up database...${NC}"
cd server
npx prisma generate
npx prisma migrate dev --name init 2>/dev/null || npx prisma db push
cd ..

echo ""
echo -e "${BLUE}🌱 Seeding demo data...${NC}"
cd server
npx prisma db seed 2>/dev/null || echo "Seed skipped (may already exist)"
cd ..

echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ Setup Complete!                         ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  To start the development servers:                            ║"
echo "║                                                               ║"
echo "║    npm run dev                                                ║"
echo "║                                                               ║"
echo "║  Access points:                                               ║"
echo "║    • Frontend:   http://localhost:3000                        ║"
echo "║    • Backend:    http://localhost:3001                        ║"
echo "║    • API Docs:   http://localhost:3001/api/docs               ║"
echo "║                                                               ║"
echo "║  Demo accounts (after seeding):                               ║"
echo "║    • Admin:  admin@sage.com / admin123                        ║"
echo "║    • Team:   team@sage.com / team123                          ║"
echo "║    • Client: client2@demo.com / demo123                       ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

read -p "Start development servers now? (y/n): " start_now
if [ "$start_now" = "y" ] || [ "$start_now" = "Y" ]; then
    npm run dev
fi
