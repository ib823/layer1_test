"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = exports.EventType = void 0;
const events_1 = require("events");
/**
 * Event types for the framework event bus
 */
var EventType;
(function (EventType) {
    // Tenant events
    EventType["TENANT_CREATED"] = "tenant.created";
    EventType["TENANT_UPDATED"] = "tenant.updated";
    EventType["TENANT_DELETED"] = "tenant.deleted";
    EventType["TENANT_ONBOARDED"] = "tenant.onboarded";
    // Discovery events
    EventType["DISCOVERY_STARTED"] = "discovery.started";
    EventType["DISCOVERY_COMPLETED"] = "discovery.completed";
    EventType["DISCOVERY_FAILED"] = "discovery.failed";
    // Module events
    EventType["MODULE_ACTIVATED"] = "module.activated";
    EventType["MODULE_DEACTIVATED"] = "module.deactivated";
    // SoD events
    EventType["SOD_ANALYSIS_STARTED"] = "sod.analysis.started";
    EventType["SOD_ANALYSIS_COMPLETED"] = "sod.analysis.completed";
    EventType["SOD_VIOLATION_DETECTED"] = "sod.violation.detected";
    // Workflow events
    EventType["WORKFLOW_CREATED"] = "workflow.created";
    EventType["WORKFLOW_UPDATED"] = "workflow.updated";
    EventType["WORKFLOW_COMPLETED"] = "workflow.completed";
    EventType["WORKFLOW_ESCALATED"] = "workflow.escalated";
    // Notification events
    EventType["NOTIFICATION_SENT"] = "notification.sent";
    EventType["NOTIFICATION_FAILED"] = "notification.failed";
    // System events
    EventType["SYSTEM_ERROR"] = "system.error";
    EventType["SYSTEM_WARNING"] = "system.warning";
})(EventType || (exports.EventType = EventType = {}));
/**
 * EventBus - Singleton event emitter for framework-wide events
 *
 * Usage:
 * - Instance pattern: EventBus.getInstance().publish(EventType.TENANT_CREATED, data)
 * - Static pattern: EventBus.emit(EventType.TENANT_CREATED, data)
 */
class EventBus extends events_1.EventEmitter {
    static instance;
    static getInstance() {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
    // Instance methods
    publish(event, data) {
        this.emit(event, data);
    }
    subscribe(event, handler) {
        this.on(event, handler);
    }
    unsubscribe(event, handler) {
        this.off(event, handler);
    }
    // Static convenience methods
    static publish(event, data) {
        EventBus.getInstance().emit(event, data);
    }
    static subscribe(event, handler) {
        EventBus.getInstance().on(event, handler);
    }
    static unsubscribe(event, handler) {
        EventBus.getInstance().off(event, handler);
    }
}
exports.EventBus = EventBus;
//# sourceMappingURL=EventBus.js.map