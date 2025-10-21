/**
 * Module-Specific Workflow Permutations
 * Tests all workflows for each compliance module
 */

import { test, expect } from '../fixtures/auth-fixtures';
import { UserRole, WorkflowType } from '../fixtures/test-data-factory';

// ============================================================================
// SOD CONTROL MODULE WORKFLOWS
// ============================================================================

test.describe('SoD Control - Complete Workflows', () => {
  const workflows = [
    WorkflowType.SOD_RUN_ANALYSIS,
    WorkflowType.SOD_VIEW_VIOLATIONS,
    WorkflowType.SOD_APPROVE_VIOLATION,
    WorkflowType.SOD_REJECT_VIOLATION,
    WorkflowType.SOD_EXPORT_REPORT,
    WorkflowType.SOD_CONFIGURE_RULES,
  ];

  const authorizedRoles = [
    UserRole.SUPER_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
  ];

  for (const role of authorizedRoles) {
    test.describe(`${role} - SoD workflows`, () => {
      workflows.forEach((workflow) => {
        test(`${workflow}`, async ({
          authHelper,
          navigationHelper,
          assertionHelper,
          testTenant,
          page,
        }) => {
          await authHelper.loginAsRole(role, testTenant);
          await navigationHelper.goToModule('sod-control');

          switch (workflow) {
            case WorkflowType.SOD_RUN_ANALYSIS:
              test.step('Run SoD analysis', async () => {
                await page.click('[data-testid="run-analysis-button"]');
                await page.waitForSelector('[data-testid="analysis-progress"]');
                await expect(page.locator('text=/Analysis complete/i')).toBeVisible({
                  timeout: 30000,
                });
              });
              break;

            case WorkflowType.SOD_VIEW_VIOLATIONS:
              test.step('View violations', async () => {
                await assertionHelper.assertElementVisible('[data-testid="violations-table"]');
                const violationCount = await page.locator('[data-testid="violation-row"]').count();
                console.log(`Found ${violationCount} violations`);
              });
              break;

            case WorkflowType.SOD_APPROVE_VIOLATION:
              test.step('Approve violation', async () => {
                const firstViolation = page.locator('[data-testid="violation-row"]').first();
                await firstViolation.locator('[data-testid="approve-button"]').click();
                await page.fill('[name="approvalComment"]', 'Approved for testing');
                await page.click('[data-testid="confirm-approve-button"]');
                await expect(page.locator('text=/Violation approved/i')).toBeVisible();
              });
              break;

            case WorkflowType.SOD_REJECT_VIOLATION:
              test.step('Reject violation', async () => {
                const firstViolation = page.locator('[data-testid="violation-row"]').first();
                await firstViolation.locator('[data-testid="reject-button"]').click();
                await page.fill('[name="rejectionReason"]', 'False positive');
                await page.click('[data-testid="confirm-reject-button"]');
                await expect(page.locator('text=/Violation rejected/i')).toBeVisible();
              });
              break;

            case WorkflowType.SOD_EXPORT_REPORT:
              test.step('Export report', async () => {
                await page.click('[data-testid="export-button"]');
                await page.selectOption('[name="exportFormat"]', 'PDF');
                await page.click('[data-testid="confirm-export-button"]');
                await expect(page.locator('text=/Export started/i')).toBeVisible();
              });
              break;

            case WorkflowType.SOD_CONFIGURE_RULES:
              test.step('Configure rules', async () => {
                await page.click('[data-testid="settings-button"]');
                await page.click('[data-testid="rules-tab"]');
                await page.fill('[name="conflictThreshold"]', '0.85');
                await page.click('[data-testid="save-settings-button"]');
                await expect(page.locator('text=/Settings saved/i')).toBeVisible();
              });
              break;
          }
        });
      });
    });
  }
});

// ============================================================================
// INVOICE MATCHING MODULE WORKFLOWS
// ============================================================================

