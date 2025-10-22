/**
 * Base ERP Connector - Universal abstraction for all ERP systems
 *
 * Supports: SAP S/4HANA, Oracle Cloud/EBS, Microsoft Dynamics 365, NetSuite
 *
 * @module connectors/base
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';
import { FrameworkError } from '../../errors';
import { HealthCheckResult } from '../../types';

/**
 * Supported ERP Systems
 */
export type ERPSystem = 'SAP' | 'Oracle' | 'Dynamics' | 'NetSuite';

/**
 * ERP System Versions
 */
export interface ERPVersion {
  major: string;
  minor?: string;
  patch?: string;
  build?: string;
}

/**
 * Authentication configuration for ERP systems
 */
export interface ERPAuthConfig {
  provider: ERPSystem;
  type: 'OAUTH2' | 'BASIC' | 'CERTIFICATE' | 'TOKEN' | 'API_KEY';
  credentials: Record<string, unknown>;

  // OAuth2 endpoints (if applicable)
  endpoints?: {
    tokenUrl?: string;
    authUrl?: string;
    revokeUrl?: string;
    discoveryUrl?: string;
  };

  // Token configuration
  tokenRefresh?: {
    enabled: boolean;
    bufferTime?: number; // Refresh token N seconds before expiry
  };
}

/**
 * Base configuration for all ERP connectors
 */
export interface ERPConnectorConfig {
  erpSystem: ERPSystem;
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  auth: ERPAuthConfig;

  retry?: {
    maxRetries: number;
    baseDelay: number;
    maxDelay?: number;
    retryableStatuses?: number[];
  };

  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    successThreshold: number;
    resetTimeout: number;
  };

  // ERP-specific configuration
  erpSpecific?: Record<string, unknown>;
}

/**
 * User filter options (universal across all ERPs)
 */
