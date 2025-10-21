/**
 * SoD Analyzer Engine - Main Orchestrator
 *
 * High-level orchestration for SoD analysis:
 * - Manages analysis lifecycle
 * - Coordinates between RuleEngine and AccessGraphService
 * - Provides simplified API for controllers
 */

import { RuleEngine } from './RuleEngine';
import { AccessGraphService } from '../services/AccessGraphService';
import {
  AnalysisConfig,
  AnalysisResult,
  SimulationRequest,
  SimulationResult,
  SodFinding,
} from '../types';

export interface SODAnalyzerConfig {
  database: any; // Database connection (Knex or Prisma)
}

export class SODAnalyzerEngine {
  private ruleEngine: RuleEngine;
  private accessGraphService: AccessGraphService;
  private db: any;

  constructor(db: any) {
    // Support both old config object and direct database parameter
    this.db = typeof db === 'object' && db.database ? db.database : db;
    this.ruleEngine = new RuleEngine(this.db);
    this.accessGraphService = new AccessGraphService(this.db);
  }

  /**
   * Run comprehensive SoD analysis with full tracking and persistence
   * This is the main entry point for scheduled and on-demand analyses
   */
  async analyze(params: {
    tenantId: string;
    systemIds: string[];
    rulesetIds?: string[];
    analysisType: 'FULL' | 'INCREMENTAL' | 'USER_SPECIFIC';
    triggeredBy: string;
    userId?: string;
  }): Promise<{
    runId: string;
    status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
    totalUsers: number;
    totalRoles: number;
    violationsFound: number;
    criticalViolations: number;
    highViolations: number;
    mediumViolations: number;
    lowViolations: number;
  }> {
    const { tenantId, systemIds, rulesetIds = [], analysisType, triggeredBy, userId } = params;

    // Create analysis run record
    const [runRecord] = await this.db('sod_analysis_runs')
      .insert({
        tenant_id: tenantId,
        analysis_type: analysisType,
        triggered_by: triggeredBy,
        status: 'IN_PROGRESS',
        started_at: new Date(),
        config: JSON.stringify({
          systemIds,
          rulesetIds,
          userId,
        }),
      })
      .returning('*');

    const runId = runRecord.id;

    try {
      // Get active rulesets
      let rulesQuery = this.db('sod_rules').where({ tenant_id: tenantId, is_active: true });
      if (rulesetIds.length > 0) {
        rulesQuery = rulesQuery.whereIn('ruleset_id', rulesetIds);
      }
      const rules = await rulesQuery;

      // Get users to analyze
      let usersQuery = this.db('access_graph_users')
        .where({ tenant_id: tenantId, is_active: true });
      if (systemIds.length > 0) {
        usersQuery = usersQuery.whereIn('source_system_id', systemIds);
      }
      if (userId) {
        usersQuery = usersQuery.where({ user_id: userId });
      }
      const users = await usersQuery;

      // Get all roles
      let rolesQuery = this.db('access_graph_roles').where({ tenant_id: tenantId });
      if (systemIds.length > 0) {
        rolesQuery = rolesQuery.whereIn('source_system_id', systemIds);
      }
      const roles = await rolesQuery;

      // Get role assignments
      const assignments = await this.db('access_graph_assignments')
        .where({ tenant_id: tenantId })
        .whereIn('user_id', users.map((u: any) => u.id));

      // Build user-role mapping
      const userRoleMap = new Map<string, string[]>();
      for (const assignment of assignments) {
        if (!userRoleMap.has(assignment.user_id)) {
          userRoleMap.set(assignment.user_id, []);
        }
        userRoleMap.get(assignment.user_id)!.push(assignment.role_id);
      }

      // Analyze each user against each rule
      const findings = [];
      let criticalCount = 0;
      let highCount = 0;
      let mediumCount = 0;
      let lowCount = 0;

      for (const user of users) {
        const userRoles = userRoleMap.get(user.id) || [];
        const roleDetails = roles.filter((r: any) => userRoles.includes(r.id));

        for (const rule of rules) {
          const conflictingFunctions = JSON.parse(rule.conflicting_functions || '[]');

          // Check if user has roles with conflicting functions
          // This is a simplified check - in production, would need to check actual permissions
          const conflictingRoles = roleDetails.filter((role: any) => {
            // Simple heuristic: role name contains function keywords
            return conflictingFunctions.some((func: string) =>
              role.role_name?.toUpperCase().includes(func.replace('_', ' '))
            );
          });

          if (conflictingRoles.length >= 2) {
            // Violation found
            const riskScore = this.calculateRiskScore(rule.risk_level, conflictingRoles.length);

            findings.push({
              tenant_id: tenantId,
              analysis_run_id: runId,
              rule_id: rule.id,
              finding_type: 'ROLE_CONFLICT',
              affected_user_id: user.id,
              conflicting_roles: JSON.stringify(conflictingRoles.map((r: any) => r.id)),
              risk_level: rule.risk_level,
              risk_score: riskScore,
              status: 'OPEN',
              first_detected: new Date(),
              last_checked: new Date(),
            });

            // Count by severity
            if (rule.risk_level === 'CRITICAL') criticalCount++;
            else if (rule.risk_level === 'HIGH') highCount++;
            else if (rule.risk_level === 'MEDIUM') mediumCount++;
            else if (rule.risk_level === 'LOW') lowCount++;
          }
        }
      }

      // Persist findings
      if (findings.length > 0) {
        await this.db('sod_findings').insert(findings);
      }

      // Update analysis run
      await this.db('sod_analysis_runs')
        .where({ id: runId })
        .update({
          status: 'COMPLETED',
          completed_at: new Date(),
          total_users: users.length,
          total_roles: roles.length,
          violations_found: findings.length,
          critical_violations: criticalCount,
          high_violations: highCount,
          medium_violations: mediumCount,
          low_violations: lowCount,
        });

      return {
        runId,
        status: 'COMPLETED',
        totalUsers: users.length,
        totalRoles: roles.length,
        violationsFound: findings.length,
        criticalViolations: criticalCount,
        highViolations: highCount,
        mediumViolations: mediumCount,
        lowViolations: lowCount,
      };
    } catch (error) {
      // Mark run as failed
      await this.db('sod_analysis_runs')
        .where({ id: runId })
        .update({
          status: 'FAILED',
          completed_at: new Date(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });

      throw error;
    }
  }

  /**
   * Calculate risk score based on severity and number of conflicts
   */
  private calculateRiskScore(riskLevel: string, conflictCount: number): number {
    const baseScores: Record<string, number> = {
      CRITICAL: 90,
      HIGH: 70,
      MEDIUM: 50,
      LOW: 30,
    };
    const base = baseScores[riskLevel] || 50;
    const multiplier = Math.min(1 + (conflictCount - 2) * 0.1, 1.5); // Up to 50% increase
    return Math.min(Math.round(base * multiplier), 100);
  }

  /**
   * Run comprehensive SoD analysis for a tenant
   */
  async analyzeAllUsers(tenantId: string, config?: Partial<AnalysisConfig>): Promise<AnalysisResult> {
    const analysisConfig: AnalysisConfig = {
      mode: 'snapshot',
      includeInactive: false,
      riskLevels: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      ...config,
    };

    // Create snapshot before analysis (for auditability)
    await this.accessGraphService.createSnapshot(tenantId, 'ON_DEMAND', 'SODAnalyzerEngine');

    // Run analysis
    const result = await this.ruleEngine.analyze(tenantId, analysisConfig);

    return result;
  }

  /**
   * Analyze a specific user
   */
  async analyzeUser(tenantId: string, userId: string): Promise<{
    userId: string;
    findings: SodFinding[];
    riskScore: number;
    violationCount: number;
    criticalCount: number;
    highCount: number;
  }> {
    // Run full analysis
    const fullResult = await this.ruleEngine.analyze(tenantId, {
      mode: 'snapshot',
      includeInactive: false,
    });

    // Filter findings for specific user
    const userFindings = fullResult.findings.filter(f => f.userId === userId);

    const criticalCount = userFindings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = userFindings.filter(f => f.severity === 'HIGH').length;

    // Calculate aggregate risk score
    const riskScore = userFindings.length > 0
      ? userFindings.reduce((sum, f) => sum + (f.riskScore || 0), 0) / userFindings.length
      : 0;

    return {
      userId,
      findings: userFindings,
      riskScore,
      violationCount: userFindings.length,
      criticalCount,
      highCount,
    };
  }

  /**
   * Generate violation report
   */
  async generateViolationReport(tenantId: string): Promise<{
    totalViolations: number;
    byOwner: Record<string, number>;
    bySeverity: Record<string, number>;
    byRisk: Record<string, number>;
    topViolators: Array<{ userId: string; userName: string; count: number }>;
    trends: {
      last7Days: number;
      last30Days: number;
    };
  }> {
    // Get all findings for tenant
    const findings = await this.db('sod_findings')
      .where({ tenant_id: tenantId, status: 'OPEN' })
      .select('*');

    // Count by severity
    const bySeverity: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    for (const finding of findings) {
      bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
    }

    // Count by user
    const byUser = new Map<string, { userId: string; userName: string; count: number }>();
    for (const finding of findings) {
      if (!byUser.has(finding.user_id)) {
        const user = await this.db('access_graph_users')
          .where({ id: finding.user_id })
          .first();
        byUser.set(finding.user_id, {
          userId: finding.user_id,
          userName: user?.user_name || user?.email || 'Unknown',
          count: 0,
        });
      }
      byUser.get(finding.user_id)!.count++;
    }

    // Top 10 violators
    const topViolators = Array.from(byUser.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Trends (last 7 and 30 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const last7Days = findings.filter((f: any) => new Date(f.first_detected) >= sevenDaysAgo).length;
    const last30Days = findings.filter((f: any) => new Date(f.first_detected) >= thirtyDaysAgo).length;

    return {
      totalViolations: findings.length,
      byOwner: {}, // Would need assignment data
      bySeverity,
      byRisk: {}, // Would need risk mapping
      topViolators,
      trends: {
        last7Days,
        last30Days,
      },
    };
  }

  /**
   * Get recommendations for resolving violations
   */
  async generateRecommendations(tenantId: string, findingId: string): Promise<Array<{
    type: 'REVOKE_ROLE' | 'COMPENSATING_CONTROL' | 'EXCEPTION' | 'ALTERNATIVE_ROLE';
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    effort: 'HIGH' | 'MEDIUM' | 'LOW';
    roleId?: string;
    roleName?: string;
  }>> {
    const finding = await this.db('sod_findings')
      .where({ id: findingId, tenant_id: tenantId })
      .first();

    if (!finding) {
      return [];
    }

    const recommendations = [];

    // Recommendation 1: Revoke one of the conflicting roles
    for (const roleId of finding.conflicting_roles || []) {
      const role = await this.db('access_graph_roles')
        .where({ id: roleId })
        .first();

      recommendations.push({
        type: 'REVOKE_ROLE' as const,
        description: `Revoke role: ${role?.role_name || roleId}`,
        impact: 'HIGH' as const,
        effort: 'LOW' as const,
        roleId: role?.id,
        roleName: role?.role_name,
      });
    }

    // Recommendation 2: Implement compensating control
    recommendations.push({
      type: 'COMPENSATING_CONTROL' as const,
      description: 'Implement dual approval process for sensitive transactions',
      impact: 'MEDIUM' as const,
      effort: 'MEDIUM' as const,
    });

    // Recommendation 3: Request exception
    recommendations.push({
      type: 'EXCEPTION' as const,
      description: 'Request business exception with documented justification',
      impact: 'LOW' as const,
      effort: 'LOW' as const,
    });

    return recommendations;
  }

  /**
   * Simulate access change impact (what-if analysis)
   */
  async simulateAccessChange(tenantId: string, request: SimulationRequest): Promise<SimulationResult> {
    // Get current state
    const currentAnalysis = await this.analyzeUser(tenantId, request.userId);

    // Create temporary simulation
    // In a full implementation, this would clone the access graph and apply changes
    // For now, return placeholder

    const result: SimulationResult = {
      id: '', // Would be generated
      tenantId,
      userId: request.userId,
      currentRiskScore: currentAnalysis.riskScore,
      currentViolationsCount: currentAnalysis.violationCount,
      projectedRiskScore: currentAnalysis.riskScore, // Would be recalculated
      projectedViolationsCount: currentAnalysis.violationCount, // Would be recalculated
      riskScoreDelta: 0, // Difference
      newViolations: [], // New violations introduced
      resolvedViolations: [], // Violations that would be resolved
      recommendations: [],
      leastPrivilegeRoles: [],
      status: 'COMPLETED',
    };

    return result;
  }

  /**
   * Approve or reject an exception request
   */
  async processException(
    tenantId: string,
    findingId: string,
    action: 'APPROVE' | 'REJECT',
    approver: string,
    justification?: string
  ): Promise<void> {
    if (action === 'APPROVE') {
      await this.db('sod_findings')
        .where({ id: findingId, tenant_id: tenantId })
        .update({
          status: 'EXCEPTION_GRANTED',
          resolution_type: 'EXCEPTION',
          resolution_notes: justification,
          resolved_by: approver,
          resolved_at: new Date(),
        });

      // Create mitigation record
      await this.db('sod_mitigations').insert({
        tenant_id: tenantId,
        finding_id: findingId,
        mitigation_type: 'EXCEPTION',
        description: 'Exception granted',
        exception_justification: justification,
        approved_by: approver,
        approved_at: new Date(),
        status: 'ACTIVE',
        created_by: approver,
      });
    } else {
      await this.db('sod_findings')
        .where({ id: findingId, tenant_id: tenantId })
        .update({
          status: 'OPEN',
          resolution_notes: `Exception rejected: ${justification}`,
        });
    }
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(tenantId: string): Promise<{
    totalUsers: number;
    totalRoles: number;
    totalViolations: number;
    criticalViolations: number;
    resolutionRate: number;
    avgTimeToResolve: number;
    complianceScore: number;
    lastAnalysisDate: Date | null;
  }> {
    // Get statistics
    const [usersCount, rolesCount, violationsData, lastRun] = await Promise.all([
      this.db('access_graph_users').where({ tenant_id: tenantId }).count('* as count').first(),
      this.db('access_graph_roles').where({ tenant_id: tenantId }).count('* as count').first(),
      this.db('sod_findings').where({ tenant_id: tenantId }).select('status', 'severity'),
      this.db('sod_analysis_runs')
        .where({ tenant_id: tenantId, status: 'COMPLETED' })
        .orderBy('completed_at', 'desc')
        .first(),
    ]);

    const totalUsers = parseInt(usersCount?.count || '0', 10);
    const totalRoles = parseInt(rolesCount?.count || '0', 10);

    const openViolations = violationsData.filter((v: any) => v.status === 'OPEN');
    const resolvedViolations = violationsData.filter((v: any) => v.status === 'RESOLVED');
    const criticalViolations = openViolations.filter((v: any) => v.severity === 'CRITICAL').length;

    const totalViolations = violationsData.length;
    const resolutionRate = totalViolations > 0 ? (resolvedViolations.length / totalViolations) * 100 : 100;
    const complianceScore = Math.max(0, 100 - (openViolations.length * 2)); // Simple calculation

    return {
      totalUsers,
      totalRoles,
      totalViolations: openViolations.length,
      criticalViolations,
      resolutionRate,
      avgTimeToResolve: 0, // Would need to calculate from historical data
      complianceScore,
      lastAnalysisDate: lastRun?.completed_at || null,
    };
  }
}
