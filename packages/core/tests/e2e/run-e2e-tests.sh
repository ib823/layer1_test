#!/bin/bash
# SoD End-to-End Test Runner
#
# This script sets up the environment and runs the E2E test

set -e

echo "🚀 SoD End-to-End Test Runner"
echo "================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set, using default"
  export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"
fi

echo "📊 Database: $DATABASE_URL"

# Check if database is accessible
echo "🔍 Checking database connection..."
if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo "✓ Database connection successful"
else
  echo "✗ Cannot connect to database"
  echo "  Please ensure PostgreSQL is running and DATABASE_URL is correct"
  exit 1
fi

# Check if required tables exist
echo "🔍 Checking database schema..."
TABLES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('sod_violations', 'sod_analysis_runs', 'tenants')")

if [ "$TABLES" -eq 3 ]; then
  echo "✓ Required tables exist"
else
  echo "✗ Required tables missing"
  echo "  Please run the database migrations:"
  echo "  psql \$DATABASE_URL -f infrastructure/database/schema.sql"
  echo "  psql \$DATABASE_URL -f infrastructure/database/migrations/001_sod_violations.sql"
  exit 1
fi

# Navigate to the E2E test directory
cd "$(dirname "$0")"

# Run the test using ts-node (no compilation needed)
echo ""
echo "🧪 Running End-to-End Tests..."
echo "================================"
echo ""

# Use pnpm to run ts-node (leverages workspace dependencies)
cd ../../../..
pnpm exec ts-node packages/core/tests/e2e/test-sod-e2e.ts

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ Test runner completed successfully"
else
  echo "✗ Test runner failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
