/**
 * Rule Engine - Layer 2 Service
 * Pattern matching and violation detection
 */

export interface Rule {
  id: string;
  name: string;
  description?: string;
  pattern: {
    type: 'SOD' | 'THRESHOLD' | 'PATTERN';
    definition: any;
  };
  risk: {
    level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    score: number; // 0-100
  };
  actions?: {
    immediate?: string[];
    deferred?: string[];
    escalation?: string[];
  };
  metadata?: {
    version?: string;
    lastUpdated?: Date;
    effectiveness?: number;
  };
}

export interface Violation {
  id: string;
  rule: Rule;
  data: any;
  risk: Rule['risk'];
  timestamp: number;
  evidence?: any;
  status?: 'DETECTED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';
}

export interface SoDPattern {
  conflictingRoles: string[];
  requiresAll?: boolean; // true = user must have ALL roles, false = ANY combination
  userIdField?: string;
  rolesField?: string;
}

export interface ThresholdPattern {
  field: string;
  operator: 'GT' | 'LT' | 'EQ' | 'NE' | 'GTE' | 'LTE';
  value: number | string;
  aggregation?: 'SUM' | 'AVG' | 'MAX' | 'MIN' | 'COUNT';
}

export interface GenericPattern {
  field: string;
  condition: string; // JavaScript expression
  contextFields?: string[];
}

export class RuleEngine {
  private ruleCache: Map<string, Rule> = new Map();
  private violationCounter: number = 0;

  /**
   * Evaluate data against a set of rules
   */
  async evaluate(data: any, rules: Rule[]): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (const rule of rules) {
      // Cache rule for performance
      this.ruleCache.set(rule.id, rule);

      // Match pattern and get violations
      const matches = await this.matchPattern(data, rule.pattern);
      
      if (matches.length > 0) {
        // Create violations for each match
        for (const match of matches) {
          violations.push(this.createViolation(rule, match));
        }
      }
    }

