export class FrameworkError extends Error {
  constructor(
    message: string,
    public type: string,
    public statusCode: number,
    public retryable: boolean = false,
    public sapError?: unknown
  ) {
    super(message);
    this.name = 'FrameworkError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends FrameworkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'AUTHENTICATION', 401, true, cause);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends FrameworkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'AUTHORIZATION', 403, false, cause);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends FrameworkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'NOT_FOUND', 404, false, cause);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends FrameworkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'VALIDATION', 400, false, cause);
    this.name = 'ValidationError';
  }
}

export class ConnectorError extends FrameworkError {
  constructor(
    message: string,
    code: string,
    statusCode: number,
    retryable: boolean,
    cause?: unknown
  ) {
    super(message, code, statusCode, retryable, cause);
    this.name = 'ConnectorError';
  }
}