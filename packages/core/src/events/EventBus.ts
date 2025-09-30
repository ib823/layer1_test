import { EventEmitter } from 'events';

export class EventBus extends EventEmitter {
  private static instance: EventBus;
  
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  publish(event: string, data: any): void {
    this.emit(event, data);
  }
  
  subscribe(event: string, handler: (data: any) => void): void {
    this.on(event, handler);
  }
  
  unsubscribe(event: string, handler: (data: any) => void): void {
    this.off(event, handler);
  }
}