/**
 * API Client for Prism
 * Connects frontend to backend API
 */
import type { ApiResponse, FilterOptions } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'An error occurred',
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Tenant API
  async getTenant(tenantId: string) {
    return this.request(`/tenants/${tenantId}`);
  }

  async createTenant(companyName: string) {
    return this.request('/tenants', {
      method: 'POST',
      body: JSON.stringify({ company_name: companyName }),
    });
  }

  // SoD Violations API
  async getViolations(tenantId: string, filters?: FilterOptions) {
    const params = new URLSearchParams();
    if (filters?.riskLevel) params.append('riskLevel', filters.riskLevel);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.businessProcess) params.append('businessProcess', filters.businessProcess);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/tenants/${tenantId}/sod/violations${query}`);
  }

  async getViolationById(tenantId: string, violationId: string) {
    return this.request(`/tenants/${tenantId}/sod/violations/${violationId}`);
  }

  // Analysis API
  async runAnalysis(tenantId: string) {
    return this.request(`/tenants/${tenantId}/sod/analyze`, {
      method: 'POST',
    });
  }

  // Health Check
  async healthCheck() {
    return this.request('/health');
  }

  // Connector Status API
  async getConnectorStatus() {
    return this.request('/monitoring/connectors');
  }
}

export const api = new ApiClient();
export default api;
