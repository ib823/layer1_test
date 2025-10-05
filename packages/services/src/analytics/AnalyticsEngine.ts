import type { SoDViolation, RiskLevel } from '@sap-framework/user-access-review';

// ... rest of file stays the same

/**
 * Analytics Engine - Generate insights from SoD violations and access patterns
 *
 * Capabilities:
 * - Violation trend analysis (daily/weekly/monthly)
 * - Risk heatmaps (department × risk level)
 * - Compliance scoring
 * - Department comparison
 * - User risk profiling
 */

export interface TrendDataPoint {
  timestamp: Date;
  count: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface DepartmentRiskScore {
  department: string;
  totalViolations: number;
  riskScore: number; // 0-100
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ComplianceScore {
  overall: number; // 0-100
  byDepartment: Map<string, number>;
  byRiskLevel: Map<RiskLevel, number>;
  totalUsers: number;
  usersWithViolations: number;
  complianceRate: number; // percentage of users without violations
}

export interface UserRiskProfile {
  userId: string;
  userName: string;
  department: string;
  totalViolations: number;
  riskScore: number; // 0-100
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  riskRanking: number; // 1 = highest risk
}

export interface HeatmapCell {
  department: string;
  riskLevel: RiskLevel;
  count: number;
  percentage: number;
}

export class AnalyticsEngine {
  /**
   * Calculate violation trends over time
   * @param violations - All violations to analyze
   * @param interval - Time interval ('day' | 'week' | 'month')
   * @param periods - Number of periods to analyze
   */
  analyzeTrends(
    violations: SoDViolation[],
    interval: 'day' | 'week' | 'month' = 'day',
    periods: number = 30
  ): TrendDataPoint[] {
    const now = new Date();
    const trends: TrendDataPoint[] = [];

    // Calculate interval in milliseconds
    const intervalMs = this.getIntervalMs(interval);

    for (let i = periods - 1; i >= 0; i--) {
      const periodEnd = new Date(now.getTime() - i * intervalMs);
      const periodStart = new Date(periodEnd.getTime() - intervalMs);

      const periodViolations = violations.filter((v) => {
        const detectedAt = new Date(v.detectedAt);
        return detectedAt >= periodStart && detectedAt < periodEnd;
      });

      trends.push({
        timestamp: periodStart,
        count: periodViolations.length,
        criticalCount: periodViolations.filter((v) => v.riskLevel === 'CRITICAL').length,
        highCount: periodViolations.filter((v) => v.riskLevel === 'HIGH').length,
        mediumCount: periodViolations.filter((v) => v.riskLevel === 'MEDIUM').length,
        lowCount: periodViolations.filter((v) => v.riskLevel === 'LOW').length,
      });
    }

    return trends;
  }

  /**
   * Generate risk heatmap (department × risk level)
   */
  generateRiskHeatmap(violations: SoDViolation[]): HeatmapCell[] {
    const heatmap: HeatmapCell[] = [];
    const departments = this.getUniqueDepartments(violations);
    const riskLevels: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    const totalViolations = violations.length;

    for (const department of departments) {
      for (const riskLevel of riskLevels) {
        const count = violations.filter(
          (v) => v.department === department && v.riskLevel === riskLevel
        ).length;

        heatmap.push({
          department,
          riskLevel,
          count,
          percentage: totalViolations > 0 ? (count / totalViolations) * 100 : 0,
        });
      }
    }

    return heatmap.sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate department risk scores
   */
  calculateDepartmentRisks(
    violations: SoDViolation[],
    previousViolations?: SoDViolation[]
  ): DepartmentRiskScore[] {
    const departments = this.getUniqueDepartments(violations);
    const scores: DepartmentRiskScore[] = [];

    for (const department of departments) {
      const deptViolations = violations.filter((v) => v.department === department);
      const criticalCount = deptViolations.filter((v) => v.riskLevel === 'CRITICAL').length;
      const highCount = deptViolations.filter((v) => v.riskLevel === 'HIGH').length;
      const mediumCount = deptViolations.filter((v) => v.riskLevel === 'MEDIUM').length;
      const lowCount = deptViolations.filter((v) => v.riskLevel === 'LOW').length;

      // Risk score calculation (weighted by severity)
      const riskScore = this.calculateRiskScore(criticalCount, highCount, mediumCount, lowCount);

      // Trend calculation
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (previousViolations) {
        const prevCount = previousViolations.filter((v) => v.department === department).length;
        const currentCount = deptViolations.length;
        const changePercent = ((currentCount - prevCount) / Math.max(prevCount, 1)) * 100;

        if (changePercent > 10) trend = 'increasing';
        else if (changePercent < -10) trend = 'decreasing';
      }

      scores.push({
        department,
        totalViolations: deptViolations.length,
        riskScore,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        trend,
      });
    }

    return scores.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Calculate overall compliance score
   */
  calculateComplianceScore(
    violations: SoDViolation[],
    totalUsers: number
  ): ComplianceScore {
    const usersWithViolations = new Set(violations.map((v) => v.userId)).size;
    const complianceRate = totalUsers > 0 ? ((totalUsers - usersWithViolations) / totalUsers) * 100 : 100;

    // Overall score (inverse of risk)
    const overall = Math.max(0, 100 - this.calculateAverageRiskScore(violations));

    // By department
    const byDepartment = new Map<string, number>();
    const departments = this.getUniqueDepartments(violations);

    for (const dept of departments) {
      const deptViolations = violations.filter((v) => v.department === dept);
      const deptScore = Math.max(0, 100 - this.calculateAverageRiskScore(deptViolations));
      byDepartment.set(dept, deptScore);
    }

    // By risk level
    const byRiskLevel = new Map<RiskLevel, number>();
    const riskLevels: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    for (const level of riskLevels) {
      const count = violations.filter((v) => v.riskLevel === level).length;
      const percentage = violations.length > 0 ? (count / violations.length) * 100 : 0;
      byRiskLevel.set(level, percentage);
    }

    return {
      overall,
      byDepartment,
      byRiskLevel,
      totalUsers,
      usersWithViolations,
      complianceRate,
    };
  }

  /**
   * Generate user risk profiles
   */
  generateUserRiskProfiles(violations: SoDViolation[]): UserRiskProfile[] {
    const userMap = new Map<string, SoDViolation[]>();

    // Group by user
    for (const violation of violations) {
      const existing = userMap.get(violation.userId) || [];
      existing.push(violation);
      userMap.set(violation.userId, existing);
    }

    // Calculate profiles
    const profiles: UserRiskProfile[] = [];

    for (const [userId, userViolations] of userMap.entries()) {
      const criticalViolations = userViolations.filter((v) => v.riskLevel === 'CRITICAL').length;
      const highViolations = userViolations.filter((v) => v.riskLevel === 'HIGH').length;
      const mediumViolations = userViolations.filter((v) => v.riskLevel === 'MEDIUM').length;
      const lowViolations = userViolations.filter((v) => v.riskLevel === 'LOW').length;

      const riskScore = this.calculateRiskScore(
        criticalViolations,
        highViolations,
        mediumViolations,
        lowViolations
      );

      profiles.push({
        userId,
        userName: userViolations[0].userName,
        department: userViolations[0].department,
        totalViolations: userViolations.length,
        riskScore,
        criticalViolations,
        highViolations,
        mediumViolations,
        lowViolations,
        riskRanking: 0, // Will be set after sorting
      });
    }

    // Sort by risk score and assign rankings
    profiles.sort((a, b) => b.riskScore - a.riskScore);
    profiles.forEach((profile, index) => {
      profile.riskRanking = index + 1;
    });

    return profiles;
  }

  /**
   * Identify anomalies in violation patterns
   */
  detectAnomalies(
    currentViolations: SoDViolation[],
    historicalViolations: SoDViolation[],
    threshold: number = 2.0 // standard deviations
  ): {
    anomalies: Array<{
      type: 'spike' | 'new_department' | 'new_pattern';
      description: string;
      severity: 'high' | 'medium' | 'low';
      data: any;
    }>;
  } {
    const anomalies: any[] = [];

    // Check for violation count spike
    const currentCount = currentViolations.length;
    const avgHistorical = historicalViolations.length;
    const stdDev = this.calculateStdDev(
      historicalViolations.map(() => historicalViolations.length)
    );

    if (currentCount > avgHistorical + threshold * stdDev) {
      anomalies.push({
        type: 'spike',
        description: `Violation count spike detected: ${currentCount} vs avg ${avgHistorical.toFixed(0)}`,
        severity: 'high',
        data: { current: currentCount, average: avgHistorical, threshold },
      });
    }

    // Check for new departments
    const historicalDepts = this.getUniqueDepartments(historicalViolations);
    const currentDepts = this.getUniqueDepartments(currentViolations);
    const newDepts = currentDepts.filter((d) => !historicalDepts.includes(d));

    if (newDepts.length > 0) {
      anomalies.push({
        type: 'new_department',
        description: `New departments with violations: ${newDepts.join(', ')}`,
        severity: 'medium',
        data: { departments: newDepts },
      });
    }

    return { anomalies };
  }

  // ========== Private Helper Methods ==========

  private getIntervalMs(interval: 'day' | 'week' | 'month'): number {
    switch (interval) {
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  private getUniqueDepartments(violations: SoDViolation[]): string[] {
    return Array.from(new Set(violations.map((v) => v.department)));
  }

  private calculateRiskScore(
    critical: number,
    high: number,
    medium: number,
    low: number
  ): number {
    // Weighted risk score (0-100)
    const weights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1,
    };

    const totalWeighted =
      critical * weights.critical +
      high * weights.high +
      medium * weights.medium +
      low * weights.low;

    // Normalize to 0-100 scale
    const maxPossible = (critical + high + medium + low) * weights.critical;
    return maxPossible > 0 ? (totalWeighted / maxPossible) * 100 : 0;
  }

  private calculateAverageRiskScore(violations: SoDViolation[]): number {
    if (violations.length === 0) return 0;

    const riskWeights: Record<RiskLevel, number> = {
      CRITICAL: 100,
      HIGH: 75,
      MEDIUM: 50,
      LOW: 25,
    };

    const totalRisk = violations.reduce((sum, v) => sum + riskWeights[v.riskLevel], 0);
    return totalRisk / violations.length;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;

    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

    return Math.sqrt(variance);
  }
}

/**
 * Singleton instance
 */
export const analyticsEngine = new AnalyticsEngine();
