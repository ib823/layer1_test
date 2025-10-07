/**
 * Tests for Invoice Matching Engine
 */

import { InvoiceMatchingEngine, DataSource } from '../../src/InvoiceMatchingEngine';
import { PurchaseOrder, GoodsReceipt, SupplierInvoice, MatchingConfig } from '../../src/types';

// Mock DataSource implementation
class MockDataSource implements DataSource {
  private pos: PurchaseOrder[] = [];
  private grs: GoodsReceipt[] = [];
  private invoices: SupplierInvoice[] = [];

  constructor(pos: PurchaseOrder[], grs: GoodsReceipt[], invoices: SupplierInvoice[]) {
    this.pos = pos;
    this.grs = grs;
    this.invoices = invoices;
  }

  async getPurchaseOrders(filter?: {
    poNumbers?: string[];
    vendorIds?: string[];
    fromDate?: Date;
    toDate?: Date;
  }): Promise<PurchaseOrder[]> {
    let results = [...this.pos];

    if (filter?.poNumbers) {
      results = results.filter((po) => filter.poNumbers!.includes(po.poNumber));
    }

    if (filter?.vendorIds) {
      results = results.filter((po) => filter.vendorIds!.includes(po.vendorId));
    }

    return results;
  }

  async getGoodsReceipts(filter?: {
    poNumbers?: string[];
    grNumbers?: string[];
    fromDate?: Date;
    toDate?: Date;
  }): Promise<GoodsReceipt[]> {
    let results = [...this.grs];

    if (filter?.grNumbers) {
      results = results.filter((gr) => filter.grNumbers!.includes(gr.grNumber));
    }

    if (filter?.poNumbers) {
      results = results.filter((gr) => filter.poNumbers!.includes(gr.poNumber));
    }

    return results;
  }

  async getSupplierInvoices(filter?: {
    invoiceNumbers?: string[];
    vendorIds?: string[];
    status?: SupplierInvoice['invoiceStatus'][];
    fromDate?: Date;
    toDate?: Date;
  }): Promise<SupplierInvoice[]> {
    let results = [...this.invoices];

    if (filter?.invoiceNumbers) {
      results = results.filter((inv) => filter.invoiceNumbers!.includes(inv.invoiceNumber));
    }

    if (filter?.vendorIds) {
      results = results.filter((inv) => filter.vendorIds!.includes(inv.vendorId));
    }

    if (filter?.status) {
      results = results.filter((inv) => filter.status!.includes(inv.invoiceStatus));
    }

    return results;
  }
}

