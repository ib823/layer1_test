/**
 * Vendor Data Quality Engine
 *
 * Main orchestration class that combines duplicate detection and data quality scoring
 * to provide comprehensive vendor master data quality analysis.
 */

import {
  VendorMasterData,
  VendorDuplicate,
  DataQualityScore,
  VendorDataQualityConfig,
  VendorDeduplicationResult,
  VendorRiskProfile,
  RiskFactor
} from './types';

import {
  findDuplicates,
  findDuplicatesForVendor
} from './algorithms/duplicateDetection';

import {
  calculateDataQualityScore,
  calculateBatchDataQuality,
  DEFAULT_DATA_QUALITY_CONFIG
} from './scoring/dataQualityScorer';

/**
 * Interface for data source that provides vendor master data
 */
export interface VendorDataSource {
  /**
   * Fetch vendor master data from source system (e.g., SAP S/4HANA)
   */
  getVendors(filter?: {
    vendorIds?: string[];
    countries?: string[];
    isBlocked?: boolean;
    modifiedSince?: Date;
  }): Promise<VendorMasterData[]>;

  /**
   * Get single vendor by ID
   */
  getVendor(vendorId: string): Promise<VendorMasterData | null>;
}

/**
 * Result of vendor data quality analysis
 */
export interface VendorDataQualityResult {
  analysisId: string;
  tenantId: string;
  totalVendors: number;
  averageQualityScore: number;
  qualityScores: DataQualityScore[];
  duplicates: VendorDuplicate[];
  riskProfiles: VendorRiskProfile[];
  summary: {
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    criticalDuplicates: number;
    highDuplicates: number;
    highRiskVendors: number;
  };
  completedAt: Date;
}

/**
 * Main Vendor Data Quality Engine
 */
export class VendorDataQualityEngine {
  private dataSource: VendorDataSource;
  private config: VendorDataQualityConfig;

  constructor(
    dataSource: VendorDataSource,
    config: VendorDataQualityConfig = DEFAULT_DATA_QUALITY_CONFIG
  ) {
    this.dataSource = dataSource;
    this.config = config;
  }

  /**
   * Run comprehensive vendor data quality analysis
   */
  async analyzeVendorQuality(
    tenantId: string,
    filter?: Parameters<VendorDataSource['getVendors']>[0]
  ): Promise<VendorDataQualityResult> {
    // Fetch vendor data
    const vendors = await this.dataSource.getVendors(filter);

    if (vendors.length === 0) {
      return this.createEmptyResult(tenantId);
    }

    // Calculate data quality scores
    const qualityScores = calculateBatchDataQuality(vendors, this.config);

    // Find duplicates (if enabled)
    const duplicates = this.config.duplicateDetection.enableFuzzyMatching
      ? findDuplicates(vendors, this.config.duplicateDetection.fuzzyThreshold)
      : [];

    // Calculate risk profiles
    const riskProfiles = this.calculateRiskProfiles(vendors, qualityScores, duplicates);

    // Calculate summary statistics
    const summary = this.calculateSummary(qualityScores, duplicates, riskProfiles);

    // Calculate average quality score
    const averageQualityScore = qualityScores.reduce((sum, s) => sum + s.overallScore, 0) / qualityScores.length;

    return {
      analysisId: this.generateAnalysisId(),
      tenantId,
      totalVendors: vendors.length,
      averageQualityScore: Math.round(averageQualityScore),
      qualityScores,
      duplicates,
      riskProfiles,
      summary,
      completedAt: new Date()
    };
  }

  /**
   * Analyze a single vendor
   */
  async analyzeSingleVendor(
    tenantId: string,
    vendorId: string
  ): Promise<{
    vendor: VendorMasterData;
    qualityScore: DataQualityScore;
    duplicates: VendorDuplicate[];
    riskProfile: VendorRiskProfile;
  } | null> {
    // Get the vendor
    const vendor = await this.dataSource.getVendor(vendorId);
    if (!vendor) {
      return null;
    }

    // Calculate quality score
    const qualityScore = calculateDataQualityScore(vendor, this.config);

    // Find duplicates
    const allVendors = await this.dataSource.getVendors({});
    const duplicates = this.config.duplicateDetection.enableFuzzyMatching
      ? findDuplicatesForVendor(vendor, allVendors, this.config.duplicateDetection.fuzzyThreshold)
      : [];

    // Calculate risk profile
    const riskProfile = this.calculateVendorRiskProfile(vendor, qualityScore, duplicates);

    return {
      vendor,
      qualityScore,
      duplicates,
      riskProfile
    };
  }

