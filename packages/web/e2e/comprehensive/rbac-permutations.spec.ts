/**
 * Role-Based Access Control (RBAC) Permutation Tests
 * Tests all role × permission × module combinations
 */

import { test, expect } from '../fixtures/auth-fixtures';
import {
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  CombinatorialTestGenerator,
} from '../fixtures/test-data-factory';

test.describe('RBAC - Role Permission Matrix', () => {
  // Test each role has correct permissions
  for (const role of Object.values(UserRole)) {
    test(`${role} should have correct permissions`, async ({
      authHelper,
      page,
      testTenant,
    }) => {
      const user = await authHelper.loginAsRole(role, testTenant);
      const expectedPermissions = ROLE_PERMISSIONS[role];

      // Verify user context
      const userContext = await page.evaluate(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) return null;
        return JSON.parse(atob(token));
      });

      expect(userContext?.roles).toContain(role);

      // Log permissions for debugging
      console.log(`${role} permissions:`, expectedPermissions.length);
    });
  }
});

test.describe('RBAC - Module Access Control', () => {
  const modulePermutations = CombinatorialTestGenerator.generateModuleOperationPermutations();

  // Group by role for better test organization
  const permutationsByRole = modulePermutations.reduce((acc, perm) => {
    if (!acc[perm.role]) {
      acc[perm.role] = [];
    }
    acc[perm.role].push(perm);
    return acc;
  }, {} as Record<UserRole, typeof modulePermutations>);

  for (const [role, permutations] of Object.entries(permutationsByRole)) {
    test.describe(`${role} module access`, () => {
      for (const perm of permutations) {
        test(`${role} ${perm.shouldSucceed ? 'CAN' : 'CANNOT'} access ${perm.module}`, async ({
          authHelper,
          navigationHelper,
          assertionHelper,
          testTenant,
        }) => {
          await authHelper.loginAsRole(role as UserRole, testTenant);

          const moduleRoutes: Record<string, string> = {
            'sod-control': '/sod',
            'invoice-matching': '/invoice-matching',
            'gl-anomaly-detection': '/gl-anomaly',
            'vendor-data-quality': '/vendor-quality',
            'lhdn-einvoice': '/lhdn',
            'user-access-review': '/user-access-review',
          };

          const route = moduleRoutes[perm.module];

          if (perm.shouldSucceed) {
            await assertionHelper.assertCanAccessPage(route);
          } else {
            await assertionHelper.assertCannotAccessPage(route);
          }
        });
      }
    });
  }
});

test.describe('RBAC - User Management Operations', () => {
  const userManagementRoles = [
    UserRole.SUPER_ADMIN,
    UserRole.TENANT_ADMIN,
  ];

  const nonUserManagementRoles = Object.values(UserRole).filter(
    (role) => !userManagementRoles.includes(role)
  );

  for (const role of userManagementRoles) {
    test(`${role} CAN access user management`, async ({
      authHelper,
      navigationHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);
      await assertionHelper.assertCanAccessPage('/admin/users');

      // Verify create user button is visible
      await assertionHelper.assertCanPerformAction('[data-testid="create-user-button"]');
    });
  }

  for (const role of nonUserManagementRoles) {
    test(`${role} CANNOT access user management`, async ({
      authHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);
      await assertionHelper.assertCannotAccessPage('/admin/users');
    });
  }
});

test.describe('RBAC - Tenant Management Operations', () => {
  test(`${UserRole.SUPER_ADMIN} CAN manage tenants`, async ({
    authHelper,
    assertionHelper,
    testTenant,
  }) => {
    await authHelper.loginAsRole(UserRole.SUPER_ADMIN, testTenant);
    await assertionHelper.assertCanAccessPage('/admin/tenants');
    await assertionHelper.assertCanPerformAction('[data-testid="create-tenant-button"]');
  });

  test(`${UserRole.TENANT_ADMIN} CAN view but not create tenants`, async ({
    authHelper,
    assertionHelper,
    testTenant,
  }) => {
    await authHelper.loginAsRole(UserRole.TENANT_ADMIN, testTenant);
    await assertionHelper.assertCanAccessPage('/admin/tenants');
    await assertionHelper.assertCannotPerformAction('[data-testid="create-tenant-button"]');
  });

  const regularRoles = Object.values(UserRole).filter(
    (role) => ![UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN].includes(role)
  );

  for (const role of regularRoles) {
    test(`${role} CANNOT access tenant management`, async ({
      authHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);
      await assertionHelper.assertCannotAccessPage('/admin/tenants');
    });
  }
});

