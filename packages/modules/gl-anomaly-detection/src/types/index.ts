/**
 * Types for GL Account Anomaly Detection Module
 */

/**
 * GL (General Ledger) Line Item
 */
export interface GLLineItem {
  documentNumber: string;
  lineItem: string;
  glAccount: string;
  glAccountName: string;
  companyCode: string;
  fiscalYear: string;
  fiscalPeriod: string;
  postingDate: Date;
  documentDate: Date;
  amount: number;
  currency: string;
  debitCredit: 'DEBIT' | 'CREDIT';
  documentType: string;
  reference: string;
  description: string;
  costCenter?: string;
  profitCenter?: string;
  userId: string;
  userName: string;
  postingTime?: string;
  reversalDocumentNumber?: string;
  isReversal: boolean;
}

/**
 * Detected anomaly
 */
export interface GLAnomaly {
  anomalyId: string;
  glAccount: string;
  glAccountName: string;
  lineItems: GLLineItem[];
  anomalyType: AnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number; // 0-100 anomaly score
  detectedAt: Date;
  description: string;
  details: AnomalyDetails;
  recommendation: string;
  status: 'OPEN' | 'INVESTIGATING' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'RESOLVED';
}

/**
 * Types of anomalies
 */
export type AnomalyType =
  | 'BENFORD_LAW_VIOLATION'
  | 'STATISTICAL_OUTLIER'
  | 'UNUSUAL_AMOUNT'
  | 'SAME_DAY_REVERSAL'
  | 'WEEKEND_POSTING'
  | 'AFTER_HOURS_POSTING'
  | 'ROUND_NUMBER_PATTERN'
  | 'VELOCITY_ANOMALY'
  | 'DUPLICATE_ENTRY'
  | 'UNUSUAL_USER'
  | 'THRESHOLD_BREACH';

/**
 * Anomaly-specific details
 */
export interface AnomalyDetails {
  expectedValue?: number | string;
  actualValue?: number | string;
  deviation?: number;
  confidence: number; // 0-100
  evidence: Record<string, any>;
  relatedAnomalies?: string[]; // IDs of related anomalies
}

/**
 * Benford's Law analysis result
 */
export interface BenfordAnalysisResult {
  glAccount: string;
  totalTransactions: number;
  firstDigitDistribution: Record<string, number>; // digit -> count
  expectedDistribution: Record<string, number>; // digit -> expected %
  actualDistribution: Record<string, number>; // digit -> actual %
  chiSquareStatistic: number;
  pValue: number;
  isAnomalous: boolean;
  severity: GLAnomaly['severity'];
}

/**
 * Statistical outlier detection result
 */
export interface StatisticalOutlier {
  lineItem: GLLineItem;
  method: 'Z_SCORE' | 'IQR' | 'MAD'; // Modified Absolute Deviation
  score: number;
  threshold: number;
  isOutlier: boolean;
  deviation: number;
  populationMean?: number;
  populationStd?: number;
}

/**
 * Velocity analysis (rate of change)
 */
export interface VelocityAnomaly {
  glAccount: string;
  period: string;
  transactionCount: number;
  totalAmount: number;
  averageTransactionCount: number;
  averageAmount: number;
  countDeviation: number; // % change from average
  amountDeviation: number; // % change from average
  isAnomalous: boolean;
  severity: GLAnomaly['severity'];
}

/**
 * User behavior pattern
 */
export interface UserBehaviorPattern {
  userId: string;
  userName: string;
  normalPostingHours: { start: number; end: number }; // 0-23
  normalPostingDays: number[]; // 0-6 (Sunday-Saturday)
  typicalGLAccounts: string[];
  typicalDocumentTypes: string[];
  averageTransactionsPerDay: number;
  averageAmountPerTransaction: number;
}

/**
 * Anomaly detection configuration
 */
export interface AnomalyDetectionConfig {
  benfordLaw: {
    enabled: boolean;
    minTransactions: number; // Minimum transactions needed for Benford analysis
    significanceLevel: number; // p-value threshold (e.g., 0.05)
  };
  statisticalOutliers: {
    enabled: boolean;
    method: 'Z_SCORE' | 'IQR' | 'MAD';
    zScoreThreshold: number; // e.g., 3.0 (3 standard deviations)
    iqrMultiplier: number; // e.g., 1.5
  };
  behavioralAnomalies: {
    enabled: boolean;
    checkAfterHours: boolean;
    checkWeekends: boolean;
    afterHoursStart: number; // e.g., 19 (7 PM)
    afterHoursEnd: number; // e.g., 7 (7 AM)
    checkReversals: boolean;
    sameDayReversalWindow: number; // hours
  };
  velocityAnalysis: {
    enabled: boolean;
    deviationThreshold: number; // % change to flag (e.g., 200)
    lookbackPeriods: number; // Number of periods to compare
  };
  roundNumbers: {
    enabled: boolean;
    thresholds: number[]; // e.g., [1000, 5000, 10000]
    minOccurrences: number; // How many round numbers before flagging
  };
  duplicateDetection: {
    enabled: boolean;
    timeWindow: number; // hours to check for duplicates
    amountTolerance: number; // % tolerance for amount matching
  };
}

/**
 * GL Account statistics
 */
export interface GLAccountStats {
  glAccount: string;
  glAccountName: string;
  totalTransactions: number;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  currency: string;
  averageAmount: number;
  medianAmount: number;
  stdDeviation: number;
  minAmount: number;
  maxAmount: number;
  firstQuartile: number;
  thirdQuartile: number;
  iqr: number; // Interquartile range
  postingsByDay: Record<string, number>; // Day of week -> count
  postingsByHour: Record<string, number>; // Hour -> count
  topUsers: Array<{ userId: string; userName: string; transactionCount: number }>;
  topDocumentTypes: Array<{ documentType: string; count: number }>;
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetectionResult {
  analysisId: string;
  tenantId: string;
  glAccount?: string; // If analyzing specific account
  fiscalYear: string;
  fiscalPeriod?: string;
  totalLineItems: number;
  anomaliesDetected: number;
  anomalies: GLAnomaly[];
  accountStats: GLAccountStats[];
  benfordAnalysis?: BenfordAnalysisResult[];
  velocityAnomalies?: VelocityAnomaly[];
  summary: {
    criticalAnomalies: number;
    highAnomalies: number;
    mediumAnomalies: number;
    lowAnomalies: number;
    byType: Record<AnomalyType, number>;
    estimatedFraudRisk: number; // 0-100
  };
  completedAt: Date;
}

/**
 * GL Account risk profile
 */
export interface GLAccountRiskProfile {
  glAccount: string;
  glAccountName: string;
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: Array<{
    factor: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    impact: number; // 1-10
  }>;
  anomalyCount: number;
  criticalAnomalyCount: number;
  benfordScore?: number; // Benford compliance score
  controlWeaknesses: string[];
  recommendations: string[];
  lastAssessedAt: Date;
}

/**
 * Time-based analysis filter
 */
export interface TimeFilter {
  fiscalYear: string;
  fiscalPeriod?: string;
  fromDate?: Date;
  toDate?: Date;
}
