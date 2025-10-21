/**
 * MappingService
 *
 * Converts SAP S/4HANA billing documents to LHDN MyInvois e-invoice format
 */

import {
  LHDNInvoice,
  LHDNParty,
  LHDNLineItem,
  LHDNDocumentType,
  LHDNTaxType,
} from '../types';
import {
  SAPBillingDocument,
  SAPBillingDocumentItem,
  SAPBusinessPartner,
  SAPBusinessPartnerAddress,
  MappingContext,
  MappingResult,
  MappingError,
  DEFAULT_TAX_CODE_MAPPING,
} from '../types/sap-mapping';
import { logger } from '../utils/logger';

export class MappingService {
  /**
   * Map SAP billing document to LHDN invoice
   */
  async mapBillingDocumentToInvoice(
    context: MappingContext
  ): Promise<MappingResult> {
    const errors: MappingError[] = [];
    const warnings: MappingError[] = [];

    try {
      // Map header
      const invoice: Partial<LHDNInvoice> = {
        tenantId: context.tenantId,

        // Invoice identifiers
        invoiceNumber: this.mapInvoiceNumber(
          context.sapBillingDocument.BillingDocument,
          context.tenantConfig.invoicePrefix
        ),
        documentType: this.mapDocumentType(
          context.sapBillingDocument.BillingDocumentType
        ),
        invoiceDate: this.parseDate(context.sapBillingDocument.BillingDocumentDate),
        currency: context.sapBillingDocument.TransactionCurrency,

        // Amounts
        subtotalAmount: parseFloat(context.sapBillingDocument.TotalNetAmount),
        totalTaxAmount: parseFloat(context.sapBillingDocument.TotalTaxAmount),
        totalAmount: parseFloat(context.sapBillingDocument.TotalGrossAmount),

        // SAP references
        sapBillingDocument: context.sapBillingDocument.BillingDocument,
        sapCompanyCode: context.sapBillingDocument.CompanyCode,
        purchaseOrderRef: context.sapBillingDocument.PurchaseOrderByCustomer,

        // Payment
        paymentTerms: context.sapBillingDocument.PaymentTerms,

        // Status
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      };

      // Validate currency
      if (invoice.currency !== 'MYR') {
        warnings.push({
          field: 'currency',
          sapValue: invoice.currency,
          reason: `Currency is ${invoice.currency}, expected MYR for Malaysia`,
          severity: 'WARNING',
        });
      }

      // Map supplier (company)
      if (context.supplierBusinessPartner) {
        invoice.supplier = this.mapPartyFromBusinessPartner(
          context.supplierBusinessPartner,
          context.tenantConfig.companyTin,
          context.tenantConfig.companyName,
          'supplier'
        );
      } else {
        // Use tenant config for supplier
        invoice.supplier = {
          tin: context.tenantConfig.companyTin,
          name: context.tenantConfig.companyName,
          address: {
            line1: 'Address Line 1', // From tenant config
            city: 'Kuala Lumpur',
            state: 'WP Kuala Lumpur',
            postalCode: '50088',
            country: 'MY',
          },
        };
      }

      // Map buyer
      if (context.buyerBusinessPartner) {
        invoice.buyer = this.mapPartyFromBusinessPartner(
          context.buyerBusinessPartner,
          context.buyerBusinessPartner.TaxNumber3 || '',
          context.buyerBusinessPartner.BusinessPartnerName,
          'buyer'
        );
      } else {
        errors.push({
          field: 'buyer',
          sapValue: context.sapBillingDocument.SoldToParty,
          reason: 'Buyer business partner data not found',
          severity: 'ERROR',
        });
      }

      // Map line items
      const lineItems: LHDNLineItem[] = [];
      for (const [index, sapItem] of context.sapItems.entries()) {
        const lineItem = this.mapLineItem(
          sapItem,
          index + 1,
          context.tenantConfig.taxCodeMapping
        );

        if (lineItem) {
          lineItems.push(lineItem);
        } else {
          errors.push({
            field: `lineItems[${index}]`,
            sapValue: sapItem.BillingDocumentItem,
            reason: 'Failed to map line item',
            severity: 'ERROR',
          });
        }
      }

      invoice.lineItems = lineItems;

      // Validate totals match
      if (lineItems.length > 0) {
        const calculatedTotal = lineItems.reduce((sum, item) => sum + item.total, 0);
        if (Math.abs(calculatedTotal - (invoice.totalAmount || 0)) > 0.01) {
          warnings.push({
            field: 'totalAmount',
            sapValue: invoice.totalAmount,
            reason: `Calculated total (${calculatedTotal}) differs from SAP total (${invoice.totalAmount})`,
            severity: 'WARNING',
          });
        }
      }

      return {
        success: errors.length === 0,
        invoice: errors.length === 0 ? invoice as LHDNInvoice : invoice,
        errors,
        warnings,
      };
    } catch (error: any) {
      logger.error('Mapping error', { error: error.message, context });
      errors.push({
        field: 'general',
        sapValue: null,
        reason: `Mapping failed: ${error.message}`,
        severity: 'ERROR',
      });

      return {
        success: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Map invoice number with optional prefix
   */
  private mapInvoiceNumber(billingDocument: string, prefix?: string): string {
    return prefix ? `${prefix}${billingDocument}` : billingDocument;
  }

  /**
   * Map SAP document type to LHDN document type
   */
  private mapDocumentType(sapDocType: string): LHDNDocumentType {
    // SAP document type mapping
    // F2 = Invoice, G2 = Credit Memo, L2 = Debit Memo
    const typeMap: Record<string, LHDNDocumentType> = {
      'F2': '01', // Invoice
      'G2': '02', // Credit Note
      'L2': '03', // Debit Note
      'S1': '01', // Sales Invoice
      'S2': '02', // Credit Note
    };

    return typeMap[sapDocType] || '01'; // Default to Invoice
  }

  /**
   * Parse SAP date string to Date object
   */
  private parseDate(dateString: string): Date {
    // SAP date format: YYYY-MM-DD or YYYYMMDD
    if (dateString.includes('-')) {
      return new Date(dateString);
    } else {
      // YYYYMMDD format
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      return new Date(`${year}-${month}-${day}`);
    }
  }

  /**
   * Map SAP business partner to LHDN party
   */
  private mapPartyFromBusinessPartner(
    bp: SAPBusinessPartner,
    tin: string,
    name: string,
    partyType: 'supplier' | 'buyer'
  ): LHDNParty {
    const party: LHDNParty = {
      tin: tin || bp.TaxNumber3 || '',
      name: name || bp.BusinessPartnerName,
      address: {
        line1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'MY',
      },
    };

    // Map address if available
    if (bp.to_BusinessPartnerAddress && bp.to_BusinessPartnerAddress.length > 0) {
      const addr = bp.to_BusinessPartnerAddress[0];
      party.address = this.mapAddress(addr);
    }

    // Map contact if available
    if (bp.to_BusinessPartnerAddress && bp.to_BusinessPartnerAddress.length > 0) {
      const addr = bp.to_BusinessPartnerAddress[0];
      const hasEmail = addr.to_EmailAddress && addr.to_EmailAddress.length > 0;
      const hasPhone = addr.to_PhoneNumber && addr.to_PhoneNumber.length > 0;

      if (hasEmail || hasPhone) {
        party.contact = {
          email: hasEmail ? addr.to_EmailAddress![0].EmailAddress : '',
          phone: hasPhone ? addr.to_PhoneNumber![0].PhoneNumber : '',
        };
      }
    }

    // Registration number
    if (bp.RegistrationNumber) {
      party.registrationNumber = bp.RegistrationNumber;
    }

    return party;
  }

  /**
   * Map SAP address to LHDN address
   */
  private mapAddress(addr: SAPBusinessPartnerAddress): LHDNParty['address'] {
    const line1Parts: string[] = [];
    if (addr.HouseNumber) line1Parts.push(addr.HouseNumber);
    if (addr.StreetName) line1Parts.push(addr.StreetName);

    const line2Parts: string[] = [];
    if (addr.AdditionalStreetPrefixName) line2Parts.push(addr.AdditionalStreetPrefixName);
    if (addr.AdditionalStreetSuffixName) line2Parts.push(addr.AdditionalStreetSuffixName);

    return {
      line1: line1Parts.join(' ') || 'Address Line 1',
      line2: line2Parts.length > 0 ? line2Parts.join(' ') : undefined,
      city: addr.CityName || 'Kuala Lumpur',
      state: this.mapStateCode(addr.Region),
      postalCode: addr.PostalCode || '50088',
      country: addr.Country || 'MY',
    };
  }

  /**
   * Map SAP region code to Malaysian state
   */
  private mapStateCode(region: string): string {
    // SAP region codes to Malaysian states
    const stateMap: Record<string, string> = {
      '01': 'Johor',
      '02': 'Kedah',
      '03': 'Kelantan',
      '04': 'Melaka',
      '05': 'Negeri Sembilan',
      '06': 'Pahang',
      '07': 'Pulau Pinang',
      '08': 'Perak',
      '09': 'Perlis',
      '10': 'Selangor',
      '11': 'Terengganu',
      '12': 'Sabah',
      '13': 'Sarawak',
      '14': 'WP Kuala Lumpur',
      '15': 'WP Labuan',
      '16': 'WP Putrajaya',
    };

    return stateMap[region] || region || 'WP Kuala Lumpur';
  }

  /**
   * Map SAP billing document item to LHDN line item
   */
  private mapLineItem(
    sapItem: SAPBillingDocumentItem,
    lineNumber: number,
    taxCodeMapping: Record<string, LHDNTaxType>
  ): LHDNLineItem | null {
    try {
      const quantity = parseFloat(sapItem.BillingQuantity);
      const netAmount = parseFloat(sapItem.NetAmount);
      const taxAmount = parseFloat(sapItem.TaxAmount);
      const grossAmount = parseFloat(sapItem.GrossAmount);

      // Calculate unit price
      const unitPrice = quantity > 0 ? netAmount / quantity : 0;

      // Map tax type
      const taxType = this.mapTaxType(sapItem.TaxCode, taxCodeMapping);

      // Calculate tax rate
      const taxRate = netAmount > 0 ? (taxAmount / netAmount) * 100 : 0;

      return {
        lineNumber,
        description: sapItem.BillingDocumentItemText || `Material ${sapItem.Material || 'N/A'}`,
        classification: sapItem.Material,
        quantity,
        unitPrice,
        taxType,
        taxRate: Math.round(taxRate * 100) / 100, // Round to 2 decimals
        taxAmount,
        subtotal: netAmount,
        total: grossAmount,
      };
    } catch (error: any) {
      logger.error('Line item mapping error', { error: error.message, sapItem });
      return null;
    }
  }

  /**
   * Map SAP tax code to LHDN tax type
   */
  private mapTaxType(
    sapTaxCode: string,
    taxCodeMapping: Record<string, LHDNTaxType>
  ): LHDNTaxType {
    // Use tenant-specific mapping if available
    if (taxCodeMapping[sapTaxCode]) {
      return taxCodeMapping[sapTaxCode];
    }

    // Fall back to default mapping
    if (DEFAULT_TAX_CODE_MAPPING[sapTaxCode]) {
      return DEFAULT_TAX_CODE_MAPPING[sapTaxCode];
    }

    // Default to Standard Rated
    logger.warn('Unknown tax code, defaulting to SR', { sapTaxCode });
    return 'SR';
  }

  /**
   * Validate mapping result
   */
  validateMappingResult(result: MappingResult): boolean {
    if (!result.success) {
      logger.error('Mapping validation failed', { errors: result.errors });
      return false;
    }

    if (result.warnings.length > 0) {
      logger.warn('Mapping completed with warnings', { warnings: result.warnings });
    }

    // Check required fields
    const invoice = result.invoice;
    if (!invoice) {
      logger.error('No invoice in mapping result');
      return false;
    }

    const requiredFields: (keyof LHDNInvoice)[] = [
      'invoiceNumber',
      'documentType',
      'invoiceDate',
      'currency',
      'supplier',
      'buyer',
      'lineItems',
      'totalAmount',
    ];

    for (const field of requiredFields) {
      if (!invoice[field]) {
        logger.error('Missing required field', { field });
        return false;
      }
    }

    return true;
  }
}
