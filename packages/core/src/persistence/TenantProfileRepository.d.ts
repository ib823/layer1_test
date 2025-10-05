import { TenantCapabilityProfile, DiscoveryResult } from '../connectors/base/ServiceDiscoveryTypes';
import { TenantRecord } from './types';
export declare class TenantProfileRepository {
    private pool;
    constructor(databaseUrl: string);
    createTenant(tenantId: string, companyName: string): Promise<TenantRecord>;
    getTenant(tenantId: string): Promise<TenantRecord | null>;
    saveProfile(profile: TenantCapabilityProfile): Promise<void>;
    getProfile(tenantId: string): Promise<TenantCapabilityProfile | null>;
    saveDiscoveryHistory(tenantId: string, result: DiscoveryResult): Promise<void>;
    activateModule(tenantId: string, moduleName: string, reason?: string): Promise<void>;
    deactivateModule(tenantId: string, moduleName: string): Promise<void>;
    getActiveModules(tenantId: string): Promise<string[]>;
    close(): Promise<void>;
    getAllTenants(): Promise<TenantRecord[]>;
    /**
     * Get tenants with database-level pagination (optimized)
     */
    getAllTenantsPaginated(page?: number, pageSize?: number, status?: string): Promise<{
        tenants: TenantRecord[];
        total: number;
    }>;
    getAllActiveTenants(): Promise<TenantRecord[]>;
    updateTenant(tenantId: string, updates: Partial<TenantRecord>): Promise<TenantRecord>;
    saveSAPConnection(tenantId: string, connection: any): Promise<void>;
    getSAPConnection(tenantId: string): Promise<any>;
    getDiscoveryHistory(tenantId: string, limit?: number): Promise<any[]>;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=TenantProfileRepository.d.ts.map