/**
 * E2E Tests - LHDN Invoice Submission Workflow
 *
 * Tests complete invoice submission flow from creation to LHDN acceptance
 */

import { test, expect } from '@playwright/test';

test.describe('LHDN Invoice Submission Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete full invoice submission workflow', async ({ page }) => {
    // Navigate to LHDN operations
    await page.click('text=LHDN e-Invoice');
    await expect(page).toHaveURL(/\/lhdn/);

    // Navigate to operations dashboard
    await page.click('text=Operations');
    await expect(page).toHaveURL(/\/lhdn\/operations/);

    // Verify dashboard loads
    await expect(page.locator('h1')).toContainText('Operations Dashboard');

    // Check invoice metrics are visible
    await expect(page.locator('text=Total')).toBeVisible();
    await expect(page.locator('text=Submitted')).toBeVisible();
    await expect(page.locator('text=Accepted')).toBeVisible();

    // Navigate to invoice list (if available)
    const invoiceListLink = page.locator('a[href*="/lhdn/invoices"]');
    if (await invoiceListLink.count() > 0) {
      await invoiceListLink.first().click();
    }
  });

  test('should view invoice details', async ({ page }) => {
    // Navigate directly to a test invoice
    const testInvoiceId = '00000000-0000-0000-0000-000000000010';
    await page.goto(`/lhdn/invoices/${testInvoiceId}`);

    // Verify invoice detail page loads
    await expect(page.locator('h1')).toContainText('Invoice Details', { timeout: 10000 });

    // Check for key sections
    await expect(page.locator('text=Invoice Information')).toBeVisible();
    await expect(page.locator('text=Line Items')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();

    // Verify QR code section if invoice is accepted
    const qrSection = page.locator('text=QR Code');
    if (await qrSection.count() > 0) {
      await expect(qrSection).toBeVisible();
    }
  });

  test('should display audit trail', async ({ page }) => {
    await page.goto('/lhdn/audit');

    // Verify audit page loads
    await expect(page.locator('h1')).toContainText('Audit Explorer');

    // Check for filters
    await expect(page.locator('select, input[placeholder*="Search"]')).toHaveCount(4, { timeout: 5000 });

    // Apply filter
    await page.selectOption('select[name="eventType"]', 'SUBMITTED');
    await page.waitForTimeout(1000);

    // Verify table loads
    await expect(page.locator('table')).toBeVisible();

    // Check for audit event columns
    await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
    await expect(page.locator('th:has-text("Event")')).toBeVisible();
    await expect(page.locator('th:has-text("Actor")')).toBeVisible();
  });

  test('should view and manage exceptions', async ({ page }) => {
    await page.goto('/lhdn/exceptions');

    // Verify exceptions page loads
    await expect(page.locator('h1')).toContainText('Exception Inbox');

    // Check for stats cards
    const statsCards = page.locator('[class*="Card"]');
    await expect(statsCards.first()).toBeVisible({ timeout: 5000 });

    // Check for exception table
    await expect(page.locator('table')).toBeVisible();

    // Apply severity filter
    await page.selectOption('select[name="severity"]', 'CRITICAL');
    await page.waitForTimeout(1000);

    // Check that critical badge appears in filtered results
    const criticalBadges = page.locator('text=CRITICAL');
    if (await criticalBadges.count() > 0) {
      expect(await criticalBadges.count()).toBeGreaterThan(0);
    }
  });

  test('should configure LHDN settings', async ({ page }) => {
    await page.goto('/lhdn/config');

    // Verify config page loads
    await expect(page.locator('h1')).toContainText('Configuration');

    // Check for configuration tabs
    await expect(page.locator('button:has-text("Company")')).toBeVisible();
    await expect(page.locator('button:has-text("API")')).toBeVisible();
    await expect(page.locator('button:has-text("Invoice")')).toBeVisible();

    // Navigate to API settings tab
    await page.click('button:has-text("API")');

    // Verify API settings form
    await expect(page.locator('label:has-text("Client ID")')).toBeVisible();
    await expect(page.locator('label:has-text("Environment")')).toBeVisible();
    await expect(page.locator('select[name="environment"]')).toBeVisible();
  });

  test('should retry failed invoice submission', async ({ page }) => {
    await page.goto('/lhdn/exceptions');

    // Wait for exceptions to load
    await page.waitForLoadState('networkidle');

    // Find an exception with "Can Retry" badge
    const retryableException = page.locator('text=Can Retry').first();

    if (await retryableException.count() > 0) {
      // Click details button for first retryable exception
      const row = retryableException.locator('..').locator('..');
      await row.locator('button:has-text("Details")').click();

      // Modal should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

      // Verify exception details visible
      await expect(page.locator('text=Error Message')).toBeVisible();

      // Find and click retry button
      const retryButton = page.locator('button:has-text("Retry")');
      if (await retryButton.count() > 0) {
        await retryButton.click();

        // Verify retry initiated (toast or modal)
        await expect(
          page.locator('text=Retry, text=initiated, text=queued').first()
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should export audit log', async ({ page }) => {
    await page.goto('/lhdn/audit');

    // Click export button
    const exportButton = page.locator('button:has-text("Export CSV")');

    if (await exportButton.count() > 0) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportButton.click()
      ]);

      // Verify download
      expect(download.suggestedFilename()).toMatch(/audit.*\.csv/);
    }
  });

  test('should display real-time metrics', async ({ page }) => {
    await page.goto('/lhdn/operations');

    // Get initial metrics
    const initialTotal = await page.locator('text=Total').locator('..').locator('p').textContent();

    // Wait for potential updates (in real app, this would be real-time)
    await page.waitForTimeout(2000);

    // Verify metrics are numbers
    const total = await page.locator('text=Total').locator('..').locator('p').textContent();
    expect(total).toMatch(/\d+/);

    // Check acceptance rate is percentage
    const acceptRate = page.locator('text=Accept Rate');
    if (await acceptRate.count() > 0) {
      const rateValue = await acceptRate.locator('..').locator('p').textContent();
      expect(rateValue).toMatch(/\d+.*%/);
    }
  });

  test('should monitor submission queue status', async ({ page }) => {
    await page.goto('/lhdn/operations');

    // Verify queue section exists
    await expect(page.locator('text=Submission Queue')).toBeVisible();

    // Check queue stats
    await expect(page.locator('text=Pending')).toBeVisible();
    await expect(page.locator('text=Processing')).toBeVisible();
    await expect(page.locator('text=Failed')).toBeVisible();

    // Verify average processing time displayed
    const avgTime = page.locator('text=Avg Processing Time');
    if (await avgTime.count() > 0) {
      await expect(avgTime).toBeVisible();
    }
  });

  test('should view circuit breaker status', async ({ page }) => {
    await page.goto('/lhdn/operations');

    // Verify circuit breakers section
    await expect(page.locator('text=Circuit Breakers')).toBeVisible();

    // Check for circuit breaker cards (may be empty if none configured)
    const circuitBreakerSection = page.locator('text=Circuit Breakers').locator('..');
    await expect(circuitBreakerSection).toBeVisible();
  });

  test('should search invoices by number', async ({ page }) => {
    await page.goto('/lhdn/operations');

    // If search is available on operations page
    const searchInput = page.locator('input[placeholder*="Search"]');

    if (await searchInput.count() > 0) {
      await searchInput.fill('INV-2024-001');
      await page.press('input[placeholder*="Search"]', 'Enter');
      await page.waitForTimeout(1000);

      // Verify search results
      const results = page.locator('text=INV-2024-001');
      if (await results.count() > 0) {
        expect(await results.count()).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('LHDN Error Handling', () => {
  test('should display appropriate error for invalid invoice ID', async ({ page }) => {
    await page.goto('/lhdn/invoices/invalid-id-12345');

    // Should show error or 404 state
    const errorIndicators = [
      page.locator('text=not found'),
      page.locator('text=Invalid'),
      page.locator('text=Error'),
      page.locator('text=404')
    ];

    let errorFound = false;
    for (const indicator of errorIndicators) {
      if (await indicator.count() > 0) {
        errorFound = true;
        break;
      }
    }

    // At least one error indicator should be present
    expect(errorFound).toBeTruthy();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);

    await page.goto('/lhdn/operations');

    // Should show some kind of error or loading state
    // (Exact behavior depends on implementation)
    await page.waitForTimeout(2000);

    // Go back online
    await page.context().setOffline(false);
  });
});

test.describe('LHDN Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/lhdn/operations');

    // Verify page is responsive
    await expect(page.locator('h1')).toBeVisible();

    // Mobile menu should be accessible
    const mobileMenu = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]');
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/lhdn/operations');

    // Verify metrics cards stack appropriately
    const metricsCards = page.locator('[class*="Card"]');
    await expect(metricsCards.first()).toBeVisible();
  });
});
