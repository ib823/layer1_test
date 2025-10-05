"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.FrameworkError = void 0;
class FrameworkError extends Error {
    type;
    statusCode;
    retryable;
    sapError;
    constructor(message, type, statusCode, retryable = false, sapError) {
        super(message);
        this.type = type;
        this.statusCode = statusCode;
        this.retryable = retryable;
        this.sapError = sapError;
        this.name = 'FrameworkError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.FrameworkError = FrameworkError;
class AuthenticationError extends FrameworkError {
    constructor(message, cause) {
        super(message, 'AUTHENTICATION', 401, true, cause);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends FrameworkError {
    constructor(message, cause) {
        super(message, 'AUTHORIZATION', 403, false, cause);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends FrameworkError {
    constructor(message, cause) {
        super(message, 'NOT_FOUND', 404, false, cause);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends FrameworkError {
    constructor(message, cause) {
        super(message, 'VALIDATION', 400, false, cause);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=FrameworkError.js.map