test.describe('Invoice Matching - Complete Workflows', () => {
  const workflows = [
    WorkflowType.INVOICE_RUN_MATCHING,
    WorkflowType.INVOICE_VIEW_MISMATCHES,
    WorkflowType.INVOICE_INVESTIGATE_FRAUD,
    WorkflowType.INVOICE_APPROVE_MATCH,
    WorkflowType.INVOICE_EXPORT_RESULTS,
  ];

  const authorizedRoles = [
    UserRole.SUPER_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.FINANCE_MANAGER,
    UserRole.PROCUREMENT_MANAGER,
  ];

  for (const role of authorizedRoles) {
    test.describe(`${role} - Invoice matching workflows`, () => {
      workflows.forEach((workflow) => {
        test(`${workflow}`, async ({
          authHelper,
          navigationHelper,
          page,
          testTenant,
        }) => {
          await authHelper.loginAsRole(role, testTenant);
          await navigationHelper.goToModule('invoice-matching');

          switch (workflow) {
            case WorkflowType.INVOICE_RUN_MATCHING:
              test.step('Run three-way matching', async () => {
                await page.click('[data-testid="run-matching-button"]');
                await page.selectOption('[name="matchingScope"]', 'all');
                await page.fill('[name="tolerancePercentage"]', '5');
                await page.click('[data-testid="start-matching-button"]');
                await expect(page.locator('text=/Matching in progress/i')).toBeVisible();
              });
              break;

            case WorkflowType.INVOICE_VIEW_MISMATCHES:
              test.step('View mismatches', async () => {
                await page.click('[data-testid="mismatches-tab"]');
                const mismatchCount = await page.locator('[data-testid="mismatch-row"]').count();
                console.log(`Found ${mismatchCount} mismatches`);
              });
              break;

            case WorkflowType.INVOICE_INVESTIGATE_FRAUD:
              test.step('Investigate fraud alert', async () => {
                await page.click('[data-testid="fraud-alerts-tab"]');
                const firstAlert = page.locator('[data-testid="fraud-alert"]').first();
                await firstAlert.click();
                await expect(page.locator('[data-testid="fraud-evidence"]')).toBeVisible();
                await page.click('[data-testid="investigate-button"]');
                await page.fill('[name="investigationNotes"]', 'Reviewing evidence');
                await page.click('[data-testid="save-investigation-button"]');
              });
              break;

            case WorkflowType.INVOICE_APPROVE_MATCH:
              test.step('Approve matched invoice', async () => {
                const firstMatch = page.locator('[data-testid="match-row"]').first();
                await firstMatch.locator('[data-testid="approve-button"]').click();
                await page.click('[data-testid="confirm-approve-button"]');
                await expect(page.locator('text=/Invoice approved/i')).toBeVisible();
              });
              break;

            case WorkflowType.INVOICE_EXPORT_RESULTS:
              test.step('Export matching results', async () => {
                await page.click('[data-testid="export-button"]');
                await page.selectOption('[name="exportFormat"]', 'Excel');
                await page.check('[name="includeFraudAlerts"]');
                await page.click('[data-testid="confirm-export-button"]');
                await expect(page.locator('text=/Export complete/i')).toBeVisible();
              });
              break;
          }
        });
      });
    });
  }
});

// ============================================================================
// GL ANOMALY DETECTION MODULE WORKFLOWS
// ============================================================================

