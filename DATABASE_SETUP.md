# Database Setup Guide

This document describes the database configuration for the SAP MVP Framework.

## Quick Start

### Using Docker (Recommended)

The easiest way to run the database for development is using Docker:

```bash
# Stop system PostgreSQL if running
sudo service postgresql stop

# Start PostgreSQL container (if not already running)
docker start sapframework-postgres

# Or create new container
docker run -d \
  --name sapframework-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sapframework \
  -p 5432:5432 \
  postgres:16-alpine
```

### Environment Configuration

The DATABASE_URL is configured in `.env.local`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sapframework
```

For tests, export the environment variable:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"
export NODE_ENV=test

# Run tests
pnpm test
```

## Database Schema

### Initial Setup

The database schema is located in `infrastructure/database/schema.sql`.

To apply the schema:

```bash
PGPASSWORD=postgres psql \
  -h localhost \
  -U postgres \
  -d sapframework \
  -f infrastructure/database/schema.sql
```

### Migrations

Migration files are in `infrastructure/database/migrations/`:

- `003_performance_indexes.sql` - Performance indexes
- `004_add_invoice_matching.sql` - Invoice matching tables
- `005_add_lhdn_einvoice.sql` - LHDN e-invoice tables
- `007_add_sod_control_core.sql` - SoD control core tables
- `008_add_sod_access_graph.sql` - SoD access graph tables
- `009_add_sod_findings_mitigation.sql` - SoD findings and mitigation
- `010_add_sod_certification_evidence.sql` - SoD certification

Apply migrations in order:

```bash
for file in infrastructure/database/migrations/*.sql; do
  echo "Applying $file..."
  PGPASSWORD=postgres psql -h localhost -U postgres -d sapframework -f "$file"
done
```

### Seed Data

Baseline data is in `infrastructure/database/seeds/`:

```bash
PGPASSWORD=postgres psql \
  -h localhost \
  -U postgres \
  -d sapframework \
  -f infrastructure/database/seeds/001_sod_baseline_rules.sql
```

## Prisma Setup

The project uses Prisma ORM for some models. Generate the Prisma client:

```bash
cd packages/core
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework" \
  npx prisma generate
```

## Testing

### Running Tests with Database

```bash
# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"
export NODE_ENV=test

# Run all tests (excluding integration tests that need DB)
pnpm -r --filter="!@sap-framework/web" test \
  --testPathIgnorePatterns="integration" \
  --testPathIgnorePatterns="e2e"

# Run specific test suite
pnpm --filter @sap-framework/core test -- encryption.test.ts
```

### Integration Tests

Integration tests require a running database:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"

# Run integration tests
pnpm --filter @sap-framework/sod-control test -- integration
```

## Troubleshooting

### Connection Issues

If you get "connection refused" errors:

```bash
# Check if container is running
docker ps | grep sapframework-postgres

# Start if stopped
docker start sapframework-postgres

# Check logs
docker logs sapframework-postgres
```

### Port Conflicts

If port 5432 is already in use:

```bash
# Find process using port
lsof -i :5432

# Stop system PostgreSQL
sudo service postgresql stop

# Or use a different port for Docker
docker run -d \
  --name sapframework-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sapframework \
  -p 5433:5432 \
  postgres:16-alpine

# Update DATABASE_URL
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sapframework"
```

### Database Already Exists

If you see "database already exists" errors when running schema.sql, this is expected - the tables are already created. You can safely ignore these errors.

## Production Deployment

For production deployments:

1. **Generate strong credentials:**
   ```bash
   # Generate strong password
   openssl rand -base64 32
   ```

2. **Update DATABASE_URL** with production credentials
3. **Apply migrations** in order
4. **Set up backups** according to your hosting provider's recommendations
5. **Configure connection pooling** if using serverless/edge deployments

## Cleanup

To remove the database container:

```bash
# Stop container
docker stop sapframework-postgres

# Remove container
docker rm sapframework-postgres

# Remove volume (WARNING: deletes all data)
docker volume prune
```

---

*Last Updated: 2025-10-21*
