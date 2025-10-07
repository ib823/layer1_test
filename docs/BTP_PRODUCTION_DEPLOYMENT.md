# SAP BTP Cloud Foundry - Production Deployment Guide

This guide provides step-by-step instructions for deploying the SAP MVP Framework to SAP BTP Cloud Foundry with secure connectivity to S/4HANA Cloud, SAP Ariba, and SAP SuccessFactors.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [BTP Service Setup](#btp-service-setup)
3. [SAP System Configuration](#sap-system-configuration)
4. [Destination Configuration](#destination-configuration)
5. [Application Deployment](#application-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Tools Required

- [Cloud Foundry CLI](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html) v7 or later
- Node.js >=18 <23 (LTS recommended)
- pnpm >=8.0.0
- SAP BTP Subaccount with Cloud Foundry environment enabled
- SAP BTP Global Account Administrator or Space Developer role

### BTP Quotas

Ensure your subaccount has sufficient quotas:
- Application Runtime: 4 GB minimum (2GB API + 512MB App Router + headroom)
- Service Instances: 5+ (xsuaa, destination, postgresql, optional: connectivity, event-mesh)
- Routes: 2 (approuter, api)

---

## BTP Service Setup

### 1. Create PostgreSQL Database Service

```bash
# Create PostgreSQL service instance
cf create-service postgresql-db small sapframework-db

# Wait for service to be ready
cf service sapframework-db
```

**Apply Database Schema:**

```bash
# Set connection details
export DATABASE_URL="postgresql://username:password@host:port/sapframework"

# Apply schema
psql $DATABASE_URL < infrastructure/database/schema.sql
```

### 2. Create XSUAA Service (Authorization & Trust Management)

```bash
# Create XSUAA service with security descriptor
cf create-service xsuaa application sapframework-xsuaa \
  -c infrastructure/cloud-foundry/xs-security.json
```

**Key Configuration** (xs-security.json):
- **Scopes**: Admin, User, Auditor, TenantAdmin, SoDAnalyst, ComplianceOfficer
- **Role Collections**: Pre-defined role collections for easy user assignment
- **OAuth2**: Token validity 1 hour, refresh token 24 hours

### 3. Create Destination Service

```bash
# Create destination service instance
cf create-service destination lite sapframework-destination
```

**Important**: Destinations are configured later in BTP Cockpit (see [Destination Configuration](#destination-configuration)).

### 4. (Optional) Create Connectivity Service

Only required if connecting to on-premises SAP systems via Cloud Connector.

```bash
# Create connectivity service
cf create-service connectivity lite sapframework-connectivity
```

### 5. (Optional) Create Event Mesh Service

For consuming S/4HANA business events (e.g., BusinessPartner.Changed).

```bash
# Create event mesh service
cf create-service enterprise-messaging default sapframework-event-mesh
```

---

## SAP System Configuration

### S/4HANA Cloud (Public)

**Clean-Core Principle**: Use only released APIs listed in [SAP API Business Hub](https://api.sap.com/package/SAPS4HANACloud).

#### 1. Create Communication System

In S/4HANA FLP, navigate to **Communication Management → Communication Systems**:

1. Click **New**
2. System ID: `BTP_GRC_FRAMEWORK`
3. Host Name: `<your-btp-subdomain>.cfapps.sap.hana.ondemand.com`
4. OAuth 2.0 Settings:
   - **OAuth 2.0 Client ID**: Generate or use custom
   - **Client Secret**: Generate and save securely
   - **Authorization Endpoint**: `https://<subdomain>.authentication.sap.hana.ondemand.com/oauth/authorize`
   - **Token Endpoint**: `https://<subdomain>.authentication.sap.hana.ondemand.com/oauth/token`

#### 2. Create Communication User

1. Navigate to **Communication Management → Communication Users**
2. Create user: `BTP_GRC_USER`
3. Assign password (if using Basic auth) or link to Communication System (for OAuth)

#### 3. Create Communication Arrangement

Navigate to **Communication Management → Communication Arrangements**:

**For Business Partner API**:
- **Scenario**: `SAP_COM_0008` (Business Partner, Customer, and Supplier Integration)
- **Arrangement Name**: `BTP_GRC_BUSINESS_PARTNER`
- **Communication System**: `BTP_GRC_FRAMEWORK`
- **Authentication**: OAuth 2.0 (recommended) or Basic

**For User/Role Data (SoD Analysis)**:
- **Scenario**: `SAP_COM_0193` (User and Authorization Management)
- **Arrangement Name**: `BTP_GRC_USER_MGMT`
- **Communication System**: `BTP_GRC_FRAMEWORK`
- **Authentication**: OAuth 2.0

**For Events (Optional)**:
- **Scenario**: `SAP_COM_0092` (Enterprise Event Enablement)
- **Arrangement Name**: `BTP_GRC_EVENTS`
- Configure Event Mesh endpoint in Advanced Settings

#### 4. Test Connection

Use S/4HANA's built-in **Test Connection** feature in Communication Arrangement to verify setup.

---

### SAP SuccessFactors

#### 1. Register OAuth Client

1. Login to **SuccessFactors Admin Center**
2. Navigate to **Company Settings → OAuth2 Client Management**
3. Click **Register Client Application**:
   - **Application Name**: `SAP GRC Framework`
   - **Application URL**: `https://sapframework.cfapps.sap.hana.ondemand.com`
   - **X.509 Certificate**: Upload or generate
   - **API Access**: Select required OData entities (User, Employee, Role, etc.)
   - Note the **Client ID** and **Token URL**

#### 2. Enable OData API Access

1. Navigate to **Manage Permission Roles**
2. Create role: `GRC_Integration_Role`
3. Assign permissions:
   - OData API access
   - Read access to User, Employee, Role entities
4. Assign role to API user

---

### SAP Ariba

#### 1. Get Application Key

1. Login to **Ariba Developer Portal** (developer.ariba.com)
2. Navigate to **My Applications**
3. Create application: `SAP GRC Framework`
4. Select APIs:
   - Procurement APIs (Suppliers, POs, Contracts, Invoices)
   - User Management APIs
5. Copy **Application Key** (apiKey)

#### 2. Register OAuth Client

1. In Developer Portal, navigate to **OAuth Credentials**
2. Generate **Client ID** and **Client Secret**
3. Set **Redirect URI**: `https://sapframework.cfapps.sap.hana.ondemand.com/oauth/callback`
4. Note the **Token Endpoint URL**

---

## Destination Configuration

Configure Destinations in **BTP Cockpit → Connectivity → Destinations**.

### Destination: S4HANA_API

```properties
Name=S4HANA_API
Type=HTTP
URL=https://your-s4hana-instance.s4hana.ondemand.com
ProxyType=Internet
Authentication=OAuth2ClientCredentials

# OAuth Configuration
clientId=<from-s4hana-comm-system>
clientSecret=<from-s4hana-comm-system>
tokenServiceURL=https://your-s4hana-instance.s4hana.ondemand.com/oauth/token

# Additional Properties
HTML5.DynamicDestination=true
WebIDEEnabled=true
WebIDEUsage=odata_gen

# For OData services
sap-client=100
```

**Alternative: OAuth2SAMLBearerAssertion** (for principal propagation)

```properties
Authentication=OAuth2SAMLBearerAssertion
audience=https://your-s4hana-instance.s4hana.ondemand.com
authnContextClassRef=urn:oasis:names:tc:SAML:2.0:ac:classes:X509
clientKey=<your-client-key>
tokenServiceURL=https://your-s4hana-instance.s4hana.ondemand.com/oauth/token
tokenServiceUser=<technical-user>
tokenServicePassword=<technical-password>
```

### Destination: SFSF_API

```properties
Name=SFSF_API
Type=HTTP
URL=https://your-company.successfactors.com
ProxyType=Internet
Authentication=OAuth2ClientCredentials

# OAuth Configuration
clientId=<from-sfsf-oauth-client>
clientSecret=<from-sfsf-oauth-client>
tokenServiceURL=https://your-company.successfactors.com/oauth/token

# Additional Properties
HTML5.DynamicDestination=true
WebIDEEnabled=true
```

### Destination: ARIBA_API

```properties
Name=ARIBA_API
Type=HTTP
URL=https://openapi.ariba.com
ProxyType=Internet
Authentication=OAuth2ClientCredentials

# OAuth Configuration
clientId=<from-ariba-developer-portal>
clientSecret=<from-ariba-developer-portal>
tokenServiceURL=https://api.ariba.com/v2/oauth/token

# Additional Properties
HTML5.DynamicDestination=true

# Ariba-specific headers (as additional properties)
apiKey=<from-ariba-developer-portal>
realm=<your-ariba-realm>
```

**Test Destinations:**

In BTP Cockpit, use **Check Connection** button to verify each destination.

---

## Application Deployment

### 1. Build Application

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build app-router
cd app-router
pnpm install
cd ..
```

### 2. Deploy to Cloud Foundry

```bash
# Login to Cloud Foundry
cf login -a https://api.cf.sap.hana.ondemand.com

# Target your org and space
cf target -o <your-org> -s <your-space>

# Push application
cf push -f infrastructure/cloud-foundry/manifest.yml
```

**Deployment creates:**
- `sapframework-approuter` - App Router (public entry, 256MB, 2 instances)
- `sapframework-api` - Backend API (1GB, 2 instances)

### 3. Assign Role Collections

In BTP Cockpit → Security → Role Collections:

1. **Assign SAP_Framework_Admin** to administrators:
   - Navigate to **Role Collections → SAP_Framework_Admin**
   - Click **Edit**
   - Add users by User ID or Email

2. **Assign other roles** (User, SoDAnalyst, Auditor) to respective users

---

## Post-Deployment Verification

### 1. Check Application Health

```bash
# Check app status
cf apps

# View logs
cf logs sapframework-api --recent
cf logs sapframework-approuter --recent

# Test health endpoint
curl https://sapframework.cfapps.sap.hana.ondemand.com/api/health
```

### 2. Test Capabilities Endpoints

After logging in via App Router, test connectivity to SAP systems:

```bash
# Get auth token (via browser or Postman after login)
TOKEN="<your-jwt-token>"

# Test S/4HANA connectivity
curl -H "Authorization: Bearer $TOKEN" \
  https://sapframework.cfapps.sap.hana.ondemand.com/api/capabilities/s4/apis

# Test SuccessFactors connectivity
curl -H "Authorization: Bearer $TOKEN" \
  https://sapframework.cfapps.sap.hana.ondemand.com/api/capabilities/sfsf/apis

# Test Ariba connectivity
curl -H "Authorization: Bearer $TOKEN" \
  https://sapframework.cfapps.sap.hana.ondemand.com/api/capabilities/ariba/apis

# Test Event Mesh
curl -H "Authorization: Bearer $TOKEN" \
  https://sapframework.cfapps.sap.hana.ondemand.com/api/capabilities/events

# Summary of all systems
curl -H "Authorization: Bearer $TOKEN" \
  https://sapframework.cfapps.sap.hana.ondemand.com/api/capabilities/summary
```

**Expected Response** (S/4HANA example):

```json
{
  "success": true,
  "data": {
    "destination": {
      "name": "S4HANA_API",
      "url": "https://your-s4.s4hana.ondemand.com",
      "authenticationType": "OAuth2ClientCredentials"
    },
    "apis": [
      {
        "name": "API_BUSINESS_PARTNER",
        "status": "available",
        "entitySets": ["A_BusinessPartner", "A_Customer", "A_Supplier"]
      }
    ],
    "connectivity": "success",
    "message": "S/4HANA destination reachable via BTP Destination service"
  }
}
```

### 3. Test End-to-End Workflow

**Tenant Onboarding:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://sapframework.cfapps.sap.hana.ondemand.com/api/admin/tenants \
  -d '{
    "tenantId": "acme-corp",
    "companyName": "ACME Corporation"
  }'
```

**SoD Analysis:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://sapframework.cfapps.sap.hana.ondemand.com/api/modules/sod/analyze \
  -d '{
    "tenantId": "acme-corp"
  }'
```

---

## Troubleshooting

### Issue: "Destination not found"

**Cause**: Destination service not bound or destination not configured.

**Solution**:
1. Verify service binding: `cf services`
2. Check BTP Cockpit → Destinations → Ensure destination exists
3. Verify destination name matches code (e.g., `S4HANA_API`)

### Issue: "OAuth token invalid"

**Cause**: OAuth2 credentials incorrect or Communication Arrangement inactive.

**Solution**:
1. In S/4HANA, verify Communication Arrangement is **Active**
2. Re-generate OAuth client credentials
3. Update Destination in BTP Cockpit with new credentials
4. Restart application: `cf restart sapframework-api`

### Issue: "401 Unauthorized"

**Cause**: User not assigned to role collection.

**Solution**:
1. BTP Cockpit → Security → Role Collections
2. Select appropriate role collection (e.g., `SAP_Framework_User`)
3. Add user by ID or email
4. User may need to logout and login again

### Issue: "503 Service Unavailable" on capabilities endpoint

**Cause**: SAP system not reachable or network issue.

**Solution**:
1. Check SAP system is online
2. Verify Destination `URL` is correct
3. Test connection in BTP Cockpit → Destinations → Check Connection
4. Review application logs: `cf logs sapframework-api --recent`

### Issue: "Circuit breaker open" in logs

**Cause**: SAP system returning errors, circuit breaker activated.

**Solution**:
1. Check SAP system health
2. Review recent API changes in SAP system
3. Wait 60 seconds for circuit breaker reset
4. If persistent, check Communication Arrangement status

---

## Blue-Green Deployment

For zero-downtime updates:

```bash
# Deploy to new version (green)
cf push sapframework-api-green -f manifest.yml

# Test green instance
curl https://sapframework-api-green.cfapps.sap.hana.ondemand.com/api/health

# Switch routes (blue → green)
cf map-route sapframework-api-green cfapps.sap.hana.ondemand.com --hostname sapframework-api
cf unmap-route sapframework-api cfapps.sap.hana.ondemand.com --hostname sapframework-api

# Delete old blue instance
cf delete sapframework-api -f
cf rename sapframework-api-green sapframework-api
```

---

## Security Checklist

- [x] XSUAA authentication enabled (`AUTH_ENABLED=true`)
- [x] All secrets in BTP services (never in code/env)
- [x] Role-based access control configured
- [x] App Router enforces authentication on all routes (except /health)
- [x] Destination service manages credentials (no hardcoded URLs)
- [x] OAuth2 used for all SAP system connections
- [x] Structured JSON logging enabled (no PII in logs)
- [x] HTTPS only (Cloud Foundry enforces TLS)
- [x] Rate limiting enabled
- [x] CSRF protection enabled (in App Router)

---

## Monitoring & Operations

### View Application Logs

```bash
# Real-time logs
cf logs sapframework-api

# Recent logs
cf logs sapframework-api --recent

# Filter by log level
cf logs sapframework-api | grep ERROR
```

### Scale Application

```bash
# Horizontal scaling
cf scale sapframework-api -i 4

# Vertical scaling
cf scale sapframework-api -m 2G
```

### Check Service Health

```bash
# Service instances
cf services

# Service key (for external tools)
cf create-service-key sapframework-db db-key
cf service-key sapframework-db db-key
```

---

## Production-Ready Acceptance Criteria

✅ **Runtime & Hygiene**
- [x] Node.js >=18 <23
- [x] /healthz endpoint
- [x] Structured JSON logs
- [x] No secrets in repo

✅ **BTP Services**
- [x] XSUAA bound
- [x] Destination service bound
- [x] PostgreSQL bound
- [x] App Router configured

✅ **Authentication**
- [x] XSUAA JWT validation
- [x] Role-based access control
- [x] Scopes and role collections defined

✅ **Connectivity**
- [x] Destination service for all external calls
- [x] S/4HANA OAuth2ClientCredentials
- [x] SuccessFactors OAuth2
- [x] Ariba OAuth2 + APIKey

✅ **Capabilities**
- [x] /api/capabilities/s4/apis
- [x] /api/capabilities/sfsf/apis
- [x] /api/capabilities/ariba/apis
- [x] /api/capabilities/events
- [x] /api/capabilities/summary

✅ **Operations**
- [x] Blue-green deployment ready
- [x] Health monitoring
- [x] Structured logging

---

## Next Steps

1. **Enable Event Mesh**: Configure S/4HANA event channels for real-time event processing
2. **Add Rate Limiting with Redis**: Scale rate limiting across instances
3. **Implement Audit Logging**: Track all admin actions for compliance
4. **Set up Alerts**: Configure BTP Alerting for production monitoring
5. **Document Runbook**: Create operational runbook for support team

---

## References

- [SAP Cloud SDK Documentation](https://sap.github.io/cloud-sdk/)
- [SAP BTP Cloud Foundry Docs](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/9c7092c7b7ae4d49bc8ae35fdd0e0b18.html)
- [App Router Documentation](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/01c5f9ba7d6847aaaf069d153b981b51.html)
- [Destination Service](https://help.sap.com/docs/CP_CONNECTIVITY/cca91383641e40ffbe03bdc78f00f681/7e306250e08340f89d6c103e28840f30.html)
- [S/4HANA Cloud Communication Management](https://help.sap.com/docs/SAP_S4HANA_CLOUD/0f69f8fb28ac4bf48d2b57b9637e81fa/2e84a10c430645a88bdbfaaa23ac9ff7.html)

---

**Contact**: ikmal.baharudin@gmail.com
**Last Updated**: 2025-10-07
