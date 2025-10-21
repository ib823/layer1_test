/**
 * Comprehensive Test Data Factory
 * Generates all permutations of users, roles, tenants, and workflows
 */

import { faker } from '@faker-js/faker';

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  COMPLIANCE_OFFICER = 'compliance_officer',
  AUDITOR = 'auditor',
  FINANCE_MANAGER = 'finance_manager',
  FINANCE_USER = 'finance_user',
  PROCUREMENT_MANAGER = 'procurement_manager',
  PROCUREMENT_USER = 'procurement_user',
  HR_MANAGER = 'hr_manager',
  HR_USER = 'hr_user',
  READ_ONLY_USER = 'read_only_user',
  GUEST = 'guest',
}

export enum Permission {
  // Tenant Management
  CREATE_TENANT = 'tenant:create',
  READ_TENANT = 'tenant:read',
  UPDATE_TENANT = 'tenant:update',
  DELETE_TENANT = 'tenant:delete',

  // User Management
  CREATE_USER = 'user:create',
  READ_USER = 'user:read',
  UPDATE_USER = 'user:update',
  DELETE_USER = 'user:delete',
  ASSIGN_ROLES = 'user:assign_roles',

  // Module Access
  ACCESS_SOD = 'module:sod',
  ACCESS_LHDN = 'module:lhdn',
  ACCESS_INVOICE_MATCHING = 'module:invoice_matching',
  ACCESS_GL_ANOMALY = 'module:gl_anomaly',
  ACCESS_VENDOR_QUALITY = 'module:vendor_quality',
  ACCESS_USER_ACCESS_REVIEW = 'module:user_access_review',

  // Module Operations
  RUN_ANALYSIS = 'operation:run_analysis',
  VIEW_RESULTS = 'operation:view_results',
  EXPORT_DATA = 'operation:export',
  CONFIGURE_MODULE = 'operation:configure',
  APPROVE_FINDINGS = 'operation:approve',
  REJECT_FINDINGS = 'operation:reject',

  // Audit Trail
  VIEW_AUDIT_LOG = 'audit:view',
  EXPORT_AUDIT_LOG = 'audit:export',
}

// Role Permission Matrix
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),

  [UserRole.TENANT_ADMIN]: [
    Permission.READ_TENANT,
    Permission.UPDATE_TENANT,
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.ASSIGN_ROLES,
    ...Object.values(Permission).filter(p => p.startsWith('module:')),
    ...Object.values(Permission).filter(p => p.startsWith('operation:')),
    Permission.VIEW_AUDIT_LOG,
    Permission.EXPORT_AUDIT_LOG,
  ],

  [UserRole.COMPLIANCE_OFFICER]: [
    Permission.READ_TENANT,
    Permission.READ_USER,
    Permission.ACCESS_SOD,
    Permission.ACCESS_USER_ACCESS_REVIEW,
    Permission.RUN_ANALYSIS,
    Permission.VIEW_RESULTS,
    Permission.EXPORT_DATA,
    Permission.APPROVE_FINDINGS,
    Permission.REJECT_FINDINGS,
    Permission.VIEW_AUDIT_LOG,
  ],

  [UserRole.AUDITOR]: [
    Permission.READ_TENANT,
    Permission.READ_USER,
    ...Object.values(Permission).filter(p => p.startsWith('module:')),
    Permission.VIEW_RESULTS,
    Permission.EXPORT_DATA,
    Permission.VIEW_AUDIT_LOG,
    Permission.EXPORT_AUDIT_LOG,
  ],

  [UserRole.FINANCE_MANAGER]: [
    Permission.READ_TENANT,
    Permission.ACCESS_INVOICE_MATCHING,
    Permission.ACCESS_GL_ANOMALY,
    Permission.ACCESS_VENDOR_QUALITY,
    Permission.ACCESS_LHDN,
    Permission.RUN_ANALYSIS,
    Permission.VIEW_RESULTS,
    Permission.EXPORT_DATA,
    Permission.CONFIGURE_MODULE,
    Permission.APPROVE_FINDINGS,
  ],

  [UserRole.FINANCE_USER]: [
    Permission.ACCESS_INVOICE_MATCHING,
    Permission.ACCESS_GL_ANOMALY,
    Permission.ACCESS_LHDN,
    Permission.VIEW_RESULTS,
  ],

  [UserRole.PROCUREMENT_MANAGER]: [
    Permission.READ_TENANT,
    Permission.ACCESS_INVOICE_MATCHING,
    Permission.ACCESS_VENDOR_QUALITY,
    Permission.RUN_ANALYSIS,
    Permission.VIEW_RESULTS,
    Permission.EXPORT_DATA,
    Permission.CONFIGURE_MODULE,
  ],

  [UserRole.PROCUREMENT_USER]: [
    Permission.ACCESS_INVOICE_MATCHING,
    Permission.ACCESS_VENDOR_QUALITY,
    Permission.VIEW_RESULTS,
  ],

  [UserRole.HR_MANAGER]: [
    Permission.READ_TENANT,
    Permission.ACCESS_USER_ACCESS_REVIEW,
    Permission.RUN_ANALYSIS,
    Permission.VIEW_RESULTS,
    Permission.EXPORT_DATA,
    Permission.CONFIGURE_MODULE,
  ],

  [UserRole.HR_USER]: [
    Permission.ACCESS_USER_ACCESS_REVIEW,
    Permission.VIEW_RESULTS,
  ],

  [UserRole.READ_ONLY_USER]: [
    Permission.READ_TENANT,
    Permission.READ_USER,
    ...Object.values(Permission).filter(p => p.startsWith('module:')),
    Permission.VIEW_RESULTS,
  ],

  [UserRole.GUEST]: [
    Permission.READ_TENANT,
  ],
};

