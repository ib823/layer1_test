/**
 * SuccessFactors Connector Stub (Offline Mode)
 *
 * Provides realistic mock HR data for local development without SAP SuccessFactors connection.
 * Useful for frontend development, demos, and testing.
 *
 * Enable via environment variable: SF_STUB_MODE=true
 */

import { SuccessFactorsConnector, SuccessFactorsConnectorConfig } from './SuccessFactorsConnector';
import {
  SFEmployee,
  SFOrgUnit,
  SFCompensation,
  SFPerformanceReview,
} from './types';

/**
 * Mock data generators for realistic SuccessFactors data
 */
const MOCK_EMPLOYEES: SFEmployee[] = [
  {
    userId: 'emp001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    department: 'Finance',
    position: 'Financial Analyst',
    hireDate: '2020-03-15',
    status: 'ACTIVE',
  },
  {
    userId: 'emp002',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    department: 'HR',
    position: 'HR Manager',
    hireDate: '2018-07-01',
    status: 'ACTIVE',
  },
  {
    userId: 'emp003',
    firstName: 'Robert',
    lastName: 'Johnson',
    email: 'robert.johnson@example.com',
    department: 'IT',
    position: 'Senior Developer',
    hireDate: '2019-01-10',
    status: 'ACTIVE',
  },
  {
    userId: 'emp004',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@example.com',
    department: 'Finance',
    position: 'CFO',
    hireDate: '2015-05-20',
    status: 'ACTIVE',
  },
  {
    userId: 'emp005',
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@example.com',
    department: 'Sales',
    position: 'Sales Representative',
    hireDate: '2021-09-01',
    status: 'TERMINATED',
  },
];

const MOCK_ORG_UNITS: SFOrgUnit[] = [
  {
    code: 'FIN',
    name: 'Finance Department',
    parentCode: 'CORP',
    headOfUnit: 'emp004',
  },
  {
    code: 'HR',
    name: 'Human Resources',
    parentCode: 'CORP',
    headOfUnit: 'emp002',
  },
  {
    code: 'IT',
    name: 'Information Technology',
    parentCode: 'CORP',
    headOfUnit: 'emp003',
  },
  {
    code: 'SALES',
    name: 'Sales and Marketing',
    parentCode: 'CORP',
  },
  {
    code: 'CORP',
    name: 'Corporate',
  },
];

const MOCK_COMPENSATION: SFCompensation[] = [
  {
    userId: 'emp001',
    salary: 85000,
    currency: 'USD',
    effectiveDate: '2025-01-01',
  },
  {
    userId: 'emp002',
    salary: 105000,
    currency: 'USD',
    effectiveDate: '2025-01-01',
  },
  {
    userId: 'emp003',
    salary: 120000,
    currency: 'USD',
    effectiveDate: '2025-01-01',
  },
  {
    userId: 'emp004',
    salary: 180000,
    currency: 'USD',
    effectiveDate: '2025-01-01',
  },
  {
    userId: 'emp005',
    salary: 65000,
    currency: 'USD',
    effectiveDate: '2024-01-01',
  },
];

const MOCK_PERFORMANCE_REVIEWS: SFPerformanceReview[] = [
  {
    reviewId: 'REV-2024-001',
    userId: 'emp001',
    reviewDate: '2024-12-15',
    rating: 4.2,
    status: 'COMPLETED',
  },
  {
    reviewId: 'REV-2024-002',
    userId: 'emp002',
    reviewDate: '2024-12-20',
    rating: 4.8,
    status: 'COMPLETED',
  },
  {
    reviewId: 'REV-2024-003',
    userId: 'emp003',
    reviewDate: '2024-12-18',
    rating: 4.5,
    status: 'COMPLETED',
  },
  {
    reviewId: 'REV-2024-004',
    userId: 'emp004',
    reviewDate: '2024-12-10',
    rating: 5.0,
    status: 'COMPLETED',
  },
  {
    reviewId: 'REV-2025-001',
    userId: 'emp001',
    reviewDate: '2025-01-10',
    rating: 4.3,
    status: 'IN_PROGRESS',
  },
];

