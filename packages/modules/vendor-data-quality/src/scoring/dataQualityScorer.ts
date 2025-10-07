/**
 * Data Quality Scoring Engine for Vendor Master Data
 *
 * Evaluates vendor data quality across multiple dimensions:
 * - Completeness: Are all required/recommended fields populated?
 * - Accuracy: Do fields match expected formats and patterns?
 * - Freshness: How recently was the data updated?
 * - Consistency: Are related fields logically consistent?
 */

import {
  VendorMasterData,
  DataQualityScore,
  DataQualityIssue,
  VendorDataQualityConfig
} from '../types';

/**
 * Default data quality configuration
 */
export const DEFAULT_DATA_QUALITY_CONFIG: VendorDataQualityConfig = {
  completenessRules: {
    requiredFields: ['vendorId', 'vendorName', 'country'],
    recommendedFields: ['taxId', 'email', 'phone', 'street', 'city', 'postalCode'],
    criticalFields: ['vendorId', 'vendorName', 'country', 'taxId']
  },
  validationRules: {
    taxIdFormat: /^[A-Z0-9]{8,15}$/,
    ibanFormat: /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/,
    emailFormat: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phoneFormat: /^\+?[0-9\s\-()]{8,20}$/
  },
  freshnessThresholds: {
    warningDays: 365,
    criticalDays: 730
  },
  duplicateDetection: {
    enableFuzzyMatching: true,
    fuzzyThreshold: 75,
    checkBankAccounts: true,
    checkTaxId: true,
    checkAddress: true
  },
  sanctionsScreening: {
    enabled: true,
    lists: ['OFAC', 'EU', 'UN'],
    autoBlock: false
  }
};

/**
 * Calculate completeness score (0-100)
 */
export function calculateCompletenessScore(
  vendor: VendorMasterData,
  config: VendorDataQualityConfig = DEFAULT_DATA_QUALITY_CONFIG
): { score: number; issues: DataQualityIssue[] } {
  const issues: DataQualityIssue[] = [];
  let totalFields = 0;
  let populatedFields = 0;

  const allFields = [
    ...config.completenessRules.requiredFields,
    ...config.completenessRules.recommendedFields
  ];

  // Check each field
  for (const field of allFields) {
    totalFields++;
    const value = (vendor as any)[field];
    const isRequired = config.completenessRules.requiredFields.includes(field);
    const isCritical = config.completenessRules.criticalFields.includes(field);

    if (value !== undefined && value !== null && value !== '') {
      populatedFields++;
    } else {
      // Missing field
      const severity = isCritical ? 'CRITICAL' : (isRequired ? 'HIGH' : 'MEDIUM');
      issues.push({
        issueId: `COMP-${field}-${vendor.vendorId}`,
        category: 'MISSING_FIELD',
        severity,
        field,
        description: `${field} is not populated`,
        impact: isCritical
          ? 'Critical field missing - may block vendor operations'
          : isRequired
          ? 'Required field missing - reduces data reliability'
          : 'Recommended field missing - limits data usability',
        remediation: `Obtain ${field} from vendor and update master data`
      });
    }
  }

  // Check bank accounts (at least one should be present)
  if (!vendor.bankAccounts || vendor.bankAccounts.length === 0) {
    issues.push({
      issueId: `COMP-bankAccounts-${vendor.vendorId}`,
      category: 'MISSING_FIELD',
      severity: 'HIGH',
      field: 'bankAccounts',
      description: 'No bank account information',
      impact: 'Cannot process payments to vendor',
      remediation: 'Request bank account details from vendor'
    });
  } else {
    totalFields++;
    populatedFields++;

    // Check bank account completeness
    for (let i = 0; i < vendor.bankAccounts.length; i++) {
      const account = vendor.bankAccounts[i];
      if (!account.iban && !account.bankAccountNumber) {
        issues.push({
          issueId: `COMP-bankAccount-${i}-${vendor.vendorId}`,
          category: 'MISSING_FIELD',
          severity: 'HIGH',
          field: `bankAccounts[${i}].accountNumber`,
          description: 'Bank account missing IBAN or account number',
          impact: 'Cannot validate or process payments',
          remediation: 'Request complete bank account details'
        });
      }
    }
  }

  const score = totalFields > 0 ? (populatedFields / totalFields) * 100 : 0;
  return { score, issues };
}

