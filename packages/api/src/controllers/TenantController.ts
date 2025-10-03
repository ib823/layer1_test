import { Request, Response, NextFunction } from 'express';
import { TenantProfileRepository } from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import { CreateTenantRequest, UpdateTenantRequest } from '../types';
import logger from '../utils/logger';

export class TenantController {
  constructor(private tenantRepo: TenantProfileRepository) {}

  /**
   * @swagger
   * /admin/tenants:
   *   get:
   *     summary: List all tenants
   *     description: Retrieve paginated list of all tenants with optional status filtering
   *     tags: [Tenants]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of items per page
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [ACTIVE, INACTIVE, SUSPENDED]
   *         description: Filter by tenant status
   *     responses:
   *       200:
   *         description: List of tenants
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedResponse'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  async listTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const status = req.query.status as string;

      logger.info('Listing tenants', { page, pageSize, status });

      // TODO: Implement pagination in repository
      // For now, get all tenants and filter
      const allTenants = await this.tenantRepo.getAllTenants();
      
      let filteredTenants = allTenants;
      if (status) {
        filteredTenants = allTenants.filter(t => t.status === status);
      }

      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedTenants = filteredTenants.slice(start, end);

      ApiResponseUtil.paginated(
        res,
        paginatedTenants,
        page,
        pageSize,
        filteredTenants.length
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /admin/tenants/{tenantId}:
   *   get:
   *     summary: Get tenant details
   *     description: Retrieve comprehensive tenant information including capability profile and active modules
   *     tags: [Tenants]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantId
   *         required: true
   *         schema:
   *           type: string
   *         description: Tenant ID
   *     responses:
   *       200:
   *         description: Tenant details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  async getTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;

      logger.info('Getting tenant details', { tenantId });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      const profile = await this.tenantRepo.getProfile(tenantId);
      const activeModules = await this.tenantRepo.getActiveModules(tenantId);

      ApiResponseUtil.success(res, {
        tenant,
        profile,
        activeModules,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /admin/tenants:
   *   post:
   *     summary: Create new tenant
   *     description: Create a new tenant with SAP connection details
   *     tags: [Tenants]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tenantId
   *               - companyName
   *               - sapConnection
   *             properties:
   *               tenantId:
   *                 type: string
   *                 description: Unique tenant identifier
   *               companyName:
   *                 type: string
   *                 description: Company name
   *               sapConnection:
   *                 type: object
   *                 description: SAP connection configuration
   *     responses:
   *       201:
   *         description: Tenant created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  async createTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateTenantRequest = req.body;

      logger.info('Creating tenant', { tenantId: data.tenantId, companyName: data.companyName });

      // Check if tenant already exists
      const existing = await this.tenantRepo.getTenant(data.tenantId);
      if (existing) {
        ApiResponseUtil.badRequest(res, 'Tenant already exists');
        return;
      }

      // Create tenant
      const tenant = await this.tenantRepo.createTenant(
        data.tenantId,
        data.companyName
      );

      // Store SAP connection details
      await this.tenantRepo.saveSAPConnection(tenant.tenant_id, data.sapConnection);

      logger.info('Tenant created successfully', { tenantId: tenant.tenant_id });

      ApiResponseUtil.success(res, tenant, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/tenants/:tenantId
   * Update tenant details
   */
  async updateTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;
      const updates: UpdateTenantRequest = req.body;

      logger.info('Updating tenant', { tenantId, updates });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      const updatedTenant = await this.tenantRepo.updateTenant(tenantId, updates);

      logger.info('Tenant updated successfully', { tenantId });

      ApiResponseUtil.success(res, updatedTenant);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/tenants/:tenantId
   * Delete tenant (soft delete)
   */
  async deleteTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;

      logger.info('Deleting tenant', { tenantId });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      await this.tenantRepo.updateTenant(tenantId, { status: 'INACTIVE' });

      logger.info('Tenant deleted successfully', { tenantId });

      ApiResponseUtil.success(res, { message: 'Tenant deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/tenants/:tenantId/modules
   * Get active modules for tenant
   */
  async getActiveModules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;

      logger.info('Getting active modules', { tenantId });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      const modules = await this.tenantRepo.getActiveModules(tenantId);

      ApiResponseUtil.success(res, { modules });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /admin/tenants/{tenantId}/modules/{moduleName}/activate:
   *   post:
   *     summary: Activate module for tenant
   *     description: Enable a specific module for a tenant after verifying required capabilities
   *     tags: [Tenants]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: moduleName
   *         required: true
   *         schema:
   *           type: string
   *           enum: [SoD_Analysis, Invoice_Matching, Anomaly_Detection]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Reason for activation
   *     responses:
   *       200:
   *         description: Module activated successfully
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  async activateModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, moduleName } = req.params;
      const { reason } = req.body;

      logger.info('Activating module', { tenantId, moduleName, reason });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      // Check if tenant has required capabilities
      const profile = await this.tenantRepo.getProfile(tenantId);
      if (!profile) {
        ApiResponseUtil.badRequest(res, 'Tenant profile not found. Run service discovery first.');
        return;
      }

      // Module-specific capability checks
      const capabilityChecks: Record<string, () => boolean> = {
        'SoD_Analysis': () => profile.capabilities.canDoSoD,
        'Invoice_Matching': () => profile.capabilities.canDoInvoiceMatching,
        'Anomaly_Detection': () => profile.capabilities.canDoAnomalyDetection,
      };

      const canActivate = capabilityChecks[moduleName];
      if (canActivate && !canActivate()) {
        ApiResponseUtil.badRequest(
          res,
          `Tenant does not have required capabilities for ${moduleName}`,
          { missingServices: profile.missingServices }
        );
        return;
      }

      await this.tenantRepo.activateModule(tenantId, moduleName, reason);

      logger.info('Module activated successfully', { tenantId, moduleName });

      ApiResponseUtil.success(res, {
        message: 'Module activated successfully',
        moduleName,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/tenants/:tenantId/modules/:moduleName/deactivate
   * Deactivate module for tenant
   */
  async deactivateModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, moduleName } = req.params;

      logger.info('Deactivating module', { tenantId, moduleName });

      const tenant = await this.tenantRepo.getTenant(tenantId);
      if (!tenant) {
        ApiResponseUtil.notFound(res, 'Tenant');
        return;
      }

      await this.tenantRepo.deactivateModule(tenantId, moduleName);

      logger.info('Module deactivated successfully', { tenantId, moduleName });

      ApiResponseUtil.success(res, {
        message: 'Module deactivated successfully',
        moduleName,
      });
    } catch (error) {
      next(error);
    }
  }
}