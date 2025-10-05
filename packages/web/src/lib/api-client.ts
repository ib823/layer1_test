/**
 * API Client wrapper for React Query
 * Provides a simpler interface for hooks
 */
import { api } from './api';

interface ApiClientResponse<T = unknown> {
  data: T;
}

export const apiClient = {
  get: async <T = unknown>(endpoint: string): Promise<ApiClientResponse<T>> => {
    const response = await api.request<T>(endpoint);
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return { data: response.data as T };
  },

  post: async <T = unknown>(endpoint: string, data?: unknown): Promise<ApiClientResponse<T>> => {
    const response = await api.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return { data: response.data as T };
  },

  put: async <T = unknown>(endpoint: string, data?: unknown): Promise<ApiClientResponse<T>> => {
    const response = await api.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return { data: response.data as T };
  },

  delete: async <T = unknown>(endpoint: string): Promise<ApiClientResponse<T>> => {
    const response = await api.request<T>(endpoint, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return { data: response.data as T };
  },
};
