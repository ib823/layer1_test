import { Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AuthenticatedRequest } from '../types';
import { ApiResponseUtil } from '../utils/response';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Data Residency Middleware
 * Ensures tenant data is stored and processed in the correct geographic region
 */

export interface DataResidencyConfig {
  tenantId: string;
  region: string;
  countryCode?: string;
  dataCenter?: string;
  requiresLocalStorage: boolean;
  complianceRequirements: string[];
  encryptionRequired: boolean;
}

/**
 * Cache for tenant residency configurations
 */
const residencyCache = new Map<string, DataResidencyConfig>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get data residency configuration for tenant
 */
async function getTenantResidency(
  pool: Pool,
  tenantId: string
): Promise<DataResidencyConfig | null> {
  // Check cache first
  const cached = residencyCache.get(tenantId);
  if (cached) {
    return cached;
  }

  const query = `
    SELECT * FROM tenant_data_residency
    WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_id = $1)
  `;

  const result = await pool.query(query, [tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const residencyConfig: DataResidencyConfig = {
    tenantId,
    region: row.region,
    countryCode: row.country_code,
    dataCenter: row.data_center,
    requiresLocalStorage: row.requires_local_storage,
    complianceRequirements: row.compliance_requirements || [],
    encryptionRequired: row.encryption_required,
  };

  // Cache the configuration
  residencyCache.set(tenantId, residencyConfig);

  // Clear cache after TTL
  setTimeout(() => residencyCache.delete(tenantId), CACHE_TTL);

  return residencyConfig;
}

/**
 * Get current server region (from environment)
 */
function getCurrentRegion(): string {
  return process.env.SERVER_REGION || config.security?.dataResidency?.defaultRegion || 'EU';
}

/**
 * Data Residency Enforcement Middleware
 */
export function enforceDataResidency() {
  const pool = new Pool({ connectionString: config.databaseUrl });

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Skip if data residency is not enabled
    if (!config.security?.dataResidency?.enabled) {
      next();
      return;
    }

    // Skip if no authenticated user (no tenant context)
    if (!req.user?.tenantId) {
      next();
      return;
    }

    const tenantId = req.user.tenantId;
    const currentRegion = getCurrentRegion();

    try {
      const residency = await getTenantResidency(pool, tenantId);

      // If no residency config, use default
      if (!residency) {
        logger.warn('No data residency config found for tenant', { tenantId });
        next();
        return;
      }

      // Check if request is in the correct region
      if (residency.region !== currentRegion) {
        logger.error('Data residency violation', {
          tenantId,
          requiredRegion: residency.region,
          currentRegion,
          path: req.path,
        });

        // For strict enforcement, reject the request
        if (residency.requiresLocalStorage) {
          ApiResponseUtil.error(
            res,
            'DATA_RESIDENCY_VIOLATION',
            `This tenant's data must be processed in ${residency.region} region. Current region: ${currentRegion}`,
            451 // 451 Unavailable For Legal Reasons
          );
          return;
        }

        // For soft enforcement, log warning but allow
        logger.warn('Data residency mismatch but allowing request', {
          tenantId,
          requiredRegion: residency.region,
          currentRegion,
        });
      }

      // Attach residency config to request for downstream use
      (req as any).dataResidency = residency;

      next();
    } catch (error: any) {
      logger.error('Data residency check failed:', error);

      // Fail open or closed based on configuration
      if (config.security?.dataResidency?.failOpen) {
        next();
      } else {
        ApiResponseUtil.error(
          res,
          'DATA_RESIDENCY_ERROR',
          'Unable to verify data residency compliance',
          503
        );
      }
    }
  };
}

/**
 * Set tenant data residency configuration
 */
export async function setTenantResidency(
  pool: Pool,
  config: DataResidencyConfig
): Promise<void> {
  const query = `
    INSERT INTO tenant_data_residency (
      tenant_id, region, country_code, data_center,
      requires_local_storage, compliance_requirements, encryption_required
    ) VALUES (
      (SELECT id FROM tenants WHERE tenant_id = $1),
      $2, $3, $4, $5, $6, $7
    )
    ON CONFLICT (tenant_id)
    DO UPDATE SET
      region = EXCLUDED.region,
      country_code = EXCLUDED.country_code,
      data_center = EXCLUDED.data_center,
      requires_local_storage = EXCLUDED.requires_local_storage,
      compliance_requirements = EXCLUDED.compliance_requirements,
      encryption_required = EXCLUDED.encryption_required
  `;

  await pool.query(query, [
    config.tenantId,
    config.region,
    config.countryCode || null,
    config.dataCenter || null,
    config.requiresLocalStorage,
    config.complianceRequirements,
    config.encryptionRequired,
  ]);

  // Clear cache
  residencyCache.delete(config.tenantId);
}

/**
 * Validate if data can be transferred cross-border
 */
export function canTransferCrossBorder(
  sourceRegion: string,
  targetRegion: string,
  complianceRequirements: string[]
): { allowed: boolean; reason?: string } {
  // EU GDPR restrictions
  if (complianceRequirements.includes('GDPR')) {
    // EU to non-adequacy country transfers require safeguards
    if (sourceRegion === 'EU' && !['EU', 'UK', 'CH', 'CA'].includes(targetRegion)) {
      return {
        allowed: false,
        reason: 'GDPR does not allow transfers outside EU without adequate safeguards',
      };
    }
  }

  // HIPAA restrictions
  if (complianceRequirements.includes('HIPAA')) {
    // HIPAA data should stay in US
    if (sourceRegion === 'US' && targetRegion !== 'US') {
      return {
        allowed: false,
        reason: 'HIPAA data must remain in United States',
      };
    }
  }

  // China data localization
  if (complianceRequirements.includes('PIPL')) {
    if (sourceRegion === 'CN' && targetRegion !== 'CN') {
      return {
        allowed: false,
        reason: 'China PIPL requires data localization',
      };
    }
  }

  return { allowed: true };
}

/**
 * Get supported regions
 */
export function getSupportedRegions(): string[] {
  return ['EU', 'US', 'UK', 'APAC', 'CA', 'AU', 'JP', 'IN', 'BR', 'CN'];
}
