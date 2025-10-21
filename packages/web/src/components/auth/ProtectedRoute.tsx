'use client';

/**
 * Protected Route Component
 * Wraps routes that require authentication and/or specific roles
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin, Result, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Role } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requireAll?: boolean; // Require all roles vs any role
  fallbackUrl?: string;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireAll = false,
  fallbackUrl,
  loadingComponent,
  unauthorizedComponent,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasAnyRole, hasAllRoles } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // Check role authorization
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRoles = requireAll
      ? hasAllRoles(allowedRoles)
      : hasAnyRole(allowedRoles);

    if (!hasRequiredRoles) {
      if (unauthorizedComponent) {
        return <>{unauthorizedComponent}</>;
      }

      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}>
          <Result
            status="403"
            title="403"
            subTitle="Sorry, you are not authorized to access this page."
            icon={<LockOutlined />}
            extra={[
              <Button
                type="primary"
                key="home"
                onClick={() => router.push(fallbackUrl || '/dashboard')}
              >
                Go to Dashboard
              </Button>,
              <Button
                key="back"
                onClick={() => router.back()}
              >
                Go Back
              </Button>
            ]}
          />
        </div>
      );
    }
  }

  return <>{children}</>;
}

/**
 * HOC version for wrapping pages
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
