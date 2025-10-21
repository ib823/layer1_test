/**
 * Authentication and Authorization Types
 */

export enum Role {
  SYSTEM_ADMIN = 'system_admin',
  TENANT_ADMIN = 'tenant_admin',
  COMPLIANCE_MANAGER = 'compliance_manager',
  AUDITOR = 'auditor',
  USER = 'user',
}

export enum Permission {
  // System permissions
  SYSTEM_ALL = 'system:*',

  // Tenant permissions
  TENANT_MANAGE = 'tenant:manage',
  TENANTS_ALL = 'tenants:*',

  // User permissions
  USERS_VIEW = 'users:view',
  USERS_MANAGE = 'users:manage',
  USERS_ALL = 'users:*',

  // SoD permissions
  SOD_RUN = 'sod:run',
  SOD_VIEW = 'sod:view',

  // Violations permissions
  VIOLATIONS_VIEW = 'violations:view',
  VIOLATIONS_VIEW_OWN = 'violations:view-own',
  VIOLATIONS_REMEDIATE = 'violations:remediate',

  // Reports permissions
  REPORTS_GENERATE = 'reports:generate',
  REPORTS_EXPORT = 'reports:export',

  // Analytics permissions
  ANALYTICS_VIEW = 'analytics:view',

  // Connector permissions
  CONNECTORS_ALL = 'connectors:*',

  // Settings permissions
  SETTINGS_ALL = 'settings:*',
  SETTINGS_VIEW = 'settings:view',

  // Profile permissions
  PROFILE_VIEW = 'profile:view',
  PROFILE_UPDATE = 'profile:update',

  // Access request permissions
  ACCESS_REQUEST = 'access:request',

  // Audit log permissions
  AUDIT_LOG = 'audit:log',
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  tenantId: string;
  tenantName?: string;
  permissions: Permission[];
  avatar?: string;
  lastLogin?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasRole: (role: Role | Role[]) => boolean;
  hasPermission: (permission: Permission | Permission[]) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  hasAllRoles: (roles: Role[]) => boolean;
}

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SYSTEM_ADMIN]: [
    Permission.SYSTEM_ALL,
    Permission.TENANTS_ALL,
    Permission.USERS_ALL,
    Permission.CONNECTORS_ALL,
    Permission.SETTINGS_ALL,
    Permission.SOD_RUN,
    Permission.SOD_VIEW,
    Permission.VIOLATIONS_VIEW,
    Permission.VIOLATIONS_REMEDIATE,
    Permission.REPORTS_GENERATE,
    Permission.REPORTS_EXPORT,
    Permission.ANALYTICS_VIEW,
    Permission.AUDIT_LOG,
    Permission.PROFILE_VIEW,
    Permission.PROFILE_UPDATE,
  ],
  [Role.TENANT_ADMIN]: [
    Permission.TENANT_MANAGE,
    Permission.USERS_MANAGE,
    Permission.SOD_RUN,
    Permission.SOD_VIEW,
    Permission.VIOLATIONS_VIEW,
    Permission.VIOLATIONS_REMEDIATE,
    Permission.REPORTS_GENERATE,
    Permission.REPORTS_EXPORT,
    Permission.ANALYTICS_VIEW,
    Permission.SETTINGS_VIEW,
    Permission.PROFILE_VIEW,
    Permission.PROFILE_UPDATE,
  ],
  [Role.COMPLIANCE_MANAGER]: [
    Permission.VIOLATIONS_VIEW,
    Permission.VIOLATIONS_REMEDIATE,
    Permission.USERS_VIEW,
    Permission.REPORTS_GENERATE,
    Permission.REPORTS_EXPORT,
    Permission.ANALYTICS_VIEW,
    Permission.PROFILE_VIEW,
    Permission.PROFILE_UPDATE,
  ],
  [Role.AUDITOR]: [
    Permission.VIOLATIONS_VIEW,
    Permission.USERS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.ANALYTICS_VIEW,
    Permission.AUDIT_LOG,
    Permission.PROFILE_VIEW,
  ],
  [Role.USER]: [
    Permission.VIOLATIONS_VIEW_OWN,
    Permission.PROFILE_VIEW,
    Permission.PROFILE_UPDATE,
    Permission.ACCESS_REQUEST,
  ],
};

// Helper to get permissions for roles
export function getPermissionsForRoles(roles: Role[]): Permission[] {
  const permissions = new Set<Permission>();
  roles.forEach(role => {
    ROLE_PERMISSIONS[role]?.forEach(permission => permissions.add(permission));
  });
  return Array.from(permissions);
}

// Check if permission matches pattern
export function matchesPermission(userPermission: Permission, requiredPermission: Permission): boolean {
  const userParts = userPermission.split(':');
  const requiredParts = requiredPermission.split(':');

  // Exact match
  if (userPermission === requiredPermission) return true;

  // Wildcard match (e.g., "users:*" matches "users:view")
  if (userParts[0] === requiredParts[0] && userParts[1] === '*') return true;

  // System admin wildcard
  if (userPermission === Permission.SYSTEM_ALL) return true;

  return false;
}
