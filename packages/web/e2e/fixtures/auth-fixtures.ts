/**
 * Playwright Fixtures for Authentication and Test Setup
 */

import { test as base, expect, Page } from '@playwright/test';
import { UserFactory, TenantFactory, UserRole, TestUser, TestTenant } from './test-data-factory';

// ============================================================================
// EXTENDED TEST CONTEXT
// ============================================================================

export interface AuthenticatedContext {
  user: TestUser;
  tenant: TestTenant;
  authenticatedPage: Page;
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login with test user credentials
   */
  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/login');
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Login as specific role
   */
  async loginAsRole(role: UserRole, tenant?: TestTenant): Promise<TestUser> {
    const user = UserFactory.createWithRole(role, tenant?.id);

    // In dev mode, use the mock JWT token approach
    await this.page.goto('/');

    // Set authentication token in localStorage
    await this.page.evaluate((userData) => {
      const mockToken = btoa(JSON.stringify({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        roles: userData.roles,
        tenantId: userData.tenantId,
      }));
      localStorage.setItem('auth_token', mockToken);
    }, user);

    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');

    return user;
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/login');
  }

  /**
   * Verify user is authenticated
   */
  async verifyAuthenticated(user: TestUser): Promise<void> {
    await expect(this.page.locator(`text=${user.name}`)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify access denied
   */
  async verifyAccessDenied(): Promise<void> {
    await expect(
      this.page.locator('text=/Access Denied|Forbidden|Unauthorized/i')
    ).toBeVisible({ timeout: 5000 });
  }
}

// ============================================================================
// TEST DATA HELPER
// ============================================================================

export class TestDataHelper {
  constructor(private page: Page) {}

  /**
   * Setup tenant with modules
   */
  async setupTenant(modules: string[]): Promise<TestTenant> {
    const tenant = TenantFactory.createWithModules(modules);

    // Store tenant data in session
    await this.page.evaluate((tenantData) => {
      sessionStorage.setItem('test_tenant', JSON.stringify(tenantData));
    }, tenant);

    return tenant;
  }

  /**
   * Create test user in tenant
   */
  async createUser(role: UserRole, tenant: TestTenant): Promise<TestUser> {
    const user = UserFactory.createWithRole(role, tenant.id);

    // Simulate user creation via API (mock for tests)
    await this.page.evaluate((userData) => {
      const users = JSON.parse(sessionStorage.getItem('test_users') || '[]');
      users.push(userData);
      sessionStorage.setItem('test_users', JSON.stringify(users));
    }, user);

    return user;
  }

  /**
   * Cleanup test data
   */
  async cleanup(): Promise<void> {
    await this.page.evaluate(() => {
      sessionStorage.removeItem('test_tenant');
      sessionStorage.removeItem('test_users');
      localStorage.removeItem('auth_token');
    });
  }
}

// ============================================================================
// NAVIGATION HELPER
// ============================================================================

export class NavigationHelper {
  constructor(private page: Page) {}

  async goToModule(module: string): Promise<void> {
    const moduleRoutes: Record<string, string> = {
      'sod-control': '/sod',
      'invoice-matching': '/invoice-matching',
      'gl-anomaly-detection': '/gl-anomaly',
      'vendor-data-quality': '/vendor-quality',
      'lhdn-einvoice': '/lhdn',
      'user-access-review': '/user-access-review',
    };

    const route = moduleRoutes[module] || `/${module}`;
    await this.page.goto(route);
    await this.page.waitForLoadState('networkidle');
  }

  async goToDashboard(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async goToSettings(): Promise<void> {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }

  async goToUserManagement(): Promise<void> {
    await this.page.goto('/admin/users');
    await this.page.waitForLoadState('networkidle');
  }

  async goToTenantSettings(): Promise<void> {
    await this.page.goto('/admin/tenants');
    await this.page.waitForLoadState('networkidle');
  }
}

// ============================================================================
// ASSERTION HELPER
// ============================================================================

export class AssertionHelper {
  constructor(private page: Page) {}

  async assertCanAccessPage(url: string): Promise<void> {
    await this.page.goto(url);
    await expect(this.page).not.toHaveURL(/\/403|\/unauthorized/);
    await expect(this.page.locator('text=/Access Denied|Forbidden/i')).not.toBeVisible();
  }

  async assertCannotAccessPage(url: string): Promise<void> {
    await this.page.goto(url);
    const currentUrl = this.page.url();
    const isBlocked =
      currentUrl.includes('/403') ||
      currentUrl.includes('/unauthorized') ||
      (await this.page.locator('text=/Access Denied|Forbidden/i').isVisible());

    expect(isBlocked).toBeTruthy();
  }

  async assertCanPerformAction(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toBeEnabled();
  }

  async assertCannotPerformAction(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    const exists = await element.count();

    if (exists > 0) {
      await expect(element).toBeDisabled();
    }
  }

  async assertElementVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async assertElementNotVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }
}

// ============================================================================
// PLAYWRIGHT FIXTURES
// ============================================================================

export const test = base.extend<{
  authHelper: AuthHelper;
  testDataHelper: TestDataHelper;
  navigationHelper: NavigationHelper;
  assertionHelper: AssertionHelper;
  authenticatedUser: TestUser;
  testTenant: TestTenant;
}>({
  authHelper: async ({ page }, use) => {
    await use(new AuthHelper(page));
  },

  testDataHelper: async ({ page }, use) => {
    const helper = new TestDataHelper(page);
    await use(helper);
    await helper.cleanup();
  },

  navigationHelper: async ({ page }, use) => {
    await use(new NavigationHelper(page));
  },

  assertionHelper: async ({ page }, use) => {
    await use(new AssertionHelper(page));
  },

  authenticatedUser: async ({ authHelper, page }, use, testInfo) => {
    // Default to READ_ONLY_USER, can be overridden in tests
    const user = await authHelper.loginAsRole(UserRole.READ_ONLY_USER);
    await use(user);
  },

  testTenant: async ({ testDataHelper }, use) => {
    const tenant = await testDataHelper.setupTenant([
      'sod-control',
      'invoice-matching',
      'gl-anomaly-detection',
      'vendor-data-quality',
      'lhdn-einvoice',
      'user-access-review',
    ]);
    await use(tenant);
  },
});

export { expect };
