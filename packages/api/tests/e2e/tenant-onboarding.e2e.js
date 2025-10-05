const request = require('supertest');
const { Pool } = require('pg');

// Set environment before imports
process.env.AUTH_ENABLED = 'false';
process.env.NODE_ENV = 'test';

const { buildApp } = require('/workspaces/layer1_test/apps/api/src/app.js');

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
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.blue}▶${colors.reset} ${msg}`),
};

// Test configuration
const TEST_TENANT_ID = 'test-onboarding-' + Date.now();
const TEST_COMPANY_NAME = 'E2E Test Corp';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sapframework';

class TenantOnboardingE2ETest {
  constructor() {
    this.pool = new Pool({ connectionString: DATABASE_URL });
  }

  async init() {
    this.app = await buildApp();
  }

  async run() {
    log.info('Starting Tenant Onboarding E2E Test Suite');
    log.info(`Database: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);
    log.info(`Test Tenant ID: ${TEST_TENANT_ID}`);

    try {
      await this.init();
      await this.testHealthEndpoint();
      await this.testCreateTenant();
      await this.testGetTenant();
      await this.testListTenants();
      await this.testUpdateTenant();
      await this.testDiscoverTenant();

      await this.cleanup();
      this.printResults();
    } catch (error) {
      log.error(`Test suite failed: ${error.message}`);
      await this.cleanup();
      process.exit(1);
    }
  }

  async testHealthEndpoint() {
    const start = Date.now();
    try {
      log.step('Test 1: Health Endpoint');

      const response = await request(this.app.server).get('/health');

      if (response.status === 200 && response.body.ok) {
        log.success('API health check passed');
        this.recordResult('Health Endpoint', true, Date.now() - start);
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      log.error(`Health endpoint failed: ${error.message}`);
      this.recordResult('Health Endpoint', false, Date.now() - start, error.message);
      throw error;
    }
  }

  async testCreateTenant() {
    const start = Date.now();
    try {
      log.step('Test 2: Create Tenant');

      const tenantData = {
        name: TEST_COMPANY_NAME,
      };

      const response = await request(this.app.server)
        .post('/tenants')
        .send(tenantData);

      if (response.status === 200 && response.body.id) {
        this.createdTenantId = response.body.id;
        log.success(`Tenant created: ${this.createdTenantId}`);
        this.recordResult('Create Tenant', true, Date.now() - start);
      } else {
        throw new Error(`Create tenant failed: ${response.status} - ${JSON.stringify(response.body)}`);
      }
    } catch (error) {
      log.error(`Create tenant failed: ${error.message}`);
      this.recordResult('Create Tenant', false, Date.now() - start, error.message);
      throw error;
    }
  }

  async testGetTenant() {
    const start = Date.now();
    try {
      log.step('Test 3: Get Tenant Details');

      const response = await request(this.app.server)
        .get(`/tenants/${this.createdTenantId}`);

      if (response.status === 200 && response.body.id) {
        const tenant = response.body;
        if (tenant.id === this.createdTenantId && tenant.name === TEST_COMPANY_NAME) {
          log.success(`Retrieved tenant: ${tenant.name}`);
          this.recordResult('Get Tenant', true, Date.now() - start);
        } else {
          throw new Error('Tenant data mismatch');
        }
      } else {
        throw new Error(`Get tenant failed: ${response.status}`);
      }
    } catch (error) {
      log.error(`Get tenant failed: ${error.message}`);
      this.recordResult('Get Tenant', false, Date.now() - start, error.message);
      throw error;
    }
  }

  async testListTenants() {
    const start = Date.now();
    try {
      log.step('Test 4: List Tenants');

      const response = await request(this.app.server)
        .get('/tenants');

      if (response.status === 200 && Array.isArray(response.body)) {
        const tenants = response.body;
        const foundTenant = tenants.find((t) => t.id === this.createdTenantId);

        if (foundTenant) {
          log.success(`Found tenant in list (total: ${tenants.length})`);
          this.recordResult('List Tenants', true, Date.now() - start);
        } else {
          throw new Error('Tenant not found in list');
        }
      } else {
        throw new Error(`List tenants failed: ${response.status}`);
      }
    } catch (error) {
      log.error(`List tenants failed: ${error.message}`);
      this.recordResult('List Tenants', false, Date.now() - start, error.message);
      throw error;
    }
  }

  async testUpdateTenant() {
    const start = Date.now();
    try {
      log.step('Test 5: Update Tenant');
      const newCompanyName = 'Updated E2E Test Corp';

      const response = await request(this.app.server)
        .put(`/tenants/${this.createdTenantId}`)
        .send({ name: newCompanyName });

      if (response.status === 200 && response.body.id) {
        const updatedTenant = response.body;
        if (updatedTenant.name === newCompanyName) {
          log.success(`Updated tenant: ${updatedTenant.name}`);
          this.recordResult('Update Tenant', true, Date.now() - start);
        } else {
          throw new Error('Tenant name was not updated');
        }
      } else {
        throw new Error(`Update tenant failed: ${response.status}`);
      }
    } catch (error) {
      log.error(`Update tenant failed: ${error.message}`);
      this.recordResult('Update Tenant', false, Date.now() - start, error.message);
      throw error;
    }
  }

  async testDiscoverTenant() {
    const start = Date.now();
    try {
      log.step('Test 6: Discover Tenant');

      const response = await request(this.app.server)
        .post(`/tenants/${this.createdTenantId}/discover`);

      if (response.status === 200) {
        log.success('Tenant discovery triggered');
        this.recordResult('Discover Tenant', true, Date.now() - start);
      } else {
        throw new Error(`Tenant discovery failed: ${response.status}`);
      }
    } catch (error) {
      log.error(`Tenant discovery failed: ${error.message}`);
      this.recordResult('Discover Tenant', false, Date.now() - start, error.message);
      throw error;
    }
  }

  async cleanup() {
    log.step('Cleanup: Removing test data');

    try {
      // Delete tenant via database (more reliable than API for cleanup)
      await this.pool.query('DELETE FROM tenant_module_activations WHERE tenant_id = $1', [TEST_TENANT_ID]);
      await this.pool.query('DELETE FROM tenant_capability_profiles WHERE tenant_id = $1', [TEST_TENANT_ID]);
      await this.pool.query('DELETE FROM tenant_sap_connections WHERE tenant_id = $1', [TEST_TENANT_ID]);
      await this.pool.query('DELETE FROM tenants WHERE tenant_id = $1', [TEST_TENANT_ID]);

      log.success('Test data cleaned up');
    } catch (error) {
      log.warning(`Cleanup failed: ${error.message}`);
    }

    await this.pool.end();
  }

  recordResult(step, passed, duration, error) {
    this.results.push({ step, passed, duration, error });
  }

  printResults() {
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
