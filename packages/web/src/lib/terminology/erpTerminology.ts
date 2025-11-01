/**
 * ERP Terminology System
 *
 * Maps ERP-specific jargon to universal, user-friendly terms with explanations.
 * Supports SAP, Oracle, Dynamics 365, and NetSuite.
 */

export type ERPSystem = 'SAP' | 'Oracle' | 'Dynamics' | 'NetSuite';

export interface TermDefinition {
  /** User-friendly universal term */
  universal: string;
  /** Short explanation (1 sentence) */
  explanation: string;
  /** Detailed explanation (optional) */
  details?: string;
  /** Link to documentation (optional) */
  docUrl?: string;
}

export interface ERPTermMapping {
  /** Original ERP-specific term */
  erpTerm: string;
  /** Definition and explanation */
  definition: TermDefinition;
}

/**
 * Complete ERP terminology mappings
 */
export const erpTerminology: Record<ERPSystem, ERPTermMapping[]> = {
  SAP: [
    {
      erpTerm: 'User Master Record',
      definition: {
        universal: 'User Account',
        explanation: 'A user account containing login credentials and permissions',
        details: 'In SAP, this is stored in table USR02 and contains user ID, validity dates, and lock status',
      },
    },
    {
      erpTerm: 'Authorization Object',
      definition: {
        universal: 'Permission',
        explanation: 'A specific access right that controls what actions a user can perform',
        details: 'SAP uses authorization objects to control access to transactions, programs, and data',
      },
    },
    {
      erpTerm: 'Transaction Code (T-Code)',
      definition: {
        universal: 'Function',
        explanation: 'A shortcut code that launches a specific business function or screen',
        details: 'Examples: FB60 (Enter Vendor Invoice), ME21N (Create Purchase Order)',
      },
    },
    {
      erpTerm: 'Company Code',
      definition: {
        universal: 'Legal Entity',
        explanation: 'An independent accounting entity with its own balance sheet',
        details: 'Each company code has its own chart of accounts and fiscal year',
      },
    },
    {
      erpTerm: 'GL Account',
      definition: {
        universal: 'Account',
        explanation: 'A general ledger account used to track financial transactions',
        details: 'Organized in a chart of accounts with account numbers like 100000 (Cash)',
      },
    },
    {
      erpTerm: 'Posting Period',
      definition: {
        universal: 'Accounting Period',
        explanation: 'A time period (usually a month) when transactions can be posted',
        details: 'Periods can be opened or closed to control when transactions are allowed',
      },
    },
    {
      erpTerm: 'Cost Center',
      definition: {
        universal: 'Department',
        explanation: 'An organizational unit that incurs costs (like IT, Marketing, etc.)',
        details: 'Used to track expenses by department for internal reporting',
      },
    },
    {
      erpTerm: 'Business Partner',
      definition: {
        universal: 'Vendor/Customer',
        explanation: 'An external party you do business with (vendor or customer)',
        details: 'Replaces the older "Vendor Master" and "Customer Master" concepts',
      },
    },
    {
      erpTerm: 'BAPI',
      definition: {
        universal: 'API',
        explanation: 'Business Application Programming Interface - a standardized interface for integrations',
        details: 'Allows external systems to interact with SAP business functions',
      },
    },
    {
      erpTerm: 'OData Service',
      definition: {
        universal: 'Web API',
        explanation: 'A REST-like web service for querying and updating data',
        details: 'Used by S/4HANA Cloud for modern integrations and Fiori apps',
      },
    },
  ],

  Oracle: [
    {
      erpTerm: 'Responsibility',
      definition: {
        universal: 'Role',
        explanation: 'A collection of permissions that defines what a user can access',
        details: 'Oracle uses responsibilities to group menus and functions',
      },
    },
    {
      erpTerm: 'Ledger',
      definition: {
        universal: 'Accounting Book',
        explanation: 'A complete set of accounts for financial reporting',
        details: 'Oracle supports multiple ledgers for different reporting requirements',
      },
    },
    {
      erpTerm: 'Operating Unit',
      definition: {
        universal: 'Business Unit',
        explanation: 'An organizational entity that processes transactions',
        details: 'Used for procurement, order management, and receivables',
      },
    },
    {
      erpTerm: 'Concurrent Program',
      definition: {
        universal: 'Batch Job',
        explanation: 'A background process that runs reports or data processing tasks',
        details: 'Scheduled or run on-demand for heavy processing',
      },
    },
    {
      erpTerm: 'DFF (Descriptive Flexfield)',
      definition: {
        universal: 'Custom Field',
        explanation: 'A configurable field to capture additional information',
        details: 'Allows extending Oracle forms without customization',
      },
    },
    {
      erpTerm: 'Journal Entry',
      definition: {
        universal: 'GL Transaction',
        explanation: 'A record of debits and credits posted to the general ledger',
        details: 'Used to record financial transactions and adjustments',
      },
    },
  ],

  Dynamics: [
    {
      erpTerm: 'Legal Entity',
      definition: {
        universal: 'Company',
        explanation: 'A company or organization that operates under legal regulations',
        details: 'Called "DataAreaId" in the database (e.g., USMF, USRT)',
      },
    },
    {
      erpTerm: 'Security Role',
      definition: {
        universal: 'Role',
        explanation: 'A set of permissions that defines user access rights',
        details: 'Dynamics uses role-based security with duties and privileges',
      },
    },
    {
      erpTerm: 'Duty',
      definition: {
        universal: 'Job Function',
        explanation: 'A group of related privileges needed to perform a job',
        details: 'Multiple duties combine to form a security role',
      },
    },
    {
      erpTerm: 'Privilege',
      definition: {
        universal: 'Permission',
        explanation: 'The most granular level of access control',
        details: 'Controls access to specific menu items, tables, or operations',
      },
    },
    {
      erpTerm: 'Main Account',
      definition: {
        universal: 'GL Account',
        explanation: 'A general ledger account in the chart of accounts',
        details: 'Part of the account structure used for financial reporting',
      },
    },
    {
      erpTerm: 'Financial Dimension',
      definition: {
        universal: 'Cost Center / Department',
        explanation: 'An additional way to categorize transactions (like department, project)',
        details: 'Allows multi-dimensional reporting beyond just GL accounts',
      },
    },
    {
      erpTerm: 'Purchase Requisition',
      definition: {
        universal: 'Purchase Request',
        explanation: 'An internal request to purchase goods or services',
        details: 'Requires approval before becoming a purchase order',
      },
    },
  ],

  NetSuite: [
    {
      erpTerm: 'Role',
      definition: {
        universal: 'User Role',
        explanation: 'A set of permissions that defines what users can do',
        details: 'NetSuite roles control access to records, reports, and customizations',
      },
    },
    {
      erpTerm: 'Subsidiary',
      definition: {
        universal: 'Company/Branch',
        explanation: 'A legal entity or business unit within NetSuite OneWorld',
        details: 'Each subsidiary has its own books and can operate in different countries',
      },
    },
    {
      erpTerm: 'SuiteScript',
      definition: {
        universal: 'Custom Code',
        explanation: 'JavaScript-based code for customizing NetSuite',
        details: 'Used to create workflows, scheduled scripts, and user event scripts',
      },
    },
    {
      erpTerm: 'Saved Search',
      definition: {
        universal: 'Report',
        explanation: 'A customizable query to extract and display data',
        details: 'NetSuite\'s primary reporting mechanism, similar to database views',
      },
    },
    {
      erpTerm: 'SuiteQL',
      definition: {
        universal: 'SQL Query',
        explanation: 'SQL-like language for querying NetSuite data',
        details: 'More powerful than saved searches, allows complex joins and analytics',
      },
    },
    {
      erpTerm: 'Custom Record',
      definition: {
        universal: 'Custom Table',
        explanation: 'A user-defined database table for storing custom data',
        details: 'Extends NetSuite to track information not in standard records',
      },
    },
    {
      erpTerm: 'Transaction',
      definition: {
        universal: 'Business Document',
        explanation: 'Any business record like invoice, PO, sales order, etc.',
        details: 'Base record type in NetSuite that affects accounting',
      },
    },
  ],
};

