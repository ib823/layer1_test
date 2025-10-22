import { 
  TenantProfileRepository,
  S4HANAConnector,
  ServiceDiscovery 
} from '@sap-framework/core';
import {
  OnboardingSession,
  ConnectionTestRequest
} from '../types';
import logger from '../utils/logger';

export class OnboardingService {
  private sessions: Map<string, OnboardingSession> = new Map();

  constructor(private tenantRepo: TenantProfileRepository) {}

  /**
   * Start new onboarding session
   */
  async startOnboarding(tenantId: string, _companyName: string): Promise<OnboardingSession> {
    const sessionId = `onboarding-${tenantId}-${Date.now()}`;

    const session: OnboardingSession = {
      id: sessionId,
      tenantId,
      status: 'STARTED',
      currentStep: 0,
      totalSteps: 4,
      steps: [
        { name: 'Tenant Creation', status: 'PENDING' },
        { name: 'Connection Test', status: 'PENDING' },
        { name: 'Service Discovery', status: 'PENDING' },
        { name: 'Module Activation', status: 'PENDING' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    logger.info('Onboarding session started', { sessionId, tenantId });

    return session;
  }

  /**
   * Test SAP connection
   */
  async testConnection(
    sessionId: string,
    connectionData: ConnectionTestRequest
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Onboarding session not found');
    }

    try {
      session.steps[1].status = 'IN_PROGRESS';
      session.updatedAt = new Date();

      logger.info('Testing SAP connection', { sessionId });

      // Create test connector
      const connector = new S4HANAConnector({
        erpSystem: 'SAP',
        baseUrl: connectionData.baseUrl,
        auth: connectionData.auth,
      });

      // Test connection
      const isHealthy = await connector.healthCheck();

      if (isHealthy) {
        session.steps[1].status = 'COMPLETED';
        session.steps[1].result = { connected: true };
        session.currentStep = 1;

        logger.info('Connection test successful', { sessionId });

        return {
          success: true,
          message: 'Successfully connected to SAP system',
        };
      } else {
        throw new Error('Health check failed');
      }
    } catch (error: any) {
      session.steps[1].status = 'FAILED';
      session.steps[1].error = error.message;

      logger.error('Connection test failed', { sessionId, error: error.message });

      return {
        success: false,
        message: 'Failed to connect to SAP system',
        details: error.message,
      };
    }
  }

  /**
   * Run service discovery
   */
  async runDiscovery(
    sessionId: string,
    connectionData: ConnectionTestRequest
  ): Promise<{ success: boolean; profile?: any; errors?: string[] }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Onboarding session not found');
    }

    try {
      session.steps[2].status = 'IN_PROGRESS';
      session.updatedAt = new Date();

      logger.info('Running service discovery', { sessionId });

      const connector = new S4HANAConnector({
        erpSystem: 'SAP',
        baseUrl: connectionData.baseUrl,
        auth: connectionData.auth,
      });

      const discovery = new ServiceDiscovery(connector as any);
      const result = await discovery.discoverServices();

      if (!result.success) {
        throw new Error(`Discovery failed: ${result.errors.join(', ')}`);
      }

      const profile = await discovery.generateTenantProfile(session.tenantId);

      session.steps[2].status = 'COMPLETED';
      session.steps[2].result = { servicesFound: result.services.length, profile };
      session.currentStep = 2;

      logger.info('Service discovery completed', {
        sessionId,
        servicesFound: result.services.length,
      });

      return {
        success: true,
        profile,
      };
    } catch (error: any) {
      session.steps[2].status = 'FAILED';
      session.steps[2].error = error.message;

      logger.error('Service discovery failed', { sessionId, error: error.message });

      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(
    sessionId: string,
    sapConnection: any
  ): Promise<{ success: boolean; tenant?: any }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Onboarding session not found');
    }

    try {
      session.steps[3].status = 'IN_PROGRESS';
      session.updatedAt = new Date();

      logger.info('Completing onboarding', { sessionId });

      // Get profile from discovery step
      const profile = session.steps[2].result?.profile;
      if (!profile) {
        throw new Error('Service discovery not completed');
      }

      // Save tenant
      const tenant = await this.tenantRepo.getTenant(session.tenantId);
      
      // Save SAP connection
      await this.tenantRepo.saveSAPConnection(session.tenantId, sapConnection);

      // Save profile
      await this.tenantRepo.saveProfile(profile);

      // Auto-activate modules based on capabilities
      if (profile.capabilities.canDoSoD) {
        await this.tenantRepo.activateModule(
          session.tenantId,
          'SoD_Analysis',
          'Auto-activated during onboarding'
        );
      }

      session.steps[3].status = 'COMPLETED';
      session.status = 'COMPLETED';
      session.currentStep = 3;
      session.updatedAt = new Date();

      logger.info('Onboarding completed successfully', { sessionId });

      return {
        success: true,
        tenant,
      };
    } catch (error: any) {
      session.steps[3].status = 'FAILED';
      session.steps[3].error = error.message;
      session.status = 'FAILED';

      logger.error('Onboarding completion failed', { sessionId, error: error.message });

      return {
        success: false,
      };
    }
  }

  /**
   * Get onboarding status
   */
  getStatus(sessionId: string): OnboardingSession | undefined {
    return this.sessions.get(sessionId);
  }
}