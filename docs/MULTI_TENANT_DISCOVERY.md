# Multi-Tenant SAP Discovery & Scanning

## Overview

The framework automatically discovers and scans SAP APIs for each tenant during onboarding. Each tenant has a unique capability profile based on what their SAP system exposes.

## Architecture
┌─────────────────────────────────────────────────────────────┐
│                    TENANT ONBOARDING FLOW                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Tenant provides SAP connection details                  │
│     └─> baseUrl, client, auth credentials                   │
│                                                              │
│  2. Framework creates connector                             │
│     └─> S4HANAConnector, IPSConnector, etc.                │
│                                                              │
│  3. ServiceDiscovery.discoverServices()                     │
│     ├─> Query: /iwfnd/catalogservice;v=2/ServiceCollection │
│     ├─> Parse: All activated OData services                │
│     ├─> Test: Permission for each service                  │
│     └─> Return: Available services list                    │
│                                                              │
│  4. Framework assesses capabilities                         │
│     ├─> canDoSoD? (needs USER + ROLE services)            │
│     ├─> canDoInvoiceMatching? (needs PO service)          │
│     └─> canDoAnomalyDetection? (needs GL service)         │
│                                                              │
│  5. Store tenant profile in database                        │
│     ├─> tenantId: unique identifier                        │
│     ├─> availableServices: list of APIs                    │
│     ├─> capabilities: which modules work                   │
│     └─> missingServices: what needs activation            │
│                                                              │
│  6. Enable only supported modules                           │
│     └─> Disable modules where services are missing         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

## Tenant-Specific Capabilities

### Example: Manufacturing Company
```yaml
Tenant_A:
  Available_APIs:
    - API_USER_SRV ✅
    - API_ROLE_SRV ✅
    - API_PURCHASEORDER_SRV ✅
    - API_MATERIAL_SRV ✅
  
  Enabled_Modules:
    - SoD Analysis ✅
    - Invoice Matching ✅
    - Inventory Optimization ✅
  
  Disabled_Modules:
    - Expense Anomaly Detection ❌ (missing GL service)
Example: Consulting Firm
yamlTenant_B:
  Available_APIs:
    - API_USER_SRV ✅
    - API_ROLE_SRV ✅
    - API_GLACCOUNTLINEITEM_SRV ✅
    - CUSTOM_TIMESHEET_SRV ✅
  
  Enabled_Modules:
    - SoD Analysis ✅
    - Expense Anomaly Detection ✅
  
  Disabled_Modules:
    - Invoice Matching ❌ (no purchasing)
    - Inventory Optimization ❌ (no materials)
Continuous Monitoring
typescript// Framework polls for service changes
setInterval(async () => {
  const discovery = new ServiceDiscovery(connector);
  const result = await discovery.discoverServices();
  
  // Detect newly activated services
  const newServices = result.services.filter(
    svc => !previousServices.includes(svc.technicalName)
  );
  
  if (newServices.length > 0) {
    console.log('New services detected:', newServices);
    // Auto-enable newly possible modules
    await enableAdditionalModules(newServices);
  }
}, 24 * 60 * 60 * 1000); // Check daily
Data Isolation Per Tenant
yamlDatabase_Schema:
  - tenant_xyz:
      - discovered_services
      - capability_profile
      - module_activations
      - scan_history
  
  - tenant_abc:
      - discovered_services
      - capability_profile
      - module_activations
      - scan_history
No cross-tenant data access. Each tenant's discovery results are isolated.

---

## **What You Can Do Now**
```bash
# 1. Test the discovery (mock example - won't actually connect)
# This shows the API structure
code packages/core/src/examples/tenant-onboarding.example.ts

# 2. Write integration tests
code packages/core/tests/integration/ServiceDiscovery.integration.test.ts
Integration test template:
typescriptimport { S4HANAConnector } from '../../src/connectors/s4hana';
import { ServiceDiscovery } from '../../src/connectors/base/ServiceDiscovery';

describe('ServiceDiscovery Integration', () => {
  it('should discover services from SAP Gateway', async () => {
    // Skip if no SAP connection available
    if (!process.env.SAP_BASE_URL) {
      console.log('Skipping: No SAP_BASE_URL configured');
      return;
    }

    const connector = new S4HANAConnector({
      baseUrl: process.env.SAP_BASE_URL,
      auth: {
        type: 'OAUTH',
        credentials: {
          clientId: process.env.SAP_CLIENT_ID,
          clientSecret: process.env.SAP_CLIENT_SECRET,
        },
      },
    });

    const discovery = new ServiceDiscovery(connector);
    const result = await discovery.discoverServices();

    expect(result.services.length).toBeGreaterThan(0);
    expect(result.capabilities).toBeDefined();
  });
});