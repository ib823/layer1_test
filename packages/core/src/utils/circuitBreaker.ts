import { FrameworkError } from '../errors';
import logger from './logger';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  resetTimeout: number;
  name?: string;
}

export class CircuitOpenError extends FrameworkError {
  constructor(message: string, public circuitName?: string) {
    super(message, 'CIRCUIT_OPEN', 503, false);
    this.name = 'CircuitOpenError';
  }
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly name: string;

  constructor(private config: CircuitBreakerConfig) {
    this.name = config.name || 'UnnamedCircuit';
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        logger.info(`Circuit transitioning to HALF_OPEN`, { circuit: this.name });
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitOpenError(
          `Circuit breaker "${this.name}" is OPEN. System is unavailable.`,
          this.name
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      logger.info(`Success in HALF_OPEN state`, {
        circuit: this.name,
        successCount: this.successCount,
        threshold: this.config.successThreshold,
      });

      if (this.successCount >= this.config.successThreshold) {
        logger.info(`Circuit transitioning to CLOSED`, { circuit: this.name });
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(`Failure recorded in circuit breaker`, {
      circuit: this.name,
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
    });

    if (this.failureCount >= this.config.failureThreshold) {
      logger.error(`Circuit transitioning to OPEN`, { circuit: this.name });
      this.state = 'OPEN';
      this.notifyCircuitOpen();
    }
  }

  private shouldAttemptReset(): boolean {
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  private notifyCircuitOpen(): void {
    // This would integrate with your notification system
    logger.error(`CRITICAL: Circuit breaker is now OPEN`, {
      circuit: this.name,
      failureCount: this.failureCount,
      lastFailureTime: new Date(this.lastFailureTime).toISOString(),
    });
    // In production: Send alert via EventBus or notification service
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    logger.info(`Circuit manually reset to CLOSED`, { circuit: this.name });
  }
}