/**
 * Calculate accuracy score (0-100)
 */
export function calculateAccuracyScore(
  vendor: VendorMasterData,
  config: VendorDataQualityConfig = DEFAULT_DATA_QUALITY_CONFIG
): { score: number; issues: DataQualityIssue[] } {
  const issues: DataQualityIssue[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // Tax ID format validation
  if (vendor.taxId) {
    totalChecks++;
    const taxIdClean = vendor.taxId.replace(/[\s-]/g, '');
    if (config.validationRules.taxIdFormat?.test(taxIdClean)) {
      passedChecks++;
    } else {
      issues.push({
        issueId: `ACC-taxId-${vendor.vendorId}`,
        category: 'INVALID_FORMAT',
        severity: 'HIGH',
        field: 'taxId',
        description: 'Tax ID format appears invalid',
        actualValue: vendor.taxId,
        expectedValue: 'Valid tax ID format (8-15 alphanumeric characters)',
        impact: 'May cause tax reporting errors or payment issues',
        remediation: 'Verify tax ID with official government records'
      });
    }
  }

  // Email validation
  if (vendor.email) {
    totalChecks++;
    if (config.validationRules.emailFormat?.test(vendor.email)) {
      passedChecks++;
    } else {
      issues.push({
        issueId: `ACC-email-${vendor.vendorId}`,
        category: 'INVALID_FORMAT',
        severity: 'MEDIUM',
        field: 'email',
        description: 'Email address format appears invalid',
        actualValue: vendor.email,
        expectedValue: 'Valid email format',
        impact: 'Cannot send automated notifications',
        remediation: 'Verify and correct email address'
      });
    }
  }

  // Phone validation
  if (vendor.phone) {
    totalChecks++;
    if (config.validationRules.phoneFormat?.test(vendor.phone)) {
      passedChecks++;
    } else {
      issues.push({
        issueId: `ACC-phone-${vendor.vendorId}`,
        category: 'INVALID_FORMAT',
        severity: 'LOW',
        field: 'phone',
        description: 'Phone number format appears invalid',
        actualValue: vendor.phone,
        expectedValue: 'Valid phone format (8-20 digits with optional country code)',
        impact: 'Cannot contact vendor by phone',
        remediation: 'Verify and correct phone number'
      });
    }
  }

  // IBAN validation
  if (vendor.bankAccounts) {
    for (let i = 0; i < vendor.bankAccounts.length; i++) {
      const account = vendor.bankAccounts[i];
      if (account.iban) {
        totalChecks++;
        const ibanClean = account.iban.replace(/\s/g, '');
        if (config.validationRules.ibanFormat?.test(ibanClean)) {
          passedChecks++;
        } else {
          issues.push({
            issueId: `ACC-iban-${i}-${vendor.vendorId}`,
            category: 'INVALID_FORMAT',
            severity: 'CRITICAL',
            field: `bankAccounts[${i}].iban`,
            description: 'IBAN format appears invalid',
            actualValue: account.iban,
            expectedValue: 'Valid IBAN format',
            impact: 'Payment transactions will fail',
            remediation: 'Verify IBAN with bank or vendor'
          });
        }
      }
    }
  }

  // Country code validation (basic check)
  if (vendor.country) {
    totalChecks++;
    if (vendor.country.length === 2 && /^[A-Z]{2}$/.test(vendor.country)) {
      passedChecks++;
    } else {
      issues.push({
        issueId: `ACC-country-${vendor.vendorId}`,
        category: 'INVALID_FORMAT',
        severity: 'MEDIUM',
        field: 'country',
        description: 'Country code format invalid',
        actualValue: vendor.country,
        expectedValue: 'Two-letter ISO country code (e.g., US, DE, GB)',
        impact: 'May cause tax/compliance issues',
        remediation: 'Use standard ISO 3166-1 alpha-2 country codes'
      });
    }
  }

  const score = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;
  return { score, issues };
}

/**
 * Calculate freshness score (0-100)
 */
export function calculateFreshnessScore(
  vendor: VendorMasterData,
  config: VendorDataQualityConfig = DEFAULT_DATA_QUALITY_CONFIG
): { score: number; issues: DataQualityIssue[] } {
  const issues: DataQualityIssue[] = [];

  if (!vendor.lastModifiedAt && !vendor.createdAt) {
    // No timestamp information
    return { score: 50, issues: [] };
  }

  const lastUpdate = vendor.lastModifiedAt || vendor.createdAt;
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24)
  );

  let score = 100;
  let severity: DataQualityIssue['severity'] = 'LOW';

  if (daysSinceUpdate > config.freshnessThresholds.criticalDays) {
    score = 20;
    severity = 'CRITICAL';
    issues.push({
      issueId: `FRESH-critical-${vendor.vendorId}`,
      category: 'STALE_DATA',
      severity: 'CRITICAL',
      field: 'lastModifiedAt',
      description: `Vendor data not updated for ${daysSinceUpdate} days`,
      actualValue: lastUpdate.toString(),
      impact: 'Data may be significantly outdated, causing operational issues',
      remediation: 'Conduct full vendor data review and update all fields'
    });
  } else if (daysSinceUpdate > config.freshnessThresholds.warningDays) {
    score = 60;
    severity = 'MEDIUM';
    issues.push({
      issueId: `FRESH-warning-${vendor.vendorId}`,
      category: 'STALE_DATA',
      severity: 'MEDIUM',
      field: 'lastModifiedAt',
      description: `Vendor data not updated for ${daysSinceUpdate} days`,
      actualValue: lastUpdate.toString(),
      impact: 'Data may be outdated',
      remediation: 'Review and refresh vendor information'
    });
  } else {
    // Decay score linearly from 100 at day 0 to 60 at warning threshold
    score = 100 - ((daysSinceUpdate / config.freshnessThresholds.warningDays) * 40);
  }

  return { score: Math.max(score, 0), issues };
}

