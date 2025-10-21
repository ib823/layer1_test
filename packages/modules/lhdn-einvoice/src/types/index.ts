/**
 * LHDN MyInvois e-Invoice Types
 *
 * Type definitions for Malaysia LHDN MyInvois e-invoicing system
 *
 * References:
 * - LHDN MyInvois SDK Guideline v4.0
 * - https://sdk.myinvois.hasil.gov.my
 */

/**
 * LHDN Invoice Document Types
 * 01 - Invoice
 * 02 - Credit Note
 * 03 - Debit Note
 * 04 - Refund Note
 * 11 - Self-Billed Invoice
 */
export type LHDNDocumentType = '01' | '02' | '03' | '04' | '11';

/**
 * LHDN Tax Types
 * SR - Standard Rated (6% SST)
 * ZP - Zero Rated
 * TX - Taxable (generic)
 * E - Exempt
 * DS - Deemed Supply
 */
export type LHDNTaxType = 'SR' | 'ZP' | 'TX' | 'E' | 'DS';

/**
 * Invoice Status Lifecycle
 */
export type InvoiceStatus =
  | 'DRAFT'          // Created but not validated
  | 'VALIDATED'      // Passed validation, ready to submit
  | 'SUBMITTED'      // Sent to LHDN MyInvois
  | 'ACCEPTED'       // Accepted by LHDN
  | 'REJECTED'       // Rejected by LHDN
  | 'CANCELLED';     // Cancelled after acceptance

/**
 * Party information (Supplier/Buyer)
 */
export interface LHDNParty {
  tin: string;                    // Tax Identification Number
  name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;                 // Malaysian state code
    postalCode: string;
    country: string;               // ISO 3166-1 alpha-2 (MY for Malaysia)
  };
  contact?: {
    phone: string;
    email: string;
  };
  registrationNumber?: string;     // SSM/ROC number
  sstRegistrationNumber?: string;  // SST registration number
}

/**
 * Invoice line item
 */
export interface LHDNLineItem {
  lineNumber: number;
  description: string;
  classification?: string;         // Product classification code (optional)
  quantity: number;
  unitPrice: number;
  taxType: LHDNTaxType;
  taxRate: number;                 // Percentage (e.g., 6 for 6%)
  taxAmount: number;
  discountAmount?: number;
  subtotal: number;                // quantity * unitPrice - discountAmount
  total: number;                   // subtotal + taxAmount
}

/**
 * Main LHDN Invoice structure
 */
export interface LHDNInvoice {
  // Metadata
  id: string;                      // Internal framework ID
  tenantId: string;
  status: InvoiceStatus;

  // LHDN Identifiers
  invoiceNumber: string;           // Unique invoice number
  documentType: LHDNDocumentType;
  invoiceDate: Date;
  dueDate?: Date;
  currency: string;                // ISO 4217 (MYR)

  // Parties
  supplier: LHDNParty;
  buyer: LHDNParty;

  // Line Items
  lineItems: LHDNLineItem[];

  // Totals
  subtotalAmount: number;          // Sum of line items subtotal
  totalTaxAmount: number;          // Sum of line items tax
  totalDiscountAmount?: number;
  totalAmount: number;             // Grand total

  // Payment
  paymentMode?: string;            // e.g., "Cash", "Credit", "Bank Transfer"
  paymentTerms?: string;

  // References
  sapBillingDocument: string;      // SAP billing document number
  sapCompanyCode: string;
  purchaseOrderRef?: string;       // Customer PO reference

  // LHDN Response Data (populated after submission)
  submissionUid?: string;          // LHDN submission UID
  lhdnReferenceNumber?: string;    // LHDN long ID
  qrCodeData?: string;             // QR code data (base64)
  submittedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReasons?: string[];

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  validatedAt?: Date;
}

/**
 * Validation error details
 */
export interface ValidationError {
  code: string;                    // Error code (e.g., "LHDN-001")
  field: string;                   // Field that failed validation
  message: string;                 // Human-readable error message
  severity: 'ERROR' | 'CRITICAL';  // Error severity
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validatedAt: Date;
}

/**
 * Submission result from LHDN MyInvois
 */
export interface SubmissionResult {
  success: boolean;
  submissionUid?: string;          // LHDN submission UID
  lhdnReferenceNumber?: string;    // LHDN long ID
  timestamp: Date;
  qrCodeData?: string;             // Generated QR code (base64)
  errors?: string[];               // Submission errors
}

/**
 * Tenant-specific LHDN configuration
 */
export interface LHDNTenantConfig {
  tenantId: string;

  // LHDN MyInvois API Credentials
  clientId: string;                // OAuth client ID (encrypted)
  clientSecret: string;            // OAuth client secret (encrypted)
  apiBaseUrl: string;              // LHDN API endpoint
  environment: 'SANDBOX' | 'PRODUCTION';

  // Company Details
  companyTin: string;              // Company TIN
  companyName: string;
  companyAddress: LHDNParty['address'];
  companyContact: LHDNParty['contact'];

  // Invoice Settings
  invoicePrefix?: string;          // Prefix for invoice numbers
  autoSubmit: boolean;             // Auto-submit after validation
  validateBeforePost: boolean;     // Validate before SAP posting
  generateQrCode: boolean;         // Generate QR codes

  // Notification
  notificationEmails: string[];    // Email alerts
  webhookUrl?: string;             // Webhook for status updates

  // Tax Code Mapping (SAP Tax Code → LHDN Tax Type)
  taxCodeMapping: Record<string, LHDNTaxType>;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SAP to LHDN mapping configuration
 */
export interface SAPToLHDNMapping {
  // SAP Billing Document fields → LHDN Invoice fields
  billingDocumentField: string;
  lhdnInvoiceField: string;
  transformFunction?: (value: any) => any;
  required: boolean;
}

/**
 * Bulk submission request
 */
export interface BulkSubmissionRequest {
  tenantId: string;
  invoiceIds: string[];            // Array of invoice IDs to submit
  validateOnly?: boolean;          // Only validate without submitting
}

/**
 * Bulk submission result
 */
export interface BulkSubmissionResult {
  totalInvoices: number;
  successful: number;
  failed: number;
  results: Array<{
    invoiceId: string;
    invoiceNumber: string;
    success: boolean;
    submissionUid?: string;
    errors?: string[];
  }>;
}

/**
 * Compliance report data
 */
export interface ComplianceReport {
  tenantId: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  statistics: {
    totalInvoices: number;
    submitted: number;
    accepted: number;
    rejected: number;
    cancelled: number;
    pending: number;
  };
  byDocumentType: Record<LHDNDocumentType, number>;
  byStatus: Record<InvoiceStatus, number>;
  totalRevenue: number;
  totalTax: number;
  rejectionReasons: Array<{
    reason: string;
    count: number;
  }>;
  generatedAt: Date;
}
