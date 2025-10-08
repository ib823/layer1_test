# LHDN e-Invoice Module Design

**Module**: `@sap-framework/lhdn-einvoice`
**Version**: 1.0.0
**Purpose**: Malaysia LHDN MyInvois e-Invoice compliance and integration module for SAP Framework

---

## 1. Executive Summary

### Overview
The LHDN e-Invoice module provides automated compliance with Malaysia's Inland Revenue Board (LHDN) MyInvois e-invoicing requirements, seamlessly integrated with SAP S/4HANA billing and financial documents.

### Key Features
- ✅ Automatic invoice validation against LHDN MyInvois schema
- ✅ Real-time e-invoice generation and submission
- ✅ QR code generation and embedding
- ✅ Document status tracking and audit trail
- ✅ Multi-tenant support with tenant-specific configurations
- ✅ SAP integration via OData services
- ✅ Compliance reporting and analytics

---

## 2. Framework Integration

### 2.1 Architecture Layer Alignment

```
┌─────────────────────────────────────────────────┐
│ Layer 4: API (Express + XSUAA)                  │
│ - POST /api/lhdn/invoices/submit                │
│ - GET  /api/lhdn/invoices/:id/status            │
│ - GET  /api/lhdn/compliance/report              │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Layer 3: LHDN e-Invoice Module                  │
│ - LHDNInvoiceEngine (main engine)               │
│ - ValidationService (schema validation)         │
│ - SubmissionService (MyInvois API)              │
│ - QRCodeService (QR generation)                 │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Layer 2: Services                                │
│ - RuleEngine (validation rules)                 │
│ - AnalyticsService (compliance metrics)         │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Layer 1: Core                                    │
│ - S4HANAConnector (billing documents)           │
│ - TenantProfileRepository (tenant config)       │
│ - Database (invoice tracking)                   │
└─────────────────────────────────────────────────┘
```

### 2.2 Module Activation Logic

**Required SAP Services** (auto-detected by ServiceDiscovery):
- `API_BILLING_DOCUMENT_SRV` - Billing documents (invoices, credit notes)
- `API_BUSINESS_PARTNER` - Customer/vendor master data
- `API_TAX_DETERMINATION_SRV` - Tax calculations and codes
- `API_PRODUCT_SRV` - Material/product master data

**Capability Check**:
```typescript
// In TenantProfileRepository
if (profile.capabilities.hasBillingDocumentService &&
    profile.capabilities.hasBusinessPartnerService &&
    profile.capabilities.hasTaxDeterminationService) {
  await repo.activateModule('tenant-123', 'LHDN_EInvoice');
}
```

---

## 3. LHDN MyInvois Requirements

### 3.1 Mandatory Document Types
1. **Invoice (01)** - Standard commercial invoice
2. **Credit Note (02)** - Sales return/adjustment
3. **Debit Note (03)** - Additional charges
4. **Refund Note (04)** - Cash refunds
5. **Self-Billed Invoice (11)** - Buyer-generated invoices

### 3.2 Validation Rules

#### Schema Validation
- **Invoice Number**: Unique, alphanumeric, max 20 chars
- **Invoice Date**: ISO 8601 format, not future-dated
- **Supplier TIN**: Valid 14-digit Malaysian Tax ID
- **Customer TIN**: Valid 14-digit (for B2B) or ID/Passport (B2C)
- **Line Items**: Min 1 item, max 999 items
- **Amount**: 2 decimal precision, currency MYR
- **Tax Code**: Valid SST codes (SR, ZP, TX, etc.)

#### Business Rules
- Total amount must equal sum of line items + tax - discounts
- Tax amounts must match calculated SST (6% or 0%)
- Document currency must be MYR for local transactions
- Exchange rate required for foreign currency invoices
- Payment terms must be valid LHDN codes

### 3.3 QR Code Requirements
- **Format**: QR Code 2005 (ISO/IEC 18004:2015)
- **Content**: Digital signature of invoice XML
- **Size**: Minimum 2cm x 2cm
- **Position**: Top-right corner of printed invoice

---

## 4. Database Schema

### 4.1 Tables

