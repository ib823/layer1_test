import { EventEmitter } from 'events';

/**
 * Event listener type
 */
export type EventListener = (data?: unknown) => void | Promise<void>;

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
class EventBusClass extends EventEmitter {
  private static instance: EventBusClass;

  static getInstance(): EventBusClass {
    if (!EventBusClass.instance) {
      EventBusClass.instance = new EventBusClass();
    }
    return EventBusClass.instance;
  }

  // Instance methods
  publish(event: EventType, data?: unknown): void {
    this.emit(event, data);
  }

  subscribe(event: EventType, handler: (...args: unknown[]) => void): void {
    this.on(event, handler);
  }

  unsubscribe(event: EventType, handler: (...args: unknown[]) => void): void {
    this.off(event, handler);
  }

  // Static convenience methods
  static publish(event: EventType, data?: unknown): void {
    EventBusClass.getInstance().emit(event, data);
  }

  static subscribe(event: EventType, handler: (...args: unknown[]) => void): void {
    EventBusClass.getInstance().on(event, handler);
  }

  static unsubscribe(event: EventType, handler: (...args: unknown[]) => void): void {
    EventBusClass.getInstance().off(event, handler);
  }
}

export const EventBus = EventBusClass.getInstance();