/**
 * Event Bus - Centralized event management for decoupled communication
 */

export enum EventType {
  TENANT_ONBOARDED = 'tenant.onboarded',
  DISCOVERY_STARTED = 'discovery.started',
  DISCOVERY_COMPLETED = 'discovery.completed',
  DISCOVERY_FAILED = 'discovery.failed',
  MODULE_ACTIVATED = 'module.activated',
  MODULE_DEACTIVATED = 'module.deactivated',
  SOD_VIOLATION_DETECTED = 'sod.violation.detected',
  SOD_ANALYSIS_COMPLETED = 'sod.analysis.completed',
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_FAILED = 'workflow.failed',
}

export type EventListener = (data: any) => void | Promise<void>;

class EventBusClass {
  private listeners: Map<EventType, EventListener[]> = new Map();

  on(event: EventType, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: EventType, listener: EventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  async emit(event: EventType, data?: any): Promise<void> {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      await Promise.all(eventListeners.map(listener => listener(data)));
    }
  }

  removeAllListeners(event?: EventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const EventBus = new EventBusClass();