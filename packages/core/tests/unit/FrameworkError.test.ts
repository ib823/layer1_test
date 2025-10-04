import {
  FrameworkError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '../../src/errors/FrameworkError';

describe('FrameworkError', () => {
  describe('FrameworkError base class', () => {
    it('should create error with all properties', () => {
      const sapError = { code: 'SAP_ERROR', details: 'SAP system error' };
      const error = new FrameworkError(
        'Test error',
        'TEST_TYPE',
        500,
        true,
        sapError
      );

      expect(error.message).toBe('Test error');
      expect(error.type).toBe('TEST_TYPE');
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
      expect(error.sapError).toEqual(sapError);
      expect(error.name).toBe('FrameworkError');
    });

    it('should create error with default retryable false', () => {
      const error = new FrameworkError('Test error', 'TEST_TYPE', 500);

      expect(error.retryable).toBe(false);
      expect(error.sapError).toBeUndefined();
    });

    it('should have proper error stack trace', () => {
      const error = new FrameworkError('Test error', 'TEST_TYPE', 500);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('FrameworkError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with correct properties', () => {
      const error = new AuthenticationError('Invalid credentials');

      expect(error.message).toBe('Invalid credentials');
      expect(error.name).toBe('AuthenticationError');
      expect(error.type).toBe('AUTHENTICATION');
      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(true);
    });

    it('should include cause when provided', () => {
      const cause = { reason: 'Token expired' };
      const error = new AuthenticationError('Auth failed', cause);

      expect(error.sapError).toEqual(cause);
    });

    it('should work without cause', () => {
      const error = new AuthenticationError('Auth failed');

      expect(error.sapError).toBeUndefined();
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error with correct properties', () => {
      const error = new AuthorizationError('Access denied');

      expect(error.message).toBe('Access denied');
      expect(error.name).toBe('AuthorizationError');
      expect(error.type).toBe('AUTHORIZATION');
      expect(error.statusCode).toBe(403);
      expect(error.retryable).toBe(false);
    });

    it('should include cause when provided', () => {
      const cause = { permission: 'admin_required' };
      const error = new AuthorizationError('Forbidden', cause);

      expect(error.sapError).toEqual(cause);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with correct properties', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.message).toBe('Resource not found');
      expect(error.name).toBe('NotFoundError');
      expect(error.type).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.retryable).toBe(false);
    });

    it('should include cause when provided', () => {
      const cause = { resourceId: '123' };
      const error = new NotFoundError('Not found', cause);

      expect(error.sapError).toEqual(cause);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with correct properties', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ValidationError');
      expect(error.type).toBe('VALIDATION');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
    });

    it('should include cause when provided', () => {
      const cause = { field: 'email', issue: 'invalid format' };
      const error = new ValidationError('Validation failed', cause);

      expect(error.sapError).toEqual(cause);
    });
  });

  describe('Error inheritance', () => {
    it('should be instance of Error', () => {
      const error = new FrameworkError('Test', 'TEST', 500);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof FrameworkError).toBe(true);
    });

    it('should be catchable as Error', () => {
      try {
        throw new AuthenticationError('Auth failed');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof FrameworkError).toBe(true);
        expect(error instanceof AuthenticationError).toBe(true);
      }
    });

    it('should distinguish between error types', () => {
      const authError = new AuthenticationError('Auth failed');
      const validationError = new ValidationError('Invalid');

      expect(authError instanceof AuthenticationError).toBe(true);
      expect(authError instanceof ValidationError).toBe(false);
      expect(validationError instanceof ValidationError).toBe(true);
      expect(validationError instanceof AuthenticationError).toBe(false);
    });
  });
});
