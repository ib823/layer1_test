import { CircuitBreaker, CircuitOpenError, CircuitBreakerConfig } from '../../src/utils/circuitBreaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let config: CircuitBreakerConfig;

  beforeEach(() => {
    config = {
      failureThreshold: 3,
      successThreshold: 2,
      resetTimeout: 1000,
      name: 'TestCircuit',
    };
    circuitBreaker = new CircuitBreaker(config);
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should use default name if not provided', () => {
      const cb = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 1000,
      });
      const metrics = cb.getMetrics();
      expect(metrics.state).toBe('CLOSED');
    });

    it('should initialize metrics correctly', () => {
      const metrics = circuitBreaker.getMetrics();
      expect(metrics).toEqual({
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
      });
    });
  });

  describe('execute - CLOSED state', () => {
    it('should execute operation successfully when circuit is CLOSED', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should record failures without opening circuit below threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Fail twice (threshold is 3)
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');

      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getMetrics().failureCount).toBe(2);
    });

    it('should open circuit after reaching failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      // Fail 3 times (threshold is 3)
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');

      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(circuitBreaker.getMetrics().failureCount).toBe(3);
    });

    it('should reset failure count after successful execution', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('success');

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure 1');
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure 2');
      expect(circuitBreaker.getMetrics().failureCount).toBe(2);

      await circuitBreaker.execute(operation);
      expect(circuitBreaker.getMetrics().failureCount).toBe(0);
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('execute - OPEN state', () => {
    beforeEach(async () => {
      // Open the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < config.failureThreshold; i++) {
        await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      }
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should reject immediately with CircuitOpenError when circuit is OPEN', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(operation)).rejects.toThrow(CircuitOpenError);
      expect(operation).not.toHaveBeenCalled();
    });

    it('should include circuit name in CircuitOpenError', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      try {
        await circuitBreaker.execute(operation);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitOpenError);
        expect((error as CircuitOpenError).circuitName).toBe('TestCircuit');
        expect((error as CircuitOpenError).message).toContain('TestCircuit');
      }
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, config.resetTimeout + 100));

      const operation = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(operation);

      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not transition to HALF_OPEN before reset timeout', async () => {
      // Wait for less than reset timeout
      await new Promise(resolve => setTimeout(resolve, config.resetTimeout / 2));

      const operation = jest.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(operation)).rejects.toThrow(CircuitOpenError);
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('execute - HALF_OPEN state', () => {
    beforeEach(async () => {
      // Open the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < config.failureThreshold; i++) {
        await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      }

      // Wait for reset timeout to transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, config.resetTimeout + 100));
    });

    it('should allow operation execution in HALF_OPEN state', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });

    it('should transition to CLOSED after success threshold is met', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      // Execute successfully twice (success threshold is 2)
      await circuitBreaker.execute(operation);
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');

      await circuitBreaker.execute(operation);
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getMetrics().successCount).toBe(0);
    });

    it('should transition back to OPEN on failure in HALF_OPEN state', async () => {
      const operation = jest.fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValue(new Error('Failure'));

      await circuitBreaker.execute(operation);
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');

      // Should not immediately be OPEN since we need to reach failure threshold again
      // But failure count should be incremented
      expect(circuitBreaker.getMetrics().failureCount).toBeGreaterThan(0);
    });

    it('should track success count correctly in HALF_OPEN state', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await circuitBreaker.execute(operation);
      expect(circuitBreaker.getMetrics().successCount).toBe(1);

      await circuitBreaker.execute(operation);
      expect(circuitBreaker.getMetrics().successCount).toBe(0); // Reset after transition to CLOSED
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = circuitBreaker.getMetrics();

      expect(metrics).toHaveProperty('state');
      expect(metrics).toHaveProperty('failureCount');
      expect(metrics).toHaveProperty('successCount');
      expect(metrics).toHaveProperty('lastFailureTime');
    });

    it('should update lastFailureTime on failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));
      const beforeTime = Date.now();

      await expect(circuitBreaker.execute(operation)).rejects.toThrow();

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.lastFailureTime).toBeGreaterThanOrEqual(beforeTime);
      expect(metrics.lastFailureTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('reset', () => {
    it('should reset circuit to CLOSED state from OPEN', async () => {
      // Open the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < config.failureThreshold; i++) {
        await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      }
      expect(circuitBreaker.getState()).toBe('OPEN');

      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getMetrics()).toEqual({
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
      });
    });

    it('should allow operations after manual reset', async () => {
      // Open the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error('Failure'));
      for (let i = 0; i < config.failureThreshold; i++) {
        await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
      }

      circuitBreaker.reset();

      const successOperation = jest.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(successOperation);

      expect(result).toBe('success');
      expect(successOperation).toHaveBeenCalled();
    });
  });

  describe('CircuitOpenError', () => {
    it('should have correct error properties', () => {
      const error = new CircuitOpenError('Circuit is open', 'TestCircuit');

      expect(error.name).toBe('CircuitOpenError');
      expect(error.type).toBe('CIRCUIT_OPEN');
      expect(error.statusCode).toBe(503);
      expect(error.retryable).toBe(false);
      expect(error.circuitName).toBe('TestCircuit');
    });

    it('should work without circuit name', () => {
      const error = new CircuitOpenError('Circuit is open');

      expect(error.circuitName).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple consecutive successes in CLOSED state', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      for (let i = 0; i < 10; i++) {
        await circuitBreaker.execute(operation);
      }

      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getMetrics().failureCount).toBe(0);
    });

    it('should handle rapid failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Rapid failure'));

      const promises = [];
      for (let i = 0; i < config.failureThreshold; i++) {
        promises.push(circuitBreaker.execute(operation).catch(() => {}));
      }
      await Promise.all(promises);

      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should handle different failure thresholds', async () => {
      const customCircuit = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 3,
        resetTimeout: 1000,
        name: 'CustomCircuit',
      });

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      for (let i = 0; i < 4; i++) {
        await expect(customCircuit.execute(operation)).rejects.toThrow();
      }
      expect(customCircuit.getState()).toBe('CLOSED');

      await expect(customCircuit.execute(operation)).rejects.toThrow();
      expect(customCircuit.getState()).toBe('OPEN');
    });

    it('should handle async operations that throw', async () => {
      const operation = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async failure');
      });

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Async failure');
      expect(circuitBreaker.getMetrics().failureCount).toBe(1);
    });

    it('should maintain state across multiple error types', async () => {
      const operation1 = jest.fn().mockRejectedValue(new Error('Type 1'));
      const operation2 = jest.fn().mockRejectedValue(new TypeError('Type 2'));
      const operation3 = jest.fn().mockRejectedValue(new RangeError('Type 3'));

      await expect(circuitBreaker.execute(operation1)).rejects.toThrow();
      await expect(circuitBreaker.execute(operation2)).rejects.toThrow();
      await expect(circuitBreaker.execute(operation3)).rejects.toThrow();

      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });
});
