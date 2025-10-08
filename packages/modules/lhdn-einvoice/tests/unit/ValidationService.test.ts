/**
 * ValidationService Unit Tests
 *
 * Tests LHDN invoice validation rules
 */

import { ValidationService } from '../../src/services/ValidationService';
import { LHDNInvoice, LHDNParty, LHDNLineItem } from '../../src/types';

describe('ValidationService', () => {
  let validationService: ValidationService;

  const createValidInvoice = (): LHDNInvoice => ({
    id: 'inv-123',
    tenantId: 'tenant-123',
    invoiceNumber: 'INV-2024-001',
    documentType: '01',
    status: 'DRAFT',
    invoiceDate: new Date('2024-01-15'),
    currency: 'MYR',
    supplier: {
      tin: '009876543210',
      name: 'XYZ Sdn Bhd',
      address: {
        line1: 'Jalan Sultan Ismail',
        city: 'Kuala Lumpur',
        state: 'Wilayah Persekutuan Kuala Lumpur',
        postalCode: '50250',
        country: 'MY',
      },
      contact: {
        phone: '+60387654321',
        email: 'billing@xyz.com.my',
      },
    },
    buyer: {
      tin: '001234567890',
      name: 'ABC Sdn Bhd',
      address: {
        line1: 'Jalan Ampang',
        city: 'Kuala Lumpur',
        state: 'Wilayah Persekutuan Kuala Lumpur',
        postalCode: '50450',
        country: 'MY',
      },
    },
    lineItems: [
      {
        lineNumber: 1,
        description: 'Test Product',
        quantity: 10,
        unitPrice: 100,
        taxType: 'SR',
        taxRate: 6,
        taxAmount: 60,
        subtotal: 1000,
        total: 1060,
      },
    ],
    subtotalAmount: 1000,
    totalTaxAmount: 60,
    totalAmount: 1060,
    sapBillingDocument: '9000000001',
    sapCompanyCode: '1000',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
  });

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('validateForSubmission', () => {
    it('should validate a correct invoice successfully', async () => {
      const invoice = createValidInvoice();
      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invoice with invalid TIN format', async () => {
      const invoice = createValidInvoice();
      invoice.supplier.tin = '12345'; // Too short

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'supplier.tin')).toBe(true);
    });

    it('should reject invoice with future invoice date', async () => {
      const invoice = createValidInvoice();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      invoice.invoiceDate = futureDate;

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'invoiceDate')).toBe(true);
    });

    it('should reject invoice with invalid currency (non-MYR)', async () => {
      const invoice = createValidInvoice();
      invoice.currency = 'USD';

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'currency')).toBe(true);
    });

    it('should reject invoice with empty line items', async () => {
      const invoice = createValidInvoice();
      invoice.lineItems = [];

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'lineItems')).toBe(true);
    });

    it('should reject invoice with more than 999 line items', async () => {
      const invoice = createValidInvoice();
      invoice.lineItems = Array.from({ length: 1000 }, (_, i) => ({
        lineNumber: i + 1,
        description: `Item ${i + 1}`,
        quantity: 1,
        unitPrice: 100,
        taxType: 'SR' as const,
        taxRate: 6,
        taxAmount: 6,
        subtotal: 100,
        total: 106,
      }));

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'lineItems')).toBe(true);
    });

    it('should reject invoice with incorrect total amounts', async () => {
      const invoice = createValidInvoice();
      invoice.totalAmount = 9999; // Incorrect total

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'totalAmount')).toBe(true);
    });

    it('should reject invoice with negative amounts', async () => {
      const invoice = createValidInvoice();
      invoice.subtotalAmount = -1000;

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'subtotalAmount')).toBe(true);
    });

    it('should reject invoice with invalid tax calculation', async () => {
      const invoice = createValidInvoice();
      invoice.lineItems[0].taxAmount = 999; // Wrong tax amount

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'LHDN-TAX-CALC')).toBe(true);
    });

    it('should reject invoice with missing supplier TIN', async () => {
      const invoice = createValidInvoice();
      invoice.supplier.tin = '';

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'supplier.tin')).toBe(true);
    });

    it('should reject invoice with missing buyer name', async () => {
      const invoice = createValidInvoice();
      invoice.buyer.name = '';

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'buyer.name')).toBe(true);
    });

    it('should reject invoice with invalid postal code', async () => {
      const invoice = createValidInvoice();
      invoice.supplier.address.postalCode = 'INVALID';

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field.includes('postalCode'))).toBe(true);
    });

    it('should reject invoice with zero quantity line item', async () => {
      const invoice = createValidInvoice();
      invoice.lineItems[0].quantity = 0;

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field.includes('quantity'))).toBe(true);
    });

    it('should validate invoice with discount correctly', async () => {
      const invoice = createValidInvoice();
      invoice.lineItems[0].discountAmount = 100;
      invoice.lineItems[0].subtotal = 900; // 1000 - 100
      invoice.lineItems[0].total = 954; // 900 + 54 tax
      invoice.lineItems[0].taxAmount = 54;
      invoice.subtotalAmount = 900;
      invoice.totalTaxAmount = 54;
      invoice.totalAmount = 954;
      invoice.totalDiscountAmount = 100;

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate multiple line items with different tax rates', async () => {
      const invoice = createValidInvoice();
      invoice.lineItems = [
        {
          lineNumber: 1,
          description: 'Taxed Item',
          quantity: 10,
          unitPrice: 100,
          taxType: 'SR',
          taxRate: 6,
          taxAmount: 60,
          subtotal: 1000,
          total: 1060,
        },
        {
          lineNumber: 2,
          description: 'Exempt Item',
          quantity: 5,
          unitPrice: 200,
          taxType: 'E',
          taxRate: 0,
          taxAmount: 0,
          subtotal: 1000,
          total: 1000,
        },
      ];
      invoice.subtotalAmount = 2000;
      invoice.totalTaxAmount = 60;
      invoice.totalAmount = 2060;

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should provide detailed error messages', async () => {
      const invoice = createValidInvoice();
      invoice.invoiceNumber = ''; // Missing invoice number
      invoice.supplier.tin = '123'; // Invalid TIN

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.every(e => e.message.length > 0)).toBe(true);
      expect(result.errors.every(e => e.code.length > 0)).toBe(true);
    });

    it('should validate invoice number format (alphanumeric, max 20 chars)', async () => {
      const invoice = createValidInvoice();
      invoice.invoiceNumber = 'INV-2024-12345678901234567890-TOOLONG';

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'invoiceNumber')).toBe(true);
    });

    it('should accept valid invoice number (exactly 20 chars)', async () => {
      const invoice = createValidInvoice();
      invoice.invoiceNumber = 'INV20240000000000001'; // Exactly 20 chars

      const result = await validationService.validateForSubmission(invoice);

      expect(result.isValid).toBe(true);
    });
  });
});
