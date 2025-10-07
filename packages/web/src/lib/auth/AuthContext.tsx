'use client';

/**
 * Authentication Context Provider
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthContextType, User, LoginCredentials } from '@/types/auth';
import { Role, Permission, matchesPermission } from '@/types/auth';
import { authService } from './authService';
import { message } from 'antd';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      // Get current user
      const currentUser = await authService.getCurrentUser();

      if (currentUser) {
        setUser(currentUser);
      } else {
        // Token invalid or expired
        await authService.logout();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);

      // Check if in development mode
      const isDev = process.env.NODE_ENV === 'development' &&
                    process.env.NEXT_PUBLIC_DEV_MODE === 'true';

      let authResponse;

      if (isDev) {
        // Development login
        message.info('Using development authentication');
        authResponse = await authService.devLogin(Role.SYSTEM_ADMIN);
      } else {
        // Production login
        authResponse = await authService.login(credentials);
      }

      setUser(authResponse.user);
      message.success(`Welcome back, ${authResponse.user.name}!`);

      // Redirect based on role
      redirectAfterLogin(authResponse.user);
    } catch (error: any) {
      message.error(error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      message.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      message.error('Logout failed');
    }
  };

  const refreshAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Refresh auth error:', error);
      await logout();
    }
  };

  const hasRole = useCallback((role: Role | Role[]): boolean => {
    if (!user) return false;

    const roles = Array.isArray(role) ? role : [role];
    return roles.some(r => user.roles.includes(r));
  }, [user]);

  const hasPermission = useCallback((permission: Permission | Permission[]): boolean => {
    if (!user) return false;

    const permissions = Array.isArray(permission) ? permission : [permission];

    return permissions.some(reqPerm =>
      user.permissions.some(userPerm =>
        matchesPermission(userPerm, reqPerm)
      )
    );
  }, [user]);

  const hasAnyRole = useCallback((roles: Role[]): boolean => {
    if (!user) return false;
    return roles.some(role => user.roles.includes(role));
  }, [user]);

  const hasAllRoles = useCallback((roles: Role[]): boolean => {
    if (!user) return false;
    return roles.every(role => user.roles.includes(role));
  }, [user]);

  const redirectAfterLogin = (user: User) => {
    // Redirect based on primary role
    const primaryRole = user.roles[0];

    switch (primaryRole) {
      case Role.SYSTEM_ADMIN:
        router.push('/admin/dashboard');
        break;
      case Role.TENANT_ADMIN:
        router.push('/dashboard');
        break;
      case Role.COMPLIANCE_MANAGER:
        router.push('/violations');
        break;
      case Role.AUDITOR:
        router.push('/analytics');
        break;
      case Role.USER:
        router.push('/profile');
        break;
      default:
        router.push('/dashboard');
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshAuth,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllRoles,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
