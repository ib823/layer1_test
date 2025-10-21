# Authentication Setup Guide - SAP MVP Framework

## Overview

The SAP MVP Framework uses **SAP XSUAA (Extended Services for User Account and Authentication)** for production authentication in SAP Business Technology Platform (BTP) environments, with a development mode fallback for local testing.

## Authentication Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Client Application                     │
│              (Web UI, Mobile, API Client)               │
└────────────────┬────────────────────────────────────────┘
                 │ Bearer <JWT Token>
                 ▼
┌─────────────────────────────────────────────────────────┐
│              SAP MVP Framework API                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  1. Extract JWT from Authorization header          │ │
│  │  2. Validate with XSUAA (production)               │ │
│  │     OR                                              │ │
│  │     Simple validation (development)                │ │
│  │  3. Extract user claims (id, email, roles, tenant) │ │
│  │  4. Attach to req.user                             │ │
│  │  5. Authorize based on roles                       │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│         SAP XSUAA Service (BTP Production)              │
│   • Issues JWT tokens                                   │
│   • Manages role collections                            │
│   • Handles token validation                            │
│   • Multi-tenant support                                │
└─────────────────────────────────────────────────────────┘
```

---

## Production Setup (SAP BTP with XSUAA)

### Prerequisites

1. **SAP BTP Global Account** with entitlements for:
   - Cloud Foundry Runtime
   - XSUAA Application Plan
   - Identity Authentication Service (IAS) - optional but recommended

2. **Cloud Foundry CLI** installed:
   ```bash
   cf --version  # Should be 8.0.0 or higher
   ```

3. **CF Logged in** to your BTP subaccount:
   ```bash
   cf login -a https://api.cf.eu10.hana.ondemand.com
   ```

---

### Step 1: Create XSUAA Service Instance

Create an `xs-security.json` file defining your application's security configuration:

**File: `xs-security.json`**
```json
{
  "xsappname": "sap-mvp-framework",
  "tenant-mode": "shared",
  "description": "SAP MVP Framework XSUAA Configuration",
  "scopes": [
    {
      "name": "$XSAPPNAME.TenantAdmin",
      "description": "Full tenant administration access"
    },
    {
      "name": "$XSAPPNAME.ModuleManager",
      "description": "Module activation and configuration"
    },
    {
      "name": "$XSAPPNAME.Auditor",
      "description": "Read-only access to audit logs and reports"
    },
    {
      "name": "$XSAPPNAME.User",
      "description": "Standard user access"
    }
  ],
  "role-templates": [
    {
      "name": "TenantAdministrator",
      "description": "Tenant Admin Role",
      "scope-references": [
        "$XSAPPNAME.TenantAdmin",
        "$XSAPPNAME.ModuleManager",
        "$XSAPPNAME.Auditor",
        "$XSAPPNAME.User"
      ]
    },
    {
      "name": "ModuleManager",
      "description": "Module Manager Role",
      "scope-references": [
        "$XSAPPNAME.ModuleManager",
        "$XSAPPNAME.User"
      ]
    },
    {
      "name": "Auditor",
      "description": "Auditor Role",
      "scope-references": [
        "$XSAPPNAME.Auditor",
        "$XSAPPNAME.User"
      ]
    },
    {
      "name": "User",
      "description": "Basic User Role",
      "scope-references": [
        "$XSAPPNAME.User"
      ]
    }
  ],
  "role-collections": [
    {
      "name": "SAP_MVP_Framework_Admin",
      "description": "Administrator role collection for SAP MVP Framework",
      "role-template-references": [
        "$XSAPPNAME.TenantAdministrator"
      ]
    },
    {
      "name": "SAP_MVP_Framework_Module_Manager",
      "description": "Module manager role collection",
      "role-template-references": [
        "$XSAPPNAME.ModuleManager"
      ]
    },
    {
      "name": "SAP_MVP_Framework_Auditor",
      "description": "Auditor role collection (read-only)",
      "role-template-references": [
        "$XSAPPNAME.Auditor"
      ]
    }
  ],
  "oauth2-configuration": {
    "redirect-uris": [
      "https://*.cfapps.eu10.hana.ondemand.com/**",
      "http://localhost:3000/**",
      "http://localhost:3001/**"
    ],
    "grant-types": [
      "authorization_code",
      "client_credentials",
      "refresh_token"
    ],
    "token-validity": 3600,
    "refresh-token-validity": 86400
  }
}
```

**Create the service instance:**
```bash
cf create-service xsuaa application sap-mvp-framework-xsuaa -c xs-security.json
```

**Verify creation:**
```bash
cf service sap-mvp-framework-xsuaa
```

---

### Step 2: Bind XSUAA Service to Your Application

**Option A: Via `manifest.yml`**
```yaml
---
applications:
  - name: sap-mvp-framework-api
    memory: 512M
    instances: 2
    buildpacks:
      - nodejs_buildpack
    services:
      - sap-mvp-framework-xsuaa
      - sap-mvp-framework-db
    env:
      NODE_ENV: production
      AUTH_ENABLED: true
