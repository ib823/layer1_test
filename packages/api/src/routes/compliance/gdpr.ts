import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { validateRequest, schemas } from '../../middleware/validator';
import { GDPRService } from '@sap-framework/core';
import { ApiResponseUtil } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { config } from '../../config';
import { z } from 'zod';
import logger from '../../utils/logger';

const router: Router = Router();

// Validation schemas
const createRequestSchema = z.object({
  requestType: z.enum(['FORGET', 'ACCESS', 'RECTIFY', 'PORTABILITY']),
  subjectType: z.enum(['USER', 'CUSTOMER', 'EMPLOYEE']),
  subjectId: z.string().min(1),
  subjectEmail: z.string().email().optional(),
  subjectIdentifiers: z.any().optional(),
  notes: z.string().optional(),
});

const verifyRequestSchema = z.object({
  token: z.string().min(1),
});

/**
 * @swagger
 * /api/compliance/gdpr/requests:
 *   post:
 *     summary: Create GDPR data subject request
 *     tags: [GDPR Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestType
 *               - subjectType
 *               - subjectId
 *             properties:
 *               requestType:
 *                 type: string
 *                 enum: [FORGET, ACCESS, RECTIFY, PORTABILITY]
 *               subjectType:
 *                 type: string
 *                 enum: [USER, CUSTOMER, EMPLOYEE]
 *               subjectId:
 *                 type: string
 *               subjectEmail:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Request created successfully
 */
router.post(
  '/requests',
  authenticate,
  validateRequest({ body: createRequestSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const gdprService = new GDPRService(config.databaseUrl);

      const request = await gdprService.createRequest({
        tenantId: req.user!.tenantId,
        requestedBy: req.user!.id,
        ...req.body,
      });

      await gdprService.close();

      logger.info('GDPR request created', {
        requestId: request.id,
        type: request.requestType,
        tenantId: req.user!.tenantId,
      });

      return ApiResponseUtil.success(res, request, 201);
    } catch (error: any) {
      logger.error('Failed to create GDPR request:', error);
      return ApiResponseUtil.serverError(res, error);
    }
  }
);

/**
 * @swagger
 * /api/compliance/gdpr/requests:
 *   get:
 *     summary: List GDPR data subject requests
 *     tags: [GDPR Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: requestType
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of GDPR requests
 */
router.get('/requests', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const gdprService = new GDPRService(config.databaseUrl);

    const { requests, total } = await gdprService.listRequests(req.user!.tenantId, {
      status: req.query.status as string,
      requestType: req.query.requestType as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
    });

    await gdprService.close();

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

    return ApiResponseUtil.paginated(res, requests, page, pageSize, total);
  } catch (error: any) {
    logger.error('Failed to list GDPR requests:', error);
    return ApiResponseUtil.serverError(res, error);
  }
});

/**
 * @swagger
 * /api/compliance/gdpr/requests/{requestId}:
 *   get:
 *     summary: Get GDPR request details
 *     tags: [GDPR Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request details
 *       404:
 *         description: Request not found
 */
router.get('/requests/:requestId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const gdprService = new GDPRService(config.databaseUrl);

    const request = await gdprService.getRequest(req.params.requestId);

    await gdprService.close();

    if (!request) {
      return ApiResponseUtil.notFound(res, 'GDPR request');
    }

    return ApiResponseUtil.success(res, request);
  } catch (error: any) {
    logger.error('Failed to get GDPR request:', error);
    return ApiResponseUtil.serverError(res, error);
  }
});

/**
 * @swagger
 * /api/compliance/gdpr/requests/{requestId}/verify:
 *   post:
 *     summary: Verify GDPR request with token
 *     tags: [GDPR Compliance]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request verified successfully
 */
router.post(
  '/requests/:requestId/verify',
  validateRequest({ body: verifyRequestSchema }),
  async (req: Request, res: Response) => {
    try {
      const gdprService = new GDPRService(config.databaseUrl);

      const verified = await gdprService.verifyRequest(req.params.requestId, req.body.token);

      await gdprService.close();

      if (!verified) {
        return ApiResponseUtil.badRequest(res, 'Invalid or expired verification token');
      }

      return ApiResponseUtil.success(res, { verified: true });
    } catch (error: any) {
      logger.error('Failed to verify GDPR request:', error);
      return ApiResponseUtil.serverError(res, error);
    }
  }
);

/**
 * @swagger
 * /api/compliance/gdpr/requests/{requestId}/execute:
 *   post:
 *     summary: Execute GDPR request (admin only)
 *     tags: [GDPR Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request executed successfully
 */
router.post('/requests/:requestId/execute', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Require admin role for execution
    if (!req.user!.roles.includes('admin')) {
      return ApiResponseUtil.forbidden(res, 'Admin role required to execute GDPR requests');
    }

    const gdprService = new GDPRService(config.databaseUrl);
    const request = await gdprService.getRequest(req.params.requestId);

    if (!request) {
      await gdprService.close();
      return ApiResponseUtil.notFound(res, 'GDPR request');
    }

    let result: any;

    if (request.requestType === 'FORGET') {
      await gdprService.executeForgetRequest(req.params.requestId, req.user!.id);
      result = { message: 'Data deletion completed' };
    } else if (request.requestType === 'ACCESS') {
      result = await gdprService.executeAccessRequest(req.params.requestId, req.user!.id);
    } else {
      await gdprService.close();
      return ApiResponseUtil.badRequest(res, `Request type ${request.requestType} not yet implemented`);
    }

    await gdprService.close();

    logger.info('GDPR request executed', {
      requestId: req.params.requestId,
      type: request.requestType,
      executedBy: req.user!.id,
    });

    return ApiResponseUtil.success(res, result);
  } catch (error: any) {
    logger.error('Failed to execute GDPR request:', error);
    return ApiResponseUtil.serverError(res, error);
  }
});

export default router;
