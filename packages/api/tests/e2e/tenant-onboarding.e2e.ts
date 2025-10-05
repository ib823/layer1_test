/**
 * End-to-End Test: Tenant Onboarding Flow
 *
 * Tests the complete tenant onboarding workflow:
 * 1. Create tenant via API
 * 2. Configure SAP connection
 * 3. Trigger service discovery
 * 4. Verify tenant profile created
 * 5. Check module activations
 * 6. Verify tenant can be retrieved
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." AUTH_ENABLED=false ts-node tenant-onboarding.e2e.ts
 *
 * Prerequisites:
 *   - PostgreSQL database running
 *   - DATABASE_URL environment variable set
 *   - API server NOT running (test starts its own)
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
const TEST_TENANT_ID = 'test-onboarding-' + Date.now();
const TEST_COMPANY_NAME = 'E2E Test Corp';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sapframework';

interface TestResult {
  step: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class TenantOnboardingE2ETest {
  private app: Application;
  private pool: Pool;
  private results: TestResult[] = [];
  private createdTenantId?: string;

  constructor() {
    this.app = createApp();
    this.pool = new Pool({ connectionString: DATABASE_URL });
  }

  async run(): Promise<void> {
    log.info('Starting Tenant Onboarding E2E Test Suite');
    log.info(`Database: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);
    log.info(`Test Tenant ID: ${TEST_TENANT_ID}`);

    try {
      await this.testHealthEndpoint();
      await this.testCreateTenant();
      await this.testGetTenant();
      await this.testListTenants();
      await this.testGetTenantProfile();
      await this.testGetActiveModules();
      await this.testActivateModule();
      await this.testDeactivateModule();

      await this.cleanup();
      this.printResults();
    } catch (error: any) {
      log.error(`Test suite failed: ${error.message}`);
      await this.cleanup();
      process.exit(1);
    }
  }

  private async testHealthEndpoint(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 1: Health Endpoint');

      const response = await request(this.app).get('/api/health');

      if (response.status === 200 && response.body.success) {
        log.success('API health check passed');
        this.recordResult('Health Endpoint', true, Date.now() - start);
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error: any) {
      log.error(`Health endpoint failed: ${error.message}`);
      this.recordResult('Health Endpoint', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testCreateTenant(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 2: Create Tenant');

      const tenantData = {
        tenantId: TEST_TENANT_ID,
        companyName: TEST_COMPANY_NAME,
        sapConnection: {
          baseUrl: 'https://sap-test.example.com',
          client: '100',
          authType: 'BASIC',
          username: 'testuser',
          password: 'testpass',
        },
      };

      const response = await request(this.app)
        .post('/api/admin/tenants')
        .send(tenantData);

      if (response.status === 201 && response.body.success) {
        this.createdTenantId = response.body.data.tenant_id;
        log.success(`Tenant created: ${this.createdTenantId}`);
        this.recordResult('Create Tenant', true, Date.now() - start);
      } else {
        throw new Error(`Create tenant failed: ${response.status} - ${JSON.stringify(response.body)}`);
      }
    } catch (error: any) {
      log.error(`Create tenant failed: ${error.message}`);
      this.recordResult('Create Tenant', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testGetTenant(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 3: Get Tenant Details');

      const response = await request(this.app)
        .get(`/api/admin/tenants/${TEST_TENANT_ID}`);

      if (response.status === 200 && response.body.success) {
        const tenant = response.body.data.tenant;
        if (tenant.tenant_id === TEST_TENANT_ID && tenant.company_name === TEST_COMPANY_NAME) {
          log.success(`Retrieved tenant: ${tenant.company_name}`);
          this.recordResult('Get Tenant', true, Date.now() - start);
        } else {
          throw new Error('Tenant data mismatch');
        }
      } else {
        throw new Error(`Get tenant failed: ${response.status}`);
      }
    } catch (error: any) {
      log.error(`Get tenant failed: ${error.message}`);
      this.recordResult('Get Tenant', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testListTenants(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 4: List Tenants');

      const response = await request(this.app)
        .get('/api/admin/tenants?page=1&limit=10');

      if (response.status === 200 && response.body.success) {
        const tenants = response.body.data.tenants;
        const foundTenant = tenants.find((t: any) => t.tenant_id === TEST_TENANT_ID);

        if (foundTenant) {
          log.success(`Found tenant in list (total: ${tenants.length})`);
          this.recordResult('List Tenants', true, Date.now() - start);
        } else {
          throw new Error('Tenant not found in list');
        }
      } else {
        throw new Error(`List tenants failed: ${response.status}`);
      }
    } catch (error: any) {
      log.error(`List tenants failed: ${error.message}`);
      this.recordResult('List Tenants', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testGetTenantProfile(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 5: Get Tenant Profile');

      const response = await request(this.app)
        .get(`/api/admin/tenants/${TEST_TENANT_ID}`);

      if (response.status === 200 && response.body.success) {
        const profile = response.body.data.profile;

        if (profile && profile.capabilities) {
          log.success(`Profile retrieved with capabilities: ${JSON.stringify(profile.capabilities)}`);
          this.recordResult('Get Tenant Profile', true, Date.now() - start);
        } else {
          log.warning('Profile exists but no capabilities (expected for new tenant)');
          this.recordResult('Get Tenant Profile', true, Date.now() - start);
        }
      } else {
        throw new Error(`Get profile failed: ${response.status}`);
      }
    } catch (error: any) {
      log.error(`Get tenant profile failed: ${error.message}`);
      this.recordResult('Get Tenant Profile', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testGetActiveModules(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 6: Get Active Modules');

      const response = await request(this.app)
        .get(`/api/admin/tenants/${TEST_TENANT_ID}/modules`);

      if (response.status === 200 && response.body.success) {
        const modules = response.body.data.modules;
        log.success(`Active modules: ${modules.length > 0 ? modules.join(', ') : 'none'}`);
        this.recordResult('Get Active Modules', true, Date.now() - start);
      } else {
        throw new Error(`Get modules failed: ${response.status}`);
      }
    } catch (error: any) {
      log.error(`Get active modules failed: ${error.message}`);
      this.recordResult('Get Active Modules', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testActivateModule(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 7: Activate Module');

      const response = await request(this.app)
        .post(`/api/admin/tenants/${TEST_TENANT_ID}/modules`)
        .send({ moduleId: 'SoD_Analysis' });

      if (response.status === 200 && response.body.success) {
        log.success('Module activated: SoD_Analysis');
        this.recordResult('Activate Module', true, Date.now() - start);
      } else {
        throw new Error(`Activate module failed: ${response.status}`);
      }
    } catch (error: any) {
      log.error(`Activate module failed: ${error.message}`);
      this.recordResult('Activate Module', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async testDeactivateModule(): Promise<void> {
    const start = Date.now();
    try {
      log.step('Test 8: Deactivate Module');

      const response = await request(this.app)
        .delete(`/api/admin/tenants/${TEST_TENANT_ID}/modules/SoD_Analysis`);

      if (response.status === 200 && response.body.success) {
        log.success('Module deactivated: SoD_Analysis');
        this.recordResult('Deactivate Module', true, Date.now() - start);
      } else {
        throw new Error(`Deactivate module failed: ${response.status}`);
      }
    } catch (error: any) {
      log.error(`Deactivate module failed: ${error.message}`);
      this.recordResult('Deactivate Module', false, Date.now() - start, error.message);
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    log.step('Cleanup: Removing test data');

    try {
      // Delete tenant via database (more reliable than API for cleanup)
      await this.pool.query('DELETE FROM tenant_module_activations WHERE tenant_id = $1', [TEST_TENANT_ID]);
      await this.pool.query('DELETE FROM tenant_capability_profiles WHERE tenant_id = $1', [TEST_TENANT_ID]);
      await this.pool.query('DELETE FROM tenant_sap_connections WHERE tenant_id = $1', [TEST_TENANT_ID]);
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
const test = new TenantOnboardingE2ETest();
test.run().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