test.describe('GL Anomaly Detection - Complete Workflows', () => {
  const workflows = [
    WorkflowType.GL_RUN_DETECTION,
    WorkflowType.GL_VIEW_ANOMALIES,
    WorkflowType.GL_MARK_FALSE_POSITIVE,
    WorkflowType.GL_EXPORT_ANOMALIES,
  ];

  const authorizedRoles = [UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER, UserRole.AUDITOR];

  for (const role of authorizedRoles) {
    test.describe(`${role} - GL anomaly workflows`, () => {
      workflows.forEach((workflow) => {
        test(`${workflow}`, async ({
          authHelper,
          navigationHelper,
          page,
          testTenant,
        }) => {
          await authHelper.loginAsRole(role, testTenant);
          await navigationHelper.goToModule('gl-anomaly-detection');

          switch (workflow) {
            case WorkflowType.GL_RUN_DETECTION:
              test.step('Run anomaly detection', async () => {
                await page.click('[data-testid="run-detection-button"]');
                await page.selectOption('[name="fiscalYear"]', '2024');
                await page.selectOption('[name="fiscalPeriod"]', '001');
                await page.check('[name="enableBenfordsLaw"]');
                await page.check('[name="enableOutlierDetection"]');
                await page.click('[data-testid="start-detection-button"]');
                await expect(page.locator('text=/Detection running/i')).toBeVisible();
              });
              break;

            case WorkflowType.GL_VIEW_ANOMALIES:
              test.step('View detected anomalies', async () => {
                const anomalyCount = await page.locator('[data-testid="anomaly-row"]').count();
                console.log(`Found ${anomalyCount} anomalies`);

                // Filter by type
                await page.selectOption('[name="anomalyTypeFilter"]', 'STATISTICAL_OUTLIER');
                const filteredCount = await page.locator('[data-testid="anomaly-row"]').count();
                console.log(`Filtered to ${filteredCount} statistical outliers`);
              });
              break;

            case WorkflowType.GL_MARK_FALSE_POSITIVE:
              test.step('Mark false positive', async () => {
                const firstAnomaly = page.locator('[data-testid="anomaly-row"]').first();
                await firstAnomaly.click();
                await page.click('[data-testid="mark-false-positive-button"]');
                await page.fill('[name="falsePositiveReason"]', 'Expected variance');
                await page.click('[data-testid="confirm-false-positive-button"]');
                await expect(page.locator('text=/Marked as false positive/i')).toBeVisible();
              });
              break;

            case WorkflowType.GL_EXPORT_ANOMALIES:
              test.step('Export anomalies', async () => {
                await page.click('[data-testid="export-button"]');
                await page.selectOption('[name="exportFormat"]', 'CSV');
                await page.check('[name="includeEvidence"]');
                await page.click('[data-testid="confirm-export-button"]');
                await expect(page.locator('text=/Export started/i')).toBeVisible();
              });
              break;
          }
        });
      });
    });
  }
});

// ============================================================================
// LHDN E-INVOICE MODULE WORKFLOWS
// ============================================================================

test.describe('LHDN e-Invoice - Complete Workflows', () => {
  const workflows = [
    WorkflowType.LHDN_SUBMIT_INVOICE,
    WorkflowType.LHDN_CHECK_STATUS,
    WorkflowType.LHDN_CANCEL_INVOICE,
    WorkflowType.LHDN_VIEW_EXCEPTIONS,
    WorkflowType.LHDN_CONFIGURE_SETTINGS,
  ];

  const authorizedRoles = [UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER, UserRole.FINANCE_USER];

  for (const role of authorizedRoles) {
    test.describe(`${role} - LHDN workflows`, () => {
      workflows.forEach((workflow) => {
        test(`${workflow}`, async ({
          authHelper,
          navigationHelper,
          page,
          testTenant,
        }) => {
          await authHelper.loginAsRole(role, testTenant);
          await navigationHelper.goToModule('lhdn-einvoice');

          switch (workflow) {
            case WorkflowType.LHDN_SUBMIT_INVOICE:
              test.step('Submit invoice to LHDN', async () => {
                await page.click('[data-testid="submit-invoice-button"]');
                await page.fill('[name="invoiceNumber"]', 'INV-2024-001');
                await page.fill('[name="amount"]', '10000.00');
                await page.selectOption('[name="invoiceType"]', '01'); // Normal invoice
                await page.click('[data-testid="validate-invoice-button"]');
                await expect(page.locator('text=/Validation passed/i')).toBeVisible();
                await page.click('[data-testid="confirm-submit-button"]');
                await expect(page.locator('text=/Submitted successfully/i')).toBeVisible();
              });
              break;

            case WorkflowType.LHDN_CHECK_STATUS:
              test.step('Check invoice status', async () => {
                await page.fill('[name="invoiceSearch"]', 'INV-2024-001');
                await page.click('[data-testid="search-button"]');
                const status = await page.locator('[data-testid="invoice-status"]').textContent();
                console.log(`Invoice status: ${status}`);
                expect(status).toMatch(/Submitted|Accepted|Rejected/);
              });
              break;

            case WorkflowType.LHDN_CANCEL_INVOICE:
              test.step('Cancel submitted invoice', async () => {
                await page.locator('[data-testid="invoice-row"]').first().click();
                await page.click('[data-testid="cancel-invoice-button"]');
                await page.fill('[name="cancellationReason"]', 'Invoice error');
                await page.click('[data-testid="confirm-cancel-button"]');
                await expect(page.locator('text=/Cancellation submitted/i')).toBeVisible();
              });
              break;

            case WorkflowType.LHDN_VIEW_EXCEPTIONS:
              test.step('View exceptions', async () => {
                await page.click('[data-testid="exceptions-tab"]');
                const exceptionCount = await page.locator('[data-testid="exception-row"]').count();
                console.log(`Found ${exceptionCount} exceptions`);
              });
              break;

            case WorkflowType.LHDN_CONFIGURE_SETTINGS:
              if (role !== UserRole.FINANCE_USER) {
                test.step('Configure LHDN settings', async () => {
                  await page.click('[data-testid="settings-button"]');
                  await page.fill('[name="lhdnApiUrl"]', 'https://api.lhdn.gov.my');
                  await page.fill('[name="clientId"]', 'test-client-id');
                  await page.check('[name="enableAutoRetry"]');
                  await page.click('[data-testid="save-settings-button"]');
                  await expect(page.locator('text=/Settings saved/i')).toBeVisible();
                });
              }
              break;
          }
        });
      });
    });
  }
});