// ============================================================================
// TEST USER FACTORY
// ============================================================================

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  roles: UserRole[];
  tenantId: string;
  isActive: boolean;
  metadata: {
    department?: string;
    employeeId?: string;
    phone?: string;
  };
}

export class UserFactory {
  static create(overrides?: Partial<TestUser>): TestUser {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      password: 'Test1234!@#$', // Standard test password
      name: faker.person.fullName(),
      roles: [UserRole.READ_ONLY_USER],
      tenantId: faker.string.uuid(),
      isActive: true,
      metadata: {
        department: faker.commerce.department(),
        employeeId: faker.string.alphanumeric(8).toUpperCase(),
        phone: faker.phone.number(),
      },
      ...overrides,
    };
  }

  static createWithRole(role: UserRole, tenantId?: string): TestUser {
    return this.create({
      roles: [role],
      tenantId: tenantId || faker.string.uuid(),
      email: `${role.toLowerCase()}@test.local`,
    });
  }

  static createBatch(count: number, baseRole: UserRole): TestUser[] {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        roles: [baseRole],
        email: `${baseRole.toLowerCase()}.${i + 1}@test.local`,
      })
    );
  }
}

// ============================================================================
// TEST TENANT FACTORY
// ============================================================================

export interface TestTenant {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending_deletion';
  settings: {
    enabledModules: string[];
    sapConnection: {
      baseUrl: string;
      clientId: string;
      clientSecret: string;
    };
    features: {
      multiFactorAuth: boolean;
      ssoEnabled: boolean;
      auditLogRetentionDays: number;
    };
  };
  createdAt: Date;
  metadata: Record<string, any>;
}

export class TenantFactory {
  static create(overrides?: Partial<TestTenant>): TestTenant {
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      domain: faker.internet.domainName(),
      status: 'active',
      settings: {
        enabledModules: [
          'sod-control',
          'invoice-matching',
          'gl-anomaly-detection',
          'vendor-data-quality',
        ],
        sapConnection: {
          baseUrl: faker.internet.url(),
          clientId: faker.string.uuid(),
          clientSecret: faker.string.alphanumeric(32),
        },
        features: {
          multiFactorAuth: true,
          ssoEnabled: false,
          auditLogRetentionDays: 90,
        },
      },
      createdAt: new Date(),
      metadata: {},
      ...overrides,
    };
  }

  static createWithModules(modules: string[]): TestTenant {
    return this.create({
      settings: {
        ...this.create().settings,
        enabledModules: modules,
      },
    });
  }
}

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

