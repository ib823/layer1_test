import { Request, Response, NextFunction } from 'express';
import { 
  TenantProfileRepository,
  S4HANAConnector,
  ServiceDiscovery 
} from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

export class DiscoveryController {
  constructor(private tenantRepo: TenantProfileRepository) {}

  /**
   * POST /api/admin/tenants/:tenantId/discovery
   * Trigger service discovery for tenant
   */
  async runDiscovery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { force } = req.query;

      logger.info('Running service discovery', { tenantId, force });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      // Get SAP connection details
      const sapConnection = await this.tenantRepo.getSAPConnection(tenantId);
      if (!sapConnection) {
        ApiResponseUtil.badRequest(res, 'SAP connection not configured for tenant');
        return;
      }

      // Create connector based on connection type
      const connector = new S4HANAConnector({
        baseUrl: sapConnection.base_url,
        auth: sapConnection.auth_credentials,
      });

      // Run service discovery
      const discovery = new ServiceDiscovery(connector);
      const result = await discovery.discoverServices();

      // Generate and save profile
      const profile = await discovery.generateTenantProfile(tenantId);
      await this.tenantRepo.saveProfile(profile);

      // Save discovery history
      await this.tenantRepo.saveDiscoveryHistory(tenantId, result);

      logger.info('Service discovery completed', {
        tenantId,
        servicesFound: result.services.length,
        success: result.success,
      });

      ApiResponseUtil.success(res, {
        profile,
        discoveryResult: result,
        message: 'Service discovery completed successfully',
      });
    } catch (error) {
      logger.error('Service discovery failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/admin/tenants/:tenantId/profile
   * Get tenant capability profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;

      logger.info('Getting tenant profile', { tenantId });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      const profile = await this.tenantRepo.getProfile(tenantId);
      if (!profile) {
        ApiResponseUtil.notFound(res, 'Tenant profile. Run service discovery first.');
        return;
      }

      ApiResponseUtil.success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/tenants/:tenantId/discovery/history
   * Get discovery history for tenant
   */
  async getDiscoveryHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      logger.info('Getting discovery history', { tenantId, limit });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      const history = await this.tenantRepo.getDiscoveryHistory(tenantId, limit);

      ApiResponseUtil.success(res, { history });
    } catch (error) {
      next(error);
    }
  }
}