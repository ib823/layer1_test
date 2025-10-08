/**
 * @sap-framework/lhdn-einvoice
 *
 * Malaysia LHDN MyInvois e-Invoice Module
 *
 * This module provides integration with Malaysia's LHDN MyInvois e-invoicing system,
 * enabling automatic conversion of SAP billing documents to LHDN-compliant e-invoices.
 *
 * Key Features:
 * - SAP S/4HANA billing document integration
 * - LHDN MyInvois API submission
 * - XML validation and QR code generation
 * - Multi-tenant configuration
 * - Automated service discovery and module activation
 *
 * @module @sap-framework/lhdn-einvoice
 */

// Export all types
export * from './types';
export * from './types/sap-mapping';

// Services
export { ValidationService } from './services/ValidationService';
export { SubmissionService } from './services/SubmissionService';
export { QRCodeService } from './services/QRCodeService';
export { MappingService } from './services/MappingService';
export { NotificationService } from './services/NotificationService';

// Rules
export * from './rules/validationRules';

// Engine (to be implemented)
// export { LHDNInvoiceEngine } from './engine/LHDNInvoiceEngine';

/**
 * Module metadata for service discovery
 */
export const MODULE_METADATA = {
  name: 'LHDN_E_Invoice',
  displayName: 'LHDN MyInvois e-Invoice',
  version: '1.0.0',
  description: 'Malaysia LHDN MyInvois e-invoice compliance module',

  // Required SAP OData services for auto-activation
  requiredServices: [
    'API_BILLING_DOCUMENT_SRV',
    'API_BUSINESS_PARTNER',
    'API_TAX_DETERMINATION_SRV',
    'API_PRODUCT_SRV',
  ],

  // Optional services for enhanced functionality
  optionalServices: [
    'API_OPLACCTGDOCITEMCUBE_SRV',
  ],

  // Capability check function
  checkCapability: (availableServices: string[]): boolean => {
    return MODULE_METADATA.requiredServices.every(
      (service) => availableServices.includes(service)
    );
  },

  // Configuration requirements
  configurationRequired: [
    'LHDN_CLIENT_ID',
    'LHDN_CLIENT_SECRET',
    'LHDN_API_BASE_URL',
    'COMPANY_TIN',
  ],
};
