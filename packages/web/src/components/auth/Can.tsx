'use client';

/**
 * Permission-based rendering components
 * Show/hide components based on roles or permissions
 */

import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Role, Permission } from '@/types/auth';

interface CanProps {
  children: React.ReactNode;
  role?: Role | Role[];
  permission?: Permission | Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Conditionally render children based on role or permission
 */
export function Can({
  children,
  role,
  permission,
  requireAll = false,
  fallback = null,
}: CanProps) {
  const { hasRole, hasPermission, hasAllRoles } = useAuth();

  let hasAccess = false;

  if (role) {
    if (Array.isArray(role)) {
      hasAccess = requireAll ? hasAllRoles(role) : hasRole(role);
    } else {
      hasAccess = hasRole(role);
    }
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else {
    // No role or permission specified, allow access
    hasAccess = true;
  }

  return <>{hasAccess ? children : fallback}</>;
}

/**
 * Inverse of Can - render when user CANNOT access
 */
export function Cannot({
  children,
  role,
  permission,
  requireAll = false,
}: Omit<CanProps, 'fallback'>) {
  const { hasRole, hasPermission, hasAllRoles } = useAuth();

  let hasAccess = false;

  if (role) {
    if (Array.isArray(role)) {
      hasAccess = requireAll ? hasAllRoles(role) : hasRole(role);
    } else {
      hasAccess = hasRole(role);
    }
  } else if (permission) {
    hasAccess = hasPermission(permission);
  }

  return <>{!hasAccess ? children : null}</>;
}

/**
 * Show different content based on role
 */
interface RoleSwitchProps {
  children: React.ReactNode;
}

export function RoleSwitch({ children }: RoleSwitchProps) {
  const { user } = useAuth();

  if (!user) return null;

  // Find first matching RoleCase
  const childArray = React.Children.toArray(children);
  for (const child of childArray) {
    if (React.isValidElement(child) && child.type === RoleCase) {
      const roles = child.props.roles as Role[];
      if (roles.some(role => user.roles.includes(role))) {
        return <>{child.props.children}</>;
      }
    }
  }

  // Return default case if exists
  for (const child of childArray) {
    if (React.isValidElement(child) && child.props.default) {
      return <>{child.props.children}</>;
    }
  }

  return null;
}

interface RoleCaseProps {
  roles: Role[];
  children: React.ReactNode;
  default?: boolean;
}

export function RoleCase({ children }: RoleCaseProps) {
  return <>{children}</>;
}
