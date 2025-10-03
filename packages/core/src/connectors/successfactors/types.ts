/**
 * SAP SuccessFactors Types
 */

export interface SFEmployee {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  hireDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}

export interface SFOrgUnit {
  code: string;
  name: string;
  parentCode?: string;
  headOfUnit?: string;
}

export interface SFCompensation {
  userId: string;
  salary: number;
  currency: string;
  effectiveDate: string;
}

export interface SFPerformanceReview {
  reviewId: string;
  userId: string;
  reviewDate: string;
  rating: number;
  status: string;
}

export interface SFODataResponse<T> {
  d: {
    results: T[];
    __next?: string;
  };
}