export interface ERPUserFilter {
  activeOnly?: boolean;
  userIds?: string[];
  departmentIds?: string[];
  roleIds?: string[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

/**
 * Universal user representation
 */
export interface ERPUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  isActive: boolean;
  isLocked?: boolean;
  createdDate?: Date;
  lastModified?: Date;
  roles: ERPRole[];
  erpSystem: ERPSystem;

  // ERP-specific data stored as JSON
  erpSpecificData: Record<string, any>;
}

/**
 * Universal role representation
 */
export interface ERPRole {
  id: string;
  code: string;
  name: string;
  description?: string;
  type?: 'SYSTEM' | 'CUSTOM' | 'COMPOSITE';
  isActive: boolean;
  permissions: ERPPermission[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  erpSystem: ERPSystem;
  erpSpecificData: Record<string, any>;
}

/**
 * Universal permission representation
 */
export interface ERPPermission {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  erpSystem: ERPSystem;
  erpSpecificData: Record<string, any>;
}

/**
 * GL Entry filter
 */
export interface GLEntryFilter {
  fromDate?: Date;
  toDate?: Date;
  accountCodes?: string[];
  costCenters?: string[];
  companyCode?: string;
  documentTypes?: string[];
  userIds?: string[];
  amountRange?: { min: number; max: number };
  limit?: number;
  offset?: number;
}

/**
 * Universal GL Entry representation
 */
export interface ERPGLEntry {
  entryId: string;
  documentNumber: string;
  documentType?: string;
  postingDate: Date;
  documentDate?: Date;
  amount: number;
  currency: string;
  accountCode: string;
  accountName?: string;
  costCenter?: string;
  companyCode?: string;
  description?: string;
  reference?: string;
  userId: string;
  userName?: string;
  timestamp: Date;
  status?: string;
  erpSystem: ERPSystem;
  erpSpecificData: Record<string, any>;
}

/**
 * Invoice filter
 */
export interface InvoiceFilter {
  fromDate?: Date;
  toDate?: Date;
  vendorIds?: string[];
  statuses?: string[];
  documentNumbers?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Universal Invoice representation
 */
export interface ERPInvoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  vendorId: string;
  vendorName?: string;
  amount: number;
  taxAmount?: number;
  totalAmount: number;
  currency: string;
  paymentTerms?: string;
  dueDate?: Date;
  status: string;
  purchaseOrderNumber?: string;
  lineItems: ERPInvoiceLineItem[];
  erpSystem: ERPSystem;
  erpSpecificData: Record<string, any>;
}

/**
 * Invoice line item
 */
export interface ERPInvoiceLineItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxAmount?: number;
  accountCode?: string;
  costCenter?: string;
  erpSpecificData: Record<string, any>;
}

/**
 * Purchase Order filter
 */
export interface PurchaseOrderFilter {
  fromDate?: Date;
  toDate?: Date;
  vendorIds?: string[];
  statuses?: string[];
  poNumbers?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Universal Purchase Order representation
 */
export interface ERPPurchaseOrder {
  poId: string;
  poNumber: string;
  poDate: Date;
  vendorId: string;
  vendorName?: string;
  totalAmount: number;
  currency: string;
  deliveryDate?: Date;
  status: string;
  requester?: string;
  approver?: string;
  lineItems: ERPPOLineItem[];
  erpSystem: ERPSystem;
  erpSpecificData: Record<string, any>;
}

/**
 * Purchase Order line item
 */
export interface ERPPOLineItem {
  lineNumber: number;
  materialId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  deliveryDate?: Date;
  accountCode?: string;
  costCenter?: string;
  erpSpecificData: Record<string, any>;
}

/**
 * Vendor filter
 */
export interface VendorFilter {
  activeOnly?: boolean;
  vendorIds?: string[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

/**
 * Universal Vendor representation
 */
export interface ERPVendor {
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contactPerson?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  bankAccount?: {
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
  };
  isActive: boolean;
  isBlocked?: boolean;
  paymentTerms?: string;
  currency?: string;
  erpSystem: ERPSystem;
  erpSpecificData: Record<string, any>;
}

/**
 * Service catalog from ERP system
 */
export interface ServiceCatalog {
  erpSystem: ERPSystem;
  version: ERPVersion;
  discoveredAt: Date;
  services: ERPService[];
  capabilities: ERPCapability[];
}

/**
 * Individual service/API endpoint
 */
export interface ERPService {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  protocol: 'ODATA' | 'REST' | 'SOAP' | 'RFC' | 'SUITEQL';
  version?: string;
  isAvailable: boolean;
}

/**
 * System capability (for module activation)
 */
export interface ERPCapability {
  id: string;
  name: string;
  category: 'FINANCIAL' | 'PROCUREMENT' | 'HR' | 'SALES' | 'INVENTORY' | 'ANALYTICS';
  requiredServices: string[];
  isAvailable: boolean;
}

/**
 * Base ERP Connector - Abstract class for all ERP systems
 *
 * All ERP connectors (SAP, Oracle, Dynamics, NetSuite) must extend this class
 * and implement the abstract methods.
 */
export abstract class BaseERPConnector extends EventEmitter {
  protected client: AxiosInstance;
  protected tokenCache: { token: string; expiry: number } | null = null;

  constructor(protected config: ERPConnectorConfig) {
    super();

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getAuthToken();

        // Different ERPs use different auth headers
        const authHeader = this.getAuthHeaderName();
        config.headers[authHeader] = this.formatAuthToken(token);

        this.emit('request', {
          method: config.method,
          url: config.url,
          timestamp: Date.now(),
        });

        return config;
      },
      (error) => {
        this.emit('request-error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => {
        this.emit('response', {
          status: response.status,
          url: response.config.url,
          timestamp: Date.now(),
        });

        return response;
      },
      (error) => {
        const mappedError = this.mapError(error);
        this.emit('response-error', mappedError);

        // Retry logic if enabled
        if (this.shouldRetry(error)) {
          return this.retryRequest(error.config);
        }

        return Promise.reject(mappedError);
      }
    );
  }

  /**
   * Make HTTP request
   */
  protected async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }

