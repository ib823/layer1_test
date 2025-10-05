import { EventEmitter } from 'events';
/**
 * Event types for the framework event bus
 */
export declare enum EventType {
    TENANT_CREATED = "tenant.created",
    TENANT_UPDATED = "tenant.updated",
    TENANT_DELETED = "tenant.deleted",
    TENANT_ONBOARDED = "tenant.onboarded",
    DISCOVERY_STARTED = "discovery.started",
    DISCOVERY_COMPLETED = "discovery.completed",
    DISCOVERY_FAILED = "discovery.failed",
    MODULE_ACTIVATED = "module.activated",
    MODULE_DEACTIVATED = "module.deactivated",
    SOD_ANALYSIS_STARTED = "sod.analysis.started",
    SOD_ANALYSIS_COMPLETED = "sod.analysis.completed",
    SOD_VIOLATION_DETECTED = "sod.violation.detected",
    WORKFLOW_CREATED = "workflow.created",
    WORKFLOW_UPDATED = "workflow.updated",
    WORKFLOW_COMPLETED = "workflow.completed",
    WORKFLOW_ESCALATED = "workflow.escalated",
    NOTIFICATION_SENT = "notification.sent",
    NOTIFICATION_FAILED = "notification.failed",
    SYSTEM_ERROR = "system.error",
    SYSTEM_WARNING = "system.warning"
}
/**
 * EventBus - Singleton event emitter for framework-wide events
 *
 * Usage:
 * - Instance pattern: EventBus.getInstance().publish(EventType.TENANT_CREATED, data)
 * - Static pattern: EventBus.emit(EventType.TENANT_CREATED, data)
 */
export declare class EventBus extends EventEmitter {
    private static instance;
    static getInstance(): EventBus;
    publish(event: string | EventType, data: any): void;
    subscribe(event: string | EventType, handler: (data: any) => void): void;
    unsubscribe(event: string | EventType, handler: (data: any) => void): void;
    static publish(event: string | EventType, data: any): void;
    static subscribe(event: string | EventType, handler: (data: any) => void): void;
    static unsubscribe(event: string | EventType, handler: (data: any) => void): void;
}
//# sourceMappingURL=EventBus.d.ts.map