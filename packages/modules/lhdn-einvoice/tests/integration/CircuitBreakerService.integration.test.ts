/**
 * Circuit Breaker Service Integration Tests
 *
 * Tests circuit breaker resilience patterns with real database
 */

import { CircuitBreakerService } from '../../src/services/CircuitBreakerService';
import { TestEnvironment } from './setup';

describe('CircuitBreakerService Integration Tests', () => {
  let service: CircuitBreakerService;
  let connectionString: string;

  beforeAll(async () => {
    connectionString = TestEnvironment.getConnectionString();
  }, 300000);

  beforeEach(async () => {
    await TestEnvironment.cleanup();
    await TestEnvironment.insertFixtures();

    service = new CircuitBreakerService(connectionString);
  });

  afterEach(async () => {
    await service.close();
  });

  describe('Circuit State Transitions', () => {
    it('should start in CLOSED state', async () => {
      const status = await service.getStatus('LHDN_API');

      expect(status.state).toBe('CLOSED');
      expect(status.failureCount).toBe(0);
      expect(status.successCount).toBe(0);
    });

    it('should transition to OPEN after threshold failures', async () => {
      const failingFunction = async () => {
        throw new Error('Service unavailable');
      };

      // Execute failing function 5 times (default threshold)
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('LHDN_API', failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      const status = await service.getStatus('LHDN_API');
      expect(status.state).toBe('OPEN');
      expect(status.failureCount).toBe(5);
    });

    it('should fail fast when circuit is OPEN', async () => {
      // Open the circuit
      const failingFunction = async () => {
        throw new Error('Service unavailable');
      };

      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('LHDN_API', failingFunction);
        } catch (error) {
          // Expected
        }
      }

      // Now circuit should be OPEN, next call should fail immediately
      const startTime = Date.now();

      try {
        await service.execute('LHDN_API', failingFunction);
        fail('Should have thrown CircuitBreakerError');
      } catch (error: any) {
        const duration = Date.now() - startTime;
        expect(error.name).toBe('CircuitBreakerError');
        expect(duration).toBeLessThan(100); // Should fail fast (< 100ms)
      }
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Configure short timeout for testing
      service.updateConfig('LHDN_API', { timeoutMs: 100 });

      // Open the circuit
      const failingFunction = async () => {
        throw new Error('Service unavailable');
      };

      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('LHDN_API', failingFunction);
        } catch (error) {
          // Expected
        }
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next execution should transition to HALF_OPEN
      const successFunction = async () => 'success';

      const result = await service.execute('LHDN_API', successFunction);
      expect(result).toBe('success');

      const status = await service.getStatus('LHDN_API');
      expect(status.state).toBe('HALF_OPEN');
    });

    it('should transition back to OPEN if failure in HALF_OPEN', async () => {
      // Configure short timeout
      service.updateConfig('LHDN_API', { timeoutMs: 100 });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('LHDN_API', async () => {
            throw new Error('Fail');
          });
        } catch (error) {
          // Expected
        }
      }

      // Wait for HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Fail in HALF_OPEN
      try {
        await service.execute('LHDN_API', async () => {
          throw new Error('Still failing');
        });
      } catch (error) {
        // Expected
      }

      const status = await service.getStatus('LHDN_API');
      expect(status.state).toBe('OPEN');
    });

    it('should transition to CLOSED after success threshold in HALF_OPEN', async () => {
      // Configure short timeout and low success threshold
      service.updateConfig('LHDN_API', { timeoutMs: 100, successThreshold: 2 });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('LHDN_API', async () => {
            throw new Error('Fail');
          });
        } catch (error) {
          // Expected
        }
      }

      // Wait for HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Succeed twice
      await service.execute('LHDN_API', async () => 'success');
      await service.execute('LHDN_API', async () => 'success');

      const status = await service.getStatus('LHDN_API');
      expect(status.state).toBe('CLOSED');
      expect(status.failureCount).toBe(0);
      expect(status.successCount).toBe(0);
    });
  });

  describe('Multiple Services', () => {
    it('should track circuit states independently for each service', async () => {
      // Fail LHDN_API
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('LHDN_API', async () => {
            throw new Error('LHDN fail');
          });
        } catch (error) {
          // Expected
        }
      }

      // SAP_ODATA should still be CLOSED
      const lhdnStatus = await service.getStatus('LHDN_API');
      const sapStatus = await service.getStatus('SAP_ODATA');

      expect(lhdnStatus.state).toBe('OPEN');
      expect(sapStatus.state).toBe('CLOSED');
    });

    it('should get all circuit breaker statuses', async () => {
      const statuses = await service.getAllStatuses();

      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses.some((s) => s.serviceName === 'LHDN_API')).toBe(true);
      expect(statuses.some((s) => s.serviceName === 'SAP_ODATA')).toBe(true);
    });
  });

  describe('Fallback Functionality', () => {
    it('should execute fallback when circuit is OPEN', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('LHDN_API', async () => {
            throw new Error('Fail');
          });
        } catch (error) {
          // Expected
        }
      }

      // Execute with fallback
      const result = await service.execute(
        'LHDN_API',
        async () => {
          throw new Error('Should not reach here');
        },
        async () => 'fallback-result'
      );

      expect(result).toBe('fallback-result');
    });
  });

  describe('Manual Reset', () => {
    it('should manually reset circuit to CLOSED', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('LHDN_API', async () => {
            throw new Error('Fail');
          });
        } catch (error) {
          // Expected
        }
      }

      let status = await service.getStatus('LHDN_API');
      expect(status.state).toBe('OPEN');

      // Manual reset
      await service.reset('LHDN_API');

      status = await service.getStatus('LHDN_API');
      expect(status.state).toBe('CLOSED');
      expect(status.failureCount).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should use custom failure threshold', async () => {
      // Set custom threshold
      service.updateConfig('LHDN_API', { failureThreshold: 3 });

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await service.execute('LHDN_API', async () => {
            throw new Error('Fail');
          });
        } catch (error) {
          // Expected
        }
      }

      const status = await service.getStatus('LHDN_API');
      expect(status.state).toBe('OPEN');
    });
  });

  describe('Success Tracking', () => {
    it('should track successful executions in CLOSED state', async () => {
      await service.execute('LHDN_API', async () => 'success');

      const status = await service.getStatus('LHDN_API');
      expect(status.lastSuccessAt).toBeDefined();
    });

    it('should reset failure count on success in CLOSED state', async () => {
      // Partial failures
      for (let i = 0; i < 3; i++) {
        try {
          await service.execute('LHDN_API', async () => {
            throw new Error('Fail');
          });
        } catch (error) {
          // Expected
        }
      }

      // Success
      await service.execute('LHDN_API', async () => 'success');

      const status = await service.getStatus('LHDN_API');
      expect(status.state).toBe('CLOSED'); // Still closed (threshold not reached)
      expect(status.failureCount).toBe(3); // Failures still tracked
    });
  });

  describe('Database Persistence', () => {
    it('should persist circuit state across service restarts', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('LHDN_API', async () => {
            throw new Error('Fail');
          });
        } catch (error) {
          // Expected
        }
      }

      const statusBefore = await service.getStatus('LHDN_API');
      expect(statusBefore.state).toBe('OPEN');

      // Close and create new service instance
      await service.close();
      const newService = new CircuitBreakerService(connectionString);

      const statusAfter = await newService.getStatus('LHDN_API');
      expect(statusAfter.state).toBe('OPEN');
      expect(statusAfter.failureCount).toBe(5);

      await newService.close();
    });
  });
});
