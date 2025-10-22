/**
 * Automation Routes
 *
 * API routes for workflow automation management
 *
 * @module routes/automations
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { AutomationController } from '../controllers/AutomationController';

const router: ExpressRouter = Router();

/**
 * GET /api/automations
 * Get all automations for tenant
 */
router.get('/', AutomationController.getAutomations);

/**
 * GET /api/automations/triggers
 * Get available trigger types
 */
router.get('/triggers', AutomationController.getTriggerTypes);

/**
 * GET /api/automations/actions
 * Get available action types
 */
router.get('/actions', AutomationController.getActionTypes);

/**
 * GET /api/automations/:id
 * Get single automation by ID
 */
router.get('/:id', AutomationController.getAutomation);

/**
 * POST /api/automations
 * Create new automation
 *
 * Body:
 * - name (required): Automation name
 * - description (optional): Description
 * - trigger (required): Trigger configuration
 * - actions (required): Array of action configurations
 * - enabled (optional): true/false
 */
router.post('/', AutomationController.createAutomation);

/**
 * PUT /api/automations/:id
 * Update automation
 *
 * Body:
 * - name, description, trigger, actions, enabled
 */
router.put('/:id', AutomationController.updateAutomation);

/**
 * DELETE /api/automations/:id
 * Delete automation
 */
router.delete('/:id', AutomationController.deleteAutomation);

/**
 * POST /api/automations/:id/toggle
 * Enable/disable automation
 */
router.post('/:id/toggle', AutomationController.toggleAutomation);

/**
 * POST /api/automations/:id/execute
 * Execute automation manually
 *
 * Body:
 * - variables (optional): Variables for execution context
 */
router.post('/:id/execute', AutomationController.executeAutomation);

export default router;