```

**Option B: Manual binding**
```bash
cf bind-service sap-mvp-framework-api sap-mvp-framework-xsuaa
cf restage sap-mvp-framework-api
```

---

### Step 3: Configure Identity Provider (IDP) Trust

**Option A: Use SAP Identity Authentication Service (IAS)**

1. Navigate to **BTP Cockpit → Security → Trust Configuration**
2. Click **Establish Trust** for SAP Identity Authentication Service
3. Enter your IAS tenant URL (e.g., `https://your-tenant.accounts.ondemand.com`)
4. Complete the trust setup wizard

**Option B: Use Custom SAML 2.0 IDP (Azure AD, Okta, etc.)**

1. **Export XSUAA SAML Metadata:**
   ```bash
   cf env sap-mvp-framework-api | grep 'uaa'
   # Extract the UAA URL (e.g., https://your-subaccount.authentication.eu10.hana.ondemand.com)
   ```

2. **Download SAML Metadata:**
   ```bash
   curl https://your-subaccount.authentication.eu10.hana.ondemand.com/saml/metadata > xsuaa-metadata.xml
   ```

3. **Configure in your IDP:**
   - Azure AD: Enterprise Applications → New Application → SAML SSO
   - Okta: Applications → Create App Integration → SAML 2.0
   - Import the `xsuaa-metadata.xml` file

4. **Configure attribute mappings:**
   ```
   name_id      → email or user principal name
   given_name   → first name
   family_name  → last name
   email        → email address
   ```

5. **Download IDP SAML Metadata** and upload to BTP Trust Configuration

---

### Step 4: Assign Role Collections to Users

1. **Navigate to BTP Cockpit → Security → Users**

2. **Assign role collections:**
   - Select a user
   - Click **Assign Role Collection**
   - Select one of:
     - `SAP_MVP_Framework_Admin` (full access)
     - `SAP_MVP_Framework_Module_Manager` (module management)
     - `SAP_MVP_Framework_Auditor` (read-only)

---

### Step 5: Configure Application Environment Variables

When your app is bound to XSUAA, the following environment is automatically injected via `VCAP_SERVICES`:

```json
{
  "xsuaa": [{
    "name": "sap-mvp-framework-xsuaa",
    "credentials": {
      "uaadomain": "authentication.eu10.hana.ondemand.com",
      "url": "https://your-subaccount.authentication.eu10.hana.ondemand.com",
      "clientid": "sb-sap-mvp-framework!t12345",
      "clientsecret": "xxxxxxxxxxxxxxxxxx",
      "xsappname": "sap-mvp-framework!t12345",
      "verificationkey": "-----BEGIN PUBLIC KEY-----\n...",
      "apiurl": "https://api.authentication.eu10.hana.ondemand.com"
    }
  }]
}
```

**The framework automatically reads this configuration** - no manual setup needed!

---

## Development Setup (Local Testing)

### Option 1: Auth Disabled (Quick Start)

**`.env` file:**
```bash
AUTH_ENABLED=false
NODE_ENV=development
```

**Result:** All requests are authenticated as a fake dev user:
```javascript
{
  id: 'dev-user',
  email: 'dev@example.com',
  roles: ['admin'],
  tenantId: 'dev-tenant'
}
```