```sql
-- LHDN e-Invoice submissions
CREATE TABLE lhdn_einvoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,

    -- SAP Reference
    sap_billing_document VARCHAR(50) NOT NULL,
    sap_company_code VARCHAR(10) NOT NULL,
    fiscal_year VARCHAR(4),

    -- LHDN MyInvois
    lhdn_invoice_number VARCHAR(50) UNIQUE NOT NULL,
    lhdn_document_type VARCHAR(5) NOT NULL, -- 01, 02, 03, 04, 11
    lhdn_submission_uid UUID,
    lhdn_validation_result JSONB,

    -- Document Details
    invoice_date TIMESTAMP NOT NULL,
    supplier_tin VARCHAR(20) NOT NULL,
    customer_tin VARCHAR(20),
    total_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'MYR',

    -- Status Tracking
    status VARCHAR(50) NOT NULL, -- DRAFT, VALIDATED, SUBMITTED, ACCEPTED, REJECTED, CANCELLED
    submission_status VARCHAR(50), -- PENDING, PROCESSING, SUCCESS, FAILED
    rejection_reason TEXT,

    -- QR Code
    qr_code_data TEXT,
    qr_code_image_url TEXT,

    -- XML Payload
    xml_payload TEXT,
    pdf_url TEXT,

    -- Timestamps
    validated_at TIMESTAMP,
    submitted_at TIMESTAMP,
    accepted_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Indexes
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    INDEX idx_tenant_sap (tenant_id, sap_billing_document),
    INDEX idx_lhdn_number (lhdn_invoice_number),
    INDEX idx_status (status, submission_status),
    INDEX idx_dates (invoice_date, submitted_at)
);

-- LHDN compliance audit log
CREATE TABLE lhdn_audit_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    einvoice_id UUID REFERENCES lhdn_einvoices(id),

    event_type VARCHAR(50) NOT NULL, -- VALIDATION, SUBMISSION, STATUS_UPDATE, CANCELLATION
    event_status VARCHAR(20) NOT NULL, -- SUCCESS, FAILED, WARNING
    event_data JSONB,
    error_message TEXT,
    user_id VARCHAR(255),
    ip_address VARCHAR(45),

    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_tenant_event (tenant_id, event_type, created_at),
    INDEX idx_einvoice (einvoice_id)
);

-- LHDN configuration per tenant
CREATE TABLE lhdn_tenant_config (
    tenant_id VARCHAR(255) PRIMARY KEY,

    -- MyInvois Credentials
    myinvois_client_id VARCHAR(255) ENCRYPTED,
    myinvois_client_secret VARCHAR(255) ENCRYPTED,
    myinvois_environment VARCHAR(20) DEFAULT 'SANDBOX', -- SANDBOX, PRODUCTION

    -- Company Details
    company_tin VARCHAR(20) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_address JSONB,
    company_contact JSONB,

    -- Invoice Settings
    invoice_prefix VARCHAR(20),
    auto_submit BOOLEAN DEFAULT false,
    validate_before_post BOOLEAN DEFAULT true,
    generate_qr_code BOOLEAN DEFAULT true,

    -- Notification
    notification_emails TEXT[],
    webhook_url TEXT,

    -- Tax Codes Mapping (SAP Tax Code → LHDN Tax Type)
    tax_code_mapping JSONB,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);
```

---

## 5. Module Structure

### 5.1 Package Structure
```
packages/modules/lhdn-einvoice/
├── src/
│   ├── index.ts                      # Main export
│   ├── types/
│   │   ├── index.ts                  # Type definitions
│   │   ├── lhdn-schema.ts            # LHDN MyInvois schema types
│   │   └── sap-mapping.ts            # SAP to LHDN mapping types
│   ├── engine/
│   │   └── LHDNInvoiceEngine.ts      # Main orchestration engine
│   ├── services/
│   │   ├── ValidationService.ts      # XML schema validation
│   │   ├── SubmissionService.ts      # MyInvois API integration
│   │   ├── QRCodeService.ts          # QR code generation
│   │   ├── MappingService.ts         # SAP to LHDN mapping
│   │   └── NotificationService.ts    # Alerts and webhooks
│   ├── rules/
│   │   ├── validationRules.ts        # Business validation rules
│   │   ├── taxRules.ts               # Tax calculation rules
│   │   └── complianceRules.ts        # LHDN compliance rules
│   ├── transformers/
│   │   ├── InvoiceTransformer.ts     # SAP Invoice → LHDN XML
│   │   ├── CreditNoteTransformer.ts  # SAP Credit → LHDN XML
│   │   └── XMLBuilder.ts             # XML document builder
│   ├── api/
│   │   ├── MyInvoisClient.ts         # LHDN MyInvois API client
│   │   └── SAPIntegration.ts         # SAP OData integration
│   └── utils/
│       ├── qrCodeGenerator.ts        # QR code utility
│       ├── xmlValidator.ts           # XML validation
│       └── encryptionHelper.ts       # Data encryption
├── tests/
│   ├── unit/
│   │   ├── ValidationService.test.ts
│   │   ├── MappingService.test.ts
│   │   └── InvoiceTransformer.test.ts
│   └── integration/
│       ├── end-to-end.test.ts
│       └── myinvois-api.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

### 5.2 Core Interfaces

```typescript
// types/index.ts

