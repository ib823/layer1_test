/**
 * Types for Invoice Matching Module
 */

export interface PurchaseOrder {
  poNumber: string;
  poItem: string;
  vendorId: string;
  vendorName: string;
  materialNumber: string;
  materialDescription: string;
  orderedQuantity: number;
  orderedValue: number;
  currency: string;
  unitPrice: number;
  taxAmount: number;
  deliveryDate: Date;
  poStatus: 'OPEN' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CLOSED' | 'CANCELLED';
  createdBy: string;
  createdAt: Date;
}

export interface GoodsReceipt {
  grNumber: string;
  grItem: string;
  poNumber: string;
  poItem: string;
  materialNumber: string;
  receivedQuantity: number;
  receivedValue: number;
  currency: string;
  grDate: Date;
  plant: string;
  storageLocation: string;
  createdBy: string;
  createdAt: Date;
}

export interface SupplierInvoice {
  invoiceNumber: string;
  invoiceItem: string;
  vendorId: string;
  vendorName: string;
  poNumber?: string;
  poItem?: string;
  grNumber?: string;
  grItem?: string;
  materialNumber?: string;
  invoicedQuantity: number;
  invoicedAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  invoiceDate: Date;
  postingDate: Date;
  dueDate: Date;
  paymentTerms: string;
  invoiceStatus: 'PENDING' | 'MATCHED' | 'POSTED' | 'PAID' | 'BLOCKED' | 'REJECTED';
  submittedBy?: string;
  submittedAt?: Date;
}

export interface ThreeWayMatchResult {
  matchId: string;
  poNumber: string;
  poItem: string;
  grNumber: string | null;
  grItem: string | null;
  invoiceNumber: string;
  invoiceItem: string;
  matchStatus: 'FULLY_MATCHED' | 'PARTIALLY_MATCHED' | 'NOT_MATCHED' | 'TOLERANCE_EXCEEDED' | 'BLOCKED';
  matchType: 'THREE_WAY' | 'TWO_WAY' | 'NO_MATCH';
  discrepancies: Discrepancy[];
  toleranceViolations: ToleranceViolation[];
  fraudAlerts: FraudAlert[];
  matchedAt: Date;
  matchedBy?: string;
  approvalRequired: boolean;
  riskScore: number; // 0-100
}

export interface Discrepancy {
  type: 'QUANTITY' | 'PRICE' | 'TAX' | 'VENDOR' | 'MATERIAL' | 'DATE' | 'CURRENCY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  field: string;
  expectedValue: any;
  actualValue: any;
  variance: number; // Percentage or absolute difference
  description: string;
}

export interface ToleranceViolation {
  ruleId: string;
  ruleName: string;
  field: string;
  threshold: number;
  actualVariance: number;
  exceededBy: number;
  requiresApproval: boolean;
}

export interface FraudAlert {
  alertId: string;
  pattern: FraudPattern;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0-100
  description: string;
  evidence: Record<string, any>;
  triggeredAt: Date;
}

export type FraudPattern =
  | 'DUPLICATE_INVOICE'
  | 'SPLIT_INVOICE'
  | 'ROUND_NUMBER'
  | 'WEEKEND_SUBMISSION'
  | 'NEW_VENDOR'
  | 'PRICE_MANIPULATION'
  | 'QUANTITY_MANIPULATION'
  | 'INVOICE_AGING'
  | 'SAME_DAY_REVERSAL'
  | 'UNUSUAL_VENDOR_PATTERN';

export interface ToleranceRule {
  ruleId: string;
  name: string;
  field: 'PRICE' | 'QUANTITY' | 'TAX' | 'TOTAL';
  thresholdType: 'PERCENTAGE' | 'ABSOLUTE';
  thresholdValue: number;
  requiresApproval: boolean;
  enabled: boolean;
}

export interface MatchingConfig {
  toleranceRules: ToleranceRule[];
  fraudDetection: {
    enabled: boolean;
    patterns: FraudPattern[];
    minimumConfidence: number;
  };
  matching: {
    requireGoodsReceipt: boolean; // False = two-way matching (PO + Invoice)
    autoApproveWithinTolerance: boolean;
    blockOnFraudAlert: boolean;
  };
  notifications: {
    enabled: boolean;
    recipients: string[];
    notifyOnMismatch: boolean;
    notifyOnFraud: boolean;
  };
}

export interface MatchingAnalysisRun {
  runId: string;
  tenantId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  config: MatchingConfig;
  statistics: {
    totalInvoices: number;
    fullyMatched: number;
    partiallyMatched: number;
    notMatched: number;
    toleranceExceeded: number;
    fraudAlerts: number;
    totalDiscrepanciesFound: number;
    totalAmountProcessed: number;
    totalAmountBlocked: number;
  };
  error?: string;
}

export interface InvoiceMatchingResult {
  runId: string;
  tenantId: string;
  matches: ThreeWayMatchResult[];
  statistics: MatchingAnalysisRun['statistics'];
  completedAt: Date;
}

export interface VendorPaymentPattern {
  vendorId: string;
  vendorName: string;
  totalInvoices: number;
  totalAmount: number;
  averageInvoiceAmount: number;
  averagePaymentDays: number;
  duplicateCount: number;
  fraudAlertCount: number;
  riskScore: number;
  lastInvoiceDate: Date;
}
