/**
 * GL Account Anomaly Detection Engine
 *
 * Main orchestration class that combines statistical analysis, Benford's Law,
 * and behavioral pattern detection to identify anomalous GL transactions.
 */

import {
  GLLineItem,
  GLAnomaly,
  AnomalyDetectionConfig,
  AnomalyDetectionResult,
  GLAccountRiskProfile,
  AnomalyType
} from './types';

import {
  analyzeBenfordsLawBatch,
  benfordResultToAnomaly
} from './algorithms/benfordsLaw';

import {
  detectStatisticalOutliers,
  calculateGLAccountStats
} from './algorithms/statisticalOutliers';

import {
  detectAfterHoursPostings,
  detectWeekendPostings,
  detectSameDayReversals,
  detectRoundNumberPattern,
  detectDuplicateEntries,
  analyzeVelocity
} from './patterns/behavioralAnomalies';

/**
 * Interface for data source that provides GL line items
 */
export interface GLDataSource {
  /**
   * Fetch GL line items from source system (e.g., SAP S/4HANA)
   */
  getGLLineItems(filter?: {
    glAccounts?: string[];
    fiscalYear: string;
    fiscalPeriod?: string;
    fromDate?: Date;
    toDate?: Date;
    companyCode?: string;
  }): Promise<GLLineItem[]>;
}

/**
 * Default anomaly detection configuration
 */
export const DEFAULT_ANOMALY_CONFIG: AnomalyDetectionConfig = {
  benfordLaw: {
    enabled: true,
    minTransactions: 100,
    significanceLevel: 0.05
  },
  statisticalOutliers: {
    enabled: true,
    method: 'IQR',
    zScoreThreshold: 3.0,
    iqrMultiplier: 1.5
  },
  behavioralAnomalies: {
    enabled: true,
    checkAfterHours: true,
    checkWeekends: true,
    afterHoursStart: 19,
    afterHoursEnd: 7,
    checkReversals: true,
    sameDayReversalWindow: 24
  },
  velocityAnalysis: {
    enabled: true,
    deviationThreshold: 200,
    lookbackPeriods: 12
  },
  roundNumbers: {
    enabled: true,
    thresholds: [1000, 5000, 10000],
    minOccurrences: 5
  },
  duplicateDetection: {
    enabled: true,
    timeWindow: 24,
    amountTolerance: 0.01
  }
};

/**
 * Main GL Anomaly Detection Engine
 */
export class GLAnomalyDetectionEngine {
  private dataSource: GLDataSource;
  private config: AnomalyDetectionConfig;

  constructor(
    dataSource: GLDataSource,
    config: AnomalyDetectionConfig = DEFAULT_ANOMALY_CONFIG
  ) {
    this.dataSource = dataSource;
    this.config = config;
  }

