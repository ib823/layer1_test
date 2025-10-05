"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryStrategy = exports.TimeoutError = exports.MaxRetriesExceededError = void 0;
const errors_1 = require("../errors");
class MaxRetriesExceededError extends errors_1.FrameworkError {
    lastError;
    constructor(message, lastError) {
        super(message, 'MAX_RETRIES_EXCEEDED', 503, false);
        this.lastError = lastError;
        this.name = 'MaxRetriesExceededError';
    }
}
exports.MaxRetriesExceededError = MaxRetriesExceededError;
class TimeoutError extends errors_1.FrameworkError {
    constructor(message) {
        super(message, 'TIMEOUT', 408, true);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
class RetryStrategy {
    fibCache = new Map();
    async executeWithRetry(operation, config) {
        let lastError;
        let attempt = 0;
        while (attempt < config.maxRetries) {
            try {
                return await this.executeWithTimeout(operation, config.timeout);
            }
            catch (error) {
                lastError = error;
                attempt++;
                // Log retry attempt
                console.warn(`Retry attempt ${attempt}/${config.maxRetries}:`, {
                    error: error.message,
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
        throw new MaxRetriesExceededError(`Failed after ${config.maxRetries} attempts: ${lastError.message}`, lastError);
    }
    calculateBackoff(attempt, config) {
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
    fibonacci(n) {
        if (n <= 1)
            return 1;
        if (this.fibCache.has(n)) {
            return this.fibCache.get(n);
        }
        const result = this.fibonacci(n - 1) + this.fibonacci(n - 2);
        this.fibCache.set(n, result);
        return result;
    }
    isRetryable(error, config) {
        // Check if error explicitly marked as retryable
        if (error.retryable === true) {
            return true;
        }
        // Network errors - always retry
        if (error.code === 'ECONNREFUSED' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ENOTFOUND' ||
            error.code === 'ECONNRESET') {
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
    async executeWithTimeout(operation, timeout) {
        return Promise.race([
            operation(),
            new Promise((_, reject) => setTimeout(() => reject(new TimeoutError(`Operation timed out after ${timeout}ms`)), timeout)),
        ]);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.RetryStrategy = RetryStrategy;
//# sourceMappingURL=retry.js.map