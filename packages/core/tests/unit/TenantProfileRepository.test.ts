import { TenantProfileRepository } from '../../src/persistence/TenantProfileRepository';
import { Pool } from 'pg';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('TenantProfileRepository', () => {
  let repository: TenantProfileRepository;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    repository = new TenantProfileRepository('postgresql://localhost/test');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTenant', () => {
    it('should create a new tenant successfully', async () => {
      // Arrange
      const mockTenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: 'tenant-123',
        company_name: 'Acme Corp',
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockTenant],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.createTenant('tenant-123', 'Acme Corp');

      // Assert
      expect(result.tenant_id).toBe('tenant-123');
      expect(result.company_name).toBe('Acme Corp');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tenants'),
        ['tenant-123', 'Acme Corp']
      );
    });

    it('should handle duplicate tenant errors', async () => {
      // Arrange
      const error: any = new Error('duplicate key value violates unique constraint');
      error.code = '23505'; // PostgreSQL unique violation
      (mockPool.query as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(
        repository.createTenant('tenant-123', 'Acme Corp')
      ).rejects.toThrow();
    });
  });

  describe('getTenant', () => {
    it('should retrieve an existing tenant', async () => {
      // Arrange
      const mockTenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: 'tenant-123',
        company_name: 'Acme Corp',
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockTenant],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getTenant('tenant-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.tenant_id).toBe('tenant-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM tenants'),
        ['tenant-123']
      );
    });

    it('should return null for non-existent tenant', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getTenant('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('saveProfile', () => {
    it('should save a tenant capability profile', async () => {
      // Arrange
      const mockProfile = {
        tenantId: 'tenant-123',
        sapVersion: 'S4_CLOUD' as const,
        discoveredAt: new Date(),
        availableServices: [{
          name: 'API_BUSINESS_PARTNER',
          technicalName: 'API_BUSINESS_PARTNER',
          version: '0001',
          endpoint: '/api/bp',
          status: 'ACTIVE' as const,
          type: 'ODATA_V2' as const,
        }],
        customFields: [],
        capabilities: {
          canDoSoD: true,
          canDoInvoiceMatching: true,
          canDoAnomalyDetection: false,
          canDoInventoryOptimization: false,
          canDoForecastingML: false,
          canDoExpenseAnalysis: false,
          hasFinance: true,
          customCapabilities: {},
        },
        missingServices: [],
        recommendedActions: [],
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: '123' }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      await repository.saveProfile(mockProfile);

      // Assert
      expect(mockPool.query).toHaveBeenCalledTimes(2); // getTenant + insert
    });

    it('should throw error if tenant does not exist', async () => {
      // Arrange
      const mockProfile = {
        tenantId: 'non-existent',
        sapVersion: 'S4_ON_PREM' as const,
        discoveredAt: new Date(),
        availableServices: [],
        customFields: [],
        capabilities: {
          canDoSoD: false,
          canDoInvoiceMatching: false,
          canDoAnomalyDetection: false,
          canDoInventoryOptimization: false,
          canDoForecastingML: false,
          canDoExpenseAnalysis: false,
          hasFinance: false,
          customCapabilities: {},
        },
        missingServices: [],
        recommendedActions: [],
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Act & Assert
      await expect(repository.saveProfile(mockProfile)).rejects.toThrow(
        'Tenant non-existent not found'
      );
    });
  });

  describe('getActiveModules', () => {
    it('should return list of active modules', async () => {
      // Arrange
      const mockModules = [
        { module_name: 'SoD_Analysis' },
        { module_name: 'User_Access_Review' },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockModules,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getActiveModules('tenant-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContain('SoD_Analysis');
      expect(result).toContain('User_Access_Review');
    });

    it('should return empty array when no modules active', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getActiveModules('tenant-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('activateModule', () => {
    it('should activate a module for tenant', async () => {
      // Arrange
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // getTenant
          rows: [{ id: '123', tenant_id: 'tenant-123' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          // insert
          rows: [],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

      // Act
      await repository.activateModule('tenant-123', 'SoD_Analysis', 'Required for compliance');

      // Assert
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tenant_module_activations'),
        expect.arrayContaining(['tenant-123', 'SoD_Analysis', 'Required for compliance'])
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when database is healthy', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ '?column?': 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.healthCheck();

      // Assert
      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return false when database is unhealthy', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await repository.healthCheck();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should retrieve tenant capability profile', async () => {
      // Arrange
      const mockProfile = {
        tenant_id: 'tenant-123',
        sap_version: 'S4_CLOUD',
        discovered_at: new Date(),
        available_services: JSON.stringify([]),
        custom_fields: JSON.stringify([]),
        capabilities: JSON.stringify({
          canDoSoD: true,
          canDoInvoiceMatching: true,
          canDoAnomalyDetection: false,
          canDoInventoryOptimization: false,
          canDoForecastingML: false,
          canDoExpenseAnalysis: false,
          hasFinance: true,
          customCapabilities: {},
        }),
        missing_services: [],
        recommended_actions: JSON.stringify([]),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockProfile],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getProfile('tenant-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.tenantId).toBe('tenant-123');
      expect(result?.sapVersion).toBe('S4_CLOUD');
    });

    it('should return null for non-existent profile', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getProfile('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('saveDiscoveryHistory', () => {
    it('should save discovery history', async () => {
      // Arrange
      const mockResult = {
        success: true,
        version: 'S4_CLOUD' as const,
        services: [],
        permissionTests: [],
        customFields: [],
        capabilities: {
          canDoSoD: false,
          canDoInvoiceMatching: false,
          canDoAnomalyDetection: false,
          canDoInventoryOptimization: false,
          canDoForecastingML: false,
          canDoExpenseAnalysis: false,
          hasFinance: false,
          customCapabilities: {},
        },
        errors: [],
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: '123', tenant_id: 'tenant-123' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

      // Act
      await repository.saveDiscoveryHistory('tenant-123', mockResult);

      // Assert
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO service_discovery_history'),
        expect.arrayContaining(['tenant-123', expect.any(String), 0, true, []])
      );
    });

    it('should throw error for non-existent tenant', async () => {
      // Arrange
      const mockResult = {
        success: true,
        version: 'S4_CLOUD' as const,
        services: [],
        permissionTests: [],
        customFields: [],
        capabilities: {
          canDoSoD: false,
          canDoInvoiceMatching: false,
          canDoAnomalyDetection: false,
          canDoInventoryOptimization: false,
          canDoForecastingML: false,
          canDoExpenseAnalysis: false,
          hasFinance: false,
          customCapabilities: {},
        },
        errors: [],
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Act & Assert
      await expect(
        repository.saveDiscoveryHistory('non-existent', mockResult)
      ).rejects.toThrow('Tenant non-existent not found');
    });
  });

  describe('getSAPConnection', () => {
    it('should retrieve SAP connection details', async () => {
      // Arrange
      const mockConnection = {
        id: 'conn-123',
        tenant_id: 'tenant-123',
        connection_type: 'IPS',
        base_url: 'https://api.example.com',
        auth_credentials: { type: 'oauth' },
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockConnection],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getSAPConnection('tenant-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.connection_type).toBe('IPS');
    });

    it('should return null when no connection exists', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getSAPConnection('tenant-123');

      // Assert
      expect(result).toBeNull();
    });
  });
});