export interface LHDNInvoice {
  // Header
  invoiceNumber: string;
  invoiceDate: Date;
  documentType: LHDNDocumentType;
  currency: string;
  exchangeRate?: number;

  // Parties
  supplier: LHDNParty;
  customer: LHDNParty;

  // Line Items
  lineItems: LHDNLineItem[];

  // Amounts
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;

  // Payment
  paymentMode?: string;
  paymentTerms?: string;

  // References
  sapBillingDocument: string;
  sapCompanyCode: string;
  purchaseOrderRef?: string;
}

export interface LHDNParty {
  tin: string;                    // Tax Identification Number
  name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  contact?: {
    phone: string;
    email: string;
  };
  registrationNumber?: string;    // SSM/ROC number
  sstRegistrationNumber?: string; // SST registration
}

export interface LHDNLineItem {
  lineNumber: number;
  description: string;
  classification?: string;        // Product classification code
  quantity: number;
  unitPrice: number;
  taxType: LHDNTaxType;
  taxRate: number;
  taxAmount: number;
  discountAmount?: number;
  subtotal: number;
  total: number;
}

export type LHDNDocumentType = '01' | '02' | '03' | '04' | '11';
export type LHDNTaxType = 'SR' | 'ZP' | 'TX' | 'E' | 'DS';
export type InvoiceStatus = 'DRAFT' | 'VALIDATED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validatedAt: Date;
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'ERROR' | 'CRITICAL';
}

export interface SubmissionResult {
  success: boolean;
  submissionUid?: string;
  lhdnReferenceNumber?: string;
  timestamp: Date;
  qrCodeData?: string;
  errors?: string[];
}
```

---

## 6. Integration Points

### 6.1 SAP Data Sources

#### Required OData Services
```typescript
// SAP S/4HANA OData Services
const SAP_SERVICES = {
  billingDocument: 'API_BILLING_DOCUMENT_SRV',
  businessPartner: 'API_BUSINESS_PARTNER',
  taxDetermination: 'API_TAX_DETERMINATION_SRV',
  productMaster: 'API_PRODUCT_SRV',
  companyCode: 'API_OPLACCTGDOCITEMCUBE_SRV'
};
```

#### Data Mapping
```typescript
// SAP Billing Document → LHDN Invoice
const sapToLHDNMapping = {
  // Header
  BillingDocument → invoiceNumber (with prefix)
  BillingDocumentDate → invoiceDate
  TransactionCurrency → currency

  // Supplier (from Company Code)
  CompanyCode → lookup company TIN
  CompanyCodeName → supplier.name

  // Customer (from Business Partner)
  SoldToParty → lookup customer TIN
  SoldToPartyName → customer.name

  // Line Items
  BillingDocumentItem → lineItems[]
  BillingQuantity → quantity
  NetAmount → subtotal
  TaxCode → taxType (via mapping table)
  TaxAmount → taxAmount

  // Totals
  NetAmountInTransacCurrency → subtotal
  TaxAmountInTransacCurrency → taxAmount
  TotalAmountInTransacCurrency → totalAmount
};
```

### 6.2 LHDN MyInvois API Integration

#### API Endpoints
```typescript
const MYINVOIS_ENDPOINTS = {
  // Sandbox
  sandbox: 'https://api-sandbox.myinvois.hasil.gov.my',

  // Production
  production: 'https://api.myinvois.hasil.gov.my',

  // Operations
  auth: '/connect/token',
  validate: '/api/v1.0/documents/validate',
  submit: '/api/v1.0/documents/submit',
  status: '/api/v1.0/documents/{uid}/status',
  cancel: '/api/v1.0/documents/{uid}/cancel',
  search: '/api/v1.0/documents/search'
};
```

#### Authentication Flow
```typescript
// OAuth 2.0 Client Credentials
async function authenticate(): Promise<string> {
  const response = await axios.post(MYINVOIS_ENDPOINTS.auth, {
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'InvoicingAPI'
  });

  return response.data.access_token;
}
```

---

## 7. Workflow & Process Flow

### 7.1 Invoice Submission Workflow

```
┌─────────────┐
│ SAP Billing │
│  Document   │
│   Posted    │
└──────┬──────┘
       │
       ↓