export enum WorkflowType {
  // User Lifecycle
  USER_REGISTRATION = 'user_registration',
  USER_LOGIN = 'user_login',
  USER_PROFILE_UPDATE = 'user_profile_update',
  USER_PASSWORD_CHANGE = 'user_password_change',
  USER_ROLE_CHANGE = 'user_role_change',
  USER_DEACTIVATION = 'user_deactivation',
  USER_DELETION = 'user_deletion',

  // Tenant Lifecycle
  TENANT_ONBOARDING = 'tenant_onboarding',
  TENANT_CONFIGURATION = 'tenant_configuration',
  TENANT_MODULE_ENABLE = 'tenant_module_enable',
  TENANT_MODULE_DISABLE = 'tenant_module_disable',
  TENANT_SUSPENSION = 'tenant_suspension',
  TENANT_DELETION = 'tenant_deletion',

  // Module Workflows - SoD Control
  SOD_RUN_ANALYSIS = 'sod_run_analysis',
  SOD_VIEW_VIOLATIONS = 'sod_view_violations',
  SOD_APPROVE_VIOLATION = 'sod_approve_violation',
  SOD_REJECT_VIOLATION = 'sod_reject_violation',
  SOD_EXPORT_REPORT = 'sod_export_report',
  SOD_CONFIGURE_RULES = 'sod_configure_rules',

  // Module Workflows - Invoice Matching
  INVOICE_RUN_MATCHING = 'invoice_run_matching',
  INVOICE_VIEW_MISMATCHES = 'invoice_view_mismatches',
  INVOICE_INVESTIGATE_FRAUD = 'invoice_investigate_fraud',
  INVOICE_APPROVE_MATCH = 'invoice_approve_match',
  INVOICE_EXPORT_RESULTS = 'invoice_export_results',

  // Module Workflows - GL Anomaly Detection
  GL_RUN_DETECTION = 'gl_run_detection',
  GL_VIEW_ANOMALIES = 'gl_view_anomalies',
  GL_MARK_FALSE_POSITIVE = 'gl_mark_false_positive',
  GL_EXPORT_ANOMALIES = 'gl_export_anomalies',

  // Module Workflows - LHDN e-Invoice
  LHDN_SUBMIT_INVOICE = 'lhdn_submit_invoice',
  LHDN_CHECK_STATUS = 'lhdn_check_status',
  LHDN_CANCEL_INVOICE = 'lhdn_cancel_invoice',
  LHDN_VIEW_EXCEPTIONS = 'lhdn_view_exceptions',
  LHDN_CONFIGURE_SETTINGS = 'lhdn_configure_settings',

  // Module Workflows - Vendor Data Quality
  VENDOR_RUN_DEDUP = 'vendor_run_dedup',
  VENDOR_VIEW_DUPLICATES = 'vendor_view_duplicates',
  VENDOR_MERGE_VENDORS = 'vendor_merge_vendors',
  VENDOR_EXPORT_REPORT = 'vendor_export_report',

  // Module Workflows - User Access Review
  UAR_RUN_REVIEW = 'uar_run_review',
  UAR_VIEW_VIOLATIONS = 'uar_view_violations',
  UAR_REMEDIATE_ACCESS = 'uar_remediate_access',
  UAR_EXPORT_REPORT = 'uar_export_report',
}

export interface WorkflowStep {
  name: string;
  action: string;
  requiredPermissions: Permission[];
  data?: any;
}

export interface TestWorkflow {
  type: WorkflowType;
  steps: WorkflowStep[];
  requiredRole: UserRole;
  expectedOutcome: 'success' | 'unauthorized' | 'forbidden' | 'error';
}

// ============================================================================
// COMBINATORIAL TEST GENERATOR
// ============================================================================