    return violations;
  }

  /**
   * Pattern matching dispatcher
   */
  private async matchPattern(data: any, pattern: Rule['pattern']): Promise<any[]> {
    switch (pattern.type) {
      case 'SOD':
        return this.matchSoDPattern(data, pattern.definition as SoDPattern);
      
      case 'THRESHOLD':
        return this.matchThreshold(data, pattern.definition as ThresholdPattern);
      
      case 'PATTERN':
        return this.matchGenericPattern(data, pattern.definition as GenericPattern);
      
      default:
        console.warn(`Unknown pattern type: ${pattern.type}`);
        return [];
    }
  }

  /**
   * Match Segregation of Duties (SoD) patterns
   * Detects users with conflicting role combinations
   */
  private matchSoDPattern(data: any, pattern: SoDPattern): any[] {
    const matches: any[] = [];
    const { conflictingRoles, requiresAll = true, userIdField = 'userId', rolesField = 'roles' } = pattern;

    // Ensure data is array
    const users = Array.isArray(data) ? data : [data];

    for (const user of users) {
      const userId = user[userIdField];
      const userRoles = user[rolesField] || [];

      // Convert to array if needed
      const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];

      // Check if user has conflicting roles
      const hasConflict = requiresAll
        ? conflictingRoles.every(role => rolesArray.includes(role))
        : conflictingRoles.some(role => rolesArray.includes(role));

      if (hasConflict) {
        matches.push({
          userId,
          roles: rolesArray,
          conflictingRoles: conflictingRoles.filter(r => rolesArray.includes(r)),
          user,
        });
      }
    }

    return matches;
  }

  /**
   * Match threshold patterns
   * Detects when values exceed/fall below thresholds
   */
  private matchThreshold(data: any, pattern: ThresholdPattern): any[] {
    const matches: any[] = [];
    const { field, operator, value, aggregation } = pattern;

    // Ensure data is array
    const records = Array.isArray(data) ? data : [data];

    if (aggregation) {
      // Aggregate across all records
      const aggregatedValue = this.aggregate(records, field, aggregation);
      const meetsThreshold = this.compareValues(aggregatedValue, operator, value);

      if (meetsThreshold) {
        matches.push({
          field,
          aggregation,
          value: aggregatedValue,
          threshold: value,
          operator,
          recordCount: records.length,
        });
      }
    } else {
      // Check each record individually
      for (const record of records) {
        const recordValue = this.getNestedValue(record, field);
        const meetsThreshold = this.compareValues(recordValue, operator, value);

        if (meetsThreshold) {
          matches.push({
            field,
            value: recordValue,
            threshold: value,
            operator,
            record,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Match generic patterns using custom conditions
   */
  private matchGenericPattern(data: any, pattern: GenericPattern): any[] {
    const matches: any[] = [];
    const { field, condition, contextFields = [] } = pattern;

    // Ensure data is array
    const records = Array.isArray(data) ? data : [data];

    for (const record of records) {
      try {
        // Build context for evaluation
        const context: any = {
          value: this.getNestedValue(record, field),
          record,
        };

        // Add context fields
        for (const contextField of contextFields) {
          context[contextField] = this.getNestedValue(record, contextField);
        }

        // Evaluate condition (safe evaluation in production would use a sandboxed environment)
        const result = this.evaluateCondition(condition, context);

        if (result) {
          matches.push({
            field,
            value: context.value,
            record,
            condition,
          });
        }
      } catch (error) {
        console.error(`Error evaluating pattern for record:`, error);
      }
    }

    return matches;
  }

  /**
   * Create a violation record
   */
  private createViolation(rule: Rule, matchData: any): Violation {
    return {
      id: `VIOLATION-${++this.violationCounter}`,
      rule,
      data: matchData,
      risk: rule.risk,
      timestamp: Date.now(),
      evidence: matchData,
      status: 'DETECTED',
    };
  }

  /**
   * Aggregate values from an array of records
   */
  private aggregate(
    records: any[],
    field: string,
    aggregation: ThresholdPattern['aggregation']
  ): number {
    const values = records
      .map(r => this.getNestedValue(r, field))
      .filter(v => typeof v === 'number');

    switch (aggregation) {
      case 'SUM':
        return values.reduce((sum, v) => sum + v, 0);
      
      case 'AVG':
        return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
      
      case 'MAX':
        return values.length > 0 ? Math.max(...values) : 0;
      
      case 'MIN':
        return values.length > 0 ? Math.min(...values) : 0;
      
      case 'COUNT':
        return values.length;
      
      default:
        return 0;
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValues(
    actualValue: any,
    operator: ThresholdPattern['operator'],
    expectedValue: any
  ): boolean {
    switch (operator) {
      case 'GT': return actualValue > expectedValue;
      case 'LT': return actualValue < expectedValue;
      case 'EQ': return actualValue === expectedValue;
      case 'NE': return actualValue !== expectedValue;
      case 'GTE': return actualValue >= expectedValue;
      case 'LTE': return actualValue <= expectedValue;
      default: return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   * Example: getNestedValue(obj, 'user.profile.name')
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Evaluate a condition string (SIMPLIFIED - production should use sandboxed eval)
   * Example: "value > 1000 && record.status === 'ACTIVE'"
   */
  private evaluateCondition(condition: string, context: any): boolean {
    try {
      // WARNING: Using Function constructor is not safe for untrusted input
      // In production, use a proper expression parser/sandbox like vm2 or expr-eval
      const func = new Function(...Object.keys(context), `return ${condition}`);
      return func(...Object.values(context));
    } catch (error) {
      console.error(`Error evaluating condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * Get cached rule
   */
  getRule(ruleId: string): Rule | undefined {
    return this.ruleCache.get(ruleId);
  }

  /**
   * Clear rule cache
   */
  clearCache(): void {
    this.ruleCache.clear();
  }

  /**
   * Get rule statistics
   */
  getStats() {
    return {
      cachedRules: this.ruleCache.size,
      violationsDetected: this.violationCounter,
    };
  }
}