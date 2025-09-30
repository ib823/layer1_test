import { EventBus } from '../../src/events/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;
  
  beforeEach(() => {
    eventBus = EventBus.getInstance();
    eventBus.removeAllListeners();
  });
  
  it('should publish and subscribe to events', (done) => {
    const testData = { message: 'test' };
    
    eventBus.subscribe('test-event', (data) => {
      expect(data).toEqual(testData);
      done();
    });
    
    eventBus.publish('test-event', testData);
  });
  
  it('should unsubscribe from events', () => {
    const handler = jest.fn();
    
    eventBus.subscribe('test-event-2', handler);
    eventBus.unsubscribe('test-event-2', handler);
    eventBus.publish('test-event-2', { message: 'test' });
    
    expect(handler).not.toHaveBeenCalled();
  });
});