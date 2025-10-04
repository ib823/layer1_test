import { Request, Response, NextFunction } from 'express';
import { TenantController } from '../../src/controllers/TenantController';
import { TenantProfileRepository } from '@sap-framework/core';

// Mock the repository
jest.mock('@sap-framework/core', () => ({
  TenantProfileRepository: jest.fn().mockImplementation(() => ({
    getTenant: jest.fn(),
    createTenant: jest.fn(),
    getActiveModules: jest.fn(),
    activateModule: jest.fn(),
  })),
}));

describe('TenantController', () => {
  let controller: TenantController;
  let mockRepository: jest.Mocked<TenantProfileRepository>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRepository = new TenantProfileRepository('test-db') as jest.Mocked<TenantProfileRepository>;
    controller = new TenantController(mockRepository);

    mockRequest = {
      params: {},
      body: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTenant', () => {
    it('should return tenant details', async () => {
      // Arrange
      const mockTenant = {
        id: '123',
        tenant_id: 'tenant-123',
        company_name: 'Acme Corp',
        status: 'ACTIVE' as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRequest.params = { tenantId: 'tenant-123' };
      mockRepository.getTenant.mockResolvedValue(mockTenant);

      // Act
      await controller.getTenant(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockRepository.getTenant).toHaveBeenCalledWith('tenant-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockTenant,
        })
      );
    });

    it('should return 404 when tenant not found', async () => {
      // Arrange
      mockRequest.params = { tenantId: 'non-existent' };
      mockRepository.getTenant.mockResolvedValue(null);

      // Act
      await controller.getTenant(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('not found'),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockRequest.params = { tenantId: 'tenant-123' };
      mockRepository.getTenant.mockRejectedValue(new Error('Database error'));

      // Act
      await controller.getTenant(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createTenant', () => {
    it('should create a new tenant', async () => {
      // Arrange
      const mockTenant = {
        id: '123',
        tenant_id: 'tenant-123',
        company_name: 'Acme Corp',
        status: 'ACTIVE' as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRequest.body = {
        tenantId: 'tenant-123',
        companyName: 'Acme Corp',
      };

      mockRepository.createTenant.mockResolvedValue(mockTenant);

      // Act
      await controller.createTenant(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockRepository.createTenant).toHaveBeenCalledWith('tenant-123', 'Acme Corp');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockTenant,
        })
      );
    });

    it('should validate required fields', async () => {
      // Arrange
      mockRequest.body = { tenantId: 'tenant-123' }; // Missing companyName

      // Act
      await controller.createTenant(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('getActiveModules', () => {
    it('should return list of active modules', async () => {
      // Arrange
      const mockModules = ['SoD_Analysis', 'User_Access_Review'];
      mockRequest.params = { tenantId: 'tenant-123' };
      mockRepository.getActiveModules.mockResolvedValue(mockModules);

      // Act
      await controller.getActiveModules(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockRepository.getActiveModules).toHaveBeenCalledWith('tenant-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockModules,
        })
      );
    });

    it('should return empty array when no modules active', async () => {
      // Arrange
      mockRequest.params = { tenantId: 'tenant-123' };
      mockRepository.getActiveModules.mockResolvedValue([]);

      // Act
      await controller.getActiveModules(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
        })
      );
    });
  });
});
