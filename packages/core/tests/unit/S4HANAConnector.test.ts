import { S4HANAConnector, S4HANAConnectorConfig } from '../../src/connectors/s4hana/S4HANAConnector';
import { ValidationError, AuthenticationError, NotFoundError, FrameworkError } from '../../src/errors/FrameworkError';
import { ODataQueryBuilder } from '../../src/utils/odata';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('S4HANAConnector', () => {
  let connector: S4HANAConnector;
  let config: S4HANAConnectorConfig;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Setup axios mock
    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    config = {
      erpSystem: 'SAP',
      baseUrl: 'https://s4hana.example.com',
      timeout: 5000,
      auth: {
        provider: 'SAP',
        type: 'OAUTH2',
        credentials: {
          clientId: 'test-client',
          clientSecret: 'test-secret',
        },
      },
    };

    connector = new S4HANAConnector(config);

    // Mock the request method to avoid actual HTTP calls
    jest.spyOn(connector as any, 'request').mockResolvedValue({
      d: { results: [] },
    });

    // Mock getAuthToken to avoid token acquisition
    jest.spyOn(connector as any, 'getAuthToken').mockResolvedValue('mock-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create connector with valid config', () => {
      expect(connector).toBeInstanceOf(S4HANAConnector);
    });

    it('should initialize circuit breaker with default config', () => {
      const state = connector.getCircuitBreakerState();
      expect(state.state).toBe('CLOSED');
      expect(state.failureCount).toBe(0);
    });

    it('should initialize with custom circuit breaker config', () => {
      const customConfig: S4HANAConnectorConfig = {
        ...config,
        circuitBreaker: {
          enabled: true,
          failureThreshold: 10,
          successThreshold: 3,
          resetTimeout: 120000,
        },
      };

      const customConnector = new S4HANAConnector(customConfig);
      expect(customConnector).toBeInstanceOf(S4HANAConnector);
    });
  });

  describe('getUsers', () => {
    it('should fetch all users without filters', async () => {
      const mockUsers = [
        { UserID: 'USER1', UserName: 'Test User 1', IsLocked: false },
        { UserID: 'USER2', UserName: 'Test User 2', IsLocked: false },
      ];

      jest.spyOn(connector as any, 'request').mockResolvedValue({
        d: { results: mockUsers },
      });

      const result = await connector.getUsers({});

      expect(result).toEqual(mockUsers);
    });

    it('should filter active users only', async () => {
      const mockUsers = [
        { UserID: 'USER1', UserName: 'Test User 1', IsLocked: false },
      ];

      jest.spyOn(connector as any, 'request').mockResolvedValue({
        d: { results: mockUsers },
      });

      const result = await connector.getUsers({ activeOnly: true });

      expect(result).toEqual(mockUsers);
    });

    it('should filter by user IDs', async () => {
      const mockUsers = [
        { UserID: 'USER1', UserName: 'Test User 1', IsLocked: false },
      ];

      jest.spyOn(connector as any, 'request').mockResolvedValue({
        d: { results: mockUsers },
      });

      const result = await connector.getUsers({ userIds: ['USER1', 'USER2'] });

      expect(result).toEqual(mockUsers);
    });

    it('should combine activeOnly and userIds filters', async () => {
      const result = await connector.getUsers({
        activeOnly: true,
        userIds: ['USER1'],
      });

      expect(result).toBeDefined();
    });
  });

  describe('getAllRoles', () => {
    it('should fetch all roles', async () => {
      const mockSAPRoles = [
        { RoleID: 'ROLE1', RoleName: 'Test Role 1', RoleDescription: 'Test role 1' },
        { RoleID: 'ROLE2', RoleName: 'Test Role 2', RoleDescription: 'Test role 2' },
      ];

      jest.spyOn(connector as any, 'executeQuery').mockResolvedValue(mockSAPRoles);

      const result = await connector.getAllRoles();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('getUserRoles', () => {
    it('should fetch user roles by userId', async () => {
      const mockUserRoles = [
        { UserID: 'USER1', RoleID: 'ROLE1', ValidFrom: '2024-01-01', ValidTo: '2025-12-31' },
        { UserID: 'USER1', RoleID: 'ROLE2', ValidFrom: '2024-01-01', ValidTo: '2025-12-31' },
      ];

      const mockSAPRoles = [
        { RoleID: 'ROLE1', RoleName: 'Test Role 1', RoleDescription: 'Test role 1' },
        { RoleID: 'ROLE2', RoleName: 'Test Role 2', RoleDescription: 'Test role 2' },
      ];

      // Mock executeQuery to return different values based on URL
      jest.spyOn(connector as any, 'executeQuery').mockImplementation((url: any) => {
        if (url && typeof url === 'string' && url.includes('UserRoles')) {
          return Promise.resolve(mockUserRoles);
        } else if (url && typeof url === 'string' && url.includes('Roles')) {
          return Promise.resolve(mockSAPRoles);
        }
        return Promise.resolve([]);
      });

      const result = await connector.getUserRoles('USER1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should return empty array when user has no roles', async () => {
      jest.spyOn(connector as any, 'executeQuery').mockResolvedValue([]);

      const result = await connector.getUserRoles('USER2');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('executeQuery', () => {
    it('should execute OData query with query builder', async () => {
      const queryBuilder = new ODataQueryBuilder().select('UserID', 'UserName').top(10);

      const mockData = [
        { UserID: 'USER1', UserName: 'Test User' },
      ];

      jest.spyOn(connector as any, 'request').mockResolvedValue({
        d: { results: mockData },
      });

      const result = await connector.executeQuery('/test/endpoint', queryBuilder);

      expect(result).toEqual(mockData);
    });

    it('should handle empty query builder', async () => {
      const queryBuilder = new ODataQueryBuilder();

      jest.spyOn(connector as any, 'request').mockResolvedValue({
        d: { results: [] },
      });

      const result = await connector.executeQuery('/test/endpoint', queryBuilder);

      expect(result).toEqual([]);
    });
  });

  describe('executeBatch', () => {
    it('should throw ValidationError when batch not enabled', async () => {
      await expect(connector.executeBatch([])).rejects.toThrow(ValidationError);
      await expect(connector.executeBatch([])).rejects.toThrow('Batch operations not enabled');
    });

    it('should throw error for unimplemented batch when enabled', async () => {
      const batchConfig: S4HANAConnectorConfig = {
        ...config,
        odata: { useBatch: true, batchSize: 100 },
      };

      const batchConnector = new S4HANAConnector(batchConfig);

      await expect(batchConnector.executeBatch([])).rejects.toThrow('Batch operations not yet implemented');
    });
  });

  describe('mapSAPError', () => {
    it('should map 400 errors to ValidationError', () => {
      const error = {
        response: {
          status: 400,
          data: {
            error: {
              message: { value: 'Invalid request' },
            },
          },
        },
      };

      const mappedError = (connector as any).mapSAPError(error);

      expect(mappedError).toBeInstanceOf(ValidationError);
      expect(mappedError.message).toBe('Invalid request');
    });

    it('should map 401 errors to AuthenticationError', () => {
      const error = {
        response: {
          status: 401,
          data: {
            error: {
              message: { value: 'Authentication failed' },
            },
          },
        },
      };

      const mappedError = (connector as any).mapSAPError(error);

      expect(mappedError).toBeInstanceOf(AuthenticationError);
      expect(mappedError.statusCode).toBe(401);
    });

    it('should map 403 errors to ValidationError', () => {
      const error = {
        response: {
          status: 403,
          data: {
            error: {
              message: { value: 'Insufficient permissions' },
            },
          },
        },
      };

      const mappedError = (connector as any).mapSAPError(error);

      expect(mappedError).toBeInstanceOf(ValidationError);
    });

    it('should map 404 errors to NotFoundError', () => {
      const error = {
        response: {
          status: 404,
          data: {
            error: {
              message: { value: 'Resource not found' },
            },
          },
        },
      };

      const mappedError = (connector as any).mapSAPError(error);

      expect(mappedError).toBeInstanceOf(NotFoundError);
      expect(mappedError.statusCode).toBe(404);
    });

    it('should map 429 errors to retryable FrameworkError', () => {
      const error = {
        response: {
          status: 429,
          data: { error: {} },
        },
      };

      const mappedError = (connector as any).mapSAPError(error);

      expect(mappedError).toBeInstanceOf(FrameworkError);
      expect(mappedError.statusCode).toBe(429);
      expect(mappedError.retryable).toBe(true);
      expect(mappedError.type).toBe('RATE_LIMIT');
    });

    it('should map 500 errors to retryable FrameworkError', () => {
      const error = {
        response: {
          status: 500,
          data: {
            error: {
              message: { value: 'Internal server error' },
            },
          },
        },
      };

      const mappedError = (connector as any).mapSAPError(error);

      expect(mappedError).toBeInstanceOf(FrameworkError);
      expect(mappedError.statusCode).toBe(500);
      expect(mappedError.retryable).toBe(true);
    });

    it('should map 502/503/504 errors to retryable FrameworkError', () => {
      [502, 503, 504].forEach((status) => {
        const error = {
          response: {
            status,
            data: { error: {} },
          },
        };

        const mappedError = (connector as any).mapSAPError(error);

        expect(mappedError.statusCode).toBe(status);
        expect(mappedError.retryable).toBe(true);
      });
    });

    it('should map unknown errors to non-retryable FrameworkError', () => {
      const error = {
        message: 'Unknown error occurred',
        response: {
          status: 418,
        },
      };

      const mappedError = (connector as any).mapSAPError(error);

      expect(mappedError).toBeInstanceOf(FrameworkError);
      expect(mappedError.type).toBe('UNKNOWN');
      expect(mappedError.retryable).toBe(false);
    });

    it('should handle errors without status code', () => {
      const error = {
        message: 'Network error',
      };

      const mappedError = (connector as any).mapSAPError(error);

      expect(mappedError.statusCode).toBe(500);
    });
  });

  describe('getHealthCheckEndpoint', () => {
    it('should return catalog service endpoint', () => {
      const endpoint = (connector as any).getHealthCheckEndpoint();

      expect(endpoint).toBe('/sap/opu/odata/iwfnd/catalogservice;v=2');
    });
  });

  describe('circuit breaker', () => {
    it('should reset circuit breaker', () => {
      connector.resetCircuitBreaker();

      const state = connector.getCircuitBreakerState();
      expect(state.state).toBe('CLOSED');
      expect(state.failureCount).toBe(0);
    });

    it('should track circuit breaker state', () => {
      const state = connector.getCircuitBreakerState();

      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('failureCount');
      expect(state).toHaveProperty('successCount');
    });
  });

  describe('getAuthToken', () => {
    it('should throw AuthenticationError for unsupported auth type', async () => {
      const basicConfig: S4HANAConnectorConfig = {
        ...config,
        auth: {
          provider: 'SAP',
          type: 'BASIC',
          credentials: {},
        },
      };

      const basicConnector = new S4HANAConnector(basicConfig);

      // Remove mock to test real behavior
      jest.spyOn(basicConnector as any, 'getAuthToken').mockRestore();
      jest.spyOn(basicConnector as any, 'acquireOAuthToken').mockImplementation(() => {
        throw new AuthenticationError('Unsupported auth type: BASIC');
      });

      await expect((basicConnector as any).getAuthToken()).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError when OAuth not implemented', async () => {
      // Remove mock to test real behavior
      jest.spyOn(connector as any, 'getAuthToken').mockRestore();
      jest.spyOn(connector as any, 'acquireOAuthToken').mockRejectedValue(
        new Error('OAuth token acquisition not implemented')
      );

      await expect((connector as any).getAuthToken()).rejects.toThrow(AuthenticationError);
    });
  });
});
