/**
 * LHDN MyInvois Validation Rules
 *
 * Business validation rules based on LHDN MyInvois SDK Guideline v4.0
 *
 * Reference: https://sdk.myinvois.hasil.gov.my
 */

import {
  LHDNInvoice,
  LHDNParty,
  LHDNLineItem,
  ValidationError,
  ValidationWarning,
  ValidationResult,
} from '../types';

/**
 * Validation rule definition
 */
interface ValidationRule {
  code: string;
  field: string;
  description: string;
  validate: (invoice: LHDNInvoice) => boolean;
  severity: 'ERROR' | 'CRITICAL';
  message: string;
}

/**
 * Warning rule definition
 */
interface WarningRule {
  code: string;
  field: string;
  description: string;
  check: (invoice: LHDNInvoice) => boolean;
  message: string;
}

/**
 * Critical validation rules (must pass)
 */
export const CRITICAL_RULES: ValidationRule[] = [
  {
    code: 'LHDN-001',
    field: 'invoiceNumber',
    description: 'Invoice number must be unique and not empty',
    severity: 'CRITICAL',
    message: 'Invoice number is required and must be unique',
    validate: (invoice) =>
      !!invoice.invoiceNumber && invoice.invoiceNumber.trim().length > 0,
  },
  {
    code: 'LHDN-002',
    field: 'currency',
    description: 'Currency must be MYR for Malaysia',
    severity: 'CRITICAL',
    message: 'Currency must be MYR (Malaysian Ringgit)',
    validate: (invoice) => invoice.currency === 'MYR',
  },
  {
    code: 'LHDN-003',
    field: 'supplier.tin',
    description: 'Supplier TIN is mandatory',
    severity: 'CRITICAL',
    message: 'Supplier Tax Identification Number (TIN) is required',
    validate: (invoice) =>
      !!invoice.supplier?.tin && invoice.supplier.tin.trim().length > 0,
  },
  {
    code: 'LHDN-004',
    field: 'buyer.tin',
    description: 'Buyer TIN is mandatory',
    severity: 'CRITICAL',
    message: 'Buyer Tax Identification Number (TIN) is required',
    validate: (invoice) =>
      !!invoice.buyer?.tin && invoice.buyer.tin.trim().length > 0,
  },
  {
    code: 'LHDN-005',
    field: 'invoiceDate',
    description: 'Invoice date cannot be in the future',
    severity: 'CRITICAL',
    message: 'Invoice date cannot be in the future',
    validate: (invoice) => new Date(invoice.invoiceDate) <= new Date(),
  },
  {
    code: 'LHDN-006',
    field: 'lineItems',
    description: 'At least one line item is required',
    severity: 'CRITICAL',
    message: 'Invoice must have at least one line item',
    validate: (invoice) =>
      Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0,
  },
  {
    code: 'LHDN-007',
    field: 'totalAmount',
    description: 'Total amount must be positive',
    severity: 'CRITICAL',
    message: 'Total amount must be greater than zero',
    validate: (invoice) => invoice.totalAmount > 0,
  },
];

/**
 * Error validation rules (should pass)
 */
