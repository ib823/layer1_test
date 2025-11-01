import { Request } from 'express';

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Tenant Types
 */
export interface CreateTenantRequest {
  tenantId: string;
  companyName: string;
  sapConnection: {
    baseUrl: string;
    client?: string;
    auth: {
      provider: 'SAP' | 'Oracle' | 'Dynamics' | 'NetSuite';
      type: 'OAUTH2' | 'BASIC' | 'CERTIFICATE' | 'TOKEN' | 'API_KEY';
      credentials: any;
    };
  };
}

export interface UpdateTenantRequest {
  companyName?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

/**
 * Onboarding Types
 */
export interface OnboardingSession {
  id: string;
  tenantId: string;
  status: 'STARTED' | 'CONNECTION_TEST' | 'DISCOVERY' | 'COMPLETED' | 'FAILED';
  currentStep: number;
  totalSteps: number;
  steps: OnboardingStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingStep {
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
}

export interface ConnectionTestRequest {
  baseUrl: string;
  client?: string;
  auth: {
    provider: 'SAP' | 'Oracle' | 'Dynamics' | 'NetSuite';
    type: 'OAUTH2' | 'BASIC' | 'CERTIFICATE' | 'TOKEN' | 'API_KEY';
    credentials: any;
  };
}

/**
 * Module Types
 */
export interface ModuleActivationRequest {
  config?: Record<string, any>;
  reason?: string;
}

/**
 * Auth Types
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    roles?: string[];
    tenantId?: string;
  };
  // ✅ SECURITY FIX: Tenant filter for defense-in-depth
  tenantFilter?: {
    tenantId: string;
  };
}

/**
 * Monitoring Types
 */
export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  uptime: number;
  timestamp: Date;
  components: {
    database: ComponentHealth;
    connectors: ComponentHealth;
    api: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  message?: string;
  responseTime?: number;
  lastChecked: Date;
}

export interface ConnectorStatus {
  name: string;
  type: 'S4HANA' | 'IPS' | 'ARIBA' | 'SF' | 'CONCUR';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastHealthCheck?: Date;
  circuitBreaker?: {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    successCount: number;
  };
}