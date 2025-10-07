import { Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../../src/middleware/auth';
import { AuthenticatedRequest } from '../../src/types';
import { config } from '../../src/config';

// Mock dependencies
jest.mock('../../src/config');
jest.mock('../../src/utils/logger');
jest.mock('@sap/xssec');
jest.mock('@sap/xsenv');

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: { requestId: 'test-request-id' },
    };
    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('authenticate()', () => {
    describe('when auth is disabled', () => {
      beforeEach(() => {
        (config as any).auth = { enabled: false };
      });

      it('should set dev user and call next()', () => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockReq.user).toEqual({
          id: 'dev-user',
          email: 'dev@example.com',
          roles: ['admin'],
          tenantId: 'dev-tenant',
        });
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });
    });

    describe('when auth is enabled', () => {
      beforeEach(() => {
        (config as any).auth = { enabled: true };
        (config as any).nodeEnv = 'development';
      });

      it('should return 401 if no Authorization header', () => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'UNAUTHORIZED',
            }),
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 if Authorization header is malformed', () => {
        mockReq.headers!.authorization = 'InvalidFormat';

        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 if token is missing', () => {
        mockReq.headers!.authorization = 'Bearer ';

        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should authenticate with valid JWT in dev mode', () => {
        // Create a valid JWT payload (base64 encoded)
        const payload = {
          sub: 'test-user-123',
          email: 'test@example.com',
          scope: ['read', 'write'],
          zid: 'test-tenant',
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        };
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const fakeToken = `header.${encodedPayload}.signature`;

        mockReq.headers!.authorization = `Bearer ${fakeToken}`;

        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockReq.user).toEqual({
          id: 'test-user-123',
          email: 'test@example.com',
          roles: ['read', 'write'],
          tenantId: 'test-tenant',
        });
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should return 401 if token is expired', () => {
        // Create an expired JWT payload
        const payload = {
          sub: 'test-user',
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        };
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const fakeToken = `header.${encodedPayload}.signature`;

        mockReq.headers!.authorization = `Bearer ${fakeToken}`;

        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'UNAUTHORIZED',
              message: 'Token expired',
            }),
          })
        );
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 if token is malformed JSON', () => {
        mockReq.headers!.authorization = 'Bearer invalid.token.here';

        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('requireRole()', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'test-user',
        email: 'test@example.com',
        roles: ['user'],
        tenantId: 'test-tenant',
      };
    });

    it('should call next() if user has required role', () => {
      const middleware = requireRole('user');
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next() if user is admin (regardless of required role)', () => {
      mockReq.user!.roles = ['admin'];
      const middleware = requireRole('some-other-role');
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 if user does not have required role', () => {
      const middleware = requireRole('admin');
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Requires role: admin',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      mockReq.user = undefined;
      const middleware = requireRole('user');
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