  /**
   * Run comprehensive anomaly detection analysis
   */
  async detectAnomalies(
    tenantId: string,
    filter: Parameters<GLDataSource['getGLLineItems']>[0]
  ): Promise<AnomalyDetectionResult> {
    if (!filter) {
      throw new Error('Filter is required');
    }

    // Fetch GL line items
    const lineItems = await this.dataSource.getGLLineItems(filter);

    if (lineItems.length === 0) {
      return this.createEmptyResult(tenantId, filter.fiscalYear, filter.fiscalPeriod);
    }

    const allAnomalies: GLAnomaly[] = [];

    // 1. Benford's Law Analysis
    if (this.config.benfordLaw.enabled) {
      const benfordResults = analyzeBenfordsLawBatch(
        lineItems,
        this.config.benfordLaw.minTransactions,
        this.config.benfordLaw.significanceLevel
      );

      for (const result of benfordResults) {
        if (result.isAnomalous) {
          const accountItems = lineItems.filter(item => item.glAccount === result.glAccount);
          const anomaly = benfordResultToAnomaly(result, accountItems);
          if (anomaly) {
            allAnomalies.push(anomaly);
          }
        }
      }
    }

    // 2. Statistical Outlier Detection
    if (this.config.statisticalOutliers.enabled) {
      // Group by GL account for better statistical analysis
      const accountGroups = this.groupByAccount(lineItems);

      for (const [glAccount, items] of accountGroups) {
        if (items.length < 10) continue; // Skip accounts with too few transactions

        const outliers = detectStatisticalOutliers(
          items,
          this.config.statisticalOutliers.method,
          this.config.statisticalOutliers
        );

        for (const outlier of outliers.slice(0, 10)) { // Top 10 outliers per account
          const severity = outlier.score > 5 ? 'CRITICAL' : outlier.score > 3 ? 'HIGH' : 'MEDIUM';

          allAnomalies.push({
            anomalyId: `OUTLIER-${outlier.lineItem.documentNumber}-${Date.now()}`,
            glAccount,
            glAccountName: outlier.lineItem.glAccountName,
            lineItems: [outlier.lineItem],
            anomalyType: 'STATISTICAL_OUTLIER',
            severity,
            score: Math.min(100, outlier.score * 20),
            detectedAt: new Date(),
            description: `Unusual amount detected: ${Math.abs(outlier.lineItem.amount).toLocaleString()} ${outlier.lineItem.currency} (${outlier.method} score: ${outlier.score.toFixed(2)})`,
            details: {
              confidence: 85,
              evidence: {
                method: outlier.method,
                score: outlier.score,
                threshold: outlier.threshold,
                deviation: outlier.deviation,
                populationMean: outlier.populationMean,
                populationStd: outlier.populationStd
              }
            },
            recommendation: severity === 'CRITICAL'
              ? 'URGENT: Investigate unusual transaction amount'
              : 'Review transaction for legitimacy',
            status: 'OPEN'
          });
        }
      }
    }

    // 3. Behavioral Anomalies
    if (this.config.behavioralAnomalies.enabled) {
      // After-hours postings
      if (this.config.behavioralAnomalies.checkAfterHours) {
        const afterHoursAnomalies = detectAfterHoursPostings(
          lineItems,
          this.config.behavioralAnomalies.afterHoursStart,
          this.config.behavioralAnomalies.afterHoursEnd
        );
        allAnomalies.push(...afterHoursAnomalies);
      }

      // Weekend postings
      if (this.config.behavioralAnomalies.checkWeekends) {
        const weekendAnomalies = detectWeekendPostings(lineItems);
        allAnomalies.push(...weekendAnomalies);
      }

      // Same-day reversals
      if (this.config.behavioralAnomalies.checkReversals) {
        const reversalAnomalies = detectSameDayReversals(
          lineItems,
          this.config.behavioralAnomalies.sameDayReversalWindow
        );
        allAnomalies.push(...reversalAnomalies);
      }
    }

    // 4. Round Number Patterns
    if (this.config.roundNumbers.enabled) {
      const accountGroups = this.groupByAccount(lineItems);

      for (const [, items] of accountGroups) {
        const roundNumberAnomalies = detectRoundNumberPattern(
          items,
          this.config.roundNumbers.thresholds,
          this.config.roundNumbers.minOccurrences
        );
        allAnomalies.push(...roundNumberAnomalies);
      }
    }

    // 5. Duplicate Detection
    if (this.config.duplicateDetection.enabled) {
      const duplicateAnomalies = detectDuplicateEntries(
        lineItems,
        this.config.duplicateDetection.timeWindow,
        this.config.duplicateDetection.amountTolerance
      );
      allAnomalies.push(...duplicateAnomalies);
    }

    // 6. Velocity Analysis
    const velocityAnomalies = [];
    if (this.config.velocityAnalysis.enabled) {
      const accountGroups = this.groupByAccount(lineItems);

      for (const [glAccount, items] of accountGroups) {
        const velocityResults = analyzeVelocity(
          items,
          glAccount,
          this.config.velocityAnalysis.deviationThreshold,
          this.config.velocityAnalysis.lookbackPeriods
        );
        velocityAnomalies.push(...velocityResults);

        // Convert to anomalies
        for (const velocity of velocityResults) {
          allAnomalies.push({
            anomalyId: `VELOCITY-${glAccount}-${velocity.period}`,
            glAccount,
            glAccountName: items[0].glAccountName,
            lineItems: items.filter(i => `${i.fiscalYear}-${i.fiscalPeriod}` === velocity.period),
            anomalyType: 'VELOCITY_ANOMALY',
            severity: velocity.severity,
            score: Math.min(100, Math.max(Math.abs(velocity.countDeviation), Math.abs(velocity.amountDeviation)) / 5),
            detectedAt: new Date(),
            description: `Unusual transaction velocity in period ${velocity.period}: ${velocity.transactionCount} transactions (${velocity.countDeviation > 0 ? '+' : ''}${velocity.countDeviation.toFixed(0)}% vs avg)`,
            details: {
              confidence: 80,
              evidence: {
                period: velocity.period,
                transactionCount: velocity.transactionCount,
                averageCount: velocity.averageTransactionCount,
                countDeviation: velocity.countDeviation,
                amountDeviation: velocity.amountDeviation
              }
            },
            recommendation: 'Investigate sudden change in transaction patterns',
            status: 'OPEN'
          });
        }
      }
    }

    // Calculate account statistics
    const accountGroups = this.groupByAccount(lineItems);
    const accountStats = Array.from(accountGroups.entries()).map(([glAccount, items]) =>
      calculateGLAccountStats(items, glAccount)
    );

    // Calculate summary
    const summary = this.calculateSummary(allAnomalies);

    // Estimate fraud risk
    const estimatedFraudRisk = this.estimateFraudRisk(allAnomalies, lineItems.length);

    return {
      analysisId: this.generateAnalysisId(),
      tenantId,
      glAccount: filter.glAccounts?.[0],
      fiscalYear: filter.fiscalYear,
      fiscalPeriod: filter.fiscalPeriod,
      totalLineItems: lineItems.length,
      anomaliesDetected: allAnomalies.length,
      anomalies: allAnomalies.sort((a, b) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      accountStats,
      velocityAnomalies,
      summary,
      completedAt: new Date()
    };
  }

  /**
   * Analyze a specific GL account
   */
  async analyzeGLAccount(
    tenantId: string,
    glAccount: string,
    fiscalYear: string,
    fiscalPeriod?: string
  ): Promise<GLAccountRiskProfile> {
    const result = await this.detectAnomalies(tenantId, {
      glAccounts: [glAccount],
      fiscalYear,
      fiscalPeriod
    });

    const accountAnomalies = result.anomalies;
    const criticalCount = accountAnomalies.filter(a => a.severity === 'CRITICAL').length;

    // Calculate risk score
    let riskScore = 0;
    riskScore += criticalCount * 25;
    riskScore += accountAnomalies.filter(a => a.severity === 'HIGH').length * 15;
    riskScore += accountAnomalies.filter(a => a.severity === 'MEDIUM').length * 5;
    riskScore = Math.min(100, riskScore);

    // Determine risk level
    let riskLevel: GLAccountRiskProfile['riskLevel'] = 'LOW';
    if (riskScore >= 75) riskLevel = 'CRITICAL';
    else if (riskScore >= 50) riskLevel = 'HIGH';
    else if (riskScore >= 25) riskLevel = 'MEDIUM';

    // Identify control weaknesses
    const controlWeaknesses: string[] = [];
    if (accountAnomalies.some(a => a.anomalyType === 'AFTER_HOURS_POSTING')) {
      controlWeaknesses.push('Inadequate access controls for after-hours postings');
    }
    if (accountAnomalies.some(a => a.anomalyType === 'DUPLICATE_ENTRY')) {
      controlWeaknesses.push('Weak duplicate detection controls');
    }
    if (accountAnomalies.some(a => a.anomalyType === 'BENFORD_LAW_VIOLATION')) {
      controlWeaknesses.push('Potential data manipulation or estimation practices');
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(accountAnomalies);

    return {
      glAccount,
      glAccountName: result.accountStats[0]?.glAccountName || '',
      riskScore,
      riskLevel,
      riskFactors: accountAnomalies.slice(0, 5).map(a => ({
        factor: a.anomalyType,
        severity: a.severity,
        description: a.description,
        impact: a.severity === 'CRITICAL' ? 10 : a.severity === 'HIGH' ? 7 : a.severity === 'MEDIUM' ? 4 : 2
      })),
      anomalyCount: accountAnomalies.length,
      criticalAnomalyCount: criticalCount,
      controlWeaknesses,
      recommendations,
      lastAssessedAt: new Date()
    };
  }

  /**
   * Group line items by GL account
   */
  private groupByAccount(lineItems: GLLineItem[]): Map<string, GLLineItem[]> {
    const groups = new Map<string, GLLineItem[]>();

    for (const item of lineItems) {
      if (!groups.has(item.glAccount)) {
        groups.set(item.glAccount, []);
      }
      groups.get(item.glAccount)!.push(item);
    }

    return groups;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(anomalies: GLAnomaly[]) {
    const byType: Record<AnomalyType, number> = {} as any;

    for (const anomaly of anomalies) {
      byType[anomaly.anomalyType] = (byType[anomaly.anomalyType] || 0) + 1;
    }

    return {
      criticalAnomalies: anomalies.filter(a => a.severity === 'CRITICAL').length,
      highAnomalies: anomalies.filter(a => a.severity === 'HIGH').length,
      mediumAnomalies: anomalies.filter(a => a.severity === 'MEDIUM').length,
      lowAnomalies: anomalies.filter(a => a.severity === 'LOW').length,
      byType,
      estimatedFraudRisk: 0 // Will be calculated separately
    };
  }

  /**
   * Estimate overall fraud risk (0-100)
   */
  private estimateFraudRisk(anomalies: GLAnomaly[], totalTransactions: number): number {
    const criticalCount = anomalies.filter(a => a.severity === 'CRITICAL').length;
    const highCount = anomalies.filter(a => a.severity === 'HIGH').length;

    let risk = 0;
    risk += criticalCount * 15;
    risk += highCount * 8;

    // Adjust for anomaly rate
    const anomalyRate = (anomalies.length / totalTransactions) * 100;
    if (anomalyRate > 10) risk += 20;
    else if (anomalyRate > 5) risk += 10;

    return Math.min(100, risk);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(anomalies: GLAnomaly[]): string[] {
    const recommendations: string[] = [];

    const criticalCount = anomalies.filter(a => a.severity === 'CRITICAL').length;
    if (criticalCount > 0) {
      recommendations.push(`URGENT: Investigate ${criticalCount} critical anomalies immediately`);
    }

    if (anomalies.some(a => a.anomalyType === 'BENFORD_LAW_VIOLATION')) {
      recommendations.push('Review data entry processes and potential estimation biases');
    }

    if (anomalies.some(a => a.anomalyType === 'AFTER_HOURS_POSTING')) {
      recommendations.push('Strengthen access controls for after-hours postings');
    }

    if (anomalies.some(a => a.anomalyType === 'DUPLICATE_ENTRY')) {
      recommendations.push('Implement automated duplicate detection in source systems');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue regular monitoring - no critical issues detected');
    }

    return recommendations;
  }

  /**
   * Create empty result
   */
  private createEmptyResult(
    tenantId: string,
    fiscalYear: string,
    fiscalPeriod?: string
  ): AnomalyDetectionResult {
    return {
      analysisId: this.generateAnalysisId(),
      tenantId,
      fiscalYear,
      fiscalPeriod,
      totalLineItems: 0,
      anomaliesDetected: 0,
      anomalies: [],
      accountStats: [],
      velocityAnomalies: [],
      summary: {
        criticalAnomalies: 0,
        highAnomalies: 0,
        mediumAnomalies: 0,
        lowAnomalies: 0,
        byType: {} as any,
        estimatedFraudRisk: 0
      },
      completedAt: new Date()
    };
  }

  /**
   * Generate unique analysis ID
   */
  private generateAnalysisId(): string {
    return `GLAD-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
