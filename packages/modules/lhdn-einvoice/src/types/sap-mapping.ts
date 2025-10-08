/**
 * SAP to LHDN Mapping Types
 *
 * Defines the mapping between SAP S/4HANA OData structures
 * and LHDN MyInvois e-invoice formats
 */

import { LHDNInvoice, LHDNParty, LHDNLineItem, LHDNTaxType } from './index';

/**
 * SAP OData Service Dependencies
 */
export const SAP_SERVICES = {
  billingDocument: 'API_BILLING_DOCUMENT_SRV',
  businessPartner: 'API_BUSINESS_PARTNER',
  taxDetermination: 'API_TAX_DETERMINATION_SRV',
  productMaster: 'API_PRODUCT_SRV',
  companyCode: 'API_OPLACCTGDOCITEMCUBE_SRV',
} as const;

/**
 * SAP Billing Document Header (from API_BILLING_DOCUMENT_SRV)
 */
export interface SAPBillingDocument {
  BillingDocument: string;
  BillingDocumentType: string;
  SoldToParty: string;
  BillingDocumentDate: string;          // YYYY-MM-DD format
  TransactionCurrency: string;
  TotalNetAmount: string;               // Decimal as string
  TotalTaxAmount: string;
  TotalGrossAmount: string;
  PaymentTerms?: string;
  PurchaseOrderByCustomer?: string;
  CompanyCode: string;
  SalesOrganization?: string;
  DistributionChannel?: string;
  Division?: string;
}

/**
 * SAP Billing Document Item (from API_BILLING_DOCUMENT_SRV)
 */
export interface SAPBillingDocumentItem {
  BillingDocument: string;
  BillingDocumentItem: string;
  Material?: string;
  BillingDocumentItemText: string;
  BillingQuantity: string;              // Decimal as string
  BillingQuantityUnit: string;
  NetAmount: string;
  TaxAmount: string;
  GrossAmount: string;
  TaxCode: string;
  ItemNetAmount: string;
  ItemGrossAmount: string;
}

/**
 * SAP Business Partner (from API_BUSINESS_PARTNER)
 */
export interface SAPBusinessPartner {
  BusinessPartner: string;
  BusinessPartnerName: string;
  BusinessPartnerCategory: string;      // 1=Person, 2=Organization
  OrganizationBPName1?: string;
  TaxNumber3?: string;                  // TIN
  RegistrationNumber?: string;          // SSM/ROC
  to_BusinessPartnerAddress?: SAPBusinessPartnerAddress[];
}

/**
 * SAP Business Partner Address
 */
export interface SAPBusinessPartnerAddress {
  AddressID: string;
  StreetName?: string;
  HouseNumber?: string;
  AdditionalStreetPrefixName?: string;
  AdditionalStreetSuffixName?: string;
  CityName: string;
  Region: string;                       // State code
  PostalCode: string;
  Country: string;                      // ISO code
  to_EmailAddress?: Array<{
    EmailAddress: string;
  }>;
  to_PhoneNumber?: Array<{
    PhoneNumber: string;
  }>;
}

/**
 * SAP Company Code (for supplier information)
 */
export interface SAPCompanyCode {
  CompanyCode: string;
  CompanyCodeName: string;
  Country: string;
  Currency: string;
  TaxNumber?: string;
}

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  sapField: string;
  lhdnField: keyof LHDNInvoice | keyof LHDNParty | keyof LHDNLineItem;
  transform?: (value: any, context?: any) => any;
  required: boolean;
  description: string;
}

/**
 * Header-level field mappings
 */
export const HEADER_MAPPINGS: FieldMapping[] = [
  {
    sapField: 'BillingDocument',
    lhdnField: 'invoiceNumber',
    transform: (value: string, config?: { prefix?: string }) =>
      config?.prefix ? `${config.prefix}${value}` : value,
    required: true,
    description: 'Invoice number with optional prefix',
  },
  {
    sapField: 'BillingDocumentDate',
    lhdnField: 'invoiceDate',
    transform: (value: string) => new Date(value),
    required: true,
    description: 'Convert SAP date string to Date object',
  },
  {
    sapField: 'TransactionCurrency',
    lhdnField: 'currency',
    required: true,
    description: 'Currency code (should be MYR for Malaysia)',
  },
  {
    sapField: 'TotalNetAmount',
    lhdnField: 'subtotalAmount',
    transform: (value: string) => parseFloat(value),
    required: true,
    description: 'Subtotal amount before tax',
  },
  {
    sapField: 'TotalTaxAmount',
    lhdnField: 'totalTaxAmount',
    transform: (value: string) => parseFloat(value),
    required: true,
    description: 'Total tax amount',
  },
  {
    sapField: 'TotalGrossAmount',
    lhdnField: 'totalAmount',
    transform: (value: string) => parseFloat(value),
    required: true,
    description: 'Grand total including tax',
  },
  {
    sapField: 'CompanyCode',
    lhdnField: 'sapCompanyCode',
    required: true,
    description: 'SAP company code',
  },
  {
    sapField: 'PurchaseOrderByCustomer',
    lhdnField: 'purchaseOrderRef',
    required: false,
    description: 'Customer PO reference',
  },
];

/**
 * SAP Tax Code to LHDN Tax Type mapping
 * This is tenant-configurable but provides defaults
 */
export const DEFAULT_TAX_CODE_MAPPING: Record<string, LHDNTaxType> = {
  'V0': 'SR',    // Standard Rated 6%
  'V1': 'SR',    // Output VAT Standard Rate
  'V6': 'SR',    // SST 6%
  'V5': 'SR',    // SST 5%
  'V10': 'SR',   // SST 10%
  'VE': 'E',     // Exempt
  'VZ': 'ZP',    // Zero Rated
  'VP': 'ZP',    // Zero Rated Export
  'VD': 'DS',    // Deemed Supply
};

/**
 * Context for mapping operations
 */
export interface MappingContext {
  tenantId: string;
  sapBillingDocument: SAPBillingDocument;
  sapItems: SAPBillingDocumentItem[];
  supplierBusinessPartner?: SAPBusinessPartner;
  buyerBusinessPartner?: SAPBusinessPartner;
  companyCode?: SAPCompanyCode;
  tenantConfig: {
    invoicePrefix?: string;
    taxCodeMapping: Record<string, LHDNTaxType>;
    companyTin: string;
    companyName: string;
  };
}

/**
 * Mapping error
 */
export interface MappingError {
  field: string;
  sapValue: any;
  reason: string;
  severity: 'WARNING' | 'ERROR';
}

/**
 * Mapping result
 */
export interface MappingResult {
  success: boolean;
  invoice?: Partial<LHDNInvoice>;
  errors: MappingError[];
  warnings: MappingError[];
}
