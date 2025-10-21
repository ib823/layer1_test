/**
 * Integration Test Setup
 *
 * Provides Testcontainers infrastructure for integration tests
 * - PostgreSQL container for database operations
 * - Test data fixtures
 * - Cleanup utilities
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

export class TestEnvironment {
  private static postgresContainer: StartedPostgreSqlContainer | null = null;
  private static pool: Pool | null = null;

  /**
   * Start PostgreSQL container and run migrations
   */
  static async setup(): Promise<string> {
    console.log('🚀 Starting PostgreSQL container...');

    // Start PostgreSQL container
    this.postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('lhdn_test')
      .withUsername('postgres')
      .withPassword('postgres')
      .start();

    const connectionString = this.postgresContainer.getConnectionUri();
    console.log('✅ PostgreSQL container started');

    // Create connection pool
    this.pool = new Pool({ connectionString });

    // Run migrations
    await this.runMigrations();

    return connectionString;
  }

  /**
   * Run database migrations
   */
  private static async runMigrations(): Promise<void> {
    if (!this.pool) throw new Error('Pool not initialized');

    console.log('📦 Running migrations...');

    // Correct path from packages/modules/lhdn-einvoice/tests/integration to infrastructure/database/migrations
    const migrationsPath = join(__dirname, '../../../../../infrastructure/database/migrations');

    // Migration files in order (actual migration files that exist)
    const migrations = [
      '002_security_compliance.sql',
      '003_performance_indexes.sql',
      '005_add_lhdn_einvoice.sql',
      '006_add_idempotency_queue.sql',
    ];

    for (const migration of migrations) {
      try {
        const sql = readFileSync(join(migrationsPath, migration), 'utf-8');
        await this.pool.query(sql);
        console.log(`  ✓ ${migration}`);
      } catch (error: any) {
        // Migration file might not exist yet - skip gracefully
        if (error.code === 'ENOENT') {
          console.log(`  ⊘ ${migration} (not found, skipping)`);
        } else {
          console.warn(`  ⚠ ${migration}: ${error.message}`);
        }
      }
    }

    console.log('✅ Migrations complete');
  }

  /**
   * Insert test fixtures
   */
  static async insertFixtures(): Promise<void> {
    if (!this.pool) throw new Error('Pool not initialized');

    // Insert test tenant
    await this.pool.query(`
      INSERT INTO tenants (id, name, slug, is_active)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Test Tenant', 'test-tenant', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // Insert test LHDN config
    await this.pool.query(`
      INSERT INTO lhdn_tenant_config (
        tenant_id,
        company_code,
        company_name,
        company_tin,
        client_id,
        client_secret,
        api_base_url,
        environment,
        auto_submit,
        is_active
      ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        'TEST01',
        'Test Company Sdn Bhd',
        'C12345678901',
        'test-client-id',
        'test-client-secret',
        'https://api-sandbox.myinvois.hasil.gov.my',
        'SANDBOX',
        false,
        true
      )
      ON CONFLICT (tenant_id) DO NOTHING
    `);

    // Insert test invoice
    await this.pool.query(`
      INSERT INTO lhdn_einvoices (
        id,
        tenant_id,
        invoice_number,
        document_type,
        invoice_date,
        status,
        currency,
        sap_billing_document,
        sap_company_code,
        supplier_tin,
        supplier_name,
        buyer_tin,
        buyer_name,
        subtotal_amount,
        total_tax_amount,
        total_amount,
        line_items,
        created_by
      ) VALUES (
        '00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000001',
        'INV-2024-001',
        '01',
        NOW(),
        'ACCEPTED',
        'MYR',
        '9000000001',
        'TEST01',
        'C12345678901',
        'Test Company Sdn Bhd',
        'C98765432109',
        'Test Customer Sdn Bhd',
        1000.00,
        60.00,
        1060.00,
        '[]'::jsonb,
        'test-user'
      )
      ON CONFLICT (id) DO NOTHING
    `);
  }

  /**
   * Clean up test data
   */
  static async cleanup(): Promise<void> {
    if (!this.pool) return;

    console.log('🧹 Cleaning up test data...');

    // Clean up in reverse order of dependencies
    const tables = [
      'lhdn_audit_log',
      'lhdn_doc_events',
      'lhdn_dead_letter_queue',
      'lhdn_submission_queue',
      'lhdn_idempotency_keys',
      'lhdn_circuit_breaker_state',
      'lhdn_einvoices',
      'lhdn_tenant_config',
      'tenants',
    ];

    for (const table of tables) {
      try {
        await this.pool.query(`TRUNCATE TABLE ${table} CASCADE`);
      } catch (error) {
        // Table might not exist - skip
      }
    }

    console.log('✅ Cleanup complete');
  }

  /**
   * Teardown test environment
   */
  static async teardown(): Promise<void> {
    console.log('🛑 Tearing down test environment...');

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    if (this.postgresContainer) {
      await this.postgresContainer.stop();
      this.postgresContainer = null;
    }

    console.log('✅ Teardown complete');
  }

  /**
   * Get connection string
   */
  static getConnectionString(): string {
    if (!this.postgresContainer) {
      throw new Error('PostgreSQL container not started');
    }
    return this.postgresContainer.getConnectionUri();
  }

  /**
   * Get pool for direct queries
   */
  static getPool(): Pool {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }
    return this.pool;
  }
}

/**
 * Jest global setup
 */
export default async function globalSetup() {
  await TestEnvironment.setup();
}

/**
 * Jest global teardown
 */
export async function globalTeardown() {
  await TestEnvironment.teardown();
}
