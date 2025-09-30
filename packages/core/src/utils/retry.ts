import { FrameworkError } from '../errors';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  backoffStrategy: 'LINEAR' | 'EXPONENTIAL' | 'FIBONACCI';
  timeout: number;
  retryableErrors?: string[];
}

export class MaxRetriesExceededError extends FrameworkError {
  constructor(message: string, public lastError: Error) {
    super(message, 'MAX_RETRIES_EXCEEDED', 503, false);
    this.name = 'MaxRetriesExceededError';
  }
}

export class TimeoutError extends FrameworkError {
  constructor(message: string) {
    super(message, 'TIMEOUT', 408, true);
    this.name = 'TimeoutError';
  }
}

export class RetryStrategy {
  private fibCache: Map<number, number> = new Map();

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt < config.maxRetries) {
      try {
        return await this.executeWithTimeout(operation, config.timeout);
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Log retry attempt
        console.warn(`Retry attempt ${attempt}/${config.maxRetries}:`, {
          error: (error as Error).message,
          nextDelay: this.calculateBackoff(attempt, config),
        });

        // Determine if we should retry
        if (!this.isRetryable(error, config)) {
          throw error;
        }

        // Check if we've exhausted retries
        if (attempt >= config.maxRetries) {
          break;
        }

        // Calculate backoff delay
        const delay = this.calculateBackoff(attempt, config);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    throw new MaxRetriesExceededError(
      `Failed after ${config.maxRetries} attempts: ${lastError!.message}`,
      lastError!
    );
  }

  private calculateBackoff(
    attempt: number,
    config: RetryConfig
  ): number {
    const { backoffStrategy, baseDelay } = config;

    switch (backoffStrategy) {
      case 'LINEAR':
        return baseDelay * attempt;

      case 'EXPONENTIAL':
        return baseDelay * Math.pow(2, attempt - 1);

      case 'FIBONACCI':
        return baseDelay * this.fibonacci(attempt);

      default:
        return baseDelay;
    }
  }

  private fibonacci(n: number): number {
    if (n <= 1) return 1;

    if (this.fibCache.has(n)) {
      return this.fibCache.get(n)!;
    }

    const result = this.fibonacci(n - 1) + this.fibonacci(n - 2);
    this.fibCache.set(n, result);
    return result;
  }

  private isRetryable(error: any, config: RetryConfig): boolean {
    // Check if error explicitly marked as retryable
    if (error.retryable === true) {
      return true;
    }

    // Network errors - always retry
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNRESET'
    ) {
      return true;
    }

    // HTTP status codes that are retryable
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    if (error.response?.status && retryableStatusCodes.includes(error.response.status)) {
      return true;
    }

    // Authentication errors - retry once after refresh
    if (error.response?.status === 401) {
      return true;
    }

    // Custom retryable error types
    if (config.retryableErrors?.includes(error.type)) {
      return true;
    }

    // Everything else is not retryable
    return false;
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError(`Operation timed out after ${timeout}ms`)),
          timeout
        )
      ),
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}