/**
 * Calculate consistency score (0-100)
 */
export function calculateConsistencyScore(
  vendor: VendorMasterData
): { score: number; issues: DataQualityIssue[] } {
  const issues: DataQualityIssue[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // Check if IBAN country matches vendor country
  if (vendor.bankAccounts) {
    for (let i = 0; i < vendor.bankAccounts.length; i++) {
      const account = vendor.bankAccounts[i];
      if (account.iban && account.iban.length >= 2) {
        totalChecks++;
        const ibanCountry = account.iban.substring(0, 2).toUpperCase();
        if (ibanCountry === vendor.country || account.bankCountry === vendor.country) {
          passedChecks++;
        } else {
          issues.push({
            issueId: `CONS-iban-country-${i}-${vendor.vendorId}`,
            category: 'INCONSISTENT',
            severity: 'MEDIUM',
            field: `bankAccounts[${i}].iban`,
            description: 'IBAN country code does not match vendor country',
            actualValue: `IBAN country: ${ibanCountry}, Vendor country: ${vendor.country}`,
            impact: 'May indicate data entry error or foreign bank account',
            remediation: 'Verify bank account belongs to this vendor'
          });
        }
      }
    }
  }

  // Check if blocked status has a reason
  if (vendor.isBlocked) {
    totalChecks++;
    if (vendor.blockReason && vendor.blockReason.trim().length > 0) {
      passedChecks++;
    } else {
      issues.push({
        issueId: `CONS-block-reason-${vendor.vendorId}`,
        category: 'INCONSISTENT',
        severity: 'HIGH',
        field: 'blockReason',
        description: 'Vendor is blocked but no reason provided',
        impact: 'Unclear why vendor is blocked, may cause confusion',
        remediation: 'Document reason for blocking vendor'
      });
    }
  }

  // Check postal code format matches country (basic validation)
  if (vendor.postalCode && vendor.country) {
    totalChecks++;
    const postalCodePatterns: Record<string, RegExp> = {
      'US': /^\d{5}(-\d{4})?$/,
      'GB': /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
      'DE': /^\d{5}$/,
      'FR': /^\d{5}$/,
      'CA': /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i
    };

    const pattern = postalCodePatterns[vendor.country];
    if (!pattern || pattern.test(vendor.postalCode)) {
      passedChecks++;
    } else {
      issues.push({
        issueId: `CONS-postal-${vendor.vendorId}`,
        category: 'INCONSISTENT',
        severity: 'LOW',
        field: 'postalCode',
        description: `Postal code format does not match ${vendor.country} standard`,
        actualValue: vendor.postalCode,
        impact: 'May cause delivery or address verification issues',
        remediation: 'Verify postal code format'
      });
    }
  }

  // Check if payment terms and currency are consistent
  if (vendor.paymentTerms && !vendor.currency) {
    totalChecks++;
    issues.push({
      issueId: `CONS-currency-${vendor.vendorId}`,
      category: 'INCONSISTENT',
      severity: 'MEDIUM',
      field: 'currency',
      description: 'Payment terms defined but no currency specified',
      impact: 'Unclear what currency applies to payment terms',
      remediation: 'Specify default currency for vendor'
    });
  } else if (vendor.paymentTerms && vendor.currency) {
    totalChecks++;
    passedChecks++;
  }

  const score = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;
  return { score, issues };
}

/**
 * Generate recommendations based on issues
 */
export function generateRecommendations(issues: DataQualityIssue[]): string[] {
  const recommendations: string[] = [];
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
  const highIssues = issues.filter(i => i.severity === 'HIGH');
  const missingFields = issues.filter(i => i.category === 'MISSING_FIELD');
  const invalidFormats = issues.filter(i => i.category === 'INVALID_FORMAT');
  const staleData = issues.filter(i => i.category === 'STALE_DATA');

  if (criticalIssues.length > 0) {
    recommendations.push(
      `URGENT: Address ${criticalIssues.length} critical issue(s) immediately to prevent operational disruption`
    );
  }

  if (highIssues.length > 0) {
    recommendations.push(
      `Review ${highIssues.length} high-priority issue(s) within 7 days`
    );
  }

  if (missingFields.length > 0) {
    const criticalMissing = missingFields.filter(i => i.severity === 'CRITICAL');
    if (criticalMissing.length > 0) {
      recommendations.push(
        `Request missing critical fields: ${criticalMissing.map(i => i.field).join(', ')}`
      );
    }
  }

  if (invalidFormats.length > 0) {
    recommendations.push(
      'Validate and correct invalid field formats with vendor'
    );
  }

  if (staleData.length > 0) {
    recommendations.push(
      'Schedule vendor data refresh - information may be outdated'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Data quality is good - continue regular monitoring');
  }

  return recommendations;
}

/**
 * Calculate overall data quality score
 */
export function calculateDataQualityScore(
  vendor: VendorMasterData,
  config: VendorDataQualityConfig = DEFAULT_DATA_QUALITY_CONFIG
): DataQualityScore {
  const completeness = calculateCompletenessScore(vendor, config);
  const accuracy = calculateAccuracyScore(vendor, config);
  const freshness = calculateFreshnessScore(vendor, config);
  const consistency = calculateConsistencyScore(vendor);

  // Weighted average: Completeness 30%, Accuracy 40%, Freshness 15%, Consistency 15%
  const overallScore = Math.round(
    completeness.score * 0.30 +
    accuracy.score * 0.40 +
    freshness.score * 0.15 +
    consistency.score * 0.15
  );

  const allIssues = [
    ...completeness.issues,
    ...accuracy.issues,
    ...freshness.issues,
    ...consistency.issues
  ];

  return {
    vendorId: vendor.vendorId,
    vendorName: vendor.vendorName,
    overallScore,
    completenessScore: Math.round(completeness.score),
    accuracyScore: Math.round(accuracy.score),
    freshnessScore: Math.round(freshness.score),
    consistencyScore: Math.round(consistency.score),
    issues: allIssues,
    recommendations: generateRecommendations(allIssues),
    lastAssessedAt: new Date()
  };
}

/**
 * Batch calculate data quality scores for multiple vendors
 */
export function calculateBatchDataQuality(
  vendors: VendorMasterData[],
  config: VendorDataQualityConfig = DEFAULT_DATA_QUALITY_CONFIG
): DataQualityScore[] {
  return vendors.map(vendor => calculateDataQualityScore(vendor, config));
}