// ============================================================================
// VENDOR DATA QUALITY MODULE WORKFLOWS
// ============================================================================

test.describe('Vendor Data Quality - Complete Workflows', () => {
  const workflows = [
    WorkflowType.VENDOR_RUN_DEDUP,
    WorkflowType.VENDOR_VIEW_DUPLICATES,
    WorkflowType.VENDOR_MERGE_VENDORS,
    WorkflowType.VENDOR_EXPORT_REPORT,
  ];

  const authorizedRoles = [
    UserRole.SUPER_ADMIN,
    UserRole.PROCUREMENT_MANAGER,
    UserRole.FINANCE_MANAGER,
  ];

  for (const role of authorizedRoles) {
    test.describe(`${role} - Vendor quality workflows`, () => {
      workflows.forEach((workflow) => {
        test(`${workflow}`, async ({
          authHelper,
          navigationHelper,
          page,
          testTenant,
        }) => {
          await authHelper.loginAsRole(role, testTenant);
          await navigationHelper.goToModule('vendor-data-quality');

          switch (workflow) {
            case WorkflowType.VENDOR_RUN_DEDUP:
              test.step('Run deduplication', async () => {
                await page.click('[data-testid="run-dedup-button"]');
                await page.fill('[name="similarityThreshold"]', '0.85');
                await page.check('[name="checkName"]');
                await page.check('[name="checkAddress"]');
                await page.check('[name="checkTaxId"]');
                await page.click('[data-testid="start-dedup-button"]');
                await expect(page.locator('text=/Deduplication running/i')).toBeVisible();
              });
              break;

            case WorkflowType.VENDOR_VIEW_DUPLICATES:
              test.step('View duplicate clusters', async () => {
                const clusterCount = await page.locator('[data-testid="cluster-card"]').count();
                console.log(`Found ${clusterCount} duplicate clusters`);

                // Sort by savings
                await page.selectOption('[name="sortBy"]', 'savings');
                const topCluster = page.locator('[data-testid="cluster-card"]').first();
                await topCluster.click();
              });
              break;

            case WorkflowType.VENDOR_MERGE_VENDORS:
              test.step('Merge vendors', async () => {
                const cluster = page.locator('[data-testid="cluster-card"]').first();
                await cluster.click();
                await page.click('[data-testid="merge-vendors-button"]');
                await page.selectOption('[name="masterVendor"]', 'V001');
                await page.click('[data-testid="confirm-merge-button"]');
                await expect(page.locator('text=/Vendors merged/i')).toBeVisible();
              });
              break;

            case WorkflowType.VENDOR_EXPORT_REPORT:
              test.step('Export quality report', async () => {
                await page.click('[data-testid="export-button"]');
                await page.selectOption('[name="exportFormat"]', 'PDF');
                await page.check('[name="includeDuplicates"]');
                await page.check('[name="includeDataQuality"]');
                await page.click('[data-testid="confirm-export-button"]');
                await expect(page.locator('text=/Export complete/i')).toBeVisible();
              });
              break;
          }
        });
      });
    });
  }
});

