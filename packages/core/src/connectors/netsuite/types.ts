/**
 * NetSuite ERP specific types
 */

export interface NetSuiteUser {
  id: string;
  entityId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  isInactive: boolean;
  role?: {
    id: string;
    name: string;
  };
  subsidiary?: {
    id: string;
    name: string;
  };
  department?: {
    id: string;
    name: string;
  };
}

export interface NetSuiteRole {
  id: string;
  name: string;
  scriptId: string;
  description?: string;
  isinactive: boolean;
  permissions?: NetSuitePermission[];
}

export interface NetSuitePermission {
  id: string;
  permkey: string;
  permlevel: string;
  permType: string;
}

export interface NetSuiteGLEntry {
  id: string;
  tranId: string;
  tranDate: string;
  postingPeriod: string;
  account: {
    id: string;
    name: string;
  };
  debit?: number;
  credit?: number;
  amount: number;
  currency: {
    id: string;
    code: string;
  };
  memo?: string;
  subsidiary?: {
    id: string;
    name: string;
  };
  entity?: {
    id: string;
    name: string;
  };
}

export interface NetSuiteInvoice {
  id: string;
  tranId: string;
  tranDate: string;
  entity: {
    id: string;
    name: string;
  };
  total: number;
  taxtotal?: number;
  currency: {
    id: string;
    code: string;
  };
  status: string;
  dueDate?: string;
  subsidiary?: {
    id: string;
    name: string;
  };
}

export interface NetSuitePurchaseOrder {
  id: string;
  tranId: string;
  tranDate: string;
  entity: {
    id: string;
    name: string;
  };
  total: number;
  currency: {
    id: string;
    code: string;
  };
  status: string;
  subsidiary?: {
    id: string;
    name: string;
  };
}

export interface NetSuiteVendor {
  id: string;
  entityId: string;
  companyName?: string;
  email?: string;
  phone?: string;
  isInactive: boolean;
  subsidiary?: {
    id: string;
    name: string;
  };
  address?: {
    addr1?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

export interface NetSuiteRESTResponse<T> {
  items: T[];
  hasMore?: boolean;
  offset?: number;
  count?: number;
  totalResults?: number;
}

export interface NetSuiteSuiteQLResponse {
  hasMore: boolean;
  items: Array<Record<string, any>>;
  links: Array<{
    rel: string;
    href: string;
  }>;
  count: number;
  offset: number;
  totalResults: number;
}
