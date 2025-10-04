/**
 * Shared TypeScript Types
 */

export interface Tenant {
  tenant_id: string;
  company_name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

export interface SoDViolation {
  violation_id: string;
  tenant_id: string;
  user_id: string;
  user_name?: string;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  conflicting_roles: string[];
  conflicting_transactions: string[];
  business_process: string;
  detected_at: string;
  status: 'OPEN' | 'IN_REVIEW' | 'MITIGATED' | 'ACCEPTED' | 'RESOLVED';
  mitigation_notes?: string;
  reviewer?: string;
  reviewed_at?: string;
}

export interface DashboardStats {
  totalViolations: number;
  criticalIssues: number;
  usersAnalyzed: number;
  complianceScore: number;
  trends: {
    violations: number; // percentage change
    critical: number;
    users: number;
    compliance: number;
  };
}

export interface AnalysisResult {
  analysis_id: string;
  tenant_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  started_at: string;
  completed_at?: string;
  violations_found: number;
  users_scanned: number;
  error_message?: string;
}

export interface Module {
  module_id: string;
  module_name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  activated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FilterOptions {
  riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'OPEN' | 'IN_REVIEW' | 'MITIGATED' | 'ACCEPTED' | 'RESOLVED';
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  businessProcess?: string;
}
