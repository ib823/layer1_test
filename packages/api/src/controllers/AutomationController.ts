/**
 * Automation Controller
 *
 * API controller for workflow automation management
 *
 * @module controllers/AutomationController
 */

import { Response } from 'express';
import {
  automationEngine,
  Automation,
  TriggerType,
  ActionType,
  AutomationStatus,
} from '@sap-framework/core';
import { ApiResponseUtil } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';
import { sanitizeInput } from '../utils/sanitization';

/**
 * AutomationController class
 * Handles all automation workflow requests
 */
export class AutomationController {
  /**
   * Get all automations for tenant
   * GET /api/automations
   */
  static async getAutomations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'Tenant ID is required');
        return;
      }

      const automations = automationEngine
        .getAutomations()
        .filter((a) => a.tenantId === tenantId);

      ApiResponseUtil.success(res, {
        automations,
        total: automations.length,
      });
    } catch (error) {
      logger.error('Failed to get automations', { error });
      ApiResponseUtil.error(res, 'Failed to get automations', String(error));
    }
  }

  /**
   * Get single automation
   * GET /api/automations/:id
   */
  static async getAutomation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'Tenant ID is required');
        return;
      }

      const automation = automationEngine.getAutomation(id);

      if (!automation) {
        ApiResponseUtil.notFound(res, 'Automation not found');
        return;
      }

      if (automation.tenantId !== tenantId) {
        ApiResponseUtil.forbidden(res, 'Access denied');
        return;
      }

      ApiResponseUtil.success(res, { automation });
    } catch (error) {
      logger.error('Failed to get automation', { error });
      ApiResponseUtil.error(res, 'Failed to get automation', String(error));
    }
  }

  /**
   * Create new automation
   * POST /api/automations
   */
  static async createAutomation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, description, trigger, actions, enabled = true } = req.body;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        ApiResponseUtil.badRequest(res, 'Tenant ID and User ID are required');
        return;
      }

      if (!name || !trigger || !actions || !Array.isArray(actions)) {
        ApiResponseUtil.badRequest(
          res,
          'Missing required fields: name, trigger, actions (array)'
        );
        return;
      }

      // ✅ SECURITY FIX: Sanitize user inputs to prevent XSS
      // DEFECT-035: Stored XSS vulnerability fix
      const sanitizedName = sanitizeInput(name, { trim: true, maxLength: 255 });
      const sanitizedDescription = sanitizeInput(description, { trim: true, maxLength: 1000 });

      // Validate trigger type
      if (!Object.values(TriggerType).includes(trigger.type)) {
        ApiResponseUtil.badRequest(res, `Invalid trigger type: ${trigger.type}`);
        return;
      }

      // Validate action types
      for (const action of actions) {
        if (!Object.values(ActionType).includes(action.type)) {
          ApiResponseUtil.badRequest(res, `Invalid action type: ${action.type}`);
          return;
        }
      }

      const automation: Automation = {
        id: `automation-${Date.now()}`,
        tenantId,
        name: sanitizedName,
        description: sanitizedDescription,
        trigger,
        actions,
        enabled,
        status: AutomationStatus.ACTIVE,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        runCount: 0,
        errorCount: 0,
      };

      automationEngine.registerAutomation(automation);

      logger.info('Automation created', {
        automationId: automation.id,
        name: automation.name,
        tenantId,
      });

      ApiResponseUtil.success(res, { automation }, 201);
    } catch (error) {
      logger.error('Failed to create automation', { error });
      ApiResponseUtil.error(res, 'Failed to create automation', String(error));
    }
  }

  /**
   * Update automation
   * PUT /api/automations/:id
   */
  static async updateAutomation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, trigger, actions, enabled } = req.body;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'Tenant ID is required');
        return;
      }

      const automation = automationEngine.getAutomation(id);

      if (!automation) {
        ApiResponseUtil.notFound(res, 'Automation not found');
        return;
      }

      if (automation.tenantId !== tenantId) {
        ApiResponseUtil.forbidden(res, 'Access denied');
        return;
      }

      // ✅ SECURITY FIX: Sanitize user inputs to prevent XSS
      // Update fields with sanitization
      if (name !== undefined) {
        automation.name = sanitizeInput(name, { trim: true, maxLength: 255 });
      }
      if (description !== undefined) {
        automation.description = sanitizeInput(description, { trim: true, maxLength: 1000 });
      }
      if (trigger !== undefined) automation.trigger = trigger;
      if (actions !== undefined) automation.actions = actions;
      if (enabled !== undefined) automation.enabled = enabled;
      automation.updatedAt = new Date();

      logger.info('Automation updated', {
        automationId: automation.id,
        tenantId,
      });

      ApiResponseUtil.success(res, { automation });
    } catch (error) {
      logger.error('Failed to update automation', { error });
      ApiResponseUtil.error(res, 'Failed to update automation', String(error));
    }
  }

  /**
   * Delete automation
   * DELETE /api/automations/:id
   */
  static async deleteAutomation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'Tenant ID is required');
        return;
      }

      const automation = automationEngine.getAutomation(id);

      if (!automation) {
        ApiResponseUtil.notFound(res, 'Automation not found');
        return;
      }

      if (automation.tenantId !== tenantId) {
        ApiResponseUtil.forbidden(res, 'Access denied');
        return;
      }

      automationEngine.unregisterAutomation(id);

      logger.info('Automation deleted', {
        automationId: id,
        tenantId,
      });

      ApiResponseUtil.success(res, {
        message: 'Automation deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete automation', { error });
      ApiResponseUtil.error(res, 'Failed to delete automation', String(error));
    }
  }

  /**
   * Enable/disable automation
   * POST /api/automations/:id/toggle
   */
  static async toggleAutomation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        ApiResponseUtil.badRequest(res, 'Tenant ID is required');
        return;
      }

      const automation = automationEngine.getAutomation(id);

      if (!automation) {
        ApiResponseUtil.notFound(res, 'Automation not found');
        return;
      }

      if (automation.tenantId !== tenantId) {
        ApiResponseUtil.forbidden(res, 'Access denied');
        return;
      }

      automation.enabled = !automation.enabled;
      automation.updatedAt = new Date();

      logger.info('Automation toggled', {
        automationId: id,
        enabled: automation.enabled,
        tenantId,
      });

      ApiResponseUtil.success(res, {
        automation,
        message: `Automation ${automation.enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      logger.error('Failed to toggle automation', { error });
      ApiResponseUtil.error(res, 'Failed to toggle automation', String(error));
    }
  }

  /**
   * Execute automation manually
   * POST /api/automations/:id/execute
   */
  static async executeAutomation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { variables } = req.body;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        ApiResponseUtil.badRequest(res, 'Tenant ID and User ID are required');
        return;
      }

      const automation = automationEngine.getAutomation(id);

      if (!automation) {
        ApiResponseUtil.notFound(res, 'Automation not found');
        return;
      }

      if (automation.tenantId !== tenantId) {
        ApiResponseUtil.forbidden(res, 'Access denied');
        return;
      }

      const result = await automationEngine.execute(automation, {
        automationId: id,
        tenantId,
        triggeredBy: 'manual',
        triggeredAt: new Date(),
        variables,
      });

      logger.info('Automation executed manually', {
        automationId: id,
        success: result.success,
        tenantId,
      });

      ApiResponseUtil.success(res, { result });
    } catch (error) {
      logger.error('Failed to execute automation', { error });
      ApiResponseUtil.error(res, 'Failed to execute automation', String(error));
    }
  }

  /**
   * Get available trigger types
   * GET /api/automations/triggers
   */
  static async getTriggerTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const triggerTypes = Object.values(TriggerType).map((type) => ({
        value: type,
        label: AutomationController.getTriggerLabel(type),
        description: AutomationController.getTriggerDescription(type),
      }));

      ApiResponseUtil.success(res, { triggerTypes });
    } catch (error) {
      logger.error('Failed to get trigger types', { error });
      ApiResponseUtil.error(res, 'Failed to get trigger types', String(error));
    }
  }

  /**
   * Get available action types
   * GET /api/automations/actions
   */
  static async getActionTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const actionTypes = Object.values(ActionType).map((type) => ({
        value: type,
        label: AutomationController.getActionLabel(type),
        description: AutomationController.getActionDescription(type),
        fields: AutomationController.getActionFields(type),
      }));

      ApiResponseUtil.success(res, { actionTypes });
    } catch (error) {
      logger.error('Failed to get action types', { error });
      ApiResponseUtil.error(res, 'Failed to get action types', String(error));
    }
  }

  /**
   * Get trigger label
   * @private
   */
  private static getTriggerLabel(type: TriggerType): string {
    const labels: Record<TriggerType, string> = {
      [TriggerType.EVENT]: 'Event-Based',
      [TriggerType.SCHEDULE]: 'Schedule-Based',
      [TriggerType.CONDITION]: 'Condition-Based',
      [TriggerType.WEBHOOK]: 'Webhook',
    };
    return labels[type];
  }

  /**
   * Get trigger description
   * @private
   */
  private static getTriggerDescription(type: TriggerType): string {
    const descriptions: Record<TriggerType, string> = {
      [TriggerType.EVENT]: 'Trigger when a specific event occurs (e.g., audit log, module event)',
      [TriggerType.SCHEDULE]: 'Trigger on a schedule (cron expression)',
      [TriggerType.CONDITION]: 'Trigger when a condition is met (e.g., threshold exceeded)',
      [TriggerType.WEBHOOK]: 'Trigger via external webhook',
    };
    return descriptions[type];
  }

  /**
   * Get action label
   * @private
   */
  private static getActionLabel(type: ActionType): string {
    const labels: Record<ActionType, string> = {
      [ActionType.EMAIL]: 'Send Email',
      [ActionType.SLACK]: 'Send Slack Message',
      [ActionType.WEBHOOK]: 'Call Webhook',
      [ActionType.UPDATE_RECORD]: 'Update Record',
      [ActionType.CREATE_TASK]: 'Create Task',
      [ActionType.GENERATE_REPORT]: 'Generate Report',
      [ActionType.RUN_WORKFLOW]: 'Run Workflow',
    };
    return labels[type];
  }

  /**
   * Get action description
   * @private
   */
  private static getActionDescription(type: ActionType): string {
    const descriptions: Record<ActionType, string> = {
      [ActionType.EMAIL]: 'Send an email notification',
      [ActionType.SLACK]: 'Post a message to Slack channel',
      [ActionType.WEBHOOK]: 'Make an HTTP request to external endpoint',
      [ActionType.UPDATE_RECORD]: 'Update a database record',
      [ActionType.CREATE_TASK]: 'Create a task or work item',
      [ActionType.GENERATE_REPORT]: 'Generate and send a report',
      [ActionType.RUN_WORKFLOW]: 'Execute another automation workflow',
    };
    return descriptions[type];
  }

  /**
   * Get required fields for action type
   * @private
   */
  private static getActionFields(type: ActionType): string[] {
    const fields: Record<ActionType, string[]> = {
      [ActionType.EMAIL]: ['to', 'subject', 'template'],
      [ActionType.SLACK]: ['channel', 'message'],
      [ActionType.WEBHOOK]: ['url', 'method'],
      [ActionType.UPDATE_RECORD]: ['recordType', 'recordId', 'updates'],
      [ActionType.CREATE_TASK]: ['taskType', 'taskConfig'],
      [ActionType.GENERATE_REPORT]: ['reportType', 'reportFormat'],
      [ActionType.RUN_WORKFLOW]: ['workflowId'],
    };
    return fields[type];
  }
}
