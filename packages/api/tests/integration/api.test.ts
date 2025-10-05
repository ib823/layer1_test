// Set environment variables BEFORE any imports
process.env.AUTH_ENABLED = 'false';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/app';
import { TenantProfileRepository } from '@sap-framework/core';

// Mock the core module
jest.mock('@sap-framework/core', () => ({
  TenantProfileRepository: jest.fn().mockImplementation(() => ({
    getTenant: jest.fn(),
    getProfile: jest.fn(),
    createTenant: jest.fn(),
    saveSAPConnection: jest.fn(),
    getActiveModules: jest.fn(),
    activateModule: jest.fn(),
  })),
  SoDViolationRepository: jest.fn().mockImplementation(() => ({
    createAnalysisRun: jest.fn(),
    updateAnalysisRun: jest.fn(),
    getAnalysisRun: jest.fn(),
    listAnalysisRuns: jest.fn(),
    saveViolations: jest.fn(),
    getViolations: jest.fn(),
    updateViolationStatus: jest.fn(),
  })),
  EventBus: {
    getInstance: jest.fn(() => ({
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    })),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  MemoryCache: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  })),
  initializeEncryption: jest.fn().mockReturnValue({
    encrypt: jest.fn((data) => `encrypted_${data}`),
    decrypt: jest.fn((data) => data.replace('encrypted_', '')),
  }),
}));

// Mock the services module
jest.mock('@sap-framework/services', () => ({
  RuleEngine: jest.fn(),
  AnalyticsEngine: jest.fn(),
  WorkflowEngine: jest.fn(),
}));

// Mock the user-access-review module
jest.mock('@sap-framework/user-access-review', () => ({
  UserAccessReviewer: jest.fn(),
  STANDARD_SOD_RULES: [],
}));

describe('API Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    // Create app using the actual createApp function
    app = createApp();
  });

  describe('Health & Version Endpoints', () => {
    it('GET /api/health - should return healthy status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'healthy',
        },
      });
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
    });

    it('GET /api/version - should return version information', async () => {
      const response = await request(app).get('/api/version');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          version: '1.0.0',
          apiVersion: 'v1',
          framework: 'SAP MVP Framework',
        },
      });
    });
  });

  describe('Tenant Management Endpoints', () => {
    let mockRepository: jest.Mocked<TenantProfileRepository>;

    beforeEach(() => {
      mockRepository = new TenantProfileRepository('test-db') as jest.Mocked<TenantProfileRepository>;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('GET /api/admin/tenants/:tenantId - should return tenant details', async () => {
      const mockTenant = {
        id: '123',
        tenant_id: 'tenant-123',
        company_name: 'Acme Corp',
        status: 'ACTIVE' as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockProfile = {
        tenantId: 'tenant-123',
        sapVersion: 'S4_ON_PREM' as const,
        discoveredAt: new Date(),
        availableServices: [],
        customFields: [],
        capabilities: {
          canDoSoD: true,
          canDoInvoiceMatching: false,
          canDoAnomalyDetection: false,
          canDoInventoryOptimization: false,
          canDoExpenseAnalysis: false,
          customCapabilities: {},
        },
        missingServices: [],
        recommendedActions: [],
      };

      const mockModules = ['SoD_Analysis'];

      // Mock repository responses
      mockRepository.getTenant.mockResolvedValue(mockTenant);
      mockRepository.getProfile.mockResolvedValue(mockProfile);
      mockRepository.getActiveModules.mockResolvedValue(mockModules);

      const response = await request(app).get('/api/admin/tenants/tenant-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tenant');
      expect(response.body.data).toHaveProperty('profile');
      expect(response.body.data).toHaveProperty('activeModules');
    });

    it('GET /api/admin/tenants/:tenantId - should return 404 for non-existent tenant', async () => {
      mockRepository.getTenant.mockResolvedValue(null);
      mockRepository.getProfile.mockResolvedValue(null);
      mockRepository.getActiveModules.mockResolvedValue([]);

      const response = await request(app).get('/api/admin/tenants/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });

    it('POST /api/admin/tenants - should create a new tenant', async () => {
      const newTenant = {
        tenantId: 'tenant-456',
        companyName: 'New Corp',
        sapConnection: {
          baseUrl: 'https://sap.example.com',
          client: '100',
        },
      };

      const mockCreatedTenant = {
        id: '456',
        tenant_id: 'tenant-456',
        company_name: 'New Corp',
        status: 'ACTIVE' as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRepository.getTenant.mockResolvedValue(null); // Tenant doesn't exist
      mockRepository.createTenant.mockResolvedValue(mockCreatedTenant);
      mockRepository.saveSAPConnection.mockResolvedValue(undefined);

      const response = await request(app).post('/api/admin/tenants').send(newTenant);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tenant_id', 'tenant-456');
    });
  });

  describe('Authentication Tests', () => {
    let authApp: Application;

    beforeAll(() => {
      // Create a separate app with auth enabled
      const originalAuthEnabled = process.env.AUTH_ENABLED;
      process.env.AUTH_ENABLED = 'true';

      // Need to re-import routes with new config
      jest.resetModules();
      const { createApp: createAuthApp } = require('../../src/app');
      authApp = createAuthApp();

      process.env.AUTH_ENABLED = originalAuthEnabled;
    });

    it('should reject requests without Authorization header', async () => {
      const response = await request(authApp).get('/api/admin/tenants/test-tenant');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });

    it('should reject requests with invalid Authorization header format', async () => {
      const response = await request(authApp)
        .get('/api/admin/tenants/test-tenant')
        .set('Authorization', 'InvalidFormat token123');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should accept requests with valid JWT token (dev mode)', async () => {
      // Create a simple JWT token for testing (dev mode doesn't validate signature)
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'test-user',
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
          zid: 'test-tenant',
          scope: ['admin'],
        })
      ).toString('base64');
      const signature = 'fake-signature';
      const token = `${header}.${payload}.${signature}`;

      const mockRepository = new TenantProfileRepository('test-db') as jest.Mocked<TenantProfileRepository>;
      mockRepository.getTenant.mockResolvedValue({
        id: '123',
        tenant_id: 'test-tenant',
        company_name: 'Test Corp',
        status: 'ACTIVE' as const,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepository.getProfile.mockResolvedValue(null);
      mockRepository.getActiveModules.mockResolvedValue([]);

      const response = await request(authApp)
        .get('/api/admin/tenants/test-tenant')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should reject expired JWT tokens', async () => {
      // Create an expired JWT token
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'test-user',
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
          zid: 'test-tenant',
          scope: ['admin'],
        })
      ).toString('base64');
      const signature = 'fake-signature';
      const token = `${header}.${payload}.${signature}`;

      const response = await request(authApp)
        .get('/api/admin/tenants/test-tenant')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('message', 'Token expired');
    });
  });

  describe('CORS Tests', () => {
    it('should include CORS headers in responses', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON payloads', async () => {
      const response = await request(app)
        .post('/api/admin/tenants')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/non-existent-route');

      expect(response.status).toBe(404);
    });
  });
});
