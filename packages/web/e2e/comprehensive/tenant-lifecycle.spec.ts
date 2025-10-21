/**
 * Tenant Lifecycle E2E Tests
 * Complete tenant journey from onboarding to deletion
 */

import { test, expect } from '../fixtures/auth-fixtures';
import {
  UserRole,
  TenantFactory,
  CombinatorialTestGenerator,
} from '../fixtures/test-data-factory';

test.describe('Tenant Lifecycle - Complete Journey', () => {
  const tenantLifecycles = CombinatorialTestGenerator.generateTenantLifecyclePermutations();

  // Test first 6 permutations (covers SUPER_ADMIN and TENANT_ADMIN with different module sets)
  for (const lifecycle of tenantLifecycles.slice(0, 6)) {
    test.describe(`Tenant with ${lifecycle.enabledModules.length} modules (${lifecycle.adminRole})`, () => {
      test(`Complete lifecycle: Onboarding → Configuration → Module Enable → Module Disable → Suspension → Deletion`, async ({
        page,
        authHelper,
        navigationHelper,
        assertionHelper,
      }) => {
        const tenant = TenantFactory.createWithModules(lifecycle.enabledModules);
        let tenantId: string;

        // ============================================================
        // STEP 1: Tenant Onboarding
        // ============================================================
        test.step('Tenant onboarding', async () => {
          await authHelper.loginAsRole(UserRole.SUPER_ADMIN);

          await navigationHelper.goToTenantSettings();

          // Click create tenant
          await page.click('[data-testid="create-tenant-button"]');

          // Fill tenant details
          await page.fill('[name="tenantName"]', tenant.name);
          await page.fill('[name="domain"]', tenant.domain);

          // Configure SAP connection
          await page.fill('[name="sapBaseUrl"]', tenant.settings.sapConnection.baseUrl);
          await page.fill('[name="sapClientId"]', tenant.settings.sapConnection.clientId);
          await page.fill('[name="sapClientSecret"]', tenant.settings.sapConnection.clientSecret);

          // Submit
          await page.click('[data-testid="create-tenant-submit"]');

          // Verify tenant created
          await expect(page.locator(`text=${tenant.name}`)).toBeVisible();

          // Get tenant ID
          tenantId = await page.evaluate(() => {
            const url = new URL(window.location.href);
            return url.searchParams.get('id') || 'new-tenant-id';
          });

          console.log(`Tenant created: ${tenantId}`);
        });

        // ============================================================
        // STEP 2: Tenant Configuration
        // ============================================================
        test.step('Configure tenant settings', async () => {
          // Navigate to tenant settings
          await page.locator(`text=${tenant.name}`).click();
          await page.click('[data-testid="tenant-settings-tab"]');

          // Enable features
          await page.check('[name="enableMfa"]');
          await page.check('[name="enableSso"]');

          // Set retention period
          await page.fill('[name="auditRetentionDays"]', '90');

          // Save settings
          await page.click('[data-testid="save-settings-button"]');

          // Verify success
          await expect(page.locator('text=/Settings saved|Configuration updated/i')).toBeVisible();
        });

        // ============================================================
        // STEP 3: Enable Modules
        // ============================================================
        for (const module of lifecycle.enabledModules) {
          test.step(`Enable module: ${module}`, async () => {
            await page.click('[data-testid="modules-tab"]');

            // Find module in list
            const moduleRow = page.locator(`[data-module="${module}"]`);

            // Enable module
            await moduleRow.locator('[data-testid="enable-module-toggle"]').click();

            // Configure module if needed
            const configButton = moduleRow.locator('[data-testid="configure-module-button"]');
            if (await configButton.isVisible()) {
              await configButton.click();

              // Set module-specific configuration
              if (module === 'sod-control') {
                await page.fill('[name="conflictThreshold"]', '0.8');
              } else if (module === 'invoice-matching') {
                await page.fill('[name="tolerancePercentage"]', '5');
              } else if (module === 'gl-anomaly-detection') {
                await page.fill('[name="benfordThreshold"]', '0.95');
              }

              await page.click('[data-testid="save-module-config"]');
            }

            // Verify module enabled
            await expect(moduleRow.locator('text=/Enabled|Active/i')).toBeVisible();
          });
        }

        // ============================================================
        // STEP 4: Verify Module Access
        // ============================================================
        test.step('Verify modules are accessible', async () => {
          // Create a tenant admin user
          await navigationHelper.goToUserManagement();
          await page.click('[data-testid="create-user-button"]');

          await page.fill('[name="email"]', `admin@${tenant.domain}`);
          await page.fill('[name="name"]', 'Tenant Admin');
          await page.fill('[name="password"]', 'Admin1234!@#$');
          await page.selectOption('[name="role"]', UserRole.TENANT_ADMIN);
          await page.click('[data-testid="submit-user-button"]');

          // Logout super admin
          await authHelper.logout();

          // Login as tenant admin
          await authHelper.login(`admin@${tenant.domain}`, 'Admin1234!@#$');

          // Verify each enabled module is accessible
          for (const module of lifecycle.enabledModules) {
            const moduleRoutes: Record<string, string> = {
              'sod-control': '/sod',
              'invoice-matching': '/invoice-matching',
              'gl-anomaly-detection': '/gl-anomaly',
              'vendor-data-quality': '/vendor-quality',
              'lhdn-einvoice': '/lhdn',
              'user-access-review': '/user-access-review',
            };

            await assertionHelper.assertCanAccessPage(moduleRoutes[module]);
          }

          await authHelper.logout();
          await authHelper.loginAsRole(UserRole.SUPER_ADMIN);
        });

        // ============================================================
        // STEP 5: Disable Modules
        // ============================================================
        test.step('Disable all modules', async () => {
          await navigationHelper.goToTenantSettings();
          await page.locator(`text=${tenant.name}`).click();
          await page.click('[data-testid="modules-tab"]');

          for (const module of lifecycle.enabledModules) {
            const moduleRow = page.locator(`[data-module="${module}"]`);
            await moduleRow.locator('[data-testid="enable-module-toggle"]').click();

            // Confirm disable
            await page.click('[data-testid="confirm-disable-button"]');

            // Verify module disabled
            await expect(moduleRow.locator('text=/Disabled|Inactive/i')).toBeVisible();
          }
        });

        // ============================================================
        // STEP 6: Suspend Tenant
        // ============================================================
        test.step('Suspend tenant', async () => {
          await page.click('[data-testid="tenant-actions-menu"]');
          await page.click('[data-testid="suspend-tenant-button"]');

          // Enter suspension reason
          await page.fill('[name="suspensionReason"]', 'Payment overdue - automated test');

          // Confirm suspension
          await page.click('[data-testid="confirm-suspend-button"]');

          // Verify tenant suspended
          await expect(page.locator('text=/Suspended|Suspended/i')).toBeVisible();

          // Logout
          await authHelper.logout();

          // Verify tenant admin cannot login
          await page.goto('/login');
          await page.fill('[name="email"]', `admin@${tenant.domain}`);
          await page.fill('[name="password"]', 'Admin1234!@#$');
          await page.click('button[type="submit"]');

          // Should show tenant suspended message
          await expect(
            page.locator('text=/Tenant suspended|Account suspended/i')
          ).toBeVisible();

          // Login back as super admin
          await authHelper.loginAsRole(UserRole.SUPER_ADMIN);
        });

        // ============================================================
        // STEP 7: Delete Tenant
        // ============================================================
        test.step('Delete tenant', async () => {
          await navigationHelper.goToTenantSettings();
          await page.locator(`text=${tenant.name}`).click();

          await page.click('[data-testid="tenant-actions-menu"]');
          await page.click('[data-testid="delete-tenant-button"]');

          // Confirm deletion with tenant name
          await page.fill('[name="confirmTenantName"]', tenant.name);
          await page.click('[data-testid="confirm-delete-button"]');

          // Verify tenant removed
          await expect(page.locator(`text=${tenant.name}`)).not.toBeVisible();

          // Verify all associated users cannot login
          await authHelper.logout();
          await page.goto('/login');
          await page.fill('[name="email"]', `admin@${tenant.domain}`);
          await page.fill('[name="password"]', 'Admin1234!@#$');
          await page.click('button[type="submit"]');

          await expect(
            page.locator('text=/Tenant not found|Invalid credentials/i')
          ).toBeVisible();
        });
      });
    });
  }
});