// ============================================================================
// USER ACCESS REVIEW MODULE WORKFLOWS
// ============================================================================

test.describe('User Access Review - Complete Workflows', () => {
  const workflows = [
    WorkflowType.UAR_RUN_REVIEW,
    WorkflowType.UAR_VIEW_VIOLATIONS,
    WorkflowType.UAR_REMEDIATE_ACCESS,
    WorkflowType.UAR_EXPORT_REPORT,
  ];

  const authorizedRoles = [
    UserRole.SUPER_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.HR_MANAGER,
  ];

  for (const role of authorizedRoles) {
    test.describe(`${role} - User access review workflows`, () => {
      workflows.forEach((workflow) => {
        test(`${workflow}`, async ({
          authHelper,
          navigationHelper,
          page,
          testTenant,
        }) => {
          await authHelper.loginAsRole(role, testTenant);
          await navigationHelper.goToModule('user-access-review');

          switch (workflow) {
            case WorkflowType.UAR_RUN_REVIEW:
              test.step('Run access review', async () => {
                await page.click('[data-testid="run-review-button"]');
                await page.check('[name="includeInactiveUsers"]');
                await page.selectOption('[name="reviewScope"]', 'all');
                await page.click('[data-testid="start-review-button"]');
                await expect(page.locator('text=/Review in progress/i')).toBeVisible();
              });
              break;

            case WorkflowType.UAR_VIEW_VIOLATIONS:
              test.step('View access violations', async () => {
                const violationCount = await page.locator('[data-testid="violation-row"]').count();
                console.log(`Found ${violationCount} access violations`);

                // Filter high risk
                await page.selectOption('[name="riskFilter"]', 'high');
                const highRiskCount = await page.locator('[data-testid="violation-row"]').count();
                console.log(`${highRiskCount} high-risk violations`);
              });
              break;

            case WorkflowType.UAR_REMEDIATE_ACCESS:
              test.step('Remediate access', async () => {
                const firstViolation = page.locator('[data-testid="violation-row"]').first();
                await firstViolation.click();
                await page.click('[data-testid="remediate-button"]');
                await page.selectOption('[name="remediationAction"]', 'revoke');
                await page.fill('[name="remediationNotes"]', 'Excessive privileges');
                await page.click('[data-testid="confirm-remediation-button"]');
                await expect(page.locator('text=/Remediation initiated/i')).toBeVisible();
              });
              break;

            case WorkflowType.UAR_EXPORT_REPORT:
              test.step('Export review report', async () => {
                await page.click('[data-testid="export-button"]');
                await page.selectOption('[name="exportFormat"]', 'Excel');
                await page.check('[name="includeRecommendations"]');
                await page.click('[data-testid="confirm-export-button"]');
                await expect(page.locator('text=/Export complete/i')).toBeVisible();
              });
              break;
          }
        });
      });
    });
  }
});

test.afterAll(async () => {
  const moduleWorkflows = {
    'SoD Control': 6,
    'Invoice Matching': 5,
    'GL Anomaly Detection': 4,
    'LHDN e-Invoice': 5,
    'Vendor Data Quality': 4,
    'User Access Review': 4,
  };

  const totalWorkflows = Object.values(moduleWorkflows).reduce((a, b) => a + b, 0);

  console.log('\n=== Module Workflow Test Summary ===');
  console.log(`Total modules tested: ${Object.keys(moduleWorkflows).length}`);
  console.log(`Total workflows tested: ${totalWorkflows}`);
  console.log('\nWorkflows per module:');
  Object.entries(moduleWorkflows).forEach(([module, count]) => {
    console.log(`  ${module}: ${count} workflows`);
  });
  console.log('====================================\n');
});
