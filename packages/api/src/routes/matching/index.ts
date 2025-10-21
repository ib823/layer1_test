/**
 * Invoice Matching Routes
 * Three-way match and fraud detection endpoints
 */

import { Router } from 'express';
import { InvoiceMatchingController } from '../../controllers/InvoiceMatchingController';

const router: Router = Router();

/**
 * @swagger
 * /api/matching/analyze:
 *   post:
 *     summary: Run invoice matching analysis
 *     tags: [Invoice Matching]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *             properties:
 *               tenantId:
 *                 type: string
 *               vendorIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *               invoiceStatus:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [PENDING, MATCHED, POSTED, PAID, BLOCKED, REJECTED]
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/analyze', InvoiceMatchingController.runAnalysis);

/**
 * @swagger
 * /api/matching/runs:
 *   get:
 *     summary: Get all runs for a tenant
 *     tags: [Invoice Matching]
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Runs retrieved successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/runs', InvoiceMatchingController.getRuns);

/**
 * @swagger
 * /api/matching/runs/{runId}:
 *   get:
 *     summary: Get match results for a specific run
 *     tags: [Invoice Matching]
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: matchStatus
 *         schema:
 *           type: string
 *       - in: query
 *         name: minRiskScore
 *         schema:
 *           type: integer
 *       - in: query
 *         name: maxRiskScore
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Match results retrieved
 *       500:
 *         description: Server error
 */
router.get('/runs/:runId', InvoiceMatchingController.getMatchResults);

/**
 * @swagger
 * /api/matching/invoice/{invoiceNumber}:
 *   post:
 *     summary: Match a single invoice
 *     tags: [Invoice Matching]
 *     parameters:
 *       - in: path
 *         name: invoiceNumber
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
 *               - tenantId
 *             properties:
 *               tenantId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invoice matched successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/invoice/:invoiceNumber', InvoiceMatchingController.matchSingleInvoice);

/**
 * @swagger
 * /api/matching/fraud-alerts:
 *   get:
 *     summary: Get fraud alerts
 *     tags: [Invoice Matching]
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: pattern
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Fraud alerts retrieved
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/fraud-alerts', InvoiceMatchingController.getFraudAlerts);

/**
 * @swagger
 * /api/matching/vendor-patterns:
 *   get:
 *     summary: Get vendor payment patterns
 *     tags: [Invoice Matching]
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vendorIds
 *         schema:
 *           type: string
 *       - in: query
 *         name: minRiskScore
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Vendor patterns retrieved
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/vendor-patterns', InvoiceMatchingController.getVendorPatterns);

/**
 * @swagger
 * /api/matching/vendor-patterns/analyze:
 *   post:
 *     summary: Analyze vendor payment patterns
 *     tags: [Invoice Matching]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *             properties:
 *               tenantId:
 *                 type: string
 *               vendorIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               fromDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Vendor patterns analyzed
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/vendor-patterns/analyze', InvoiceMatchingController.analyzeVendorPatterns);

export default router;
