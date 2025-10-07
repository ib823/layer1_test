/**
 * Authentication Service
 * Handles API calls for authentication
 */

import type { LoginCredentials, AuthResponse, User } from '@/types/auth';
import { getPermissionsForRoles, Role } from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class AuthService {
  private token: string | null = null;

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data: AuthResponse = await response.json();

      // Store token
      this.setToken(data.token);

      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken);
        }
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          return await this.refreshAndRetry();
        }
        throw new Error('Failed to get user');
      }

      const user: User = await response.json();

      // Ensure permissions are set based on roles
      if (!user.permissions || user.permissions.length === 0) {
        user.permissions = getPermissionsForRoles(user.roles);
      }

      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('refresh_token')
        : null;

      if (!refreshToken) return null;

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!response.ok) return null;

      const data = await response.json();
      this.setToken(data.token);

      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.token);
      }

      return data.token;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Development login (bypasses real authentication)
   */
  async devLogin(role: Role = Role.SYSTEM_ADMIN): Promise<AuthResponse> {
    // Mock user data for development
    const mockUser: User = {
      id: 'dev-user-123',
      email: 'dev@example.com',
      name: 'Development User',
      roles: [role],
      tenantId: 'dev-tenant',
      tenantName: 'Development Tenant',
      permissions: getPermissionsForRoles([role]),
      lastLogin: new Date(),
    };

    const mockResponse: AuthResponse = {
      user: mockUser,
      token: 'dev-token-' + Date.now(),
      expiresIn: 3600,
    };

    // Store mock token
    this.setToken(mockResponse.token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', mockResponse.token);
      localStorage.setItem('dev_user', JSON.stringify(mockUser));
    }

    return mockResponse;
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    if (this.token) return this.token;

    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }

    return this.token;
  }

  /**
   * Set token
   */
  private setToken(token: string): void {
    this.token = token;
  }

  /**
   * Clear authentication
   */
  private clearAuth(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('dev_user');
    }
  }

  /**
   * Get auth headers
   */
  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Refresh and retry request
   */
  private async refreshAndRetry(): Promise<User | null> {
    const newToken = await this.refreshToken();
    if (!newToken) {
      this.clearAuth();
      return null;
    }

    // Retry getting user
    return await this.getCurrentUser();
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
