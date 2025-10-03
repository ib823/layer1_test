/**
 * End-to-End Test Script for SoD Analysis
 *
 * Tests the complete flow:
 * 1. Database connection
 * 2. Create analysis run
 * 3. Store violations
 * 4. Retrieve violations with filters
 * 5. Update violation status
 * 6. Export to CSV
 * 7. Get statistics
 * 8. Cleanup
 *
 * Usage:
 *   ts-node test-sod-e2e.ts
 *
 * Prerequisites:
 *   - PostgreSQL database running
 *   - DATABASE_URL environment variable set
 *   - Tables created (schema.sql)
 */

import { Pool } from 'pg';

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`\n${colors.blue}▶${colors.reset} ${msg}`),
};

// Test configuration
const TEST_TENANT_ID = 'test-tenant-e2e-' + Date.now();
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sapframework';

interface TestResult {
  step: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class SoDEndToEndTest {
  private pool: Pool;
  private results: TestResult[] = [];
  private testAnalysisId?: string;
  private testViolationIds: string[] = [];

  constructor() {
    this.pool = new Pool({ connectionString: DATABASE_URL });
  }

  async run(): Promise<void> {
    log.info('Starting SoD End-to-End Test Suite');
    log.info(`Database: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);
    log.info(`Test Tenant ID: ${TEST_TENANT_ID}`);

    try {
      await this.testDatabaseConnection();
      await this.setupTestData();
      await this.testCreateAnalysisRun();
      await this.testStoreViolations();
      await this.testGetViolations();
      await this.testGetViolationById();
      await this.testUpdateViolationStatus();
      await this.testGetLatestAnalysis();
      await this.testGetViolationStats();
      await this.testDeleteOldViolations();
      await this.testCSVExport();

      await this.cleanup();
      this.printResults();
    } catch (error) {
      log.error(`Test suite failed: ${error}`);
      await this.cleanup();
      process.exit(1);
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 1: Database Connection');

      const result = await this.pool.query('SELECT NOW()');

      if (result.rows.length > 0) {
        log.success('Database connection established');
        this.recordResult('Database Connection', true, Date.now() - start);
      } else {
        throw new Error('No response from database');
      }
    } catch (error: any) {
      log.error(`Database connection failed: ${error.message}`);
      this.recordResult('Database Connection', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async setupTestData(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 2: Setup Test Data');

      // Create test tenant
      await this.pool.query(
        `INSERT INTO tenants (id, tenant_id, tenant_name, status)
         VALUES (gen_random_uuid(), $1, $2, 'active')
         ON CONFLICT (tenant_id) DO NOTHING`,
        [TEST_TENANT_ID, 'E2E Test Tenant']
      );

      log.success('Test tenant created');
      this.recordResult('Setup Test Data', true, Date.now() - start);
    } catch (error: any) {
      log.error(`Setup failed: ${error.message}`);
      this.recordResult('Setup Test Data', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testCreateAnalysisRun(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 3: Create Analysis Run');

      const result = await this.pool.query(
        `INSERT INTO sod_analysis_runs (tenant_id, status, total_users_analyzed, config)
         VALUES ($1, 'RUNNING', $2, $3)
         RETURNING id`,
        [TEST_TENANT_ID, 100, JSON.stringify({ minimumRiskScore: 5 })]
      );

      this.testAnalysisId = result.rows[0].id;
      log.success(`Analysis run created: ${this.testAnalysisId}`);
      this.recordResult('Create Analysis Run', true, Date.now() - start);
    } catch (error: any) {
      log.error(`Create analysis run failed: ${error.message}`);
      this.recordResult('Create Analysis Run', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testStoreViolations(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 4: Store Violations');

      const violations = [
        {
          userId: 'user-001',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          conflictType: 'CREATE_AND_APPROVE_PO',
          riskLevel: 'HIGH',
          conflictingRoles: ['Purchasing_Manager', 'Approver_Level_3'],
          affectedTransactions: ['ME21N', 'ME29N'],
          businessProcess: 'Procurement',
        },
        {
          userId: 'user-002',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          conflictType: 'POST_AND_VERIFY_INVOICE',
          riskLevel: 'MEDIUM',
          conflictingRoles: ['AP_Clerk', 'AP_Supervisor'],
          affectedTransactions: ['FB60', 'F-43'],
          businessProcess: 'Accounts Payable',
        },
        {
          userId: 'user-003',
          userName: 'Bob Johnson',
          userEmail: 'bob@example.com',
          conflictType: 'CREATE_AND_RELEASE_PAYMENT',
          riskLevel: 'HIGH',
          conflictingRoles: ['Payment_Clerk', 'Payment_Releaser'],
          affectedTransactions: ['F110', 'F-53'],
          businessProcess: 'Treasury',
        },
      ];

      for (const violation of violations) {
        const result = await this.pool.query(
          `INSERT INTO sod_violations (
            tenant_id, analysis_id, user_id, user_name, user_email,
            conflict_type, risk_level, conflicting_roles, affected_transactions,
            business_process, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id`,
          [
            TEST_TENANT_ID,
            this.testAnalysisId,
            violation.userId,
            violation.userName,
            violation.userEmail,
            violation.conflictType,
            violation.riskLevel,
            violation.conflictingRoles,
            violation.affectedTransactions,
            violation.businessProcess,
            'OPEN',
          ]
        );

        this.testViolationIds.push(result.rows[0].id);
      }

      log.success(`Stored ${violations.length} violations`);
      this.recordResult('Store Violations', true, Date.now() - start);
    } catch (error: any) {
      log.error(`Store violations failed: ${error.message}`);
      this.recordResult('Store Violations', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testGetViolations(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 5: Get Violations with Filters');

      // Test 1: Get all violations
      const allResult = await this.pool.query(
        'SELECT COUNT(*) FROM sod_violations WHERE tenant_id = $1',
        [TEST_TENANT_ID]
      );
      const allCount = parseInt(allResult.rows[0].count);
      log.success(`Found ${allCount} total violations`);

      // Test 2: Filter by risk level
      const highRiskResult = await this.pool.query(
        `SELECT COUNT(*) FROM sod_violations
         WHERE tenant_id = $1 AND risk_level = 'HIGH'`,
        [TEST_TENANT_ID]
      );
      const highCount = parseInt(highRiskResult.rows[0].count);
      log.success(`Found ${highCount} HIGH risk violations`);

      // Test 3: Filter by status
      const openResult = await this.pool.query(
        `SELECT COUNT(*) FROM sod_violations
         WHERE tenant_id = $1 AND status = 'OPEN'`,
        [TEST_TENANT_ID]
      );
      const openCount = parseInt(openResult.rows[0].count);
      log.success(`Found ${openCount} OPEN violations`);

      // Test 4: Pagination
      const pageResult = await this.pool.query(
        `SELECT * FROM sod_violations
         WHERE tenant_id = $1
         ORDER BY detected_at DESC
         LIMIT 2 OFFSET 0`,
        [TEST_TENANT_ID]
      );
      log.success(`Pagination works: Retrieved page 1 with ${pageResult.rows.length} results`);

      this.recordResult('Get Violations', true, Date.now() - start);
    } catch (error: any) {
      log.error(`Get violations failed: ${error.message}`);
      this.recordResult('Get Violations', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testGetViolationById(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 6: Get Violation By ID');

      const violationId = this.testViolationIds[0];
      const result = await this.pool.query(
        'SELECT * FROM sod_violations WHERE id = $1 AND tenant_id = $2',
        [violationId, TEST_TENANT_ID]
      );

      if (result.rows.length === 1) {
        const violation = result.rows[0];
        log.success(`Retrieved violation: ${violation.user_name} - ${violation.conflict_type}`);
        this.recordResult('Get Violation By ID', true, Date.now() - start);
      } else {
        throw new Error('Violation not found');
      }
    } catch (error: any) {
      log.error(`Get violation by ID failed: ${error.message}`);
      this.recordResult('Get Violation By ID', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testUpdateViolationStatus(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 7: Update Violation Status');

      const violationId = this.testViolationIds[0];

      // Acknowledge violation
      await this.pool.query(
        `UPDATE sod_violations
         SET status = 'ACKNOWLEDGED',
             remediation_notes = $1,
             acknowledged_by = $2,
             acknowledged_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        ['Business exception approved by management', 'admin@example.com', violationId]
      );

      // Verify update
      const result = await this.pool.query(
        'SELECT status, acknowledged_by FROM sod_violations WHERE id = $1',
        [violationId]
      );

      const violation = result.rows[0];
      if (violation.status === 'ACKNOWLEDGED' && violation.acknowledged_by === 'admin@example.com') {
        log.success('Violation status updated successfully');
        this.recordResult('Update Violation Status', true, Date.now() - start);
      } else {
        throw new Error('Status update verification failed');
      }
    } catch (error: any) {
      log.error(`Update violation status failed: ${error.message}`);
      this.recordResult('Update Violation Status', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testGetLatestAnalysis(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 8: Get Latest Analysis');

      // Complete the analysis run first
      await this.pool.query(
        `UPDATE sod_analysis_runs
         SET status = 'COMPLETED',
             violations_found = 3,
             high_risk_count = 2,
             medium_risk_count = 1,
             low_risk_count = 0,
             completed_at = NOW()
         WHERE id = $1`,
        [this.testAnalysisId]
      );

      // Get latest analysis
      const result = await this.pool.query(
        `SELECT * FROM sod_analysis_runs
         WHERE tenant_id = $1
         ORDER BY started_at DESC
         LIMIT 1`,
        [TEST_TENANT_ID]
      );

      if (result.rows.length === 1) {
        const analysis = result.rows[0];
        log.success(`Latest analysis: ${analysis.status} - ${analysis.violations_found} violations`);
        this.recordResult('Get Latest Analysis', true, Date.now() - start);
      } else {
        throw new Error('Analysis not found');
      }
    } catch (error: any) {
      log.error(`Get latest analysis failed: ${error.message}`);
      this.recordResult('Get Latest Analysis', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testGetViolationStats(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 9: Get Violation Statistics');

      const result = await this.pool.query(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE risk_level = 'HIGH') as high_risk,
           COUNT(*) FILTER (WHERE risk_level = 'MEDIUM') as medium_risk,
           COUNT(*) FILTER (WHERE risk_level = 'LOW') as low_risk,
           COUNT(*) FILTER (WHERE status = 'OPEN') as open,
           COUNT(*) FILTER (WHERE status = 'ACKNOWLEDGED') as acknowledged
         FROM sod_violations
         WHERE tenant_id = $1`,
        [TEST_TENANT_ID]
      );

      const stats = result.rows[0];
      log.success(`Statistics: Total=${stats.total}, High=${stats.high_risk}, Medium=${stats.medium_risk}, Open=${stats.open}, Ack=${stats.acknowledged}`);
      this.recordResult('Get Violation Stats', true, Date.now() - start);
    } catch (error: any) {
      log.error(`Get violation stats failed: ${error.message}`);
      this.recordResult('Get Violation Stats', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testDeleteOldViolations(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 10: Delete Old Violations');

      // This test would delete violations older than 90 days
      // For E2E test, we'll just verify the query works with 0 results
      const result = await this.pool.query(
        `DELETE FROM sod_violations
         WHERE tenant_id = $1
         AND detected_at < NOW() - INTERVAL '90 days'
         AND status IN ('REMEDIATED', 'ACCEPTED_RISK')`,
        [TEST_TENANT_ID]
      );

      log.success(`Delete old violations query executed (${result.rowCount || 0} deleted)`);
      this.recordResult('Delete Old Violations', true, Date.now() - start);
    } catch (error: any) {
      log.error(`Delete old violations failed: ${error.message}`);
      this.recordResult('Delete Old Violations', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testCSVExport(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 11: CSV Export');

      const result = await this.pool.query(
        `SELECT
           user_id, user_name, user_email, conflict_type, risk_level,
           conflicting_roles, affected_transactions, business_process,
           status, detected_at
         FROM sod_violations
         WHERE tenant_id = $1
         ORDER BY detected_at DESC`,
        [TEST_TENANT_ID]
      );

      if (result.rows.length > 0) {
        // Generate CSV
        const headers = Object.keys(result.rows[0]);
        const csv = [
          headers.join(','),
          ...result.rows.map(row =>
            headers.map(h => {
              let value = row[h];
              if (Array.isArray(value)) value = value.join('; ');
              if (value === null) value = '';
              return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
          )
        ].join('\n');

        log.success(`CSV generated: ${csv.split('\n').length - 1} data rows`);
        log.info(`CSV preview:\n${csv.split('\n').slice(0, 3).join('\n')}`);
        this.recordResult('CSV Export', true, Date.now() - start);
      } else {
        throw new Error('No violations to export');
      }
    } catch (error: any) {
      log.error(`CSV export failed: ${error.message}`);
      this.recordResult('CSV Export', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    log.step('Cleanup: Removing test data');

    try {
      // Delete test violations
      await this.pool.query('DELETE FROM sod_violations WHERE tenant_id = $1', [TEST_TENANT_ID]);

      // Delete test analysis runs
      await this.pool.query('DELETE FROM sod_analysis_runs WHERE tenant_id = $1', [TEST_TENANT_ID]);

      // Delete test tenant
      await this.pool.query('DELETE FROM tenants WHERE tenant_id = $1', [TEST_TENANT_ID]);

      log.success('Test data cleaned up');
    } catch (error: any) {
      log.warning(`Cleanup failed: ${error.message}`);
    }

    await this.pool.end();
  }

  private recordResult(step: string, passed: boolean, duration: number, error?: string): void {
    this.results.push({ step, passed, duration, error });
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.cyan}TEST RESULTS SUMMARY${colors.reset}`);
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    this.results.forEach((result, index) => {
      const status = result.passed
        ? `${colors.green}PASS${colors.reset}`
        : `${colors.red}FAIL${colors.reset}`;
      console.log(`${index + 1}. [${status}] ${result.step} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   ${colors.red}Error: ${result.error}${colors.reset}`);
      }
    });

    console.log('='.repeat(80));
    console.log(`Total: ${total} | Passed: ${colors.green}${passed}${colors.reset} | Failed: ${colors.red}${failed}${colors.reset} | Duration: ${totalDuration}ms`);
    console.log('='.repeat(80));

    if (failed === 0) {
      console.log(`\n${colors.green}✓ All tests passed!${colors.reset}\n`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}✗ ${failed} test(s) failed${colors.reset}\n`);
      process.exit(1);
    }
  }
}

// Run tests
const test = new SoDEndToEndTest();
test.run().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