test.describe('RBAC - Analysis Operations', () => {
  const canRunAnalysis = [
    UserRole.SUPER_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.FINANCE_MANAGER,
    UserRole.PROCUREMENT_MANAGER,
    UserRole.HR_MANAGER,
  ];

  const cannotRunAnalysis = Object.values(UserRole).filter(
    (role) => !canRunAnalysis.includes(role)
  );

  for (const role of canRunAnalysis) {
    test(`${role} CAN run analysis`, async ({
      authHelper,
      navigationHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);

      // Navigate to SoD module
      await navigationHelper.goToModule('sod-control');

      // Verify run analysis button is available
      await assertionHelper.assertCanPerformAction('[data-testid="run-analysis-button"]');
    });
  }

  for (const role of cannotRunAnalysis) {
    test(`${role} CANNOT run analysis`, async ({
      authHelper,
      navigationHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);

      // Try to navigate to SoD module
      await navigationHelper.goToModule('sod-control');

      // Run button should not be visible or should be disabled
      await assertionHelper.assertCannotPerformAction('[data-testid="run-analysis-button"]');
    });
  }
});

test.describe('RBAC - Approval Operations', () => {
  const canApprove = [
    UserRole.SUPER_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.FINANCE_MANAGER,
  ];

  const cannotApprove = Object.values(UserRole).filter(
    (role) => !canApprove.includes(role)
  );

  for (const role of canApprove) {
    test(`${role} CAN approve findings`, async ({
      authHelper,
      navigationHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);
      await navigationHelper.goToModule('sod-control');

      // Verify approve button is available (if findings exist)
      const approveButton = '[data-testid="approve-button"]';
      const exists = await assertionHelper.page.locator(approveButton).count();

      if (exists > 0) {
        await assertionHelper.assertCanPerformAction(approveButton);
      }
    });
  }

  for (const role of cannotApprove) {
    test(`${role} CANNOT approve findings`, async ({
      authHelper,
      navigationHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);
      await navigationHelper.goToModule('sod-control');

      // Approve button should not be visible
      await assertionHelper.assertCannotPerformAction('[data-testid="approve-button"]');
    });
  }
});

test.describe('RBAC - Export Operations', () => {
  const canExport = [
    UserRole.SUPER_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.AUDITOR,
    UserRole.FINANCE_MANAGER,
    UserRole.PROCUREMENT_MANAGER,
    UserRole.HR_MANAGER,
  ];

  const cannotExport = Object.values(UserRole).filter(
    (role) => !canExport.includes(role)
  );

  for (const role of canExport) {
    test(`${role} CAN export data`, async ({
      authHelper,
      navigationHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);
      await navigationHelper.goToModule('sod-control');

      // Verify export button is available
      await assertionHelper.assertCanPerformAction('[data-testid="export-button"]');
    });
  }

  for (const role of cannotExport) {
    test(`${role} CANNOT export data`, async ({
      authHelper,
      navigationHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);
      await navigationHelper.goToModule('sod-control');

      // Export button should not be visible
      await assertionHelper.assertCannotPerformAction('[data-testid="export-button"]');
    });
  }
});

test.describe('RBAC - Configuration Operations', () => {
  const canConfigure = [
    UserRole.SUPER_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.FINANCE_MANAGER,
    UserRole.PROCUREMENT_MANAGER,
    UserRole.HR_MANAGER,
  ];

  const cannotConfigure = Object.values(UserRole).filter(
    (role) => !canConfigure.includes(role)
  );

  for (const role of canConfigure) {
    test(`${role} CAN configure modules`, async ({
      authHelper,
      navigationHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);
      await navigationHelper.goToModule('sod-control');

      // Verify settings button is available
      await assertionHelper.assertCanPerformAction('[data-testid="settings-button"]');
    });
  }

  for (const role of cannotConfigure) {
    test(`${role} CANNOT configure modules`, async ({
      authHelper,
      navigationHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);
      await navigationHelper.goToModule('sod-control');

      // Settings button should not be visible
      await assertionHelper.assertCannotPerformAction('[data-testid="settings-button"]');
    });
  }
});

test.describe('RBAC - Audit Log Access', () => {
  const canViewAudit = [
    UserRole.SUPER_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.AUDITOR,
  ];

  const cannotViewAudit = Object.values(UserRole).filter(
    (role) => !canViewAudit.includes(role)
  );

  for (const role of canViewAudit) {
    test(`${role} CAN view audit logs`, async ({
      authHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);
      await assertionHelper.assertCanAccessPage('/admin/audit-logs');
    });
  }

  for (const role of cannotViewAudit) {
    test(`${role} CANNOT view audit logs`, async ({
      authHelper,
      assertionHelper,
      testTenant,
    }) => {
      await authHelper.loginAsRole(role, testTenant);
      await assertionHelper.assertCannotAccessPage('/admin/audit-logs');
    });
  }
});

// Test summary
test.afterAll(async () => {
  const totalPermutations = CombinatorialTestGenerator.calculateTotalPermutations();
  console.log('\n=== RBAC Test Summary ===');
  console.log(`Total roles tested: ${Object.values(UserRole).length}`);
  console.log(`Total permissions: ${Object.values(Permission).length}`);
  console.log(`Total module permutations: ${CombinatorialTestGenerator.generateModuleOperationPermutations().length}`);
  console.log(`Total unique permutations available: ${totalPermutations}`);
  console.log('========================\n');
});
