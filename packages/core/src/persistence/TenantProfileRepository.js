"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantProfileRepository = void 0;
const pg_1 = require("pg");
class TenantProfileRepository {
    pool;
    constructor(databaseUrl) {
        this.pool = new pg_1.Pool({
            connectionString: databaseUrl,
            max: 20,
            idleTimeoutMillis: 30000,
        });
    }
    async createTenant(tenantId, companyName) {
        const result = await this.pool.query(`INSERT INTO tenants (tenant_id, company_name, status)
       VALUES ($1, $2, 'ACTIVE')
       RETURNING *`, [tenantId, companyName]);
        return result.rows[0];
    }
    async getTenant(tenantId) {
        const result = await this.pool.query('SELECT * FROM tenants WHERE tenant_id = $1', [tenantId]);
        return result.rows[0] || null;
    }
    async saveProfile(profile) {
        const tenant = await this.getTenant(profile.tenantId);
        if (!tenant) {
            throw new Error(`Tenant ${profile.tenantId} not found`);
        }
        await this.pool.query(`INSERT INTO tenant_capability_profiles 
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
         recommended_actions = EXCLUDED.recommended_actions`, [
            profile.tenantId,
            profile.sapVersion,
            profile.discoveredAt,
            JSON.stringify(profile.availableServices),
            JSON.stringify(profile.customFields),
            JSON.stringify(profile.capabilities),
            profile.missingServices,
            JSON.stringify(profile.recommendedActions),
        ]);
    }
    async getProfile(tenantId) {
        const result = await this.pool.query(`SELECT 
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
       WHERE t.tenant_id = $1`, [tenantId]);
        if (result.rows.length === 0)
            return null;
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
    async saveDiscoveryHistory(tenantId, result) {
        const tenant = await this.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant ${tenantId} not found`);
        }
        await this.pool.query(`INSERT INTO service_discovery_history
       (tenant_id, discovery_result, services_count, success, errors)
       VALUES (
         (SELECT id FROM tenants WHERE tenant_id = $1),
         $2, $3, $4, $5
       )`, [tenantId, JSON.stringify(result), result.services.length, result.success, result.errors]);
    }
    async activateModule(tenantId, moduleName, reason) {
        const tenant = await this.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant ${tenantId} not found`);
        }
        await this.pool.query(`INSERT INTO tenant_module_activations
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
         deactivated_at = NULL`, [tenantId, moduleName, reason]);
    }
    async deactivateModule(tenantId, moduleName) {
        await this.pool.query(`UPDATE tenant_module_activations
       SET is_active = false, deactivated_at = NOW()
       WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_id = $1)
       AND module_name = $2`, [tenantId, moduleName]);
    }
    async getActiveModules(tenantId) {
        const result = await this.pool.query(`SELECT m.module_name
       FROM tenant_module_activations m
       JOIN tenants t ON m.tenant_id = t.id
       WHERE t.tenant_id = $1 AND m.is_active = true`, [tenantId]);
        return result.rows.map(r => r.module_name);
    }
    async close() {
        await this.pool.end();
    }
    // Add these methods to TenantProfileRepository class
    async getAllTenants() {
        const result = await this.pool.query('SELECT * FROM tenants ORDER BY created_at DESC');
        return result.rows;
    }
    /**
     * Get tenants with database-level pagination (optimized)
     */
    async getAllTenantsPaginated(page = 1, pageSize = 20, status) {
        const offset = (page - 1) * pageSize;
        const whereClause = status ? 'WHERE status = $3' : '';
        const params = status ? [pageSize, offset, status] : [pageSize, offset];
        // Execute count and data queries in parallel
        const [dataResult, countResult] = await Promise.all([
            this.pool.query(`SELECT * FROM tenants ${whereClause}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`, params),
            this.pool.query(`SELECT COUNT(*) FROM tenants ${whereClause}`, status ? [status] : [])
        ]);
        return {
            tenants: dataResult.rows,
            total: parseInt(countResult.rows[0].count)
        };
    }
    async getAllActiveTenants() {
        const result = await this.pool.query("SELECT * FROM tenants WHERE status = 'ACTIVE' ORDER BY created_at DESC");
        return result.rows;
    }
    async updateTenant(tenantId, updates) {
        const fields = [];
        const values = [];
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
        const result = await this.pool.query(`UPDATE tenants SET ${fields.join(', ')} WHERE tenant_id = $${paramIndex} RETURNING *`, values);
        return result.rows[0];
    }
    async saveSAPConnection(tenantId, connection) {
        await this.pool.query(`INSERT INTO tenant_sap_connections 
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
         updated_at = NOW()`, [
            tenantId,
            connection.type || 'S4HANA',
            connection.baseUrl,
            connection.auth.type,
            JSON.stringify(connection.auth.credentials),
        ]);
    }
    async getSAPConnection(tenantId) {
        const result = await this.pool.query(`SELECT c.*
       FROM tenant_sap_connections c
       JOIN tenants t ON c.tenant_id = t.id
       WHERE t.tenant_id = $1 AND c.is_active = true
       LIMIT 1`, [tenantId]);
        return result.rows[0] || null;
    }
    async getDiscoveryHistory(tenantId, limit = 10) {
        const result = await this.pool.query(`SELECT *
       FROM service_discovery_history
       WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_id = $1)
       ORDER BY discovered_at DESC
       LIMIT $2`, [tenantId, limit]);
        return result.rows;
    }
    async healthCheck() {
        try {
            await this.pool.query('SELECT 1');
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.TenantProfileRepository = TenantProfileRepository;
//# sourceMappingURL=TenantProfileRepository.js.map