test.describe('Tenant Lifecycle - Service Discovery', () => {
  test('Automatic service discovery on tenant creation', async ({
    page,
    authHelper,
    navigationHelper,
  }) => {
    const tenant = TenantFactory.create();

    test.step('Create tenant with SAP connection', async () => {
      await authHelper.loginAsRole(UserRole.SUPER_ADMIN);
      await navigationHelper.goToTenantSettings();

      await page.click('[data-testid="create-tenant-button"]');

      await page.fill('[name="tenantName"]', tenant.name);
      await page.fill('[name="domain"]', tenant.domain);
      await page.fill('[name="sapBaseUrl"]', tenant.settings.sapConnection.baseUrl);
      await page.fill('[name="sapClientId"]', tenant.settings.sapConnection.clientId);
      await page.fill('[name="sapClientSecret"]', tenant.settings.sapConnection.clientSecret);

      // Enable service discovery
      await page.check('[name="enableServiceDiscovery"]');

      await page.click('[data-testid="create-tenant-submit"]');

      // Wait for service discovery to complete
      await expect(page.locator('text=/Service discovery complete/i')).toBeVisible({
        timeout: 30000,
      });
    });

    test.step('Verify discovered services', async () => {
      await page.click('[data-testid="discovered-services-tab"]');

      // Verify OData services discovered
      await expect(page.locator('text=/OData Services/i')).toBeVisible();

      // Verify capability profile generated
      await expect(page.locator('[data-testid="capability-profile"]')).toBeVisible();

      // Verify module recommendations
      await expect(page.locator('[data-testid="recommended-modules"]')).toBeVisible();
    });
  });
});

