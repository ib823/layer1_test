import { TenantProfileRepository } from '../../src/persistence/TenantProfileRepository';

jest.mock('pg');
const { mockQuery, mockEnd } = require('../../__mocks__/pg');

describe('TenantProfileRepository', () => {
  let repository: TenantProfileRepository;

  beforeEach(() => {
    mockQuery.mockClear();
    mockEnd.mockClear();
    repository = new TenantProfileRepository('postgresql://localhost/test');
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

      (mockQuery as jest.Mock).mockResolvedValue({
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
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tenants'),
        ['tenant-123', 'Acme Corp']
      );
    });

    it('should handle duplicate tenant errors', async () => {
      // Arrange
      const error: any = new Error('duplicate key value violates unique constraint');
      error.code = '23505'; // PostgreSQL unique violation
      (mockQuery as jest.Mock).mockRejectedValue(error);

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

      (mockQuery as jest.Mock).mockResolvedValue({
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
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM tenants'),
        ['tenant-123']
      );
    });

    it('should return null for non-existent tenant', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockResolvedValue({
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

      (mockQuery as jest.Mock).mockResolvedValue({
        rows: [{ id: '123' }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      await repository.saveProfile(mockProfile);

      // Assert
      expect(mockQuery).toHaveBeenCalledTimes(2); // getTenant + insert
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

      (mockQuery as jest.Mock).mockResolvedValue({
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

      (mockQuery as jest.Mock).mockResolvedValue({
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
      (mockQuery as jest.Mock).mockResolvedValue({
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
      (mockQuery as jest.Mock)
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
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tenant_module_activations'),
        expect.arrayContaining(['tenant-123', 'SoD_Analysis', 'Required for compliance'])
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when database is healthy', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockResolvedValue({
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
      expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return false when database is unhealthy', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockRejectedValue(new Error('Connection failed'));

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

      (mockQuery as jest.Mock).mockResolvedValue({
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
      (mockQuery as jest.Mock).mockResolvedValue({
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

      (mockQuery as jest.Mock)
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
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenCalledWith(
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

      (mockQuery as jest.Mock).mockResolvedValue({
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

      (mockQuery as jest.Mock).mockResolvedValue({
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
      (mockQuery as jest.Mock).mockResolvedValue({
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

  describe('deactivateModule', () => {
    it('should deactivate a module for tenant', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      await repository.deactivateModule('tenant-123', 'SoD_Analysis');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tenant_module_activations'),
        ['tenant-123', 'SoD_Analysis']
      );
    });
  });

  describe('getAllTenants', () => {
    it('should retrieve all tenants', async () => {
      // Arrange
      const mockTenants = [
        {
          id: '1',
          tenant_id: 'tenant-1',
          company_name: 'Company 1',
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          tenant_id: 'tenant-2',
          company_name: 'Company 2',
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (mockQuery as jest.Mock).mockResolvedValue({
        rows: mockTenants,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getAllTenants();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].tenant_id).toBe('tenant-1');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM tenants')
      );
    });

    it('should return empty array when no tenants exist', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getAllTenants();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('getAllActiveTenants', () => {
    it('should retrieve only active tenants', async () => {
      // Arrange
      const mockTenants = [
        {
          id: '1',
          tenant_id: 'tenant-1',
          company_name: 'Company 1',
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (mockQuery as jest.Mock).mockResolvedValue({
        rows: mockTenants,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getAllActiveTenants();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('ACTIVE');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'ACTIVE'")
      );
    });
  });

  describe('updateTenant', () => {
    it('should update tenant company name', async () => {
      // Arrange
      const mockTenant = {
        id: '1',
        tenant_id: 'tenant-123',
        company_name: 'Updated Corp',
        status: 'ACTIVE' as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock).mockResolvedValue({
        rows: [mockTenant],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.updateTenant('tenant-123', {
        company_name: 'Updated Corp',
      });

      // Assert
      expect(result.company_name).toBe('Updated Corp');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tenants'),
        expect.arrayContaining(['Updated Corp', 'tenant-123'])
      );
    });

    it('should update tenant status', async () => {
      // Arrange
      const mockTenant = {
        id: '1',
        tenant_id: 'tenant-123',
        company_name: 'Acme Corp',
        status: 'SUSPENDED' as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock).mockResolvedValue({
        rows: [mockTenant],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.updateTenant('tenant-123', {
        status: 'SUSPENDED',
      });

      // Assert
      expect(result.status).toBe('SUSPENDED');
    });

    it('should update both company name and status', async () => {
      // Arrange
      const mockTenant = {
        id: '1',
        tenant_id: 'tenant-123',
        company_name: 'New Corp',
        status: 'INACTIVE' as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock).mockResolvedValue({
        rows: [mockTenant],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.updateTenant('tenant-123', {
        company_name: 'New Corp',
        status: 'INACTIVE',
      });

      // Assert
      expect(result.company_name).toBe('New Corp');
      expect(result.status).toBe('INACTIVE');
    });
  });

  describe('saveSAPConnection', () => {
    it('should save SAP connection details', async () => {
      // Arrange
      const connection = {
        type: 'S4HANA',
        baseUrl: 'https://sap.example.com',
        auth: {
          type: 'oauth',
          credentials: {
            clientId: 'client-123',
            clientSecret: 'secret',
          },
        },
      };

      (mockQuery as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      await repository.saveSAPConnection('tenant-123', connection);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tenant_sap_connections'),
        expect.arrayContaining([
          'tenant-123',
          'S4HANA',
          'https://sap.example.com',
          'oauth',
          expect.any(String),
        ])
      );
    });

    it('should use default connection type if not provided', async () => {
      // Arrange
      const connection = {
        baseUrl: 'https://sap.example.com',
        auth: {
          type: 'basic',
          credentials: {
            username: 'user',
            password: 'pass',
          },
        },
      };

      (mockQuery as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      await repository.saveSAPConnection('tenant-123', connection);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['tenant-123', 'S4HANA'])
      );
    });
  });

  describe('getDiscoveryHistory', () => {
    it('should retrieve discovery history with default limit', async () => {
      // Arrange
      const mockHistory = [
        {
          id: '1',
          tenant_id: 'tenant-123',
          discovery_result: {},
          services_count: 5,
          success: true,
          errors: [],
          discovered_at: new Date(),
        },
      ];

      (mockQuery as jest.Mock).mockResolvedValue({
        rows: mockHistory,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getDiscoveryHistory('tenant-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('service_discovery_history'),
        ['tenant-123', 10]
      );
    });

    it('should retrieve discovery history with custom limit', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Act
      await repository.getDiscoveryHistory('tenant-123', 5);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['tenant-123', 5]
      );
    });

    it('should return empty array when no history exists', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      // Act
      const result = await repository.getDiscoveryHistory('tenant-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('close', () => {
    it('should close database pool', async () => {
      // Arrange
      (mockEnd as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.close();

      // Assert
      expect(mockEnd).toHaveBeenCalled();
    });
  });
});