┌──────────────────────────────┐
│ 1. Fetch Billing Document    │
│    (S4HANAConnector)          │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────────────────────┐
│ 2. Transform SAP → LHDN      │
│    (InvoiceTransformer)       │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────────────────────┐
│ 3. Validate Against Schema   │
│    (ValidationService)        │
└──────┬───────────────────────┘
       │
       ├─── Invalid ───┐
       │               ↓
       │        ┌──────────────┐
       │        │ Return Errors│
       │        └──────────────┘
       │
       ↓ Valid
┌──────────────────────────────┐
│ 4. Generate XML Document     │
│    (XMLBuilder)               │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────────────────────┐
│ 5. Submit to LHDN MyInvois   │
│    (SubmissionService)        │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────────────────────┐
│ 6. Generate QR Code          │
│    (QRCodeService)            │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────────────────────┐
│ 7. Store in Database         │
│    (lhdn_einvoices table)     │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────────────────────┐
│ 8. Send Notifications        │
│    (NotificationService)      │
└──────────────────────────────┘
```

### 7.2 Status Polling & Updates

```typescript
// Periodic status check (every 5 minutes for pending invoices)
async function pollInvoiceStatus(invoiceId: string): Promise<void> {
  const invoice = await db.findInvoice(invoiceId);

  if (invoice.submissionStatus === 'PROCESSING') {
    const status = await myInvoisClient.getStatus(invoice.lhdnSubmissionUid);

    if (status.state === 'ACCEPTED') {
      await db.updateInvoice(invoiceId, {
        status: 'ACCEPTED',
        submissionStatus: 'SUCCESS',
        acceptedAt: new Date(),
        lhdnReferenceNumber: status.referenceNumber
      });

      await notificationService.sendAcceptanceNotification(invoice);
    }

    if (status.state === 'REJECTED') {
      await db.updateInvoice(invoiceId, {
        status: 'REJECTED',
        submissionStatus: 'FAILED',
        rejectionReason: status.errors.join(', ')
      });

      await notificationService.sendRejectionNotification(invoice);
    }
  }
}
```

---

## 8. API Endpoints

### 8.1 REST API Design

```typescript
// Controller: LHDNInvoiceController.ts

// Submit invoice to LHDN
POST /api/:tenantId/lhdn/invoices/submit
Request: {
  sapBillingDocument: string;
  sapCompanyCode: string;
  autoSubmit?: boolean;
}
Response: {
  invoiceId: string;
  status: InvoiceStatus;
  validationResult: ValidationResult;
  submissionResult?: SubmissionResult;
}

// Get invoice status
GET /api/:tenantId/lhdn/invoices/:invoiceId/status
Response: {
  invoiceId: string;
  lhdnInvoiceNumber: string;
  status: InvoiceStatus;
  submissionStatus: string;
  lhdnReferenceNumber?: string;
  qrCodeUrl?: string;
  pdfUrl?: string;
}

// Cancel submitted invoice
POST /api/:tenantId/lhdn/invoices/:invoiceId/cancel
Request: {
  cancellationReason: string;
}
Response: {
  success: boolean;
  cancelledAt: Date;
}

// Bulk validation
POST /api/:tenantId/lhdn/invoices/validate-bulk
Request: {
  billingDocuments: string[];
}
Response: {
  results: {
    document: string;
    isValid: boolean;
    errors: ValidationError[];
  }[];
}

// Compliance report
GET /api/:tenantId/lhdn/compliance/report
Query: {
  fromDate: string;
  toDate: string;
  format?: 'json' | 'csv' | 'pdf';
}
Response: {
  totalInvoices: number;
  submitted: number;
  accepted: number;
  rejected: number;
  pending: number;
  complianceRate: number;
  rejectionReasons: { reason: string; count: number; }[];
}
```

---

## 9. Configuration & Deployment

### 9.1 Environment Variables

```bash
# LHDN MyInvois API
LHDN_MYINVOIS_ENVIRONMENT=SANDBOX  # or PRODUCTION
LHDN_MYINVOIS_BASE_URL=https://api-sandbox.myinvois.hasil.gov.my
LHDN_CLIENT_ID=<encrypted>
LHDN_CLIENT_SECRET=<encrypted>

# QR Code Settings
QR_CODE_SIZE=200  # pixels
QR_CODE_FORMAT=PNG
QR_CODE_ERROR_CORRECTION=M  # L, M, Q, H

# Processing
LHDN_AUTO_SUBMIT=false
LHDN_STATUS_POLL_INTERVAL=300000  # 5 minutes in ms
LHDN_RETRY_ATTEMPTS=3
LHDN_TIMEOUT=30000  # 30 seconds

