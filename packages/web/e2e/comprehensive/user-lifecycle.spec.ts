/**
 * Complete User Lifecycle E2E Tests
 * Tests every step from user creation to deletion
 */

import { test, expect } from '../fixtures/auth-fixtures';
import {
  UserRole,
  UserFactory,
  CombinatorialTestGenerator,
} from '../fixtures/test-data-factory';

test.describe('User Lifecycle - Complete Journey', () => {
  const lifecycles = CombinatorialTestGenerator.generateUserLifecyclePermutations();

  for (const lifecycle of lifecycles.slice(0, 12)) {
    // Test all 12 roles
    test.describe(`${lifecycle.role} lifecycle`, () => {
      test(`Complete lifecycle: Registration → Login → Update → Password Change → Deactivation → Deletion`, async ({
        page,
        authHelper,
        testDataHelper,
        navigationHelper,
        assertionHelper,
      }) => {
        const tenant = lifecycle.tenant;
        const newUser = UserFactory.createWithRole(lifecycle.role, tenant.id);

        // ============================================================
        // STEP 1: User Registration/Creation
        // ============================================================
        test.step('Create new user', async () => {
          // Login as admin to create user
          await authHelper.loginAsRole(UserRole.TENANT_ADMIN, tenant);
          await navigationHelper.goToUserManagement();

          // Click create user button
          await page.click('[data-testid="create-user-button"]');

          // Fill user form
          await page.fill('[name="email"]', newUser.email);
          await page.fill('[name="name"]', newUser.name);
          await page.fill('[name="password"]', newUser.password);

          // Select role
          await page.selectOption('[name="role"]', lifecycle.role);

          // Submit form
          await page.click('[data-testid="submit-user-button"]');

          // Verify user created
          await expect(page.locator(`text=${newUser.email}`)).toBeVisible();

          // Logout admin
          await authHelper.logout();
        });

        // ============================================================
        // STEP 2: User First Login
        // ============================================================
        test.step('User first login', async () => {
          await authHelper.login(newUser.email, newUser.password);

          // Verify successful login
          await authHelper.verifyAuthenticated(newUser);

          // Verify role-specific dashboard
          await expect(page).toHaveURL(/\/dashboard/);
        });

        // ============================================================
        // STEP 3: Profile Update
        // ============================================================
        test.step('Update user profile', async () => {
          await navigationHelper.goToSettings();

          // Navigate to profile section
          await page.click('text=/Profile|Account/i');

          // Update name
          const updatedName = `${newUser.name} (Updated)`;
          await page.fill('[name="name"]', updatedName);

          // Update phone
          await page.fill('[name="phone"]', '+60123456789');

          // Save changes
          await page.click('[data-testid="save-profile-button"]');

          // Verify success message
          await expect(page.locator('text=/Profile updated|Changes saved/i')).toBeVisible();

          // Verify updated name appears
          await expect(page.locator(`text=${updatedName}`)).toBeVisible();
        });

        // ============================================================
        // STEP 4: Password Change
        // ============================================================
        test.step('Change password', async () => {
          await navigationHelper.goToSettings();

          // Navigate to security section
          await page.click('text=/Security|Password/i');

          // Fill password change form
          await page.fill('[name="currentPassword"]', newUser.password);
          await page.fill('[name="newPassword"]', 'NewTest1234!@#$');
          await page.fill('[name="confirmPassword"]', 'NewTest1234!@#$');

          // Submit password change
          await page.click('[data-testid="change-password-button"]');

          // Verify success
          await expect(page.locator('text=/Password changed|Password updated/i')).toBeVisible();

          // Logout
          await authHelper.logout();

          // Login with new password
          await authHelper.login(newUser.email, 'NewTest1234!@#$');
          await authHelper.verifyAuthenticated(newUser);
        });

        // ============================================================
        // STEP 5: User Deactivation
        // ============================================================
        test.step('Deactivate user', async () => {
          // Logout current user
          await authHelper.logout();

          // Login as admin
          await authHelper.loginAsRole(UserRole.TENANT_ADMIN, tenant);
          await navigationHelper.goToUserManagement();

          // Find user in list
          await page.locator(`text=${newUser.email}`).click();

          // Click deactivate button
          await page.click('[data-testid="deactivate-user-button"]');

          // Confirm deactivation
          await page.click('[data-testid="confirm-deactivate-button"]');

          // Verify user is deactivated
          await expect(page.locator('text=/Deactivated|Inactive/i')).toBeVisible();

          // Logout admin
          await authHelper.logout();

          // Try to login as deactivated user
          await page.goto('/login');
          await page.fill('[name="email"]', newUser.email);
          await page.fill('[name="password"]', 'NewTest1234!@#$');
          await page.click('button[type="submit"]');

          // Verify login denied
          await expect(
            page.locator('text=/Account deactivated|Account inactive/i')
          ).toBeVisible();
        });

        // ============================================================
        // STEP 6: User Deletion
        // ============================================================
        test.step('Delete user', async () => {
          // Login as admin
          await authHelper.loginAsRole(UserRole.TENANT_ADMIN, tenant);
          await navigationHelper.goToUserManagement();

          // Find deactivated user
          await page.locator(`text=${newUser.email}`).click();

          // Click delete button
          await page.click('[data-testid="delete-user-button"]');

          // Confirm deletion
          await page.fill('[name="confirmEmail"]', newUser.email);
          await page.click('[data-testid="confirm-delete-button"]');

          // Verify user removed from list
          await expect(page.locator(`text=${newUser.email}`)).not.toBeVisible();

          // Logout
          await authHelper.logout();

          // Verify deleted user cannot login
          await page.goto('/login');
          await page.fill('[name="email"]', newUser.email);
          await page.fill('[name="password"]', 'NewTest1234!@#$');
          await page.click('button[type="submit"]');

          // Verify login denied
          await expect(
            page.locator('text=/User not found|Invalid credentials/i')
          ).toBeVisible();
        });
      });
    });
  }
});

