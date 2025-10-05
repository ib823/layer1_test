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
        score: number;
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
    requiresAll?: boolean;
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
    condition: string;
    contextFields?: string[];
}
export declare class RuleEngine {
    private ruleCache;
    private violationCounter;
    evaluate(data: any, rules: Rule[]): Promise<Violation[]>;
    private matchPattern;
    private matchSoDPattern;
    private matchThreshold;
    private matchGenericPattern;
    private createViolation;
    private aggregate;
    private compareValues;
    private getNestedValue;
    private evaluateCondition;
    getRule(ruleId: string): Rule | undefined;
    clearCache(): void;
    getStats(): {
        cachedRules: number;
        violationsDetected: number;
    };
}
//# sourceMappingURL=RuleEngine.d.ts.map