⚠️ **WARNING:** Never use this in production!

---

### Option 2: JWT Tokens (Local Testing with Auth)

**`.env` file:**
```bash
AUTH_ENABLED=true
NODE_ENV=development
JWT_SECRET=your-dev-secret-key
```

**Create a test JWT token:**

Use this Node.js script to generate test tokens:

**File: `scripts/generate-test-token.js`**
```javascript
const jwt = require('jsonwebtoken');

const payload = {
  sub: 'test-user-123',
  email: 'test@example.com',
  user_name: 'test@example.com',
  roles: ['admin', 'TenantAdmin'],
  scope: ['TenantAdmin', 'ModuleManager', 'User'],
  zid: 'test-tenant-001',
  tenant_id: 'test-tenant-001',
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
  iss: 'http://localhost:3000',
};

const token = jwt.sign(payload, 'your-dev-secret-key', {
  algorithm: 'HS256'
});

console.log('Test JWT Token:');
console.log(token);
console.log('\nUse in requests:');
console.log(`Authorization: Bearer ${token}`);
```

**Generate token:**
```bash
node scripts/generate-test-token.js
```

**Test API call:**
```bash
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:3000/api/admin/tenants
```

---

## Testing Authentication

### 1. Test Health Endpoint (No Auth Required)

```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-08T01:00:00.000Z",
    "uptime": 123.456
  }
}
```

---

### 2. Test Authenticated Endpoint (Dev Mode - Auth Disabled)

**`.env`:**
```bash
AUTH_ENABLED=false
```

```bash
curl http://localhost:3000/api/admin/tenants
```

**Expected:** Returns tenant list (auto-authenticated as dev user)

---

### 3. Test Authenticated Endpoint (Dev Mode - Auth Enabled with JWT)

**`.env`:**
```bash
AUTH_ENABLED=true
```

**Without token (should fail):**
```bash
curl http://localhost:3000/api/admin/tenants
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "message": "Missing or invalid authorization token",
    "code": "UNAUTHORIZED"
  }
}
```

**With valid token:**
```bash
TOKEN="<your-generated-token>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/tenants
```

**Expected:** Returns tenant list

---

### 4. Test XSUAA Token (Production/Staging)

**Get XSUAA token via OAuth Client Credentials flow:**

```bash
# Extract XSUAA credentials
cf env sap-mvp-framework-api | jq '.VCAP_SERVICES.xsuaa[0].credentials'

# Get token
XSUAA_URL="https://your-subaccount.authentication.eu10.hana.ondemand.com"
CLIENT_ID="sb-sap-mvp-framework!t12345"
CLIENT_SECRET="xxxxxxxxxxxxx"

curl -X POST "$XSUAA_URL/oauth/token" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  -d "response_type=token"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsIn...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Use token:**
```bash
curl -H "Authorization: Bearer <access_token>" \
  https://sap-mvp-framework-api.cfapps.eu10.hana.ondemand.com/api/admin/tenants
```

---

## Role-Based Access Control (RBAC)

### Roles Hierarchy

```
┌─────────────────────────────────────────────────┐
│          TenantAdmin (Full Access)              │
│  • All module operations                        │
│  • User management                              │
│  • Tenant configuration                         │
│  • Audit log access                             │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────────┐  ┌─────────────────────┐
│  ModuleManager   │  │      Auditor        │
│  • Module config │  │  • Read audit logs  │
│  • Module exec   │  │  • Generate reports │
└──────────────────┘  └─────────────────────┘
        │
        ▼
┌──────────────────┐
│       User       │
│  • Read access   │
│  • Execute perms │
└──────────────────┘
```

### Code Example: Protect an Endpoint

```typescript
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public endpoint (authenticated users)
router.get('/modules', (req, res) => {
  // All authenticated users can list modules
});

// Admin-only endpoint
router.post('/modules/:id/activate', requireRole('admin'), (req, res) => {
  // Only admins can activate modules
});

// Module manager endpoint
router.put('/modules/:id/config', requireRole('ModuleManager'), (req, res) => {
  // ModuleManagers and admins can update config
});
```

---

## Troubleshooting

### Issue: "Missing or invalid authorization token"

**Cause:** No Authorization header or malformed header

**Solution:**
```bash
# Correct format
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/...

