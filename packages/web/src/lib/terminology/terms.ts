/**
 * Terminology Library
 *
 * Centralized definitions for technical terms and acronyms
 * Used by TermTooltip component for consistent terminology across the app
 */

export interface TermDefinition {
  /** Short term or acronym */
  term: string;
  /** Full expansion (if acronym) */
  fullTerm?: string;
  /** Clear definition in plain language */
  definition: string;
  /** Optional example for clarity */
  example?: string;
  /** Related terms */
  relatedTerms?: string[];
  /** Category for grouping */
  category: 'compliance' | 'technical' | 'sap' | 'audit' | 'general';
}

export const TERMINOLOGY: Record<string, TermDefinition> = {
  // Compliance & GRC
  sod: {
    term: 'SoD',
    fullTerm: 'Segregation of Duties',
    definition:
      'A security principle that prevents any single person from having complete control over a critical business process.',
    example:
      'The person who approves payments should not also be able to create invoices.',
    relatedTerms: ['access-control', 'rbac', 'least-privilege'],
    category: 'compliance',
  },

  rbac: {
    term: 'RBAC',
    fullTerm: 'Role-Based Access Control',
    definition:
      'A method of regulating access to resources based on the roles of individual users within an organization.',
    example:
      'An Accountant role might have permissions to view financials but not modify payroll.',
    relatedTerms: ['sod', 'access-control', 'least-privilege'],
    category: 'compliance',
  },

  grc: {
    term: 'GRC',
    fullTerm: 'Governance, Risk, and Compliance',
    definition:
      'An integrated approach to managing corporate governance, enterprise risk management, and compliance with regulations.',
    example:
      'A GRC platform helps ensure compliance with SOX, GDPR, and internal policies.',
    relatedTerms: ['compliance', 'audit', 'risk-management'],
    category: 'compliance',
  },

  sox: {
    term: 'SOX',
    fullTerm: 'Sarbanes-Oxley Act',
    definition:
      'A US federal law that sets requirements for financial reporting and internal controls to protect investors from fraudulent accounting.',
    example:
      'SOX Section 404 requires annual assessment of internal controls over financial reporting.',
    relatedTerms: ['compliance', 'audit', 'internal-controls'],
    category: 'compliance',
  },

  mitigating-control: {
    term: 'Mitigating Control',
    definition:
      'A compensating control implemented to reduce the risk when SoD violations cannot be fully removed.',
    example:
      'Monthly management review of transactions is a mitigating control for unavoidable dual access.',
    relatedTerms: ['sod', 'risk-mitigation', 'compensating-control'],
    category: 'compliance',
  },

  // SAP Specific
  'sap-transaction': {
    term: 'SAP Transaction',
    definition:
      'A specific task or operation in SAP identified by a transaction code (T-Code).',
    example: 'FB01 is the transaction code for posting a document in Financial Accounting.',
    relatedTerms: ['t-code', 'sap-authorization'],
    category: 'sap',
  },

  't-code': {
    term: 'T-Code',
    fullTerm: 'Transaction Code',
    definition:
      'A short code used to execute a specific function or program in SAP systems.',
    example: 'VA01 for creating sales orders, MM01 for creating materials.',
    relatedTerms: ['sap-transaction', 'sap-authorization'],
    category: 'sap',
  },

  'authorization-object': {
    term: 'Authorization Object',
    definition:
      'An SAP component that defines which activities a user can perform on specific data.',
    example:
      'F_BKPF_BUK controls which company codes a user can post documents to.',
    relatedTerms: ['sap-authorization', 'profile', 'role'],
    category: 'sap',
  },

  odata: {
    term: 'OData',
    fullTerm: 'Open Data Protocol',
    definition:
      'A standard protocol for building and consuming RESTful APIs, used extensively in SAP systems.',
    example: 'SAP Gateway exposes business data through OData services.',
    relatedTerms: ['api', 'rest', 'sap-gateway'],
    category: 'technical',
  },

  s4hana: {
    term: 'S/4HANA',
    definition:
      "SAP's next-generation ERP suite built on the SAP HANA in-memory database platform.",
    example: 'S/4HANA Finance provides real-time financial analytics and reporting.',
    relatedTerms: ['erp', 'hana', 'sap'],
    category: 'sap',
  },

  // E-Invoice & Malaysia LHDN
  lhdn: {
    term: 'LHDN',
    fullTerm: 'Lembaga Hasil Dalam Negeri',
    definition:
      'The Inland Revenue Board of Malaysia, responsible for the MyInvois e-invoicing system.',
    example: 'LHDN requires all B2B invoices to be submitted through MyInvois.',
    relatedTerms: ['myinvois', 'e-invoice', 'compliance'],
    category: 'compliance',
  },

  myinvois: {
    term: 'MyInvois',
    definition:
      "Malaysia's national e-invoicing system operated by LHDN for standardized digital invoicing.",
    example:
      'Companies must validate and submit invoices to MyInvois within 72 hours of issuance.',
    relatedTerms: ['lhdn', 'e-invoice'],
    category: 'compliance',
  },

  'e-invoice': {
    term: 'E-Invoice',
    fullTerm: 'Electronic Invoice',
    definition:
      'A digital invoice issued, transmitted, and received in a structured electronic format.',
    example: 'E-invoices eliminate paper, reduce errors, and enable real-time tax reporting.',
    relatedTerms: ['myinvois', 'lhdn', 'digital-transformation'],
    category: 'general',
  },

  'credit-note': {
    term: 'Credit Note',
    definition:
      'A document issued by a seller to a buyer, reducing the amount owed due to returns, discounts, or errors.',
    example: 'A credit note is issued when a customer returns defective goods.',
    relatedTerms: ['debit-note', 'invoice', 'adjustment'],
    category: 'general',
  },

  'debit-note': {
    term: 'Debit Note',
    definition:
      'A document issued to increase the amount owed, typically for additional charges or corrections.',
    example:
      'A debit note is issued when shipping costs were undercharged on the original invoice.',
    relatedTerms: ['credit-note', 'invoice', 'adjustment'],
    category: 'general',
  },

  // Audit & Reporting
  'audit-trail': {
    term: 'Audit Trail',
    definition:
      'A chronological record of system activities that enables reconstruction and examination of a sequence of events.',
    example:
      'The audit trail shows who accessed the invoice, when, and what changes were made.',
    relatedTerms: ['compliance', 'logging', 'forensics'],
    category: 'audit',
  },

  'access-log': {
    term: 'Access Log',
    definition:
      'A record of all attempts to access a system or data, including successful and failed attempts.',
    example: 'Access logs help identify unauthorized access attempts and security breaches.',
    relatedTerms: ['audit-trail', 'security', 'monitoring'],
    category: 'audit',
  },

  anomaly: {
    term: 'Anomaly',
    definition:
      'A deviation from expected patterns or normal behavior that may indicate errors, fraud, or system issues.',
    example: 'A $1M expense in the office supplies account is an anomaly worth investigating.',
    relatedTerms: ['outlier', 'fraud-detection', 'data-quality'],
    category: 'audit',
  },

  // Technical Terms
  'circuit-breaker': {
    term: 'Circuit Breaker',
    definition:
      'A design pattern that prevents cascading failures by stopping requests to a failing service.',
    example:
      'The circuit breaker opens after 5 consecutive API failures, preventing further calls for 30 seconds.',
    relatedTerms: ['resilience', 'fault-tolerance', 'retry-pattern'],
    category: 'technical',
  },

  idempotency: {
    term: 'Idempotency',
    definition:
      'The property that performing an operation multiple times has the same effect as performing it once.',
    example:
      'Submitting the same invoice twice will only create one record, not two duplicates.',
    relatedTerms: ['api-design', 'reliability', 'retry-pattern'],
    category: 'technical',
  },

  'retry-pattern': {
    term: 'Retry Pattern',
    definition:
      'An approach to handle transient failures by automatically retrying failed operations.',
    example: 'API calls are retried up to 3 times with exponential backoff before failing.',
    relatedTerms: ['resilience', 'circuit-breaker', 'fault-tolerance'],
    category: 'technical',
  },

  // Data & Quality
  'data-quality': {
    term: 'Data Quality',
    definition:
      'The degree to which data is accurate, complete, timely, consistent, and fit for purpose.',
    example:
      'Poor data quality leads to incorrect reports and bad business decisions.',
    relatedTerms: ['data-cleansing', 'master-data', 'validation'],
    category: 'general',
  },

  'master-data': {
    term: 'Master Data',
    definition:
      'Core business entities that provide context for transactions, such as customers, products, vendors.',
    example:
      'Vendor master data includes name, address, payment terms, and tax information.',
    relatedTerms: ['data-quality', 'mdm', 'reference-data'],
    category: 'general',
  },

  'three-way-match': {
    term: 'Three-Way Match',
    definition:
      'A verification process that compares purchase order, receipt, and invoice to ensure accuracy before payment.',
    example:
      'All three documents must match in quantity, price, and terms before the invoice is approved.',
    relatedTerms: ['invoice-matching', 'procurement', 'ap-automation'],
    category: 'general',
  },

  // Risk Management
  'risk-score': {
    term: 'Risk Score',
    definition:
      'A numerical value representing the level of risk associated with a particular activity, user, or transaction.',
    example: 'A user with 5 critical SoD violations has a risk score of 85/100.',
    relatedTerms: ['risk-assessment', 'risk-matrix', 'risk-level'],
    category: 'compliance',
  },

  'risk-appetite': {
    term: 'Risk Appetite',
    definition:
      'The amount and type of risk an organization is willing to accept in pursuit of its objectives.',
    example:
      'Our risk appetite allows maximum 2 high-risk SoD violations per department.',
    relatedTerms: ['risk-tolerance', 'risk-management', 'governance'],
    category: 'compliance',
  },

  'compensating-control': {
    term: 'Compensating Control',
    definition:
      'An alternative control that reduces risk when the primary control cannot be implemented.',
    example:
      'Monthly transaction reviews compensate for unavoidable access to conflicting functions.',
    relatedTerms: ['mitigating-control', 'sod', 'risk-mitigation'],
    category: 'compliance',
  },
};

/**
 * Get term definition by key
 */
export function getTerm(key: string): TermDefinition | undefined {
  return TERMINOLOGY[key.toLowerCase()];
}

/**
 * Get all terms in a category
 */
export function getTermsByCategory(
  category: TermDefinition['category']
): TermDefinition[] {
  return Object.values(TERMINOLOGY).filter((term) => term.category === category);
}

/**
 * Search terms by keyword
 */
export function searchTerms(query: string): TermDefinition[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(TERMINOLOGY).filter(
    (term) =>
      term.term.toLowerCase().includes(lowerQuery) ||
      term.fullTerm?.toLowerCase().includes(lowerQuery) ||
      term.definition.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get related terms
 */
export function getRelatedTerms(termKey: string): TermDefinition[] {
  const term = getTerm(termKey);
  if (!term || !term.relatedTerms) return [];

  return term.relatedTerms
    .map((key) => getTerm(key))
    .filter((t): t is TermDefinition => t !== undefined);
}