export class CombinatorialTestGenerator {
  /**
   * Generate all role × workflow permutations
   */
  static generateRoleWorkflowPermutations(): Array<{
    role: UserRole;
    workflow: WorkflowType;
    shouldSucceed: boolean;
  }> {
    const roles = Object.values(UserRole);
    const workflows = Object.values(WorkflowType);
    const permutations: Array<{
      role: UserRole;
      workflow: WorkflowType;
      shouldSucceed: boolean;
    }> = [];

    for (const role of roles) {
      for (const workflow of workflows) {
        const shouldSucceed = this.canRoleExecuteWorkflow(role, workflow);
        permutations.push({ role, workflow, shouldSucceed });
      }
    }

    return permutations;
  }

  /**
   * Generate user lifecycle permutations
   * Registration → Login → Operations → Deactivation → Deletion
   */
  static generateUserLifecyclePermutations(): Array<{
    role: UserRole;
    lifecycle: WorkflowType[];
    tenant: TestTenant;
  }> {
    const roles = Object.values(UserRole);
    const lifecycles: Array<{
      role: UserRole;
      lifecycle: WorkflowType[];
      tenant: TestTenant;
    }> = [];

    for (const role of roles) {
      const tenant = TenantFactory.create();
      lifecycles.push({
        role,
        lifecycle: [
          WorkflowType.USER_REGISTRATION,
          WorkflowType.USER_LOGIN,
          WorkflowType.USER_PROFILE_UPDATE,
          WorkflowType.USER_PASSWORD_CHANGE,
          WorkflowType.USER_DEACTIVATION,
          WorkflowType.USER_DELETION,
        ],
        tenant,
      });
    }

    return lifecycles;
  }

  /**
   * Generate tenant lifecycle permutations
   */
  static generateTenantLifecyclePermutations(): Array<{
    adminRole: UserRole;
    lifecycle: WorkflowType[];
    enabledModules: string[];
  }> {
    const adminRoles = [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN];
    const modulePermutations = [
      ['sod-control'],
      ['invoice-matching'],
      ['sod-control', 'invoice-matching'],
      ['sod-control', 'invoice-matching', 'gl-anomaly-detection'],
      ['sod-control', 'invoice-matching', 'gl-anomaly-detection', 'vendor-data-quality'],
      ['sod-control', 'invoice-matching', 'gl-anomaly-detection', 'vendor-data-quality', 'lhdn-einvoice'],
    ];

    const permutations: Array<{
      adminRole: UserRole;
      lifecycle: WorkflowType[];
      enabledModules: string[];
    }> = [];

    for (const adminRole of adminRoles) {
      for (const modules of modulePermutations) {
        permutations.push({
          adminRole,
          lifecycle: [
            WorkflowType.TENANT_ONBOARDING,
            WorkflowType.TENANT_CONFIGURATION,
            ...modules.map(() => WorkflowType.TENANT_MODULE_ENABLE),
            WorkflowType.TENANT_SUSPENSION,
            WorkflowType.TENANT_DELETION,
          ],
          enabledModules: modules,
        });
      }
    }

    return permutations;
  }

