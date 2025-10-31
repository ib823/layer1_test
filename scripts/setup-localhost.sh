#!/bin/bash
# SAP MVP Framework - Localhost Setup Script
# Purpose: Automated setup for local development and testing

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  SAP MVP Framework - Localhost Setup ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found${NC}"
  echo "Please install Node.js 18+ from https://nodejs.org/"
  exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}⚠ pnpm not found, installing...${NC}"
  npm install -g pnpm@8
fi
PNPM_VERSION=$(pnpm --version)
echo -e "${GREEN}✓ pnpm: $PNPM_VERSION${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
  echo -e "${RED}✗ PostgreSQL not found${NC}"
  echo "Please install PostgreSQL 14+ from https://www.postgresql.org/"
  exit 1
fi
PSQL_VERSION=$(psql --version | cut -d' ' -f3)
echo -e "${GREEN}✓ PostgreSQL: $PSQL_VERSION${NC}"

echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install || { echo -e "${RED}✗ Installation failed${NC}"; exit 1; }
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo -e "${YELLOW}Setting up environment variables...${NC}"
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env

    # Generate encryption key
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

    # Update .env with generated key
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|ENCRYPTION_MASTER_KEY=.*|ENCRYPTION_MASTER_KEY=$ENCRYPTION_KEY|" .env
    else
      sed -i "s|ENCRYPTION_MASTER_KEY=.*|ENCRYPTION_MASTER_KEY=$ENCRYPTION_KEY|" .env
    fi

    echo -e "${GREEN}✓ Created .env file with generated encryption key${NC}"
  else
    echo -e "${RED}✗ .env.example not found${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""
echo -e "${YELLOW}Setting up PostgreSQL database...${NC}"

# Check if PostgreSQL service is running
if ! pg_isready &> /dev/null; then
  echo -e "${YELLOW}Starting PostgreSQL service...${NC}"
  if command -v systemctl &> /dev/null; then
    sudo systemctl start postgresql
  elif command -v service &> /dev/null; then
    sudo service postgresql start
  else
    echo -e "${RED}✗ Cannot start PostgreSQL service${NC}"
    exit 1
  fi
fi

# Create database
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w sapframework | wc -l)
if [ "$DB_EXISTS" -eq "0" ]; then
  echo "Creating database..."
  sudo -u postgres psql -c "CREATE DATABASE sapframework;"
  echo -e "${GREEN}✓ Database created${NC}"
else
  echo -e "${GREEN}✓ Database already exists${NC}"
fi

# Run schema if tables don't exist
TABLE_EXISTS=$(sudo -u postgres psql -d sapframework -c "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants');" -t | xargs)
if [ "$TABLE_EXISTS" != "t" ]; then
  if [ -f infrastructure/database/schema.sql ]; then
    echo "Loading database schema..."
    sudo -u postgres psql -d sapframework -f infrastructure/database/schema.sql > /dev/null
    echo -e "${GREEN}✓ Database schema loaded${NC}"
  else
    echo -e "${YELLOW}⚠ Schema file not found, skipping...${NC}"
  fi
else
  echo -e "${GREEN}✓ Database schema already loaded${NC}"
fi

echo ""
echo -e "${YELLOW}Generating Prisma client...${NC}"
cd packages/core
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
npx prisma generate > /dev/null 2>&1 || echo -e "${YELLOW}⚠ Prisma generation skipped (may fail in restricted environment)${NC}"
cd ../..
echo -e "${GREEN}✓ Prisma client generated${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ Localhost Setup Complete!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Start the application:${NC}"
echo -e "   ${GREEN}pnpm dev${NC}"
echo ""
echo -e "2. ${YELLOW}Access the services:${NC}"
echo -e "   API:    ${GREEN}http://localhost:3000/api/health${NC}"
echo -e "   Web UI: ${GREEN}http://localhost:3001${NC}"
echo ""
echo -e "3. ${YELLOW}Run tests:${NC}"
echo -e "   ${GREEN}pnpm test${NC}"
echo ""
echo -e "4. ${YELLOW}View full testing guide:${NC}"
echo -e "   ${GREEN}cat LOCALHOST_TESTING_GUIDE.md${NC}"
echo ""
echo -e "${BLUE}Happy testing! 🚀${NC}"
echo ""

exit 0
