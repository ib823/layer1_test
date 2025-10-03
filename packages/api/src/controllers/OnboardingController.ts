import { Request, Response, NextFunction } from 'express';
import { TenantProfileRepository } from '@sap-framework/core';
import { OnboardingService } from '../services/OnboardingService';
import { ApiResponseUtil } from '../utils/response';
import { ConnectionTestRequest } from '../types';
import logger from '../utils/logger';

export class OnboardingController {
  private onboardingService: OnboardingService;

  constructor(private tenantRepo: TenantProfileRepository) {
    this.onboardingService = new OnboardingService(tenantRepo);
  }

  /**
   * @swagger
   * /onboarding/start:
   *   post:
   *     summary: Start tenant onboarding
   *     description: Initiate a new onboarding session for a tenant
   *     tags: [Onboarding]
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
   *             properties:
   *               tenantId:
   *                 type: string
   *               companyName:
   *                 type: string
   *     responses:
   *       201:
   *         description: Onboarding session created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   */
  async startOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, companyName } = req.body;

      logger.info('Starting onboarding', { tenantId, companyName });

      // Check if tenant already exists
      const existing = await this.tenantRepo.getTenant(tenantId);
      if (existing) {
        ApiResponseUtil.badRequest(res, 'Tenant already exists');
        return;
      }

      // Create tenant first
      await this.tenantRepo.createTenant(tenantId, companyName);

      // Start onboarding session
      const session = await this.onboardingService.startOnboarding(tenantId, companyName);

      logger.info('Onboarding session created', { sessionId: session.id });

      ApiResponseUtil.success(res, session, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/onboarding/:sessionId/connection
   * Test SAP connection
   */
  async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const connectionData: ConnectionTestRequest = req.body;

      logger.info('Testing connection', { sessionId });

      const result = await this.onboardingService.testConnection(sessionId, connectionData);

      if (result.success) {
        ApiResponseUtil.success(res, result);
      } else {
        ApiResponseUtil.badRequest(res, result.message, result.details);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/onboarding/:sessionId/discover
   * Run service discovery
   */
  async runDiscovery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const connectionData: ConnectionTestRequest = req.body;

      logger.info('Running discovery', { sessionId });

      const result = await this.onboardingService.runDiscovery(sessionId, connectionData);

      if (result.success) {
        ApiResponseUtil.success(res, result);
      } else {
        ApiResponseUtil.badRequest(res, 'Discovery failed', result.errors);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/onboarding/:sessionId/complete
   * Complete onboarding
   */
  async completeOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { sapConnection } = req.body;

      logger.info('Completing onboarding', { sessionId });

      const result = await this.onboardingService.completeOnboarding(
        sessionId,
        sapConnection
      );

      if (result.success) {
        ApiResponseUtil.success(res, {
          message: 'Onboarding completed successfully',
          tenant: result.tenant,
        });
      } else {
        ApiResponseUtil.badRequest(res, 'Onboarding completion failed');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/onboarding/:sessionId/status
   * Get onboarding status
   */
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      logger.info('Getting onboarding status', { sessionId });

      const session = this.onboardingService.getStatus(sessionId);

      if (!session) {
        ApiResponseUtil.notFound(res, 'Onboarding session');
        return;
      }

      ApiResponseUtil.success(res, session);
    } catch (error) {
      next(error);
    }
  }
}