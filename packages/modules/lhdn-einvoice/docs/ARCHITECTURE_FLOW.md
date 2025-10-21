# LHDN e-Invoice Architecture & Flow Diagram

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    USER LAYER                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Finance    │  │  Accounting  │  │   Auditor    │  │   Customer   │               │
│  │   Manager    │  │     Clerk    │  │              │  │   Portal     │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                 │                         │
│         └─────────────────┴─────────────────┴─────────────────┘                         │
│                                     │                                                    │
└─────────────────────────────────────┼────────────────────────────────────────────────────┘
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              WEB APPLICATION LAYER                                      │
│                         (@sap-framework/web - Next.js 15)                               │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │  React Components                                                               │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │    │
│  │  │  Invoice    │  │  Dashboard  │  │  Reports    │  │   Status    │          │    │
│  │  │  Submission │  │             │  │  (Compliance│  │   Tracking  │          │    │
│  │  │   Form      │  │   Stats     │  │   Reports)  │  │             │          │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │    │
│  │                                                                                 │    │
│  │  State Management: React Context / Zustand                                     │    │
│  │  UI Components: shadcn/ui, TailwindCSS                                         │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
│                                     │                                                    │
│                                     │ REST API / GraphQL                                 │
└─────────────────────────────────────┼────────────────────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  API GATEWAY LAYER                                      │
│                         (@sap-framework/api - Express.js)                               │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │  Authentication & Authorization (OAuth 2.0, JWT)                               │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │    │
│  │  │  Tenant  │  │   Role   │  │   Rate   │  │  Request │                      │    │
│  │  │  Resolver│  │   Guard  │  │  Limiter │  │  Logger  │                      │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘                      │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │  API Controllers                                                                │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │    │
│  │  │ TenantController│  │  UserController │  │ ModuleController│               │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘               │    │
│  │                                                                                 │    │
│  │  ┌──────────────────────────────────────────────────────────────────┐         │    │
│  │  │          LHDN e-Invoice Controller (Phase 3)                     │         │    │
│  │  │  POST   /lhdn/invoices/submit                                    │         │    │
│  │  │  GET    /lhdn/invoices/:id                                       │         │    │
│  │  │  GET    /lhdn/invoices                                           │         │    │
│  │  │  POST   /lhdn/invoices/:id/cancel                                │         │    │
│  │  │  POST   /lhdn/invoices/bulk-submit                               │         │    │
│  │  │  GET    /lhdn/compliance/report                                  │         │    │
│  │  └──────────────────────────────────────────────────────────────────┘         │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
│                                     │                                                    │
└─────────────────────────────────────┼────────────────────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              BUSINESS LOGIC LAYER                                       │
│                     (@sap-framework/lhdn-einvoice Module)                               │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │                      LHDN Invoice Engine (Orchestrator)                        │    │
│  │  ┌──────────────────────────────────────────────────────────────────────┐     │    │
│  │  │  Main Workflow Methods:                                              │     │    │
│  │  │  • initialize()          - Setup tenant config & SAP connector       │     │    │
│  │  │  • submitInvoice()       - End-to-end invoice submission             │     │    │
│  │  │  • getInvoiceStatus()    - Query LHDN status                         │     │    │
│  │  │  • cancelInvoice()       - Cancel submitted invoice                  │     │    │
│  │  │  • getComplianceReport() - Generate compliance reports               │     │    │
│  │  └──────────────────────────────────────────────────────────────────────┘     │    │
│  └─────────────────────────────────┬──────────────────────────────────────────────┘    │
│                                    │                                                     │
│           ┌────────────────────────┼────────────────────────┬──────────────────┐       │
│           ▼                        ▼                        ▼                  ▼       │
│  ┌─────────────────┐   ┌────────────────────┐   ┌─────────────────┐  ┌──────────────┐│
│  │  MappingService │   │ ValidationService  │   │ SubmissionService│  │QRCodeService││
│  │                 │   │                    │   │                  │  │              ││
│  │ • SAP → LHDN   │   │ • Business Rules   │   │ • OAuth 2.0      │  │ • Generate  ││
│  │   mapping       │   │ • Field validation │   │ • Submit to LHDN │  │   QR code   ││
│  │ • Document type │   │ • XML schema       │   │ • Status query   │  │ • Validation││
│  │ • Tax codes     │   │ • Submission check │   │ • Cancellation   │  │   URL       ││
│  │ • Line items    │   │                    │   │                  │  │              ││
│  └─────────────────┘   └────────────────────┘   └─────────────────┘  └──────────────┘│
│                                                            │                             │
│  ┌─────────────────────┐                                 │                             │
│  │ NotificationService │◄────────────────────────────────┘                             │
│  │ • Email alerts      │                                                                │
│  │ • Webhook events    │                                                                │
│  │ • Status updates    │                                                                │
│  └─────────────────────┘                                                                │
│                                     │                                                    │
│                                     ▼                                                    │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │                    LHDN Invoice Repository (Data Layer)                        │    │
│  │  • createInvoice()         • getInvoiceById()                                  │    │
│  │  • updateInvoiceStatus()   • getInvoicesByTenant()                             │    │
│  │  • getComplianceReport()   • logAuditEvent()                                   │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
│                                     │                                                    │
└─────────────────────────────────────┼────────────────────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA PERSISTENCE LAYER                                     │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │                         PostgreSQL Database (Multi-tenant)                     │    │
│  │                                                                                 │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐              │    │
│  │  │   lhdn_tenant   │  │ lhdn_einvoices  │  │ lhdn_audit_log   │              │    │
│  │  │    _configs     │  │                 │  │                  │              │    │
│  │  ├─────────────────┤  ├─────────────────┤  ├──────────────────┤              │    │
│  │  │ tenant_id (PK)  │  │ id (PK)         │  │ id (PK)          │              │    │
│  │  │ client_id       │  │ tenant_id (FK)  │  │ tenant_id (FK)   │              │    │
│  │  │ client_secret   │  │ invoice_number  │  │ invoice_id (FK)  │              │    │
│  │  │ api_base_url    │  │ document_type   │  │ action           │              │    │
│  │  │ company_tin     │  │ status          │  │ timestamp        │              │    │
│  │  │ environment     │  │ supplier (JSON) │  │ request_data     │              │    │
│  │  │ auto_submit     │  │ buyer (JSON)    │  │ response_data    │              │    │
│  │  │ tax_mapping     │  │ line_items (JSON│  │ success          │              │    │
│  │  └─────────────────┘  │ sap_billing_doc │  └──────────────────┘              │    │
│  │                       │ submission_uid  │                                     │    │
│  │                       │ lhdn_ref_number │                                     │    │
│  │                       │ qr_code_data    │                                     │    │
│  │                       └─────────────────┘                                     │    │
│  │                                                                                 │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐          │    │
│  │  │  Redis Cache (Session & Token Storage)                          │          │    │
│  │  │  • OAuth tokens                                                  │          │    │
│  │  │  • LHDN API rate limiting                                        │          │    │
│  │  │  • Session management                                            │          │    │
│  │  └─────────────────────────────────────────────────────────────────┘          │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                    │                                           │
                    │                                           │
        ┌───────────▼──────────┐                   ┌───────────▼──────────┐
        │  SAP INTEGRATION     │                   │  LHDN INTEGRATION    │
        │       LAYER          │                   │       LAYER          │
        └──────────────────────┘                   └──────────────────────┘
                    │                                           │
      ┌─────────────┴─────────────┐                            │
      ▼                           ▼                            ▼
┌────────────────────┐  ┌────────────────────┐   ┌────────────────────────────┐
│                    │  │                    │   │   LHDN MyInvois API        │
│  SAP S/4HANA       │  │  SAP Ariba         │   │   (External Government)    │
│  (Private/Public)  │  │  (Public Cloud)    │   │                            │
│                    │  │                    │   │ ┌────────────────────────┐ │
│ ┌────────────────┐ │  │ ┌────────────────┐ │   │ │  OAuth 2.0 Endpoint    │ │
│ │ FI (Finance)   │ │  │ │ Procurement    │ │   │ │  /connect/token        │ │
│ │ • Billing Docs │ │  │ │ Invoices       │ │   │ └────────────────────────┘ │
│ │ • AR/AP        │ │  │ └────────────────┘ │   │                            │
│ └────────────────┘ │  │                    │   │ ┌────────────────────────┐ │
│                    │  │ ┌────────────────┐ │   │ │  Invoice Submission    │ │
│ ┌────────────────┐ │  │ │ Supplier       │ │   │ │  /api/v1.0/documents   │ │
│ │ SD (Sales)     │ │  │ │ Network        │ │   │ └────────────────────────┘ │
│ │ • Sales Orders │ │  │ └────────────────┘ │   │                            │
│ │ • Deliveries   │ │  │                    │   │ ┌────────────────────────┐ │
│ └────────────────┘ │  └────────────────────┘   │ │  Status Query          │ │
│                    │            │               │ │  /api/v1.0/documents/  │ │
│ ┌────────────────┐ │            │               │ │  {uuid}/status         │ │
│ │ MM (Materials) │ │            │               │ └────────────────────────┘ │
│ │ • PO           │ │            │               │                            │
│ │ • GR/IR        │ │            │               │ ┌────────────────────────┐ │
│ └────────────────┘ │            │               │ │  Cancellation          │ │
│                    │            │               │ │  /api/v1.0/documents/  │ │
│ OData API v2/v4    │            │               │ │  {uuid}/cancel         │ │
│ RFC/BAPI           │            │               │ └────────────────────────┘ │
└────────────────────┘            │               │                            │
                                  │               │ Environment:               │
         │                        │               │ • SANDBOX (Testing)        │
         │                        ▼               │ • PRODUCTION               │
         │               ┌────────────────────┐   └────────────────────────────┘
         │               │                    │
         │               │  SAP SuccessFactors│
         │               │  (Public Cloud)    │
         │               │                    │
         │               │ ┌────────────────┐ │
         │               │ │ Employee Payroll│ │
         │               │ └────────────────┘ │
         │               │                    │
         │               │ ┌────────────────┐ │
         │               │ │ Expense Reports│ │
         │               │ └────────────────┘ │
         │               │                    │
         │               │ OData API          │
         │               └────────────────────┘
         │                        │
         └────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                       SAP CONNECTOR LAYER (@sap-framework/core)                         │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │                         S4HANAConnector (OData v2/v4)                          │    │
│  │  • executeRequest()          - Generic OData request handler                   │    │
│  │  • fetchBillingDocument()    - Get FI billing document                         │    │
│  │  • fetchBusinessPartner()    - Get customer/supplier master                    │    │
│  │  • fetchSalesOrder()         - Get SD sales order                              │    │
│  │  • Connection pooling, retry logic, error handling                             │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │                         AribaConnector (Ariba Network API)                     │    │
│  │  • fetchProcurementInvoice() - Get supplier invoice from Ariba Network         │    │
│  │  • fetchPurchaseOrder()      - Get PO details                                  │    │
│  │  • OAuth 2.0 authentication                                                    │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │                    SuccessFactorsConnector (SFSF OData API)                    │    │
│  │  • fetchExpenseReport()      - Get employee expense claims                     │    │
│  │  • fetchPayrollInvoice()     - Get payroll service invoices                    │    │
│  │  • OAuth 2.0 + SAML authentication                                             │    │
│  └────────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Deployment Topologies

### 1. PUBLIC CLOUD DEPLOYMENT (SAP BTP + Cloud Services)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        SAP Business Technology Platform (BTP)                │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Cloud Foundry / Kyma Runtime                                       │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │    │
│  │  │  Web App      │  │  API Service  │  │  LHDN Module  │           │    │
│  │  │  (Next.js)    │  │  (Express)    │  │  (Node.js)    │           │    │
│  │  └───────────────┘  └───────────────┘  └───────────────┘           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  SAP HANA Cloud (PostgreSQL-compatible)                             │    │
│  │  • Multi-tenant database                                            │    │
│  │  • Encrypted at rest & in transit                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  SAP Connectivity Service                                           │    │
│  │  • Cloud Connector for on-premise S/4HANA                           │    │
│  │  • Direct integration for cloud S/4HANA                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│           │                           │                          │            │
└───────────┼───────────────────────────┼──────────────────────────┼────────────┘
            │                           │                          │
            ▼                           ▼                          ▼
    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
    │ S/4HANA Cloud│          │  SAP Ariba   │          │SuccessFactors│
    │ (Public SaaS)│          │ (Public SaaS)│          │ (Public SaaS)│
    │              │          │              │          │              │
    │ Region:      │          │ Multi-tenant │          │ Multi-tenant │
    │ • Singapore  │          │ Global       │          │ Global       │
    │ • Sydney     │          └──────────────┘          └──────────────┘
    └──────────────┘
```

### 2. HYBRID CLOUD DEPLOYMENT (On-Premise + Cloud)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            CUSTOMER DATA CENTER                              │
│                            (Private Cloud / On-Premise)                      │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Kubernetes Cluster (Private)                                       │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │    │
│  │  │  Web App      │  │  API Service  │  │  LHDN Module  │           │    │
│  │  │  (Next.js)    │  │  (Express)    │  │  (Node.js)    │           │    │
│  │  │               │  │               │  │               │           │    │
│  │  │  Replicas: 3  │  │  Replicas: 5  │  │  Replicas: 3  │           │    │
│  │  └───────────────┘  └───────────────┘  └───────────────┘           │    │
│  │                                                                      │    │
│  │  Load Balancer (HAProxy / NGINX)                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  PostgreSQL Cluster (HA)                                            │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                             │    │
│  │  │ Primary │──│ Replica │──│ Replica │                             │    │
│  │  └─────────┘  └─────────┘  └─────────┘                             │    │
│  │  Streaming replication, Automatic failover                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  SAP S/4HANA (On-Premise)                                           │    │
│  │  • Direct LAN connection                                            │    │
│  │  • RFC, OData, IDoc integration                                     │    │
│  │  • Low latency (~1-5ms)                                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│           │ Firewall                                                         │
└───────────┼──────────────────────────────────────────────────────────────────┘
            │ VPN / Direct Connect
            ▼
┌───────────────────────────────────┐
│     PUBLIC CLOUD SERVICES         │
│  ┌─────────────────────────────┐  │
│  │  SAP Ariba (Public SaaS)    │  │
│  │  • VPN tunnel               │  │
│  │  • OAuth integration        │  │
│  └─────────────────────────────┘  │
│                                    │
│  ┌─────────────────────────────┐  │
│  │  SuccessFactors (SaaS)      │  │
│  │  • SAML SSO                 │  │
│  │  • Secure gateway           │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
            │
            ▼ HTTPS
┌───────────────────────────────────┐
│  LHDN MyInvois API (Malaysia)     │
│  • api.myinvois.hasil.gov.my      │
│  • TLS 1.3                        │
└───────────────────────────────────┘
```

## End-to-End Invoice Flow (Step-by-Step)

### Scenario: Submit Sales Invoice from SAP S/4HANA to LHDN

```
Step 1: Invoice Creation in SAP
┌─────────────────────────────────────────────────────────────────┐
│  SAP S/4HANA FI Module                                          │
│  • Transaction: VF01 (Create Billing Document)                  │
│  • User creates invoice for customer                            │
│  • SAP generates: BillingDocument: 9000000001                   │
│  • Status: Posted, Ready for e-Invoice submission               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
Step 2: User Initiates e-Invoice Submission
┌─────────────────────────────────────────────────────────────────┐
│  Web Application (Finance Manager Dashboard)                    │
│  • User navigates to: "LHDN e-Invoice" menu                     │
│  • Enters SAP Billing Document: 9000000001                      │
│  • Selects Company Code: 1000                                   │
│  • Clicks: "Submit to LHDN"                                     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP POST /lhdn/invoices/submit
                            │ Body: {
                            │   sapBillingDocument: "9000000001",
                            │   sapCompanyCode: "1000",
                            │   autoSubmit: true
                            │ }
                            ▼
Step 3: API Gateway Processing
┌─────────────────────────────────────────────────────────────────┐
│  LHDNInvoiceController                                          │
│  1. Authenticate user (JWT token validation)                    │
│  2. Resolve tenant ID from JWT claims                           │
│  3. Rate limit check (max 100 req/min per tenant)               │
│  4. Request validation (schema check)                           │
│  5. Call: engine.submitInvoice()                                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
Step 4: Engine Orchestration
┌─────────────────────────────────────────────────────────────────┐
│  LHDNInvoiceEngine.submitInvoice()                              │
│                                                                  │
│  4.1 Check for existing invoice                                 │
│      • Query: repository.getInvoiceBySAPDocument()              │
│      • If exists & ACCEPTED → return early                      │
│                                                                  │
│  4.2 Fetch SAP billing document                                 │
│      ┌──────────────────────────────────────────────┐          │
│      │ S4HANAConnector.executeRequest()             │          │
│      │ OData: /sap/opu/odata/sap/API_BILLING_DOC... │          │
│      │ Filter: BillingDocument eq '9000000001'      │          │
│      │ Expand: to_Item, to_Partner                  │          │
│      └──────────────────────────────────────────────┘          │
│                                                                  │
│  4.3 Fetch customer (buyer) data                                │
│      ┌──────────────────────────────────────────────┐          │
│      │ S4HANAConnector.executeRequest()             │          │
│      │ OData: /sap/opu/odata/sap/API_BUSINESS_PART  │          │
│      │ Filter: BusinessPartner eq '1000001'         │          │
│      │ Expand: to_BusinessPartnerAddress           │          │
│      └──────────────────────────────────────────────┘          │
│                                                                  │
│  4.4 Map SAP → LHDN format                                      │
│      ┌──────────────────────────────────────────────┐          │
│      │ MappingService.mapBillingDocumentToInvoice() │          │
│      │ • Map document type: F2 → '01' (Invoice)     │          │
│      │ • Map tax codes: V6 → 'SR' (6% SST)          │          │
│      │ • Map state codes: '14' → 'WP Kuala Lumpur'  │          │
│      │ • Build line items array                     │          │
│      │ • Calculate totals                           │          │
│      └──────────────────────────────────────────────┘          │
│                                                                  │
│  4.5 Validate invoice                                           │
│      ┌──────────────────────────────────────────────┐          │
│      │ ValidationService.validateForSubmission()    │          │
│      │ • Check required fields (TIN, amounts)       │          │
│      │ • Validate TIN format (12-14 digits)         │          │
│      │ • Check date not in future                   │          │
│      │ • Verify tax calculations                    │          │
│      │ • Ensure total = sum(line items)             │          │
│      │ • Max 999 line items                         │          │
│      │ Result: { isValid: true, errors: [] }        │          │
│      └──────────────────────────────────────────────┘          │
│                                                                  │
│  4.6 Save to database                                           │
│      ┌──────────────────────────────────────────────┐          │
│      │ repository.createInvoice()                   │          │
│      │ INSERT INTO lhdn_einvoices                   │          │
│      │ • id: 'inv-uuid-123'                         │          │
│      │ • status: 'DRAFT'                            │          │
│      │ • tenant_id: 'tenant-123'                    │          │
│      │ • invoice_number: 'INV-9000000001'           │          │
│      │ • supplier, buyer, line_items (JSONB)        │          │
│      │ • sap_billing_document: '9000000001'         │          │
│      └──────────────────────────────────────────────┘          │
│                                                                  │
│  4.7 Update validation result                                   │
│      • repository.updateValidationResult()                      │
│      • UPDATE lhdn_einvoices SET validated_at = NOW()           │
│                                                                  │
│  4.8 Submit to LHDN (if autoSubmit = true)                      │
│      ┌──────────────────────────────────────────────┐          │
│      │ SubmissionService.submitInvoice()            │          │
│      │                                              │          │
│      │ 4.8.1 Get OAuth token                        │          │
│      │   POST /connect/token                        │          │
│      │   Body: {                                    │          │
│      │     client_id: "xxx",                        │          │
│      │     client_secret: "yyy",                    │          │
│      │     grant_type: "client_credentials"         │          │
│      │   }                                          │          │
│      │   Response: { access_token: "...", ... }     │          │
│      │                                              │          │
│      │ 4.8.2 Convert to UBL XML                     │          │
│      │   ValidationService.convertToXML()           │          │
│      │   Generate UBL 2.1 compliant XML             │          │
│      │                                              │          │
│      │ 4.8.3 Submit document                        │          │
│      │   POST /api/v1.0/documents                   │          │
│      │   Headers: {                                 │          │
│      │     Authorization: "Bearer ...",             │          │
│      │     Content-Type: "application/json"         │          │
│      │   }                                          │          │
│      │   Body: {                                    │          │
│      │     documents: [{                            │          │
│      │       format: "XML",                         │          │
│      │       document: "<base64-encoded-xml>",      │          │
│      │       documentHash: "sha256-hash",           │          │
│      │       codeNumber: "INV-9000000001"           │          │
│      │     }]                                       │          │
│      │   }                                          │          │
│      │                                              │          │
│      │   Response: {                                │          │
│      │     submissionUid: "sub-uuid-456",           │          │
│      │     acceptedDocuments: [{                    │          │
│      │       uuid: "doc-uuid-789",                  │          │
│      │       invoiceCodeNumber: "INV-9000000001"    │          │
│      │     }]                                       │          │
│      │   }                                          │          │
│      └──────────────────────────────────────────────┘          │
│                                                                  │
│  4.9 Update invoice status                                      │
│      • repository.updateInvoiceStatus('SUBMITTED')              │
│      • Save submission_uid, submitted_at timestamp              │
│                                                                  │
│  4.10 Query LHDN for status (async)                             │
│       ┌─────────────────────────────────────────────┐          │
│       │ SubmissionService.queryInvoiceStatus()      │          │
│       │ GET /api/v1.0/documents/{uuid}/details      │          │
│       │                                             │          │
│       │ Response: {                                 │          │
│       │   uuid: "doc-uuid-789",                     │          │
│       │   status: "Valid",                          │          │
│       │   longId: "LHDN-2024-123456789",            │          │
│       │   validationResults: { ... }                │          │
│       │ }                                           │          │
│       └─────────────────────────────────────────────┘          │
│                                                                  │
│  4.11 Update to ACCEPTED                                        │
│       • repository.updateInvoiceStatus('ACCEPTED')              │
│       • Save lhdn_reference_number, accepted_at                 │
│                                                                  │
│  4.12 Generate QR code                                          │
│       ┌─────────────────────────────────────────────┐          │
│       │ QRCodeService.generateQRCode()              │          │
│       │ URL: https://myinvois.hasil.gov.my/verify   │          │
│       │      ?ref=LHDN-2024-123456789                │          │
│       │ Generate QR image (base64)                  │          │
│       └─────────────────────────────────────────────┘          │
│                                                                  │
│  4.13 Send notifications                                        │
│       ┌─────────────────────────────────────────────┐          │
│       │ NotificationService.notify()                │          │
│       │ • Email to: finance@xyz.com.my              │          │
│       │ • Subject: "e-Invoice ACCEPTED"             │          │
│       │ • Attach: QR code, PDF invoice              │          │
│       │ • Webhook: POST /webhook/lhdn-status        │          │
│       └─────────────────────────────────────────────┘          │
│                                                                  │
│  4.14 Log audit trail                                           │
│       • repository.logAuditEvent()                              │
│       • INSERT INTO lhdn_audit_log                              │
│       • Record: action, timestamp, user, request/response       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Return Result
                            ▼
Step 5: Response to User
┌─────────────────────────────────────────────────────────────────┐
│  API Response:                                                   │
│  {                                                               │
│    "success": true,                                              │
│    "invoiceId": "inv-uuid-123",                                  │
│    "status": "ACCEPTED",                                         │
│    "lhdnReferenceNumber": "LHDN-2024-123456789",                 │
│    "qrCodeDataUrl": "data:image/png;base64,...",                 │
│    "submittedAt": "2024-01-15T10:30:00Z",                        │
│    "acceptedAt": "2024-01-15T10:30:05Z"                          │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
Step 6: UI Updates
┌─────────────────────────────────────────────────────────────────┐
│  Web Application Dashboard                                      │
│  ✅ Invoice successfully submitted to LHDN                      │
│  📄 Invoice Number: INV-9000000001                              │
│  🏛️  LHDN Reference: LHDN-2024-123456789                        │
│  📱 [View QR Code] [Download PDF] [Email Customer]             │
└─────────────────────────────────────────────────────────────────┘
```

## Integration Scenarios

### A. SAP Ariba Procurement Invoice Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│  Scenario: Vendor submits invoice through Ariba Network               │
└────────────────────────────────────────────────────────────────────────┘

1. Vendor submits invoice via Ariba Network
   │
   ▼
2. Ariba creates Invoice document
   • Invoice Number: ARIBA-2024-001
   • Status: Pending Approval
   │
   ▼
3. Scheduled Job / Event trigger in API service
   • Cron job: Every 15 minutes
   • Query: AribaConnector.fetchPendingInvoices()
   │
   ▼
4. For each approved invoice:
   ┌──────────────────────────────────────────┐
   │ AribaConnector.fetchProcurementInvoice() │
   │ GET /api/procurement/invoices/{id}       │
   │                                          │
   │ Response: {                              │
   │   invoiceNumber: "ARIBA-2024-001",       │
   │   supplier: { ... },                     │
   │   lineItems: [ ... ],                    │
   │   totalAmount: 1060.00,                  │
   │   currency: "MYR"                        │
   │ }                                        │
   └──────────────────────────────────────────┘
   │
   ▼
5. Map Ariba → LHDN format
   • MappingService.mapAribaInvoiceToLHDN()
   • Custom mapping for Ariba-specific fields
   │
   ▼
6. Submit to LHDN (same flow as S/4HANA)
   • LHDNInvoiceEngine.submitInvoice()
   • Validate, submit, generate QR
   │
   ▼
7. Update Ariba invoice status
   • POST /api/procurement/invoices/{id}/custom-fields
   • Add: lhdnReferenceNumber, qrCodeUrl
   │
   ▼
8. Notify vendor via Ariba
   • Email notification with QR code
```

### B. SAP SuccessFactors Expense Report Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│  Scenario: Employee submits expense report with vendor receipts       │
└────────────────────────────────────────────────────────────────────────┘

1. Employee submits expense report in SFSF
   • Report ID: EXP-2024-0123
   • Items: Hotel, Meals, Transportation
   │
   ▼
2. Manager approves expense report
   │
   ▼
3. Finance processes reimbursement
   │
   ▼
4. Scheduled job detects approved expense reports
   • SuccessFactorsConnector.fetchExpenseReport()
   • OData: /odata/v2/ExpenseReport('EXP-2024-0123')
   │
   ▼
5. For vendor receipts requiring e-invoice:
   ┌─────────────────────────────────────────────┐
   │ Filter expense items where:                 │
   │ • vendor requires e-invoice                 │
   │ • amount > threshold (e.g., MYR 100)        │
   │ • vendor TIN is available                   │
   └─────────────────────────────────────────────┘
   │
   ▼
6. Generate LHDN invoice for each vendor
   • Aggregate expense items by vendor
   • Create invoice with vendor as supplier
   • Company as buyer
   │
   ▼
7. Submit to LHDN
   • LHDNInvoiceEngine.submitInvoice()
   │
   ▼
8. Update SFSF expense report
   • Attach QR code to expense line item
   • Update custom field: lhdnCompliant = true
```

## Multi-Tenant Isolation

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TENANT ISOLATION STRATEGY                       │
└────────────────────────────────────────────────────────────────────────┘

Request Flow:
┌─────────────┐
│   User      │ Login with tenant-specific credentials
│  (Tenant A) │ email: user@companyA.com
└──────┬──────┘
       │
       │ POST /auth/login
       ▼
┌─────────────────────────────────────────────┐
│  Authentication Service                     │
│  1. Validate credentials                    │
│  2. Extract tenant from email domain        │
│     or custom tenant_id claim               │
│  3. Issue JWT with tenant claim:            │
│     {                                       │
│       "sub": "user-123",                    │
│       "tenant_id": "tenant-A",              │
│       "roles": ["finance_manager"],         │
│       "iat": 1234567890,                    │
│       "exp": 1234571490                     │
│     }                                       │
└─────────────────────────────────────────────┘
       │
       │ Return JWT token
       ▼
┌─────────────────────────────────────────────┐
│  Subsequent API requests                    │
│  Headers: {                                 │
│    Authorization: "Bearer <JWT>"            │
│  }                                          │
└─────────────────────────────────────────────┘
       │
       │ All requests include tenant context
       ▼
┌─────────────────────────────────────────────┐
│  Tenant Middleware                          │
│  1. Extract tenant_id from JWT              │
│  2. Validate tenant is active               │
│  3. Load tenant config from cache/DB        │
│  4. Attach to request context:              │
│     req.tenant = {                          │
│       id: "tenant-A",                       │
│       name: "Company A Sdn Bhd",            │
│       lhdnConfig: { ... },                  │
│       sapConnections: [ ... ]               │
│     }                                       │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Database Queries (ALL must include):       │
│  WHERE tenant_id = 'tenant-A'               │
│                                             │
│  Examples:                                  │
│  SELECT * FROM lhdn_einvoices               │
│    WHERE tenant_id = $1                     │
│                                             │
│  SELECT * FROM lhdn_tenant_configs          │
│    WHERE tenant_id = $1 AND is_active=true  │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  SAP Connection (tenant-specific)           │
│  Use tenant's SAP credentials:              │
│  • S/4HANA URL, username, password          │
│  • Ariba API key                            │
│  • SFSF OAuth client                        │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  LHDN Submission (tenant-specific)          │
│  Use tenant's LHDN credentials:             │
│  • client_id, client_secret                 │
│  • company TIN                              │
│  • environment (SANDBOX/PROD)               │
└─────────────────────────────────────────────┘

Data Isolation at DB Level:
┌────────────────────────────────────────────────────────────────┐
│  PostgreSQL Row-Level Security (RLS)                           │
│                                                                 │
│  CREATE POLICY tenant_isolation ON lhdn_einvoices              │
│    USING (tenant_id = current_setting('app.current_tenant'));  │
│                                                                 │
│  Before each query:                                            │
│  SET app.current_tenant = 'tenant-A';                          │
│                                                                 │
│  Result: Users can ONLY see their own tenant's data            │
└────────────────────────────────────────────────────────────────┘
```

## Error Handling & Retry Logic

```
┌────────────────────────────────────────────────────────────────────────┐
│                      ERROR SCENARIOS & RECOVERY                        │
└────────────────────────────────────────────────────────────────────────┘

Scenario 1: SAP Connection Timeout
┌─────────────────────────────────────────────┐
│  S4HANAConnector.executeRequest()           │
│  ┌────────────────────────────────────────┐ │
│  │ Try 1: Timeout after 30s               │ │
│  │ Try 2: Exponential backoff (60s)       │ │
│  │ Try 3: Final attempt (120s)            │ │
│  │ ❌ All failed                          │ │
│  └────────────────────────────────────────┘ │
│  Response:                                  │
│  {                                          │
│    "error": "SAP_CONNECTION_TIMEOUT",       │
│    "message": "Unable to reach SAP system", │
│    "retryable": true,                       │
│    "nextRetryAt": "2024-01-15T10:35:00Z"    │
│  }                                          │
│  • Log to audit trail                       │
│  • Queue for retry (background job)         │
└─────────────────────────────────────────────┘

Scenario 2: LHDN Validation Failure
┌─────────────────────────────────────────────┐
│  SubmissionService.submitInvoice()          │
│  POST /api/v1.0/documents                   │
│                                             │
│  LHDN Response (400 Bad Request):           │
│  {                                          │
│    "error": {                               │
│      "code": "LHDN-VALIDATION-001",         │
│      "message": "Invalid TIN format",       │
│      "field": "supplier.tin"                │
│    }                                        │
│  }                                          │
│  ❌ NOT retryable - data issue              │
│                                             │
│  Action:                                    │
│  • Update invoice status to 'REJECTED'      │
│  • Save rejection reason                    │
│  • Notify user via email                    │
│  • Return detailed error to user            │
└─────────────────────────────────────────────┘

Scenario 3: LHDN Rate Limit (429)
┌─────────────────────────────────────────────┐
│  SubmissionService.submitInvoice()          │
│  POST /api/v1.0/documents                   │
│                                             │
│  LHDN Response (429 Too Many Requests):     │
│  Headers: {                                 │
│    Retry-After: 60,                         │
│    X-RateLimit-Remaining: 0                 │
│  }                                          │
│  ⏱️  Retryable after 60 seconds             │
│                                             │
│  Action:                                    │
│  • Queue job in Redis with delay            │
│  • ZADD retry_queue <timestamp+60> <job_id> │
│  • Worker picks up after delay              │
└─────────────────────────────────────────────┘

Scenario 4: Network Failure (Transient)
┌─────────────────────────────────────────────┐
│  Any HTTP request fails with:               │
│  • ECONNREFUSED                             │
│  • ETIMEDOUT                                │
│  • ECONNRESET                               │
│                                             │
│  Retry Strategy:                            │
│  ┌──────────────────────────────────────┐  │
│  │ Attempt | Wait Time                  │  │
│  ├──────────────────────────────────────┤  │
│  │    1    | Immediate                  │  │
│  │    2    | 1s                         │  │
│  │    3    | 2s (exponential)           │  │
│  │    4    | 4s                         │  │
│  │    5    | 8s                         │  │
│  │   Max   | 5 attempts                 │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  If all retries fail:                       │
│  • Alert operations team (PagerDuty)        │
│  • Queue for manual review                  │
└─────────────────────────────────────────────┘
```

## Security Considerations

```
┌────────────────────────────────────────────────────────────────────────┐
│                          SECURITY LAYERS                               │
└────────────────────────────────────────────────────────────────────────┘

1. Transport Security
   ┌─────────────────────────────────────────┐
   │ • TLS 1.3 for all connections           │
   │ • Certificate pinning for LHDN API      │
   │ • mTLS for SAP connections (optional)   │
   └─────────────────────────────────────────┘

2. Authentication & Authorization
   ┌─────────────────────────────────────────┐
   │ • JWT tokens (15min expiry)             │
   │ • Refresh tokens (7 days, httpOnly)     │
   │ • Role-based access control (RBAC)      │
   │ • Multi-factor authentication (MFA)     │
   └─────────────────────────────────────────┘

3. Data Encryption
   ┌─────────────────────────────────────────┐
   │ At Rest:                                │
   │ • PostgreSQL: AES-256 encryption        │
   │ • Secrets: HashiCorp Vault / AWS KMS    │
   │ • Environment variables: Encrypted      │
   │                                         │
   │ In Transit:                             │
   │ • All APIs: TLS 1.3                     │
   │ • Database: SSL/TLS connection          │
   └─────────────────────────────────────────┘

4. Secrets Management
   ┌─────────────────────────────────────────┐
   │ NEVER store in code:                    │
   │ • LHDN client_secret                    │
   │ • SAP passwords                         │
   │ • Database credentials                  │
   │                                         │
   │ Use:                                    │
   │ • Environment variables (dev)           │
   │ • HashiCorp Vault (production)          │
   │ • AWS Secrets Manager / Azure Key Vault │
   │                                         │
   │ Rotation:                               │
   │ • LHDN OAuth tokens: auto-refresh       │
   │ • DB passwords: 90-day rotation         │
   │ • API keys: 180-day rotation            │
   └─────────────────────────────────────────┘

5. Audit Logging
   ┌─────────────────────────────────────────┐
   │ Log ALL events to lhdn_audit_log:       │
   │ • User actions (who, what, when)        │
   │ • API requests/responses                │
   │ • Invoice status changes                │
   │ • LHDN submissions                      │
   │ • Failed authentication attempts        │
   │ • Data access (read/write)              │
   │                                         │
   │ Retention: 7 years (tax compliance)     │
   └─────────────────────────────────────────┘

6. Input Validation
   ┌─────────────────────────────────────────┐
   │ • Sanitize all user inputs              │
   │ • Validate against JSON schemas         │
   │ • Prevent SQL injection (parameterized) │
   │ • Prevent XSS (escape HTML)             │
   │ • Rate limiting (100 req/min)           │
   └─────────────────────────────────────────┘
```

This architecture provides a comprehensive, secure, and scalable solution for LHDN e-invoice integration across all SAP landscapes.