  /**
   * Run deduplication analysis only
   */
  async runDeduplication(
    tenantId: string,
    filter?: Parameters<VendorDataSource['getVendors']>[0]
  ): Promise<VendorDeduplicationResult> {
    const vendors = await this.dataSource.getVendors(filter);

    if (vendors.length === 0) {
      return {
        totalVendors: 0,
        duplicatesFound: 0,
        potentialDuplicates: 0,
        confirmedDuplicates: 0,
        falsPositives: 0,
        duplicateGroups: [],
        potentialSavings: 0,
        completedAt: new Date()
      };
    }

    const duplicates = findDuplicates(vendors, this.config.duplicateDetection.fuzzyThreshold);

    // Group duplicates
    const duplicateGroups = this.groupDuplicates(duplicates, vendors);

    // Count by status
    const confirmedDuplicates = duplicates.filter(d => d.status === 'CONFIRMED').length;
    const falsPositives = duplicates.filter(d => d.status === 'FALSE_POSITIVE').length;
    const potentialDuplicates = duplicates.filter(d => d.status === 'OPEN').length;

    // Estimate potential savings (rough estimate based on duplicate payment risk)
    const potentialSavings = this.estimateDuplicateSavings(duplicates);

    return {
      totalVendors: vendors.length,
      duplicatesFound: duplicates.length,
      potentialDuplicates,
      confirmedDuplicates,
      falsPositives,
      duplicateGroups,
      potentialSavings,
      completedAt: new Date()
    };
  }

  /**
   * Calculate risk profiles for all vendors
   */
  private calculateRiskProfiles(
    vendors: VendorMasterData[],
    qualityScores: DataQualityScore[],
    duplicates: VendorDuplicate[]
  ): VendorRiskProfile[] {
    return vendors.map(vendor => {
      const qualityScore = qualityScores.find(s => s.vendorId === vendor.vendorId);
      const vendorDuplicates = duplicates.filter(
        d => d.primaryVendor.vendorId === vendor.vendorId || d.duplicateVendor.vendorId === vendor.vendorId
      );

      return this.calculateVendorRiskProfile(vendor, qualityScore!, vendorDuplicates);
    });
  }

