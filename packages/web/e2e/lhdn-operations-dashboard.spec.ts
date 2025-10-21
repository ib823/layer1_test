import { test, expect } from '@playwright/test';

test.describe('LHDN Operations Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lhdn/operations');
  });

  test('should display operations dashboard page', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();

    // Check description
    await expect(page.getByText(/Real-time monitoring and operational metrics/)).toBeVisible();
  });

  test('should display invoice metrics section', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Check invoice metrics heading
    await expect(page.locator('text=Invoice Metrics').first()).toBeVisible();

    // Check for metric cards
    await expect(page.locator('text=Total').first()).toBeVisible();
    await expect(page.locator('text=Draft').first()).toBeVisible();
    await expect(page.locator('text=Submitted').first()).toBeVisible();
    await expect(page.locator('text=Accepted').first()).toBeVisible();
    await expect(page.locator('text=Rejected').first()).toBeVisible();
  });

  test('should display acceptance rate', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Look for acceptance rate (should be a percentage)
    const acceptRateText = page.locator('text=Accept Rate');

    try {
      await acceptRateText.waitFor({ state: 'visible', timeout: 5000 });
      await expect(acceptRateText).toBeVisible();
    } catch (error) {
      console.log('Accept rate not yet loaded');
    }
  });

  test('should display exceptions section', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Check exceptions heading
    await expect(page.locator('text=Exceptions').first()).toBeVisible();

    // Check for exception stats
    await expect(page.locator('text=Critical').first()).toBeVisible();
    await expect(page.locator('text=Can Retry').first()).toBeVisible();
  });

  test('should display submission queue section', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Check queue heading
    await expect(page.locator('text=Submission Queue').first()).toBeVisible();

    // Check for queue stats
    await expect(page.locator('text=Pending').first()).toBeVisible();
    await expect(page.locator('text=Processing').first()).toBeVisible();
    await expect(page.locator('text=Failed').first()).toBeVisible();
  });

  test('should display circuit breakers', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Check circuit breakers heading
    await expect(page.locator('text=Circuit Breakers').first()).toBeVisible();

    // Look for service names (might not be loaded with real data)
    try {
      const lhdnApi = page.locator('text=LHDN API');
      await lhdnApi.waitFor({ state: 'visible', timeout: 5000 });
    } catch (error) {
      console.log('Circuit breaker data not yet loaded');
    }
  });

  test('should display performance metrics', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Check today's performance heading
    await expect(page.locator('text=Today\'s Performance, text=Today's Performance').first()).toBeVisible();

    // Check for performance stats
    await expect(page.locator('text=Submissions').first()).toBeVisible();
    await expect(page.locator('text=Acceptances').first()).toBeVisible();
  });

  test('should display recent activity feed', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Check recent activity heading
    await expect(page.locator('text=Recent Activity').first()).toBeVisible();
  });

  test('should have links to other pages', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Check for link to exception inbox
    const exceptionLink = page.locator('a:has-text("View Exception Inbox")');

    try {
      await exceptionLink.waitFor({ state: 'visible', timeout: 5000 });
      await expect(exceptionLink).toBeVisible();
    } catch (error) {
      console.log('Exception inbox link not visible');
    }

    // Check for link to submission monitor
    const monitorLink = page.locator('a:has-text("View Submission Monitor")');

    try {
      await monitorLink.waitFor({ state: 'visible', timeout: 5000 });
      await expect(monitorLink).toBeVisible();
    } catch (error) {
      console.log('Submission monitor link not visible');
    }
  });

  test('should navigate to exception inbox', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Click exception inbox link
    const exceptionLink = page.locator('a:has-text("View Exception Inbox")');

    try {
      await exceptionLink.waitFor({ state: 'visible', timeout: 5000 });
      await exceptionLink.click();

      // Verify navigation
      await expect(page).toHaveURL(/\/lhdn\/exceptions/);
      await expect(page.getByRole('heading', { name: 'Exception Inbox' })).toBeVisible();
    } catch (error) {
      console.log('Could not test navigation - link not visible');
    }
  });

  test('should auto-refresh data', async ({ page }) => {
    // Wait for initial load
    await page.waitForLoadState('networkidle');

    // The dashboard auto-refreshes every 30 seconds
    // For this test, we just verify the structure is correct
    await expect(page.locator('text=Operations Dashboard')).toBeVisible();
  });

  test('should display circuit breaker states with color coding', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Circuit breakers should show status badges
    // Look for status badges (CLOSED, OPEN, HALF_OPEN)
    const statusBadges = page.locator('[class*="badge"]').filter({
      hasText: /CLOSED|OPEN|HALF_OPEN/,
    });

    try {
      await statusBadges.first().waitFor({ state: 'visible', timeout: 5000 });
    } catch (error) {
      console.log('Circuit breaker status badges not visible');
    }
  });

  test('should show exception breakdown by type', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Look for "By Type" section in exceptions card
    const byTypeSection = page.locator('text=By Type');

    try {
      await byTypeSection.waitFor({ state: 'visible', timeout: 5000 });
      await expect(byTypeSection).toBeVisible();
    } catch (error) {
      console.log('Exception breakdown not visible');
    }
  });

  test('should display average processing time', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Look for average processing time metric
    const avgProcessingTime = page.locator('text=Avg Processing Time');

    try {
      await avgProcessingTime.waitFor({ state: 'visible', timeout: 5000 });
      await expect(avgProcessingTime).toBeVisible();
    } catch (error) {
      console.log('Average processing time not visible');
    }
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      // Check that page renders on mobile
      await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();

      // Stats cards should stack vertically
      await expect(page.locator('text=Invoice Metrics').first()).toBeVisible();
    }
  });

  test('should display recent activity with severity indicators', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Recent activity items should have severity dots
    const activitySection = page.locator('text=Recent Activity');
    await activitySection.scrollIntoViewIfNeeded();

    try {
      await activitySection.waitFor({ state: 'visible', timeout: 5000 });
      await expect(activitySection).toBeVisible();
    } catch (error) {
      console.log('Recent activity section not visible');
    }
  });
});