# NOT: "Authorization: <token>"
# NOT: "Bearer <token>"
```

---

### Issue: "XSUAA validation failed"

**Cause:** Token is invalid, expired, or XSUAA service unavailable

**Debug steps:**
1. Check token expiration:
   ```bash
   # Decode JWT (paste token at jwt.io)
   ```

2. Verify XSUAA service binding:
   ```bash
   cf env sap-mvp-framework-api | grep xsuaa
   ```

3. Check app logs:
   ```bash
   cf logs sap-mvp-framework-api --recent | grep -i xsuaa
   ```

---

### Issue: "Requires role: admin" (403 Forbidden)

**Cause:** User doesn't have required role collection

**Solution:**
1. Go to BTP Cockpit → Security → Users
2. Select the user
3. Assign `SAP_MVP_Framework_Admin` role collection
4. Wait 5-10 minutes for propagation
5. Get a new token (old tokens won't have updated roles)

---

### Issue: Auth works in dev but fails in production

**Checklist:**
- ✅ `AUTH_ENABLED=true` in production env
- ✅ XSUAA service is bound to app
- ✅ `cf restage` performed after service binding
- ✅ IDP trust is configured
- ✅ User has assigned role collections
- ✅ Token is obtained from XSUAA, not hardcoded

---

## Security Best Practices

### ✅ DO

1. **Always enable auth in production:**
   ```bash
   AUTH_ENABLED=true
   ```

2. **Use XSUAA in BTP:**
   - Full JWT signature validation
   - Multi-tenant support
   - Integration with SAP IAS

3. **Rotate secrets regularly:**
   ```bash
   # Update XSUAA client secret every 90 days
   cf update-service sap-mvp-framework-xsuaa -c new-xs-security.json
   ```

4. **Use HTTPS only:**
   - All production endpoints must use `https://`
   - Redirect HTTP → HTTPS

5. **Implement proper CORS:**
   ```bash
   CORS_ORIGIN=https://your-production-domain.com
   ```

6. **Log authentication failures:**
   - Monitor for brute force attacks
   - Alert on unusual patterns

---

### ❌ DON'T

1. **Never commit secrets to Git:**
   - Use `.env.local` (gitignored)
   - Use BTP service bindings for production

2. **Never disable auth in production:**
   ```bash
   # WRONG:
   AUTH_ENABLED=false  # Production = disaster!
   ```

3. **Never use dev JWT tokens in production:**
   - Dev tokens have weak signatures
   - No proper validation

4. **Never expose XSUAA credentials:**
   - Keep `XSUAA_CLIENT_SECRET` encrypted
   - Rotate if exposed

5. **Never skip role checks on sensitive operations:**
   ```typescript
   // WRONG:
   router.delete('/admin/tenants/:id', async (req, res) => {
     // Missing requireRole('admin')!
   });

   // CORRECT:
   router.delete('/admin/tenants/:id', requireRole('admin'), async (req, res) => {
     // ...
   });
   ```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_ENABLED` | No | `true` | Enable/disable authentication |
| `NODE_ENV` | No | `development` | Environment (production/development) |
| `XSUAA_URL` | Production | - | XSUAA token endpoint URL |
| `XSUAA_CLIENT_ID` | Production | - | OAuth client ID |
| `XSUAA_CLIENT_SECRET` | Production | - | OAuth client secret |
| `JWT_SECRET` | Dev only | - | Secret for dev JWT validation |
| `CORS_ORIGIN` | Yes | `*` | Allowed CORS origin |

---

## Additional Resources

- [SAP XSUAA Documentation](https://help.sap.com/docs/btp/sap-business-technology-platform/authorization-and-trust-management-in-cloud-foundry-environment)
- [SAP Cloud SDK - Authentication](https://sap.github.io/cloud-sdk/docs/js/features/connectivity/destinations#authentication-types)
- [JWT.io](https://jwt.io) - JWT debugger
- [OAuth 2.0 Spec](https://oauth.net/2/)

---

**Last Updated:** 2025-10-08
**Version:** 1.0.0