  /**
   * Calculate risk profile for a single vendor
   */
  private calculateVendorRiskProfile(
    vendor: VendorMasterData,
    qualityScore: DataQualityScore,
    duplicates: VendorDuplicate[]
  ): VendorRiskProfile {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;

    // Data quality risk
    if (qualityScore.overallScore < 50) {
      const severity = qualityScore.overallScore < 30 ? 'CRITICAL' : 'HIGH';
      const impact = severity === 'CRITICAL' ? 10 : 7;
      riskFactors.push({
        factor: 'Poor Data Quality',
        severity,
        description: `Data quality score is ${qualityScore.overallScore}/100`,
        impact,
        evidence: {
          overallScore: qualityScore.overallScore,
          criticalIssues: qualityScore.issues.filter(i => i.severity === 'CRITICAL').length
        }
      });
      riskScore += impact * 10;
    }

    // Duplicate risk
    const highSeverityDuplicates = duplicates.filter(d => d.severity === 'HIGH' || d.severity === 'CRITICAL');
    if (highSeverityDuplicates.length > 0) {
      const severity = duplicates.some(d => d.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH';
      const impact = severity === 'CRITICAL' ? 9 : 6;
      riskFactors.push({
        factor: 'Potential Duplicate Vendor',
        severity,
        description: `${highSeverityDuplicates.length} high-confidence duplicate(s) detected`,
        impact,
        evidence: {
          duplicateCount: duplicates.length,
          highestMatchScore: Math.max(...duplicates.map(d => d.matchScore))
        }
      });
      riskScore += impact * 10;
    }

    // Blocked vendor risk
    if (vendor.isBlocked) {
      riskFactors.push({
        factor: 'Blocked Vendor',
        severity: 'HIGH',
        description: 'Vendor is currently blocked',
        impact: 8,
        evidence: {
          isBlocked: true,
          blockReason: vendor.blockReason
        }
      });
      riskScore += 80;
    }

    // Missing critical fields
    const criticalIssues = qualityScore.issues.filter(
      i => i.severity === 'CRITICAL' && i.category === 'MISSING_FIELD'
    );
    if (criticalIssues.length > 0) {
      riskFactors.push({
        factor: 'Missing Critical Data',
        severity: 'HIGH',
        description: `${criticalIssues.length} critical field(s) missing`,
        impact: 7,
        evidence: {
          missingFields: criticalIssues.map(i => i.field)
        }
      });
      riskScore += 70;
    }

    // Country risk (basic - could be enhanced with actual country risk ratings)
    const highRiskCountries = ['KP', 'IR', 'SY', 'CU']; // Example high-risk countries
    if (highRiskCountries.includes(vendor.country)) {
      riskFactors.push({
        factor: 'High-Risk Country',
        severity: 'HIGH',
        description: `Vendor located in high-risk country: ${vendor.country}`,
        impact: 8,
        evidence: {
          country: vendor.country
        }
      });
      riskScore += 80;
    }

    // Stale data risk
    const staleDataIssues = qualityScore.issues.filter(i => i.category === 'STALE_DATA');
    if (staleDataIssues.some(i => i.severity === 'CRITICAL')) {
      riskFactors.push({
        factor: 'Severely Outdated Data',
        severity: 'MEDIUM',
        description: 'Vendor data has not been updated in over 2 years',
        impact: 5,
        evidence: {
          lastModifiedAt: vendor.lastModifiedAt
        }
      });
      riskScore += 50;
    }

    // Determine risk level
    let riskLevel: VendorRiskProfile['riskLevel'] = 'LOW';
    if (riskScore >= 80) riskLevel = 'CRITICAL';
    else if (riskScore >= 60) riskLevel = 'HIGH';
    else if (riskScore >= 40) riskLevel = 'MEDIUM';

    // Next review date (based on risk level)
    const nextReviewDays = riskLevel === 'CRITICAL' ? 30 : riskLevel === 'HIGH' ? 90 : riskLevel === 'MEDIUM' ? 180 : 365;
    const nextReviewDue = new Date();
    nextReviewDue.setDate(nextReviewDue.getDate() + nextReviewDays);

    return {
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      riskFactors,
      dataQualityScore: qualityScore.overallScore,
      hasDuplicates: duplicates.length > 0,
      sanctionsMatch: false, // TODO: Implement sanctions screening
      countryRisk: vendor.country,
      lastReviewedAt: new Date(),
      nextReviewDue
    };
  }

  /**
   * Group duplicates into clusters
   */
  private groupDuplicates(
    duplicates: VendorDuplicate[],
    allVendors: VendorMasterData[]
  ): VendorDeduplicationResult['duplicateGroups'] {
    const groups: VendorDeduplicationResult['duplicateGroups'] = [];
    const processedVendors = new Set<string>();

    for (const duplicate of duplicates) {
      const vendorId1 = duplicate.primaryVendor.vendorId;
      const vendorId2 = duplicate.duplicateVendor.vendorId;

      // Skip if already in a group
      if (processedVendors.has(vendorId1) || processedVendors.has(vendorId2)) {
        continue;
      }

      // Find all related duplicates
      const relatedVendors = new Set<string>([vendorId1, vendorId2]);
      const relatedDuplicates = [duplicate];

      // Keep expanding until no more related vendors found
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const dup of duplicates) {
          const id1 = dup.primaryVendor.vendorId;
          const id2 = dup.duplicateVendor.vendorId;

          if ((relatedVendors.has(id1) || relatedVendors.has(id2)) &&
              (!relatedVendors.has(id1) || !relatedVendors.has(id2))) {
            relatedVendors.add(id1);
            relatedVendors.add(id2);
            if (!relatedDuplicates.includes(dup)) {
              relatedDuplicates.push(dup);
            }
            expanded = true;
          }
        }
      }

      // Get vendor objects
      const groupVendors = allVendors.filter(v => relatedVendors.has(v.vendorId));

      // Determine primary vendor (most complete data)
      const primaryVendor = this.selectPrimaryVendor(groupVendors);

      // Calculate average match score
      const avgMatchScore = relatedDuplicates.reduce((sum, d) => sum + d.matchScore, 0) / relatedDuplicates.length;

      groups.push({
        groupId: `GROUP-${Array.from(relatedVendors).sort().join('-')}`,
        vendors: groupVendors,
        primaryVendor,
        matchScore: Math.round(avgMatchScore),
        matchType: relatedDuplicates[0].matchType,
        totalTransactions: 0, // TODO: Get from transaction data
        totalAmount: 0, // TODO: Get from transaction data
        recommendation: this.getGroupRecommendation(relatedDuplicates)
      });

      // Mark as processed
      relatedVendors.forEach(id => processedVendors.add(id));
    }

