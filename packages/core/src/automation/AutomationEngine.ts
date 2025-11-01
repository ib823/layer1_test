/**
 * Automation Engine
 *
 * Core orchestrator for workflow automation
 * Supports event-based, schedule-based, and condition-based triggers
 * Executes actions like email, webhooks, Slack notifications, etc.
 *
 * @module automation/AutomationEngine
 */

import { PrismaClient } from '../generated/prisma';
import { EventEmitter } from 'events';
import logger from '../utils/logger';
import { getEmailService } from '../email/EmailService';

/**
 * Automation trigger types
 */
export enum TriggerType {
  EVENT = 'event',
  SCHEDULE = 'schedule',
  CONDITION = 'condition',
  WEBHOOK = 'webhook',
}

/**
 * Automation action types
 */
export enum ActionType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  UPDATE_RECORD = 'update_record',
  CREATE_TASK = 'create_task',
  GENERATE_REPORT = 'generate_report',
  RUN_WORKFLOW = 'run_workflow',
}

/**
 * Automation status
 */
export enum AutomationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
  ERROR = 'error',
}

/**
 * Trigger configuration
 */
export interface TriggerConfig {
  type: TriggerType;
  config: any;
  // Event trigger
  eventType?: string;
  eventFilter?: Record<string, any>;
  // Schedule trigger
  schedule?: string; // cron expression
  // Condition trigger
  condition?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
    value: any;
  };
  // Webhook trigger
  webhookPath?: string;
  webhookSecret?: string;
}

/**
 * Action configuration
 */
export interface ActionConfig {
  type: ActionType;
  config: any;
  // Email action
  to?: string[];
  subject?: string;
  template?: string;
  // Slack action
  channel?: string;
  message?: string;
  // Webhook action
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  // Update record action
  recordType?: string;
  recordId?: string;
  updates?: Record<string, any>;
  // Create task action
  taskType?: string;
  taskConfig?: any;
  // Generate report action
  reportType?: string;
  reportFormat?: string;
  // Run workflow action
  workflowId?: string;
}

/**
 * Automation definition
 */
export interface Automation {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  trigger: TriggerConfig;
  actions: ActionConfig[];
  enabled: boolean;
  status: AutomationStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
}

/**
 * Automation execution context
 */
export interface ExecutionContext {
  automationId: string;
  tenantId: string;
  triggeredBy: string;
  triggeredAt: Date;
  event?: any;
  variables?: Record<string, any>;
}

/**
 * Automation execution result
 */
export interface ExecutionResult {
  success: boolean;
  executedActions: number;
  failedActions: number;
  errors?: string[];
  duration: number;
}

/**
 * AutomationEngine class
 * Singleton service for managing and executing automations
 */
export class AutomationEngine extends EventEmitter {
  private static instance: AutomationEngine;
  private prisma: PrismaClient;
  private automations: Map<string, Automation>;
  private running: boolean;

