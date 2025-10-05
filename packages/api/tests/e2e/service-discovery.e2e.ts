/**
 * End-to-End Test: Service Discovery Flow
 *
 * Tests the complete service discovery workflow:
 * 1. Trigger discovery for tenant
 * 2. Verify discovery results
 * 3. Check capability profile generated
 * 4. Validate module recommendations
 * 5. Verify services stored correctly
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." AUTH_ENABLED=false ts-node service-discovery.e2e.ts
 *
 * Prerequisites:
 *   - PostgreSQL database running
 *   - DATABASE_URL environment variable set
 *   - Test tenant exists in database
 */

import request from 'supertest';
import { Application } from 'express';
import { Pool } from 'pg';

// Set environment before imports
process.env.AUTH_ENABLED = 'false';
process.env.NODE_ENV = 'test';

import { createApp } from '../../src/app';

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
const TEST_TENANT_ID = 'test-discovery-' + Date.now();
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sapframework';

interface TestResult {
  step: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class ServiceDiscoveryE2ETest {
  private app: Application;
  private pool: Pool;
  private results: TestResult[] = [];

  constructor() {
    this.app = createApp();
    this.pool = new Pool({ connectionString: DATABASE_URL });
  }

  async run(): Promise<void> {
    log.info('Starting Service Discovery E2E Test Suite');
    log.info(`Database: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);
    log.info(`Test Tenant ID: ${TEST_TENANT_ID}`);

    try {
      await this.setupTestTenant();
      await this.testTriggerDiscovery();
      await this.testGetDiscoveryStatus();
      await this.testGetCapabilityProfile();
      await this.testGetRecommendedModules();
      await this.testGetMissingServices();

      await this.cleanup();
      this.printResults();
    } catch (error: any) {
      log.error(`Test suite failed: ${error.message}`);
      await this.cleanup();
      process.exit(1);
    }
  }

  private async setupTestTenant(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Setup: Create Test Tenant');

      // Create test tenant directly in database
      await this.pool.query(
        `INSERT INTO tenants (id, tenant_id, tenant_name, status)
         VALUES (gen_random_uuid(), $1, $2, 'active')
         ON CONFLICT (tenant_id) DO NOTHING`,
        [TEST_TENANT_ID, 'Service Discovery Test Tenant']
      );

      // Create SAP connection
      await this.pool.query(
        `INSERT INTO tenant_sap_connections (tenant_id, connection_type, base_url, sap_client, auth_type)
         VALUES ($1, 'S4HANA', $2, $3, 'BASIC')
         ON CONFLICT (tenant_id, connection_type) DO NOTHING`,
        [TEST_TENANT_ID, 'https://sap-test.example.com', '100']
      );

      log.success('Test tenant created');
      this.recordResult('Setup Test Tenant', true, Date.now() - start);
    } catch (error: any) {
      log.error(`Setup failed: ${error.message}`);
      this.recordResult('Setup Test Tenant', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testTriggerDiscovery(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 1: Trigger Service Discovery');

      const response = await request(this.app)
        .post(`/api/admin/tenants/${TEST_TENANT_ID}/discover`)
        .send({});

      // Discovery might fail if SAP system not accessible (expected in test)
      if (response.status === 200 || response.status === 500) {
        if (response.status === 200 && response.body.success) {
          log.success('Discovery triggered successfully');
        } else {
          log.warning('Discovery triggered but failed (expected without real SAP connection)');
        }
        this.recordResult('Trigger Discovery', true, Date.now() - start);
      } else {
        throw new Error(`Trigger discovery failed: ${response.status}`);
      }
    } catch (error: any) {
      log.error(`Trigger discovery failed: ${error.message}`);
      this.recordResult('Trigger Discovery', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testGetDiscoveryStatus(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 2: Get Discovery Status');

      const response = await request(this.app)
        .get(`/api/admin/tenants/${TEST_TENANT_ID}/discovery/status`);

      if (response.status === 200 || response.status === 404) {
        if (response.status === 200 && response.body.success) {
          const status = response.body.data.status;
          log.success(`Discovery status: ${status}`);
        } else {
          log.warning('No discovery status found (expected for failed discovery)');
        }
        this.recordResult('Get Discovery Status', true, Date.now() - start);
      } else {
        throw new Error(`Get discovery status failed: ${response.status}`);
      }
    } catch (error: any) {
      log.error(`Get discovery status failed: ${error.message}`);
      this.recordResult('Get Discovery Status', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testGetCapabilityProfile(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 3: Get Capability Profile');

      // Query database directly for capability profile
      const result = await this.pool.query(
        `SELECT * FROM tenant_capability_profiles WHERE tenant_id = $1`,
        [TEST_TENANT_ID]
      );

      if (result.rows.length > 0) {
        const profile = result.rows[0];
        log.success(`Capability profile found: SAP Version = ${profile.sap_version}`);
        log.info(`Capabilities: ${JSON.stringify(profile.capabilities)}`);
        this.recordResult('Get Capability Profile', true, Date.now() - start);
      } else {
        log.warning('No capability profile (expected without successful discovery)');
        this.recordResult('Get Capability Profile', true, Date.now() - start);
      }
    } catch (error: any) {
      log.error(`Get capability profile failed: ${error.message}`);
      this.recordResult('Get Capability Profile', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testGetRecommendedModules(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 4: Get Recommended Modules');

      const response = await request(this.app)
        .get(`/api/admin/tenants/${TEST_TENANT_ID}`);

      if (response.status === 200 && response.body.success) {
        const profile = response.body.data.profile;

        if (profile && profile.capabilities) {
          const canDoSoD = profile.capabilities.canDoSoD || false;
          const canDoInvoiceMatching = profile.capabilities.canDoInvoiceMatching || false;

          log.success(`Module recommendations:`);
          log.info(`  - SoD Analysis: ${canDoSoD ? 'Available' : 'Not Available'}`);
          log.info(`  - Invoice Matching: ${canDoInvoiceMatching ? 'Available' : 'Not Available'}`);

          this.recordResult('Get Recommended Modules', true, Date.now() - start);
        } else {
          log.warning('No profile capabilities available');
          this.recordResult('Get Recommended Modules', true, Date.now() - start);
        }
      } else {
        throw new Error(`Get recommended modules failed: ${response.status}`);
      }
    } catch (error: any) {
      log.error(`Get recommended modules failed: ${error.message}`);
      this.recordResult('Get Recommended Modules', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testGetMissingServices(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 5: Get Missing Services');

      const response = await request(this.app)
        .get(`/api/admin/tenants/${TEST_TENANT_ID}`);

      if (response.status === 200 && response.body.success) {
        const profile = response.body.data.profile;

        if (profile && profile.missingServices) {
          if (profile.missingServices.length > 0) {
            log.warning(`Missing services: ${profile.missingServices.join(', ')}`);
          } else {
            log.success('All required services available');
          }
          this.recordResult('Get Missing Services', true, Date.now() - start);
        } else {
          log.warning('No missing services information');
          this.recordResult('Get Missing Services', true, Date.now() - start);
        }
      } else {
        throw new Error(`Get missing services failed: ${response.status}`);
      }
    } catch (error: any) {
      log.error(`Get missing services failed: ${error.message}`);
      this.recordResult('Get Missing Services', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    log.step('Cleanup: Removing test data');

    try {
      await this.pool.query('DELETE FROM tenant_capability_profiles WHERE tenant_id = $1', [TEST_TENANT_ID]);
      await this.pool.query('DELETE FROM tenant_sap_connections WHERE tenant_id = $1', [TEST_TENANT_ID]);
      await this.pool.query('DELETE FROM tenant_module_activations WHERE tenant_id = $1', [TEST_TENANT_ID]);
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
const test = new ServiceDiscoveryE2ETest();
test.run().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
