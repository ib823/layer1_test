/**
 * Example: Storing and Retrieving Tenant Profiles
 */

import { S4HANAConnector } from '../connectors/s4hana';
import { ServiceDiscovery } from '../connectors/base/ServiceDiscovery';
import { TenantProfileRepository } from '../persistence/TenantProfileRepository';

async function onboardTenantWithPersistence() {
  // Step 1: Initialize repository
  const repo = new TenantProfileRepository(
    process.env.DATABASE_URL || 'postgresql://localhost/sapframework'
  );

  const tenantId = 'acme-corp-123';

  try {
    // Step 2: Create tenant record
    const tenant = await repo.createTenant(tenantId, 'ACME Corporation');
    console.log('Tenant created:', tenant.tenant_id);

    // Step 3: Connect to SAP and discover
    const connector = new S4HANAConnector({
      erpSystem: 'SAP',
      baseUrl: 'https://acme.s4hana.cloud.sap',
      auth: {
        provider: 'SAP',
        type: 'OAUTH2',
        credentials: {
          clientId: process.env.SAP_CLIENT_ID,
          clientSecret: process.env.SAP_CLIENT_SECRET
        }
      },
    });

    const discovery = new ServiceDiscovery(connector as any);
    const result = await discovery.discoverServices();

    // Step 4: Save discovery history
    await repo.saveDiscoveryHistory(tenantId, result);
    console.log('Discovery history saved');

    // Step 5: Generate and save profile
    const profile = await discovery.generateTenantProfile(tenantId);
    await repo.saveProfile(profile);
    console.log('Profile saved');

    // Step 6: Activate modules based on capabilities
    if (profile.capabilities.canDoSoD) {
      await repo.activateModule(tenantId, 'SoD_Analysis', 'Auto-enabled: has required services');
      console.log('Module activated: SoD_Analysis');
    }

    // Step 7: Retrieve profile later
    const savedProfile = await repo.getProfile(tenantId);
    console.log('Retrieved profile:', savedProfile?.sapVersion);

    // Step 8: Check active modules
    const activeModules = await repo.getActiveModules(tenantId);
    console.log('Active modules:', activeModules);

  } finally {
    await repo.close();
  }
}

onboardTenantWithPersistence().catch(console.error);