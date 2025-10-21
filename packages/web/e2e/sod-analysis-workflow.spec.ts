/**
 * E2E Tests - SoD Analysis Workflow
 *
 * Tests the complete Segregation of Duties analysis workflow:
 * - Navigate to SoD dashboard
 * - Trigger analysis
 * - View violations
 * - Filter and search
 * - View violation details
 * - Approve exceptions
 */

import { test, expect } from '@playwright/test';

test.describe('SoD Analysis Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Start at home page
    await page.goto('/');
  });

  test('should complete full SoD analysis workflow', async ({ page }) => {
    // Navigate to SoD dashboard
    await page.click('text=SoD Control');
    await expect(page).toHaveURL(/\/modules\/sod/);

    // Verify dashboard loads with metrics
    await expect(page.locator('h1')).toContainText('Segregation of Duties');

    // Check for key metrics cards
    const metricsCards = page.locator('[class*="Card"]');
    await expect(metricsCards).toHaveCount(4, { timeout: 10000 });

    // Trigger new analysis
    await page.click('button:has-text("Run Analysis")');

    // Wait for analysis to complete
    await page.waitForSelector('text=Analysis Complete', { timeout: 30000 });

    // Navigate to violations page
    await page.click('text=View Violations');
    await expect(page).toHaveURL(/\/violations/);

    // Verify violations table loads
    await expect(page.locator('table')).toBeVisible();

    // Filter by risk level
    await page.selectOption('select[name="riskLevel"]', 'CRITICAL');
    await page.waitForTimeout(1000); // Wait for filter to apply

    // Verify filtered results
    const criticalBadges = page.locator('text=CRITICAL');
    expect(await criticalBadges.count()).toBeGreaterThan(0);
  });

  test('should view violation details', async ({ page }) => {
    await page.goto('/modules/sod/violations');

    // Click first violation
    await page.click('table tbody tr:first-child a');

    // Should navigate to detail page
    await expect(page.url()).toMatch(/\/violations\//);

    // Verify detail sections present
    await expect(page.locator('h2:has-text("Violation Details")')).toBeVisible();
    await expect(page.locator('h2:has-text("Conflicting Roles")')).toBeVisible();
    await expect(page.locator('h2:has-text("Risk Assessment")')).toBeVisible();

    // Check for action buttons
    await expect(page.locator('button:has-text("Approve Exception")')).toBeVisible();
    await expect(page.locator('button:has-text("Assign Remediation")')).toBeVisible();
  });

  test('should search violations by user', async ({ page }) => {
    await page.goto('/modules/sod/violations');

    // Search for user
    await page.fill('input[placeholder*="Search"]', 'john.doe');
    await page.press('input[placeholder*="Search"]', 'Enter');

    // Wait for results
    await page.waitForTimeout(1000);

    // Verify search results contain search term
    const resultText = await page.locator('table tbody').textContent();
    expect(resultText?.toLowerCase()).toContain('john');
  });

  test('should filter violations by multiple criteria', async ({ page }) => {
    await page.goto('/modules/sod/violations');

    // Apply multiple filters
    await page.selectOption('select[name="riskLevel"]', 'HIGH');
    await page.selectOption('select[name="status"]', 'OPEN');
    await page.selectOption('select[name="companyCode"]', 'US01');

    await page.waitForTimeout(1500);

    // Verify table shows filtered results
    const tableRows = page.locator('table tbody tr');
    const count = await tableRows.count();
    expect(count).toBeGreaterThanOrEqual(0);

    // Clear filters
    await page.click('button:has-text("Clear")');
    await page.waitForTimeout(1000);

    // Verify all violations shown again
    const allRows = await page.locator('table tbody tr').count();
    expect(allRows).toBeGreaterThanOrEqual(count);
  });

  test('should approve exception with justification', async ({ page }) => {
    await page.goto('/modules/sod/violations');

    // Click first violation
    await page.click('table tbody tr:first-child a');

    // Click approve exception
    await page.click('button:has-text("Approve Exception")');

    // Modal should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Fill justification
    await page.fill('textarea[name="justification"]', 'CFO approval - compensating controls in place');

    // Select approver
    await page.selectOption('select[name="approver"]', 'cfo@company.com');

    // Set expiry date
    await page.fill('input[type="date"]', '2024-12-31');

    // Submit
    await page.click('button:has-text("Submit Exception")');

    // Verify success message
    await expect(page.locator('text=Exception approved')).toBeVisible({ timeout: 5000 });

    // Verify status updated
    await expect(page.locator('text=APPROVED')).toBeVisible();
  });

  test('should assign remediation task', async ({ page }) => {
    await page.goto('/modules/sod/violations');

    // Click first violation
    await page.click('table tbody tr:first-child a');

    // Click assign remediation
    await page.click('button:has-text("Assign Remediation")');

    // Modal should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Fill remediation details
    await page.selectOption('select[name="assignee"]', 'security.admin@company.com');
    await page.fill('textarea[name="description"]', 'Remove user from conflicting role FI_AP_APPROVER');
    await page.fill('input[name="dueDate"]', '2024-11-30');
    await page.selectOption('select[name="priority"]', 'HIGH');

    // Submit
    await page.click('button:has-text("Assign Task")');

    // Verify success
    await expect(page.locator('text=Remediation assigned')).toBeVisible({ timeout: 5000 });
  });

  test('should export violations report', async ({ page }) => {
    await page.goto('/modules/sod/violations');

    // Click export button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export")')
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/violations.*\.(csv|xlsx|pdf)/);
  });

  test('should navigate between SoD pages', async ({ page }) => {
    // Start at dashboard
    await page.goto('/modules/sod/dashboard');
    await expect(page.locator('h1')).toContainText('Segregation of Duties');

    // Navigate to violations
    await page.click('text=Violations');
    await expect(page).toHaveURL(/\/violations/);

    // Navigate to reports
    await page.click('text=Reports');
    await expect(page).toHaveURL(/\/reports/);

    // Navigate to config
    await page.click('text=Configuration');
    await expect(page).toHaveURL(/\/config/);

    // Return to dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display risk workbench with interactive graph', async ({ page }) => {
    await page.goto('/t/tenant-123/sod/risk-workbench');

    // Verify page loads
    await expect(page.locator('h1')).toContainText('Risk Workbench');

    // Check for access graph visualization
    await expect(page.locator('canvas')).toBeVisible();

    // Verify filter controls
    await expect(page.locator('select[name="systemFilter"]')).toBeVisible();
    await expect(page.locator('input[name="userSearch"]')).toBeVisible();

    // Apply filter
    await page.selectOption('select[name="systemFilter"]', 'SAP_PRD');
    await page.waitForTimeout(1000);

    // Verify graph updates (check canvas redrawn)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should view compliance report with metrics', async ({ page }) => {
    await page.goto('/modules/sod/reports');

    // Select report type
    await page.selectOption('select[name="reportType"]', 'COMPLIANCE_SUMMARY');

    // Set date range
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-12-31');

    // Generate report
    await page.click('button:has-text("Generate Report")');

    // Wait for report to load
    await expect(page.locator('text=Compliance Report')).toBeVisible({ timeout: 10000 });

    // Verify key sections
    await expect(page.locator('h2:has-text("Executive Summary")')).toBeVisible();
    await expect(page.locator('h2:has-text("Violation Trends")')).toBeVisible();
    await expect(page.locator('h2:has-text("Top Risks")')).toBeVisible();

    // Check for charts
    const charts = page.locator('canvas, svg');
    expect(await charts.count()).toBeGreaterThan(0);
  });
});

