export interface UserAccessData {
  userId: string;
  userName: string;
  email: string;
  roles: string[];
  department: string;
  manager: string;
  lastLogin: Date;
  isActive: boolean;
  source: 'S4HANA' | 'IPS';
}

export interface AccessReviewReport {
  generatedAt: Date;
  totalUsers: number;
  violationsFound: number;
  violations: AccessViolation[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface AccessViolation {
  userId: string;
  userName: string;
  violationType: 'SOD' | 'ORPHANED' | 'EXPIRED';
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  details: any;
  detectedAt: Date;
}