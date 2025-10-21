/**
 * ValidationService
 *
 * Validates e-invoices against LHDN MyInvois schemas and formats
 * Handles XML conversion and schema validation
 */

import { Builder as XMLBuilder } from 'xml2js';
import { LHDNInvoice, ValidationResult } from '../types';
import { validateInvoice, validateForSubmission } from '../rules/validationRules';
import { logger } from '../utils/logger';

export interface XMLConversionResult {
  success: boolean;
  xml?: string;
  error?: string;
}

export class ValidationService {
  private xmlBuilder: XMLBuilder;

  constructor() {
    this.xmlBuilder = new XMLBuilder({
      rootName: 'Invoice',
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' },
    });
  }

  /**
   * Validate invoice against business rules
   */
  validateBusinessRules(invoice: LHDNInvoice): ValidationResult {
    logger.info('Validating business rules', {
      invoiceNumber: invoice.invoiceNumber,
    });

    const result = validateInvoice(invoice);

    logger.info('Business validation complete', {
      invoiceNumber: invoice.invoiceNumber,
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
    });

    return result;
  }

  /**
   * Validate invoice for submission
   * Stricter validation before sending to LHDN
   */
  validateForSubmission(invoice: LHDNInvoice): ValidationResult {
    logger.info('Validating for submission', {
      invoiceNumber: invoice.invoiceNumber,
    });

    const result = validateForSubmission(invoice);

    if (!result.isValid) {
      logger.warn('Submission validation failed', {
        invoiceNumber: invoice.invoiceNumber,
        errors: result.errors,
      });
    }

    return result;
  }