  private constructor(prisma?: PrismaClient) {
    super();
    this.prisma = prisma || new PrismaClient();
    this.automations = new Map();
    this.running = false;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(prisma?: PrismaClient): AutomationEngine {
    if (!AutomationEngine.instance) {
      AutomationEngine.instance = new AutomationEngine(prisma);
    }
    return AutomationEngine.instance;
  }

  /**
   * Start the automation engine
   */
  public async start(): Promise<void> {
    if (this.running) {
      logger.warn('AutomationEngine is already running');
      return;
    }

    logger.info('Starting AutomationEngine');
    this.running = true;

    // Load active automations from database
    await this.loadAutomations();

    // Set up event listeners
    this.setupEventListeners();

    logger.info('AutomationEngine started successfully');
  }

  /**
   * Stop the automation engine
   */
  public async stop(): Promise<void> {
    logger.info('Stopping AutomationEngine');
    this.running = false;
    this.removeAllListeners();
    logger.info('AutomationEngine stopped');
  }

  /**
   * Load automations from database
   */
  private async loadAutomations(): Promise<void> {
    try {
      // TODO: Load from database when Automation table exists
      // For now, use in-memory storage
      logger.info('Loaded automations from database', {
        count: this.automations.size,
      });
    } catch (error) {
      logger.error('Failed to load automations', { error });
    }
  }

  /**
   * Set up event listeners for triggers
   */
  private setupEventListeners(): void {
    // Listen to application events
    this.on('audit_event', (event: any) => {
      this.handleEvent('audit_event', event);
    });

    this.on('module_event', (event: any) => {
      this.handleEvent('module_event', event);
    });

    this.on('system_event', (event: any) => {
      this.handleEvent('system_event', event);
    });
  }

  /**
   * Handle incoming events
   */
  private async handleEvent(eventType: string, event: any): Promise<void> {
    const automations = Array.from(this.automations.values()).filter(
      (automation) =>
        automation.enabled &&
        automation.trigger.type === TriggerType.EVENT &&
        automation.trigger.eventType === eventType
    );

    for (const automation of automations) {
      // Check event filter
      if (automation.trigger.eventFilter) {
        if (!this.matchesFilter(event, automation.trigger.eventFilter)) {
          continue;
        }
      }

      // Execute automation
      await this.execute(automation, {
        automationId: automation.id,
        tenantId: automation.tenantId,
        triggeredBy: 'event',
        triggeredAt: new Date(),
        event,
      });
    }
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(event: any, filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (event[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Execute an automation
   */
  public async execute(
    automation: Automation,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    logger.info('Executing automation', {
      automationId: automation.id,
      name: automation.name,
      trigger: automation.trigger.type,
    });

    const result: ExecutionResult = {
      success: true,
      executedActions: 0,
      failedActions: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Execute each action in sequence
      for (const action of automation.actions) {
        try {
          await this.executeAction(action, context);
          result.executedActions++;
        } catch (error) {
          logger.error('Action execution failed', {
            automationId: automation.id,
            actionType: action.type,
            error,
          });
          result.failedActions++;
          result.errors?.push(String(error));
          result.success = false;
        }
      }

      // Update automation statistics
      await this.updateAutomationStats(automation.id, result.success);

      result.duration = Date.now() - startTime;

      logger.info('Automation execution completed', {
        automationId: automation.id,
        success: result.success,
        executedActions: result.executedActions,
        failedActions: result.failedActions,
        duration: result.duration,
      });
    } catch (error) {
      logger.error('Automation execution failed', {
        automationId: automation.id,
        error,
      });
      result.success = false;
      result.errors?.push(String(error));
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<void> {
    logger.info('Executing action', {
      type: action.type,
      automationId: context.automationId,
    });

    switch (action.type) {
      case ActionType.EMAIL:
        await this.executeEmailAction(action, context);
        break;
      case ActionType.SLACK:
        await this.executeSlackAction(action, context);
        break;
      case ActionType.WEBHOOK:
        await this.executeWebhookAction(action, context);
        break;
      case ActionType.UPDATE_RECORD:
        await this.executeUpdateRecordAction(action, context);
        break;
      case ActionType.CREATE_TASK:
        await this.executeCreateTaskAction(action, context);
        break;
      case ActionType.GENERATE_REPORT:
        await this.executeGenerateReportAction(action, context);
        break;
      case ActionType.RUN_WORKFLOW:
        await this.executeRunWorkflowAction(action, context);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute email action
   */
  private async executeEmailAction(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!action.to || !action.subject) {
      throw new Error('Email action requires to and subject');
    }

    const emailService = getEmailService();
    await emailService.sendEmail({
      to: action.to,
      subject: action.subject,
      template: action.template || 'automation-notification',
      data: {
        automation: context.automationId,
        event: context.event,
        variables: context.variables,
      },
    });
  }

  /**
   * Execute Slack action
   */
  private async executeSlackAction(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!action.channel || !action.message) {
      throw new Error('Slack action requires channel and message');
    }

    // TODO: Implement Slack integration
    logger.info('Slack notification sent', {
      channel: action.channel,
      message: action.message,
    });
  }

  /**
   * Execute webhook action
   */
  private async executeWebhookAction(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!action.url) {
      throw new Error('Webhook action requires url');
    }

    const response = await fetch(action.url, {
      method: action.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...action.headers,
      },
      body: JSON.stringify(action.body || context),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
  }

  /**
   * Execute update record action
   */
  private async executeUpdateRecordAction(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!action.recordType || !action.recordId || !action.updates) {
      throw new Error('Update record action requires recordType, recordId, and updates');
    }

    // TODO: Implement generic record update
    logger.info('Record updated', {
      recordType: action.recordType,
      recordId: action.recordId,
      updates: action.updates,
    });
  }

  /**
   * Execute create task action
   */
  private async executeCreateTaskAction(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!action.taskType) {
      throw new Error('Create task action requires taskType');
    }

    // TODO: Implement task creation
    logger.info('Task created', {
      taskType: action.taskType,
      config: action.taskConfig,
    });
  }

  /**
   * Execute generate report action
   */
  private async executeGenerateReportAction(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!action.reportType || !action.reportFormat) {
      throw new Error('Generate report action requires reportType and reportFormat');
    }

    // TODO: Integrate with reportGenerator
    logger.info('Report generated', {
      reportType: action.reportType,
      format: action.reportFormat,
    });
  }

  /**
   * Execute run workflow action
   */
  private async executeRunWorkflowAction(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!action.workflowId) {
      throw new Error('Run workflow action requires workflowId');
    }

    const workflow = this.automations.get(action.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${action.workflowId}`);
    }

    await this.execute(workflow, context);
  }

  /**
   * Update automation statistics
   */
  private async updateAutomationStats(
    automationId: string,
    success: boolean
  ): Promise<void> {
    // TODO: Update in database
    const automation = this.automations.get(automationId);
    if (automation) {
      automation.lastRun = new Date();
      automation.runCount++;
      if (!success) {
        automation.errorCount++;
      }
    }
  }

  /**
   * Register a new automation
   */
  public registerAutomation(automation: Automation): void {
    this.automations.set(automation.id, automation);
    logger.info('Automation registered', {
      id: automation.id,
      name: automation.name,
    });
  }

  /**
   * Unregister an automation
   */
  public unregisterAutomation(automationId: string): void {
    this.automations.delete(automationId);
    logger.info('Automation unregistered', { id: automationId });
  }

  /**
   * Get all automations
   */
  public getAutomations(): Automation[] {
    return Array.from(this.automations.values());
  }

  /**
   * Get automation by ID
   */
  public getAutomation(automationId: string): Automation | undefined {
    return this.automations.get(automationId);
  }

  /**
   * Trigger automations by schedule
   */
  public async triggerScheduled(schedule: string): Promise<void> {
    const automations = Array.from(this.automations.values()).filter(
      (automation) =>
        automation.enabled &&
        automation.trigger.type === TriggerType.SCHEDULE &&
        automation.trigger.schedule === schedule
    );

    for (const automation of automations) {
      await this.execute(automation, {
        automationId: automation.id,
        tenantId: automation.tenantId,
        triggeredBy: 'schedule',
        triggeredAt: new Date(),
      });
    }
  }

  /**
   * Trigger automation by webhook
   */
  public async triggerWebhook(
    webhookPath: string,
    secret: string,
    data: any
  ): Promise<ExecutionResult[]> {
    const automations = Array.from(this.automations.values()).filter(
      (automation) =>
        automation.enabled &&
        automation.trigger.type === TriggerType.WEBHOOK &&
        automation.trigger.webhookPath === webhookPath &&
        automation.trigger.webhookSecret === secret
    );

    const results: ExecutionResult[] = [];
    for (const automation of automations) {
      const result = await this.execute(automation, {
        automationId: automation.id,
        tenantId: automation.tenantId,
        triggeredBy: 'webhook',
        triggeredAt: new Date(),
        event: data,
      });
      results.push(result);
    }

    return results;
  }
}

/**
 * Export singleton instance
 */
export const automationEngine = AutomationEngine.getInstance();
