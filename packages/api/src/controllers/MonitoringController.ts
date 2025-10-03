import { Request, Response, NextFunction } from 'express';
import { TenantProfileRepository } from '@sap-framework/core';
import { MonitoringService } from '../services/MonitoringService';
import { ApiResponseUtil } from '../utils/response';
import logger from '../utils/logger';

export class MonitoringController {
  private monitoringService: MonitoringService;

  constructor(private tenantRepo: TenantProfileRepository) {
    this.monitoringService = new MonitoringService(tenantRepo);
  }

  /**
   * GET /api/monitoring/health
   * Get overall system health
   */
  async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Health check requested');

      const health = await this.monitoringService.getSystemHealth();

      // Return 503 if system is down
      const statusCode = health.status === 'DOWN' ? 503 : 200;

      ApiResponseUtil.success(res, health, statusCode);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/monitoring/connectors
   * Get connector statuses
   */
  async getConnectors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Connector status check requested');

      const connectors = await this.monitoringService.getConnectorStatuses();

      ApiResponseUtil.success(res, { connectors });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/monitoring/metrics
   * Get system metrics
   */
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Metrics requested');

      const metrics = await this.monitoringService.getMetrics();

      ApiResponseUtil.success(res, metrics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/monitoring/discovery/history
   * Get discovery history across all tenants
   */
  async getDiscoveryHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;

      logger.info('Discovery history requested', { limit });

      const tenants = await this.tenantRepo.getAllTenants();
      const allHistory = [];

      for (const tenant of tenants) {
        const history = await this.tenantRepo.getDiscoveryHistory(tenant.tenant_id, limit);
        allHistory.push(...history.map(h => ({ ...h, tenantId: tenant.tenant_id })));
      }

      // Sort by date, most recent first
      allHistory.sort((a, b) => 
        new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime()
      );

      ApiResponseUtil.success(res, { 
        history: allHistory.slice(0, limit),
        total: allHistory.length 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/monitoring/tenants/:tenantId/status
   * Get tenant-specific monitoring status
   */
  async getTenantStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;

      logger.info('Tenant status requested', { tenantId });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      const profile = await this.tenantRepo.getProfile(tenantId);
      const activeModules = await this.tenantRepo.getActiveModules(tenantId);
      const connection = await this.tenantRepo.getSAPConnection(tenantId);

      const status = {
        tenant,
        profile,
        activeModules,
        connection: connection ? {
          type: connection.connection_type,
          baseUrl: connection.base_url,
          isActive: connection.is_active,
          lastUpdated: connection.updated_at,
        } : null,
        health: {
          hasProfile: !!profile,
          hasConnection: !!connection,
          moduleCount: activeModules.length,
          lastDiscovery: profile?.discoveredAt,
        },
      };

      ApiResponseUtil.success(res, status);
    } catch (error) {
      next(error);
    }
  }
}