  /**
   * Convert invoice to LHDN XML format
   * Based on UBL 2.1 (Universal Business Language)
   */
  convertToXML(invoice: LHDNInvoice): XMLConversionResult {
    try {
      logger.info('Converting invoice to XML', {
        invoiceNumber: invoice.invoiceNumber,
      });

      const xmlObject = {
        $: {
          xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
          'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
          'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        },
        'cbc:ID': invoice.invoiceNumber,
        'cbc:IssueDate': this.formatDate(invoice.invoiceDate),
        'cbc:InvoiceTypeCode': invoice.documentType,
        'cbc:DocumentCurrencyCode': invoice.currency,

        // Supplier (AccountingSupplierParty)
        'cac:AccountingSupplierParty': {
          'cac:Party': {
            'cac:PartyTaxScheme': {
              'cbc:CompanyID': { $: { schemeID: 'TIN' }, _: invoice.supplier.tin },
            },
            'cac:PartyLegalEntity': {
              'cbc:RegistrationName': invoice.supplier.name,
              'cbc:CompanyID': invoice.supplier.registrationNumber || '',
            },
            'cac:PostalAddress': {
              'cbc:StreetName': invoice.supplier.address.line1,
              'cbc:AdditionalStreetName': invoice.supplier.address.line2 || '',
              'cbc:CityName': invoice.supplier.address.city,
              'cbc:PostalZone': invoice.supplier.address.postalCode,
              'cbc:CountrySubentityCode': invoice.supplier.address.state,
              'cac:Country': {
                'cbc:IdentificationCode': invoice.supplier.address.country,
              },
            },
            'cac:Contact': invoice.supplier.contact ? {
              'cbc:Telephone': invoice.supplier.contact.phone || '',
              'cbc:ElectronicMail': invoice.supplier.contact.email || '',
            } : undefined,
          },
        },

        // Buyer (AccountingCustomerParty)
        'cac:AccountingCustomerParty': {
          'cac:Party': {
            'cac:PartyTaxScheme': {
              'cbc:CompanyID': { $: { schemeID: 'TIN' }, _: invoice.buyer.tin },
            },
            'cac:PartyLegalEntity': {
              'cbc:RegistrationName': invoice.buyer.name,
              'cbc:CompanyID': invoice.buyer.registrationNumber || '',
            },
            'cac:PostalAddress': {
              'cbc:StreetName': invoice.buyer.address.line1,
              'cbc:AdditionalStreetName': invoice.buyer.address.line2 || '',
              'cbc:CityName': invoice.buyer.address.city,
              'cbc:PostalZone': invoice.buyer.address.postalCode,
              'cbc:CountrySubentityCode': invoice.buyer.address.state,
              'cac:Country': {
                'cbc:IdentificationCode': invoice.buyer.address.country,
              },
            },
            'cac:Contact': invoice.buyer.contact ? {
              'cbc:Telephone': invoice.buyer.contact.phone || '',
              'cbc:ElectronicMail': invoice.buyer.contact.email || '',
            } : undefined,
          },
        },

        // Payment Terms
        'cac:PaymentTerms': invoice.paymentTerms ? {
          'cbc:Note': invoice.paymentTerms,
        } : undefined,

        // Legal Monetary Total
        'cac:LegalMonetaryTotal': {
          'cbc:LineExtensionAmount': {
            $: { currencyID: invoice.currency },
            _: invoice.subtotalAmount.toFixed(2),
          },
          'cbc:TaxExclusiveAmount': {
            $: { currencyID: invoice.currency },
            _: invoice.subtotalAmount.toFixed(2),
          },
          'cbc:TaxInclusiveAmount': {
            $: { currencyID: invoice.currency },
            _: invoice.totalAmount.toFixed(2),
          },
          'cbc:PayableAmount': {
            $: { currencyID: invoice.currency },
            _: invoice.totalAmount.toFixed(2),
          },
        },

        // Line Items
        'cac:InvoiceLine': invoice.lineItems.map(item => ({
          'cbc:ID': item.lineNumber,
          'cbc:InvoicedQuantity': {
            $: { unitCode: 'EA' }, // Each (default unit)
            _: item.quantity,
          },
          'cbc:LineExtensionAmount': {
            $: { currencyID: invoice.currency },
            _: item.subtotal.toFixed(2),
          },
          'cac:Item': {
            'cbc:Description': item.description,
            'cbc:Name': item.description,
            'cac:CommodityClassification': item.classification ? {
              'cbc:ItemClassificationCode': item.classification,
            } : undefined,
          },
          'cac:Price': {
            'cbc:PriceAmount': {
              $: { currencyID: invoice.currency },
              _: item.unitPrice.toFixed(2),
            },
          },
          'cac:TaxTotal': {
            'cbc:TaxAmount': {
              $: { currencyID: invoice.currency },
              _: item.taxAmount.toFixed(2),
            },
            'cac:TaxSubtotal': {
              'cbc:TaxableAmount': {
                $: { currencyID: invoice.currency },
                _: item.subtotal.toFixed(2),
              },
              'cbc:TaxAmount': {
                $: { currencyID: invoice.currency },
                _: item.taxAmount.toFixed(2),
              },
              'cac:TaxCategory': {
                'cbc:ID': item.taxType,
                'cbc:Percent': item.taxRate,
              },
            },
          },
        })),
      };

      const xml = this.xmlBuilder.buildObject(xmlObject);

      logger.info('XML conversion successful', {
        invoiceNumber: invoice.invoiceNumber,
        xmlLength: xml.length,
      });

      return {
        success: true,
        xml,
      };
    } catch (error: any) {
      logger.error('XML conversion failed', {
        error: error.message,
        invoiceNumber: invoice.invoiceNumber,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate XML schema
   * Note: Actual XSD validation requires additional library
   * This is a placeholder for schema validation logic
   */
  validateXMLSchema(xml: string): ValidationResult {
    logger.info('Validating XML schema');

    // Placeholder validation
    // In production, implement XSD validation using libxmljs or similar

    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic XML structure checks
    if (!xml.includes('xmlns')) {
      errors.push({
        code: 'XML-001',
        field: 'xmlns',
        message: 'Missing XML namespace declaration',
        severity: 'ERROR',
      });
    }

    if (!xml.includes('Invoice')) {
      errors.push({
        code: 'XML-002',
        field: 'root',
        message: 'Missing Invoice root element',
        severity: 'CRITICAL',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: new Date(),
    };
  }

  /**
   * Format date for XML (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Validate complete workflow
   * Runs all validations in sequence
   */
  async validateComplete(invoice: LHDNInvoice): Promise<{
    businessRules: ValidationResult;
    submissionCheck: ValidationResult;
    xmlConversion: XMLConversionResult;
    xmlSchema?: ValidationResult;
  }> {
    const businessRules = this.validateBusinessRules(invoice);
    const submissionCheck = this.validateForSubmission(invoice);
    const xmlConversion = this.convertToXML(invoice);

    let xmlSchema: ValidationResult | undefined;
    if (xmlConversion.success && xmlConversion.xml) {
      xmlSchema = this.validateXMLSchema(xmlConversion.xml);
    }

    return {
      businessRules,
      submissionCheck,
      xmlConversion,
      xmlSchema,
    };
  }
}
