/**
 * SoD Rule Engine
 *
 * Core engine for evaluating SoD rules against the access graph:
 * - Snapshot analysis: Evaluate current state
 * - Delta analysis: Evaluate changes
 * - Context-aware evaluation: SAME_SCOPE, THRESHOLD, TEMPORAL, etc.
 */

import {
  SodRisk,
  SodFunction,
  SodRuleset,
  SodFinding,
  AnalysisConfig,
  AnalysisResult,
  TracePathNode,
} from '../types';

export class RuleEngine {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Run SoD analysis for a tenant
   */
  async analyze(tenantId: string, config: AnalysisConfig): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Create analysis run record
    const [analysisRun] = await this.db('sod_analysis_runs')
      .insert({
        tenant_id: tenantId,
        status: 'RUNNING',
        config: JSON.stringify(config),
        started_at: new Date(),
      })
      .returning('*');

    const analysisId = analysisRun.id;

    try {
      // Load active rules
      const rules = await this.loadRules(tenantId);

      // Load access graph based on mode
      const accessGraph = await this.loadAccessGraph(tenantId, config);

      // Evaluate rules
      const findings = await this.evaluateRules(
        tenantId,
        analysisId,
        rules,
        accessGraph,
        config
      );

      // Count findings by severity
      const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
      const highCount = findings.filter(f => f.severity === 'HIGH').length;
      const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
      const lowCount = findings.filter(f => f.severity === 'LOW').length;

      // Update analysis run
      await this.db('sod_analysis_runs')
        .where({ id: analysisId })
        .update({
          status: 'COMPLETED',
          total_users_analyzed: accessGraph.users.length,
          violations_found: findings.length,
          high_risk_count: criticalCount + highCount,
          medium_risk_count: mediumCount,
          low_risk_count: lowCount,
          completed_at: new Date(),
        });

      // Persist findings
      await this.persistFindings(findings);

      const analysisDuration = Date.now() - startTime;

      return {
        analysisId,
        tenantId,
        totalFindings: findings.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        findings,
        analysisStats: {
          totalUsersAnalyzed: accessGraph.users.length,
          totalRolesAnalyzed: accessGraph.roles.length,
          totalRulesEvaluated: rules.length,
          analysisDuration,
        },
      };
    } catch (error: any) {
      // Update analysis run with error
      await this.db('sod_analysis_runs')
        .where({ id: analysisId })
        .update({
          status: 'FAILED',
          error_message: error.message,
          completed_at: new Date(),
        });

      throw error;
    }
  }

  /**
   * Load active SoD rules
   */
  private async loadRules(tenantId: string): Promise<Array<{
    risk: SodRisk;
    ruleset: SodRuleset;
    functionA: SodFunction;
    functionB: SodFunction;
  }>> {
    const rulesets = await this.db('sod_rulesets as rs')
      .join('sod_risks as r', 'rs.risk_id', 'r.id')
      .join('sod_functions as fa', 'rs.function_a_id', 'fa.id')
      .join('sod_functions as fb', 'rs.function_b_id', 'fb.id')
      .where({
        'rs.tenant_id': tenantId,
        'rs.is_active': true,
        'r.is_active': true,
      })
      .select(
        'r.*',
        'rs.*',
        this.db.raw('row_to_json(fa.*) as function_a'),
        this.db.raw('row_to_json(fb.*) as function_b')
      );

    return rulesets.map((row: any) => ({
      risk: this.mapRisk(row),
      ruleset: this.mapRuleset(row),
      functionA: JSON.parse(row.function_a),
      functionB: JSON.parse(row.function_b),
    }));
  }

  /**
   * Load access graph
   */
  private async loadAccessGraph(tenantId: string, config: AnalysisConfig): Promise<{
    users: any[];
    roles: any[];
    assignments: any[];
    permissions: any[];
  }> {
    let usersQuery = this.db('access_graph_users')
      .where({ tenant_id: tenantId });

    let rolesQuery = this.db('access_graph_roles')
      .where({ tenant_id: tenantId });

    let assignmentsQuery = this.db('access_graph_assignments')
      .where({ tenant_id: tenantId });

    let permissionsQuery = this.db('sod_permissions')
      .where({ tenant_id: tenantId });

    // Apply scope filters
    if (config.scope?.systems) {
      usersQuery = usersQuery.whereIn('source_system_id', config.scope.systems);
      rolesQuery = rolesQuery.whereIn('source_system_id', config.scope.systems);
    }

    if (config.scope?.orgUnits) {
      usersQuery = usersQuery.whereIn('org_unit', config.scope.orgUnits);
    }

    if (config.scope?.userTypes) {
      usersQuery = usersQuery.whereIn('user_type', config.scope.userTypes);
    }

    if (!config.includeInactive) {
      usersQuery = usersQuery.where({ is_active: true });
      rolesQuery = rolesQuery.where({ is_active: true });
    }

    const [users, roles, assignments, permissions] = await Promise.all([
      usersQuery.select('*'),
      rolesQuery.select('*'),
      assignmentsQuery.select('*'),
      permissionsQuery.select('*'),
    ]);

    return { users, roles, assignments, permissions };
  }

  /**
   * Evaluate rules against access graph
   */
  private async evaluateRules(
    tenantId: string,
    analysisId: string,
    rules: any[],
    accessGraph: any,
    config: AnalysisConfig
  ): Promise<SodFinding[]> {
    const findings: SodFinding[] = [];

    // Build user-to-functions map
    const userFunctionsMap = await this.buildUserFunctionsMap(accessGraph);

    // Evaluate each rule
    for (const rule of rules) {
      // Filter by risk level if specified
      if (config.riskLevels && !config.riskLevels.includes(rule.risk.severity)) {
        continue;
      }

      // Check each user for conflicts
      for (const [userId, functions] of Array.from(userFunctionsMap.entries())) {
        const hasFunctionA = functions.some((f: any) => f.id === rule.functionA.id);
        const hasFunctionB = functions.some((f: any) => f.id === rule.functionB.id);

        if (hasFunctionA && hasFunctionB) {
          // Evaluate context conditions
          const contextMatch = await this.evaluateContext(
            rule.ruleset,
            userId,
            rule.functionA,
            rule.functionB,
            accessGraph
          );

          if (contextMatch) {
            // SoD violation found!
            const user = accessGraph.users.find((u: any) => u.id === userId);
            const conflictingRoles = this.getConflictingRoles(
              userId,
              rule.functionA.id,
              rule.functionB.id,
              accessGraph
            );

            const tracePath = await this.buildTracePath(
              user,
              conflictingRoles,
              [rule.functionA, rule.functionB],
              rule.risk
            );

            const finding: SodFinding = {
              id: '', // Will be generated by database
              tenantId,
              findingCode: `${rule.risk.risk_code}-${user.user_id}-${Date.now()}`,
              riskId: rule.risk.id,
              userId: user.id,
              analysisRunId: analysisId,
              conflictingRoles: conflictingRoles.map((r: any) => r.id),
              conflictingFunctions: [rule.functionA.id, rule.functionB.id],
              conflictingPermissions: [],
              orgScope: this.extractOrgScope(user, accessGraph),
              contextData: rule.ruleset.condition_config ? JSON.parse(rule.ruleset.condition_config) : undefined,
              severity: rule.risk.severity,
              riskScore: this.calculateRiskScore(rule.risk.severity),
              tracePath,
              status: 'OPEN',
              isRecurring: false,
              recurrenceCount: 1,
              firstDetected: new Date(),
              lastDetected: new Date(),
            };

            findings.push(finding);
          }
        }
      }
    }

    return findings;
  }

  /**
   * Build user-to-functions map
   */
  private async buildUserFunctionsMap(accessGraph: any): Promise<Map<string, any[]>> {
    const map = new Map<string, any[]>();

    // Get function-permission mappings
    const functionPermissions = await this.db('sod_function_permissions')
      .select('*');

    const permMap = new Map<string, string[]>();
    for (const fp of functionPermissions) {
      if (!permMap.has(fp.permission_id)) {
        permMap.set(fp.permission_id, []);
      }
      permMap.get(fp.permission_id)!.push(fp.function_id);
    }

    // Build map: user -> functions
    for (const assignment of accessGraph.assignments) {
      const userId = assignment.user_id;

      if (!map.has(userId)) {
        map.set(userId, []);
      }

      // Get role's permissions
      const rolePermissions = await this.db('access_graph_role_permissions')
        .where({ role_id: assignment.role_id })
        .select('permission_id');

      // Map permissions to functions
      for (const rp of rolePermissions) {
        const functionIds = permMap.get(rp.permission_id) || [];
        for (const funcId of functionIds) {
          const func = await this.db('sod_functions')
            .where({ id: funcId })
            .first();

          if (func) {
            map.get(userId)!.push(func);
          }
        }
      }
    }

    return map;
  }

  /**
   * Evaluate context conditions
   */
  private async evaluateContext(
    ruleset: SodRuleset,
    userId: string,
    functionA: any,
    functionB: any,
    accessGraph: any
  ): Promise<boolean> {
    switch (ruleset.conditionType) {
      case 'ALWAYS':
        return true;

      case 'SAME_SCOPE': {
        const config = ruleset.conditionConfig ?
          (typeof ruleset.conditionConfig === 'string' ? JSON.parse(ruleset.conditionConfig) : ruleset.conditionConfig) :
          {};
        const field = config.field; // e.g., 'company_code', 'vendor_id'

        // Get assignments for this user
        const userAssignments = accessGraph.assignments.filter((a: any) => a.user_id === userId);

        // Check if both functions apply to same scope
        const scopesA = userAssignments
          .map((a: any) => {
            if (!a.org_scope) return null;
            const scope = typeof a.org_scope === 'string' ? JSON.parse(a.org_scope) : a.org_scope;
            return scope[field];
          })
          .filter(Boolean);

        const scopesB = userAssignments
          .map((a: any) => {
            if (!a.org_scope) return null;
            const scope = typeof a.org_scope === 'string' ? JSON.parse(a.org_scope) : a.org_scope;
            return scope[field];
          })
          .filter(Boolean);

        // Check for intersection
        return scopesA.some((s: any) => scopesB.includes(s));
      }

      case 'THRESHOLD': {
        const config = ruleset.conditionConfig ?
          (typeof ruleset.conditionConfig === 'string' ? JSON.parse(ruleset.conditionConfig) : ruleset.conditionConfig) :
          {};
        const { field, operator, value } = config;

        // For threshold, we'd need transaction data (not available in access graph)
        // This would require integration with transaction monitoring
        // For now, return true if both functions are present
        return true;
      }

      case 'TEMPORAL': {
        const config = ruleset.conditionConfig ?
          (typeof ruleset.conditionConfig === 'string' ? JSON.parse(ruleset.conditionConfig) : ruleset.conditionConfig) :
          {};
        const windowDays = config.window_days || 7;

        // Check if both functions were used within temporal window
        // This requires transaction/audit log data
        // For now, return true if both functions are present
        return true;
      }

      case 'ORG_UNIT': {
        const user = accessGraph.users.find((u: any) => u.id === userId);
        const config = ruleset.conditionConfig ?
          (typeof ruleset.conditionConfig === 'string' ? JSON.parse(ruleset.conditionConfig) : ruleset.conditionConfig) :
          {};
        const restrictedOrgUnits = config.org_units || [];

        return restrictedOrgUnits.includes(user?.org_unit);
      }

      default:
        return false;
    }
  }

  /**
   * Get conflicting roles for a user
   */
  private getConflictingRoles(
    userId: string,
    functionAId: string,
    functionBId: string,
    accessGraph: any
  ): any[] {
    const userAssignments = accessGraph.assignments.filter((a: any) => a.user_id === userId);
    const userRoleIds = userAssignments.map((a: any) => a.role_id);

    return accessGraph.roles.filter((r: any) => userRoleIds.includes(r.id));
  }

  /**
   * Build explainability trace path
   */
  private async buildTracePath(
    user: any,
    roles: any[],
    functions: any[],
    risk: any
  ): Promise<TracePathNode[]> {
    const path: TracePathNode[] = [];

    // User node
    path.push({
      type: 'USER',
      id: user.id,
      name: user.user_name || user.email,
    });

    // Role nodes
    for (const role of roles) {
      path.push({
        type: 'ROLE',
        id: role.id,
        name: role.role_name,
      });
    }

    // Function nodes
    for (const func of functions) {
      path.push({
        type: 'FUNCTION',
        id: func.id,
        name: func.name,
      });
    }

    // Risk node
    path.push({
      type: 'RISK',
      id: risk.id,
      name: risk.name,
      metadata: {
        severity: risk.severity,
        riskCode: risk.risk_code,
      },
    });

    return path;
  }

  /**
   * Extract organizational scope
   */
  private extractOrgScope(user: any, accessGraph: any): Record<string, any> {
    return {
      orgUnit: user.org_unit,
      department: user.department,
      costCenter: user.cost_center,
    };
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(severity: string): number {
    switch (severity) {
      case 'CRITICAL': return 95;
      case 'HIGH': return 75;
      case 'MEDIUM': return 50;
      case 'LOW': return 25;
      default: return 0;
    }
  }

  /**
   * Persist findings to database
   */
  private async persistFindings(findings: SodFinding[]): Promise<void> {
    if (findings.length === 0) return;

    const rows = findings.map(finding => ({
      tenant_id: finding.tenantId,
      finding_code: finding.findingCode,
      risk_id: finding.riskId,
      user_id: finding.userId,
      analysis_run_id: finding.analysisRunId,
      conflicting_roles: finding.conflictingRoles,
      conflicting_functions: finding.conflictingFunctions,
      conflicting_permissions: finding.conflictingPermissions || [],
      org_scope: JSON.stringify(finding.orgScope),
      context_data: JSON.stringify(finding.contextData),
      severity: finding.severity,
      risk_score: finding.riskScore,
      trace_path: JSON.stringify(finding.tracePath),
      status: finding.status,
      is_recurring: finding.isRecurring,
      recurrence_count: finding.recurrenceCount,
      first_detected: finding.firstDetected,
      last_detected: finding.lastDetected,
    }));

    await this.db('sod_findings')
      .insert(rows)
      .onConflict('finding_code')
      .merge({
        last_detected: this.db.raw('EXCLUDED.last_detected'),
        recurrence_count: this.db.raw('sod_findings.recurrence_count + 1'),
        is_recurring: true,
      });
  }

  /**
   * Helper: Map database row to SodRisk
   */
  private mapRisk(row: any): SodRisk {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      riskCode: row.risk_code,
      name: row.name,
      description: row.description,
      businessProcess: row.business_process,
      category: row.category,
      severity: row.severity,
      standardReferences: row.standard_references ?
        (typeof row.standard_references === 'string' ? JSON.parse(row.standard_references) : row.standard_references) :
        undefined,
      isActive: row.is_active,
    };
  }

  /**
   * Helper: Map database row to SodRuleset
   */
  private mapRuleset(row: any): SodRuleset {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      riskId: row.risk_id,
      functionAId: row.function_a_id,
      functionBId: row.function_b_id,
      conditionType: row.condition_type,
      conditionConfig: row.condition_config ?
        (typeof row.condition_config === 'string' ? JSON.parse(row.condition_config) : row.condition_config) :
        undefined,
      logicOperator: row.logic_operator,
      isActive: row.is_active,
    };
  }
}
