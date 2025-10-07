/**
 * Types for Vendor Master Data Quality Module
 */

export interface VendorMasterData {
  vendorId: string;
  vendorName: string;
  taxId?: string;
  country: string;
  city?: string;
  postalCode?: string;
  street?: string;
  bankAccounts: BankAccount[];
  email?: string;
  phone?: string;
  paymentTerms?: string;
  currency?: string;
  createdAt: Date;
  createdBy?: string;
  lastModifiedAt?: Date;
  lastModifiedBy?: string;
  isBlocked?: boolean;
  blockReason?: string;
}

export interface BankAccount {
  bankKey: string;
  bankAccountNumber: string;
  bankCountry: string;
  iban?: string;
  swift?: string;
  accountHolderName?: string;
}

export interface VendorDuplicate {
  duplicateId: string;
  primaryVendor: VendorMasterData;
  duplicateVendor: VendorMasterData;
  matchType: 'EXACT' | 'FUZZY_NAME' | 'FUZZY_ADDRESS' | 'BANK_ACCOUNT' | 'TAX_ID';
  matchScore: number; // 0-100
  matchReasons: string[];
  confidence: number; // 0-100
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: Date;
  status: 'OPEN' | 'INVESTIGATING' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'MERGED';
  recommendedAction: string;
}

export interface DataQualityScore {
  vendorId: string;
  vendorName: string;
  overallScore: number; // 0-100
  completenessScore: number; // 0-100
  accuracyScore: number; // 0-100
  freshnessScore: number; // 0-100
  consistencyScore: number; // 0-100
  issues: DataQualityIssue[];
  recommendations: string[];
  lastAssessedAt: Date;
}

export interface DataQualityIssue {
  issueId: string;
  category: 'MISSING_FIELD' | 'INVALID_FORMAT' | 'STALE_DATA' | 'INCONSISTENT' | 'SUSPICIOUS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  field: string;
  description: string;
  expectedValue?: string;
  actualValue?: string;
  impact: string;
  remediation: string;
}

export interface SanctionsScreeningResult {
  vendorId: string;
  vendorName: string;
  screeningDate: Date;
  status: 'CLEAR' | 'POTENTIAL_MATCH' | 'MATCH' | 'ERROR';
  matches: SanctionsMatch[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresReview: boolean;
}

export interface SanctionsMatch {
  listName: string; // 'OFAC', 'EU', 'UN'
  entityName: string;
  matchScore: number; // 0-100
  matchReason: string;
  listDate: Date;
  entityType: 'PERSON' | 'COMPANY' | 'GOVERNMENT';
  jurisdiction: string;
  program: string; // e.g., 'Counter Terrorism', 'Money Laundering'
}

export interface AddressNormalization {
  original: string;
  normalized: string;
  country: string;
  city: string;
  postalCode: string;
  street: string;
  confidence: number; // 0-100
}

export interface VendorDeduplicationResult {
  totalVendors: number;
  duplicatesFound: number;
  potentialDuplicates: number;
  confirmedDuplicates: number;
  falsPositives: number;
  duplicateGroups: DuplicateGroup[];
  potentialSavings: number; // Estimated from duplicate payments
  completedAt: Date;
}

export interface DuplicateGroup {
  groupId: string;
  vendors: VendorMasterData[];
  primaryVendor?: VendorMasterData; // Recommended merge target
  matchScore: number;
  matchType: VendorDuplicate['matchType'];
  totalTransactions: number;
  totalAmount: number;
  recommendation: string;
}

export interface VendorDataQualityConfig {
  completenessRules: {
    requiredFields: string[];
    recommendedFields: string[];
    criticalFields: string[];
  };
  validationRules: {
    taxIdFormat?: RegExp;
    ibanFormat?: RegExp;
    emailFormat?: RegExp;
    phoneFormat?: RegExp;
  };
  freshnessThresholds: {
    warningDays: number; // e.g., 365
    criticalDays: number; // e.g., 730
  };
  duplicateDetection: {
    enableFuzzyMatching: boolean;
    fuzzyThreshold: number; // 0-100
    checkBankAccounts: boolean;
    checkTaxId: boolean;
    checkAddress: boolean;
  };
  sanctionsScreening: {
    enabled: boolean;
    lists: string[]; // ['OFAC', 'EU', 'UN']
    autoBlock: boolean;
  };
}

export interface VendorRiskProfile {
  vendorId: string;
  vendorName: string;
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: RiskFactor[];
  dataQualityScore: number;
  hasDuplicates: boolean;
  sanctionsMatch: boolean;
  countryRisk: string;
  lastReviewedAt: Date;
  nextReviewDue: Date;
}

export interface RiskFactor {
  factor: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: number; // 1-10
  evidence: Record<string, any>;
}
