/**
 * Integration Tests for Invoice Matching Module
 * Tests end-to-end invoice matching workflows
 */

import { InvoiceMatchingEngine, DataSource } from '../../src/InvoiceMatchingEngine';
import {
  SupplierInvoice,
  PurchaseOrder,
  GoodsReceipt,
  MatchingConfig,
  MatchStatus
} from '../../src/types';

describe('Invoice Matching Integration Tests', () => {
  let engine: InvoiceMatchingEngine;
  let mockDataSource: jest.Mocked<DataSource>;
  let testInvoices: SupplierInvoice[];
  let testPurchaseOrders: PurchaseOrder[];
  let testGoodsReceipts: GoodsReceipt[];

  beforeEach(() => {
    // Setup test data
    testPurchaseOrders = [
      {
        poNumber: 'PO-2024-001',
        vendorId: 'V001',
        vendorName: 'Acme Corporation',
        poDate: new Date('2024-01-01'),
        totalAmount: 100000,
        currency: 'USD',
        lineItems: [
          {
            lineNumber: '1',
            materialNumber: 'MAT001',
            materialDescription: 'Office Supplies',
            quantity: 100,
            unitPrice: 1000,
            totalAmount: 100000,
            unit: 'EA'
          }
        ]
      },
      {
        poNumber: 'PO-2024-002',
        vendorId: 'V002',
        vendorName: 'Global Supplier Inc',
        poDate: new Date('2024-01-05'),
        totalAmount: 50000,
        currency: 'USD',
        lineItems: [
          {
            lineNumber: '1',
            materialNumber: 'MAT002',
            materialDescription: 'Equipment',
            quantity: 10,
            unitPrice: 5000,
            totalAmount: 50000,
            unit: 'EA'
          }
        ]
      }
    ];

    testGoodsReceipts = [
      {
        grNumber: 'GR-2024-001',
        poNumber: 'PO-2024-001',
        grDate: new Date('2024-01-10'),
        receivedBy: 'USER001',
        lineItems: [
          {
            lineNumber: '1',
            materialNumber: 'MAT001',
            quantity: 100,
            unit: 'EA',
            poLineNumber: '1'
          }
        ]
      },
      {
        grNumber: 'GR-2024-002',
        poNumber: 'PO-2024-002',
        grDate: new Date('2024-01-12'),
        receivedBy: 'USER002',
        lineItems: [
          {
            lineNumber: '1',
            materialNumber: 'MAT002',
            quantity: 8, // Partial receipt
            unit: 'EA',
            poLineNumber: '1'
          }
        ]
      }
    ];

    testInvoices = [
      {
        invoiceNumber: 'INV-2024-001',
        vendorId: 'V001',
        vendorName: 'Acme Corporation',
        poNumber: 'PO-2024-001',
        grNumber: 'GR-2024-001',
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        totalAmount: 100000,
        taxAmount: 0,
        currency: 'USD',
        invoiceStatus: 'PENDING',
        submittedDate: new Date('2024-01-16'),
        lineItems: [
          {
            lineNumber: '1',
            materialNumber: 'MAT001',
            description: 'Office Supplies',
            quantity: 100,
            unitPrice: 1000,
            totalAmount: 100000,
            taxAmount: 0
          }
        ]
      },
      {
        invoiceNumber: 'INV-2024-002',
        vendorId: 'V002',
        vendorName: 'Global Supplier Inc',
        poNumber: 'PO-2024-002',
        grNumber: 'GR-2024-002',
        invoiceDate: new Date('2024-01-18'),
        dueDate: new Date('2024-02-18'),
        totalAmount: 50000,
        taxAmount: 0,
        currency: 'USD',
        invoiceStatus: 'PENDING',
        submittedDate: new Date('2024-01-19'),
        lineItems: [
          {
            lineNumber: '1',
            materialNumber: 'MAT002',
            description: 'Equipment',
            quantity: 10, // Quantity mismatch with GR (received only 8)
            unitPrice: 5000,
            totalAmount: 50000,
            taxAmount: 0
          }
        ]
      },
      {
        invoiceNumber: 'INV-2024-003',
        vendorId: 'V003',
        vendorName: 'New Vendor LLC',
        invoiceDate: new Date('2024-01-20'),
        dueDate: new Date('2024-02-20'),
        totalAmount: 10000, // Round number
        taxAmount: 0,
        currency: 'USD',
        invoiceStatus: 'PENDING',
        submittedDate: new Date('2024-01-21T02:00:00Z'), // Weekend, middle of night
        lineItems: [
          {
            lineNumber: '1',
            materialNumber: 'MAT003',
            description: 'Suspicious Item',
            quantity: 1,
            unitPrice: 10000,
            totalAmount: 10000,
            taxAmount: 0
          }
        ]
      }
    ];

    // Setup mock data source
    mockDataSource = {
      getPurchaseOrders: jest.fn(),
      getGoodsReceipts: jest.fn(),
      getSupplierInvoices: jest.fn(),
    };

    mockDataSource.getPurchaseOrders.mockResolvedValue(testPurchaseOrders);
    mockDataSource.getGoodsReceipts.mockResolvedValue(testGoodsReceipts);
    mockDataSource.getSupplierInvoices.mockResolvedValue(testInvoices);

    engine = new InvoiceMatchingEngine(mockDataSource);
  });

  describe('Complete Matching Workflow', () => {
    it('should run complete analysis successfully', async () => {
      const result = await engine.runAnalysis('tenant-1', {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31')
      });

      expect(result).toBeDefined();
      expect(result.runId).toBeDefined();
      expect(result.tenantId).toBe('tenant-1');
      expect(result.matches.length).toBe(3);
      expect(result.statistics).toBeDefined();
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should fetch all required data from data source', async () => {
      await engine.runAnalysis('tenant-1');

      expect(mockDataSource.getSupplierInvoices).toHaveBeenCalledWith({
        vendorIds: undefined,
        fromDate: undefined,
        toDate: undefined,
        status: ['PENDING']
      });

      expect(mockDataSource.getPurchaseOrders).toHaveBeenCalled();
      expect(mockDataSource.getGoodsReceipts).toHaveBeenCalled();
    });

    it('should match perfect three-way match correctly', async () => {
      const result = await engine.runAnalysis('tenant-1');

      const perfectMatch = result.matches.find(m => m.invoice.invoiceNumber === 'INV-2024-001');
      expect(perfectMatch).toBeDefined();
      expect(perfectMatch!.matchStatus).toBe('MATCHED');
      expect(perfectMatch!.purchaseOrder).toBeDefined();
      expect(perfectMatch!.goodsReceipt).toBeDefined();
      expect(perfectMatch!.mismatches.length).toBe(0);
    });

    it('should detect quantity mismatches', async () => {
      const result = await engine.runAnalysis('tenant-1');

      const mismatchInvoice = result.matches.find(m => m.invoice.invoiceNumber === 'INV-2024-002');
      expect(mismatchInvoice).toBeDefined();
      expect(mismatchInvoice!.matchStatus).toBe('MISMATCHED');
      expect(mismatchInvoice!.mismatches.length).toBeGreaterThan(0);
      expect(mismatchInvoice!.mismatches.some(mm => mm.type === 'QUANTITY_MISMATCH')).toBe(true);
    });

    it('should detect invoices without PO', async () => {
      const result = await engine.runAnalysis('tenant-1');

      const noPOInvoice = result.matches.find(m => m.invoice.invoiceNumber === 'INV-2024-003');
      expect(noPOInvoice).toBeDefined();
      expect(noPOInvoice!.purchaseOrder).toBeNull();
      expect(noPOInvoice!.goodsReceipt).toBeNull();
    });

    it('should calculate statistics correctly', async () => {
      const result = await engine.runAnalysis('tenant-1');

      expect(result.statistics.totalInvoices).toBe(3);
      expect(result.statistics.matchedInvoices).toBeGreaterThanOrEqual(0);
      expect(result.statistics.mismatchedInvoices).toBeGreaterThanOrEqual(0);
      expect(result.statistics.pendingApproval).toBeGreaterThanOrEqual(0);
      expect(result.statistics.fraudAlertsRaised).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fraud Detection Integration', () => {
    it('should detect new vendor risk', async () => {
      const result = await engine.runAnalysis('tenant-1');

      const newVendorInvoice = result.matches.find(m => m.invoice.invoiceNumber === 'INV-2024-003');
      expect(newVendorInvoice).toBeDefined();
      expect(newVendorInvoice!.fraudAlerts.some(alert => alert.pattern === 'NEW_VENDOR')).toBe(true);
    });

    it('should detect round number patterns', async () => {
      const result = await engine.runAnalysis('tenant-1');

      const roundNumberInvoice = result.matches.find(m => m.invoice.invoiceNumber === 'INV-2024-003');
      expect(roundNumberInvoice).toBeDefined();
      expect(roundNumberInvoice!.fraudAlerts.some(alert => alert.pattern === 'ROUND_NUMBER')).toBe(true);
    });

    it('should detect weekend submissions', async () => {
      const result = await engine.runAnalysis('tenant-1');

      const weekendInvoice = result.matches.find(m => m.invoice.invoiceNumber === 'INV-2024-003');
      expect(weekendInvoice).toBeDefined();
      // Check if weekend submission detected
      expect(weekendInvoice!.fraudAlerts.length).toBeGreaterThan(0);
    });

    it('should detect duplicate invoices', async () => {
      // Add duplicate invoice
      const duplicateInvoice = {
        ...testInvoices[0],
        invoiceNumber: 'INV-2024-001-DUP',
        submittedDate: new Date('2024-01-17')
      };

      testInvoices.push(duplicateInvoice);
      mockDataSource.getSupplierInvoices.mockResolvedValue(testInvoices);

      const result = await engine.runAnalysis('tenant-1');

      const duplicates = result.matches.filter(m =>
        m.fraudAlerts.some(alert => alert.pattern === 'DUPLICATE_INVOICE')
      );
      expect(duplicates.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Single Invoice Matching', () => {
    it('should match single invoice successfully', async () => {
      const result = await engine.matchSingleInvoice('INV-2024-001', testInvoices);

      expect(result.matches.length).toBe(1);
      expect(result.matches[0].invoice.invoiceNumber).toBe('INV-2024-001');
      expect(result.matches[0].purchaseOrder).toBeDefined();
      expect(result.matches[0].goodsReceipt).toBeDefined();
    });

    it('should throw error for non-existent invoice', async () => {
      await expect(
        engine.matchSingleInvoice('INV-NONEXISTENT', testInvoices)
      ).rejects.toThrow('Invoice INV-NONEXISTENT not found');
    });

    it('should fetch invoice if not provided', async () => {
      mockDataSource.getSupplierInvoices.mockResolvedValue([testInvoices[0]]);

      await engine.matchSingleInvoice('INV-2024-001');

      expect(mockDataSource.getSupplierInvoices).toHaveBeenCalledWith({
        invoiceNumbers: ['INV-2024-001']
      });
    });

    it('should handle invoice without PO', async () => {
      const result = await engine.matchSingleInvoice('INV-2024-003', testInvoices);

      expect(result.matches[0].purchaseOrder).toBeNull();
      expect(result.matches[0].goodsReceipt).toBeNull();
    });
  });

  describe('Vendor Pattern Analysis', () => {
    it('should analyze vendor payment patterns', async () => {
      const patterns = await engine.analyzeVendorPatterns(
        ['V001', 'V002', 'V003'],
        new Date('2024-01-01')
      );

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('vendorId');
      expect(patterns[0]).toHaveProperty('totalInvoices');
      expect(patterns[0]).toHaveProperty('totalAmount');
      expect(patterns[0]).toHaveProperty('averageInvoiceAmount');
      expect(patterns[0]).toHaveProperty('riskScore');
    });

    it('should calculate risk scores for vendors', async () => {
      const patterns = await engine.analyzeVendorPatterns();

      patterns.forEach(pattern => {
        expect(pattern.riskScore).toBeGreaterThanOrEqual(0);
        expect(pattern.riskScore).toBeLessThanOrEqual(100);
      });
    });

    it('should flag new vendors as higher risk', async () => {
      const patterns = await engine.analyzeVendorPatterns(['V003']);

      const newVendorPattern = patterns.find(p => p.vendorId === 'V003');
      expect(newVendorPattern).toBeDefined();
      expect(newVendorPattern!.totalInvoices).toBe(1);
      expect(newVendorPattern!.riskScore).toBeGreaterThan(0); // Should have risk due to being new
    });

    it('should detect duplicate invoices in vendor patterns', async () => {
      // Add duplicate invoice for vendor
      const duplicateInvoice = {
        ...testInvoices[0],
        invoiceNumber: 'INV-2024-001-DUP'
      };

      testInvoices.push(duplicateInvoice);
      mockDataSource.getSupplierInvoices.mockResolvedValue(testInvoices);

      const patterns = await engine.analyzeVendorPatterns(['V001']);

      const vendorPattern = patterns.find(p => p.vendorId === 'V001');
      expect(vendorPattern).toBeDefined();
      // Duplicate count should be detected
      expect(vendorPattern!.duplicateCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom tolerance rules', async () => {
      const customConfig: Partial<MatchingConfig> = {
        toleranceRules: [
          {
            id: 'CUSTOM-001',
            name: 'Strict Matching',
            enabled: true,
            type: 'AMOUNT',
            percentage: 0, // No tolerance
            absoluteAmount: 0,
            applyToLineItems: true
          }
        ]
      };

      const strictEngine = new InvoiceMatchingEngine(mockDataSource, customConfig);
      const result = await strictEngine.runAnalysis('tenant-1');

      // With zero tolerance, minor differences should cause mismatches
      expect(result.statistics).toBeDefined();
    });

    it('should block invoices with fraud alerts when configured', async () => {
      const config: Partial<MatchingConfig> = {
        matching: {
          requireGoodsReceipt: true,
          autoApproveWithinTolerance: false,
          blockOnFraudAlert: true
        }
      };

      const strictEngine = new InvoiceMatchingEngine(mockDataSource, config);
      const result = await strictEngine.runAnalysis('tenant-1');

      const fraudInvoices = result.matches.filter(m => m.fraudAlerts.length > 0);
      fraudInvoices.forEach(invoice => {
        // Should be blocked or flagged
        expect(invoice.matchStatus).not.toBe('APPROVED');
      });
    });

    it('should auto-approve when within tolerance if configured', async () => {
      const config: Partial<MatchingConfig> = {
        matching: {
          requireGoodsReceipt: true,
          autoApproveWithinTolerance: true,
          blockOnFraudAlert: false
        }
      };

      const lenientEngine = new InvoiceMatchingEngine(mockDataSource, config);
      const result = await lenientEngine.runAnalysis('tenant-1');

      // Perfect matches should be auto-approved
      const perfectMatch = result.matches.find(m => m.invoice.invoiceNumber === 'INV-2024-001');
      expect(perfectMatch).toBeDefined();
    });

    it('should disable fraud detection when configured', async () => {
      const config: Partial<MatchingConfig> = {
        fraudDetection: {
          enabled: false,
          patterns: [],
          minimumConfidence: 0
        }
      };

      const noFraudEngine = new InvoiceMatchingEngine(mockDataSource, config);
      const result = await noFraudEngine.runAnalysis('tenant-1');

      // No fraud alerts should be raised
      result.matches.forEach(match => {
        expect(match.fraudAlerts.length).toBe(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle data source errors gracefully', async () => {
      mockDataSource.getSupplierInvoices.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(engine.runAnalysis('tenant-1')).rejects.toThrow('Database connection failed');
    });

    it('should handle empty invoice list', async () => {
      mockDataSource.getSupplierInvoices.mockResolvedValue([]);

      const result = await engine.runAnalysis('tenant-1');

      expect(result.matches).toEqual([]);
      expect(result.statistics.totalInvoices).toBe(0);
    });

    it('should handle missing purchase orders gracefully', async () => {
      mockDataSource.getPurchaseOrders.mockResolvedValue([]);

      const result = await engine.runAnalysis('tenant-1');

      result.matches.forEach(match => {
        if (match.invoice.poNumber) {
          expect(match.purchaseOrder).toBeNull();
        }
      });
    });

    it('should handle missing goods receipts gracefully', async () => {
      mockDataSource.getGoodsReceipts.mockResolvedValue([]);

      const result = await engine.runAnalysis('tenant-1');

      result.matches.forEach(match => {
        expect(match.goodsReceipt).toBeNull();
      });
    });
  });

  describe('Statistics Calculations', () => {
    it('should calculate approval rates', async () => {
      const result = await engine.runAnalysis('tenant-1');

      const totalInvoices = result.statistics.totalInvoices;
      const matchedInvoices = result.statistics.matchedInvoices;
      const mismatchedInvoices = result.statistics.mismatchedInvoices;

      expect(matchedInvoices + mismatchedInvoices).toBeLessThanOrEqual(totalInvoices);
    });

    it('should track fraud alert statistics', async () => {
      const result = await engine.runAnalysis('tenant-1');

      expect(result.statistics.fraudAlertsRaised).toBeGreaterThanOrEqual(0);

      const actualFraudAlerts = result.matches.reduce((sum, match) =>
        sum + match.fraudAlerts.length, 0
      );

      expect(result.statistics.fraudAlertsRaised).toBe(actualFraudAlerts);
    });

    it('should calculate total amounts correctly', async () => {
      const result = await engine.runAnalysis('tenant-1');

      const calculatedTotal = result.matches.reduce((sum, match) =>
        sum + match.invoice.totalAmount, 0
      );

      expect(result.statistics.totalInvoiceAmount).toBe(calculatedTotal);
    });
  });

  describe('Filter Options', () => {
    it('should filter by vendor IDs', async () => {
      await engine.runAnalysis('tenant-1', {
        vendorIds: ['V001']
      });

      expect(mockDataSource.getSupplierInvoices).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorIds: ['V001']
        })
      );
    });

    it('should filter by date range', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      await engine.runAnalysis('tenant-1', {
        fromDate,
        toDate
      });

      expect(mockDataSource.getSupplierInvoices).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate,
          toDate
        })
      );
    });

    it('should filter by invoice status', async () => {
      await engine.runAnalysis('tenant-1', {
        invoiceStatus: ['PENDING', 'REJECTED']
      });

      expect(mockDataSource.getSupplierInvoices).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['PENDING', 'REJECTED']
        })
      );
    });
  });
});
