import { SoDViolation, RiskLevel } from '@sap-framework/user-access-review';
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
    riskScore: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    trend: 'increasing' | 'decreasing' | 'stable';
}
export interface ComplianceScore {
    overall: number;
    byDepartment: Map<string, number>;
    byRiskLevel: Map<RiskLevel, number>;
    totalUsers: number;
    usersWithViolations: number;
    complianceRate: number;
}
export interface UserRiskProfile {
    userId: string;
    userName: string;
    department: string;
    totalViolations: number;
    riskScore: number;
    criticalViolations: number;
    highViolations: number;
    mediumViolations: number;
    lowViolations: number;
    riskRanking: number;
}
export interface HeatmapCell {
    department: string;
    riskLevel: RiskLevel;
    count: number;
    percentage: number;
}
export declare class AnalyticsEngine {
    /**
     * Calculate violation trends over time
     * @param violations - All violations to analyze
     * @param interval - Time interval ('day' | 'week' | 'month')
     * @param periods - Number of periods to analyze
     */
    analyzeTrends(violations: SoDViolation[], interval?: 'day' | 'week' | 'month', periods?: number): TrendDataPoint[];
    /**
     * Generate risk heatmap (department × risk level)
     */
    generateRiskHeatmap(violations: SoDViolation[]): HeatmapCell[];
    /**
     * Calculate department risk scores
     */
    calculateDepartmentRisks(violations: SoDViolation[], previousViolations?: SoDViolation[]): DepartmentRiskScore[];
    /**
     * Calculate overall compliance score
     */
    calculateComplianceScore(violations: SoDViolation[], totalUsers: number): ComplianceScore;
    /**
     * Generate user risk profiles
     */
    generateUserRiskProfiles(violations: SoDViolation[]): UserRiskProfile[];
    /**
     * Identify anomalies in violation patterns
     */
    detectAnomalies(currentViolations: SoDViolation[], historicalViolations: SoDViolation[], threshold?: number): {
        anomalies: Array<{
            type: 'spike' | 'new_department' | 'new_pattern';
            description: string;
            severity: 'high' | 'medium' | 'low';
            data: any;
        }>;
    };
    private getIntervalMs;
    private getUniqueDepartments;
    private calculateRiskScore;
    private calculateAverageRiskScore;
    private calculateStdDev;
}
/**
 * Singleton instance
 */
export declare const analyticsEngine: AnalyticsEngine;
//# sourceMappingURL=AnalyticsEngine.d.ts.map