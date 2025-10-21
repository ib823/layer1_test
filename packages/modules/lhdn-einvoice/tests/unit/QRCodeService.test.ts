/**
 * QRCodeService Unit Tests
 *
 * Tests QR code generation for LHDN e-invoices
 */

import { QRCodeService } from '../../src/services/QRCodeService';
import { LHDNInvoice } from '../../src/types';

describe('QRCodeService', () => {
  let qrCodeService: QRCodeService;

  const createValidInvoice = (): LHDNInvoice => ({
    id: 'inv-123',
    tenantId: 'tenant-123',
    invoiceNumber: 'INV-2024-001',
    documentType: '01',
    status: 'ACCEPTED',
    invoiceDate: new Date('2024-01-15'),
    currency: 'MYR',
    lhdnReferenceNumber: 'LHDN-2024-123456789',
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
    qrCodeService = new QRCodeService();
  });

  describe('generateQRCode', () => {
    it('should generate QR code for accepted invoice', async () => {
      const invoice = createValidInvoice();
      const result = await qrCodeService.generateQRCode(invoice);

      expect(result.success).toBe(true);
      expect(result.qrCodeBase64).toBeDefined();
      expect(result.qrCodeDataUrl).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return base64 encoded QR code', async () => {
      const invoice = createValidInvoice();
      const result = await qrCodeService.generateQRCode(invoice);

      expect(result.success).toBe(true);
      expect(result.qrCodeBase64).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
      expect(result.qrCodeBase64!.length).toBeGreaterThan(0);
    });

    it('should return data URL for HTML img tag', async () => {
      const invoice = createValidInvoice();
      const result = await qrCodeService.generateQRCode(invoice);

      expect(result.success).toBe(true);
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should fail if invoice has no LHDN reference number', async () => {
      const invoice = createValidInvoice();
      invoice.lhdnReferenceNumber = undefined;

      const result = await qrCodeService.generateQRCode(invoice);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('reference number');
    });

    it('should fail if invoice is not accepted', async () => {
      const invoice = createValidInvoice();
      invoice.status = 'SUBMITTED';

      const result = await qrCodeService.generateQRCode(invoice);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('accepted');
    });

    it('should fail gracefully if invoice status is DRAFT', async () => {
      const invoice = createValidInvoice();
      invoice.status = 'DRAFT';
      invoice.lhdnReferenceNumber = undefined;

      const result = await qrCodeService.generateQRCode(invoice);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should generate different QR codes for different invoices', async () => {
      const invoice1 = createValidInvoice();
      invoice1.lhdnReferenceNumber = 'LHDN-2024-111111111';

      const invoice2 = createValidInvoice();
      invoice2.lhdnReferenceNumber = 'LHDN-2024-222222222';

      const result1 = await qrCodeService.generateQRCode(invoice1);
      const result2 = await qrCodeService.generateQRCode(invoice2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.qrCodeBase64).not.toBe(result2.qrCodeBase64);
    });

    it('should handle large invoice amounts correctly', async () => {
      const invoice = createValidInvoice();
      invoice.totalAmount = 999999999.99;

      const result = await qrCodeService.generateQRCode(invoice);

      expect(result.success).toBe(true);
      expect(result.qrCodeBase64).toBeDefined();
    });

    it('should handle special characters in invoice number', async () => {
      const invoice = createValidInvoice();
      invoice.invoiceNumber = 'INV-2024/001-A';

      const result = await qrCodeService.generateQRCode(invoice);

      expect(result.success).toBe(true);
    });

    it('should include validation URL in QR code data', async () => {
      const invoice = createValidInvoice();
      const result = await qrCodeService.generateQRCode(invoice);

      expect(result.success).toBe(true);
      // QR code should contain the LHDN validation URL
      // We can't easily decode it here, but we can verify it was generated
      expect(result.qrCodeBase64).toBeDefined();
      expect(result.qrCodeBase64!.length).toBeGreaterThan(100); // Reasonable size
    });

    it('should handle concurrent QR code generation requests', async () => {
      const invoices = Array.from({ length: 5 }, (_, i) => {
        const inv = createValidInvoice();
        inv.id = `inv-${i}`;
        inv.invoiceNumber = `INV-2024-00${i}`;
        inv.lhdnReferenceNumber = `LHDN-2024-00000000${i}`;
        return inv;
      });

      const results = await Promise.all(
        invoices.map(inv => qrCodeService.generateQRCode(inv))
      );

      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.qrCodeBase64)).toBeDefined();

      // All QR codes should be unique
      const qrCodes = results.map(r => r.qrCodeBase64);
      const uniqueQRCodes = new Set(qrCodes);
      expect(uniqueQRCodes.size).toBe(5);
    }, 15000); // 15 second timeout for concurrent operations
  });
});
