# SAP MVP Framework - User Flows & Testing Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│                     http://localhost:3000                        │
│  - Dashboard, Reports, Admin Panel, SoD Analysis, Monitoring    │
└────────────────────┬────────────────────────────────────────────┘
                     │ REST API calls
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (Express)                       │
│                     http://localhost:3001                        │
│  - Authentication, Rate Limiting, Business Logic                │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ↓            ↓             ↓
   PostgreSQL    SAP Systems   Redis (Cache)
   (Database)    (via Connectors)

```

---

## 🌐 URLs and Access

### Local Development URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend Dashboard** | http://localhost:3000 | Main user interface |
| **Backend API** | http://localhost:3001/api | REST API endpoints |
| **API Health Check** | http://localhost:3001/api/health | System status |
| **API Documentation** | http://localhost:3001/api/version | API version info |

### Starting the Application

```bash
# Terminal 1: Start Backend API
cd /workspaces/layer1_test/packages/api
PORT=3001 pnpm dev

# Terminal 2: Start Frontend Dashboard
cd /workspaces/layer1_test/packages/web
pnpm dev

# Terminal 3: Start PostgreSQL (if not running)
docker run -d --name sap-framework-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sapframework \
  -p 5432:5432 postgres:15
```

---

## 👤 End User Flow (GRC Analyst / Auditor)

### 1. **Login & Dashboard**
- **URL:** `http://localhost:3000`
- **Authentication:** XSUAA JWT (or dev mode: auto-login)
- **View:**
  - Tenant dashboard
  - Active modules (SoD Analysis, Invoice Matching, Anomaly Detection)
  - Recent violations
  - Risk score metrics

### 2. **SoD (Segregation of Duties) Analysis**

#### Flow:
```
http://localhost:3000/modules/sod
  ↓
[Select Analysis Parameters]
  - Date range
  - Risk level filter
  ↓
[Run Analysis] → API: POST /api/modules/sod/analyze
  ↓
[View Results]
  - List of violations
  - User role conflicts
  - Risk scores
  ↓
[Export Report] → Download CSV/PDF
```

#### API Endpoints Used:
- `GET /api/modules/sod` - List previous analyses
- `POST /api/modules/sod/analyze` - Run new analysis
- `GET /api/modules/sod/:runId/violations` - Get violations
- `GET /api/modules/sod/:runId/export` - Export CSV

### 3. **Invoice Matching Review**

#### Flow:
```
http://localhost:3000/matching
  ↓
[View Pending Invoices]
  - Three-way match results (PO-GR-Invoice)
  - Tolerance violations
  - Fraud alerts
  ↓
[Review Individual Invoice] → API: GET /api/matching/invoice/:id
  ↓
[Approve/Reject/Flag for Review]
  ↓
[View Vendor Patterns] → Analyze payment patterns
```

#### API Endpoints Used:
- `GET /api/matching/analysis` - List analyses
- `POST /api/matching/analyze` - Run matching analysis
- `GET /api/matching/invoice/:id` - Get invoice details
- `POST /api/matching/invoice/:id/approve` - Approve invoice
- `GET /api/matching/vendor-patterns` - Vendor analysis

### 4. **GL Anomaly Detection**

#### Flow:
```
http://localhost:3000/anomalies
  ↓
[Select GL Accounts & Period]
  - Fiscal year
  - GL account ranges
  ↓
[Run Detection] → API: POST /api/analytics/anomalies/detect
  ↓
[View Anomalies]
  - Benford's Law violations
  - Statistical outliers
  - After-hours postings
  - Weekend postings
  - Duplicate entries
  ↓
[Investigate & Mark Status]
  - Open → Investigating → Confirmed/False Positive
```

#### API Endpoints Used:
- `POST /api/analytics/anomalies/detect` - Detect anomalies
- `GET /api/analytics/anomalies` - List detected anomalies
- `GET /api/analytics/gl-accounts/:account/risk-profile` - Account risk
- `PUT /api/analytics/anomalies/:id/status` - Update status

### 5. **Monitoring & Alerts**

#### Flow:
```
http://localhost:3000/monitoring
  ↓
[Real-time Dashboard]
  - System health
  - Active analyses
  - Recent violations
  ↓
[Alert Configuration]
  - Email notifications
  - Thresholds
  - Recipients
```

