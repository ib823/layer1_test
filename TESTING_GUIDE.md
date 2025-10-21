# SAP GRC Platform - Testing Guide

## 🚀 Quick Start (Easiest Method)

### Step 1: Setup Environment File

```bash
cd /workspaces/layer1_test
cp .env.example .env
```

Edit `.env` and set:
```bash
AUTH_ENABLED=false
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sapframework
```

### Step 2: Start PostgreSQL

```bash
# If using Docker
docker run -d --name sap-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sapframework \
  -p 5432:5432 \
  postgres:16-alpine
```

### Step 3: Initialize Database

```bash
psql postgresql://postgres:postgres@localhost:5432/sapframework < infrastructure/database/schema.sql
```

### Step 4: Generate Encryption Key

```bash
node -e "console.log('ENCRYPTION_MASTER_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and add it to your `.env` file.

### Step 5: Start the Application

**Terminal 1 - API Server:**
```bash
cd packages/api
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sapframework"
pnpm dev
```

**Terminal 2 - Frontend:**
```bash
cd packages/web
pnpm dev
```

### Step 6: Access the Application

Open browser: **http://localhost:3001**

## 🔐 Test Credentials

### Method 1: Auto-Login (No Credentials Needed)

When `AUTH_ENABLED=false`, you are **automatically logged in** as:

- **Email:** dev@example.com
- **Name:** Development User
- **Role:** System Admin (full access)
- **Tenant:** Development Tenant

Just open http://localhost:3001 and you'll be redirected to the dashboard!

### Method 2: Login Page (Any Credentials Work)

Set in `.env`:
```bash
AUTH_ENABLED=false
NEXT_PUBLIC_DEV_MODE=true
```

Then login with **ANY** email/password:
- **Email:** test@example.com (or anything)
- **Password:** password (or anything)

It will auto-authenticate you as System Admin.

## 📋 Test All Modules

### 1. ✅ User Access Review (NEW!)
**URL:** http://localhost:3001/modules/user-access-review

**What to Test:**
- Click "Run Analysis" button
- Adjust "Minimum Risk Score" (0-100)
- Toggle "Include inactive users"
- Switch between "Violations" and "Users" tabs
- Click "View Details" on violations
- Test search and filters

### 2. SoD Control
**URL:** http://localhost:3001/modules/sod/dashboard

### 3. GL Anomaly Detection
**URL:** http://localhost:3001/modules/gl-anomaly

### 4. Invoice Matching
**URL:** http://localhost:3001/modules/invoice-matching

### 5. Vendor Data Quality
**URL:** http://localhost:3001/modules/vendor-quality

### 6. LHDN e-Invoice
**URL:** http://localhost:3001/lhdn/operations

## 🔧 Troubleshooting

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill  # Kill process on port 3000
lsof -ti:3001 | xargs kill  # Kill process on port 3001
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql postgresql://postgres:postgres@localhost:5432/sapframework -c "SELECT 1"
```

### Need to Reset Database
```bash
dropdb sapframework
createdb sapframework
psql sapframework < infrastructure/database/schema.sql
```

## 🎯 Default Ports

- **Frontend:** http://localhost:3001
- **API:** http://localhost:3000
- **API Health:** http://localhost:3000/api/health
- **PostgreSQL:** 5432

## ✨ Quick Tips

1. **No password needed!** Just set `AUTH_ENABLED=false` and you're in
2. **All modules work** - Full System Admin access
3. **Sample data** - Use the module UI to generate test data
4. **Live reload** - Changes to code auto-refresh

---

**Ready to test? Just run the 6 steps above and open http://localhost:3001** 🎉
