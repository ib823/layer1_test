import { Pool } from 'pg';
import { TenantCapabilityProfile, DiscoveryResult } from '../connectors/base/ServiceDiscoveryTypes';
import { TenantRecord } from './types';

export class TenantProfileRepository {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
    });
  }

  async createTenant(tenantId: string, companyName: string): Promise<TenantRecord> {
    const result = await this.pool.query<TenantRecord>(
      `INSERT INTO tenants (tenant_id, company_name, status)
       VALUES ($1, $2, 'ACTIVE')
       RETURNING *`,
      [tenantId, companyName]
    );
    return result.rows[0];
  }

  async getTenant(tenantId: string): Promise<TenantRecord | null> {
    const result = await this.pool.query<TenantRecord>(
      'SELECT * FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );
    return result.rows[0] || null;
  }

  async saveProfile(profile: TenantCapabilityProfile): Promise<void> {
    const tenant = await this.getTenant(profile.tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${profile.tenantId} not found`);
    }

    await this.pool.query(
      `INSERT INTO tenant_capability_profiles 
       (tenant_id, sap_version, discovered_at, available_services, 
        custom_fields, capabilities, missing_services, recommended_actions)
       VALUES (
         (SELECT id FROM tenants WHERE tenant_id = $1),
         $2, $3, $4, $5, $6, $7, $8
       )
       ON CONFLICT (tenant_id) 
       DO UPDATE SET
         sap_version = EXCLUDED.sap_version,
         discovered_at = EXCLUDED.discovered_at,
         available_services = EXCLUDED.available_services,
         custom_fields = EXCLUDED.custom_fields,
         capabilities = EXCLUDED.capabilities,
         missing_services = EXCLUDED.missing_services,
         recommended_actions = EXCLUDED.recommended_actions`,
      [
        profile.tenantId,
        profile.sapVersion,
        profile.discoveredAt,
        JSON.stringify(profile.availableServices),
        JSON.stringify(profile.customFields),
        JSON.stringify(profile.capabilities),
        profile.missingServices,
        JSON.stringify(profile.recommendedActions),
      ]
    );
  }

  async getProfile(tenantId: string): Promise<TenantCapabilityProfile | null> {
    const result = await this.pool.query(
      `SELECT 
         t.tenant_id,
         p.sap_version,
         p.discovered_at,
         p.available_services,
         p.custom_fields,
         p.capabilities,
         p.missing_services,
         p.recommended_actions
       FROM tenant_capability_profiles p
       JOIN tenants t ON p.tenant_id = t.id
       WHERE t.tenant_id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      tenantId: row.tenant_id,
      sapVersion: row.sap_version,
      discoveredAt: new Date(row.discovered_at),
      availableServices: row.available_services,
      customFields: row.custom_fields,
      capabilities: row.capabilities,
      missingServices: row.missing_services,
      recommendedActions: row.recommended_actions,
    };
  }

  async saveDiscoveryHistory(tenantId: string, result: DiscoveryResult): Promise<void> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    await this.pool.query(
      `INSERT INTO service_discovery_history
       (tenant_id, discovery_result, services_count, success, errors)
       VALUES (
         (SELECT id FROM tenants WHERE tenant_id = $1),
         $2, $3, $4, $5
       )`,
      [tenantId, JSON.stringify(result), result.services.length, result.success, result.errors]
    );
  }

  async activateModule(tenantId: string, moduleName: string, reason?: string): Promise<void> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    await this.pool.query(
      `INSERT INTO tenant_module_activations
       (tenant_id, module_name, is_active, activation_reason)
       VALUES (
         (SELECT id FROM tenants WHERE tenant_id = $1),
         $2, true, $3
       )
       ON CONFLICT (tenant_id, module_name)
       DO UPDATE SET
         is_active = true,
         activation_reason = EXCLUDED.activation_reason,
         activated_at = NOW(),
         deactivated_at = NULL`,
      [tenantId, moduleName, reason]
    );
  }

  async deactivateModule(tenantId: string, moduleName: string): Promise<void> {
    await this.pool.query(
      `UPDATE tenant_module_activations
       SET is_active = false, deactivated_at = NOW()
       WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_id = $1)
       AND module_name = $2`,
      [tenantId, moduleName]
    );
  }

  async getActiveModules(tenantId: string): Promise<string[]> {
    const result = await this.pool.query<{ module_name: string }>(
      `SELECT m.module_name
       FROM tenant_module_activations m
       JOIN tenants t ON m.tenant_id = t.id
       WHERE t.tenant_id = $1 AND m.is_active = true`,
      [tenantId]
    );
    return result.rows.map(r => r.module_name);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
  // Add these methods to TenantProfileRepository class

  async getAllTenants(): Promise<TenantRecord[]> {
    const result = await this.pool.query<TenantRecord>(
      'SELECT * FROM tenants ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async getAllActiveTenants(): Promise<TenantRecord[]> {
    const result = await this.pool.query<TenantRecord>(
      "SELECT * FROM tenants WHERE status = 'ACTIVE' ORDER BY created_at DESC"
    );
    return result.rows;
  }

  async updateTenant(tenantId: string, updates: Partial<TenantRecord>): Promise<TenantRecord> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.company_name) {
      fields.push(`company_name = $${paramIndex++}`);
      values.push(updates.company_name);
    }

    if (updates.status) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    fields.push(`updated_at = NOW()`);
    values.push(tenantId);

    const result = await this.pool.query<TenantRecord>(
      `UPDATE tenants SET ${fields.join(', ')} WHERE tenant_id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async saveSAPConnection(tenantId: string, connection: any): Promise<void> {
    await this.pool.query(
      `INSERT INTO tenant_sap_connections 
       (tenant_id, connection_type, base_url, auth_type, auth_credentials, is_active)
       VALUES (
         (SELECT id FROM tenants WHERE tenant_id = $1),
         $2, $3, $4, $5, true
       )
       ON CONFLICT (tenant_id, connection_type) 
       DO UPDATE SET
         base_url = EXCLUDED.base_url,
         auth_type = EXCLUDED.auth_type,
         auth_credentials = EXCLUDED.auth_credentials,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()`,
      [
        tenantId,
        connection.type || 'S4HANA',
        connection.baseUrl,
        connection.auth.type,
        JSON.stringify(connection.auth.credentials),
      ]
    );
  }

  async getSAPConnection(tenantId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT c.*
       FROM tenant_sap_connections c
       JOIN tenants t ON c.tenant_id = t.id
       WHERE t.tenant_id = $1 AND c.is_active = true
       LIMIT 1`,
      [tenantId]
    );

    return result.rows[0] || null;
  }

  async getDiscoveryHistory(tenantId: string, limit: number = 10): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT *
       FROM service_discovery_history
       WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_id = $1)
       ORDER BY discovered_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return result.rows;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}