  /**
   * Public method for external classes to make requests
   */
  public async executeRequest<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    return this.request<T>(config);
  }

  // ============================================
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ============================================

  /**
   * Get ERP system type
   */
  abstract getSystemType(): ERPSystem;

  /**
   * Get ERP system version
   */
  abstract getSystemVersion(): Promise<ERPVersion>;

  /**
   * Authenticate and get access token
   */
  protected abstract getAuthToken(): Promise<string>;

  /**
   * Get authorization header name (e.g., 'Authorization', 'X-Auth-Token')
   */
  protected abstract getAuthHeaderName(): string;

  /**
   * Format auth token for header (e.g., 'Bearer <token>', '<token>')
   */
  protected abstract formatAuthToken(token: string): string;

  /**
   * Map ERP-specific error to FrameworkError
   */
  protected abstract mapError(error: unknown): FrameworkError;

  /**
   * Health check
   */
  abstract healthCheck(): Promise<HealthCheckResult>;

  /**
   * Discover available services/APIs
   */
  abstract discoverServices(): Promise<ServiceCatalog>;

  // ============================================
  // USER & ROLE METHODS - Must be implemented
  // ============================================

  /**
   * Get users with filter
   */
  abstract getUsers(filter: ERPUserFilter): Promise<ERPUser[]>;

  /**
   * Get single user by ID
   */
  abstract getUserById(userId: string): Promise<ERPUser>;

  /**
   * Get user roles
   */
  abstract getUserRoles(userId: string): Promise<ERPRole[]>;

  /**
   * Get user permissions
   */
  abstract getUserPermissions(userId: string): Promise<ERPPermission[]>;

  /**
   * Get all available roles in the system
   */
  abstract getAllRoles(): Promise<ERPRole[]>;

  // ============================================
  // FINANCIAL DATA METHODS
  // ============================================

  /**
   * Get GL entries
   */
  abstract getGLEntries(filter: GLEntryFilter): Promise<ERPGLEntry[]>;

  /**
   * Get invoices
   */
  abstract getInvoices(filter: InvoiceFilter): Promise<ERPInvoice[]>;

  /**
   * Get purchase orders
   */
  abstract getPurchaseOrders(filter: PurchaseOrderFilter): Promise<ERPPurchaseOrder[]>;

  // ============================================
  // VENDOR/SUPPLIER METHODS
  // ============================================

  /**
   * Get vendors
   */
  abstract getVendors(filter: VendorFilter): Promise<ERPVendor[]>;

  /**
   * Get single vendor by ID
   */
  abstract getVendorById(vendorId: string): Promise<ERPVendor>;

  // ============================================
  // UTILITY METHODS - Common implementations
  // ============================================

  /**
   * Check if error should trigger retry
   */
  protected shouldRetry(error: any): boolean {
    if (!this.config.retry) return false;

    const status = error.response?.status;
    const retryableStatuses = this.config.retry.retryableStatuses || [408, 429, 500, 502, 503, 504];

    return retryableStatuses.includes(status);
  }

  /**
   * Retry failed request
   */
  protected async retryRequest<T>(config: AxiosRequestConfig, attempt: number = 0): Promise<T> {
    if (!this.config.retry || attempt >= this.config.retry.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    const delay = Math.min(
      this.config.retry.baseDelay * Math.pow(2, attempt),
      this.config.retry.maxDelay || 30000
    );

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      return await this.request<T>(config);
    } catch (error) {
      if (this.shouldRetry(error)) {
        return this.retryRequest<T>(config, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Check if token is expired
   */
  protected isTokenExpired(): boolean {
    if (!this.tokenCache) return true;

    const bufferTime = this.config.auth.tokenRefresh?.bufferTime || 300000; // 5 min default
    return Date.now() >= (this.tokenCache.expiry - bufferTime);
  }

  /**
   * Clear token cache
   */
  protected clearTokenCache(): void {
    this.tokenCache = null;
  }
}
