/**
 * Accessibility Tests - Page-by-Page WCAG 2.1 AA Compliance
 *
 * Tests all major pages for accessibility violations using axe-core
 */

import { test, expect, assertNoAccessibilityViolations, ScreenReaderHelpers } from './fixtures';

/**
 * Pages to test for accessibility
 */
const PAGES_TO_TEST = [
  {
    path: '/login',
    name: 'Login Page',
    requiresAuth: false,
  },
  {
    path: '/dashboard',
    name: 'Main Dashboard',
    requiresAuth: true,
  },
  {
    path: '/violations',
    name: 'Violations List',
    requiresAuth: true,
  },
  {
    path: '/modules/sod/dashboard',
    name: 'SoD Dashboard',
    requiresAuth: true,
  },
  {
    path: '/modules/sod/violations',
    name: 'SoD Violations',
    requiresAuth: true,
  },
  {
    path: '/modules/sod/config',
    name: 'SoD Configuration',
    requiresAuth: true,
  },
  {
    path: '/modules/sod/reports',
    name: 'SoD Reports',
    requiresAuth: true,
  },
  {
    path: '/modules/gl-anomaly',
    name: 'GL Anomaly Detection',
    requiresAuth: true,
  },
  {
    path: '/modules/invoice-matching',
    name: 'Invoice Matching',
    requiresAuth: true,
  },
  {
    path: '/modules/vendor-quality',
    name: 'Vendor Data Quality',
    requiresAuth: true,
  },
  {
    path: '/modules/user-access-review',
    name: 'User Access Review',
    requiresAuth: true,
  },
  {
    path: '/lhdn/operations',
    name: 'LHDN Operations Dashboard',
    requiresAuth: true,
  },
  {
    path: '/lhdn/config',
    name: 'LHDN Configuration',
    requiresAuth: true,
  },
  {
    path: '/lhdn/exceptions',
    name: 'LHDN Exception Inbox',
    requiresAuth: true,
  },
  {
    path: '/lhdn/audit',
    name: 'LHDN Audit Explorer',
    requiresAuth: true,
  },
  {
    path: '/lhdn/monitor',
    name: 'LHDN Submission Monitor',
    requiresAuth: true,
  },
  {
    path: '/reports',
    name: 'Reports',
    requiresAuth: true,
  },
  {
    path: '/audit-logs',
    name: 'Audit Logs',
    requiresAuth: true,
  },
  {
    path: '/automations',
    name: 'Automations',
    requiresAuth: true,
  },
  {
    path: '/analytics',
    name: 'Analytics',
    requiresAuth: true,
  },
  {
    path: '/glossary',
    name: 'Glossary',
    requiresAuth: true,
  },
  {
    path: '/admin/dashboard',
    name: 'Admin Dashboard',
    requiresAuth: true,
  },
  {
    path: '/admin/connectors',
    name: 'Admin Connectors',
    requiresAuth: true,
  },
];

test.describe('Accessibility - WCAG 2.1 AA Compliance', () => {
  // Mock authentication for protected pages
  test.beforeEach(async ({ context }) => {
    // Add mock auth token (adjust based on your auth implementation)
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock-token-for-testing',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  // Test each page for accessibility violations
  for (const pageConfig of PAGES_TO_TEST) {
    test(`${pageConfig.name} should have no accessibility violations`, async ({
      page,
      makeAxeBuilder,
    }) => {
      // Navigate to page
      await page.goto(pageConfig.path);

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Run axe scan
      const axeBuilder = makeAxeBuilder();
      await assertNoAccessibilityViolations(axeBuilder);
    });

    test(`${pageConfig.name} should have proper document structure`, async ({ page }) => {
      await page.goto(pageConfig.path);
      await page.waitForLoadState('networkidle');

      // Check for proper heading hierarchy
      await ScreenReaderHelpers.assertHeadingHierarchy(page);

      // Check for proper page title
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title).not.toBe('');

      // Check for main landmark
      const main = page.locator('main, [role="main"]');
      await expect(main).toHaveCount(1);

      // Check for skip link (if present)
      const skipLink = page.locator('a[href="#main-content"], a:has-text("Skip to")');
      if ((await skipLink.count()) > 0) {
        await expect(skipLink.first()).toHaveAttribute('href');
      }
    });

    test(`${pageConfig.name} should have accessible images`, async ({ page }) => {
      await page.goto(pageConfig.path);
      await page.waitForLoadState('networkidle');

      // All images should have alt text (or role="presentation" for decorative images)
      const images = await page.locator('img').all();

      for (const img of images) {
        const hasAlt = await img.getAttribute('alt');
        const hasRole = await img.getAttribute('role');

        expect(hasAlt !== null || hasRole === 'presentation').toBe(true);
      }
    });

    test(`${pageConfig.name} should have accessible forms`, async ({ page }) => {
      await page.goto(pageConfig.path);
      await page.waitForLoadState('networkidle');

      // All form inputs should have labels
      const inputs = await page
        .locator('input:not([type="hidden"]), textarea, select')
        .all();

      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');

        if (id) {
          // Check for associated label
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = (await label.count()) > 0;

          expect(
            hasLabel || ariaLabel !== null || ariaLabelledBy !== null
          ).toBe(true);
        } else {
          // Without id, must have aria-label
          expect(ariaLabel !== null || ariaLabelledBy !== null).toBe(true);
        }
      }
    });

    test(`${pageConfig.name} should have accessible interactive elements`, async ({ page }) => {
      await page.goto(pageConfig.path);
      await page.waitForLoadState('networkidle');

      // All buttons should have accessible names
      const buttons = await page.locator('button').all();

      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledBy = await button.getAttribute('aria-labelledby');
        const title = await button.getAttribute('title');

        const hasAccessibleName =
          (text && text.trim() !== '') ||
          ariaLabel !== null ||
          ariaLabelledBy !== null ||
          title !== null;

        expect(hasAccessibleName).toBe(true);
      }

      // All links should have accessible names
      const links = await page.locator('a').all();

      for (const link of links) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        const ariaLabelledBy = await link.getAttribute('aria-labelledby');
        const title = await link.getAttribute('title');

        const hasAccessibleName =
          (text && text.trim() !== '') ||
          ariaLabel !== null ||
          ariaLabelledBy !== null ||
          title !== null;

        expect(hasAccessibleName).toBe(true);
      }
    });
  }
});