export const ERROR_RULES: ValidationRule[] = [
  {
    code: 'LHDN-101',
    field: 'supplier.address',
    description: 'Supplier address must be complete',
    severity: 'ERROR',
    message: 'Supplier address is incomplete (missing city, state, or postal code)',
    validate: (invoice) =>
      !!invoice.supplier?.address?.city &&
      !!invoice.supplier?.address?.state &&
      !!invoice.supplier?.address?.postalCode,
  },
  {
    code: 'LHDN-102',
    field: 'buyer.address',
    description: 'Buyer address must be complete',
    severity: 'ERROR',
    message: 'Buyer address is incomplete (missing city, state, or postal code)',
    validate: (invoice) =>
      !!invoice.buyer?.address?.city &&
      !!invoice.buyer?.address?.state &&
      !!invoice.buyer?.address?.postalCode,
  },
  {
    code: 'LHDN-103',
    field: 'lineItems',
    description: 'Line item amounts must be calculated correctly',
    severity: 'ERROR',
    message: 'Line item calculation error: total ≠ subtotal + tax',
    validate: (invoice) =>
      invoice.lineItems.every((item) => {
        const expectedTotal = item.subtotal + item.taxAmount;
        return Math.abs(item.total - expectedTotal) < 0.01; // Allow 1 cent rounding
      }),
  },
  {
    code: 'LHDN-104',
    field: 'totalAmount',
    description: 'Total amount must equal sum of line items',
    severity: 'ERROR',
    message: 'Total amount does not match sum of line item totals',
    validate: (invoice) => {
      const lineItemsTotal = invoice.lineItems.reduce(
        (sum, item) => sum + item.total,
        0
      );
      return Math.abs(invoice.totalAmount - lineItemsTotal) < 0.01; // Allow 1 cent rounding
    },
  },
  {
    code: 'LHDN-105',
    field: 'totalTaxAmount',
    description: 'Total tax must equal sum of line item taxes',
    severity: 'ERROR',
    message: 'Total tax amount does not match sum of line item taxes',
    validate: (invoice) => {
      const lineItemsTax = invoice.lineItems.reduce(
        (sum, item) => sum + item.taxAmount,
        0
      );
      return Math.abs(invoice.totalTaxAmount - lineItemsTax) < 0.01;
    },
  },
  {
    code: 'LHDN-106',
    field: 'supplier.tin',
    description: 'TIN format validation',
    severity: 'ERROR',
    message: 'Supplier TIN format is invalid (should be 12-14 digits)',
    validate: (invoice) => {
      const tin = invoice.supplier?.tin || '';
      return /^\d{12,14}$/.test(tin.replace(/[-\s]/g, ''));
    },
  },
  {
    code: 'LHDN-107',
    field: 'buyer.tin',
    description: 'TIN format validation',
    severity: 'ERROR',
    message: 'Buyer TIN format is invalid (should be 12-14 digits)',
    validate: (invoice) => {
      const tin = invoice.buyer?.tin || '';
      return /^\d{12,14}$/.test(tin.replace(/[-\s]/g, ''));
    },
  },
  {
    code: 'LHDN-108',
    field: 'lineItems',
    description: 'Maximum line items limit',
    severity: 'ERROR',
    message: 'Invoice cannot have more than 999 line items',
    validate: (invoice) =>
      Array.isArray(invoice.lineItems) && invoice.lineItems.length <= 999,
  },
  {
    code: 'LHDN-109',
    field: 'subtotalAmount',
    description: 'Subtotal must be non-negative',
    severity: 'ERROR',
    message: 'Subtotal amount cannot be negative',
    validate: (invoice) => invoice.subtotalAmount >= 0,
  },
  {
    code: 'LHDN-110',
    field: 'invoiceNumber',
    description: 'Invoice number format and length',
    severity: 'ERROR',
    message: 'Invoice number must be alphanumeric and max 20 characters',
    validate: (invoice) =>
      !!invoice.invoiceNumber &&
      invoice.invoiceNumber.length <= 20 &&
      /^[A-Za-z0-9\-/]+$/.test(invoice.invoiceNumber),
  },
  {
    code: 'LHDN-TAX-CALC',
    field: 'lineItems',
    description: 'Tax calculation must be accurate',
    severity: 'ERROR',
    message: 'Tax calculation error: tax amount does not match rate × subtotal',
    validate: (invoice) =>
      invoice.lineItems.every((item) => {
        const expectedTax = (item.subtotal * item.taxRate) / 100;
        return Math.abs(item.taxAmount - expectedTax) < 0.01; // Allow 1 cent rounding
      }),
  },
];

/**
 * Warning rules (recommended but not blocking)
 */
export const WARNING_RULES: WarningRule[] = [
  {
    code: 'LHDN-W01',
    field: 'supplier.contact',
    description: 'Supplier contact information recommended',
    message: 'Supplier contact email or phone is missing',
    check: (invoice) =>
      !invoice.supplier?.contact?.email && !invoice.supplier?.contact?.phone,
  },
  {
    code: 'LHDN-W02',
    field: 'buyer.contact',
    description: 'Buyer contact information recommended',
    message: 'Buyer contact email or phone is missing',
    check: (invoice) =>
      !invoice.buyer?.contact?.email && !invoice.buyer?.contact?.phone,
  },
  {
    code: 'LHDN-W03',
    field: 'invoiceDate',
    description: 'Invoice date is older than 30 days',
    message: 'Invoice date is more than 30 days old',
    check: (invoice) => {
      const daysDiff =
        (new Date().getTime() - new Date(invoice.invoiceDate).getTime()) /
        (1000 * 60 * 60 * 24);
      return daysDiff > 30;
    },
  },
  {
    code: 'LHDN-W04',
    field: 'dueDate',
    description: 'Due date recommended for payment tracking',
    message: 'Due date is not specified',
    check: (invoice) => !invoice.dueDate,
  },
  {
    code: 'LHDN-W05',
    field: 'paymentMode',
    description: 'Payment mode recommended',
    message: 'Payment mode is not specified',
    check: (invoice) => !invoice.paymentMode,
  },
];

/**
 * Validate line item
 */