/**
 * Get terminology mapping for a specific ERP system
 */
export function getERPTerminology(erpSystem: ERPSystem): ERPTermMapping[] {
  return erpTerminology[erpSystem] || [];
}

/**
 * Find definition for a specific ERP term
 */
export function getTermDefinition(erpSystem: ERPSystem, erpTerm: string): TermDefinition | null {
  const terminology = erpTerminology[erpSystem];
  const mapping = terminology?.find(
    (t) => t.erpTerm.toLowerCase() === erpTerm.toLowerCase()
  );
  return mapping?.definition || null;
}

/**
 * Get universal term for an ERP-specific term
 */
export function getUniversalTerm(erpSystem: ERPSystem, erpTerm: string): string {
  const definition = getTermDefinition(erpSystem, erpTerm);
  return definition?.universal || erpTerm;
}

/**
 * Common terms across all ERP systems (for reference)
 */
export const universalTerms = {
  USER: 'User Account',
  ROLE: 'Role',
  PERMISSION: 'Permission',
  COMPANY: 'Legal Entity',
  ACCOUNT: 'Account',
  VENDOR: 'Vendor',
  INVOICE: 'Invoice',
  PO: 'Purchase Order',
  GL_ENTRY: 'GL Transaction',
  DEPARTMENT: 'Department/Cost Center',
};