test.describe('User Lifecycle - Role Changes', () => {
  test('User role escalation and de-escalation', async ({
    page,
    authHelper,
    navigationHelper,
    testTenant,
  }) => {
    const user = UserFactory.createWithRole(UserRole.FINANCE_USER, testTenant.id);

    // Create user as admin
    test.step('Create finance user', async () => {
      await authHelper.loginAsRole(UserRole.TENANT_ADMIN, testTenant);
      await testDataHelper.createUser(UserRole.FINANCE_USER, testTenant);
      await authHelper.logout();
    });

    // Login as finance user
    test.step('Verify initial access as FINANCE_USER', async () => {
      await authHelper.login(user.email, user.password);

      // Can access invoice matching
      await assertionHelper.assertCanAccessPage('/invoice-matching');

      // Cannot access user management
      await assertionHelper.assertCannotAccessPage('/admin/users');

      await authHelper.logout();
    });

    // Escalate to finance manager
    test.step('Escalate to FINANCE_MANAGER', async () => {
      await authHelper.loginAsRole(UserRole.TENANT_ADMIN, testTenant);
      await navigationHelper.goToUserManagement();

      await page.locator(`text=${user.email}`).click();
      await page.selectOption('[name="role"]', UserRole.FINANCE_MANAGER);
      await page.click('[data-testid="save-role-button"]');

      await authHelper.logout();
    });

    // Login with escalated permissions
    test.step('Verify escalated access as FINANCE_MANAGER', async () => {
      await authHelper.login(user.email, user.password);

      // Can now run analysis
      await navigationHelper.goToModule('invoice-matching');
      await assertionHelper.assertCanPerformAction('[data-testid="run-analysis-button"]');

      // Can configure modules
      await assertionHelper.assertCanPerformAction('[data-testid="settings-button"]');

      await authHelper.logout();
    });

    // De-escalate back to read-only
    test.step('De-escalate to READ_ONLY_USER', async () => {
      await authHelper.loginAsRole(UserRole.TENANT_ADMIN, testTenant);
      await navigationHelper.goToUserManagement();

      await page.locator(`text=${user.email}`).click();
      await page.selectOption('[name="role"]', UserRole.READ_ONLY_USER);
      await page.click('[data-testid="save-role-button"]');

      await authHelper.logout();
    });

    // Verify reduced access
    test.step('Verify reduced access as READ_ONLY_USER', async () => {
      await authHelper.login(user.email, user.password);

      // Can view but cannot run analysis
      await navigationHelper.goToModule('invoice-matching');
      await assertionHelper.assertCannotPerformAction('[data-testid="run-analysis-button"]');

      // Cannot configure
      await assertionHelper.assertCannotPerformAction('[data-testid="settings-button"]');
    });
  });
});

test.describe('User Lifecycle - Multi-Factor Authentication', () => {
  test('Enable and disable MFA for user', async ({
    page,
    authHelper,
    navigationHelper,
    testTenant,
  }) => {
    const user = UserFactory.createWithRole(UserRole.COMPLIANCE_OFFICER, testTenant.id);

    test.step('Enable MFA', async () => {
      await authHelper.login(user.email, user.password);
      await navigationHelper.goToSettings();

      await page.click('text=/Security|MFA/i');
      await page.click('[data-testid="enable-mfa-button"]');

      // Scan QR code (simulated)
      await expect(page.locator('[data-testid="mfa-qr-code"]')).toBeVisible();

      // Enter verification code
      await page.fill('[name="mfaCode"]', '123456'); // Mock code
      await page.click('[data-testid="verify-mfa-button"]');

      // Verify MFA enabled
      await expect(page.locator('text=/MFA enabled|Two-factor enabled/i')).toBeVisible();
    });

    test.step('Logout and verify MFA required on login', async () => {
      await authHelper.logout();

      // Login with password
      await page.goto('/login');
      await page.fill('[name="email"]', user.email);
      await page.fill('[name="password"]', user.password);
      await page.click('button[type="submit"]');

      // Should prompt for MFA code
      await expect(page.locator('text=/Enter verification code/i')).toBeVisible();
    });
  });
});

test.describe('User Lifecycle - Session Management', () => {
  test('Concurrent session handling', async ({ page, browser, authHelper, testTenant }) => {
    const user = UserFactory.createWithRole(UserRole.AUDITOR, testTenant.id);

    test.step('Login from first browser', async () => {
      await authHelper.login(user.email, user.password);
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test.step('Login from second browser (new context)', async () => {
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      const authHelper2 = new AuthHelper(page2);

      await authHelper2.login(user.email, user.password);
      await expect(page2).toHaveURL(/\/dashboard/);

      // First session should still be active (concurrent sessions allowed)
      await page.reload();
      await expect(page).toHaveURL(/\/dashboard/);

      await context2.close();
    });
  });
});

test.afterAll(async () => {
  console.log('\n=== User Lifecycle Test Summary ===');
  console.log(`Total roles tested: ${Object.values(UserRole).length}`);
  console.log('Lifecycle steps covered per role:');
  console.log('  1. Registration/Creation');
  console.log('  2. First Login');
  console.log('  3. Profile Update');
  console.log('  4. Password Change');
  console.log('  5. Deactivation');
  console.log('  6. Deletion');
  console.log('===================================\n');
});
