import { 
  TenantProfileRepository,
  S4HANAConnector,
  IPSConnector 
} from '@sap-framework/core';
import { SystemHealth, ComponentHealth, ConnectorStatus } from '../types';
import logger from '../utils/logger';

export class MonitoringService {
  constructor(private tenantRepo: TenantProfileRepository) {}

  /**
   * Get overall system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    logger.info('Checking system health');

    const [databaseHealth, apiHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkApiHealth(),
    ]);

    const connectorsHealth = await this.checkConnectorsHealth();

    const overallStatus = this.determineOverallStatus([
      databaseHealth,
      apiHealth,
      connectorsHealth,
    ]);

    return {
      status: overallStatus,
      uptime: process.uptime(),
      timestamp: new Date(),
      components: {
        database: databaseHealth,
        connectors: connectorsHealth,
        api: apiHealth,
      },
    };
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Test database connection
      await this.tenantRepo.healthCheck();

      const responseTime = Date.now() - startTime;

      return {
        status: 'UP',
        message: 'Database is healthy',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error: any) {
      logger.error('Database health check failed', { error: error.message });

      return {
        status: 'DOWN',
        message: `Database error: ${error.message}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check API health
   */
  private async checkApiHealth(): Promise<ComponentHealth> {
    return {
      status: 'UP',
      message: 'API is healthy',
      responseTime: 0,
      lastChecked: new Date(),
    };
  }

  /**
   * Check connectors health (aggregate)
   */
  private async checkConnectorsHealth(): Promise<ComponentHealth> {
    const connectorStatuses = await this.getConnectorStatuses();

    const downCount = connectorStatuses.filter(c => c.status === 'DISCONNECTED' || c.status === 'ERROR').length;
    const totalCount = connectorStatuses.length;

    if (downCount === 0) {
      return {
        status: 'UP',
        message: 'All connectors healthy',
        lastChecked: new Date(),
      };
    } else if (downCount < totalCount) {
      return {
        status: 'DEGRADED',
        message: `${downCount}/${totalCount} connectors down`,
        lastChecked: new Date(),
      };
    } else {
      return {
        status: 'DOWN',
        message: 'All connectors down',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Get individual connector statuses
   */
  async getConnectorStatuses(): Promise<ConnectorStatus[]> {
    logger.info('Checking connector statuses');

    const tenants = await this.tenantRepo.getAllActiveTenants();
    const statuses: ConnectorStatus[] = [];

    for (const tenant of tenants) {
      try {
        const connection = await this.tenantRepo.getSAPConnection(tenant.tenant_id);
        if (!connection) continue;

        // Check S4HANA connector if configured
        if (connection.connection_type === 'S4HANA') {
          const status = await this.checkS4HANAConnector(connection);
          statuses.push(status);
        }

        // Check IPS connector if configured
        if (connection.connection_type === 'IPS') {
          const status = await this.checkIPSConnector(connection);
          statuses.push(status);
        }
      } catch (error: any) {
        logger.error('Failed to check connector', { 
          tenantId: tenant.tenant_id, 
          error: error.message 
        });
      }
    }

    return statuses;
  }

  /**
   * Check S/4HANA connector health
   */
  private async checkS4HANAConnector(connection: any): Promise<ConnectorStatus> {
    try {
      const connector = new S4HANAConnector({
        baseUrl: connection.base_url,
        auth: connection.auth_credentials,
      });

      const isHealthy = await connector.healthCheck();
      const circuitBreakerState = connector.getCircuitBreakerState();

      return {
        name: `S4HANA - ${connection.base_url}`,
        type: 'S4HANA',
        status: isHealthy ? 'CONNECTED' : 'DISCONNECTED',
        lastHealthCheck: new Date(),
        circuitBreaker: {
          state: circuitBreakerState.state,
          failureCount: circuitBreakerState.failureCount,
          successCount: circuitBreakerState.successCount,
        },
      };
    } catch (error: any) {
      logger.error('S4HANA connector check failed', { error: error.message });

      return {
        name: `S4HANA - ${connection.base_url}`,
        type: 'S4HANA',
        status: 'ERROR',
        lastHealthCheck: new Date(),
      };
    }
  }

  /**
   * Check IPS connector health
   */
  private async checkIPSConnector(connection: any): Promise<ConnectorStatus> {
    try {
      const connector = new IPSConnector({
        baseUrl: connection.base_url,
        auth: connection.auth_credentials,
        scim: { version: '2.0' },
      });

      const isHealthy = await connector.healthCheck();

      return {
        name: `IPS - ${connection.base_url}`,
        type: 'IPS',
        status: isHealthy ? 'CONNECTED' : 'DISCONNECTED',
        lastHealthCheck: new Date(),
      };
    } catch (error: any) {
      logger.error('IPS connector check failed', { error: error.message });

      return {
        name: `IPS - ${connection.base_url}`,
        type: 'IPS',
        status: 'ERROR',
        lastHealthCheck: new Date(),
      };
    }
  }

  /**
   * Get system metrics
   */
  async getMetrics(): Promise<any> {
    const tenantCount = (await this.tenantRepo.getAllTenants()).length;
    const activeTenantCount = (await this.tenantRepo.getAllActiveTenants()).length;

    return {
      tenants: {
        total: tenantCount,
        active: activeTenantCount,
        inactive: tenantCount - activeTenantCount,
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(
    components: ComponentHealth[]
  ): 'HEALTHY' | 'DEGRADED' | 'DOWN' {
    const downCount = components.filter(c => c.status === 'DOWN').length;
    const degradedCount = components.filter(c => c.status === 'DEGRADED').length;

    if (downCount > 0) {
      return 'DOWN';
    } else if (degradedCount > 0) {
      return 'DEGRADED';
    } else {
      return 'HEALTHY';
    }
  }
}