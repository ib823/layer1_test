/**
 * Ariba Connector Stub (Offline Mode)
 *
 * Provides realistic mock data for local development without SAP Ariba connection.
 * Useful for frontend development, demos, and testing.
 *
 * Enable via environment variable: ARIBA_STUB_MODE=true
 */

import { AribaConnector, AribaConnectorConfig } from './AribaConnector';
import {
  AribaSupplier,
  AribaPurchaseOrder,
  AribaContract,
  AribaInvoice,
  AribaUser,
} from './types';

/**
 * Mock data generators for realistic Ariba data
 */
const MOCK_SUPPLIERS: AribaSupplier[] = [
  {
    SupplierID: 'SUP-001',
    Name: 'ACME Corporation',
    Status: 'ACTIVE',
    RiskScore: 15,
  },
  {
    SupplierID: 'SUP-002',
    Name: 'GlobalTech Solutions',
    Status: 'ACTIVE',
    RiskScore: 25,
  },
  {
    SupplierID: 'SUP-003',
    Name: 'Blocked Vendor Inc',
    Status: 'BLOCKED',
    RiskScore: 95,
  },
  {
    SupplierID: 'SUP-004',
    Name: 'Innovative Supplies Ltd',
    Status: 'ACTIVE',
    RiskScore: 10,
  },
  {
    SupplierID: 'SUP-005',
    Name: 'Deactivated Partners',
    Status: 'INACTIVE',
    RiskScore: 50,
  },
];

const MOCK_PURCHASE_ORDERS: AribaPurchaseOrder[] = [
  {
    OrderID: 'PO-2025-001',
    OrderDate: '2025-01-15T09:00:00Z',
    Supplier: 'ACME Corporation',
    TotalAmount: 125000,
    Currency: 'USD',
    Status: 'APPROVED',
  },
  {
    OrderID: 'PO-2025-002',
    OrderDate: '2025-01-20T14:30:00Z',
    Supplier: 'GlobalTech Solutions',
    TotalAmount: 75000,
    Currency: 'EUR',
    Status: 'PENDING',
  },
  {
    OrderID: 'PO-2025-003',
    OrderDate: '2025-02-01T11:00:00Z',
    Supplier: 'Innovative Supplies Ltd',
    TotalAmount: 50000,
    Currency: 'USD',
    Status: 'APPROVED',
  },
];

const MOCK_CONTRACTS: AribaContract[] = [
  {
    ContractID: 'CTR-2025-001',
    Title: 'Master Service Agreement - ACME',
    StartDate: '2025-01-01T00:00:00Z',
    EndDate: '2025-12-31T23:59:59Z',
    Value: 1000000,
    Currency: 'USD',
  },
  {
    ContractID: 'CTR-2024-015',
    Title: 'IT Services Contract - GlobalTech',
    StartDate: '2024-07-01T00:00:00Z',
    EndDate: '2025-06-30T23:59:59Z',
    Value: 500000,
    Currency: 'EUR',
  },
  {
    ContractID: 'CTR-2025-002',
    Title: 'Office Supplies Framework - Innovative',
    StartDate: '2025-02-01T00:00:00Z',
    EndDate: '2026-01-31T23:59:59Z',
    Value: 250000,
    Currency: 'USD',
  },
];

const MOCK_INVOICES: AribaInvoice[] = [
  {
    InvoiceID: 'INV-2025-001',
    POReference: 'PO-2025-001',
    Amount: 62500,
    Currency: 'USD',
    Status: 'PAID',
  },
  {
    InvoiceID: 'INV-2025-002',
    POReference: 'PO-2025-001',
    Amount: 62500,
    Currency: 'USD',
    Status: 'PENDING',
  },
  {
    InvoiceID: 'INV-2025-003',
    POReference: 'PO-2025-002',
    Amount: 75000,
    Currency: 'EUR',
    Status: 'PENDING',
  },
];

