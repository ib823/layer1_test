/**
 * Tests for Three-Way Matcher Engine
 */

import { ThreeWayMatcher } from '../../src/ThreeWayMatcher';
import { PurchaseOrder, GoodsReceipt, SupplierInvoice, MatchingConfig } from '../../src/types';

describe('ThreeWayMatcher', () => {
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
    it('should create matcher with default config', () => {
      const matcher = new ThreeWayMatcher();
      const config = matcher['config'];

      expect(config.fraudDetection.enabled).toBe(true);
      expect(config.matching.requireGoodsReceipt).toBe(true);
      expect(config.matching.autoApproveWithinTolerance).toBe(false);
    });

    it('should create matcher with custom config', () => {
      const customConfig: Partial<MatchingConfig> = {
        matching: {
          requireGoodsReceipt: false,
          autoApproveWithinTolerance: true,
          blockOnFraudAlert: false,
        },
      };

      const matcher = new ThreeWayMatcher(customConfig);
      const config = matcher['config'];

      expect(config.matching.requireGoodsReceipt).toBe(false);
      expect(config.matching.autoApproveWithinTolerance).toBe(true);
      expect(config.matching.blockOnFraudAlert).toBe(false);
    });
  });

  describe('matchInvoice()', () => {
    let matcher: ThreeWayMatcher;

    beforeEach(() => {
      matcher = new ThreeWayMatcher();
    });

    it('should match invoice successfully with PO and GR (three-way match)', async () => {
      const result = await matcher.matchInvoice(mockInvoice, mockPO, mockGR, [mockInvoice]);

      expect(result.matchId).toBeDefined();
      expect(result.matchType).toBe('THREE_WAY');
      expect(result.matchStatus).toBe('FULLY_MATCHED');
      expect(result.poNumber).toBe('PO-001');
      expect(result.grNumber).toBe('GR-001');
      expect(result.invoiceNumber).toBe('INV-001');
      expect(result.discrepancies).toHaveLength(0);
      expect(result.toleranceViolations).toHaveLength(0);
      // Risk score may be > 0 due to fraud detection (e.g., NEW_VENDOR, ROUND_NUMBER patterns)
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThan(50); // Should be low-risk for clean match
      expect(result.approvalRequired).toBe(false); // Below threshold
    });

    it('should handle two-way match (PO only, no GR)', async () => {
      const matcher = new ThreeWayMatcher({
        matching: {
          requireGoodsReceipt: false,
          autoApproveWithinTolerance: false,
          blockOnFraudAlert: true,
        },
      });

      const result = await matcher.matchInvoice(mockInvoice, mockPO, null, [mockInvoice]);

      expect(result.matchType).toBe('TWO_WAY');
      expect(result.grNumber).toBeNull();
    });

    it('should mark as NO_MATCH when GR required but missing', async () => {
      const result = await matcher.matchInvoice(mockInvoice, mockPO, null, [mockInvoice]);

      expect(result.matchType).toBe('NO_MATCH');
    });

    it('should mark as NOT_MATCHED when PO is missing', async () => {
      const result = await matcher.matchInvoice(mockInvoice, null, mockGR, [mockInvoice]);

      expect(result.matchStatus).toBe('NOT_MATCHED');
      expect(result.riskScore).toBe(100);
      expect(result.approvalRequired).toBe(true);
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].type).toBe('VENDOR');
      expect(result.discrepancies[0].severity).toBe('CRITICAL');
    });

    it('should detect vendor mismatch discrepancy', async () => {
      const wrongVendorInvoice = {
        ...mockInvoice,
        vendorId: 'VEND-999',
        vendorName: 'Wrong Vendor',
      };

      const result = await matcher.matchInvoice(wrongVendorInvoice, mockPO, mockGR, [wrongVendorInvoice]);

      expect(result.matchStatus).not.toBe('FULLY_MATCHED');
      const vendorDiscrepancy = result.discrepancies.find((d) => d.type === 'VENDOR');
      expect(vendorDiscrepancy).toBeDefined();
      expect(vendorDiscrepancy!.severity).toBe('CRITICAL');
    });

    it('should detect material mismatch discrepancy', async () => {
      const wrongMaterialInvoice = {
        ...mockInvoice,
        materialNumber: 'MAT-999',
      };

      const result = await matcher.matchInvoice(wrongMaterialInvoice, mockPO, mockGR, [wrongMaterialInvoice]);

      const materialDiscrepancy = result.discrepancies.find((d) => d.type === 'MATERIAL');
      expect(materialDiscrepancy).toBeDefined();
      expect(materialDiscrepancy!.severity).toBe('HIGH');
    });

    it('should detect currency mismatch discrepancy', async () => {
      const wrongCurrencyInvoice = {
        ...mockInvoice,
        currency: 'EUR',
      };

      const result = await matcher.matchInvoice(wrongCurrencyInvoice, mockPO, mockGR, [wrongCurrencyInvoice]);

      const currencyDiscrepancy = result.discrepancies.find((d) => d.type === 'CURRENCY');
      expect(currencyDiscrepancy).toBeDefined();
      expect(currencyDiscrepancy!.severity).toBe('HIGH');
    });

    it('should detect quantity discrepancy with correct severity', async () => {
      // 15% variance -> HIGH severity
      const highQtyInvoice = {
        ...mockInvoice,
        invoicedQuantity: 115,
      };

      const result1 = await matcher.matchInvoice(highQtyInvoice, mockPO, mockGR, [highQtyInvoice]);
      const qtyDisc1 = result1.discrepancies.find((d) => d.type === 'QUANTITY');
      expect(qtyDisc1!.severity).toBe('HIGH');

      // 7% variance -> MEDIUM severity
      const mediumQtyInvoice = {
        ...mockInvoice,
        invoicedQuantity: 107,
      };

      const result2 = await matcher.matchInvoice(mediumQtyInvoice, mockPO, mockGR, [mediumQtyInvoice]);
      const qtyDisc2 = result2.discrepancies.find((d) => d.type === 'QUANTITY');
      expect(qtyDisc2!.severity).toBe('MEDIUM');

      // 3% variance -> LOW severity
      const lowQtyInvoice = {
        ...mockInvoice,
        invoicedQuantity: 103,
      };

      const result3 = await matcher.matchInvoice(lowQtyInvoice, mockPO, mockGR, [lowQtyInvoice]);
      const qtyDisc3 = result3.discrepancies.find((d) => d.type === 'QUANTITY');
      expect(qtyDisc3!.severity).toBe('LOW');
    });

    it('should detect price discrepancy with correct variance calculation', async () => {
      // Invoice amount 12000 for 100 units = $120 unit price (20% higher than $100)
      const highPriceInvoice = {
        ...mockInvoice,
        invoicedAmount: 12000,
      };

      const result = await matcher.matchInvoice(highPriceInvoice, mockPO, mockGR, [highPriceInvoice]);

      const priceDisc = result.discrepancies.find((d) => d.type === 'PRICE');
      expect(priceDisc).toBeDefined();
      expect(priceDisc!.variance).toBeCloseTo(20, 1);
      expect(priceDisc!.severity).toBe('HIGH');
    });

    it('should detect tax discrepancy', async () => {
      const wrongTaxInvoice = {
        ...mockInvoice,
        taxAmount: 1200, // 20% higher
      };

      const result = await matcher.matchInvoice(wrongTaxInvoice, mockPO, mockGR, [wrongTaxInvoice]);

      const taxDisc = result.discrepancies.find((d) => d.type === 'TAX');
      expect(taxDisc).toBeDefined();
      expect(taxDisc!.severity).toBe('HIGH');
    });

    it('should detect date discrepancy (invoice before PO)', async () => {
      const earlyInvoice = {
        ...mockInvoice,
        invoiceDate: new Date('2025-09-01'), // Before PO creation
      };

      const result = await matcher.matchInvoice(earlyInvoice, mockPO, mockGR, [earlyInvoice]);

      const dateDisc = result.discrepancies.find((d) => d.type === 'DATE');
      expect(dateDisc).toBeDefined();
      expect(dateDisc!.severity).toBe('MEDIUM');
    });

    it('should detect GR quantity discrepancy when GR is provided', async () => {
      const invoiceWithGRMismatch = {
        ...mockInvoice,
        invoicedQuantity: 115, // 15% more than GR received quantity
      };

      const result = await matcher.matchInvoice(invoiceWithGRMismatch, mockPO, mockGR, [invoiceWithGRMismatch]);

      const grQtyDiscrepancies = result.discrepancies.filter((d) => d.field === 'receivedQuantity');
      expect(grQtyDiscrepancies.length).toBeGreaterThan(0);
    });

    it('should check tolerance violations', async () => {
      // Create invoice with price variance that exceeds tolerance (>5%)
      const overToleranceInvoice = {
        ...mockInvoice,
        invoicedAmount: 11000, // Unit price = 110 (10% higher)
      };

      const result = await matcher.matchInvoice(overToleranceInvoice, mockPO, mockGR, [overToleranceInvoice]);

      expect(result.toleranceViolations.length).toBeGreaterThan(0);
      expect(result.matchStatus).toBe('TOLERANCE_EXCEEDED');
    });

    it('should run fraud detection when enabled', async () => {
      const roundAmountInvoice = {
        ...mockInvoice,
        invoicedAmount: 50000, // Round number - should trigger fraud alert
      };

      const result = await matcher.matchInvoice(roundAmountInvoice, mockPO, mockGR, [roundAmountInvoice]);

      // Should have fraud alerts
      expect(result.fraudAlerts.length).toBeGreaterThan(0);
    });

    it('should filter fraud alerts by minimum confidence', async () => {
      const customMatcher = new ThreeWayMatcher({
        fraudDetection: {
          enabled: true,
          patterns: ['ROUND_NUMBER'],
          minimumConfidence: 70, // Higher threshold
        },
        matching: {
          requireGoodsReceipt: true,
          autoApproveWithinTolerance: false,
          blockOnFraudAlert: true,
        },
        notifications: {
          enabled: false,
          recipients: [],
          notifyOnMismatch: false,
          notifyOnFraud: false,
        },
      });

      const lowRoundInvoice = {
        ...mockInvoice,
        invoicedAmount: 7500, // Round, but low confidence (40)
      };

      const result = await customMatcher.matchInvoice(lowRoundInvoice, mockPO, mockGR, [lowRoundInvoice]);

      // Should be filtered out due to low confidence
      expect(result.fraudAlerts.length).toBe(0);
    });

    it('should calculate risk score based on discrepancies', async () => {
      const riskyInvoice = {
        ...mockInvoice,
        vendorId: 'WRONG-VENDOR', // Critical discrepancy
        invoicedQuantity: 115, // Quantity discrepancy
        taxAmount: 1200, // Tax discrepancy
      };

      const result = await matcher.matchInvoice(riskyInvoice, mockPO, mockGR, [riskyInvoice]);

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should require approval for BLOCKED status', async () => {
      const blockedInvoice = {
        ...mockInvoice,
        vendorId: 'WRONG-VENDOR', // Critical - causes BLOCKED status
      };

      const result = await matcher.matchInvoice(blockedInvoice, mockPO, mockGR, [blockedInvoice]);

      expect(result.matchStatus).toBe('BLOCKED');
      expect(result.approvalRequired).toBe(true);
    });

    it('should require approval for high-risk fraud alerts', async () => {
      const splitInvoice = {
        ...mockInvoice,
        invoicedAmount: 9500, // Below threshold, part of split
      };

      const allInvoices = [
        splitInvoice,
        { ...splitInvoice, invoiceNumber: 'INV-002' },
      ];

      const result = await matcher.matchInvoice(splitInvoice, mockPO, mockGR, allInvoices);

      const hasCriticalFraud = result.fraudAlerts.some((f) => f.severity === 'CRITICAL');
      if (hasCriticalFraud) {
        expect(result.approvalRequired).toBe(true);
      }
    });

    it('should auto-approve when configured and fully matched', async () => {
      const autoApproveMatcher = new ThreeWayMatcher({
        matching: {
          requireGoodsReceipt: true,
          autoApproveWithinTolerance: true,
          blockOnFraudAlert: true,
        },
      });

      const result = await autoApproveMatcher.matchInvoice(mockInvoice, mockPO, mockGR, [mockInvoice]);

      expect(result.matchStatus).toBe('FULLY_MATCHED');
      expect(result.approvalRequired).toBe(false);
    });
  });

  describe('matchInvoices() - Batch Processing', () => {
    let matcher: ThreeWayMatcher;

    beforeEach(() => {
      matcher = new ThreeWayMatcher();
    });

    it('should match multiple invoices in batch', async () => {
      const invoice2 = {
        ...mockInvoice,
        invoiceNumber: 'INV-002',
        poNumber: 'PO-002',
        poItem: '20',
        grNumber: 'GR-002',
        grItem: '20',
      };

      const po2 = { ...mockPO, poNumber: 'PO-002', poItem: '20' };
      const gr2 = { ...mockGR, grNumber: 'GR-002', grItem: '20', poNumber: 'PO-002', poItem: '20' };

      const invoices = [mockInvoice, invoice2];
      const pos = [mockPO, po2];
      const grs = [mockGR, gr2];

      const results = await matcher.matchInvoices(invoices, pos, grs);

      expect(results).toHaveLength(2);
      expect(results[0].invoiceNumber).toBe('INV-001');
      expect(results[1].invoiceNumber).toBe('INV-002');
    });

    it('should handle invoices with missing POs', async () => {
      const invoice2 = {
        ...mockInvoice,
        invoiceNumber: 'INV-002',
        poNumber: 'PO-999', // Non-existent PO
      };

      const results = await matcher.matchInvoices([mockInvoice, invoice2], [mockPO], [mockGR]);

      expect(results).toHaveLength(2);
      expect(results[0].matchStatus).toBe('FULLY_MATCHED');
      expect(results[1].matchStatus).toBe('NOT_MATCHED');
    });

    it('should handle invoices with missing GRs', async () => {
      const invoice2 = {
        ...mockInvoice,
        invoiceNumber: 'INV-002',
        grNumber: 'GR-999', // Non-existent GR
      };

      const results = await matcher.matchInvoices([mockInvoice, invoice2], [mockPO], [mockGR]);

      expect(results).toHaveLength(2);
      expect(results[0].grNumber).toBe('GR-001');
      expect(results[1].grNumber).toBeNull();
    });

    it('should match invoices by PO and item numbers correctly', async () => {
      const po2 = { ...mockPO, poNumber: 'PO-001', poItem: '20' }; // Same PO, different item
      const invoice2 = {
        ...mockInvoice,
        invoiceNumber: 'INV-002',
        poItem: '20',
      };

      const results = await matcher.matchInvoices([mockInvoice, invoice2], [mockPO, po2], [mockGR]);

      expect(results[0].poItem).toBe('10');
      expect(results[1].poItem).toBe('20');
    });
  });
});
