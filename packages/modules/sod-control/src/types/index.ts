/**
 * SoD Control Module - Type Definitions
 *
 * Core types for Segregation of Duties analysis and control
 */

// ============================================================================
// SYSTEM TYPES
// ============================================================================

export enum SystemType {
  S4HC = 'S4HC',           // SAP S/4HANA Cloud
  S4PCE = 'S4PCE',         // SAP S/4HANA Private Cloud Edition
  ECC = 'ECC',             // SAP ECC
  BTP = 'BTP',             // SAP Business Technology Platform
  ARIBA = 'ARIBA',         // SAP Ariba
  SFSF = 'SFSF',           // SAP SuccessFactors
  SCIM = 'SCIM',           // SCIM 2.0 Generic
  OIDC = 'OIDC',           // OpenID Connect
  SAML = 'SAML'            // SAML 2.0
}

export interface SystemConnection {
  id: string;
  tenantId: string;
  systemCode: string;
  systemName: string;
  systemType: SystemType;
  baseUrl: string;
  connectionConfig: Record<string, any>;
  isActive: boolean;
}

// ============================================================================
// ACCESS GRAPH TYPES (CANONICAL MODEL)
// ============================================================================

export interface CanonicalUser {
  id: string;
  tenantId: string;
  userId: string;              // Original user ID from source system
  userName?: string;
  email?: string;
  fullName?: string;
  sourceSystemId: string;
  isActive: boolean;
  isLocked: boolean;
  userType?: 'EMPLOYEE' | 'CONTRACTOR' | 'SERVICE_ACCOUNT' | 'ADMIN';
  department?: string;
  position?: string;
  orgUnit?: string;
  costCenter?: string;
  managerId?: string;
  lastLoginAt?: Date;
  validFrom?: Date;
  validTo?: Date;
  sourceData: Record<string, any>;
}

export interface CanonicalRole {
  id: string;
  tenantId: string;
  roleId: string;              // Original role ID from source system (e.g., SAP_FI_ACCOUNTANT)
  roleName?: string;
  roleDescription?: string;
  sourceSystemId: string;
  roleType: 'SINGLE' | 'COMPOSITE' | 'DERIVED' | 'PROFILE' | 'ROLE_COLLECTION' | 'AUTH_OBJECT';
  isTechnical: boolean;
  isCritical: boolean;
  businessProcess?: string;
  riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  parentRoleId?: string;
  sourceData: Record<string, any>;
}

export interface CanonicalPermission {
  id: string;
  tenantId: string;
  permissionCode: string;
  permissionName?: string;
  sourceSystemId: string;
  sourceSystemType: SystemType;
  authObject?: string;         // S_TCODE, F_BKPF_BUK, etc.
  fieldValues?: Record<string, any>;
  normalizedAction?: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'APPROVE';
  normalizedObject?: string;   // VENDOR, PAYMENT, INVOICE, USER, etc.
  scope?: Record<string, any>;
}

export interface UserRoleAssignment {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  assignmentType: 'DIRECT' | 'INHERITED' | 'TEMPORARY' | 'EMERGENCY' | 'COMPOSITE';
  orgScope?: Record<string, any>;
  validFrom?: Date;
  validTo?: Date;
  assignedBy?: string;
  assignedAt: Date;
  assignmentReason?: string;
  ticketReference?: string;
}

// ============================================================================
// CONNECTOR INTERFACE
// ============================================================================

export interface ConnectorOptions {
  baseUrl: string;
  authConfig: {
    type: 'BASIC' | 'OAUTH2' | 'API_KEY' | 'CERTIFICATE';
    credentials: Record<string, any>;
  };
  timeout?: number;
  retryAttempts?: number;
}

export interface SyncResult {
  success: boolean;
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalAssignments: number;
  errors: string[];
  syncDuration: number;
}

export interface ISystemConnector {
  /**
   * System identifier
   */
  getSystemType(): SystemType;

  /**
   * Test connection to the system
   */
  testConnection(): Promise<boolean>;

  /**
   * Extract users from the system
   */
  extractUsers(): Promise<CanonicalUser[]>;

  /**
   * Extract roles from the system
   */
  extractRoles(): Promise<CanonicalRole[]>;

