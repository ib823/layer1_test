"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.CircuitOpenError = void 0;
const errors_1 = require("../errors");
class CircuitOpenError extends errors_1.FrameworkError {
    circuitName;
    constructor(message, circuitName) {
        super(message, 'CIRCUIT_OPEN', 503, false);
        this.circuitName = circuitName;
        this.name = 'CircuitOpenError';
    }
}
exports.CircuitOpenError = CircuitOpenError;
class CircuitBreaker {
    config;
    state = 'CLOSED';
    failureCount = 0;
    successCount = 0;
    lastFailureTime = 0;
    name;
    constructor(config) {
        this.config = config;
        this.name = config.name || 'UnnamedCircuit';
    }
    async execute(operation) {
        // Check circuit state
        if (this.state === 'OPEN') {
            if (this.shouldAttemptReset()) {
                console.log(`[${this.name}] Circuit transitioning to HALF_OPEN`);
                this.state = 'HALF_OPEN';
            }
            else {
                throw new CircuitOpenError(`Circuit breaker "${this.name}" is OPEN. System is unavailable.`, this.name);
            }
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            console.log(`[${this.name}] Success in HALF_OPEN: ${this.successCount}/${this.config.successThreshold}`);
            if (this.successCount >= this.config.successThreshold) {
                console.log(`[${this.name}] Circuit transitioning to CLOSED`);
                this.state = 'CLOSED';
                this.successCount = 0;
            }
        }
    }
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        console.warn(`[${this.name}] Failure recorded: ${this.failureCount}/${this.config.failureThreshold}`);
        if (this.failureCount >= this.config.failureThreshold) {
            console.error(`[${this.name}] Circuit transitioning to OPEN`);
            this.state = 'OPEN';
            this.notifyCircuitOpen();
        }
    }
    shouldAttemptReset() {
        const timeSinceLastFailure = Date.now() - this.lastFailureTime;
        return timeSinceLastFailure >= this.config.resetTimeout;
    }
    notifyCircuitOpen() {
        // This would integrate with your notification system
        console.error(`CRITICAL: Circuit breaker "${this.name}" is now OPEN`);
        // In production: Send alert via EventBus or notification service
    }
    getState() {
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
    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = 0;
        console.log(`[${this.name}] Circuit manually reset to CLOSED`);
    }
}
exports.CircuitBreaker = CircuitBreaker;
//# sourceMappingURL=circuitBreaker.js.map