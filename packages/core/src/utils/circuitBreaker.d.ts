import { FrameworkError } from '../errors';
export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    resetTimeout: number;
    name?: string;
}
export declare class CircuitOpenError extends FrameworkError {
    circuitName?: string | undefined;
    constructor(message: string, circuitName?: string | undefined);
}
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export declare class CircuitBreaker {
    private config;
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime;
    private readonly name;
    constructor(config: CircuitBreakerConfig);
    execute<T>(operation: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    private shouldAttemptReset;
    private notifyCircuitOpen;
    getState(): CircuitState;
    getMetrics(): {
        state: CircuitState;
        failureCount: number;
        successCount: number;
        lastFailureTime: number;
    };
    reset(): void;
}
export {};
//# sourceMappingURL=circuitBreaker.d.ts.map