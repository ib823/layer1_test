/**
 * Tests for Fraud Pattern Detection
 */

import {
  detectDuplicateInvoice,
  detectSplitInvoice,
  detectRoundNumber,
  detectWeekendSubmission,
  detectNewVendor,
  detectPriceManipulation,
  detectQuantityManipulation,
  detectInvoiceAging,
  detectAllFraudPatterns,
} from '../../src/rules/fraudPatterns';
import { SupplierInvoice, PurchaseOrder } from '../../src/types';

describe('Fraud Pattern Detection', () => {
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
    totalAmount: 11000,
    currency: 'USD',
    invoiceDate: new Date('2025-10-01'),
    postingDate: new Date('2025-10-02'),
    dueDate: new Date('2025-10-31'),
    paymentTerms: 'Net 30',
    invoiceStatus: 'PENDING',
    submittedBy: 'user@example.com',
    submittedAt: new Date('2025-10-01T14:00:00Z'), // Tuesday 2pm
  };

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

  describe('detectDuplicateInvoice()', () => {
    it('should detect duplicate invoice with same amount and vendor within 30 days', () => {
      const otherInvoices: SupplierInvoice[] = [
        {
          ...mockInvoice,
          invoiceNumber: 'INV-002', // Different invoice number
          invoiceDate: new Date('2025-10-05'), // 4 days later
        },
      ];

      const alert = detectDuplicateInvoice(mockInvoice, otherInvoices);

      expect(alert).not.toBeNull();
      expect(alert!.pattern).toBe('DUPLICATE_INVOICE');
      expect(alert!.severity).toBe('HIGH');
      expect(alert!.confidence).toBe(85);
      expect(alert!.evidence.duplicateInvoices).toContain('INV-002');
    });

    it('should not detect duplicate if invoices are more than 30 days apart', () => {
      const otherInvoices: SupplierInvoice[] = [
        {
          ...mockInvoice,
          invoiceNumber: 'INV-002',
          invoiceDate: new Date('2025-11-05'), // 35 days later
        },
      ];

      const alert = detectDuplicateInvoice(mockInvoice, otherInvoices);
      expect(alert).toBeNull();
    });

    it('should not detect duplicate if amounts are different', () => {
      const otherInvoices: SupplierInvoice[] = [
        {
          ...mockInvoice,
          invoiceNumber: 'INV-002',
          invoicedAmount: 15000, // Different amount
        },
      ];

      const alert = detectDuplicateInvoice(mockInvoice, otherInvoices);
      expect(alert).toBeNull();
    });

    it('should not detect duplicate if vendors are different', () => {
      const otherInvoices: SupplierInvoice[] = [
        {
          ...mockInvoice,
          invoiceNumber: 'INV-002',
          vendorId: 'VEND-456', // Different vendor
        },
      ];

      const alert = detectDuplicateInvoice(mockInvoice, otherInvoices);
      expect(alert).toBeNull();
    });

    it('should handle multiple duplicates', () => {
      const otherInvoices: SupplierInvoice[] = [
        { ...mockInvoice, invoiceNumber: 'INV-002' },
        { ...mockInvoice, invoiceNumber: 'INV-003' },
        { ...mockInvoice, invoiceNumber: 'INV-004' },
      ];

      const alert = detectDuplicateInvoice(mockInvoice, otherInvoices);
      expect(alert).not.toBeNull();
      expect(alert!.evidence.duplicateInvoices).toHaveLength(3);
    });
  });

  describe('detectSplitInvoice()', () => {
    it('should detect split invoice below approval threshold', () => {
      const invoicesOnSameDay: SupplierInvoice[] = [
        { ...mockInvoice, invoiceNumber: 'INV-001', invoicedAmount: 9500 },
        { ...mockInvoice, invoiceNumber: 'INV-002', invoicedAmount: 9500 },
      ];

      const alert = detectSplitInvoice(invoicesOnSameDay[0], invoicesOnSameDay, 10000);

      expect(alert).not.toBeNull();
      expect(alert!.pattern).toBe('SPLIT_INVOICE');
      expect(alert!.severity).toBe('CRITICAL');
      expect(alert!.confidence).toBe(90);
      expect(alert!.evidence.totalAmount).toBe(19000);
      expect(alert!.evidence.approvalThreshold).toBe(10000);
    });

    it('should not detect split if only one invoice on same day', () => {
      const alert = detectSplitInvoice(mockInvoice, [mockInvoice], 10000);
      expect(alert).toBeNull();
    });

    it('should not detect split if total is below threshold', () => {
      const invoicesOnSameDay: SupplierInvoice[] = [
        { ...mockInvoice, invoiceNumber: 'INV-001', invoicedAmount: 4000 },
        { ...mockInvoice, invoiceNumber: 'INV-002', invoicedAmount: 5000 },
      ];

      const alert = detectSplitInvoice(invoicesOnSameDay[0], invoicesOnSameDay, 10000);
      expect(alert).toBeNull();
    });

    it('should not detect split if invoices are on different days', () => {
      const invoicesOnDifferentDays: SupplierInvoice[] = [
        { ...mockInvoice, invoiceNumber: 'INV-001', invoiceDate: new Date('2025-10-01') },
        { ...mockInvoice, invoiceNumber: 'INV-002', invoiceDate: new Date('2025-10-02') },
      ];

      const alert = detectSplitInvoice(invoicesOnDifferentDays[0], invoicesOnDifferentDays, 10000);
      expect(alert).toBeNull();
    });
  });

  describe('detectRoundNumber()', () => {
    it('should detect suspiciously round thousand amounts', () => {
      const roundInvoice = { ...mockInvoice, invoicedAmount: 50000 };
      const alert = detectRoundNumber(roundInvoice);

      expect(alert).not.toBeNull();
      expect(alert!.pattern).toBe('ROUND_NUMBER');
      expect(alert!.severity).toBe('MEDIUM');
      expect(alert!.confidence).toBe(60);
      expect(alert!.evidence.roundingFactor).toBe(1000);
    });

    it('should detect round hundred amounts (500 multiple)', () => {
      const roundInvoice = { ...mockInvoice, invoicedAmount: 7500 };
      const alert = detectRoundNumber(roundInvoice);

      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe('LOW');
      expect(alert!.confidence).toBe(40);
      expect(alert!.evidence.roundingFactor).toBe(500);
    });

    it('should not flag amounts below thresholds', () => {
      const smallRoundInvoice = { ...mockInvoice, invoicedAmount: 2000 }; // Below 5000 threshold
      const alert = detectRoundNumber(smallRoundInvoice);
      expect(alert).toBeNull();
    });

    it('should not flag non-round amounts', () => {
      const nonRoundInvoice = { ...mockInvoice, invoicedAmount: 10347.52 };
      const alert = detectRoundNumber(nonRoundInvoice);
      expect(alert).toBeNull();
    });
  });

  describe('detectWeekendSubmission()', () => {
    it('should detect Saturday submission', () => {
      const saturdayInvoice = {
        ...mockInvoice,
        submittedAt: new Date('2025-10-04T14:00:00Z'), // Saturday
      };

      const alert = detectWeekendSubmission(saturdayInvoice);

      expect(alert).not.toBeNull();
      expect(alert!.pattern).toBe('WEEKEND_SUBMISSION');
      expect(alert!.severity).toBe('MEDIUM');
      expect(alert!.evidence.dayOfWeek).toBe('Saturday');
    });

    it('should detect Sunday submission', () => {
      const sundayInvoice = {
        ...mockInvoice,
        submittedAt: new Date('2025-10-05T14:00:00Z'), // Sunday
      };

      const alert = detectWeekendSubmission(sundayInvoice);
      expect(alert).not.toBeNull();
      expect(alert!.evidence.dayOfWeek).toBe('Sunday');
    });

    it('should detect early morning submission (non-business hours)', () => {
      const earlyInvoice = {
        ...mockInvoice,
        submittedAt: new Date('2025-10-01T03:00:00Z'), // 3 AM
      };

      const alert = detectWeekendSubmission(earlyInvoice);
      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe('LOW');
      expect(alert!.confidence).toBe(50);
    });

    it('should detect late night submission (non-business hours)', () => {
      const lateInvoice = {
        ...mockInvoice,
        submittedAt: new Date('2025-10-01T23:00:00Z'), // 11 PM
      };

      const alert = detectWeekendSubmission(lateInvoice);
      expect(alert).not.toBeNull();
    });

    it('should not flag weekday business hours submissions', () => {
      const businessHoursInvoice = {
        ...mockInvoice,
        submittedAt: new Date('2025-10-01T14:00:00Z'), // Tuesday 2 PM
      };

      const alert = detectWeekendSubmission(businessHoursInvoice);
      expect(alert).toBeNull();
    });

    it('should return null if submittedAt is not set', () => {
      const noSubmissionTime = { ...mockInvoice, submittedAt: undefined };
      const alert = detectWeekendSubmission(noSubmissionTime);
      expect(alert).toBeNull();
    });
  });

  describe('detectNewVendor()', () => {
    it('should detect first invoice from new vendor', () => {
      const alert = detectNewVendor(mockInvoice, [mockInvoice]);

      expect(alert).not.toBeNull();
      expect(alert!.pattern).toBe('NEW_VENDOR');
      expect(alert!.severity).toBe('MEDIUM');
      expect(alert!.confidence).toBe(70);
      expect(alert!.evidence.isFirstInvoice).toBe(true);
    });

    it('should detect relatively new vendor (< 90 days, < 5 invoices)', () => {
      const recentInvoices: SupplierInvoice[] = [
        { ...mockInvoice, invoiceDate: new Date('2025-09-01') }, // 30 days ago
        { ...mockInvoice, invoiceDate: new Date('2025-09-15') },
        { ...mockInvoice, invoiceDate: new Date('2025-10-01') },
      ];

      const alert = detectNewVendor(mockInvoice, recentInvoices, 90);

      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe('LOW');
      expect(alert!.confidence).toBe(55);
    });

    it('should not flag established vendors', () => {
      const establishedInvoices: SupplierInvoice[] = [];
      for (let i = 0; i < 10; i++) {
        establishedInvoices.push({
          ...mockInvoice,
          invoiceDate: new Date(2024, 0, i + 1), // Started in Jan 2024
        });
      }

      const alert = detectNewVendor(mockInvoice, establishedInvoices, 90);
      expect(alert).toBeNull();
    });
  });

  describe('detectPriceManipulation()', () => {
    it('should detect significant price variance (30%+)', () => {
      const expensiveInvoice = { ...mockInvoice, invoicedAmount: 13500 }; // Unit price = 135 (35% higher)

      const alert = detectPriceManipulation(expensiveInvoice, mockPO, 15);

      expect(alert).not.toBeNull();
      expect(alert!.pattern).toBe('PRICE_MANIPULATION');
      expect(alert!.severity).toBe('CRITICAL');
      expect(alert!.evidence.variancePercent).toBeCloseTo(35, 1);
    });

    it('should detect moderate price variance (20-30%)', () => {
      const moderateInvoice = { ...mockInvoice, invoicedAmount: 12500 }; // Unit price = 125 (25% higher)

      const alert = detectPriceManipulation(moderateInvoice, mockPO, 15);

      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe('HIGH');
    });

    it('should detect low-medium price variance (15-20%)', () => {
      const slightInvoice = { ...mockInvoice, invoicedAmount: 11800 }; // Unit price = 118 (18% higher)

      const alert = detectPriceManipulation(slightInvoice, mockPO, 15);

      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe('MEDIUM');
    });

    it('should not flag variance below threshold', () => {
      const acceptableInvoice = { ...mockInvoice, invoicedAmount: 11000 }; // Unit price = 110 (10% higher)

      const alert = detectPriceManipulation(acceptableInvoice, mockPO, 15);
      expect(alert).toBeNull();
    });

    it('should detect price decreases as well as increases', () => {
      const cheapInvoice = { ...mockInvoice, invoicedAmount: 7000 }; // Unit price = 70 (30% lower)

      const alert = detectPriceManipulation(cheapInvoice, mockPO, 15);
      expect(alert).not.toBeNull();
    });
  });

  describe('detectQuantityManipulation()', () => {
    it('should detect critical quantity variance (25%+)', () => {
      const overInvoice = { ...mockInvoice, invoicedQuantity: 130 }; // 30% more

      const alert = detectQuantityManipulation(overInvoice, mockPO, 10);

      expect(alert).not.toBeNull();
      expect(alert!.pattern).toBe('QUANTITY_MANIPULATION');
      expect(alert!.severity).toBe('CRITICAL');
      expect(alert!.evidence.variancePercent).toBe(30);
    });

    it('should detect high quantity variance (15-25%)', () => {
      const moderateInvoice = { ...mockInvoice, invoicedQuantity: 120 }; // 20% more

      const alert = detectQuantityManipulation(moderateInvoice, mockPO, 10);

      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe('HIGH');
    });

    it('should detect medium quantity variance (10-15%)', () => {
      const slightInvoice = { ...mockInvoice, invoicedQuantity: 112 }; // 12% more

      const alert = detectQuantityManipulation(slightInvoice, mockPO, 10);

      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe('MEDIUM');
    });

    it('should not flag variance below threshold', () => {
      const acceptableInvoice = { ...mockInvoice, invoicedQuantity: 105 }; // 5% more

      const alert = detectQuantityManipulation(acceptableInvoice, mockPO, 10);
      expect(alert).toBeNull();
    });
  });

  describe('detectInvoiceAging()', () => {
    it('should detect invoice submitted > 180 days after delivery (high severity)', () => {
      const oldInvoice = {
        ...mockInvoice,
        invoiceDate: new Date('2026-04-30'), // 7 months after delivery
      };

      const alert = detectInvoiceAging(oldInvoice, mockPO, 90);

      expect(alert).not.toBeNull();
      expect(alert!.pattern).toBe('INVOICE_AGING');
      expect(alert!.severity).toBe('HIGH');
      expect(alert!.confidence).toBe(75);
    });

    it('should detect invoice submitted > 90 days after delivery (medium severity)', () => {
      const lateInvoice = {
        ...mockInvoice,
        invoiceDate: new Date('2026-01-15'), // ~3.5 months after delivery
      };

      const alert = detectInvoiceAging(lateInvoice, mockPO, 90);

      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe('MEDIUM');
    });

    it('should not flag invoice within acceptable timeframe', () => {
      const timelyInvoice = {
        ...mockInvoice,
        invoiceDate: new Date('2025-10-15'), // 15 days after delivery
      };

      const alert = detectInvoiceAging(timelyInvoice, mockPO, 90);
      expect(alert).toBeNull();
    });

    it('should respect custom maxDays threshold', () => {
      const invoiceAt60Days = {
        ...mockInvoice,
        invoiceDate: new Date('2025-11-29'), // 60 days after delivery
      };

      // Should not alert with 90-day threshold
      expect(detectInvoiceAging(invoiceAt60Days, mockPO, 90)).toBeNull();

      // Should alert with 30-day threshold
      expect(detectInvoiceAging(invoiceAt60Days, mockPO, 30)).not.toBeNull();
    });
  });

  describe('detectAllFraudPatterns()', () => {
    it('should run all enabled fraud patterns', () => {
      const allInvoices = [mockInvoice];

      const alerts = detectAllFraudPatterns(mockInvoice, mockPO, allInvoices);

      // Should return an array (may be empty if no fraud detected)
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should detect multiple fraud patterns on suspicious invoice', () => {
      const suspiciousInvoice: SupplierInvoice = {
        ...mockInvoice,
        invoicedAmount: 50000, // Round number
        invoicedQuantity: 130, // 30% quantity variance
        submittedAt: new Date('2025-10-05T14:00:00Z'), // Sunday
      };

      const alerts = detectAllFraudPatterns(suspiciousInvoice, mockPO, [suspiciousInvoice]);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some((a) => a.pattern === 'ROUND_NUMBER')).toBe(true);
      expect(alerts.some((a) => a.pattern === 'QUANTITY_MANIPULATION')).toBe(true);
      expect(alerts.some((a) => a.pattern === 'WEEKEND_SUBMISSION')).toBe(true);
    });

    it('should respect enabled patterns filter', () => {
      const roundInvoice = { ...mockInvoice, invoicedAmount: 50000 };

      // Only enable ROUND_NUMBER pattern
      const alerts = detectAllFraudPatterns(roundInvoice, mockPO, [roundInvoice], ['ROUND_NUMBER']);

      expect(alerts.length).toBe(1);
      expect(alerts[0].pattern).toBe('ROUND_NUMBER');
    });

    it('should handle PO-dependent patterns gracefully when PO is null', () => {
      const alerts = detectAllFraudPatterns(mockInvoice, null, [mockInvoice]);

      // Should still detect non-PO patterns
      expect(Array.isArray(alerts)).toBe(true);

      // Should not have PO-dependent patterns
      expect(alerts.some((a) => a.pattern === 'PRICE_MANIPULATION')).toBe(false);
      expect(alerts.some((a) => a.pattern === 'QUANTITY_MANIPULATION')).toBe(false);
      expect(alerts.some((a) => a.pattern === 'INVOICE_AGING')).toBe(false);
    });

    it('should return empty array when no fraud detected', () => {
      const cleanInvoice = {
        ...mockInvoice,
        invoicedAmount: 10234.56, // Non-round
        submittedAt: new Date('2025-10-01T14:00:00Z'), // Tuesday
      };

      const establishedVendorInvoices = Array(20)
        .fill(null)
        .map((_, i) => ({
          ...cleanInvoice,
          invoiceNumber: `INV-${i}`,
          invoiceDate: new Date(2024, i % 12, 1),
        }));

      const alerts = detectAllFraudPatterns(cleanInvoice, mockPO, establishedVendorInvoices);

      expect(alerts).toHaveLength(0);
    });
  });
});