test.describe('Accessibility - Color Contrast', () => {
  test('Login page should have sufficient color contrast', async ({ page, makeAxeBuilder }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const axeBuilder = makeAxeBuilder().withTags(['wcag2aa']);

    // Specifically test for color contrast
    const results = await axeBuilder.analyze();
    const contrastViolations = results.violations.filter((v) =>
      v.id.includes('color-contrast')
    );

    expect(contrastViolations).toHaveLength(0);
  });

  test('Dashboard should have sufficient color contrast', async ({ page, makeAxeBuilder }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const axeBuilder = makeAxeBuilder().withTags(['wcag2aa']);

    const results = await axeBuilder.analyze();
    const contrastViolations = results.violations.filter((v) =>
      v.id.includes('color-contrast')
    );

    expect(contrastViolations).toHaveLength(0);
  });
});

test.describe('Accessibility - ARIA', () => {
  test('Pages should have valid ARIA attributes', async ({ page, makeAxeBuilder }) => {
    const pagesToTest = ['/login', '/dashboard', '/modules/sod/dashboard'];

    for (const path of pagesToTest) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const axeBuilder = makeAxeBuilder();

      const results = await axeBuilder.analyze();
      const ariaViolations = results.violations.filter(
        (v) =>
          v.id.includes('aria-') ||
          v.id === 'valid-aria-attr' ||
          v.id === 'aria-required-attr'
      );

      expect(ariaViolations).toHaveLength(0);
    }
  });

  test('Dynamic content should announce updates', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check for live regions (for dynamic content updates)
    const liveRegions = page.locator('[aria-live], [role="alert"], [role="status"]');

    // If there are dynamic updates, they should use live regions
    const count = await liveRegions.count();

    if (count > 0) {
      // Verify live regions have proper politeness setting
      for (let i = 0; i < count; i++) {
        const region = liveRegions.nth(i);
        const ariaLive = await region.getAttribute('aria-live');
        const role = await region.getAttribute('role');

        const hasProperLiveRegion =
          ariaLive === 'polite' ||
          ariaLive === 'assertive' ||
          role === 'alert' ||
          role === 'status';

        expect(hasProperLiveRegion).toBe(true);
      }
    }
  });
});

test.describe('Accessibility - Semantic HTML', () => {
  test('Pages should use semantic HTML5 elements', async ({ page }) => {
    const pagesToTest = ['/login', '/dashboard', '/modules/sod/dashboard'];

    for (const path of pagesToTest) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Check for semantic elements
      const hasHeader =
        (await page.locator('header, [role="banner"]').count()) > 0;
      const hasMain = (await page.locator('main, [role="main"]').count()) > 0;
      const hasNav =
        (await page.locator('nav, [role="navigation"]').count()) > 0;

      expect(hasMain).toBe(true);

      // Most pages should have navigation (except maybe login)
      if (!path.includes('login')) {
        expect(hasNav).toBe(true);
      }
    }
  });

  test('Tables should have proper structure', async ({ page }) => {
    // Test pages with tables
    const pagesWithTables = [
      '/violations',
      '/modules/sod/violations',
      '/lhdn/exceptions',
    ];

    for (const path of pagesWithTables) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const tables = await page.locator('table').all();

      for (const table of tables) {
        // Tables should have caption or aria-label
        const caption = await table.locator('caption').count();
        const ariaLabel = await table.getAttribute('aria-label');
        const ariaLabelledBy = await table.getAttribute('aria-labelledby');

        expect(
          caption > 0 || ariaLabel !== null || ariaLabelledBy !== null
        ).toBe(true);

        // Tables should have thead
        const thead = await table.locator('thead').count();
        expect(thead).toBeGreaterThan(0);

        // Table headers should use th elements
        const headers = await table.locator('thead th').all();
        expect(headers.length).toBeGreaterThan(0);
      }
    }
  });
});
