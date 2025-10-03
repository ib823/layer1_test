#!/bin/bash

# Database Setup Script

set -e

DB_NAME="${DB_NAME:-sapframework}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "🗄️  Setting up SAP Framework database..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL 14 or higher."
    exit 1
fi

# Create database if it doesn't exist
echo "Creating database '$DB_NAME'..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || echo "Database already exists"

# Run schema
echo "Running schema migration..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f infrastructure/database/schema.sql

echo "✅ Database setup complete!"
echo ""
echo "Database URL: postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo "To connect: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