function validateLineItem(
  item: LHDNLineItem,
  lineNumber: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Quantity must be positive
  if (item.quantity <= 0) {
    errors.push({
      code: 'LHDN-L01',
      field: `lineItems[${lineNumber}].quantity`,
      message: `Line ${lineNumber}: Quantity must be greater than zero`,
      severity: 'ERROR',
    });
  }

  // Unit price must be non-negative
  if (item.unitPrice < 0) {
    errors.push({
      code: 'LHDN-L02',
      field: `lineItems[${lineNumber}].unitPrice`,
      message: `Line ${lineNumber}: Unit price cannot be negative`,
      severity: 'ERROR',
    });
  }

  // Tax rate must be valid
  if (item.taxRate < 0 || item.taxRate > 100) {
    errors.push({
      code: 'LHDN-L03',
      field: `lineItems[${lineNumber}].taxRate`,
      message: `Line ${lineNumber}: Tax rate must be between 0% and 100%`,
      severity: 'ERROR',
    });
  }

  // Description is required
  if (!item.description || item.description.trim().length === 0) {
    errors.push({
      code: 'LHDN-L04',
      field: `lineItems[${lineNumber}].description`,
      message: `Line ${lineNumber}: Description is required`,
      severity: 'ERROR',
    });
  }

  // Validate tax type
  const validTaxTypes = ['SR', 'ZP', 'TX', 'E', 'DS'];
  if (!validTaxTypes.includes(item.taxType)) {
    errors.push({
      code: 'LHDN-L05',
      field: `lineItems[${lineNumber}].taxType`,
      message: `Line ${lineNumber}: Invalid tax type '${item.taxType}'. Must be one of: ${validTaxTypes.join(', ')}`,
      severity: 'CRITICAL',
    });
  }

  return errors;
}

/**
 * Validate party information
 */
function validateParty(
  party: LHDNParty,
  partyType: 'supplier' | 'buyer'
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Name is required
  if (!party.name || party.name.trim().length === 0) {
    errors.push({
      code: `LHDN-P01`,
      field: `${partyType}.name`,
      message: `${partyType} name is required`,
      severity: 'CRITICAL',
    });
  }

  // Address line1 is required
  if (!party.address?.line1 || party.address.line1.trim().length === 0) {
    errors.push({
      code: `LHDN-P02`,
      field: `${partyType}.address.line1`,
      message: `${partyType} address line 1 is required`,
      severity: 'ERROR',
    });
  }

  // Country must be 'MY' for Malaysia
  if (party.address?.country !== 'MY') {
    errors.push({
      code: `LHDN-P03`,
      field: `${partyType}.address.country`,
      message: `${partyType} country must be 'MY' (Malaysia)`,
      severity: 'ERROR',
    });
  }

  // Postal code format (5 digits for Malaysia)
  const postalCode = party.address?.postalCode || '';
  if (!/^\d{5}$/.test(postalCode)) {
    errors.push({
      code: `LHDN-P04`,
      field: `${partyType}.address.postalCode`,
      message: `${partyType} postal code must be 5 digits`,
      severity: 'ERROR',
    });
  }

  return errors;
}

/**
 * Main validation function
 */
export function validateInvoice(invoice: LHDNInvoice): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Run critical rules
  for (const rule of CRITICAL_RULES) {
    if (!rule.validate(invoice)) {
      errors.push({
        code: rule.code,
        field: rule.field,
        message: rule.message,
        severity: rule.severity,
      });
    }
  }

  // Run error rules
  for (const rule of ERROR_RULES) {
    if (!rule.validate(invoice)) {
      errors.push({
        code: rule.code,
        field: rule.field,
        message: rule.message,
        severity: rule.severity,
      });
    }
  }

  // Validate parties
  errors.push(...validateParty(invoice.supplier, 'supplier'));
  errors.push(...validateParty(invoice.buyer, 'buyer'));

  // Validate line items
  invoice.lineItems.forEach((item, index) => {
    errors.push(...validateLineItem(item, index + 1));
  });

  // Run warning rules
  for (const rule of WARNING_RULES) {
    if (rule.check(invoice)) {
      warnings.push({
        code: rule.code,
        field: rule.field,
        message: rule.message,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validatedAt: new Date(),
  };
}

/**
 * Validate invoice for submission
 * Stricter validation before submitting to LHDN
 */
export function validateForSubmission(invoice: LHDNInvoice): ValidationResult {
  const result = validateInvoice(invoice);

  // Additional submission checks
  if (invoice.status !== 'VALIDATED') {
    result.errors.push({
      code: 'LHDN-S01',
      field: 'status',
      message: 'Invoice must be in VALIDATED status before submission',
      severity: 'CRITICAL',
    });
  }

  if (!invoice.sapBillingDocument) {
    result.errors.push({
      code: 'LHDN-S02',
      field: 'sapBillingDocument',
      message: 'SAP billing document reference is required',
      severity: 'CRITICAL',
    });
  }

  if (!invoice.sapCompanyCode) {
    result.errors.push({
      code: 'LHDN-S03',
      field: 'sapCompanyCode',
      message: 'SAP company code is required',
      severity: 'CRITICAL',
    });
  }

  result.isValid = result.errors.length === 0;

  return result;
}