  /**
   * Generate module operation permutations
   */
  static generateModuleOperationPermutations(): Array<{
    role: UserRole;
    module: string;
    operations: WorkflowType[];
    shouldSucceed: boolean;
  }> {
    const moduleWorkflows = {
      'sod-control': [
        WorkflowType.SOD_RUN_ANALYSIS,
        WorkflowType.SOD_VIEW_VIOLATIONS,
        WorkflowType.SOD_APPROVE_VIOLATION,
        WorkflowType.SOD_EXPORT_REPORT,
      ],
      'invoice-matching': [
        WorkflowType.INVOICE_RUN_MATCHING,
        WorkflowType.INVOICE_VIEW_MISMATCHES,
        WorkflowType.INVOICE_INVESTIGATE_FRAUD,
        WorkflowType.INVOICE_EXPORT_RESULTS,
      ],
      'gl-anomaly-detection': [
        WorkflowType.GL_RUN_DETECTION,
        WorkflowType.GL_VIEW_ANOMALIES,
        WorkflowType.GL_EXPORT_ANOMALIES,
      ],
      'vendor-data-quality': [
        WorkflowType.VENDOR_RUN_DEDUP,
        WorkflowType.VENDOR_VIEW_DUPLICATES,
        WorkflowType.VENDOR_MERGE_VENDORS,
      ],
      'lhdn-einvoice': [
        WorkflowType.LHDN_SUBMIT_INVOICE,
        WorkflowType.LHDN_CHECK_STATUS,
        WorkflowType.LHDN_VIEW_EXCEPTIONS,
      ],
      'user-access-review': [
        WorkflowType.UAR_RUN_REVIEW,
        WorkflowType.UAR_VIEW_VIOLATIONS,
        WorkflowType.UAR_EXPORT_REPORT,
      ],
    };

    const roles = Object.values(UserRole);
    const permutations: Array<{
      role: UserRole;
      module: string;
      operations: WorkflowType[];
      shouldSucceed: boolean;
    }> = [];

    for (const role of roles) {
      for (const [module, operations] of Object.entries(moduleWorkflows)) {
        const hasAccess = this.roleHasModuleAccess(role, module);
        permutations.push({
          role,
          module,
          operations,
          shouldSucceed: hasAccess,
        });
      }
    }

    return permutations;
  }

  /**
   * Calculate total unique permutations
   */
  static calculateTotalPermutations(): number {
    const roleWorkflow = this.generateRoleWorkflowPermutations().length;
    const userLifecycle = this.generateUserLifecyclePermutations().length;
    const tenantLifecycle = this.generateTenantLifecyclePermutations().length;
    const moduleOps = this.generateModuleOperationPermutations().length;

    return roleWorkflow + userLifecycle + tenantLifecycle + moduleOps;
  }

  // Helper methods
  private static canRoleExecuteWorkflow(role: UserRole, workflow: WorkflowType): boolean {
    const permissions = ROLE_PERMISSIONS[role];

    // Map workflows to required permissions
    const workflowPermissions: Record<string, Permission[]> = {
      [WorkflowType.USER_REGISTRATION]: [Permission.CREATE_USER],
      [WorkflowType.USER_DELETION]: [Permission.DELETE_USER],
      [WorkflowType.SOD_RUN_ANALYSIS]: [Permission.ACCESS_SOD, Permission.RUN_ANALYSIS],
      [WorkflowType.SOD_APPROVE_VIOLATION]: [Permission.ACCESS_SOD, Permission.APPROVE_FINDINGS],
      [WorkflowType.INVOICE_RUN_MATCHING]: [Permission.ACCESS_INVOICE_MATCHING, Permission.RUN_ANALYSIS],
      [WorkflowType.GL_RUN_DETECTION]: [Permission.ACCESS_GL_ANOMALY, Permission.RUN_ANALYSIS],
      [WorkflowType.TENANT_ONBOARDING]: [Permission.CREATE_TENANT],
      // ... add more mappings as needed
    };

    const required = workflowPermissions[workflow] || [];
    return required.every(p => permissions.includes(p));
  }

  private static roleHasModuleAccess(role: UserRole, module: string): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    const modulePermission = `module:${module.replace('-', '_')}` as Permission;
    return permissions.includes(modulePermission);
  }
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export function generateTestSummary() {
  const total = CombinatorialTestGenerator.calculateTotalPermutations();

  return {
    totalPermutations: total,
    breakdown: {
      roles: Object.values(UserRole).length,
      workflows: Object.values(WorkflowType).length,
      roleWorkflowCombinations: CombinatorialTestGenerator.generateRoleWorkflowPermutations().length,
      userLifecycles: CombinatorialTestGenerator.generateUserLifecyclePermutations().length,
      tenantLifecycles: CombinatorialTestGenerator.generateTenantLifecyclePermutations().length,
      moduleOperations: CombinatorialTestGenerator.generateModuleOperationPermutations().length,
    },
  };
}