#### API Endpoints Used:
- `GET /api/monitoring/health` - System health
- `GET /api/monitoring/metrics` - Performance metrics
- `GET /api/monitoring/alerts` - Active alerts

---

## 👨‍💼 Admin Flow (System Administrator)

### 1. **Admin Dashboard**
- **URL:** `http://localhost:3000/admin`
- **Role Required:** `admin`
- **View:**
  - All tenants
  - System configuration
  - User management
  - Module activation status

### 2. **Tenant Onboarding**

#### Flow:
```
http://localhost:3000/admin/tenants
  ↓
[Create New Tenant]
  ↓
POST /api/admin/tenants
  - Tenant ID
  - Company name
  - SAP credentials
  ↓
[Service Discovery] → POST /api/admin/tenants/:id/discover
  ↓
Automatically:
  1. Scan SAP Gateway catalog
  2. Test service permissions
  3. Generate capability profile
  4. Activate compatible modules
  ↓
[View Tenant Profile]
  - Available services
  - Active modules
  - Missing services
  - Recommendations
```

#### API Endpoints Used:
- `GET /api/admin/tenants` - List all tenants
- `POST /api/admin/tenants` - Create tenant
- `GET /api/admin/tenants/:id` - Get tenant details
- `POST /api/admin/tenants/:id/discover` - Run service discovery
- `GET /api/admin/tenants/:id/profile` - Get capability profile
- `POST /api/admin/tenants/:id/modules/:module/activate` - Activate module
- `DELETE /api/admin/tenants/:id/modules/:module` - Deactivate module

### 3. **Module Management**

#### Flow:
```
http://localhost:3000/admin/modules
  ↓
[View Available Modules]
  - SoD Analysis
  - Invoice Matching
  - GL Anomaly Detection
  - Vendor Data Quality
  ↓
[Check Module Requirements]
  For SoD Analysis:
    ✓ API_USER_SRV
    ✓ API_ROLE_SRV
    ✓ API_AUTHORIZATION_OBJ_SRV
  ↓
[Activate/Deactivate per Tenant]
```

### 4. **System Configuration**

#### Flow:
```
http://localhost:3000/admin/settings
  ↓
[Configure System]
  - Authentication (XSUAA)
  - Rate limiting
  - Feature flags
  - Encryption keys
  - Database settings
  ↓
[Save Configuration]
```

#### API Endpoints Used:
- `GET /api/admin/config` - Get system config
- `PUT /api/admin/config` - Update config
- `GET /api/admin/feature-flags` - Get feature flags
- `PUT /api/admin/feature-flags` - Update flags

### 5. **User Management**

#### Flow:
```
http://localhost:3000/admin/users
  ↓
[List All Users]
  - Filter by tenant
  - Filter by role
  ↓
[Create/Edit User]
  - Assign roles (admin, analyst, auditor, viewer)
  - Set tenant access
  - Configure permissions
  ↓
[Audit User Activity]
  - Login history
  - API usage
  - Report access
```

#### API Endpoints Used:
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/users/:id/activity` - User activity log

### 6. **Monitoring & Maintenance**

#### Flow:
```
http://localhost:3000/admin/system
  ↓
[System Health]
  - Database status
  - SAP connection status
  - Redis cache status
  - API performance metrics
  ↓
[Maintenance Tasks]
  - Clear cache
  - Rotate encryption keys
  - Database vacuum
  - Log management
  ↓
[Data Retention]
  - Configure retention policies
  - Delete old analyses
  - Archive violations
```

#### API Endpoints Used:
- `GET /api/monitoring/health` - System health
- `GET /api/monitoring/connections` - Check SAP connections
- `POST /api/admin/maintenance/clear-cache` - Clear cache
- `POST /api/admin/maintenance/vacuum-db` - Database maintenance
- `GET /api/analytics/usage` - Usage statistics

---

## 🔐 Authentication & Authorization

### Development Mode (AUTH_ENABLED=false)
```bash
# .env
AUTH_ENABLED=false

