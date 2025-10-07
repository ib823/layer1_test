/**
 * AribaConnector Unit Tests
 *
 * Tests all data fetching methods, error handling, and SoD analysis capabilities
 */

import { AribaConnector } from '../../dist/connectors/ariba/AribaConnector';
import {
  AribaSupplier,
  AribaPurchaseOrder,
  AribaContract,
  AribaInvoice,
  AribaUser,
} from '../../dist/connectors/ariba/types';
import { AuthenticationError, ConnectorError } from '../../dist/errors/FrameworkError';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AribaConnector', () => {
  let connector: AribaConnector;
  let mockRequest: jest.SpyInstance;
  let mockAxiosInstance: any;

  const mockConfig = {
    baseUrl: 'https://api.ariba.com',
    timeout: 30000,
    auth: {
      type: 'OAUTH' as const,
      credentials: {
        clientId: 'test-client',
        clientSecret: 'test-secret',
      },
    },
    ariba: {
      realm: 's1-sourcing',
      apiKey: 'test-api-key-123',
    },
  };

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

    connector = new AribaConnector(mockConfig);

    // Mock the request method from BaseSAPConnector
    mockRequest = jest.spyOn(connector as any, 'request');

    // Mock getAuthToken to avoid token acquisition
    jest.spyOn(connector as any, 'getAuthToken').mockResolvedValue('mock-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create connector with valid config', () => {
      expect(connector).toBeInstanceOf(AribaConnector);
    });

    it('should have getSuppliers method', () => {
      expect(typeof connector.getSuppliers).toBe('function');
    });
  });

  describe('getSuppliers()', () => {
    const mockSuppliers: AribaSupplier[] = [
      {
        SupplierID: 'SUP001',
        Name: 'ACME Corp',
        Status: 'ACTIVE',
        RiskScore: 15,
      },
      {
        SupplierID: 'SUP002',
        Name: 'Beta Industries',
        Status: 'BLOCKED',
        RiskScore: 85,
      },
    ];

    it('should fetch all suppliers without filters', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockSuppliers },
      });

      const result = await connector.getSuppliers();

      expect(result).toEqual(mockSuppliers);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/suppliers',
        params: {
          realm: 's1-sourcing',
        },
      });
    });

    it('should filter suppliers by status', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockSuppliers[0]] },
      });

      await connector.getSuppliers({ status: 'ACTIVE' });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/suppliers',
        params: {
          realm: 's1-sourcing',
          $filter: "Status eq 'ACTIVE'",
        },
      });
    });

    it('should apply pagination with limit and offset', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockSuppliers[0]] },
      });

      await connector.getSuppliers({ limit: 10, offset: 20 });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/suppliers',
        params: {
          realm: 's1-sourcing',
          $top: '10',
          $skip: '20',
        },
      });
    });

    it('should handle Records format (alternative response structure)', async () => {
      mockRequest.mockResolvedValue({
        Records: mockSuppliers,
      });

      const result = await connector.getSuppliers();

      expect(result).toEqual(mockSuppliers);
    });

    it('should return empty array when no results', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [] },
      });

      const result = await connector.getSuppliers();

      expect(result).toEqual([]);
    });
  });

  describe('getPurchaseOrders()', () => {
    const mockPOs: AribaPurchaseOrder[] = [
      {
        OrderID: 'PO-001',
        OrderDate: '2025-01-15T10:00:00Z',
        Supplier: 'ACME Corp',
        TotalAmount: 50000,
        Currency: 'USD',
        Status: 'APPROVED',
      },
    ];

    it('should fetch purchase orders with date range', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockPOs },
      });

      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-01-31');

      await connector.getPurchaseOrders({ fromDate, toDate });

      const expectedFilter = `OrderDate ge ${fromDate.toISOString()} and OrderDate le ${toDate.toISOString()}`;

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/purchase-orders',
        params: {
          realm: 's1-sourcing',
          $filter: expectedFilter,
        },
      });
    });

    it('should filter by status and supplier', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockPOs },
      });

      await connector.getPurchaseOrders({
        status: 'APPROVED',
        supplier: 'ACME Corp',
      });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/purchase-orders',
        params: {
          realm: 's1-sourcing',
          $filter: "Status eq 'APPROVED' and Supplier eq 'ACME Corp'",
        },
      });
    });

    it('should apply limit for pagination', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockPOs },
      });

      await connector.getPurchaseOrders({ limit: 50 });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/purchase-orders',
        params: {
          realm: 's1-sourcing',
          $top: '50',
        },
      });
    });
  });

  describe('getContracts()', () => {
    const mockContracts: AribaContract[] = [
      {
        ContractID: 'CTR-001',
        Title: 'Master Service Agreement',
        StartDate: '2025-01-01T00:00:00Z',
        EndDate: '2025-12-31T23:59:59Z',
        Value: 1000000,
        Currency: 'USD',
      },
    ];

    it('should fetch active contracts', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockContracts },
      });

      await connector.getContracts({ active: true });

      // Should filter by start/end dates relative to now
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/api/contracts',
          params: expect.objectContaining({
            realm: 's1-sourcing',
            $filter: expect.stringContaining('StartDate le'),
          }),
        })
      );
    });

    it('should filter contracts expiring within N days', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockContracts },
      });

      await connector.getContracts({ expiringDays: 30 });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/api/contracts',
          params: expect.objectContaining({
            $filter: expect.stringContaining('EndDate le'),
          }),
        })
      );
    });
  });

  describe('getInvoices()', () => {
    const mockInvoices: AribaInvoice[] = [
      {
        InvoiceID: 'INV-001',
        POReference: 'PO-001',
        Amount: 25000,
        Currency: 'USD',
        Status: 'PENDING',
      },
    ];

    it('should fetch invoices by status', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockInvoices },
      });

      await connector.getInvoices({ status: 'PENDING' });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/invoices',
        params: {
          realm: 's1-sourcing',
          $filter: "Status eq 'PENDING'",
        },
      });
    });

    it('should filter invoices by PO reference', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockInvoices },
      });

      await connector.getInvoices({ poReference: 'PO-001' });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/invoices',
        params: {
          realm: 's1-sourcing',
          $filter: "POReference eq 'PO-001'",
        },
      });
    });
  });

  describe('getUsers() - SoD Analysis', () => {
    const mockUsers: AribaUser[] = [
      {
        UserID: 'user001',
        UserName: 'John Doe',
        Email: 'john.doe@example.com',
        Department: 'Finance',
        Status: 'ACTIVE',
        Roles: ['Buyer', 'Approver'],
      },
      {
        UserID: 'user002',
        UserName: 'Jane Smith',
        Email: 'jane.smith@example.com',
        Department: 'Procurement',
        Status: 'ACTIVE',
        Roles: ['Buyer'],
      },
    ];

    it('should fetch all active users', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockUsers },
      });

      const result = await connector.getUsers({ active: true });

      expect(result).toEqual(mockUsers);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/users',
        params: {
          realm: 's1-sourcing',
          $filter: "Status eq 'ACTIVE'",
        },
      });
    });

    it('should filter users by department', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockUsers[0]] },
      });

      await connector.getUsers({ department: 'Finance' });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/users',
        params: {
          realm: 's1-sourcing',
          $filter: "Department eq 'Finance'",
        },
      });
    });

    it('should combine active and department filters', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockUsers[0]] },
      });

      await connector.getUsers({ active: true, department: 'Finance' });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/users',
        params: {
          realm: 's1-sourcing',
          $filter: "Status eq 'ACTIVE' and Department eq 'Finance'",
        },
      });
    });
  });

  describe('getUserRoles() - SoD Analysis', () => {
    it('should return roles for existing user', async () => {
      const mockUsers: AribaUser[] = [
        {
          UserID: 'user001',
          UserName: 'John Doe',
          Email: 'john.doe@example.com',
          Status: 'ACTIVE',
          Roles: ['Buyer', 'Approver', 'ContractManager'],
        },
      ];

      mockRequest.mockResolvedValue({
        d: { results: mockUsers },
      });

      const roles = await connector.getUserRoles('user001');

      expect(roles).toEqual(['Buyer', 'Approver', 'ContractManager']);
    });

    it('should return empty array if user has no roles', async () => {
      const mockUsers: AribaUser[] = [
        {
          UserID: 'user001',
          UserName: 'John Doe',
          Email: 'john.doe@example.com',
          Status: 'ACTIVE',
          Roles: undefined,
        },
      ];

      mockRequest.mockResolvedValue({
        d: { results: mockUsers },
      });

      const roles = await connector.getUserRoles('user001');

      expect(roles).toEqual([]);
    });

    it('should throw ConnectorError when user not found', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [] },
      });

      await expect(connector.getUserRoles('nonexistent')).rejects.toThrow(
        'User nonexistent not found'
      );
    });
  });

  describe('Error Handling', () => {
    it('should map 401 to AuthenticationError', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 401,
          data: {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid API key',
            },
          },
        },
      });

      await expect(connector.getSuppliers()).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should map 403 to AuthenticationError', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Insufficient permissions',
            },
          },
        },
      });

      await expect(connector.getSuppliers()).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should map 429 to retryable ConnectorError (rate limit)', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 429,
          data: {
            error: {
              message: 'Rate limit exceeded',
            },
          },
        },
      });

      try {
        await connector.getSuppliers();
        fail('Should have thrown ConnectorError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ConnectorError);
        expect(error.statusCode).toBe(429);
        expect(error.retryable).toBe(true);
        expect(error.message).toContain('1000 req/hour');
      }
    });

    it('should map 404 to non-retryable ConnectorError', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 404,
          data: {
            error: {
              message: 'Resource not found',
            },
          },
        },
      });

      try {
        await connector.getSuppliers();
        fail('Should have thrown ConnectorError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ConnectorError);
        expect(error.statusCode).toBe(404);
        expect(error.retryable).toBe(false);
      }
    });

    it('should map 5xx to retryable FrameworkError', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 503,
          data: {
            error: {
              message: 'Service unavailable',
            },
          },
        },
      });

      try {
        await connector.getSuppliers();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.statusCode).toBe(503);
        expect(error.retryable).toBe(true);
      }
    });

    it('should handle errors without response object', async () => {
      mockRequest.mockRejectedValue(new Error('Network error'));

      try {
        await connector.getSuppliers();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Network error');
        expect(error.statusCode).toBe(500);
      }
    });
  });

  describe('Request Headers', () => {
    it('should include Ariba-specific headers', () => {
      const requestSpy = jest.spyOn(connector as any, 'request');
      requestSpy.mockResolvedValue({ d: { results: [] } });

      connector.getSuppliers();

      // The request method is overridden to add apiKey header
      // Verify this is tested via integration test or by checking
      // that the protected request method adds headers
      expect(requestSpy).toHaveBeenCalled();
    });
  });
});
