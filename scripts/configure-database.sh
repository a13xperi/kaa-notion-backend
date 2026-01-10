#!/bin/bash
#
# Database Configuration Helper Script
# Helps configure DATABASE_URL for local development
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  Database Configuration Helper${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo -e "   Creating from env.example..."
    cp env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo ""
fi

# Check current DATABASE_URL
source .env 2>/dev/null || true

if [ -n "$DATABASE_URL" ] && [ "$DATABASE_URL" != "" ]; then
    echo -e "${GREEN}✓ DATABASE_URL is already configured${NC}"
    echo -e "   ${CYAN}$DATABASE_URL${NC}"
    echo ""
    read -p "Do you want to change it? (y/N): " change_it
    if [[ ! $change_it =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Keeping current configuration${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}DATABASE_URL is not configured. Choose an option:${NC}"
echo ""
echo "1. ${GREEN}Supabase (Recommended for production-like development)${NC}"
echo "   - Get connection string from: https://app.supabase.com"
echo "   - Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true"
echo ""
echo "2. ${GREEN}Local PostgreSQL (Requires PostgreSQL installed)${NC}"
echo "   - Format: postgresql://user:password@localhost:5432/sage"
echo ""
echo "3. ${GREEN}Docker PostgreSQL (Requires Docker installed)${NC}"
echo "   - Run: docker compose -f docker-compose.dev.yml up db"
echo "   - Format: postgresql://postgres:postgres@localhost:5432/sage"
echo ""
echo "4. ${YELLOW}Skip for now (database operations will fail)${NC}"
echo ""

read -p "Choose option (1-4): " choice

case $choice in
    1)
        echo ""
        echo -e "${CYAN}Enter your Supabase connection string:${NC}"
        echo -e "${YELLOW}Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true${NC}"
        read -p "DATABASE_URL: " db_url
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS sed syntax
            if grep -q "^DATABASE_URL=" .env; then
                sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|g" .env
            else
                echo "DATABASE_URL=\"$db_url\"" >> .env
            fi
        else
            # Linux sed syntax
            if grep -q "^DATABASE_URL=" .env; then
                sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|g" .env
            else
                echo "DATABASE_URL=\"$db_url\"" >> .env
            fi
        fi
        echo -e "${GREEN}✓ DATABASE_URL configured${NC}"
        ;;
    2)
        echo ""
        read -p "PostgreSQL user (default: postgres): " pg_user
        pg_user=${pg_user:-postgres}
        read -sp "PostgreSQL password: " pg_pass
        echo ""
        read -p "PostgreSQL database (default: sage): " pg_db
        pg_db=${pg_db:-sage}
        read -p "PostgreSQL host (default: localhost): " pg_host
        pg_host=${pg_host:-localhost}
        read -p "PostgreSQL port (default: 5432): " pg_port
        pg_port=${pg_port:-5432}
        
        db_url="postgresql://$pg_user:$pg_pass@$pg_host:$pg_port/$pg_db"
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if grep -q "^DATABASE_URL=" .env; then
                sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|g" .env
            else
                echo "DATABASE_URL=\"$db_url\"" >> .env
            fi
        else
            if grep -q "^DATABASE_URL=" .env; then
                sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|g" .env
            else
                echo "DATABASE_URL=\"$db_url\"" >> .env
            fi
        fi
        echo -e "${GREEN}✓ DATABASE_URL configured${NC}"
        ;;
    3)
        echo ""
        echo -e "${YELLOW}Checking for Docker...${NC}"
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}❌ Docker is not installed${NC}"
            echo "   Install Docker: https://www.docker.com/get-started"
            exit 1
        fi
        
        echo -e "${CYAN}Starting PostgreSQL container...${NC}"
        docker compose -f docker-compose.dev.yml up -d db
        
        echo -e "${YELLOW}Waiting for database to be ready...${NC}"
        sleep 5
        
        db_url="postgresql://postgres:postgres@localhost:5432/sage"
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if grep -q "^DATABASE_URL=" .env; then
                sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|g" .env
            else
                echo "DATABASE_URL=\"$db_url\"" >> .env
            fi
        else
            if grep -q "^DATABASE_URL=" .env; then
                sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|g" .env
            else
                echo "DATABASE_URL=\"$db_url\"" >> .env
            fi
        fi
        echo -e "${GREEN}✓ DATABASE_URL configured for Docker PostgreSQL${NC}"
        ;;
    4)
        echo -e "${YELLOW}Skipping database configuration${NC}"
        echo -e "${YELLOW}⚠️  Database operations will fail until DATABASE_URL is configured${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Database Configuration Complete${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Run: npm run phase0-setup"
echo "  2. Or manually: npm run prisma:migrate"
echo "  3. Start server: npm start"
echo ""