# Auto-creates dev user:
{
  id: 'dev-user',
  email: 'dev@example.com',
  roles: ['admin'],
  tenantId: 'dev-tenant'
}
```

### Production Mode (XSUAA)
```bash
# .env
AUTH_ENABLED=true
XSUAA_URL=https://your-xsuaa.authentication.sap.hana.ondemand.com
XSUAA_CLIENT_ID=your_client_id
XSUAA_CLIENT_SECRET=your_client_secret
```

**Flow:**
1. User navigates to frontend
2. Frontend redirects to XSUAA login
3. User authenticates
4. XSUAA returns JWT token
5. Frontend stores token
6. All API calls include: `Authorization: Bearer <token>`
7. Backend validates JWT signature + claims

---

## 🔑 Role-Based Access Control

| Role | Access |
|------|--------|
| **Admin** | Full system access, tenant management, configuration |
| **Analyst** | Run analyses, view violations, export reports |
| **Auditor** | View-only access to all reports and analyses |
| **Viewer** | Limited read-only access to dashboard |

---

## 🧪 Testing Scenarios

### Scenario 1: Run SoD Analysis (End User)
```bash
# 1. Start services
cd packages/api && PORT=3001 pnpm dev &
cd packages/web && pnpm dev &

# 2. Navigate to:
http://localhost:3000/modules/sod

# 3. Click "Run New Analysis"
# 4. Select date range
# 5. Click "Analyze"
# 6. Wait for results
# 7. Export CSV report
```

### Scenario 2: Onboard New Tenant (Admin)
```bash
# 1. Navigate to:
http://localhost:3000/admin/tenants

# 2. Click "Add New Tenant"
# 3. Enter:
   - Tenant ID: acme-corp
   - Company: ACME Corporation
   - SAP Base URL: https://sap-system.com
   - Credentials

# 4. Click "Save"
# 5. Click "Run Service Discovery"
# 6. Wait for scan to complete
# 7. View capability profile
# 8. Activate available modules
```

### Scenario 3: Review Invoice Matching (End User)
```bash
# 1. Navigate to:
http://localhost:3000/matching

# 2. View pending invoices
# 3. Click on invoice with tolerance violation
# 4. Review:
   - PO details
   - GR details
   - Invoice details
   - Discrepancies
   - Fraud alerts
# 5. Approve or flag for review
```

### Scenario 4: Detect GL Anomalies (End User)
```bash
# 1. Navigate to:
http://localhost:3000/anomalies

# 2. Select:
   - Fiscal Year: 2025
   - GL Accounts: 100000-199999
   - Period: 10

# 3. Click "Detect Anomalies"
# 4. Review results:
   - Benford's Law violations
   - Statistical outliers
   - After-hours postings
   - Duplicates
# 5. Investigate critical anomalies
# 6. Mark status (Confirmed/False Positive)
```

---

## 📊 Sample API Calls

### Check API Health
```bash
curl http://localhost:3001/api/health
```

### Get Tenant List (Admin)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/admin/tenants
```

### Run SoD Analysis
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme-corp",
    "fromDate": "2025-01-01",
    "toDate": "2025-12-31"
  }' \
  http://localhost:3001/api/modules/sod/analyze
```

### Detect Anomalies
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme-corp",
    "fiscalYear": "2025",
    "fiscalPeriod": "10",
    "glAccounts": ["100000", "110000", "120000"]
  }' \
  http://localhost:3001/api/analytics/anomalies/detect
```

---

## 🐛 Troubleshooting

### Frontend won't start
```bash
cd packages/web
rm -rf .next node_modules
pnpm install
pnpm dev
```

### API returns 401 Unauthorized
```bash
# Check AUTH_ENABLED setting
cat packages/api/.env | grep AUTH_ENABLED

# If testing, disable auth:
echo "AUTH_ENABLED=false" >> packages/api/.env
```

### Database connection failed
```bash
# Check PostgreSQL is running
psql sapframework -c "SELECT 1"

# Restart database
docker restart sap-framework-db

# Check DATABASE_URL
echo $DATABASE_URL
```

### Rate limit errors
```bash
# Check Redis is running (optional)
docker run -d --name redis -p 6379:6379 redis:7

# Or disable rate limiting in dev:
# packages/api/src/config.ts
# rateLimiting.enabled = false
```

---

## 📚 Additional Resources

- **API Documentation:** `docs/API_REFERENCE.md`
- **Architecture Guide:** `docs/ARCHITECTURE.md`
- **Deployment Guide:** `docs/BTP_DEPLOYMENT.md`
- **Testing Guide:** `docs/E2E_TESTING_GUIDE.md`

---

**Last Updated:** 2025-10-07
**Author:** ikmal.baharudin@gmail.com
