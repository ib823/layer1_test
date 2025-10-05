"use strict";
/**
 * Rule Engine - Layer 2 Service
 * Pattern matching and violation detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngine = void 0;
class RuleEngine {
    ruleCache = new Map();
    violationCounter = 0;
    async evaluate(data, rules) {
        const violations = [];
        for (const rule of rules) {
            this.ruleCache.set(rule.id, rule);
            const matches = await this.matchPattern(data, rule.pattern);
            if (matches.length > 0) {
                for (const match of matches) {
                    violations.push(this.createViolation(rule, match));
                }
            }
        }
        return violations;
    }
    async matchPattern(data, pattern) {
        switch (pattern.type) {
            case 'SOD':
                return this.matchSoDPattern(data, pattern.definition);
            case 'THRESHOLD':
                return this.matchThreshold(data, pattern.definition);
            case 'PATTERN':
                return this.matchGenericPattern(data, pattern.definition);
            default:
                console.warn(`Unknown pattern type: ${pattern.type}`);
                return [];
        }
    }
    matchSoDPattern(data, pattern) {
        const matches = [];
        const { conflictingRoles, requiresAll = true, userIdField = 'userId', rolesField = 'roles' } = pattern;
        const users = Array.isArray(data) ? data : [data];
        for (const user of users) {
            const userId = user[userIdField];
            const userRoles = user[rolesField] || [];
            const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
            // Use Set for O(1) lookups instead of O(n) array.includes()
            const rolesSet = new Set(rolesArray);
            const hasConflict = requiresAll
                ? conflictingRoles.every(role => rolesSet.has(role))
                : conflictingRoles.some(role => rolesSet.has(role));
            if (hasConflict) {
                matches.push({
                    userId,
                    roles: rolesArray,
                    conflictingRoles: conflictingRoles.filter(r => rolesSet.has(r)),
                    user,
                });
            }
        }
        return matches;
    }
    matchThreshold(data, pattern) {
        const matches = [];
        const { field, operator, value, aggregation } = pattern;
        const records = Array.isArray(data) ? data : [data];
        if (aggregation) {
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
        }
        else {
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
    matchGenericPattern(data, pattern) {
        const matches = [];
        const { field, condition, contextFields = [] } = pattern;
        const records = Array.isArray(data) ? data : [data];
        for (const record of records) {
            try {
                const context = {
                    value: this.getNestedValue(record, field),
                    record,
                };
                for (const contextField of contextFields) {
                    context[contextField] = this.getNestedValue(record, contextField);
                }
                const result = this.evaluateCondition(condition, context);
                if (result) {
                    matches.push({
                        field,
                        value: context.value,
                        record,
                        condition,
                    });
                }
            }
            catch (error) {
                console.error(`Error evaluating pattern for record:`, error);
            }
        }
        return matches;
    }
    createViolation(rule, matchData) {
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
    aggregate(records, field, aggregation) {
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
    compareValues(actualValue, operator, expectedValue) {
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
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    evaluateCondition(condition, context) {
        try {
            const func = new Function(...Object.keys(context), `return ${condition}`);
            return func(...Object.values(context));
        }
        catch (error) {
            console.error(`Error evaluating condition: ${condition}`, error);
            return false;
        }
    }
    getRule(ruleId) {
        return this.ruleCache.get(ruleId);
    }
    clearCache() {
        this.ruleCache.clear();
    }
    getStats() {
        return {
            cachedRules: this.ruleCache.size,
            violationsDetected: this.violationCounter,
        };
    }
}
exports.RuleEngine = RuleEngine;
//# sourceMappingURL=RuleEngine.js.map