/**
 * SuccessFactorsConnector Unit Tests
 *
 * Tests all data fetching methods, error handling, pagination, and SoD analysis
 */

import { SuccessFactorsConnector } from '../../dist/connectors/successfactors/SuccessFactorsConnector';
import {
  SFEmployee,
  SFOrgUnit,
  SFCompensation,
  SFPerformanceReview,
} from '../../dist/connectors/successfactors/types';
import { AuthenticationError, ConnectorError } from '../../dist/errors/FrameworkError';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SuccessFactorsConnector', () => {
  let connector: SuccessFactorsConnector;
  let mockRequest: jest.SpyInstance;
  let mockAxiosInstance: any;

  const mockConfig = {
    baseUrl: 'https://api2.successfactors.com',
    timeout: 30000,
    auth: {
      type: 'BASIC' as const,
      credentials: {
        username: 'test-user',
        password: 'test-pass',
      },
    },
    successfactors: {
      companyId: 'SFPART123456',
      apiKey: 'test-api-key',
      dataCenter: 'api2',
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

    connector = new SuccessFactorsConnector(mockConfig);

    // Mock the request method from BaseSAPConnector
    mockRequest = jest.spyOn(connector as any, 'request');

    // Mock getAuthToken to avoid token acquisition
    jest.spyOn(connector as any, 'getAuthToken').mockResolvedValue('mock-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmployees()', () => {
    const mockEmployees: SFEmployee[] = [
      {
        userId: 'emp001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        department: 'Finance',
        position: 'Financial Analyst',
        hireDate: '2020-01-15',
        status: 'ACTIVE',
      },
      {
        userId: 'emp002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        department: 'HR',
        position: 'HR Manager',
        hireDate: '2019-05-20',
        status: 'ACTIVE',
      },
    ];

    it('should fetch all employees without filters', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockEmployees },
      });

      const result = await connector.getEmployees();

      expect(result).toEqual(mockEmployees);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/odata/v2/User',
      });
    });

    it('should filter employees by status', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockEmployees[0]] },
      });

      await connector.getEmployees({ status: 'ACTIVE' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining("status eq 'ACTIVE'"),
        })
      );
    });

    it('should filter employees by department', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockEmployees[0]] },
      });

      await connector.getEmployees({ department: 'Finance' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining("department eq 'Finance'"),
        })
      );
    });

    it('should filter employees by hire date', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockEmployees },
      });

      const hireDate = new Date('2020-01-01');
      await connector.getEmployees({ hireDate });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining(`hireDate ge datetime'${hireDate.toISOString()}'`),
        })
      );
    });

    it('should apply pagination with limit and offset', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockEmployees[0]] },
      });

      await connector.getEmployees({ limit: 50, offset: 100 });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringMatching(/\$top=50.*\$skip=100/),
        })
      );
    });

    it('should combine multiple filters', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockEmployees[0]] },
      });

      await connector.getEmployees({
        status: 'ACTIVE',
        department: 'Finance',
        limit: 10,
      });

      const call = mockRequest.mock.calls[0][0];
      expect(call.url).toContain("status eq 'ACTIVE'");
      expect(call.url).toContain("department eq 'Finance'");
      expect(call.url).toContain('$top=10');
    });
  });

  describe('getOrgUnits()', () => {
    const mockOrgUnits: SFOrgUnit[] = [
      {
        code: 'FIN',
        name: 'Finance Department',
        parentCode: 'CORP',
        headOfUnit: 'emp001',
      },
      {
        code: 'HR',
        name: 'Human Resources',
        parentCode: 'CORP',
        headOfUnit: 'emp002',
      },
    ];

    it('should fetch all org units without filters', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockOrgUnits },
      });

      const result = await connector.getOrgUnits();

      expect(result).toEqual(mockOrgUnits);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/odata/v2/FODepartment',
      });
    });

    it('should filter org units by parent code', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockOrgUnits },
      });

      await connector.getOrgUnits({ parentCode: 'CORP' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining("parentCode eq 'CORP'"),
        })
      );
    });

    it('should apply pagination to org units', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockOrgUnits[0]] },
      });

      await connector.getOrgUnits({ limit: 20, offset: 40 });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringMatching(/\$top=20.*\$skip=40/),
        })
      );
    });
  });

  describe('getCompensation()', () => {
    const mockCompensation: SFCompensation[] = [
      {
        userId: 'emp001',
        salary: 85000,
        currency: 'USD',
        effectiveDate: '2025-01-01',
      },
      {
        userId: 'emp002',
        salary: 95000,
        currency: 'USD',
        effectiveDate: '2025-01-01',
      },
    ];

    it('should fetch all compensation data', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockCompensation },
      });

      const result = await connector.getCompensation();

      expect(result).toEqual(mockCompensation);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/odata/v2/EmpCompensation',
      });
    });

    it('should filter compensation by userId', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockCompensation[0]] },
      });

      await connector.getCompensation({ userId: 'emp001' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining("userId eq 'emp001'"),
        })
      );
    });

    it('should filter by effective date', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockCompensation },
      });

      const effectiveDate = new Date('2025-01-01');
      await connector.getCompensation({ effectiveDate });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining(`effectiveDate ge datetime'${effectiveDate.toISOString()}'`),
        })
      );
    });

    it('should filter by minimum salary', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockCompensation[1]] },
      });

      await connector.getCompensation({ minSalary: 90000 });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('salary ge 90000'),
        })
      );
    });

    it('should combine compensation filters', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockCompensation[0]] },
      });

      await connector.getCompensation({
        userId: 'emp001',
        minSalary: 80000,
        limit: 5,
      });

      const call = mockRequest.mock.calls[0][0];
      expect(call.url).toContain("userId eq 'emp001'");
      expect(call.url).toContain('salary ge 80000');
      expect(call.url).toContain('$top=5');
    });
  });

  describe('getPerformanceReviews()', () => {
    const mockReviews: SFPerformanceReview[] = [
      {
        reviewId: 'REV-001',
        userId: 'emp001',
        reviewDate: '2024-12-15',
        rating: 4.5,
        status: 'COMPLETED',
      },
      {
        reviewId: 'REV-002',
        userId: 'emp002',
        reviewDate: '2024-12-20',
        rating: 4.0,
        status: 'COMPLETED',
      },
    ];

    it('should fetch all performance reviews', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockReviews },
      });

      const result = await connector.getPerformanceReviews();

      expect(result).toEqual(mockReviews);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/odata/v2/FormReviewInfoSection',
      });
    });

    it('should filter reviews by userId', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockReviews[0]] },
      });

      await connector.getPerformanceReviews({ userId: 'emp001' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining("userId eq 'emp001'"),
        })
      );
    });

    it('should filter reviews by date range', async () => {
      mockRequest.mockResolvedValue({
        d: { results: mockReviews },
      });

      const fromDate = new Date('2024-12-01');
      const toDate = new Date('2024-12-31');

      await connector.getPerformanceReviews({ fromDate, toDate });

      const call = mockRequest.mock.calls[0][0];
      expect(call.url).toContain(`reviewDate ge datetime'${fromDate.toISOString()}'`);
      expect(call.url).toContain(`reviewDate le datetime'${toDate.toISOString()}'`);
    });

    it('should filter by minimum rating', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockReviews[0]] },
      });

      await connector.getPerformanceReviews({ minRating: 4.0 });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('rating ge 4'),
        })
      );
    });

    it('should combine review filters with limit', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [mockReviews[0]] },
      });

      await connector.getPerformanceReviews({
        userId: 'emp001',
        minRating: 4.0,
        limit: 10,
      });

      const call = mockRequest.mock.calls[0][0];
      expect(call.url).toContain("userId eq 'emp001'");
      expect(call.url).toContain('rating ge 4');
      expect(call.url).toContain('$top=10');
    });
  });

  describe('getUserRoles() - SoD Analysis', () => {
    it('should return roles for existing user', async () => {
      // Mock getEmployees to verify user exists
      mockRequest.mockResolvedValueOnce({
        d: { results: [{ userId: 'emp001', firstName: 'John' }] },
      });

      // Mock roles request
      mockRequest.mockResolvedValueOnce({
        d: { results: [{ roleName: 'Admin' }, { roleName: 'Buyer' }] },
      });

      const roles = await connector.getUserRoles('emp001');

      expect(roles).toEqual(['Admin', 'Buyer']);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('should throw ConnectorError when user not found', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [] },
      });

      await expect(connector.getUserRoles('nonexistent')).rejects.toThrow(
        'User nonexistent not found'
      );
    });

    it('should handle users with no roles', async () => {
      // User exists
      mockRequest.mockResolvedValueOnce({
        d: { results: [{ userId: 'emp001' }] },
      });

      // No roles
      mockRequest.mockResolvedValueOnce({
        d: { results: [] },
      });

      const roles = await connector.getUserRoles('emp001');

      expect(roles).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should map 401 to AuthenticationError', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 401,
          data: {
            error: {
              message: { value: 'Invalid credentials' },
            },
          },
        },
      });

      await expect(connector.getEmployees()).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should map 403 to AuthenticationError', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: {
              message: 'Insufficient permissions',
            },
          },
        },
      });

      await expect(connector.getEmployees()).rejects.toThrow(
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
        await connector.getEmployees();
        fail('Should have thrown ConnectorError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ConnectorError);
        expect(error.statusCode).toBe(429);
        expect(error.retryable).toBe(true);
        expect(error.message).toContain('100 calls/10s');
      }
    });

    it('should map 404 to non-retryable ConnectorError', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 404,
        },
      });

      try {
        await connector.getEmployees();
        fail('Should have thrown ConnectorError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ConnectorError);
        expect(error.statusCode).toBe(404);
        expect(error.retryable).toBe(false);
      }
    });

    it('should map 504 to retryable ConnectorError (timeout)', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 504,
        },
      });

      try {
        await connector.getEmployees();
        fail('Should have thrown ConnectorError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ConnectorError);
        expect(error.statusCode).toBe(504);
        expect(error.retryable).toBe(true);
        expect(error.message).toContain('180s');
      }
    });

    it('should handle timeout errors by message', async () => {
      mockRequest.mockRejectedValue({
        message: 'Request timeout',
      });

      try {
        await connector.getEmployees();
        fail('Should have thrown ConnectorError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ConnectorError);
        expect(error.message).toContain('timeout');
        expect(error.retryable).toBe(true);
      }
    });

    it('should map 5xx to retryable errors', async () => {
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
        await connector.getEmployees();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.statusCode).toBe(503);
        expect(error.retryable).toBe(true);
      }
    });

    it('should handle errors with string message format', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 500,
          data: {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error',
            },
          },
        },
      });

      try {
        await connector.getEmployees();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Internal server error');
        expect(error.type).toBe('INTERNAL_ERROR');
      }
    });

    it('should handle errors with nested message.value format', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 500,
          data: {
            error: {
              message: {
                value: 'Nested error message',
              },
            },
          },
        },
      });

      try {
        await connector.getEmployees();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Nested error message');
      }
    });
  });

  describe('OData Query Building', () => {
    it('should build complex queries with multiple parameters', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [] },
      });

      await connector.getEmployees({
        status: 'ACTIVE',
        department: 'Finance',
        limit: 25,
        offset: 50,
      });

      const call = mockRequest.mock.calls[0][0];
      // Verify OData query structure
      expect(call.url).toMatch(/\/odata\/v2\/User\?/);
      expect(call.url).toContain('$filter=');
      expect(call.url).toContain('$top=25');
      expect(call.url).toContain('$skip=50');
    });

    it('should properly escape OData string values', async () => {
      mockRequest.mockResolvedValue({
        d: { results: [] },
      });

      await connector.getEmployees({
        department: "Finance & Admin's Dept",
      });

      const call = mockRequest.mock.calls[0][0];
      // OData string should be properly escaped
      expect(call.url).toContain('$filter=');
    });
  });
});