    return groups;
  }

  /**
   * Select the best vendor to use as primary (merge target)
   */
  private selectPrimaryVendor(vendors: VendorMasterData[]): VendorMasterData {
    // Score each vendor based on data completeness
    const scores = vendors.map(vendor => {
      let score = 0;
      if (vendor.taxId) score += 10;
      if (vendor.email) score += 5;
      if (vendor.phone) score += 5;
      if (vendor.street) score += 5;
      if (vendor.city) score += 5;
      if (vendor.postalCode) score += 5;
      if (vendor.bankAccounts?.length) score += 15;
      return { vendor, score, timestamp: vendor.lastModifiedAt || vendor.createdAt };
    });

    // Sort by completeness score first, then by recency
    return scores.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      // If scores are equal, prefer more recent
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    })[0].vendor;
  }

  /**
   * Get recommendation for a duplicate group
   */
  private getGroupRecommendation(duplicates: VendorDuplicate[]): string {
    const criticalCount = duplicates.filter(d => d.severity === 'CRITICAL').length;
    const highCount = duplicates.filter(d => d.severity === 'HIGH').length;

    if (criticalCount > 0) {
      return 'MERGE_IMMEDIATELY - Critical duplicate group detected';
    }

    if (highCount >= duplicates.length / 2) {
      return 'MERGE_AFTER_REVIEW - High confidence duplicate group';
    }

    return 'INVESTIGATE - Potential duplicate group requires review';
  }

  /**
   * Estimate potential savings from eliminating duplicates
   */
  private estimateDuplicateSavings(duplicates: VendorDuplicate[]): number {
    // Conservative estimate: Each duplicate vendor costs $1000-5000 annually in:
    // - Duplicate payments
    // - Manual reconciliation effort
    // - Audit findings
    const criticalDuplicates = duplicates.filter(d => d.severity === 'CRITICAL').length;
    const highDuplicates = duplicates.filter(d => d.severity === 'HIGH').length;

    return (criticalDuplicates * 5000) + (highDuplicates * 2000);
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    qualityScores: DataQualityScore[],
    duplicates: VendorDuplicate[],
    riskProfiles: VendorRiskProfile[]
  ) {
    const allIssues = qualityScores.flatMap(s => s.issues);

    return {
      criticalIssues: allIssues.filter(i => i.severity === 'CRITICAL').length,
      highIssues: allIssues.filter(i => i.severity === 'HIGH').length,
      mediumIssues: allIssues.filter(i => i.severity === 'MEDIUM').length,
      lowIssues: allIssues.filter(i => i.severity === 'LOW').length,
      criticalDuplicates: duplicates.filter(d => d.severity === 'CRITICAL').length,
      highDuplicates: duplicates.filter(d => d.severity === 'HIGH').length,
      highRiskVendors: riskProfiles.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length
    };
  }

  /**
   * Create empty result
   */
  private createEmptyResult(tenantId: string): VendorDataQualityResult {
    return {
      analysisId: this.generateAnalysisId(),
      tenantId,
      totalVendors: 0,
      averageQualityScore: 0,
      qualityScores: [],
      duplicates: [],
      riskProfiles: [],
      summary: {
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        criticalDuplicates: 0,
        highDuplicates: 0,
        highRiskVendors: 0
      },
      completedAt: new Date()
    };
  }

  /**
   * Generate unique analysis ID
   */
  private generateAnalysisId(): string {
    return `VDQ-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