const MOCK_USERS: AribaUser[] = [
  {
    UserID: 'user001',
    UserName: 'john.doe',
    Email: 'john.doe@example.com',
    Department: 'Procurement',
    Status: 'ACTIVE',
    Roles: ['Buyer', 'Approver'],
  },
  {
    UserID: 'user002',
    UserName: 'jane.smith',
    Email: 'jane.smith@example.com',
    Department: 'Finance',
    Status: 'ACTIVE',
    Roles: ['Approver', 'ContractManager'],
  },
  {
    UserID: 'user003',
    UserName: 'bob.wilson',
    Email: 'bob.wilson@example.com',
    Department: 'Procurement',
    Status: 'ACTIVE',
    Roles: ['Buyer'],
  },
  {
    UserID: 'user004',
    UserName: 'alice.johnson',
    Email: 'alice.johnson@example.com',
    Department: 'Finance',
    Status: 'INACTIVE',
    Roles: ['Viewer'],
  },
];

/**
 * Stub implementation of AribaConnector
 */
export class AribaConnectorStub extends AribaConnector {
  constructor(config: AribaConnectorConfig) {
    super(config);
    console.log('[AribaConnectorStub] Running in OFFLINE mode with mock data');
  }

  /**
   * Override to return mock suppliers
   */
  async getSuppliers(options?: {
    status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
    riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
    limit?: number;
    offset?: number;
  }): Promise<AribaSupplier[]> {
    await this.simulateDelay();

    let results = [...MOCK_SUPPLIERS];

    if (options?.status) {
      results = results.filter((s) => s.Status === options.status);
    }

    if (options?.riskLevel) {
      const riskThresholds = { HIGH: 70, MEDIUM: 30, LOW: 0 };
      const threshold = riskThresholds[options.riskLevel];
      results = results.filter((s) => (s.RiskScore || 0) >= threshold);
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
   * Override to return mock purchase orders
   */
  async getPurchaseOrders(options?: {
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    supplier?: string;
    limit?: number;
  }): Promise<AribaPurchaseOrder[]> {
    await this.simulateDelay();

    let results = [...MOCK_PURCHASE_ORDERS];

    if (options?.status) {
      results = results.filter((po) => po.Status === options.status);
    }

    if (options?.fromDate) {
      results = results.filter((po) => new Date(po.OrderDate) >= options.fromDate!);
    }

    if (options?.toDate) {
      results = results.filter((po) => new Date(po.OrderDate) <= options.toDate!);
    }

    if (options?.supplier) {
      results = results.filter((po) => po.Supplier === options.supplier);
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Override to return mock contracts
   */
  async getContracts(options?: {
    active?: boolean;
    expiringDays?: number;
    limit?: number;
  }): Promise<AribaContract[]> {
    await this.simulateDelay();

    let results = [...MOCK_CONTRACTS];

    if (options?.active !== undefined) {
      const now = new Date();
      results = results.filter((c) => {
        const start = new Date(c.StartDate);
        const end = new Date(c.EndDate);
        return start <= now && end >= now;
      });
    }

    if (options?.expiringDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + options.expiringDays);
      results = results.filter((c) => new Date(c.EndDate) <= futureDate);
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Override to return mock invoices
   */
  async getInvoices(options?: {
    status?: string;
    poReference?: string;
    limit?: number;
  }): Promise<AribaInvoice[]> {
    await this.simulateDelay();

    let results = [...MOCK_INVOICES];

    if (options?.status) {
      results = results.filter((inv) => inv.Status === options.status);
    }

    if (options?.poReference) {
      results = results.filter((inv) => inv.POReference === options.poReference);
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Override to return mock users
   */
  async getUsers(options?: {
    active?: boolean;
    department?: string;
    limit?: number;
  }): Promise<AribaUser[]> {
    await this.simulateDelay();

    let results = [...MOCK_USERS];

    if (options?.active !== undefined) {
      const targetStatus = options.active ? 'ACTIVE' : 'INACTIVE';
      results = results.filter((u) => u.Status === targetStatus);
    }

    if (options?.department) {
      results = results.filter((u) => u.Department === options.department);
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

    const user = MOCK_USERS.find((u) => u.UserID === userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    return user.Roles || [];
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
 * Factory function to create Ariba connector (stub or real based on env)
 */
export function createAribaConnector(config: AribaConnectorConfig): AribaConnector {
  const useStub = process.env.ARIBA_STUB_MODE === 'true';

  if (useStub) {
    return new AribaConnectorStub(config);
  }

  return new AribaConnector(config);
}
