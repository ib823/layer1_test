export class FrameworkError extends Error {
  constructor(
    message: string,
    public type: string,
    public statusCode: number,
    public retryable: boolean = false,
    public sapError?: any
  ) {
    super(message);
    this.name = 'FrameworkError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends FrameworkError {
  constructor(message: string, cause?: any) {
    super(message, 'AUTHENTICATION', 401, true, cause);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends FrameworkError {
  constructor(message: string, cause?: any) {
    super(message, 'AUTHORIZATION', 403, false, cause);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends FrameworkError {
  constructor(message: string, cause?: any) {
    super(message, 'NOT_FOUND', 404, false, cause);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends FrameworkError {
  constructor(message: string, cause?: any) {
    super(message, 'VALIDATION', 400, false, cause);
    this.name = 'ValidationError';
  }
}