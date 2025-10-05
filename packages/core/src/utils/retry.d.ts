import { FrameworkError } from '../errors';
export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    backoffStrategy: 'LINEAR' | 'EXPONENTIAL' | 'FIBONACCI';
    timeout: number;
    retryableErrors?: string[];
}
export declare class MaxRetriesExceededError extends FrameworkError {
    lastError: Error;
    constructor(message: string, lastError: Error);
}
export declare class TimeoutError extends FrameworkError {
    constructor(message: string);
}
export declare class RetryStrategy {
    private fibCache;
    executeWithRetry<T>(operation: () => Promise<T>, config: RetryConfig): Promise<T>;
    private calculateBackoff;
    private fibonacci;
    private isRetryable;
    private executeWithTimeout;
    private sleep;
}
//# sourceMappingURL=retry.d.ts.map