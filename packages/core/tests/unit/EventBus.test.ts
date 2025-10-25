import { EventBus, EventType } from '../../src/events/EventBus';

describe('EventBus', () => {
  afterEach(() => {
    EventBus.removeAllListeners();
  });

  it('should publish and subscribe to events', (done) => {
    const testData = { message: 'test' };
    const handler = jest.fn(() => {
      expect(handler).toHaveBeenCalledWith(testData);
      done();
    });

    EventBus.subscribe(EventType.TENANT_ONBOARDED, handler);
    EventBus.publish(EventType.TENANT_ONBOARDED, testData);
  });

  it('should unsubscribe from events', (done) => {
    const handler = jest.fn();

    EventBus.subscribe(EventType.MODULE_ACTIVATED, handler);
    EventBus.unsubscribe(EventType.MODULE_ACTIVATED, handler);
    EventBus.publish(EventType.MODULE_ACTIVATED, { message: 'test' });

    // Give it a moment to ensure the handler is not called
    setTimeout(() => {
      expect(handler).not.toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should support direct on/off methods (EventEmitter interface)', (done) => {
    const handler = jest.fn(() => {
      expect(handler).toHaveBeenCalled();
      done();
    });

    EventBus.on(EventType.DISCOVERY_COMPLETED, handler);
    EventBus.emit(EventType.DISCOVERY_COMPLETED, { success: true });
  });

  it('should handle multiple listeners', (done) => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    let callCount = 0;

    const callback1 = () => {
      handler1();
      callCount++;
    };

    const callback2 = () => {
      handler2();
      callCount++;
    };

    EventBus.on(EventType.WORKFLOW_COMPLETED, callback1);
    EventBus.on(EventType.WORKFLOW_COMPLETED, callback2);
    EventBus.emit(EventType.WORKFLOW_COMPLETED, { workflowId: '123' });

    setTimeout(() => {
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(callCount).toBe(2);
      done();
    }, 50);
  });
});