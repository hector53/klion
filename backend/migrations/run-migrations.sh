#!/bin/bash

# =============================================================================
# Klion - Database Migration Runner
# =============================================================================
# This script runs SQL migrations on the PostgreSQL database
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE=""
LOADED_ENV=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --env|-e)
            ENV_FILE="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -n "$ENV_FILE" ]; then
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
        LOADED_ENV="$ENV_FILE"
    else
        echo -e "${RED}✗ Env file not found: ${ENV_FILE}${NC}"
        exit 1
    fi
elif [ -f "${SCRIPT_DIR}/../../.env" ]; then
    export $(cat "${SCRIPT_DIR}/../../.env" | grep -v '^#' | xargs)
    LOADED_ENV="${SCRIPT_DIR}/../../.env"
elif [ -f "${SCRIPT_DIR}/../.env" ]; then
    export $(cat "${SCRIPT_DIR}/../.env" | grep -v '^#' | xargs)
    LOADED_ENV="${SCRIPT_DIR}/../.env"
elif [ -f "${SCRIPT_DIR}/.env" ]; then
    export $(cat "${SCRIPT_DIR}/.env" | grep -v '^#' | xargs)
    LOADED_ENV="${SCRIPT_DIR}/.env"
fi

# Map POSTGRES_* envs to DATABASE_* when DATABASE_* are not set
if [ -z "$DATABASE_HOST" ] && [ -n "$POSTGRES_HOST" ]; then
    DATABASE_HOST="$POSTGRES_HOST"
fi
if [ -z "$DATABASE_PORT" ] && [ -n "$POSTGRES_PORT" ]; then
    DATABASE_PORT="$POSTGRES_PORT"
fi
if [ -z "$DATABASE_USER" ] && [ -n "$POSTGRES_USER" ]; then
    DATABASE_USER="$POSTGRES_USER"
fi
if [ -z "$DATABASE_PASSWORD" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    DATABASE_PASSWORD="$POSTGRES_PASSWORD"
fi
if [ -z "$DATABASE_NAME" ] && [ -n "$POSTGRES_DB" ]; then
    DATABASE_NAME="$POSTGRES_DB"
fi

# Database connection parameters
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USER:-postgres}"
DB_PASSWORD="${DATABASE_PASSWORD:-postgres}"
DB_NAME="${DATABASE_NAME:-clientboard}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Klion - Database Migration Runner                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
if [ -n "$LOADED_ENV" ]; then
    echo -e "${YELLOW}Loaded env:${NC} ${LOADED_ENV}"
fi
echo -e "${YELLOW}Database Configuration:${NC}"
echo -e "  Host:     ${DB_HOST}"
echo -e "  Port:     ${DB_PORT}"
echo -e "  Database: ${DB_NAME}"
echo -e "  User:     ${DB_USER}"
echo ""

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
export PGPASSWORD="${DB_PASSWORD}"

if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Could not connect to database${NC}"
    echo -e "${RED}Please check your database configuration and ensure PostgreSQL is running${NC}"
    exit 1
fi

echo ""

# Function to run a migration
run_migration() {
    local file=$1
    local filename=$(basename "$file")

    echo -e "${YELLOW}Running migration: ${filename}${NC}"

    if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "$file" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Migration successful: ${filename}${NC}"
        return 0
    else
        echo -e "${RED}✗ Migration failed: ${filename}${NC}"
        psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "$file"
        return 1
    fi
}

# Get all SQL migration files
MIGRATION_DIR="$(dirname "$0")"
MIGRATIONS=($(ls -1 "${MIGRATION_DIR}"/*.sql 2>/dev/null | sort))

if [ ${#MIGRATIONS[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠ No migration files found${NC}"
    exit 0
fi

echo -e "${BLUE}Found ${#MIGRATIONS[@]} migration file(s)${NC}"
echo ""

# Run migrations
FAILED=0
SUCCESS=0

for migration in "${MIGRATIONS[@]}"; do
    if run_migration "$migration"; then
        ((SUCCESS++))
    else
        ((FAILED++))
        echo -e "${RED}Migration failed. Stopping execution.${NC}"
        break
    fi
    echo ""
done

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Successful migrations: ${SUCCESS}${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed migrations: ${FAILED}${NC}"
fi
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All migrations completed successfully!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some migrations failed${NC}"
    exit 1
fi