# Storage
LHDN_PDF_STORAGE_PATH=/storage/lhdn/pdfs
LHDN_XML_RETENTION_DAYS=2555  # 7 years (LHDN requirement)
```

### 9.2 Module Activation

```typescript
// In ServiceDiscovery.ts - Add LHDN detection
const lhdnCapability = {
  canDoLHDNEInvoice:
    services.includes('API_BILLING_DOCUMENT_SRV') &&
    services.includes('API_BUSINESS_PARTNER') &&
    services.includes('API_TAX_DETERMINATION_SRV') &&
    tenant.country === 'MY'  // Malaysia only
};

// Auto-activate if capable
if (lhdnCapability.canDoLHDNEInvoice) {
  await activateModule(tenantId, 'LHDN_EInvoice');
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests
- Validation rules (90%+ coverage)
- SAP to LHDN transformation
- XML generation
- QR code generation
- Tax calculations

### 10.2 Integration Tests
- SAP OData connectivity
- MyInvois API mock tests
- Database operations
- End-to-end invoice flow

### 10.3 Test Data
```typescript
// tests/fixtures/sample-invoice.ts
export const sampleSAPInvoice = {
  BillingDocument: '9000000001',
  BillingDocumentDate: '2024-01-15',
  SoldToParty: '1000001',
  TransactionCurrency: 'MYR',
  TotalNetAmount: '1000.00',
  TaxAmount: '60.00',
  // ... complete SAP structure
};

export const expectedLHDNOutput = {
  invoiceNumber: 'INV-2024-000001',
  documentType: '01',
  supplier: {
    tin: '12345678901234',
    name: 'ABC Sdn Bhd',
    // ...
  },
  // ... expected LHDN XML structure
};
```

---

## 11. Compliance & Security

### 11.1 Data Retention
- Invoice XML: **7 years** (LHDN requirement)
- Audit logs: **7 years**
- QR codes: **7 years**
- Personal data: Encrypted at rest

### 11.2 Security Measures
- API credentials encrypted (AES-256-GCM)
- TLS 1.2+ for MyInvois API
- XSUAA authentication for API endpoints
- Rate limiting (100 req/min per tenant)
- Input validation and sanitization

### 11.3 Audit Trail
Every action logged:
- Validation attempts
- Submissions
- Status changes
- Cancellations
- Configuration changes

---

## 12. Success Metrics

### 12.1 KPIs
- **Submission Success Rate**: > 95%
- **Validation Accuracy**: > 99%
- **Processing Time**: < 30 seconds per invoice
- **API Uptime**: > 99.5%
- **Compliance Rate**: 100%

### 12.2 Monitoring
- Real-time dashboard for submission status
- Alert on rejection rate > 5%
- Performance metrics (latency, throughput)
- Error tracking and analysis

---

## 13. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- ✅ Database schema
- ✅ Core types and interfaces
- ✅ SAP connector integration
- ✅ Basic validation service

### Phase 2: Core Features (Week 3-4)
- ✅ Invoice transformation (SAP → LHDN)
- ✅ XML generation
- ✅ MyInvois API client
- ✅ QR code generation

### Phase 3: Integration (Week 5-6)
- ✅ API endpoints
- ✅ Status polling
- ✅ Notification service
- ✅ Error handling

### Phase 4: Testing & Deployment (Week 7-8)
- ✅ Unit tests (90%+ coverage)
- ✅ Integration tests
- ✅ UAT with sandbox
- ✅ Production deployment

---

## 14. Dependencies

### 14.1 NPM Packages
```json
{
  "dependencies": {
    "@sap-framework/core": "workspace:*",
    "@sap-framework/services": "workspace:*",
    "axios": "^1.6.0",
    "fast-xml-parser": "^4.3.0",
    "qrcode": "^1.5.3",
    "ajv": "^8.12.0",
    "uuid": "^9.0.1",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "nock": "^13.4.0",
    "@types/qrcode": "^1.5.5"
  }
}
```

### 14.2 External Services
- LHDN MyInvois API (Sandbox & Production)
- SAP S/4HANA OData services
- PostgreSQL database
- Redis (for caching and rate limiting)

---

## 15. Support & Documentation

### 15.1 User Documentation
- Module setup guide
- Configuration tutorial
- Troubleshooting guide
- API reference

### 15.2 Developer Documentation
- Architecture diagrams
- API integration guide
- Extension points
- Testing guide

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**Author**: SAP Framework Team
**Reviewers**: [To be assigned]

---

## Appendix A: LHDN MyInvois Schema Reference

[Include official LHDN XML schema documentation]

## Appendix B: SAP Field Mapping Table

[Include complete SAP to LHDN field mapping reference]

## Appendix C: Tax Code Mapping

[Include SST tax code mapping table]
