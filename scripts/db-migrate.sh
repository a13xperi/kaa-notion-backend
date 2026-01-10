#!/bin/bash
#
# Database Migration Helper Script
# Provides utilities for managing Prisma migrations.
#
# Usage:
#   ./scripts/db-migrate.sh <command>
#
# Commands:
#   create <name>   - Create a new migration
#   apply           - Apply pending migrations
#   rollback        - Rollback the last migration
#   reset           - Reset the database (DANGEROUS)
#   status          - Show migration status
#   seed            - Seed the database
#   studio          - Open Prisma Studio
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_usage() {
    echo "Database Migration Helper"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create <name>   Create a new migration"
    echo "  apply           Apply pending migrations"
    echo "  deploy          Deploy migrations to production"
    echo "  rollback        Show rollback instructions"
    echo "  reset           Reset the database (DANGEROUS)"
    echo "  status          Show migration status"
    echo "  seed            Seed the database"
    echo "  studio          Open Prisma Studio"
    echo "  generate        Generate Prisma Client"
    echo ""
    echo "Examples:"
    echo "  $0 create add_user_avatar"
    echo "  $0 apply"
    echo "  $0 status"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if we're in the right directory
check_prisma() {
    if [ ! -f "prisma/schema.prisma" ]; then
        print_error "prisma/schema.prisma not found. Run this script from the project root."
        exit 1
    fi
}

# Commands
cmd_create() {
    if [ -z "$1" ]; then
        print_error "Migration name is required"
        echo "Usage: $0 create <migration_name>"
        exit 1
    fi

    print_info "Creating migration: $1"
    npx prisma migrate dev --name "$1"
    print_success "Migration created successfully"
}

cmd_apply() {
    print_info "Applying pending migrations..."
    npx prisma migrate dev
    print_success "Migrations applied successfully"
}

cmd_deploy() {
    print_warning "This will apply migrations to the production database."
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deploying migrations..."
        npx prisma migrate deploy
        print_success "Migrations deployed successfully"
    else
        print_info "Deployment cancelled"
    fi
}

cmd_rollback() {
    print_warning "Prisma does not support automatic rollbacks."
    echo ""
    echo "To rollback a migration, you have several options:"
    echo ""
    echo "1. Create a new migration that reverts the changes:"
    echo "   - Modify your schema.prisma to the previous state"
    echo "   - Run: npx prisma migrate dev --name rollback_<migration_name>"
    echo ""
    echo "2. Reset the database (DEVELOPMENT ONLY):"
    echo "   - Run: $0 reset"
    echo "   - This will drop all data!"
    echo ""
    echo "3. Manual rollback:"
    echo "   - Connect to your database"
    echo "   - Manually run the reverse SQL"
    echo "   - Delete the migration from _prisma_migrations table"
    echo ""
    echo "Migration history location: prisma/migrations/"
}

cmd_reset() {
    print_warning "This will DELETE ALL DATA in your database!"
    read -p "Type 'RESET' to confirm: " confirm
    if [ "$confirm" = "RESET" ]; then
        print_info "Resetting database..."
        npx prisma migrate reset --force
        print_success "Database reset successfully"
    else
        print_info "Reset cancelled"
    fi
}

cmd_status() {
    print_info "Migration status:"
    npx prisma migrate status
}

cmd_seed() {
    print_info "Seeding database..."
    npx prisma db seed
    print_success "Database seeded successfully"
}

cmd_studio() {
    print_info "Opening Prisma Studio..."
    npx prisma studio
}

cmd_generate() {
    print_info "Generating Prisma Client..."
    npx prisma generate
    print_success "Prisma Client generated successfully"
}

# Main
check_prisma

case "$1" in
    create)
        cmd_create "$2"
        ;;
    apply)
        cmd_apply
        ;;
    deploy)
        cmd_deploy
        ;;
    rollback)
        cmd_rollback
        ;;
    reset)
        cmd_reset
        ;;
    status)
        cmd_status
        ;;
    seed)
        cmd_seed
        ;;
    studio)
        cmd_studio
        ;;
    generate)
        cmd_generate
        ;;
    -h|--help|help)
        print_usage
        ;;
    *)
        print_usage
        exit 1
        ;;
esac
