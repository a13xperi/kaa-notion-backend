#!/bin/bash

# ============================================
# SAGE MVP Platform - Development Startup
# ============================================
# Starts both frontend and backend servers
# with environment validation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   SAGE MVP Platform - Development Mode${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo -e "   Copy env.example to .env and configure your environment"
    echo -e "   ${YELLOW}cp env.example .env${NC}"
    exit 1
fi

# Source .env file
set -a
source .env
set +a

# ============================================
# Validate Required Environment Variables
# ============================================
echo -e "${BLUE}Checking environment variables...${NC}"

MISSING_VARS=()

# Required for basic operation
if [ -z "$JWT_SECRET" ]; then
    MISSING_VARS+=("JWT_SECRET")
fi

# Check for database URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set - using SQLite for development${NC}"
fi

# Report missing variables
if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "   - $var"
    done
    exit 1
fi

echo -e "${GREEN}✓ Environment variables validated${NC}"

# ============================================
# Install Dependencies if Needed
# ============================================
echo ""
echo -e "${BLUE}Checking dependencies...${NC}"

# Check server dependencies
if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}Installing server dependencies...${NC}"
    cd server && npm install && cd ..
fi

# Check frontend dependencies
if [ ! -d "kaa-app/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd kaa-app && npm install && cd ..
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

# ============================================
# Generate Prisma Client
# ============================================
echo ""
echo -e "${BLUE}Generating Prisma client...${NC}"
cd server
npx prisma generate 2>/dev/null || true
cd ..
echo -e "${GREEN}✓ Prisma client ready${NC}"

# ============================================
# Start Servers
# ============================================
echo ""
echo -e "${BLUE}Starting development servers...${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${BLUE}Starting backend server on port ${PORT:-3001}...${NC}"
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend server
echo -e "${BLUE}Starting frontend server on port 3000...${NC}"
cd kaa-app
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Servers are running!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "   Frontend:  ${BLUE}http://localhost:3000${NC}"
echo -e "   Backend:   ${BLUE}http://localhost:${PORT:-3001}${NC}"
echo -e "   Health:    ${BLUE}http://localhost:${PORT:-3001}/api/health${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for processes
wait