/**
 * Mock role assignments for SoD analysis
 */
const MOCK_ROLE_ASSIGNMENTS: Record<string, string[]> = {
  emp001: ['Employee', 'Analyst'],
  emp002: ['Manager', 'HR_Admin', 'CompensationManager'],
  emp003: ['TechLead', 'Developer', 'SystemAdmin'],
  emp004: ['Executive', 'FinanceManager', 'Approver'],
  emp005: ['Employee', 'SalesRep'],
};

/**
 * Stub implementation of SuccessFactorsConnector
 */
export class SuccessFactorsConnectorStub extends SuccessFactorsConnector {
  constructor(config: SuccessFactorsConnectorConfig) {
    super(config);
    console.log('[SuccessFactorsConnectorStub] Running in OFFLINE mode with mock data');
  }

  /**
   * Override to return mock employees
   */
  async getEmployees(options?: {
    status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
    department?: string;
    hireDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<SFEmployee[]> {
    await this.simulateDelay();

    let results = [...MOCK_EMPLOYEES];

    if (options?.status) {
      results = results.filter((e) => e.status === options.status);
    }

    if (options?.department) {
      results = results.filter((e) => e.department === options.department);
    }

    if (options?.hireDate) {
      results = results.filter((e) => new Date(e.hireDate) >= options.hireDate!);
    }

    if (options?.offset) {
      results = results.slice(options.offset);
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Override to return mock org units
   */
  async getOrgUnits(options?: {
    parentCode?: string;
    limit?: number;
    offset?: number;
  }): Promise<SFOrgUnit[]> {
    await this.simulateDelay();

    let results = [...MOCK_ORG_UNITS];

    if (options?.parentCode) {
      results = results.filter((ou) => ou.parentCode === options.parentCode);
    }

    if (options?.offset) {
      results = results.slice(options.offset);
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Override to return mock compensation
   */
  async getCompensation(options?: {
    userId?: string;
    effectiveDate?: Date;
    minSalary?: number;
    limit?: number;
  }): Promise<SFCompensation[]> {
    await this.simulateDelay();

    let results = [...MOCK_COMPENSATION];

    if (options?.userId) {
      results = results.filter((c) => c.userId === options.userId);
    }

    if (options?.effectiveDate) {
      results = results.filter(
        (c) => new Date(c.effectiveDate) >= options.effectiveDate!
      );
    }

    if (options?.minSalary !== undefined) {
      results = results.filter((c) => c.salary >= options.minSalary!);
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Override to return mock performance reviews
   */
  async getPerformanceReviews(options?: {
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
    minRating?: number;
    limit?: number;
  }): Promise<SFPerformanceReview[]> {
    await this.simulateDelay();

    let results = [...MOCK_PERFORMANCE_REVIEWS];

    if (options?.userId) {
      results = results.filter((r) => r.userId === options.userId);
    }

    if (options?.fromDate) {
      results = results.filter((r) => new Date(r.reviewDate) >= options.fromDate!);
    }

    if (options?.toDate) {
      results = results.filter((r) => new Date(r.reviewDate) <= options.toDate!);
    }

    if (options?.minRating !== undefined) {
      results = results.filter((r) => r.rating >= options.minRating!);
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Override to return mock user roles
   */
  async getUserRoles(userId: string): Promise<string[]> {
    await this.simulateDelay();

    const roles = MOCK_ROLE_ASSIGNMENTS[userId];
    if (!roles) {
      throw new Error(`User ${userId} not found in SuccessFactors`);
    }

    return roles;
  }

  /**
   * Simulate network delay for realistic behavior
   */
  private async simulateDelay(): Promise<void> {
    const delay = Math.random() * 300 + 100; // 100-400ms
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Factory function to create SuccessFactors connector (stub or real based on env)
 */
export function createSuccessFactorsConnector(
  config: SuccessFactorsConnectorConfig
): SuccessFactorsConnector {
  const useStub = process.env.SF_STUB_MODE === 'true';

  if (useStub) {
    return new SuccessFactorsConnectorStub(config);
  }

  return new SuccessFactorsConnector(config);
}