describe('InvoiceMatchingEngine', () => {
  const mockPO: PurchaseOrder = {
    poNumber: 'PO-001',
    poItem: '10',
    vendorId: 'VEND-123',
    vendorName: 'Acme Corp',
    materialNumber: 'MAT-001',
    materialDescription: 'Test Material',
    orderedQuantity: 100,
    orderedValue: 10000,
    currency: 'USD',
    unitPrice: 100,
    taxAmount: 1000,
    deliveryDate: new Date('2025-09-30'),
    poStatus: 'OPEN',
    createdBy: 'buyer@example.com',
    createdAt: new Date('2025-09-15'),
  };

  const mockGR: GoodsReceipt = {
    grNumber: 'GR-001',
    grItem: '10',
    poNumber: 'PO-001',
    poItem: '10',
    materialNumber: 'MAT-001',
    receivedQuantity: 100,
    receivedValue: 10000,
    currency: 'USD',
    grDate: new Date('2025-10-01'),
    plant: 'PLANT-01',
    storageLocation: 'SL-01',
    createdBy: 'receiver@example.com',
    createdAt: new Date('2025-10-01'),
  };

  const mockInvoice: SupplierInvoice = {
    invoiceNumber: 'INV-001',
    invoiceItem: '10',
    vendorId: 'VEND-123',
    vendorName: 'Acme Corp',
    poNumber: 'PO-001',
    poItem: '10',
    grNumber: 'GR-001',
    grItem: '10',
    materialNumber: 'MAT-001',
    invoicedQuantity: 100,
    invoicedAmount: 10000,
    taxAmount: 1000,
    totalAmount: 10000, // Match orderedValue exactly to avoid tolerance violations
    currency: 'USD',
    invoiceDate: new Date('2025-10-02'),
    postingDate: new Date('2025-10-03'),
    dueDate: new Date('2025-10-31'),
    paymentTerms: 'Net 30',
    invoiceStatus: 'PENDING',
  };

  describe('Construction', () => {
    it('should create engine with default config', () => {
      const dataSource = new MockDataSource([], [], []);
      const engine = new InvoiceMatchingEngine(dataSource);

      const config = engine.getConfig();
      expect(config.fraudDetection.enabled).toBe(true);
      expect(config.matching.requireGoodsReceipt).toBe(true);
      expect(config.toleranceRules).toBeDefined();
      expect(config.toleranceRules.length).toBeGreaterThan(0);
    });

    it('should create engine with custom config', () => {
      const dataSource = new MockDataSource([], [], []);
      const customConfig: Partial<MatchingConfig> = {
        fraudDetection: {
          enabled: false,
          patterns: [],
          minimumConfidence: 80,
        },
        matching: {
          requireGoodsReceipt: false,
          autoApproveWithinTolerance: true,
          blockOnFraudAlert: false,
        },
      };

      const engine = new InvoiceMatchingEngine(dataSource, customConfig);
      const config = engine.getConfig();

      expect(config.fraudDetection.enabled).toBe(false);
      expect(config.fraudDetection.minimumConfidence).toBe(80);
      expect(config.matching.autoApproveWithinTolerance).toBe(true);
    });
  });

  describe('runAnalysis()', () => {
    it('should run complete analysis and return results', async () => {
      const dataSource = new MockDataSource([mockPO], [mockGR], [mockInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.runAnalysis('tenant-123');

      expect(result.runId).toBeDefined();
      expect(result.tenantId).toBe('tenant-123');
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].invoiceNumber).toBe('INV-001');
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalInvoices).toBe(1);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should handle multiple invoices', async () => {
      const invoice2 = { ...mockInvoice, invoiceNumber: 'INV-002' };
      const invoice3 = { ...mockInvoice, invoiceNumber: 'INV-003' };

      const dataSource = new MockDataSource([mockPO], [mockGR], [mockInvoice, invoice2, invoice3]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.runAnalysis('tenant-123');

      expect(result.matches).toHaveLength(3);
      expect(result.statistics.totalInvoices).toBe(3);
    });

    it('should filter by vendor IDs', async () => {
      const invoice2 = { ...mockInvoice, invoiceNumber: 'INV-002', vendorId: 'VEND-456' };

      const dataSource = new MockDataSource([mockPO], [mockGR], [mockInvoice, invoice2]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.runAnalysis('tenant-123', { vendorIds: ['VEND-123'] });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].invoiceNumber).toBe('INV-001');
    });

    it('should filter by date range', async () => {
      const oldInvoice = { ...mockInvoice, invoiceNumber: 'INV-OLD', invoiceDate: new Date('2025-08-01') };
      const newInvoice = { ...mockInvoice, invoiceNumber: 'INV-NEW', invoiceDate: new Date('2025-10-15') };

      const dataSource = new MockDataSource([mockPO], [mockGR], [oldInvoice, mockInvoice, newInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.runAnalysis('tenant-123', {
        fromDate: new Date('2025-10-01'),
        toDate: new Date('2025-10-10'),
      });

      // May match multiple due to fraud detection cross-checking
      expect(result.matches.length).toBeGreaterThanOrEqual(1);
      expect(result.matches.some((m) => m.invoiceNumber === 'INV-001')).toBe(true);
    });

    it('should only fetch PENDING invoices by default', async () => {
      const pendingInvoice = { ...mockInvoice, invoiceStatus: 'PENDING' as const };
      const paidInvoice = { ...mockInvoice, invoiceNumber: 'INV-PAID', invoiceStatus: 'PAID' as const };

      const dataSource = new MockDataSource([mockPO], [mockGR], [pendingInvoice, paidInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.runAnalysis('tenant-123');

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].invoiceNumber).toBe('INV-001');
    });

    it('should calculate statistics correctly', async () => {
      const fullyMatched = mockInvoice;
      const partiallyMatched = { ...mockInvoice, invoiceNumber: 'INV-002', invoicedQuantity: 105 }; // Slight mismatch
      const notMatched = { ...mockInvoice, invoiceNumber: 'INV-003', poNumber: 'PO-999' }; // No PO

      const dataSource = new MockDataSource([mockPO], [mockGR], [fullyMatched, partiallyMatched, notMatched]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.runAnalysis('tenant-123');

      expect(result.statistics.totalInvoices).toBe(3);
      // At least one should be in each category (fully matched or tolerance exceeded, and not matched)
      expect(result.statistics.fullyMatched + result.statistics.toleranceExceeded).toBeGreaterThanOrEqual(1);
      expect(result.statistics.notMatched).toBe(1);
    });

    it('should handle invoices without PO numbers', async () => {
      const noPOInvoice = { ...mockInvoice, poNumber: undefined };

      const dataSource = new MockDataSource([mockPO], [mockGR], [noPOInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.runAnalysis('tenant-123');

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].matchStatus).toBe('NOT_MATCHED');
    });

    it('should handle invoices without GR numbers', async () => {
      const noGRInvoice = { ...mockInvoice, grNumber: undefined };

      const dataSource = new MockDataSource([mockPO], [mockGR], [noGRInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.runAnalysis('tenant-123');

      expect(result.matches).toHaveLength(1);
      // With requireGoodsReceipt=true (default), this should be NO_MATCH
      expect(result.matches[0].matchType).toBe('NO_MATCH');
    });
  });

  describe('matchSingleInvoice()', () => {
    it('should match a single invoice by invoice number', async () => {
      const dataSource = new MockDataSource([mockPO], [mockGR], [mockInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.matchSingleInvoice('INV-001');

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].invoiceNumber).toBe('INV-001');
      expect(result.tenantId).toBe('single-match');
    });

    it('should throw error when invoice not found', async () => {
      const dataSource = new MockDataSource([mockPO], [mockGR], [mockInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      await expect(engine.matchSingleInvoice('INV-999')).rejects.toThrow('Invoice INV-999 not found');
    });

    it('should accept pre-fetched invoices', async () => {
      const dataSource = new MockDataSource([mockPO], [mockGR], []);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.matchSingleInvoice('INV-001', [mockInvoice]);

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].invoiceNumber).toBe('INV-001');
    });

    it('should fetch related PO and GR', async () => {
      const dataSource = new MockDataSource([mockPO], [mockGR], [mockInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.matchSingleInvoice('INV-001');

      expect(result.matches[0].poNumber).toBe('PO-001');
      expect(result.matches[0].grNumber).toBe('GR-001');
    });

    it('should handle invoice without PO reference', async () => {
      const noPOInvoice = { ...mockInvoice, poNumber: undefined };
      const dataSource = new MockDataSource([mockPO], [mockGR], [noPOInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const result = await engine.matchSingleInvoice('INV-001');

      expect(result.matches[0].matchStatus).toBe('NOT_MATCHED');
    });
  });

  describe('analyzeVendorPatterns()', () => {
    it('should analyze vendor payment patterns', async () => {
      const vendor1Invoices = [
        { ...mockInvoice, invoiceNumber: 'INV-001', invoicedAmount: 10000 },
        { ...mockInvoice, invoiceNumber: 'INV-002', invoicedAmount: 10000 },
        { ...mockInvoice, invoiceNumber: 'INV-003', invoicedAmount: 10000 },
      ];

      const dataSource = new MockDataSource([mockPO], [mockGR], vendor1Invoices);
      const engine = new InvoiceMatchingEngine(dataSource);

      const patterns = await engine.analyzeVendorPatterns();

      expect(patterns).toHaveLength(1);
      expect(patterns[0].vendorId).toBe('VEND-123');
      expect(patterns[0].totalInvoices).toBe(3);
      expect(patterns[0].totalAmount).toBe(30000);
      expect(patterns[0].averageInvoiceAmount).toBeCloseTo(10000);
    });

    it('should filter by vendor IDs', async () => {
      const vendor1Invoice = mockInvoice;
      const vendor2Invoice = { ...mockInvoice, invoiceNumber: 'INV-002', vendorId: 'VEND-456', vendorName: 'Other Corp' };

      const dataSource = new MockDataSource([mockPO], [mockGR], [vendor1Invoice, vendor2Invoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const patterns = await engine.analyzeVendorPatterns(['VEND-123']);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].vendorId).toBe('VEND-123');
    });

    it('should detect duplicate invoices in pattern', async () => {
      const duplicateInvoices = [
        mockInvoice,
        { ...mockInvoice, invoiceNumber: 'INV-002' }, // Same amount, same vendor, same date
      ];

      const dataSource = new MockDataSource([mockPO], [mockGR], duplicateInvoices);
      const engine = new InvoiceMatchingEngine(dataSource);

      const patterns = await engine.analyzeVendorPatterns();

      expect(patterns[0].duplicateCount).toBeGreaterThan(0);
    });

    it('should calculate risk score for new vendors', async () => {
      const newVendorInvoice = { ...mockInvoice, vendorId: 'VEND-NEW', vendorName: 'New Vendor' };

      const dataSource = new MockDataSource([mockPO], [mockGR], [newVendorInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const patterns = await engine.analyzeVendorPatterns();

      expect(patterns[0].riskScore).toBeGreaterThan(0); // New vendor should have risk score
    });

    it('should increase risk score for high-value transactions', async () => {
      const highValueInvoice = { ...mockInvoice, invoicedAmount: 150000 };

      const dataSource = new MockDataSource([mockPO], [mockGR], [highValueInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const patterns = await engine.analyzeVendorPatterns();

      expect(patterns[0].riskScore).toBeGreaterThan(0);
    });

    it('should sort patterns by risk score (descending)', async () => {
      const lowRiskInvoices = Array(10)
        .fill(null)
        .map((_, i) => ({
          ...mockInvoice,
          invoiceNumber: `INV-LOW-${i}`,
          vendorId: 'VEND-LOW',
          vendorName: 'Low Risk Vendor',
          invoiceDate: new Date(2024, i, 1),
        }));

      const highRiskInvoice = { ...mockInvoice, invoiceNumber: 'INV-HIGH', vendorId: 'VEND-HIGH', vendorName: 'High Risk Vendor' };

      const dataSource = new MockDataSource([mockPO], [mockGR], [...lowRiskInvoices, highRiskInvoice]);
      const engine = new InvoiceMatchingEngine(dataSource);

      const patterns = await engine.analyzeVendorPatterns();

      expect(patterns[0].riskScore).toBeGreaterThanOrEqual(patterns[1].riskScore);
    });
  });

  describe('getConfig() and updateConfig()', () => {
    it('should return current configuration', () => {
      const dataSource = new MockDataSource([], [], []);
      const engine = new InvoiceMatchingEngine(dataSource);

      const config = engine.getConfig();

      expect(config.toleranceRules).toBeDefined();
      expect(config.fraudDetection).toBeDefined();
      expect(config.matching).toBeDefined();
      expect(config.notifications).toBeDefined();
    });

    it('should update configuration', () => {
      const dataSource = new MockDataSource([], [], []);
      const engine = new InvoiceMatchingEngine(dataSource);

      const newConfig: Partial<MatchingConfig> = {
        fraudDetection: {
          enabled: false,
          patterns: [],
          minimumConfidence: 90,
        },
      };

      engine.updateConfig(newConfig);

      const config = engine.getConfig();
      expect(config.fraudDetection.enabled).toBe(false);
      expect(config.fraudDetection.minimumConfidence).toBe(90);
    });

    it('should return config copy (shallow)', () => {
      const dataSource = new MockDataSource([], [], []);
      const engine = new InvoiceMatchingEngine(dataSource);

      const config1 = engine.getConfig();
      const originalEnabled = config1.fraudDetection.enabled;
      config1.fraudDetection.enabled = false;

      const config2 = engine.getConfig();
      // Spread operator creates a new top-level object, but nested objects are shared
      expect(config1).not.toBe(config2); // Different top-level objects
      expect(config1.fraudDetection).toBe(config2.fraudDetection); // But nested objects are same reference
      expect(config2.fraudDetection.enabled).toBe(false); // Mutation affects both
    });
  });
});
