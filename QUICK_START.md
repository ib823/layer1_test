# SAP MVP Framework - Quick Start Guide

## 🚀 One-Command Startup

```bash
./start-app.sh
```

This script will automatically:
1. ✅ Check prerequisites (Node.js, pnpm)
2. ✅ Start PostgreSQL database (Docker)
3. ✅ Create `.env` file with dev settings
4. ✅ Install dependencies
5. ✅ Build all packages
6. ✅ Start Backend API (port 3001)
7. ✅ Start Frontend (port 3000)

## 📍 Access URLs

After startup, access:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/api/health

## 🛑 Stop Services

```bash
./stop-app.sh
```

## 🧪 Test API

```bash
./test-api.sh
```

Tests all endpoints and shows results.

## 📋 Manual Startup (Alternative)

### Terminal 1: Database
```bash
docker run -d --name sap-framework-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sapframework \
  -p 5432:5432 postgres:15

# Apply schema
PGPASSWORD=postgres psql -h localhost -U postgres -d sapframework \
  -f infrastructure/database/schema.sql
```

### Terminal 2: Backend API
```bash
cd packages/api
PORT=3001 AUTH_ENABLED=false pnpm dev
```

### Terminal 3: Frontend
```bash
cd packages/web
pnpm dev
```

## 🔧 Configuration

### Dev Mode (Default)
- Authentication: **DISABLED** (auto-login as admin)
- Stub Mode: **ENABLED** (Ariba, SuccessFactors)
- Rate Limiting: **RELAXED**

### Enable Real SAP Connection
Edit `packages/api/.env`:
```bash
# Disable stub mode
ARIBA_STUB_MODE=false
SF_STUB_MODE=false

# Add real SAP credentials
SAP_BASE_URL=https://your-sap-system.com
SAP_CLIENT=100
SAP_CLIENT_ID=your_client_id
SAP_CLIENT_SECRET=your_client_secret
```

### Enable Authentication
Edit `packages/api/.env`:
```bash
AUTH_ENABLED=true
XSUAA_URL=https://your-xsuaa.authentication.sap.hana.ondemand.com
XSUAA_CLIENT_ID=your_client_id
XSUAA_CLIENT_SECRET=your_client_secret
```

## 📱 Available Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | http://localhost:3000 | Main dashboard |
| Admin Panel | http://localhost:3000/admin | Tenant management |
| Tenants | http://localhost:3000/admin/tenants | Tenant list |
| Users | http://localhost:3000/users | User management |
| SoD Analysis | http://localhost:3000/modules/sod | Segregation of Duties |
| Violations | http://localhost:3000/violations | View violations |
| Analytics | http://localhost:3000/analytics | Analytics dashboard |
| Timeline | http://localhost:3000/timeline | Activity timeline |

## 🧪 Test Scenarios

### 1. Create Test Tenant
```bash
curl -X POST http://localhost:3001/api/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme-corp",
    "companyName": "ACME Corporation"
  }'
```

### 2. Run SoD Analysis
```bash
curl -X POST http://localhost:3001/api/modules/sod/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme-corp",
    "fromDate": "2025-01-01",
    "toDate": "2025-12-31"
  }'
```

### 3. Check System Health
```bash
curl http://localhost:3001/api/health
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill

# Kill processes on port 3001
lsof -ti:3001 | xargs kill
```

### Database Connection Failed
```bash
# Restart PostgreSQL
docker restart sap-framework-db

# Check status
docker ps | grep sap-framework-db
```

### Frontend Build Error
```bash
cd packages/web
rm -rf .next node_modules
pnpm install
pnpm dev
```

### API Not Starting
```bash
# Check logs
tail -f logs/api.log

# Check environment
cat packages/api/.env
```

## 📚 Next Steps

1. Read **USER_FLOWS.md** for detailed workflows
2. See **CLAUDE.md** for architecture details
3. Check **IMPLEMENTATION_ROADMAP.md** for features

## 🆘 Support

Contact: ikmal.baharudin@gmail.com
