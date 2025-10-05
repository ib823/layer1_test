/**
 * User Access Review Module - Type Definitions
 */

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface UserAccess {
  userId: string;
  userName: string;
  email?: string;
  roles: string[];
  department?: string;
  manager?: string;
  lastLogin?: Date;
  isActive: boolean;
}

export interface SoDViolation {
  id: string;
  userId: string;
  userName: string;
  department: string;
  conflictingRoles: string[];
  riskLevel: RiskLevel;
  riskScore: number;
  ruleName: string;
  ruleDescription: string;
  detectedAt: Date;
  status: 'DETECTED' | 'ACKNOWLEDGED' | 'MITIGATED' | 'ACCEPTED';
  mitigationActions?: string[];
  businessJustification?: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface AnalysisResult {
  summary: {
    totalUsers: number;
    usersWithViolations: number;
    totalViolations: number;
    criticalViolations: number;
    highViolations: number;
    mediumViolations: number;
    lowViolations: number;
  };
  violations: SoDViolation[];
  recommendations: string[];
  generatedAt: Date;
}

export interface SoDRuleDefinition {
  id: string;
  name: string;
  description: string;
  conflictingRoles: string[];
  requiresAll: boolean;
  riskLevel: RiskLevel;
  riskScore: number;
  category: 'FINANCIAL' | 'PROCUREMENT' | 'HR' | 'SECURITY' | 'OPERATIONS';
  regulatoryReference?: string;
  mitigationStrategies: string[];
}

export interface ModuleConfig {
  dataSource: {
    type: 'IPS' | 'S4HANA' | 'CUSTOM';
    userIdField?: string;
    roleField?: string;
    departmentField?: string;
  };
  analysis: {
    includeInactiveUsers: boolean;
    minimumRiskScore: number;
    customRules?: SoDRuleDefinition[];
  };
  notifications: {
    enabled: boolean;
    recipients: string[];
    onlyForCritical: boolean;
  };
}