/**
 * MappingService Unit Tests
 *
 * Tests SAP to LHDN invoice mapping functionality
 */

import { MappingService } from '../../src/services/MappingService';
import { LHDNTaxType } from '../../src/types';
import { MappingContext, SAPBillingDocument, SAPBillingDocumentItem } from '../../src/types/sap-mapping';

describe('MappingService', () => {
  let mappingService: MappingService;

  beforeEach(() => {
    mappingService = new MappingService();
  });

  describe('mapBillingDocumentToInvoice', () => {
    it('should successfully map a valid SAP billing document to LHDN invoice', async () => {
      const context: MappingContext = {
        tenantId: 'tenant-123',
        sapBillingDocument: {
          BillingDocument: '9000000001',
          BillingDocumentType: 'F2',
          SoldToParty: '1000001',
          BillingDocumentDate: '2024-01-15',
          TransactionCurrency: 'MYR',
          TotalNetAmount: '1000.00',
          TotalTaxAmount: '60.00',
          TotalGrossAmount: '1060.00',
          PaymentTerms: 'Z001',
          PurchaseOrderByCustomer: 'PO-2024-001',
          CompanyCode: '1000',
        },
        sapItems: [
          {
            BillingDocument: '9000000001',
            BillingDocumentItem: '000010',
            Material: 'MAT-001',
            BillingDocumentItemText: 'Test Product',
            BillingQuantity: '10',
            BillingQuantityUnit: 'EA',
            NetAmount: '1000.00',
            TaxAmount: '60.00',
            GrossAmount: '1060.00',
            TaxCode: 'V6',
            ItemNetAmount: '1000.00',
            ItemGrossAmount: '1060.00',
          },
        ],
        buyerBusinessPartner: {
          BusinessPartner: '1000001',
          BusinessPartnerName: 'ABC Sdn Bhd',
          BusinessPartnerCategory: '2',
          TaxNumber3: '001234567890',
          to_BusinessPartnerAddress: [
            {
              AddressID: 'ADDR-001',
              StreetName: 'Jalan Ampang',
              HouseNumber: '100',
              CityName: 'Kuala Lumpur',
              Region: '14',
              PostalCode: '50450',
              Country: 'MY',
              to_EmailAddress: [{ EmailAddress: 'info@abc.com.my' }],
              to_PhoneNumber: [{ PhoneNumber: '+60312345678' }],
            },
          ],
        },
        tenantConfig: {
          tenantId: 'tenant-123',
          clientId: 'client-123',
          clientSecret: 'secret-123',
          apiBaseUrl: 'https://api-sandbox.myinvois.hasil.gov.my',
          environment: 'SANDBOX',
          companyTin: '009876543210',
          companyName: 'XYZ Sdn Bhd',
          companyAddress: {
            line1: 'Jalan Sultan Ismail',
            city: 'Kuala Lumpur',
            state: 'WP Kuala Lumpur',
            postalCode: '50250',
            country: 'MY',
          },
          companyContact: {
            phone: '+60387654321',
            email: 'billing@xyz.com.my',
          },
          invoicePrefix: 'INV-',
          autoSubmit: false,
          validateBeforePost: true,
          generateQrCode: true,
          notificationEmails: ['finance@xyz.com.my'],
          webhookUrl: 'https://api.xyz.com.my/webhooks/lhdn',
          taxCodeMapping: {
            'V6': 'SR',
            'V0': 'SR',
            'VE': 'E',
            'VZ': 'ZP',
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = await mappingService.mapBillingDocumentToInvoice(context);

      expect(result.success).toBe(true);
      expect(result.invoice).toBeDefined();
      expect(result.errors).toHaveLength(0);

      const invoice = result.invoice!;
      expect(invoice.invoiceNumber).toBe('INV-9000000001');
      expect(invoice.documentType).toBe('01');
      expect(invoice.currency).toBe('MYR');
      expect(invoice.subtotalAmount).toBe(1000);
      expect(invoice.totalTaxAmount).toBe(60);
      expect(invoice.totalAmount).toBe(1060);
      expect(invoice.sapBillingDocument).toBe('9000000001');
      expect(invoice.sapCompanyCode).toBe('1000');
      expect(invoice.purchaseOrderRef).toBe('PO-2024-001');

      // Supplier
      expect(invoice.supplier).toBeDefined();
      expect(invoice.supplier.tin).toBe('009876543210');
      expect(invoice.supplier.name).toBe('XYZ Sdn Bhd');

      // Buyer
      expect(invoice.buyer).toBeDefined();
      expect(invoice.buyer.tin).toBe('001234567890');
      expect(invoice.buyer.name).toBe('ABC Sdn Bhd');
      expect(invoice.buyer.address.city).toBe('Kuala Lumpur');
      expect(invoice.buyer.address.state).toBe('Wilayah Persekutuan Kuala Lumpur');

      // Line items
      expect(invoice.lineItems).toHaveLength(1);
      expect(invoice.lineItems[0].description).toBe('Test Product');
      expect(invoice.lineItems[0].quantity).toBe(10);
      expect(invoice.lineItems[0].taxType).toBe('SR');
      expect(invoice.lineItems[0].taxRate).toBe(6);
    });

    it('should handle missing buyer business partner with error', async () => {
      const context: MappingContext = {
        tenantId: 'tenant-123',
        sapBillingDocument: {
          BillingDocument: '9000000001',
          BillingDocumentType: 'F2',
          SoldToParty: '1000001',
          BillingDocumentDate: '2024-01-15',
          TransactionCurrency: 'MYR',
          TotalNetAmount: '1000.00',
          TotalTaxAmount: '60.00',
          TotalGrossAmount: '1060.00',
          CompanyCode: '1000',
        },
        sapItems: [],
        buyerBusinessPartner: undefined,
        tenantConfig: {
          tenantId: 'tenant-123',
          clientId: 'client-123',
          clientSecret: 'secret-123',
          apiBaseUrl: 'https://api-sandbox.myinvois.hasil.gov.my',
          environment: 'SANDBOX',
          companyTin: '009876543210',
          companyName: 'XYZ Sdn Bhd',
          companyAddress: {
            line1: 'Jalan Sultan Ismail',
            city: 'Kuala Lumpur',
            state: 'WP Kuala Lumpur',
            postalCode: '50250',
            country: 'MY',
          },
          invoicePrefix: 'INV-',
          autoSubmit: false,
          validateBeforePost: true,
          generateQrCode: true,
          notificationEmails: [],
          taxCodeMapping: { 'V6': 'SR' },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = await mappingService.mapBillingDocumentToInvoice(context);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'buyer')).toBe(true);
    });

    it('should warn when currency is not MYR', async () => {
      const context: MappingContext = {
        tenantId: 'tenant-123',
        sapBillingDocument: {
          BillingDocument: '9000000001',
          BillingDocumentType: 'F2',
          SoldToParty: '1000001',
          BillingDocumentDate: '2024-01-15',
          TransactionCurrency: 'USD',
          TotalNetAmount: '1000.00',
          TotalTaxAmount: '60.00',
          TotalGrossAmount: '1060.00',
          CompanyCode: '1000',
        },
        sapItems: [],
        buyerBusinessPartner: {
          BusinessPartner: '1000001',
          BusinessPartnerName: 'ABC Sdn Bhd',
          BusinessPartnerCategory: '2',
          TaxNumber3: '001234567890',
          to_BusinessPartnerAddress: [
            {
              AddressID: 'ADDR-001',
              CityName: 'Kuala Lumpur',
              Region: '14',
              PostalCode: '50450',
              Country: 'MY',
            },
          ],
        },
        tenantConfig: {
          tenantId: 'tenant-123',
          clientId: 'client-123',
          clientSecret: 'secret-123',
          apiBaseUrl: 'https://api-sandbox.myinvois.hasil.gov.my',
          environment: 'SANDBOX',
          companyTin: '009876543210',
          companyName: 'XYZ Sdn Bhd',
          companyAddress: {
            line1: 'Jalan Sultan Ismail',
            city: 'Kuala Lumpur',
            state: 'WP Kuala Lumpur',
            postalCode: '50250',
            country: 'MY',
          },
          invoicePrefix: 'INV-',
          autoSubmit: false,
          validateBeforePost: true,
          generateQrCode: true,
          notificationEmails: [],
          taxCodeMapping: {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = await mappingService.mapBillingDocumentToInvoice(context);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field === 'currency')).toBe(true);
    });

    it('should map SAP document types to LHDN document types', async () => {
      const testCases = [
        { sapType: 'F2', expectedLHDN: '01' }, // Invoice
        { sapType: 'G2', expectedLHDN: '02' }, // Credit Note
        { sapType: 'L2', expectedLHDN: '03' }, // Debit Note
        { sapType: 'S1', expectedLHDN: '04' }, // Refund Note
        { sapType: 'S2', expectedLHDN: '11' }, // Self-Billed Invoice
      ];

      for (const testCase of testCases) {
        const context: MappingContext = {
          tenantId: 'tenant-123',
          sapBillingDocument: {
            BillingDocument: '9000000001',
            BillingDocumentType: testCase.sapType,
            SoldToParty: '1000001',
            BillingDocumentDate: '2024-01-15',
            TransactionCurrency: 'MYR',
            TotalNetAmount: '1000.00',
            TotalTaxAmount: '60.00',
            TotalGrossAmount: '1060.00',
            CompanyCode: '1000',
          },
          sapItems: [],
          buyerBusinessPartner: {
            BusinessPartner: '1000001',
            BusinessPartnerName: 'ABC Sdn Bhd',
            BusinessPartnerCategory: '2',
            TaxNumber3: '001234567890',
            to_BusinessPartnerAddress: [
              {
                AddressID: 'ADDR-001',
                CityName: 'KL',
                Region: '14',
                PostalCode: '50000',
                Country: 'MY',
              },
            ],
          },
          tenantConfig: {
            tenantId: 'tenant-123',
            clientId: 'client-123',
            clientSecret: 'secret-123',
            apiBaseUrl: 'https://api-sandbox.myinvois.hasil.gov.my',
            environment: 'SANDBOX',
            companyTin: '009876543210',
            companyName: 'XYZ Sdn Bhd',
            companyAddress: {
              line1: 'Jalan Sultan Ismail',
              city: 'Kuala Lumpur',
              state: 'WP Kuala Lumpur',
              postalCode: '50250',
              country: 'MY',
            },
            invoicePrefix: '',
            autoSubmit: false,
            validateBeforePost: true,
            generateQrCode: true,
            notificationEmails: [],
            taxCodeMapping: {},
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };

        const result = await mappingService.mapBillingDocumentToInvoice(context);

        expect(result.invoice?.documentType).toBe(testCase.expectedLHDN);
      }
    });

    it('should correctly map Malaysian state codes', async () => {
      const context: MappingContext = {
        tenantId: 'tenant-123',
        sapBillingDocument: {
          BillingDocument: '9000000001',
          BillingDocumentType: 'F2',
          SoldToParty: '1000001',
          BillingDocumentDate: '2024-01-15',
          TransactionCurrency: 'MYR',
          TotalNetAmount: '1000.00',
          TotalTaxAmount: '60.00',
          TotalGrossAmount: '1060.00',
          CompanyCode: '1000',
        },
        sapItems: [],
        buyerBusinessPartner: {
          BusinessPartner: '1000001',
          BusinessPartnerName: 'ABC Sdn Bhd',
          BusinessPartnerCategory: '2',
          TaxNumber3: '001234567890',
          to_BusinessPartnerAddress: [
            {
              AddressID: 'ADDR-001',
              CityName: 'Johor Bahru',
              Region: '01', // Johor
              PostalCode: '80000',
              Country: 'MY',
            },
          ],
        },
        tenantConfig: {
          tenantId: 'tenant-123',
          clientId: 'client-123',
          clientSecret: 'secret-123',
          apiBaseUrl: 'https://api-sandbox.myinvois.hasil.gov.my',
          environment: 'SANDBOX',
          companyTin: '009876543210',
          companyName: 'XYZ Sdn Bhd',
          companyAddress: {
            line1: 'Jalan Sultan Ismail',
            city: 'Kuala Lumpur',
            state: 'WP Kuala Lumpur',
            postalCode: '50250',
            country: 'MY',
          },
          invoicePrefix: '',
          autoSubmit: false,
          validateBeforePost: true,
          generateQrCode: true,
          notificationEmails: [],
          taxCodeMapping: {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = await mappingService.mapBillingDocumentToInvoice(context);

      expect(result.invoice?.buyer.address.state).toBe('Johor');
    });

    it('should map tax codes correctly', async () => {
      const context: MappingContext = {
        tenantId: 'tenant-123',
        sapBillingDocument: {
          BillingDocument: '9000000001',
          BillingDocumentType: 'F2',
          SoldToParty: '1000001',
          BillingDocumentDate: '2024-01-15',
          TransactionCurrency: 'MYR',
          TotalNetAmount: '1000.00',
          TotalTaxAmount: '0.00',
          TotalGrossAmount: '1000.00',
          CompanyCode: '1000',
        },
        sapItems: [
          {
            BillingDocument: '9000000001',
            BillingDocumentItem: '000010',
            BillingDocumentItemText: 'Exempt Item',
            BillingQuantity: '1',
            BillingQuantityUnit: 'EA',
            NetAmount: '1000.00',
            TaxAmount: '0.00',
            GrossAmount: '1000.00',
            TaxCode: 'VE', // Exempt
            ItemNetAmount: '1000.00',
            ItemGrossAmount: '1000.00',
          },
        ],
        buyerBusinessPartner: {
          BusinessPartner: '1000001',
          BusinessPartnerName: 'ABC Sdn Bhd',
          BusinessPartnerCategory: '2',
          TaxNumber3: '001234567890',
          to_BusinessPartnerAddress: [
            {
              AddressID: 'ADDR-001',
              CityName: 'KL',
              Region: '14',
              PostalCode: '50000',
              Country: 'MY',
            },
          ],
        },
        tenantConfig: {
          tenantId: 'tenant-123',
          clientId: 'client-123',
          clientSecret: 'secret-123',
          apiBaseUrl: 'https://api-sandbox.myinvois.hasil.gov.my',
          environment: 'SANDBOX',
          companyTin: '009876543210',
          companyName: 'XYZ Sdn Bhd',
          companyAddress: {
            line1: 'Jalan Sultan Ismail',
            city: 'Kuala Lumpur',
            state: 'WP Kuala Lumpur',
            postalCode: '50250',
            country: 'MY',
          },
          invoicePrefix: '',
          autoSubmit: false,
          validateBeforePost: true,
          generateQrCode: true,
          notificationEmails: [],
          taxCodeMapping: {
            'VE': 'E',
            'V6': 'SR',
            'VZ': 'ZP',
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = await mappingService.mapBillingDocumentToInvoice(context);

      expect(result.invoice?.lineItems[0].taxType).toBe('E');
      expect(result.invoice?.lineItems[0].taxRate).toBe(0);
    });
  });
});