test.describe('Tenant Lifecycle - Multi-Tenant Isolation', () => {
  test('Data isolation between tenants', async ({
    page,
    browser,
    authHelper,
    navigationHelper,
  }) => {
    const tenant1 = TenantFactory.create({ name: 'Tenant Alpha' });
    const tenant2 = TenantFactory.create({ name: 'Tenant Beta' });

    test.step('Create two tenants', async () => {
      await authHelper.loginAsRole(UserRole.SUPER_ADMIN);
      await navigationHelper.goToTenantSettings();

      // Create tenant 1
      await page.click('[data-testid="create-tenant-button"]');
      await page.fill('[name="tenantName"]', tenant1.name);
      await page.fill('[name="domain"]', tenant1.domain);
      await page.click('[data-testid="create-tenant-submit"]');
      await expect(page.locator(`text=${tenant1.name}`)).toBeVisible();

      // Create tenant 2
      await page.click('[data-testid="create-tenant-button"]');
      await page.fill('[name="tenantName"]', tenant2.name);
      await page.fill('[name="domain"]', tenant2.domain);
      await page.click('[data-testid="create-tenant-submit"]');
      await expect(page.locator(`text=${tenant2.name}`)).toBeVisible();
    });

    test.step('Create users in each tenant', async () => {
      // Create user in tenant 1
      await navigationHelper.goToUserManagement();
      await page.selectOption('[name="tenantFilter"]', tenant1.id);

      await page.click('[data-testid="create-user-button"]');
      await page.fill('[name="email"]', `user@${tenant1.domain}`);
      await page.fill('[name="password"]', 'Test1234!@#$');
      await page.click('[data-testid="submit-user-button"]');

      // Create user in tenant 2
      await page.selectOption('[name="tenantFilter"]', tenant2.id);

      await page.click('[data-testid="create-user-button"]');
      await page.fill('[name="email"]', `user@${tenant2.domain}`);
      await page.fill('[name="password"]', 'Test1234!@#$');
      await page.click('[data-testid="submit-user-button"]');

      await authHelper.logout();
    });

    test.step('Verify tenant 1 user cannot see tenant 2 data', async () => {
      await authHelper.login(`user@${tenant1.domain}`, 'Test1234!@#$');

      // Check tenant context
      const tenantContext = await page.evaluate(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) return null;
        const decoded = JSON.parse(atob(token));
        return decoded.tenantId;
      });

      expect(tenantContext).toBe(tenant1.id);

      // Verify cannot access tenant 2 resources
      await navigationHelper.goToUserManagement();

      // Should only see users from tenant 1
      await expect(page.locator(`text=user@${tenant1.domain}`)).toBeVisible();
      await expect(page.locator(`text=user@${tenant2.domain}`)).not.toBeVisible();
    });
  });
});

test.afterAll(async () => {
  const lifecycles = CombinatorialTestGenerator.generateTenantLifecyclePermutations();

  console.log('\n=== Tenant Lifecycle Test Summary ===');
  console.log(`Total tenant permutations: ${lifecycles.length}`);
  console.log(`Module combinations tested: ${new Set(lifecycles.map(l => l.enabledModules.length)).size}`);
  console.log('Lifecycle steps per tenant:');
  console.log('  1. Onboarding');
  console.log('  2. Configuration');
  console.log('  3. Module Enablement');
  console.log('  4. Module Disablement');
  console.log('  5. Suspension');
  console.log('  6. Deletion');
  console.log('=====================================\n');
});
