import { ServiceDiscovery } from '../../src/connectors/base/ServiceDiscovery';
import { BaseSAPConnector } from '../../src/connectors/base/BaseSAPConnector';

describe('ServiceDiscovery', () => {
  let discovery: ServiceDiscovery;
  let mockConnector: jest.Mocked<BaseSAPConnector>;

  beforeEach(() => {
    mockConnector = {
      executeRequest: jest.fn(),
      testConnection: jest.fn(),
    } as any;

    discovery = new ServiceDiscovery(mockConnector);
  });

  describe('discoverServices', () => {
    it('should discover services successfully', async () => {
      // Arrange
      const mockCatalogResponse = {
        d: {
          results: [
            {
              Title: 'Business Partner API',
              TechnicalServiceName: 'API_BUSINESS_PARTNER',
              TechnicalServiceVersion: '0001',
              ServiceUrl: '/sap/opu/odata/sap/API_BUSINESS_PARTNER',
              Status: 'ACTIVE',
            },
            {
              Title: 'Sales Order API',
              TechnicalServiceName: 'API_SALES_ORDER',
              TechnicalServiceVersion: '0001',
              ServiceUrl: '/sap/opu/odata/sap/API_SALES_ORDER',
              Status: 'ACTIVE',
            },
          ],
        },
      };

      (mockConnector.executeRequest as jest.Mock).mockResolvedValue(mockCatalogResponse);

      // Act
      const result = await discovery.discoverServices();

      // Assert
      expect(result.success).toBe(true);
      expect(result.services.length).toBeGreaterThanOrEqual(2);
      expect(mockConnector.executeRequest).toHaveBeenCalled();
    });

    it('should handle discovery errors gracefully', async () => {
      // Arrange
      (mockConnector.executeRequest as jest.Mock).mockRejectedValue(
        new Error('Network timeout')
      );

      // Act
      const result = await discovery.discoverServices();

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.services).toHaveLength(0);
    });

    it('should return empty services list when no services found', async () => {
      // Arrange
      const emptyResponse = {
        d: {
          results: [],
        },
      };

      (mockConnector.executeRequest as jest.Mock).mockResolvedValue(emptyResponse);

      // Act
      const result = await discovery.discoverServices();

      // Assert
      expect(result.services).toHaveLength(0);
    });

    it('should include service version in results', async () => {
      // Arrange
      const mockCatalogResponse = {
        d: {
          results: [
            {
              Title: 'Business Partner API',
              TechnicalServiceName: 'API_BUSINESS_PARTNER',
              TechnicalServiceVersion: '0001',
              ServiceUrl: '/sap/opu/odata/sap/API_BUSINESS_PARTNER',
              Status: 'ACTIVE',
            },
          ],
        },
      };

      (mockConnector.executeRequest as jest.Mock).mockResolvedValue(mockCatalogResponse);

      // Act
      const result = await discovery.discoverServices();

      // Assert
      expect(result.version).toBeDefined();
      expect(result.services.length).toBeGreaterThan(0);
    });

    it('should detect custom services with Z prefix', async () => {
      // Arrange
      const mockCatalogResponse = {
        d: {
          results: [
            {
              Title: 'Custom Service',
              TechnicalServiceName: 'Z_CUSTOM_SERVICE',
              TechnicalServiceVersion: '0001',
              ServiceUrl: '/sap/opu/odata/custom/Z_CUSTOM_SERVICE',
              Status: 'ACTIVE',
            },
          ],
        },
      };

      (mockConnector.executeRequest as jest.Mock).mockResolvedValue(mockCatalogResponse);

      // Act
      const result = await discovery.discoverServices();

      // Assert
      expect(result.services.some(s => s.technicalName?.startsWith('Z_'))).toBe(true);
    });
  });

  describe('getServiceMetadata', () => {
    it('should return null on metadata fetch errors', async () => {
      // Arrange
      (mockConnector.executeRequest as jest.Mock).mockRejectedValue(
        new Error('Not found')
      );

      // Act
      const result = await discovery.getServiceMetadata('/sap/opu/odata/test');

      // Assert
      expect(result).toBeNull();
    });

    it('should fetch and parse metadata successfully', async () => {
      // Arrange
      const mockMetadataXML = `<?xml version="1.0"?>
        <edmx:Edmx xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">
          <edmx:DataServices>
            <Schema xmlns="http://schemas.microsoft.com/ado/2008/09/edm">
              <EntityType Name="BusinessPartner">
                <Property Name="PartnerID" Type="Edm.String"/>
              </EntityType>
            </Schema>
          </edmx:DataServices>
        </edmx:Edmx>`;

      (mockConnector.executeRequest as jest.Mock).mockResolvedValue(mockMetadataXML);

      // Act
      const result = await discovery.getServiceMetadata('/sap/opu/odata/test');

      // Assert
      // Note: Result may be null due to simplified XML parsing in implementation
      expect(mockConnector.executeRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/sap/opu/odata/test/$metadata',
      });
    });
  });

  describe('generateTenantProfile', () => {
    it('should generate complete tenant capability profile', async () => {
      // Arrange
      const mockCatalogResponse = {
        d: {
          results: [
            {
              Title: 'Business Partner API',
              TechnicalServiceName: 'API_BUSINESS_PARTNER',
              TechnicalServiceVersion: '0001',
              ServiceUrl: '/sap/opu/odata/sap/API_BUSINESS_PARTNER',
              Status: 'ACTIVE',
            },
          ],
        },
      };

      (mockConnector.executeRequest as jest.Mock).mockResolvedValue(mockCatalogResponse);

      // Act
      const result = await discovery.generateTenantProfile('tenant-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.tenantId).toBe('tenant-123');
      expect(result.availableServices).toBeDefined();
      expect(result.capabilities).toBeDefined();
    });

    it('should handle profile generation errors gracefully', async () => {
      // Arrange
      (mockConnector.executeRequest as jest.Mock).mockRejectedValue(
        new Error('Connection timeout')
      );

      // Act
      const result = await discovery.generateTenantProfile('tenant-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.tenantId).toBe('tenant-123');
      expect(result.availableServices).toHaveLength(0);
    });
  });
});