  /**
   * Extract permissions from the system
   */
  extractPermissions(): Promise<CanonicalPermission[]>;

  /**
   * Extract user-to-role assignments
   */
  extractAssignments(): Promise<UserRoleAssignment[]>;

  /**
   * Full synchronization of access data
   */
  syncAll(): Promise<SyncResult>;
}

// ============================================================================
// SOD ANALYSIS TYPES
// ============================================================================

export interface SodRisk {
  id: string;
  tenantId: string;
  riskCode: string;
  name: string;
  description?: string;
  businessProcess: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  standardReferences?: {
    sox?: string[];
    iso27001?: string[];
    nist?: string[];
    cobit?: string[];
    pdpa?: string[];
  };
  isActive: boolean;
}

export interface SodFunction {
  id: string;
  tenantId: string;
  functionCode: string;
  name: string;
  description?: string;
  category: string;
  businessProcess: string;
  systemType: SystemType;
  technicalObjects?: Record<string, any>;
  isActive: boolean;
}

export interface SodRuleset {
  id: string;
  tenantId: string;
  riskId: string;
  functionAId: string;
  functionBId: string;
  conditionType: 'SAME_SCOPE' | 'THRESHOLD' | 'TEMPORAL' | 'ALWAYS' | 'ORG_UNIT';
  conditionConfig?: Record<string, any>;
  logicOperator: 'AND' | 'OR';
  isActive: boolean;
}

export interface SodFinding {
  id: string;
  tenantId: string;
  findingCode: string;
  riskId: string;
  userId: string;
  analysisRunId?: string;
  conflictingRoles: string[];
  conflictingFunctions: string[];
  conflictingPermissions?: string[];
  orgScope?: Record<string, any>;
  contextData?: Record<string, any>;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore?: number;
  tracePath?: TracePathNode[];
  status: 'OPEN' | 'IN_REVIEW' | 'MITIGATED' | 'EXCEPTION_GRANTED' | 'RESOLVED' | 'FALSE_POSITIVE' | 'ACCEPTED_RISK';
  resolutionType?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  assignedTo?: string;
  assignedAt?: Date;
  dueDate?: Date;
  isRecurring: boolean;
  recurrenceCount: number;
  firstDetected: Date;
  lastDetected: Date;
}

export interface TracePathNode {
  type: 'USER' | 'ROLE' | 'PERMISSION' | 'FUNCTION' | 'RISK';
  id: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface AnalysisConfig {
  mode: 'snapshot' | 'delta' | 'continuous';
  scope?: {
    systems?: string[];
    orgUnits?: string[];
    userTypes?: string[];
  };
  includeInactive?: boolean;
  riskLevels?: ('CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')[];
}

export interface AnalysisResult {
  analysisId: string;
  tenantId: string;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: SodFinding[];
  analysisStats: {
    totalUsersAnalyzed: number;
    totalRolesAnalyzed: number;
    totalRulesEvaluated: number;
    analysisDuration: number;
  };
}

// ============================================================================
// SIMULATION TYPES
// ============================================================================

export interface SimulationRequest {
  userId: string;
  requestedRoles?: string[];
  requestedPermissions?: string[];
  simulationType: 'ROLE_ASSIGNMENT' | 'ROLE_REMOVAL' | 'PERMISSION_CHANGE' | 'BULK_CHANGE' | 'ORG_TRANSFER';
}

export interface SimulationResult {
  id: string;
  tenantId: string;
  userId: string;
  currentRiskScore: number;
  currentViolationsCount: number;
  projectedRiskScore: number;
  projectedViolationsCount: number;
  riskScoreDelta: number;
  newViolations: Partial<SodFinding>[];
  resolvedViolations: Partial<SodFinding>[];
  recommendations: Recommendation[];
  leastPrivilegeRoles: string[];
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  errorMessage?: string;
}

export interface Recommendation {
  type: 'ALTERNATIVE_ROLE' | 'REMOVE_ROLE' | 'COMPENSATING_CONTROL' | 'EXCEPTION';
  roleId?: string;
  roleName?: string;
  reason: string;
  riskReduction?: number;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export * from './connectors';
