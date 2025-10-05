import { EventEmitter } from 'events';

/**
 * Event types for the framework event bus
 */
export enum EventType {
  // Tenant events
  TENANT_CREATED = 'tenant.created',
  TENANT_UPDATED = 'tenant.updated',
  TENANT_DELETED = 'tenant.deleted',
  TENANT_ONBOARDED = 'tenant.onboarded',

  // Discovery events
  DISCOVERY_STARTED = 'discovery.started',
  DISCOVERY_COMPLETED = 'discovery.completed',
  DISCOVERY_FAILED = 'discovery.failed',

  // Module events
  MODULE_ACTIVATED = 'module.activated',
  MODULE_DEACTIVATED = 'module.deactivated',

  // SoD events
  SOD_ANALYSIS_STARTED = 'sod.analysis.started',
  SOD_ANALYSIS_COMPLETED = 'sod.analysis.completed',
  SOD_VIOLATION_DETECTED = 'sod.violation.detected',

  // Workflow events
  WORKFLOW_CREATED = 'workflow.created',
  WORKFLOW_UPDATED = 'workflow.updated',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_ESCALATED = 'workflow.escalated',

  // Notification events
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_FAILED = 'notification.failed',

  // System events
  SYSTEM_ERROR = 'system.error',
  SYSTEM_WARNING = 'system.warning',
}

/**
 * EventBus - Singleton event emitter for framework-wide events
 *
 * Usage:
 * - Instance pattern: EventBus.getInstance().publish(EventType.TENANT_CREATED, data)
 * - Static pattern: EventBus.emit(EventType.TENANT_CREATED, data)
 */
export class EventBus extends EventEmitter {
  private static instance: EventBus;

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  // Instance methods
  publish(event: string | EventType, data: any): void {
    this.emit(event, data);
  }

  subscribe(event: string | EventType, handler: (data: any) => void): void {
    this.on(event, handler);
  }

  unsubscribe(event: string | EventType, handler: (data: any) => void): void {
    this.off(event, handler);
  }

  // Static convenience methods
  static publish(event: string | EventType, data: any): void {
    EventBus.getInstance().emit(event, data);
  }

  static subscribe(event: string | EventType, handler: (data: any) => void): void {
    EventBus.getInstance().on(event, handler);
  }

  static unsubscribe(event: string | EventType, handler: (data: any) => void): void {
    EventBus.getInstance().off(event, handler);
  }
}