# @sap-framework/lhdn-einvoice

Malaysia LHDN MyInvois e-Invoice Module for SAP MVP Framework

## Overview

This module provides integration with Malaysia's LHDN (Lembaga Hasil Dalam Negeri) MyInvois e-invoicing system, enabling automatic conversion of SAP S/4HANA billing documents to LHDN-compliant e-invoices.

## Features

- ✅ SAP S/4HANA billing document integration
- ✅ LHDN MyInvois API submission (OAuth 2.0)
- ✅ Comprehensive validation rules based on LHDN SDK v4.0
- ✅ QR code generation for invoice validation
- ✅ Multi-tenant configuration support
- ✅ Automated service discovery and module activation
- ✅ Database schema for invoice storage and audit trails

## Module Architecture

This module follows the SAP MVP Framework 4-layer architecture:

```
Layer 4: API → REST endpoints (packages/api)
Layer 3: Module → @sap-framework/lhdn-einvoice (this package)
Layer 2: Services → @sap-framework/services
Layer 1: Core → @sap-framework/core
```

## Dependencies

### Required SAP OData Services

The module requires these SAP S/4HANA OData services to be available:

- `API_BILLING_DOCUMENT_SRV` - Billing document data
- `API_BUSINESS_PARTNER` - Supplier/buyer information
- `API_TAX_DETERMINATION_SRV` - Tax calculation
- `API_PRODUCT_SRV` - Product master data

### Optional Services

- `API_OPLACCTGDOCITEMCUBE_SRV` - Company code information

## Installation

This package is part of the SAP MVP Framework monorepo. Install all dependencies:

```bash
pnpm install
```

## Database Setup

Run the database migration to create the required tables:

```bash
psql sapframework < infrastructure/database/migrations/005_add_lhdn_einvoice.sql
```

This creates three tables:
- `lhdn_einvoices` - E-invoice documents
- `lhdn_audit_log` - Audit trail
- `lhdn_tenant_config` - Tenant-specific configuration

## Usage

### Module Metadata

```typescript
import { MODULE_METADATA } from '@sap-framework/lhdn-einvoice';

console.log(MODULE_METADATA.name); // 'LHDN_E_Invoice'
console.log(MODULE_METADATA.requiredServices); // ['API_BILLING_DOCUMENT_SRV', ...]
```

### Type Definitions

```typescript
import {
  LHDNInvoice,
  LHDNParty,
  LHDNLineItem,
  LHDNTenantConfig,
} from '@sap-framework/lhdn-einvoice';
```

### Validation Rules

```typescript
import { validateInvoice } from '@sap-framework/lhdn-einvoice';

const result = validateInvoice(invoice);

if (!result.isValid) {
  console.error('Validation errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Validation warnings:', result.warnings);
}
```

## Configuration

### Tenant Configuration

Each tenant must configure their LHDN MyInvois credentials:

```typescript
const config: LHDNTenantConfig = {
  tenantId: 'tenant-123',
  clientId: 'your-client-id', // OAuth client ID
  clientSecret: 'your-client-secret', // OAuth client secret (encrypted)
  apiBaseUrl: 'https://myinvois-api.hasil.gov.my',
  environment: 'PRODUCTION', // or 'SANDBOX'
  companyTin: '1234567890123',
  companyName: 'ACME Corporation Sdn Bhd',
  companyAddress: {
    line1: 'Level 5, Tower A',
    city: 'Kuala Lumpur',
    state: 'WP Kuala Lumpur',
    postalCode: '50088',
    country: 'MY',
  },
  taxCodeMapping: {
    'V0': 'SR', // Standard Rated 6%
    'VE': 'E',  // Exempt
    'VZ': 'ZP', // Zero Rated
  },
  autoSubmit: false,
  validateBeforePost: true,
  generateQrCode: true,
};
```

## SAP Data Mapping

The module maps SAP billing documents to LHDN invoice format:

| SAP Field | LHDN Field | Transform |
|-----------|------------|-----------|
| `BillingDocument` | `invoiceNumber` | With optional prefix |
| `BillingDocumentDate` | `invoiceDate` | Date conversion |
| `TransactionCurrency` | `currency` | Must be MYR |
| `TotalNetAmount` | `subtotalAmount` | String to number |
| `TotalTaxAmount` | `totalTaxAmount` | String to number |
| `TotalGrossAmount` | `totalAmount` | String to number |

## Validation Rules

### Critical Rules (Must Pass)

- `LHDN-001`: Invoice number is required
- `LHDN-002`: Currency must be MYR
- `LHDN-003`: Supplier TIN is mandatory
- `LHDN-004`: Buyer TIN is mandatory
- `LHDN-005`: Invoice date cannot be in the future
- `LHDN-006`: At least one line item required
- `LHDN-007`: Total amount must be positive

### Error Rules (Should Pass)

- `LHDN-101`: Supplier address complete
- `LHDN-102`: Buyer address complete
- `LHDN-103`: Line item amounts calculated correctly
- `LHDN-104`: Total matches sum of line items
- `LHDN-105`: Total tax matches sum of line item taxes
- `LHDN-106`: Supplier TIN format (12-14 digits)
- `LHDN-107`: Buyer TIN format (12-14 digits)

### Warning Rules (Recommended)

- `LHDN-W01`: Supplier contact information recommended
- `LHDN-W02`: Buyer contact information recommended
- `LHDN-W03`: Invoice date older than 30 days
- `LHDN-W04`: Due date recommended
- `LHDN-W05`: Payment mode recommended

## Document Types

- `01` - Invoice
- `02` - Credit Note
- `03` - Debit Note
- `04` - Refund Note
- `11` - Self-Billed Invoice

## Tax Types

- `SR` - Standard Rated (6% SST)
- `ZP` - Zero Rated
- `TX` - Taxable (generic)
- `E` - Exempt
- `DS` - Deemed Supply

## Development

### Build

```bash
pnpm build
```

### Run Tests

```bash
pnpm test
```

### Type Check

```bash
pnpm typecheck
```

### Lint

```bash
pnpm lint
pnpm lint:fix
```

## Implementation Status

### Phase 1: Foundation ✅ COMPLETED

- [x] Database schema
- [x] Core types and interfaces
- [x] Validation rules
- [x] SAP connector integration types

### Phase 2: Core Services (Pending)

- [ ] MappingService - SAP to LHDN mapping
- [ ] ValidationService - XML schema validation
- [ ] QRCodeService - QR code generation
- [ ] SubmissionService - MyInvois API integration
- [ ] NotificationService - Alerts and webhooks

### Phase 3: Engine & API (Pending)

- [ ] LHDNInvoiceEngine - Main orchestration
- [ ] API endpoints (submit, status, cancel, validate-bulk)
- [ ] Repository for database operations

### Phase 4: Integration (Pending)

- [ ] Service discovery integration
- [ ] Module activation logic
- [ ] End-to-end tests
- [ ] Documentation

## References

- [LHDN MyInvois SDK Guideline v4.0](https://sdk.myinvois.hasil.gov.my)
- [Malaysia SST Act 2018](https://www.customs.gov.my/en/ip/pages/ip_sst.aspx)
- [ISO/IEC 18004:2015 - QR Code Standard](https://www.iso.org/standard/62021.html)
- Design Document: `/docs/modules/LHDN_E_INVOICE_MODULE_DESIGN.md`

## License

Proprietary - SAP MVP Framework

## Support

For issues or questions:
- Email: ikmal.baharudin@gmail.com
- Repository: https://github.com/ib823/layer1_test