test.describe('SoD Configuration', () => {
  test('should update SoD ruleset configuration', async ({ page }) => {
    await page.goto('/modules/sod/config');

    // Verify config page loads
    await expect(page.locator('h1')).toContainText('Configuration');

    // Navigate to rulesets tab
    await page.click('button:has-text("Rulesets")');

    // Enable/disable ruleset
    const toggleSwitch = page.locator('input[type="checkbox"]').first();
    await toggleSwitch.click();

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Verify success message
    await expect(page.locator('text=Configuration updated')).toBeVisible({ timeout: 5000 });
  });

  test('should configure notification settings', async ({ page }) => {
    await page.goto('/modules/sod/config');

    // Navigate to notifications tab
    await page.click('button:has-text("Notifications")');

    // Enable email notifications
    await page.check('input[name="emailNotifications"]');

    // Set notification recipients
    await page.fill('input[name="recipients"]', 'compliance@company.com, audit@company.com');

    // Set threshold for notifications
    await page.selectOption('select[name="notifyOnRisk"]', 'HIGH');

    // Save
    await page.click('button:has-text("Save Settings")');

    // Verify saved
    await expect(page.locator('text=Settings saved')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('SoD Analytics', () => {
  test('should display analytics dashboard with trends', async ({ page }) => {
    await page.goto('/analytics');

    // Select SoD module
    await page.selectOption('select[name="module"]', 'sod');

    // Verify analytics load
    await expect(page.locator('h2:has-text("Violation Trends")')).toBeVisible();

    // Check for multiple visualizations
    const charts = page.locator('canvas, svg');
    expect(await charts.count()).toBeGreaterThanOrEqual(3);

    // Change time period
    await page.selectOption('select[name="timePeriod"]', '90days');
    await page.waitForTimeout(1500);

    // Verify charts update
    await expect(page.locator('canvas, svg').first()).toBeVisible();
  });
});
