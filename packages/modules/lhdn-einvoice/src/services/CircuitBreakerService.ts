/**
 * CircuitBreakerService
 *
 * Circuit breaker pattern for external service resilience
 * Prevents cascading failures when LHDN API, SAP OData, Ariba, or SFx are down
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service failing, requests fail fast
 * - HALF_OPEN: Testing recovery, limited requests allowed
 *
 * Phase: 5 (Idempotency & Resilience Foundation)
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type ServiceName = 'LHDN_API' | 'SAP_ODATA' | 'ARIBA_API' | 'SFSF_API';

export interface CircuitBreakerConfig {
  serviceName: ServiceName;
  failureThreshold?: number; // Open circuit after N failures (default: 5)
  successThreshold?: number; // Close circuit after N successes in half-open (default: 2)
  timeoutMs?: number; // Time to wait before half-open (default: 30000 = 30s)
}

export interface CircuitStatus {
  serviceName: ServiceName;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt?: Date;
  lastSuccessAt?: Date;
  openedAt?: Date;
  halfOpenedAt?: Date;
  closedAt?: Date;
  updatedAt: Date;
}

export class CircuitBreakerError extends Error {
  constructor(
    public serviceName: ServiceName,
    public state: CircuitState,
    message: string
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreakerService {
  private pool: Pool;
  private config: Map<ServiceName, Required<Omit<CircuitBreakerConfig, 'serviceName'>>>;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Default configurations
    this.config = new Map([
      [
        'LHDN_API',
        {
          failureThreshold: 5,
          successThreshold: 2,
          timeoutMs: 30000, // 30 seconds
        },
      ],
      [
        'SAP_ODATA',
        {
          failureThreshold: 5,
          successThreshold: 2,
          timeoutMs: 60000, // 1 minute (SAP can be slower)
        },
      ],
      [
        'ARIBA_API',
        {
          failureThreshold: 5,
          successThreshold: 2,
          timeoutMs: 30000,
        },
      ],
      [
        'SFSF_API',
        {
          failureThreshold: 5,
          successThreshold: 2,
          timeoutMs: 30000,
        },
      ],
    ]);
  }

  /**
   * Execute function with circuit breaker protection
   * Throws CircuitBreakerError if circuit is OPEN
   */
  async execute<T>(
    serviceName: ServiceName,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Check circuit state
    const status = await this.getStatus(serviceName);

    // If circuit is OPEN, fail fast
    if (status.state === 'OPEN') {
      // Check if timeout has passed to transition to HALF_OPEN
      const now = new Date();
      const config = this.config.get(serviceName)!;
      const openedAt = status.openedAt;

      if (openedAt && now.getTime() - openedAt.getTime() >= config.timeoutMs) {
        // Transition to HALF_OPEN
        await this.transitionToHalfOpen(serviceName);
        // Continue to execute below
      } else {
        logger.warn('Circuit breaker is OPEN, failing fast', {
          serviceName,
          failureCount: status.failureCount,
          openedAt,
          timeoutMs: config.timeoutMs,
        });

        // Use fallback if provided
        if (fallback) {
          logger.info('Using fallback for open circuit', { serviceName });
          return fallback();
        }

        throw new CircuitBreakerError(
          serviceName,
          'OPEN',
          `Circuit breaker is OPEN for ${serviceName}. Service is unavailable.`
        );
      }
    }

    // Execute the function
    try {
      const result = await fn();

      // Record success
      await this.recordSuccess(serviceName);

      return result;
    } catch (error: any) {
      // Record failure
      await this.recordFailure(serviceName, error);

      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Get current status of circuit breaker
   */
  async getStatus(serviceName: ServiceName): Promise<CircuitStatus> {
    try {
      const result = await this.pool.query(
        `
        SELECT *
        FROM lhdn_circuit_breaker_state
        WHERE service_name = $1
        `,
        [serviceName]
      );

      if (result.rows.length === 0) {
        // Initialize if not exists
        await this.initialize(serviceName);
        return this.getStatus(serviceName);
      }

      const row = result.rows[0];

      return {
        serviceName: row.service_name,
        state: row.state,
        failureCount: row.failure_count,
        successCount: row.success_count,
        lastFailureAt: row.last_failure_at ? new Date(row.last_failure_at) : undefined,
        lastSuccessAt: row.last_success_at ? new Date(row.last_success_at) : undefined,
        openedAt: row.opened_at ? new Date(row.opened_at) : undefined,
        halfOpenedAt: row.half_opened_at ? new Date(row.half_opened_at) : undefined,
        closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
        updatedAt: new Date(row.updated_at),
      };
    } catch (error: any) {
      logger.error('Failed to get circuit breaker status', {
        error: error.message,
        serviceName,
      });
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private async recordSuccess(serviceName: ServiceName): Promise<void> {
    try {
      const status = await this.getStatus(serviceName);
      const config = this.config.get(serviceName)!;

      if (status.state === 'HALF_OPEN') {
        // Increment success count in HALF_OPEN
        const newSuccessCount = status.successCount + 1;

        if (newSuccessCount >= config.successThreshold) {
          // Enough successes, transition to CLOSED
          await this.transitionToClosed(serviceName);
          logger.info('Circuit breaker transitioned to CLOSED', {
            serviceName,
            successCount: newSuccessCount,
          });
        } else {
          // Still in HALF_OPEN, increment success count
          await this.pool.query(
            `
            UPDATE lhdn_circuit_breaker_state
            SET
              success_count = success_count + 1,
              last_success_at = NOW()
            WHERE service_name = $1
            `,
            [serviceName]
          );
        }
      } else if (status.state === 'CLOSED') {
        // Just update last success time
        await this.pool.query(
          `
          UPDATE lhdn_circuit_breaker_state
          SET last_success_at = NOW()
          WHERE service_name = $1
          `,
          [serviceName]
        );
      }
    } catch (error: any) {
      logger.error('Failed to record success', {
        error: error.message,
        serviceName,
      });
      // Don't throw - this is non-critical
    }
  }

  /**
   * Record a failed call
   */
  private async recordFailure(serviceName: ServiceName, error: Error): Promise<void> {
    try {
      const status = await this.getStatus(serviceName);
      const config = this.config.get(serviceName)!;

      const newFailureCount = status.failureCount + 1;

      logger.warn('Circuit breaker recorded failure', {
        serviceName,
        failureCount: newFailureCount,
        failureThreshold: config.failureThreshold,
        error: error.message,
      });

      if (status.state === 'HALF_OPEN') {
        // Single failure in HALF_OPEN → back to OPEN
        await this.transitionToOpen(serviceName);
        logger.warn('Circuit breaker transitioned back to OPEN from HALF_OPEN', {
          serviceName,
        });
      } else if (status.state === 'CLOSED') {
        if (newFailureCount >= config.failureThreshold) {
          // Exceeded threshold, transition to OPEN
          await this.transitionToOpen(serviceName);
          logger.error('Circuit breaker transitioned to OPEN', {
            serviceName,
            failureCount: newFailureCount,
          });
        } else {
          // Still below threshold, increment failure count
          await this.pool.query(
            `
            UPDATE lhdn_circuit_breaker_state
            SET
              failure_count = failure_count + 1,
              last_failure_at = NOW()
            WHERE service_name = $1
            `,
            [serviceName]
          );
        }
      }
    } catch (error: any) {
      logger.error('Failed to record failure', {
        error: error.message,
        serviceName,
      });
      // Don't throw - this is non-critical
    }
  }

  /**
   * Transition to OPEN state
   */
  private async transitionToOpen(serviceName: ServiceName): Promise<void> {
    await this.pool.query(
      `
      UPDATE lhdn_circuit_breaker_state
      SET
        state = 'OPEN',
        opened_at = NOW(),
        success_count = 0
      WHERE service_name = $1
      `,
      [serviceName]
    );

    logger.error('Circuit OPEN', { serviceName });
  }

  /**
   * Transition to HALF_OPEN state
   */
  private async transitionToHalfOpen(serviceName: ServiceName): Promise<void> {
    await this.pool.query(
      `
      UPDATE lhdn_circuit_breaker_state
      SET
        state = 'HALF_OPEN',
        half_opened_at = NOW(),
        success_count = 0,
        failure_count = 0
      WHERE service_name = $1
      `,
      [serviceName]
    );

    logger.info('Circuit HALF_OPEN', { serviceName });
  }

  /**
   * Transition to CLOSED state
   */
  private async transitionToClosed(serviceName: ServiceName): Promise<void> {
    await this.pool.query(
      `
      UPDATE lhdn_circuit_breaker_state
      SET
        state = 'CLOSED',
        closed_at = NOW(),
        success_count = 0,
        failure_count = 0
      WHERE service_name = $1
      `,
      [serviceName]
    );

    logger.info('Circuit CLOSED', { serviceName });
  }

  /**
   * Initialize circuit breaker for a service
   */
  private async initialize(serviceName: ServiceName): Promise<void> {
    try {
      await this.pool.query(
        `
        INSERT INTO lhdn_circuit_breaker_state (service_name, state)
        VALUES ($1, 'CLOSED')
        ON CONFLICT (service_name) DO NOTHING
        `,
        [serviceName]
      );
    } catch (error: any) {
      logger.error('Failed to initialize circuit breaker', {
        error: error.message,
        serviceName,
      });
      throw error;
    }
  }

  /**
   * Manually reset circuit breaker (ops tool)
   */
  async reset(serviceName: ServiceName): Promise<void> {
    try {
      await this.pool.query(
        `
        UPDATE lhdn_circuit_breaker_state
        SET
          state = 'CLOSED',
          failure_count = 0,
          success_count = 0,
          closed_at = NOW()
        WHERE service_name = $1
        `,
        [serviceName]
      );

      logger.info('Circuit breaker manually reset', { serviceName });
    } catch (error: any) {
      logger.error('Failed to reset circuit breaker', {
        error: error.message,
        serviceName,
      });
      throw error;
    }
  }

  /**
   * Get all circuit breaker statuses
   */
  async getAllStatuses(): Promise<CircuitStatus[]> {
    try {
      const result = await this.pool.query(`
        SELECT *
        FROM lhdn_circuit_breaker_state
        ORDER BY service_name
      `);

      return result.rows.map((row) => ({
        serviceName: row.service_name,
        state: row.state,
        failureCount: row.failure_count,
        successCount: row.success_count,
        lastFailureAt: row.last_failure_at ? new Date(row.last_failure_at) : undefined,
        lastSuccessAt: row.last_success_at ? new Date(row.last_success_at) : undefined,
        openedAt: row.opened_at ? new Date(row.opened_at) : undefined,
        halfOpenedAt: row.half_opened_at ? new Date(row.half_opened_at) : undefined,
        closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
        updatedAt: new Date(row.updated_at),
      }));
    } catch (error: any) {
      logger.error('Failed to get all circuit breaker statuses', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update configuration for a service
   */
  updateConfig(serviceName: ServiceName, config: Partial<Omit<CircuitBreakerConfig, 'serviceName'>>): void {
    const current = this.config.get(serviceName)!;
    this.config.set(serviceName, { ...current, ...config });

    logger.info('Circuit breaker config updated', {
      serviceName,
      newConfig: this.config.get(serviceName),
    });
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
